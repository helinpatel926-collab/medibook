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

module "eks" {
  source = "../../modules/eks"

  name               = local.name
  kubernetes_version = var.kubernetes_version
  subnet_ids         = module.vpc.private_subnet_ids
  api_allowed_cidrs  = var.api_allowed_cidrs
  cluster_admin_arns = var.cluster_admin_arns

  # Two 8 GiB nodes, one per zone. Fewer pods per node means less memory reserved by the kubelet.
  node_instance_types = [var.node_instance_type]
  node_desired_size   = 2
  node_min_size       = 2
  node_max_size       = 3
  max_pods            = 50

  addon_versions = var.eks_addon_versions
}

module "ecr" {
  source = "../../modules/ecr"

  repositories = [for s in var.service_names : "${var.project}-${s}"]
}

module "rds" {
  source = "../../modules/rds"

  name                       = local.name
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.database_subnet_ids
  allowed_security_group_ids = [module.eks.cluster_security_group_id]
  engine_version             = var.db_engine_version
}

module "secrets" {
  source = "../../modules/secrets"

  prefix  = "${var.project}/${var.environment}"
  db_host = module.rds.address
  db_port = module.rds.port

  service_databases = {
    doctor-service      = { database = "doctors", username = "doctor_service" }
    patient-service     = { database = "patients", username = "patient_service" }
    appointment-service = { database = "appointments", username = "appointment_service" }
  }

  staff_email = var.staff_email
}
