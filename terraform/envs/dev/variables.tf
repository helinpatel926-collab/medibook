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
  description = "EC2 instance type of the EKS nodes. Only zones that offer it are used."
  type        = string
  default     = "t3.medium"
}
