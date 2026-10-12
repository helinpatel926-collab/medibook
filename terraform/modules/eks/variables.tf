variable "name" {
  description = "Cluster name, also used as a prefix for related resources."
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version of the control plane and nodes."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnets for the control plane network interfaces and the nodes."
  type        = list(string)
}

variable "cluster_admin_arns" {
  description = "IAM principals that get cluster-admin access through EKS access entries."
  type        = list(string)
}

variable "log_retention_days" {
  description = "Retention of the control plane logs in CloudWatch."
  type        = number
  default     = 3
}

variable "node_instance_types" {
  description = "EC2 instance types of the managed node group."
  type        = list(string)
}

variable "node_desired_size" {
  description = "Number of nodes to start with."
  type        = number
  default     = 3
}

variable "node_min_size" {
  description = "Minimum number of nodes."
  type        = number
  default     = 3
}

variable "node_max_size" {
  description = "Maximum number of nodes."
  type        = number
  default     = 4
}

variable "node_disk_size" {
  description = "Root volume size of each node, in GiB."
  type        = number
  default     = 20
}

variable "max_pods" {
  description = "Pods allowed per node. 110 needs VPC CNI prefix delegation."
  type        = number
  default     = 110
}

variable "addon_versions" {
  description = "Pinned versions of the EKS managed add-ons."
  type = object({
    vpc_cni        = string
    kube_proxy     = string
    coredns        = string
    ebs_csi_driver = string
    metrics_server = string
  })
}
