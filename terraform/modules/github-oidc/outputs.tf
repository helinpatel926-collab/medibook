output "provider_arn" {
  description = "ARN of the GitHub OIDC provider."
  value       = aws_iam_openid_connect_provider.github.arn
}

output "tf_plan_role_arn" {
  description = "Role for terraform plan."
  value       = aws_iam_role.tf_plan.arn
}

output "tf_apply_role_arn" {
  description = "Role for terraform apply."
  value       = aws_iam_role.tf_apply.arn
}

output "ecr_push_role_arn" {
  description = "Role for pushing images to ECR."
  value       = aws_iam_role.ecr_push.arn
}
