output "arn" {
  description = "ARN of the role, for the eks.amazonaws.com/role-arn annotation of the service account."
  value       = aws_iam_role.this.arn
}

output "name" {
  description = "Name of the role."
  value       = aws_iam_role.this.name
}
