output "vpc_id" {
  description = "ID of the VPC."
  value       = module.vpc.vpc_id
}

output "azs" {
  description = "Availability zones in use."
  value       = module.vpc.azs
}

output "public_subnet_ids" {
  description = "IDs of the public subnets."
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets."
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets."
  value       = module.vpc.database_subnet_ids
}

output "nat_public_ips" {
  description = "Public IP addresses of the NAT gateways."
  value       = module.vpc.nat_public_ips
}

output "cluster_name" {
  description = "Name of the EKS cluster."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint of the Kubernetes API."
  value       = module.eks.cluster_endpoint
}

output "cluster_version" {
  description = "Kubernetes version of the cluster."
  value       = module.eks.cluster_version
}

output "cluster_security_group_id" {
  description = "Security group shared by the control plane and the nodes."
  value       = module.eks.cluster_security_group_id
}

output "oidc_provider_arn" {
  description = "IAM OIDC provider for IRSA."
  value       = module.eks.oidc_provider_arn
}

output "ecr_repository_urls" {
  description = "ECR repository URLs by name."
  value       = module.ecr.repository_urls
}

output "kubeconfig_command" {
  description = "Command that adds this cluster to the local kubeconfig."
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}
