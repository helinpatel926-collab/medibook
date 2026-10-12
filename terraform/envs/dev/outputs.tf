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

output "db_address" {
  description = "Host name of the PostgreSQL instance."
  value       = module.rds.address
}

output "db_master_secret_arn" {
  description = "Secret with the database administrator login (managed by RDS)."
  value       = module.rds.master_user_secret_arn
}

output "app_secret_arns" {
  description = "Application secrets in Secrets Manager."
  value = {
    databases = module.secrets.db_secret_arns
    jwt       = module.secrets.jwt_secret_arn
    staff     = module.secrets.staff_secret_arn
  }
}

output "github_role_arns" {
  description = "Roles the GitHub Actions workflows assume."
  value = {
    tf_plan  = module.github_oidc.tf_plan_role_arn
    tf_apply = module.github_oidc.tf_apply_role_arn
    ecr_push = module.github_oidc.ecr_push_role_arn
  }
}

output "irsa_role_arns" {
  description = "IRSA roles, for the eks.amazonaws.com/role-arn annotation of each service account."
  value = {
    load_balancer_controller = module.load_balancer_controller_irsa.arn
    external_secrets         = module.external_secrets_irsa.arn
    fluent_bit               = module.fluent_bit_irsa.arn
  }
}

output "service_log_group" {
  description = "CloudWatch log group for the MediBook service containers."
  value       = aws_cloudwatch_log_group.services.name
}

output "alarm_topic_arn" {
  description = "SNS topic that receives the CloudWatch alarms."
  value       = aws_sns_topic.alarms.arn
}

output "kubeconfig_command" {
  description = "Command that adds this cluster to the local kubeconfig."
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}
