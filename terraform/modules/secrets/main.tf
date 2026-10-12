# Runtime secrets of the application. External Secrets copies each one into a Kubernetes
# Secret for the service that needs it. Values are generated here and never written to Git.

resource "random_password" "db" {
  for_each = var.service_databases

  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db" {
  for_each = var.service_databases

  name                    = "${var.prefix}/${each.key}/db"
  description             = "Database login of ${each.key}"
  recovery_window_in_days = var.recovery_window_days
}

resource "aws_secretsmanager_secret_version" "db" {
  for_each = var.service_databases

  secret_id = aws_secretsmanager_secret.db[each.key].id
  secret_string = jsonencode({
    host     = var.db_host
    port     = var.db_port
    database = each.value.database
    username = each.value.username
    password = random_password.db[each.key].result
  })
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${var.prefix}/jwt"
  description             = "Key that signs and verifies staff session tokens"
  recovery_window_in_days = var.recovery_window_days
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({ JWT_SECRET = random_password.jwt.result })
}

resource "random_password" "staff" {
  length  = 20
  special = false
}

resource "aws_secretsmanager_secret" "staff" {
  name                    = "${var.prefix}/staff-login"
  description             = "Front-desk staff sign-in"
  recovery_window_in_days = var.recovery_window_days
}

resource "aws_secretsmanager_secret_version" "staff" {
  secret_id = aws_secretsmanager_secret.staff.id
  secret_string = jsonencode({
    STAFF_EMAIL    = var.staff_email
    STAFF_PASSWORD = random_password.staff.result
    STAFF_NAME     = var.staff_name
    STAFF_ROLE     = var.staff_role
  })
}
