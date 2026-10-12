variable "name" {
  description = "Name prefix of the roles."
  type        = string
}

variable "repository" {
  description = "GitHub repository allowed to assume the roles, as it appears in the OIDC subject (owner@owner_id/name@repository_id)."
  type        = string
}

variable "main_branch" {
  description = "Branch whose pushes may plan and push images."
  type        = string
  default     = "main"
}

variable "apply_environment" {
  description = "GitHub environment (with required reviewers) whose jobs may run terraform apply."
  type        = string
}

variable "state_bucket" {
  description = "S3 bucket that holds the Terraform state."
  type        = string
}

variable "state_key" {
  description = "Key of the state file in the bucket. The lock file is this key plus .tflock."
  type        = string
}

variable "secret_arns" {
  description = "Secrets that terraform plan reads when it refreshes the state."
  type        = list(string)
}

variable "ecr_repository_arns" {
  description = "ECR repositories the image builds may push to."
  type        = list(string)
}
