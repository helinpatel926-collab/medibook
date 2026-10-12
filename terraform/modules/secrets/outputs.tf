output "db_secret_arns" {
  description = "Database secret ARN for each service."
  value       = { for name, secret in aws_secretsmanager_secret.db : name => secret.arn }
}

output "jwt_secret_arn" {
  description = "ARN of the JWT signing key secret."
  value       = aws_secretsmanager_secret.jwt.arn
}

output "staff_secret_arn" {
  description = "ARN of the staff sign-in secret."
  value       = aws_secretsmanager_secret.staff.arn
}

output "secret_arns" {
  description = "Every secret this module manages."
  value = concat(
    [for secret in aws_secretsmanager_secret.db : secret.arn],
    [aws_secretsmanager_secret.jwt.arn, aws_secretsmanager_secret.staff.arn],
  )
}
