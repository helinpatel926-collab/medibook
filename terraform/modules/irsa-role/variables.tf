variable "name" {
  description = "Name of the role."
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the cluster's IAM OIDC provider."
  type        = string
}

variable "oidc_issuer" {
  description = "OIDC issuer host of the cluster, without https://."
  type        = string
}

variable "namespace" {
  description = "Namespace of the service account."
  type        = string
}

variable "service_account" {
  description = "Name of the service account."
  type        = string
}

variable "policy_json" {
  description = "Permissions of the role, as an IAM policy document."
  type        = string
}
