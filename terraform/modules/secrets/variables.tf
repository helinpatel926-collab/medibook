variable "prefix" {
  description = "Path prefix of every secret name, for example medibook/dev."
  type        = string
}

variable "db_host" {
  description = "Host name of the PostgreSQL instance."
  type        = string
}

variable "db_port" {
  description = "Port of the PostgreSQL instance."
  type        = number
}

variable "service_databases" {
  description = "Database and login name for each service that owns a database."
  type = map(object({
    database = string
    username = string
  }))
}

variable "staff_email" {
  description = "Email of the front-desk staff account."
  type        = string
}

variable "staff_name" {
  description = "Display name of the staff account."
  type        = string
  default     = "Front desk"
}

variable "staff_role" {
  description = "Role shown for the staff account."
  type        = string
  default     = "Receptionist"
}

variable "recovery_window_days" {
  description = "Days a deleted secret can be restored. 0 deletes immediately, which the destroy and rebuild test needs."
  type        = number
  default     = 0
}
