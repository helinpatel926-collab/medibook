# Security

This page lists the security decisions in MediBook, why each was made and where it lives in the code, followed by the known limitations of this dev environment. Operational details are in [Operations](operations.md), and the pipeline is in [CI/CD and GitOps](cicd-gitops.md).

## Decisions

### Identity and access

| Decision | Why | Where |
|---|---|---|
| **OIDC, no long-lived keys** | GitHub Actions gets one-hour credentials from STS by presenting a token signed by GitHub, so no AWS keys are stored in GitHub. The laptop uses `aws login` sessions, not access keys. Only the jobs that may call AWS get `id-token: write` | `terraform/modules/github-oidc/main.tf`, `aws-actions/configure-aws-credentials` in `.github/workflows/` |
| **Least-privilege CI roles** | `tf-plan` has `ReadOnlyAccess`, plus write access to the state lock file and read access to the five app secrets, which the plan refreshes. `ecr-push` may push only to the five MediBook repositories, and only from `main`. `tf-apply` has `AdministratorAccess` because it creates IAM roles, so its trust policy is the control: only a job in the GitHub environment `dev` can take it. Pull requests from forks get no AWS access. Only the tag-update job has `contents: write` | `terraform/modules/github-oidc/main.tf`, `.github/workflows/*.yml` |
| **Subjects with immutable IDs** | The roles trust `repo:<owner>@<owner-id>/<repo>@<repo-id>:...`. A repository deleted and recreated under the same name gets a new ID, so it cannot use these roles | `github_repository` in `terraform/envs/dev/variables.tf` |
| **IRSA per add-on** | The load balancer controller, External Secrets, Fluent Bit and the EBS CSI driver each have their own role. Each role trusts exactly one service account (`system:serviceaccount:<namespace>:<name>`, audience `sts.amazonaws.com`). External Secrets may read only the five MediBook secrets and the RDS admin secret. Fluent Bit may only write to `/medibook/dev/services`. The load balancer controller has the official v3.5.0 policy, and the EBS CSI driver has the AWS managed policy. The VPC CNI still uses the node role (`AmazonEKS_CNI_Policy`). The app pods have no AWS access at all (`automountServiceAccountToken: false`). In a test, a service account with a copied role annotation was refused | `terraform/modules/irsa-role/`, `terraform/envs/dev/iam.tf`, `terraform/modules/eks/irsa.tf` |
| **EKS API protected by IAM access entries and MFA** | `authentication_mode = "API"`, and the cluster creator gets no automatic admin. Only the admin IAM user, who signs in with MFA, has `AmazonEKSClusterAdminPolicy`. Requests without valid AWS credentials get HTTP 401 on every path, including `/version`. See the trade-off below | `terraform/modules/eks/main.tf`, `cluster_admin_arns` in `terraform/envs/dev/variables.tf` |

**The IP allow list trade-off.** The API endpoint first accepted only the admin's home IP. That was removed (`public_access_cidrs = ["0.0.0.0/0"]`) for three reasons. The CI plan needed the IP, which meant keeping it in a GitHub secret. Access broke whenever the home IP changed. And the list would have had to change again at handover. IAM was already the real control. The cost is one fewer network layer: the endpoint can now be reached from the internet, which exposes it to scanning and to any future flaw in the EKS API front end. Production would use a private endpoint reached through a VPN or bastion, or an allow list of fixed egress addresses.

### Network

| Decision | Why | Where |
|---|---|---|
| **Private nodes and RDS** | Nodes run in private subnets with no public IPs, and their outbound traffic goes through the NAT gateway. RDS sits in database subnets whose route table has no internet route, with `publicly_accessible = false`, and accepts port 5432 only from the EKS cluster security group | `terraform/modules/vpc/main.tf`, `terraform/modules/rds/main.tf` |
| **NetworkPolicies (default deny)** | Every pod in `medibook` refuses incoming traffic unless a policy allows it. The allowed paths are: the ALB subnets to all five; the frontend to the four APIs; appointment-service to doctor-service and patient-service; and namespace `monitoring` to port 8000. The VPC CNI enforces them only with `enableNetworkPolicy = "true"`, which is off by default. Tested: an unlabelled pod and a pod in another namespace time out | `k8s/network-policies/`, `terraform/modules/eks/addons.tf` |
| **`/internal` never routed** | Service-to-service endpoints such as `/internal/patients/match` have no ALB rule. They fall through to the frontend, whose Nginx returns 404. NetworkPolicies work at the port level, not on paths, so they add a second layer by limiting which pods can reach patient-service at all | `k8s/ingress/ingress.yaml`, `frontend/nginx.conf` |
| **IMDSv2 with hop limit 1** | Tokens are required, and the hop limit of 1 keeps pod traffic from reaching the instance metadata service, so pods cannot borrow the node's IAM role. Checkov found the original hop limit of 2. Because pods cannot read metadata, the load balancer controller, the ClusterSecretStore and Fluent Bit set their region explicitly | `terraform/modules/eks/node_group.tf` |
| **Grafana and Argo CD not public** | Both are `ClusterIP` services reached only with `kubectl port-forward`. The Grafana admin password is random. `scripts/bootstrap.sh` creates it once from stdin, so it never appears on a command line, and the chart default is never used. Argo CD runs without dex and notifications | `k8s/monitoring/kube-prometheus-stack-values.yaml`, `k8s/argocd/values.yaml`, `scripts/bootstrap.sh` |

### Data

| Decision | Why | Where |
|---|---|---|
| **A DB login per service, `CONNECT` revoked from `PUBLIC`** | Each service owns its database through its own login, and `REVOKE ALL ... FROM PUBLIC` stops the other logins from connecting. This was tested on RDS: each login is denied on the other two databases. Each service's ExternalSecret maps only its own database secret | `k8s/platform/db-init.sql`, `k8s/<service>/externalsecret.yaml` (and `db/init/` locally) |
| **TLS to RDS** | Services connect with `DB_SSLMODE=require`, and the `db-init` job with `PGSSLMODE=require`. A connection without TLS is refused (tested) | `k8s/<service>/deployment.yaml`, `k8s/platform/db-init-job.yaml` |
| **Secrets only in Secrets Manager** | Passwords and keys are generated by Terraform or by RDS, copied into one Kubernetes Secret per service by External Secrets, and never written to Git. The RDS admin password is managed by RDS, so it is not in the Terraform state. The service passwords are, which is why the state bucket is private, versioned, encrypted and TLS-only | `terraform/modules/secrets/`, `terraform/modules/rds/main.tf`, `terraform/bootstrap/main.tf` |
| **Encryption at rest everywhere** | Node root disks are encrypted gp3, and the `gp3` StorageClass for Prometheus is encrypted. RDS storage is encrypted, and so are Secrets Manager, ECR (AES-256), the state bucket (SSE-S3) and CloudWatch Logs. EKS encrypts Kubernetes Secrets with KMS by default. All of these use AWS managed keys. The one exception is the SNS alarm topic, because CloudWatch cannot publish to a topic encrypted with the AWS managed SNS key; its messages hold only alarm names | `terraform/modules/*`, `k8s/platform/storageclass.yaml`, `terraform/envs/dev/alarms.tf` |

### Workloads and supply chain

| Decision | Why | Where |
|---|---|---|
| **Non-root containers with a read-only root filesystem** | Containers run as UID 10001 (APIs) or 101 (frontend, `nginx-unprivileged`) with `runAsNonRoot`, `readOnlyRootFilesystem`, an in-memory `/tmp`, no privilege escalation, all capabilities dropped and seccomp `RuntimeDefault`. They get no service account token and no service links. The namespace enforces the `baseline` Pod Security level and warns and audits at `restricted` | `k8s/<service>/deployment.yaml`, `k8s/platform/namespace.yaml`, `services/*/Dockerfile` |
| **ECR scan on push, plus Trivy, Checkov and TFLint** | Trivy fails Service CI on any HIGH or CRITICAL finding that has a fix. ECR scans every pushed image and keeps listing findings that have no fix yet. Checkov and TFLint (recommended rules plus the AWS ruleset) check every Terraform change: 259 passed, 0 failed, 28 skipped. The first Trivy run found real issues (PyJWT, Starlette, an old Nginx base image), which were fixed by upgrading | `.github/workflows/service-ci.yml`, `.github/workflows/terraform-ci.yml`, `terraform/modules/ecr/main.tf`, `terraform/.tflint.hcl` |
| **Immutable ECR tags** | Each image is tagged with its commit's short SHA, and the tag can never be overwritten. A tag in Git therefore always means the same image, and rollbacks are exact | `terraform/modules/ecr/main.tf` |
| **Pinned actions and images** | Actions are pinned to commit SHAs, the TFLint and Checkov containers to image digests, and the Trivy binary to its SHA-256 checksum. Also pinned: Terraform 1.16.5 in CI, the providers (lock file), the EKS add-ons, the Helm charts, the Python packages (`==`) and the Nginx and PostgreSQL base images (`1.30.5-alpine3.24`, `16.15-alpine3.24`). The Python services use `python:3.12-slim`, which follows 3.12 patch releases | `.github/workflows/`, `terraform/envs/dev/variables.tf`, `k8s/argocd/apps/`, `services/*/requirements.txt`, Dockerfiles |

## Known limitations

These are deliberate for a low-cost dev environment on the AWS Free plan. The last column says what production would change.

| Limitation | Risk | For production |
|---|---|---|
| **A single NAT gateway**, in `ca-central-1a` | If that zone fails, the nodes in the other zone lose outbound internet access, including the ECR API, while they keep serving traffic | One NAT gateway per zone (`single_nat_gateway = false`) |
| **Single-AZ RDS**, with 1-day backups, no deletion protection and no final snapshot | A zone or instance failure takes all three databases down, and a `destroy` removes the data | Multi-AZ, longer backups, deletion protection, a final snapshot |
| **One RDS instance shared by 3 databases** | Isolation is logical, not physical: they share one failure domain, one admin login and the same CPU and memory | Separate instances, or clusters per domain, for critical data |
| **Public EKS endpoint**, protected by IAM | The API is reachable from the internet (see the trade-off above) | Private endpoint with VPN or bastion access, or an allow list |
| **Synchronous REST without a circuit breaker** | The services rely on timeouts only (3 s per call, plus a 60 s cache of the doctor list). A slow dependency holds requests for up to 3 s each | Circuit breakers, retries with backoff, or asynchronous events for non-critical work |
| **HTTP only, no domain** | Staff passwords and JWTs cross the internet unencrypted. Domain registration in Route 53 is not available on the Free plan | A domain, an ACM certificate and an HTTPS listener (Ingress annotations), and Cognito for staff sign-in |
| **No secret rotation function** | Service passwords, the JWT key and the staff password never change unless done by hand. Only the RDS admin secret is rotated, by RDS itself | Secrets Manager rotation, and pods that pick up new values without a manual restart |
| **The RDS certificate is not verified** | `sslmode=require` encrypts the traffic but does not check the server certificate | `verify-full`, with the RDS CA bundle in the images |
| **The `db-init` admin Secret lives in the app namespace** | No app pod mounts it, but anyone who can read Secrets in `medibook` can read the database admin login | Run `db-init` in its own namespace |
| **Ingress-only NetworkPolicies** | Pods can open any outgoing connection | Egress policies for the database, DNS and the AWS endpoints only |
| **No alarm subscriber yet** | The alarms change state, but nobody is notified until `alarm_email` is set and confirmed | An on-call email or paging integration |
| **Checkov skips**, 28 in the code | Each one is a `# checkov:skip=<ID>:<reason>` comment next to its resource. They fall into these groups. **Free plan or dev choices:** Multi-AZ, deletion protection, enhanced monitoring and Performance Insights, RDS log export, 3-day log retention. **Cost, or not needed in dev:** customer managed KMS keys (AWS managed keys are used), VPC flow logs, S3 access logging, replication and event notifications. **Privacy:** no RDS query logging, because queries could contain patient data. **Covered another way:** EKS secrets encryption (EKS already uses KMS by default), the EKS public endpoint (IAM), three control plane log types. **Also:** no rotation function, password sign-in instead of IAM database authentication, and the SNS topic encryption | Revisit each skip; most of them become the production items above |
