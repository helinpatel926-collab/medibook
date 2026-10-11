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
