locals {
  name = "${var.project}-${var.environment}"

  # This account has no ca-central-1c, so zones are chosen from where the node type is offered.
  azs = slice(sort(data.aws_ec2_instance_type_offerings.nodes.locations), 0, var.az_count)
}

data "aws_ec2_instance_type_offerings" "nodes" {
  location_type = "availability-zone"

  filter {
    name   = "instance-type"
    values = [var.node_instance_type]
  }
}

module "vpc" {
  source = "../../modules/vpc"

  name = local.name
  cidr = var.vpc_cidr
  azs  = local.azs

  public_subnets   = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnets  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 4, i + 1)]
  database_subnets = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, 64 + i)]

  single_nat_gateway = true
}
