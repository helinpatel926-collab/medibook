# Costs

These are approximate on-demand prices in `ca-central-1` while the full environment runs. They were measured against AWS list prices at build time. Check the AWS pricing pages for current rates.

| Resource | What runs | Per day |
|---|---|---|
| EKS control plane | 1 cluster at $0.10 per hour | about $2.40 |
| EKS nodes | 2 × `m7i-flex.large`, on-demand, $0.1067 per hour each | about $5.10 |
| NAT gateway | 1 NAT gateway and its Elastic IP | about $1.30 |
| RDS and secrets | `db.t4g.micro` with 20 GiB gp2, plus 6 Secrets Manager secrets (5 for the app, 1 managed by RDS) | about $0.60 |
| Application Load Balancer | 1 ALB shared by all services | about $0.60 |
| Small items | CloudWatch Logs (control plane and service logs, 3-day retention) and 6 alarms; EBS (node root disks 2 × 20 GiB gp3, and the 10 GiB gp3 Prometheus volume); ECR storage (about 300 MB); the S3 state bucket | a few cents each |
| **Total** | | **about $10** |

At that rate, a 30-day month costs about $300.

Some charges grow with traffic: NAT gateway data processing, ALB capacity units and log ingestion. At demo traffic they stay in the rounding.

There is no charge for IAM, the VPC itself (subnets, route tables, internet gateway), the S3 gateway endpoint, or the GitHub-hosted Actions runners, which are free for public repositories.

## Billing

This account is on the AWS Free plan, and its usage is paid from AWS credits.

## When idle

[cleanup.md](cleanup.md) removes everything.
