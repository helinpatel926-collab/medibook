# One PostgreSQL instance for all services. Each service gets its own database and login,
# created later by a one-time Kubernetes job, so no service can read another service's data.

resource "aws_db_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids

  tags = {
    Name = var.name
  }
}

resource "aws_security_group" "db" {
  name        = "${var.name}-db"
  description = "PostgreSQL access from the EKS cluster only"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.name}-db"
  }
}

resource "aws_vpc_security_group_ingress_rule" "postgres" {
  for_each = toset(var.allowed_security_group_ids)

  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = each.value
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "PostgreSQL from the EKS cluster"
}

resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage = var.allocated_storage
  storage_type      = var.storage_type
  storage_encrypted = true

  username                    = var.master_username
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period    = var.backup_retention_days
  backup_window              = "07:00-07:30"
  maintenance_window         = "sun:07:30-sun:08:00"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true
  apply_immediately          = true

  # Dev environment: the destroy and rebuild test must be able to remove it.
  deletion_protection = false
  skip_final_snapshot = true
}
