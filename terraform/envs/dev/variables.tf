variable "project" {
  description = "Project name, used in resource names and tags."
  type        = string
  default     = "medibook"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region."
  type        = string
  default     = "ca-central-1"
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use."
  type        = number
  default     = 2
}

variable "node_instance_type" {
  description = "EC2 instance type of the EKS nodes. Only zones that offer it are used. The Free plan only launches Free Tier eligible types, so t3.medium is not allowed."
  type        = string
  default     = "m7i-flex.large"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version. One behind the newest default, and within one minor version of the local kubectl."
  type        = string
  default     = "1.35"
}

variable "eks_addon_versions" {
  description = "Pinned EKS add-on versions (the AWS default versions for the Kubernetes version above)."
  type = object({
    vpc_cni        = string
    kube_proxy     = string
    coredns        = string
    ebs_csi_driver = string
    metrics_server = string
  })
  default = {
    vpc_cni        = "v1.22.4-eksbuild.3"
    kube_proxy     = "v1.35.3-eksbuild.29"
    coredns        = "v1.13.2-eksbuild.50"
    ebs_csi_driver = "v1.66.0-eksbuild.1"
    metrics_server = "v0.9.0-eksbuild.11"
  }
}

variable "cluster_admin_arns" {
  description = "IAM principals with cluster-admin access."
  type        = list(string)
  default     = ["arn:aws:iam::710590320983:user/medibook-admin"]
}

variable "db_engine_version" {
  description = "PostgreSQL major version, the same as the local Docker Compose image. AWS picks the latest minor version and applies minor upgrades."
  type        = string
  default     = "16"
}

variable "staff_email" {
  description = "Email of the front-desk staff sign-in. The password is generated and kept in Secrets Manager."
  type        = string
  default     = "frontdesk@medibook.test"
}

variable "github_repository" {
  description = "GitHub repository whose workflows may assume the CI roles, as owner/name."
  type        = string
  default     = "helinpatel926-collab/medibook"
}

variable "github_apply_environment" {
  description = "GitHub environment, protected by required reviewers, whose jobs may run terraform apply."
  type        = string
  default     = "dev"
}

variable "service_log_retention_days" {
  description = "Days to keep the container logs of the MediBook services in CloudWatch."
  type        = number
  default     = 3
}

variable "service_names" {
  description = "Images built by the project. One ECR repository is created for each."
  type        = list(string)
  default     = ["auth-service", "doctor-service", "patient-service", "appointment-service", "frontend"]
}
