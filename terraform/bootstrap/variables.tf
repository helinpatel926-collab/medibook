variable "project" {
  description = "Project name, used in resource names and tags."
  type        = string
  default     = "medibook"
}

variable "region" {
  description = "AWS region for the state bucket."
  type        = string
  default     = "ca-central-1"
}

variable "noncurrent_version_days" {
  description = "Days to keep old versions of state files before they are deleted."
  type        = number
  default     = 30
}
