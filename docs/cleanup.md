# Cleanup

This page removes the whole environment. Follow the order. The load balancer controller creates the ALB, its target groups and its security groups inside the VPC, but Terraform does not know about them. If they are still there, `terraform destroy` cannot delete the VPC.

| Step | What | Why |
|---|---|---|
| 1 | Delete the `ingress` app, wait until the ALB is gone | The controller must remove what it created while it still runs |
| 2 | Delete the root app with cascade | Removes every app and its workloads; then free the Prometheus volume |
| 3 | Delete Argo CD | Nothing left to manage |
| 4 | `terraform destroy` in `envs/dev` | Removes all 95 resources |
| 5 | Check for leftovers | ENIs, EBS volumes, log groups, load balancers, target groups, security groups |
| 6 | Destroy the state bucket, only at the very end | Removes the state history as well |

Commands use bash syntax (Git Bash on Windows). Before you start, sign in, connect kubectl, and save the VPC ID for the checks in step 5:

```bash
aws login --region ca-central-1
aws eks update-kubeconfig --region ca-central-1 --name medibook-dev
VPC_ID=$(terraform -chdir=terraform/envs/dev output -raw vpc_id)
echo "$VPC_ID"
```

## 1. Delete the ingress app and wait for the ALB

The `root` app runs with self-heal, so it would recreate any child app you delete. Turn off its automated sync first, then delete `ingress`:

```bash
kubectl patch application root -n argocd --type json \
  -p '[{"op": "remove", "path": "/spec/syncPolicy/automated"}]'

kubectl delete application ingress -n argocd
```

The `ingress` app has a resources finalizer, so Argo CD deletes the Ingress, and the controller then deletes the ALB, its target groups and its security groups. Wait until both of these return nothing:

```bash
aws elbv2 describe-load-balancers --query "LoadBalancers[?LoadBalancerName=='medibook-dev'].LoadBalancerName"
aws elbv2 describe-target-groups --query "TargetGroups[?starts_with(TargetGroupName, 'k8s-medibook-')].TargetGroupName"
```

Do not continue while either list is not empty. Step 2 removes the controller, and after that nothing deletes these resources automatically.

## 2. Delete the root app with cascade

`root` has no finalizer, so a plain delete would leave the child apps running. Add the finalizer, then delete it. Argo CD then deletes every child app, and each child app deletes its own resources:

```bash
kubectl patch application root -n argocd --type merge \
  -p '{"metadata": {"finalizers": ["resources-finalizer.argocd.argoproj.io"]}}'
kubectl delete application root -n argocd

kubectl get applications -n argocd     # repeat until "No resources found"
```

As an alternative, delete the remaining apps one by one with `kubectl delete application <name> -n argocd`, starting with wave 7 and ending with wave 0.

The Prometheus volume claim belongs to the StatefulSet and stays after the `monitoring` app is gone. Delete it while the EBS CSI driver still runs, so the EBS volume is deleted too:

```bash
kubectl delete pvc --all -n monitoring
kubectl get pv                          # repeat until "No resources found"
```

## 3. Delete Argo CD

```bash
helm uninstall argocd -n argocd
kubectl delete namespace argocd
```

## 4. Destroy the infrastructure

Run this from the laptop. The Terraform apply workflow cannot remove the environment: it refuses plans that destroy resources unless `allow_destroy` is set, and it never plans a full destroy.

```bash
cd terraform/envs/dev
terraform destroy
```

Check the plan: on a full environment, it should end with `Plan: 0 to add, 0 to change, 95 to destroy` (96 if `alarm_email` was set). Type `yes` to confirm. If the `aws login` session expires during the destroy, sign in again and run the command again. Then:

- The Secrets Manager secrets are deleted at once, without the usual 7 to 30 day recovery window, because `recovery_window_in_days = 0`. A rebuild can reuse the same names.
- The ECR repositories are deleted with their images (`force_delete = true`).
- RDS is deleted without a final snapshot (`skip_final_snapshot = true`, `deletion_protection = false`).

If the destroy stops with `DependencyViolation` on a subnet, security group or the VPC, something created outside Terraform is still inside the VPC. Find it with step 5, delete it, and run `terraform destroy` again. See also [troubleshooting.md](troubleshooting.md).

After the destroy, the AWS steps of the GitHub workflows fail, because their OIDC roles no longer exist. They work again after the next build.

## 5. Check for leftovers

In an account that runs nothing else in `ca-central-1`, each command should return an empty list.

```bash
# Load balancers and target groups
aws elbv2 describe-load-balancers --query "LoadBalancers[].LoadBalancerName"
aws elbv2 describe-target-groups --query "TargetGroups[].TargetGroupName"

# Security groups created by the load balancer controller
aws ec2 describe-security-groups --filters Name=tag-key,Values=elbv2.k8s.aws/cluster \
  --query "SecurityGroups[].[GroupId,GroupName]"

# Network interfaces still in the VPC (only if the VPC still exists)
aws ec2 describe-network-interfaces --filters Name=vpc-id,Values="$VPC_ID" \
  --query "NetworkInterfaces[].[NetworkInterfaceId,Description,Status]"

# Unattached EBS volumes, for example from the Prometheus volume claim
aws ec2 describe-volumes --filters Name=status,Values=available \
  --query "Volumes[].[VolumeId,Size,CreateTime]"

# Log groups (EKS control plane and the service logs)
aws logs describe-log-groups --log-group-name-prefix /aws/eks/medibook-dev --query "logGroups[].logGroupName"
aws logs describe-log-groups --log-group-name-prefix /medibook/dev --query "logGroups[].logGroupName"

# Secrets (the app secrets and the RDS admin secret)
aws secretsmanager list-secrets \
  --query "SecretList[?starts_with(Name, 'medibook/') || starts_with(Name, 'rds')].Name"
```

Delete anything that is left:

| Leftover | Delete with |
|---|---|
| Load balancer | `aws elbv2 delete-load-balancer --load-balancer-arn <arn>` |
| Target group | `aws elbv2 delete-target-group --target-group-arn <arn>` |
| Security group | `aws ec2 delete-security-group --group-id <sg-id>` (delete the load balancer first) |
| Network interface | `aws ec2 delete-network-interface --network-interface-id <eni-id>` (only when its status is `available`) |
| EBS volume | `aws ec2 delete-volume --volume-id <vol-id>` |
| Log group | `aws logs delete-log-group --log-group-name <name>` |
| Secret | `aws secretsmanager delete-secret --secret-id <name> --force-delete-without-recovery` |

Terraform manages both log groups and deletes them. If `/aws/eks/medibook-dev/cluster` shows up again, it was created after the destroy, so delete it by hand.

The IAM admin user and any budget you created by hand are not managed by Terraform. They stay in place.

## 6. Destroy the state bucket (very end only)

Only do this when the project is finished. The bucket holds the state of `envs/dev`, and after step 4 that state only records an empty environment.

Two things protect the bucket:

- **`prevent_destroy = true`** in `terraform/bootstrap/main.tf`. Terraform refuses any plan that would delete the bucket. Remove the `lifecycle { prevent_destroy = true }` block from `aws_s3_bucket.state` first. This is a local edit; do not commit it while the project is still in use.
- **Versioning.** S3 deletes only an empty bucket, and in a versioned bucket every old version and every delete marker counts as an object. `aws s3 rm --recursive` only adds delete markers. Terraform does not empty the bucket, because `force_destroy` is not set. Delete all versions first.

```bash
BUCKET=$(terraform -chdir=terraform/bootstrap output -raw state_bucket)

aws s3api list-object-versions --bucket "$BUCKET" \
  --query "{Objects: Versions[].{Key: Key, VersionId: VersionId}}" --output json > versions.json
aws s3api delete-objects --bucket "$BUCKET" --delete file://versions.json

aws s3api list-object-versions --bucket "$BUCKET" \
  --query "{Objects: DeleteMarkers[].{Key: Key, VersionId: VersionId}}" --output json > markers.json
aws s3api delete-objects --bucket "$BUCKET" --delete file://markers.json

rm versions.json markers.json
```

If a list is empty (`"Objects": null`), skip its `delete-objects` call. The S3 console's **Empty** button does the same job.

Then destroy the bootstrap stack. It uses the local state file `terraform/bootstrap/terraform.tfstate`:

```bash
cd terraform/bootstrap
terraform destroy                       # Plan: 0 to add, 0 to change, 7 to destroy
```

To build everything again, follow [setup.md](setup.md). A rebuild gets a new RDS admin secret name and a new ALB DNS name; update them as described in [setup.md](setup.md#values-tied-to-this-account-or-this-build).
