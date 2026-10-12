# Terraform

All AWS infrastructure is defined in `terraform/`. This page covers the stacks, modules, state, versions, checks and commands. For the build order, see [setup.md](setup.md). For teardown, see [cleanup.md](cleanup.md).

## Two stacks

| Stack | Creates | State | Resources |
|---|---|---|---|
| `terraform/bootstrap/` | The S3 bucket that stores Terraform state | Local `terraform.tfstate` (git-ignored; keep it safe) | 7 |
| `terraform/envs/dev/` | Network, cluster, registry, database, secrets, IAM, alarms | `s3://medibook-tfstate-<account-id>/dev/terraform.tfstate` | 95 |

The bootstrap stack keeps its state locally because the bucket cannot hold its own state before it exists.

```text
terraform/
├── .tflint.hcl
├── bootstrap/           main.tf, variables.tf, outputs.tf, versions.tf, .terraform.lock.hcl
├── modules/
│   ├── vpc/  eks/  ecr/  rds/  secrets/  github-oidc/  irsa-role/
└── envs/dev/            backend.tf, versions.tf, variables.tf, main.tf, iam.tf, alarms.tf,
                         outputs.tf, policies/, .terraform.lock.hcl
```

## Modules

| Module | Creates | Resources |
|---|---|---|
| `vpc` | VPC `10.0.0.0/16` across 2 availability zones. Each zone gets a public, a private and a database subnet. Also an internet gateway, one NAT gateway with its Elastic IP, route tables and a free S3 gateway endpoint. The default security group has all rules removed. The database subnets have no route to the internet | 23 |
| `eks` | EKS cluster (Kubernetes 1.35, public and private endpoints, access entries, `api`/`audit`/`authenticator` logs kept 3 days). Also the cluster and node IAM roles and a launch template (IMDSv2 with hop limit 1, encrypted 20 GiB gp3 disk, `maxPods` 50). The managed node group runs 2 × `m7i-flex.large` (min 2, max 3, AL2023, on-demand). Five managed add-ons are pinned: vpc-cni (prefix delegation and NetworkPolicy enforcement on), kube-proxy, coredns, EBS CSI driver and metrics-server. The module also creates the IAM OIDC provider for IRSA and the EBS CSI driver role | 21 |
| `ecr` | One repository per image (5). Tags are immutable, images are scanned on push and encrypted with AES-256, and a lifecycle policy keeps the last 10. `force_delete` lets destroy remove repositories that still hold images | 10 |
| `rds` | PostgreSQL 16 on `db.t4g.micro`: Single-AZ, 20 GiB gp2, encrypted, not public, 1-day backups. Also a DB subnet group and a security group that allows port 5432 only from the EKS cluster security group. RDS manages the admin password in its own Secrets Manager secret | 4 |
| `secrets` | Generated passwords and 5 Secrets Manager secrets: `medibook/dev/{doctor,patient,appointment}-service/db`, `medibook/dev/jwt`, `medibook/dev/staff-login`. The recovery window is 0, so a destroy deletes them at once and a rebuild can reuse the names | 15 |
| `github-oidc` | The GitHub OIDC provider and three CI roles with their policies: `medibook-dev-github-tf-plan`, `-tf-apply` and `-ecr-push` (see [cicd-gitops.md](cicd-gitops.md#aws-access-with-oidc)) | 8 |
| `irsa-role` | One IAM role that exactly one Kubernetes service account can assume, with an inline policy. Called 3 times | 2 each |

### Files in `envs/dev`

| File | Contents |
|---|---|
| `backend.tf` | S3 backend (see [State](#state)) |
| `versions.tf` | Version constraints, region, and default tags on every resource: `Project`, `Environment`, `ManagedBy = terraform`, `Stack = medibook-dev` |
| `main.tf` | Picks the zones where the node type is offered, then calls `vpc`, `eks`, `ecr`, `rds` and `secrets` |
| `iam.tf` | Calls `github-oidc` and `irsa-role` (three times), writes the External Secrets and Fluent Bit policies, and creates the log group `/medibook/dev/services` (3 days) |
| `alarms.tf` | SNS topic `medibook-dev-alarms`, an email subscription when `alarm_email` is set, and 6 alarms |
| `policies/aws-load-balancer-controller-v3.5.0.json` | The official IAM policy of AWS Load Balancer Controller v3.5.0. It must match the chart version in `k8s/argocd/apps/aws-load-balancer-controller.yaml` |
| `outputs.tf` | Values used by later steps (below) |

Pod roles (IRSA). Each role trusts one service account only:

| Role | Service account | Permissions |
|---|---|---|
| `medibook-dev-aws-load-balancer-controller` | `kube-system/aws-load-balancer-controller` | Official v3.5.0 policy |
| `medibook-dev-external-secrets` | `external-secrets/external-secrets` | `GetSecretValue`, `DescribeSecret`, `ListSecretVersionIds` on the 5 app secrets and the RDS admin secret (for the `db-init` job) |
| `medibook-dev-fluent-bit` | `logging/fluent-bit` | `CreateLogStream`, `PutLogEvents`, `DescribeLogStreams` on `/medibook/dev/services` only |
| `medibook-dev-ebs-csi-driver` (in `eks`) | `kube-system/ebs-csi-controller-sa` | `AmazonEBSCSIDriverPolicy` |

Alarms. Each one notifies the SNS topic when it changes to ALARM and back to OK:

| Alarm | Fires when |
|---|---|
| `medibook-dev-rds-cpu` | Database CPU above 80% for 15 minutes |
| `medibook-dev-rds-storage` | Less than 2 GiB of free storage for 15 minutes |
| `medibook-dev-rds-memory` | Less than 100 MiB of freeable memory for 15 minutes |
| `medibook-dev-alb-elb-5xx` | The ALB itself returns more than 5 server errors in 5 minutes |
| `medibook-dev-alb-target-5xx` | The services return more than 5 server errors in 5 minutes |
| `medibook-dev-alb-unhealthy-targets` | Any target is unhealthy for 3 minutes |

The load balancer controller creates the ALB, so Terraform does not know its ARN. The ALB alarms therefore use CloudWatch Metrics Insights queries over all ALBs in the region (this account has one). Without an ARN dependency, destroy and rebuild never fail on a missing ALB.

## State

- **Backend:** `bucket = "medibook-tfstate-<account-id>"`, `key = "dev/terraform.tfstate"`, `region = "ca-central-1"`, `encrypt = true`, `use_lockfile = true`.
- **Locking:** S3 native. During a plan or apply, Terraform writes `dev/terraform.tfstate.tflock` next to the state, and a second run waits or fails. No DynamoDB table is used. Native locking needs Terraform 1.11 or newer.
- **Bucket:** versioning, SSE-S3 (`AES256`), all public access blocked, `BucketOwnerEnforced`, and a bucket policy that denies any request without TLS. Old state versions expire after 30 days and incomplete uploads after 7. `prevent_destroy` blocks accidental deletion.
- **Secrets in state:** the generated passwords are stored in the state. This is why the bucket is private, encrypted and TLS-only.
- **Repeated name:** backend blocks cannot use variables, so `iam.tf` repeats the bucket name (`locals.state_bucket`). The `tf-plan` role may write only the lock file.

## Pinned versions

| Item | Pin |
|---|---|
| Terraform | `>= 1.11, < 2.0` in every `versions.tf`; CI uses 1.16.5 |
| AWS provider | `~> 6.0`; 6.68.0 recorded in `.terraform.lock.hcl` |
| random provider | `~> 3.6`; 3.9.1 recorded in `.terraform.lock.hcl` |
| Kubernetes | 1.35 with `upgrade_policy = STANDARD` (no paid extended support) |
| EKS add-ons | vpc-cni `v1.22.4-eksbuild.3`, kube-proxy `v1.35.3-eksbuild.29`, coredns `v1.13.2-eksbuild.50`, aws-ebs-csi-driver `v1.66.0-eksbuild.1`, metrics-server `v0.9.0-eksbuild.11` |
| PostgreSQL | Major version 16. AWS picks the minor version and applies minor upgrades |
| Load balancer controller policy | v3.5.0, matching the Helm chart |
| TFLint AWS ruleset | 0.49.0, in `terraform/.tflint.hcl` |

Both stacks commit their `.terraform.lock.hcl`, so every machine uses the same provider builds.

## Variables (`envs/dev`)

| Variable | Default | Purpose |
|---|---|---|
| `project`, `environment` | `medibook`, `dev` | Names (`medibook-dev`) and tags |
| `region` | `ca-central-1` | Provider region |
| `vpc_cidr`, `az_count` | `10.0.0.0/16`, `2` | Network; subnets are calculated from the CIDR |
| `node_instance_type` | `m7i-flex.large` | EKS nodes |
| `kubernetes_version` | `1.35` | EKS version |
| `eks_addon_versions` | Pinned versions (above) | Managed add-ons |
| `cluster_admin_arns` | The IAM admin user | Who gets cluster-admin access |
| `db_engine_version` | `16` | PostgreSQL major version |
| `staff_email` | `frontdesk@medibook.test` | Staff sign-in; the password is generated |
| `github_repository` | `<owner>@<owner-id>/<repo>@<repo-id>` | The only repository the CI roles trust |
| `github_apply_environment` | `dev` | The GitHub environment that may run `terraform apply` |
| `service_log_retention_days` | `3` | Retention of `/medibook/dev/services` |
| `alarm_email` | `null` | Email for alarm notifications; `null` means no subscription |
| `service_names` | 5 image names | One ECR repository each |

## Outputs

| Output | Contents |
|---|---|
| `vpc_id`, `azs`, `public_subnet_ids`, `private_subnet_ids`, `database_subnet_ids`, `nat_public_ips` | Network |
| `cluster_name`, `cluster_endpoint`, `cluster_version`, `cluster_security_group_id`, `oidc_provider_arn`, `kubeconfig_command` | Cluster |
| `ecr_repository_urls` | Where CI pushes images |
| `db_address`, `db_master_secret_arn`, `app_secret_arns` | Database and secrets |
| `github_role_arns`, `irsa_role_arns` | Roles for the workflows and the pods |
| `service_log_group`, `alarm_topic_arn` | Logging and alarms |

## Design decisions

### AWS Free plan

| Decision | Reason |
|---|---|
| `m7i-flex.large` nodes (2 vCPU, 8 GiB) | The Free plan launches only Free Tier eligible types, so `t3.medium` was refused. Among the eligible types, this one has the most memory for the price |
| `maxPods = 50` with VPC CNI prefix delegation | Prefix delegation allows more pods than the network interface limit. The kubelet reserves memory for every pod slot, so a lower limit leaves more for the apps |
| RDS `db.t4g.micro`, Single-AZ, 20 GiB gp2, 1-day backups | The RDS Free tier template |
| One NAT gateway for both zones; AWS managed encryption keys instead of customer managed KMS keys | Lower cost in dev. The related Checkov skips give the reason in the code |

### IAM-only Kubernetes API

- The public endpoint accepts `0.0.0.0/0`, and a private endpoint serves the nodes. IAM is the protection: `authentication_mode = "API"` (access entries, no `aws-auth` ConfigMap), `bootstrap_cluster_creator_admin_permissions = false`, and only `cluster_admin_arns` get `AmazonEKSClusterAdminPolicy`. Requests without valid credentials get HTTP 401 on every path, including `/version`.
- An allow list with the admin's home IP was used at first and then removed. It put the IP in a git-ignored file and a CI secret, and it locked the admin out whenever the IP changed.
- Pods cannot reach the node's credentials: IMDSv2 with hop limit 1. Pods get AWS access only through IRSA.

## Lint and scan

Terraform CI runs these on every pull request and every push to `main` that touches `terraform/` (see [cicd-gitops.md](cicd-gitops.md#terraform-ci)):

| Check | Tool and settings |
|---|---|
| Format | `terraform fmt -check -recursive` |
| Validate | `terraform validate` for both stacks, after `init -backend=false` |
| Lint | TFLint v0.64.0, `recommended` preset plus the AWS ruleset 0.49.0, `call_module_type = "local"` (`terraform/.tflint.hcl`) |
| Security scan | Checkov 3.3.19, `--framework terraform` |

TFLint reports no issues. Checkov reports 259 passed, 0 failed and 28 skipped. One finding was fixed instead of skipped: the node metadata hop limit went from 2 to 1. Every skip is an inline comment next to the resource, in the form `# checkov:skip=<ID>:<reason>`:

| Checks | Where | Reason |
|---|---|---|
| CKV_AWS_157, CKV_AWS_293, CKV_AWS_118, CKV_AWS_353, CKV_AWS_129, CKV2_AWS_30, CKV_AWS_161 | `modules/rds` | Free plan is Single-AZ only. The dev database must be destroyable. Basic metrics are enough. Log export costs extra. Query logs could contain patient data. Services use passwords from Secrets Manager |
| CKV_AWS_58, CKV_AWS_38, CKV_AWS_39, CKV_AWS_37 | `modules/eks` cluster | EKS encrypts API data with KMS by default. IAM-only endpoint (above). Three log types are enough for dev |
| CKV_AWS_338, CKV_AWS_158 | EKS and services log groups | 3-day retention. CloudWatch Logs service key |
| CKV_AWS_149, CKV2_AWS_57 | `modules/secrets` (3 resources) | Secrets Manager service key. No rotation function in dev (known limitation) |
| CKV_AWS_136 | `modules/ecr` | AES-256; a customer managed key costs extra |
| CKV2_AWS_11 | `modules/vpc` | Flow logs cost extra in dev |
| CKV_AWS_26 | `alarms.tf` SNS topic | CloudWatch cannot publish to a topic encrypted with the AWS managed SNS key |
| CKV_AWS_144, CKV_AWS_145, CKV_AWS_18, CKV2_AWS_62 | `bootstrap` bucket | Single region, versioning protects the state. SSE-S3. Access logging would need a second bucket. Nothing consumes bucket events |

To run the same tools locally with Docker, from the `terraform/` folder (in Git Bash, prefix each `docker run` with `MSYS_NO_PATHCONV=1`):

```bash
terraform fmt -check -recursive
docker run --rm -v "$PWD:/data" -w /data --entrypoint sh ghcr.io/terraform-linters/tflint:v0.64.0 \
  -c 'tflint --init && tflint --recursive --config /data/.tflint.hcl'
docker run --rm -v "$PWD:/tf:ro" bridgecrew/checkov:3.3.19 -d /tf --framework terraform --quiet --compact
```

## Commands

Run inside `terraform/envs/dev`, after signing in with `aws login`.

| Task | Command |
|---|---|
| Download providers, connect the backend | `terraform init` |
| Format all files | `terraform fmt -recursive ../..` |
| Check syntax and references | `terraform validate` |
| Preview and save the plan | `terraform plan -out=dev.tfplan` (PowerShell: `"-out=dev.tfplan"`) |
| Apply exactly the saved plan | `terraform apply dev.tfplan` |
| Check for drift | `terraform plan -detailed-exitcode` (0 = no changes, 2 = changes) |
| Show outputs | `terraform output`, or `terraform output -raw <name>` |
| List or inspect the state | `terraform state list`, `terraform state show <address>` |
| Remove everything | See [cleanup.md](cleanup.md) |

Rules:

- Always apply a saved plan, and read its last line first. Anything under "to destroy" must be expected.
- Never commit `*.tfplan`, `*.tfstate` or `.terraform/`. All three are in `.gitignore`.
- The Terraform apply workflow stops when a plan destroys or replaces anything, unless it was started with `allow_destroy`.
