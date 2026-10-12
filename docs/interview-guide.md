# Interview guide

These are questions an interviewer is likely to ask about MediBook, with short model answers. Every answer is based on what is in this repository and what was measured on the live setup. Use them as talking points, not as a script. Details are in [Architecture](architecture.md), [Operations](operations.md), [Security](security.md) and [Troubleshooting](troubleshooting.md).

## Architecture

### 1. Why microservices, and why only these four?

They show what microservices are for: each service deploys on its own, has its own pipeline and database, calls other services, and fails on its own. The AWS cost is almost the same as for a monolith, because the services share the nodes, the ALB, RDS and the NAT gateway. Four is a deliberate size: three business areas (doctors and schedules, patients, appointments) plus staff sign-in. Each is a real boundary with its own data. More services would add work without adding a new concept. A notification service was considered optional and was not built.

### 2. Why a database per service, and why on one RDS instance?

Each service owns its schema and changes it without coordinating with the others, and any other data comes through an API. This is enforced, not just agreed: each service has its own login that owns its database, `CONNECT` is revoked from `PUBLIC`, and a test showed each login denied on the other two databases. One `db.t4g.micro` instance keeps the cost and the backups simple on the Free plan. The trade-off is that the isolation is logical, not physical: one failure domain, one admin login, shared CPU and memory.

### 3. How do the services talk to each other?

They use synchronous REST over Kubernetes DNS, for example `http://patient-service:8000`. appointment-service is the only service that calls others. It reads slot templates from doctor-service and finds or creates patients through patient-service's `/internal/patients/match`. Every call has a 3-second timeout, and the doctor list is cached for 60 seconds. patient-service and appointment-service check staff JWTs (HS256) locally with the shared key, so no request has to wait for auth-service.

### 4. Why is there no API gateway?

The ALB does the gateway's routing job. The Ingress has the same path rules as the frontend's Nginx: `/api/auth` goes to auth-service, the doctor paths to doctor-service, `/api/staff/patients` to patient-service, the other `/api/public` and `/api/staff` paths to appointment-service, and `/` to the frontend. `/internal` has no rule, so it ends up at the frontend, which returns 404.

### 5. What happens when patient-service is down?

This was demo 4: patient-service was set to `replicas: 0` in Git. The home page, departments, doctors and availability kept returning 200, because none of them needs patient-service. Online booking returned 503 with "Patient service is unavailable. Please try again shortly.", and the form kept what the user had typed. The staff patient API got a 503 from the ALB, because its target group had no targets. The `alb-elb-5xx` alarm fired. After `git revert`, the pods were back in 31 seconds. appointment-service stayed healthy throughout, because its readiness check tests only its own database.

## Kubernetes and EKS

### 6. How do pods get AWS access?

Through IRSA. The cluster has an IAM OIDC provider. A service account is annotated with a role ARN, and EKS injects a signed token into the pod. STS exchanges that token for one-hour credentials only if the role's trust policy matches `system:serviceaccount:<namespace>:<name>` and the audience. Four add-ons have their own narrow roles: the load balancer controller, External Secrets (it may read only the MediBook secrets), Fluent Bit (it may only write to one log group) and the EBS CSI driver. The app pods have no AWS access at all. With IMDSv2 and a hop limit of 1, pods also cannot fall back to the node's role.

### 7. What does a NetworkPolicy do here?

It is a firewall for pods at the IP and port level. The `medibook` namespace denies all incoming traffic by default. Then it allows only the ALB subnets, the frontend to the APIs, appointment-service to doctor-service and patient-service, and Prometheus (the `monitoring` namespace) to port 8000. The VPC CNI enforces this only when `enableNetworkPolicy` is on, which had to be enabled. Tests showed that an unlabelled pod and a pod in another namespace time out. Policies cannot filter by URL path: `/internal` is protected by never being routed, and the policies limit which pods can reach patient-service at all.

### 8. Why both `/health` and `/ready`?

Liveness (`/health`) never touches the database, so a database outage doesn't make Kubernetes restart healthy processes. Readiness (`/ready`) checks the service's own database. A pod that can't reach it leaves the Service and the ALB until it recovers. A startup probe gives each API pod up to 60 seconds to start.

### 9. How do rollouts avoid downtime?

Rollouts use the default rolling update: with 2 replicas, one new pod is added and none is removed until it is ready. ALB readiness gates make "ready" mean "healthy in the ALB", not just "the process answers". A 10-second `preStop` sleep and a 30-second deregistration delay let the ALB drain a pod before it stops. PodDisruptionBudgets keep at least one pod during node maintenance, and the node group replaces one node at a time. In demo 1, the site kept answering 200 throughout the rollout.

### 10. How does autoscaling work?

Each service has an HPA with 2 to 4 replicas at 70% CPU of its requests. The Deployments have no `replicas` field, so the HPA and Argo CD self-heal never fight over the count. In demo 3, k6 sent 20 virtual users to the availability API, and appointment-service went 2 → 3 → 4 pods with 6,779 requests and 0 failures. It went back to 2 after the scale-down window. Nodes don't autoscale: the node group is fixed at 2 (maximum 3), with no Cluster Autoscaler.

### 11. Why prefix delegation and `maxPods = 50`?

Every pod takes a VPC IP address. Without prefix delegation, an m7i-flex.large can only hold 29 pods because of its network interface limits. Prefix delegation assigns blocks of 16 addresses, which is why the private subnets are `/20`. The kubelet reserves memory for every pod slot, so 50 leaves more memory for the apps than the usual 110 and is still plenty for this cluster.

## Terraform

### 12. How is the Terraform state stored and locked?

It is stored in an S3 bucket created by a small `bootstrap` stack, which keeps its own state locally because the bucket can't hold state before it exists. The bucket is versioned, encrypted, blocks public access, denies non-TLS requests and has `prevent_destroy`. Locking uses S3 native lock files (`use_lockfile = true`, Terraform 1.11 or later), so no DynamoDB table is needed. CI waits up to 5 minutes for a lock, and plan and apply share one concurrency group.

### 13. How is the code organised?

Reusable modules (`vpc`, `eks`, `ecr`, `rds`, `secrets`, `github-oidc`, `irsa-role`) are called by one environment, `envs/dev`, which passes values between them. A production environment would call the same modules with other values. Versions are pinned: Terraform in CI, the providers in the lock file, and the EKS add-on versions in variables. Every change goes through Terraform CI: fmt, validate, TFLint, Checkov, then a plan with a read-only role.

### 14. How do you keep secrets out of Git and safe in Terraform?

RDS generates and manages the admin password itself (`manage_master_user_password`), so it is never in the code or the state. The service passwords, the JWT key and the staff password come from `random_password`, so they are in the state. That is why the state bucket is private, encrypted and TLS-only. At runtime, External Secrets copies each value from Secrets Manager into one Kubernetes Secret per service. No value is ever written to Git, and values are never printed.

### 15. The ALB is created by Kubernetes. How do the Terraform alarms watch it?

The load balancer controller owns the ALB, so Terraform doesn't know its ARN. The three ALB alarms use CloudWatch Metrics Insights queries over all load balancers in the region, for example `SELECT SUM(HTTPCode_ELB_5XX_Count) FROM SCHEMA("AWS/ApplicationELB", LoadBalancer)`. This works because the account has one ALB there, and it also means a destroy and rebuild never fails on a missing ARN.

## CI/CD and GitOps

### 16. How does a change reach production?

A pull request runs Service CI for the changed services only: tests, image build, Trivy scan. After the merge to `main`, the same jobs run again, and the image is pushed to ECR as `medibook-<service>:<short SHA>`. One last job commits the new tag into `k8s/<service>/kustomization.yaml` as `github-actions[bot]` with `[skip ci]`. Argo CD sees the commit and rolls out that one Application. Nobody runs `kubectl apply`.

### 17. How is each service deployed independently?

A path filter builds a matrix of only the changed services. Each service has its own ECR repository, its own tag in its own kustomization file, and its own Argo CD Application. In demo 1, a version change in appointment-service ran one matrix job (59 s). The bot changed one file, and only the two appointment-service pods were replaced. The other eight kept their names and start times.

### 18. How do you roll back?

With `git revert` on the tag commit. Only `k8s/` changes, so Service CI doesn't run, and Argo CD deploys the previous image. In demo 5, a tag that doesn't exist left the new pod in `ErrImagePull`, but the old pods kept serving (30 of 30 requests OK). The revert made the app healthy again in 10 seconds. `kubectl rollout undo` isn't used, because self-heal would put Git's version back. ECR keeps the last 10 images, and tags are immutable.

### 19. What does Argo CD self-heal give you?

Git stays the only source of truth. In demo 2, `kubectl patch` set an HPA's `maxReplicas` to 10, and Argo CD set it back to 4 about 2 seconds later. Every Application also prunes what was removed from Git and retries with backoff. An app of apps (`root`) creates the others, and sync waves order them: add-ons, then the platform, the APIs, the frontend, the ALB, the network policies, and finally monitoring.

### 20. How is the pipeline itself protected?

- No stored AWS keys: each job gets one-hour credentials for one role through OIDC.
- The plan role is read-only, and the image role can push only to the five MediBook repositories.
- The admin-level apply role can only be taken by a job in the GitHub environment `dev`.
- Pull requests from forks get no AWS access.
- Only the tag-update job can write to the repository.
- Actions are pinned to commit SHAs, tool images to digests, and the Trivy download to its checksum.

## Security

### 21. Why OIDC instead of access keys?

Access keys don't expire by themselves, can leak from settings or logs, and need rotating. With OIDC, GitHub signs a token that says exactly which repository, branch, event or environment the job runs for, and AWS checks that against each role's trust policy. The subject contains the immutable owner and repository IDs, so a recreated repository with the same name can't use the roles.

### 22. Why is the EKS API endpoint public?

It is public but protected by IAM. Only principals with an EKS access entry get in, the admin signs in with MFA, and anything without valid credentials gets HTTP 401, even on `/version`. An IP allow list was used at first and then removed. It forced the admin's home IP into a GitHub secret, broke access whenever that IP changed, and would have needed changing at handover. The trade-off is one fewer network layer. Production would use a private endpoint behind a VPN or bastion.

### 23. How are the containers hardened?

They run as non-root (UID 10001, or 101 for Nginx) with a read-only root filesystem and an in-memory `/tmp`. They have no privilege escalation, all Linux capabilities dropped, seccomp `RuntimeDefault` and no service account token. The namespace enforces the Pod Security `baseline` level and warns at `restricted`. Images are scanned by Trivy in CI and by ECR on push.

## Observability

### 24. How do you monitor the platform?

There are three layers:
- **Prometheus and Grafana** for metrics. A dashboard shows RED metrics per service (rate, 5xx errors, p95 latency) plus restarts, CPU and memory, scraped every 30 seconds through ServiceMonitors.
- **Fluent Bit** ships every `medibook` container log line to CloudWatch Logs, with one stream per pod.
- **Six CloudWatch alarms** on RDS and the ALB, sending notifications to an SNS topic.

Grafana and Prometheus are reached only through port-forward.

### 25. Why CloudWatch alarms instead of Alertmanager?

CloudWatch alarms watch from outside the cluster, so they still fire when the cluster itself is broken, and that is when you need them most. Alertmanager is turned off. The alarms cover database CPU, storage and memory, ALB errors, service errors and unhealthy targets.

### 26. In demo 4, why did the unhealthy-targets alarm not fire?

With zero pods, the target group had no targets at all, so none could be unhealthy. The alarm that covers "nothing is running" is the ALB's own 5xx count (`alb-elb-5xx`). It went to ALARM with 20 errors against a threshold of 5, and back to OK on its own after a full 5-minute period without errors. Testing the alarms is how this gap was found.

## Incidents and trade-offs

### 27. Which real problems did you hit, and how were they solved?

- **The Free plan refused t3.medium.** The node group stayed in CREATING for 33 minutes, then failed with `AsgInstanceLaunchFailures`. CloudTrail showed `RunInstances` refused: "The specified instance type is not eligible for Free Tier". An earlier `--dry-run` probe had passed, but a dry run checks permissions, not eligibility. The fix was to list eligible types (`describe-instance-types --filters Name=free-tier-eligible,Values=true`) and choose 2 × m7i-flex.large, which gives the most memory for the price.
- **The GitHub OIDC subject format.** Every check passed, but the AWS sign-in failed with `Not authorized to perform sts:AssumeRoleWithWebIdentity`. CloudTrail showed that GitHub now sends `repo:<owner>@<owner-id>/<repo>@<repo-id>:...`, while the roles trusted `owner/repo`. The trust policies were changed to the ID form, which is also safer.
- **Trivy findings.** The first scan found a CRITICAL in PyJWT 2.9.0, HIGHs in Starlette, and 41 HIGH and CRITICAL findings in the old `nginx-unprivileged:1.27-alpine` base image. They were fixed by upgrading, not ignored: PyJWT 2.14.0, FastAPI 0.141.1 with Starlette 1.6.0, and `nginx-unprivileged:1.30.5-alpine3.24`. All 42 tests and 24 smoke checks passed afterwards.
- **The IP allow list.** It was removed in favour of IAM access entries and MFA (question 22).
- **Smaller ones:**
  - Checkov flagged the IMDS hop limit of 2, which was changed to 1.
  - The `db-init` job needed explicit `SET` and `INHERIT` grants on PostgreSQL 16, because the RDS admin is not a superuser.
  - The frontend must start after the APIs, because Nginx resolves their names at startup.

### 28. What would you add for production?

- **HTTPS** with a domain and an ACM certificate, and Cognito for staff sign-in. Today it is HTTP only.
- **A service mesh or mTLS** between services.
- **Circuit breakers** and retries with backoff. Today it relies on timeouts only.
- **Distributed tracing** with OpenTelemetry.
- **Multi-AZ RDS**, with deletion protection and longer backups, and separate instances for critical data.
- **Secret rotation** with pods that pick up new values.
- **One NAT gateway per zone.**
- **Smaller items:**
  - A private EKS endpoint.
  - `verify-full` TLS to RDS.
  - Egress NetworkPolicies.
  - A Cluster Autoscaler or Karpenter.
  - An on-call subscriber for the alarms.
