variable "name" {
  description = "Identifier of the database instance, also used as a name prefix."
  type        = string
}

variable "vpc_id" {
  description = "VPC of the database."
  type        = string
}

variable "subnet_ids" {
  description = "Database subnets (no internet route)."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security groups allowed to connect on the PostgreSQL port (the EKS cluster security group)."
  type        = list(string)
}

variable "engine_version" {
  description = "PostgreSQL version."
  type        = string
}

variable "instance_class" {
  description = "Database instance class. The AWS Free plan offers db.t4g.micro."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Storage size in GiB."
  type        = number
  default     = 20
}

variable "storage_type" {
  description = "Storage type. The Free plan template uses gp2."
  type        = string
  default     = "gp2"
}

variable "backup_retention_days" {
  description = "Days to keep automated backups. The Free plan template uses 1."
  type        = number
  default     = 1
}

variable "master_username" {
  description = "Administrator login. Its password is generated and stored by RDS in Secrets Manager."
  type        = string
  default     = "medibook_admin"
}
