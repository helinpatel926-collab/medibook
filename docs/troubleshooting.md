# Troubleshooting

This page covers problems with MediBook on AWS: for each symptom, its cause and the fix. For Docker Compose problems on a laptop, see [Local development](local-dev.md). For the day-to-day commands, see [Operations](operations.md).

Most problems show up in these commands:

```bash
kubectl get applications -n argocd                    # which app is not Synced / Healthy?
kubectl get pods -n medibook -o wide                  # status, restarts, readiness gates
kubectl describe pod <pod> -n medibook                # the Events at the bottom
kubectl logs <pod> -n medibook --previous             # log of the last crashed container
kubectl get events -n medibook --sort-by=.lastTimestamp
```

Fix things in Git. A `kubectl edit` is undone by Argo CD self-heal within seconds.

## Kubernetes

| Symptom | Cause | Fix |
|---|---|---|
| `ErrImagePull` or `ImagePullBackOff`, with `failed to pull image ... not found` | The `newTag` in `k8s/<service>/kustomization.yaml` is not in ECR. Typical causes are a typo or a manual edit, a CI run that failed before the push, or an old tag that the keep-last-10 rule has expired | The old pods keep serving, because the rollout cannot remove them (demo 5). `git revert` the tag commit, or set a tag that exists: `aws ecr describe-images --repository-name medibook-<service> --query "imageDetails[].imageTags"` |
| `CrashLoopBackOff` | The process exits at start. The usual causes here are a code error, a write outside `/tmp` (the root filesystem is read-only, and `/tmp` is a 64 MiB `emptyDir`), or `OOMKilled` (limits are 256Mi for the APIs and 64Mi for the frontend) | Read `kubectl logs --previous` and the `Last State` reason in `kubectl describe pod`. Fix it in Git |
| Pod is `Running` but `0/1` ready, the log shows `Readiness check failed`, and the ALB target is unhealthy | `/ready` returns 503 because the service cannot reach its database: RDS is not available, or the password in the Secret is wrong. The service does not crash. It waits and stays out of the load balancer | Check the RDS status and the service's Secret ([Secrets](#secrets), [Database](#database)) |
| `CreateContainerConfigError`: `secret "<service>-env" not found` | The ExternalSecret has not created the Kubernetes Secret yet | See [ExternalSecret not syncing](#secrets) |
| Pods `Pending`: `0/2 nodes are available: ... Too many pods` | Each node allows 50 pods (`maxPods`), so 100 in total | Check the limit: `kubectl get nodes -o custom-columns=NAME:.metadata.name,PODS:.status.allocatable.pods` should show 50 per node. Add a third node ([Operations › Scaling](operations.md#scaling)) |
| Pods `Pending`: `Insufficient cpu` or `Insufficient memory` | The pod requests do not fit on the two nodes | Look at `Allocated resources` in `kubectl describe nodes`. Lower the requests in Git, or add a third node |
| Pods stuck in `ContainerCreating`: `failed to assign an IP address to container` | Prefix delegation is off. Without it, a node only gets the addresses of its network interfaces (29 pods on m7i-flex.large), which is fewer than `maxPods` (50) | `kubectl get daemonset aws-node -n kube-system -o yaml \| grep -A1 ENABLE_PREFIX_DELEGATION` must show `"true"`. It is set in the vpc-cni add-on (`terraform/modules/eks/addons.tf`). If it was changed by hand, apply Terraform again |
| Prometheus pod `Pending` with `volume node affinity conflict` after a node was replaced | Its 10 GiB EBS volume exists in one availability zone, and no node is running in that zone | Wait until a node runs in that zone again, or add a node there. The metrics are only for short-term debugging |
| frontend `CrashLoopBackOff`, log `host not found in upstream "<service>:8000"` | Nginx resolves the four API Service names when it starts, and one of them did not exist yet (first deploy) or was deleted | It recovers by itself once the API apps (sync wave 2) exist. Check with `kubectl get svc -n medibook`. Scaling an API to zero keeps its Service, so the frontend is not affected (demo 4) |
| A change made with `kubectl edit` or `kubectl scale` disappears | Argo CD self-heal restores Git, and the HPA owns the replica count | Change the manifest in `k8s/` and push |
| A new tag is in Git but not deployed yet | Argo CD polls Git about every 3 minutes | Wait, or run `kubectl annotate application <app> -n argocd argocd.argoproj.io/refresh=normal --overwrite` |

## ALB

| Symptom | Cause | Fix |
|---|---|---|
| ALB not created: `kubectl get ingress medibook -n medibook` shows no ADDRESS | (1) The `ingress` app has not synced. It is sync wave 4, and the root app waits for each wave to be healthy, so a broken app in waves 0–3 holds it back. (2) The load balancer controller is not running, or it cannot get AWS credentials. Its IRSA role trusts only `kube-system/aws-load-balancer-controller`. (3) The controller's IAM policy and its chart are out of step: both are pinned to 3.5.0. (4) The public subnets lost the `kubernetes.io/role/elb` tag | Read `kubectl describe ingress medibook -n medibook` (Events) and `kubectl logs -n kube-system deployment/aws-load-balancer-controller`. Fix the unhealthy wave first. Keep the chart version and `terraform/envs/dev/policies/aws-load-balancer-controller-v3.5.0.json` the same |
| Targets unhealthy; new pods stay not ready behind their readiness gate; the `alb-unhealthy-targets` alarm fires | The health check must get exactly HTTP 200 from `/ready` (APIs) or `/` (frontend). `/ready` fails when the service cannot reach its database. Health checks also need the ALB subnets `10.0.0.0/24` and `10.0.1.0/24` allowed by the NetworkPolicies | Test the path in the pod: `kubectl port-forward deploy/<service> -n medibook 8001:8000` (port 8080 for the frontend), then `curl -i localhost:8001/ready`. Check `allow-alb-to-services` and `allow-alb-to-frontend` if the subnets changed |
| The ALB answers 503 with no JSON body on one path | The target group behind that path has no registered targets: the service has zero pods, or none is ready. Demo 4 saw this on the staff patient API | Bring the service back (`git revert`), then check its pods |
| `terraform destroy` hangs on the subnets, internet gateway or VPC, then fails with `DependencyViolation`, and the `medibook-dev` load balancer still exists | The ALB was left behind. The controller (or the cluster) was removed before the Ingress, so nothing deleted the ALB. Terraform does not know about it | Next time, follow [Cleanup](cleanup.md): delete the `ingress` application first and wait until the ALB is gone. Now: delete the `medibook-dev` load balancer, then the controller's `k8s-...` target groups and security groups (console or CLI), and run `terraform destroy` again |

## Secrets

| Symptom | Cause | Fix |
|---|---|---|
| ExternalSecret not syncing: `kubectl get externalsecrets -n medibook` shows `SecretSyncedError` or not ready | **IRSA:** the store uses the External Secrets controller's role, which trusts only `external-secrets/external-secrets`. The error mentions `sts:AssumeRoleWithWebIdentity`. **Permissions:** the role may read only the five `medibook/dev/*` secrets and the RDS admin secret, and a new secret needs adding to the policy in `terraform/envs/dev/iam.tf`. **Store:** `ClusterSecretStore` `aws-secrets-manager` is not `Valid`. **Name:** the `db-init` ExternalSecret holds the generated name of the RDS admin secret (`rds!db-...`), which changes when the RDS instance is replaced | `kubectl describe externalsecret <name> -n medibook` and `kubectl get clustersecretstore aws-secrets-manager`. For a new admin secret name, get it with `terraform output db_master_secret_arn` and update `k8s/platform/db-init-external-secret.yaml`. Then force a sync: `kubectl annotate externalsecret <name> -n medibook force-sync=$(date +%s) --overwrite` |
| Pods still use the old value after a secret changed | The services read secrets as environment variables when they start, and the ExternalSecrets refresh only every hour | Force a sync (above), then run `kubectl rollout restart deployment/<service> -n medibook`. The readiness gates keep the restart free of downtime |
| RDS admin password rotated: `db-init` fails with `password authentication failed for user "medibook_admin"` | RDS manages the admin secret and rotates it by itself. Only the `db-init` job uses it, and its Kubernetes Secret can be up to an hour old | Force a sync of the `db-init` ExternalSecret, then sync the `platform` app in the Argo CD UI. The job is a Sync hook, so it runs on every sync. The services are not affected, because they use their own logins |
| A service password changed (for example, Terraform replaced a `random_password`): pods `0/1` ready, `/ready` 503, and the log shows `password authentication failed` for the service login (for example `doctor_service`) | The new password is in Secrets Manager, but the database role and the running pods still have the old one | Work in this order. (1) Force a sync of `db-init` and sync `platform`: the job runs `ALTER ROLE` with the new password. (2) Force a sync of `<service>-env`. (3) Run `kubectl rollout restart deployment/<service> -n medibook` |

## Network

| Symptom | Cause | Fix |
|---|---|---|
| The API returns `503` `"Patient service is unavailable. Please try again shortly."` (or `"Doctor service ..."`) | A dependency is down. appointment-service could not reach that service within its 3-second timeout, or the service returned a 5xx | `kubectl get pods -n medibook -l app.kubernetes.io/name=patient-service`, then fix that service. Everything that does not need it keeps working (demo 4) |
| The API returns `503` `"Database unavailable"` | The service's own database connection failed (3-second connect timeout) | Check the RDS status and the service's Secret |
| A call between pods **times out** (it is not refused) | A NetworkPolicy blocks it. Incoming traffic is denied by default. Allowed: the ALB subnets to all five; frontend to the four APIs; appointment-service to doctor-service and patient-service; namespace `monitoring` to the APIs on port 8000. Outgoing traffic is not restricted | Test with temporary pods (below). Add an allow rule in `k8s/network-policies/` and push |
| A new add-on or tool in a pod cannot find its region, VPC or AWS credentials (errors about EC2 instance metadata or IMDS) | The nodes require IMDSv2 with a hop limit of 1, so pods cannot reach the instance metadata service. This is on purpose: pods cannot borrow the node's IAM role | Set the region (and the VPC ID if needed) explicitly, as the load balancer controller, the ClusterSecretStore and Fluent Bit already do, and give the tool its own IRSA role. Do not raise the hop limit |

**Testing a NetworkPolicy with a temporary pod.** Expect PodSecurity warnings for the test pod; they do not block it.

```bash
# Default deny: a pod without an allowed label must time out ("download timed out")
kubectl run np-test -n medibook --rm -it --restart=Never --image=busybox:1.36 -- \
  wget -qO- -T 5 http://doctor-service:8000/health

# An allowed path: the monitoring namespace may read /metrics
kubectl run np-test -n monitoring --rm -it --restart=Never --image=busybox:1.36 -- \
  wget -qO- -T 5 http://doctor-service.medibook:8000/metrics

# A real allowed call, made from the caller itself
kubectl exec -n medibook deploy/appointment-service -- \
  python -c "import urllib.request as u; print(u.urlopen('http://patient-service:8000/health', timeout=5).status)"
```

Do not give a test pod the label `app.kubernetes.io/name=<service>`. The Service selects pods by that label, so the test pod would join that service's endpoints and its ALB target group.

## Database

The `db-init` job creates the three logins and databases. It runs on every sync of the `platform` app. Read its log with `kubectl logs job/db-init -n medibook`; the job is kept for an hour after it finishes. To run it again, sync `platform` in the Argo CD UI.

| Symptom | Cause | Fix |
|---|---|---|
| `db-init` log: `no pg_hba.conf entry for host ..., no encryption` | The connection was made without TLS, and RDS refuses plain connections | Keep `PGSSLMODE=require` in `k8s/platform/db-init-job.yaml`, and `DB_SSLMODE=require` in the Deployments |
| `db-init` fails on `CREATE DATABASE ... OWNER` with a permission error about `SET ROLE` | PostgreSQL 16 grants. The RDS admin is not a superuser, and creating a role gives it only `ADMIN` on that role, not `SET` and `INHERIT` | `db-init.sql` first runs `GRANT <role> TO CURRENT_USER WITH INHERIT TRUE, SET TRUE` for each service role. Keep that step if you change the script |
| `db-init` log: `password authentication failed for user "medibook_admin"` | The admin secret was rotated | See [Secrets](#secrets) |
| `db-init` log: `PostgreSQL at <host>:5432 is not ready after 60 attempts` | RDS is not available, or the network path is blocked. The RDS security group allows port 5432 only from the EKS cluster security group | `aws rds describe-db-instances --db-instance-identifier medibook-dev --query "DBInstances[0].DBInstanceStatus"`. Then test from a pod: `kubectl run pg-check -n medibook --rm -it --restart=Never --image=postgres:16-alpine -- pg_isready -h <db address> -p 5432` |
| The job pod shows `CreateContainerConfigError` (`secret "db-init" not found`) | The `db-init` ExternalSecret has not synced | See [Secrets](#secrets) |
| `permission denied for database` when a service login opens another database | This is intended: each login may connect only to its own database | Nothing to fix |

## Terraform

Run these from `terraform/envs/dev`.

| Symptom | Cause | Fix |
|---|---|---|
| Stuck state lock: `Error acquiring the state lock` with a lock ID | Another plan or apply is running, on a laptop or in CI. All of them use the same lock file, `dev/terraform.tfstate.tflock`. Or a run was killed and left the lock behind | Wait first: CI runs use `-lock-timeout=5m` and share one concurrency group. Only when you are sure nothing is running, run `terraform force-unlock <LOCK_ID>`. Never unlock a running apply: two writers can corrupt the state |
| Destroy stuck on the VPC (subnets, internet gateway) | The ALB was left behind | See [ALB](#alb) and [Cleanup](cleanup.md) |
| The node group stays in CREATING, then fails with `AsgInstanceLaunchFailures`. CloudTrail `RunInstances` says `The specified instance type is not eligible for Free Tier` | The account is on the AWS Free plan, which launches only Free Tier eligible instance types. `run-instances --dry-run` checks permissions, not eligibility | Use an eligible type (`node_instance_type`, default `m7i-flex.large`). List them: `aws ec2 describe-instance-types --filters Name=free-tier-eligible,Values=true --query "InstanceTypes[].InstanceType"` |
| Terraform, the AWS CLI or kubectl reports expired credentials | The `aws login` session ended. This is by design, so no access keys are kept on the laptop | Run `aws login` again. kubectl uses the same session through `aws eks get-token` |
| PowerShell: `Too many command line arguments` on `terraform plan -out=dev.tfplan` | PowerShell splits an unquoted `-name=value.ext` argument | Quote it: `terraform plan "-out=dev.tfplan"` |
| The Terraform apply workflow stops with `The plan destroys N resource(s)` | A safety guard in `terraform-apply.yml` | Read the plan. If the destroy is intended, run the workflow again with `allow_destroy` |

## CI

| Symptom | Cause | Fix |
|---|---|---|
| `Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity` | The role's trust policy does not match the token's `sub`. GitHub writes the subject with immutable IDs: `repo:<owner>@<owner-id>/<repo>@<repo-id>:...`. The job may also not be one the role trusts: `ecr-push` trusts pushes to `main`, `tf-plan` trusts pull requests and `main`, and `tf-apply` trusts only the `dev` environment | Find the real subject in CloudTrail: the `AssumeRoleWithWebIdentity` event, field `userIdentity.userName`. Set `github_repository` in `terraform/envs/dev/variables.tf` to that form and apply. A deleted and recreated repository gets a new ID and must be trusted again |
| Service CI fails at **Scan** | Trivy found a HIGH or CRITICAL vulnerability that has a fix | Upgrade the package or base image named in the log, run the tests, and push. Findings without a fix (`--ignore-unfixed`) do not fail the job, though the ECR scan on push still lists them |
| ECR push: the tag already exists | ECR tags are immutable. The workflow checks `describe-images` first and skips the push, so a re-run of the same commit is fine. A manual `docker push` of an existing tag is refused | On a re-run, nothing. Never reuse a tag; build from a new commit |
| Terraform CI fails at **Checkov** | A changed resource breaks a rule | Fix it. If the exception is deliberate, add `# checkov:skip=<ID>:<reason>` next to the resource |
| The `Plan (dev)` job is skipped on a pull request | Pull requests from forks get no AWS access | This is expected |
| A change in `k8s/` did not start Service CI | Service CI runs only for `services/`, `frontend/` and its related paths | This is expected: Argo CD deploys `k8s/` changes directly |
