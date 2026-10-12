output "address" {
  description = "Host name of the database."
  value       = aws_db_instance.this.address
}

output "port" {
  description = "Port of the database."
  value       = aws_db_instance.this.port
}

output "security_group_id" {
  description = "Security group of the database."
  value       = aws_security_group.db.id
}

output "master_user_secret_arn" {
  description = "Secrets Manager secret with the administrator login, managed by RDS."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}
