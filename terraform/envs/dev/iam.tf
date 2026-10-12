locals {
  # Same values as backend.tf, which cannot use variables.
  state_bucket = "medibook-tfstate-710590320983"
  state_key    = "dev/terraform.tfstate"

  # Each IRSA role trusts exactly one service account, so the Helm releases must use these names.
  service_accounts = {
    load_balancer_controller = { namespace = "kube-system", name = "aws-load-balancer-controller" }
    external_secrets         = { namespace = "external-secrets", name = "external-secrets" }
    fluent_bit               = { namespace = "logging", name = "fluent-bit" }
  }
}

module "github_oidc" {
  source = "../../modules/github-oidc"

  name              = local.name
  repository        = var.github_repository
  apply_environment = var.github_apply_environment
  state_bucket      = local.state_bucket
  state_key         = local.state_key

  secret_arns         = module.secrets.secret_arns
  ecr_repository_arns = values(module.ecr.repository_arns)
}

module "load_balancer_controller_irsa" {
  source = "../../modules/irsa-role"

  name              = "${local.name}-aws-load-balancer-controller"
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer       = module.eks.oidc_issuer
  namespace         = local.service_accounts.load_balancer_controller.namespace
  service_account   = local.service_accounts.load_balancer_controller.name

  # The official policy of AWS Load Balancer Controller v3.5.0 (docs/install/iam_policy.json).
  policy_json = file("${path.module}/policies/aws-load-balancer-controller-v3.5.0.json")
}

data "aws_iam_policy_document" "external_secrets" {
  statement {
    actions = [
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetSecretValue",
      "secretsmanager:ListSecretVersionIds",
    ]
    # The application secrets, plus the database admin login for the one-time db-init job.
    resources = concat(module.secrets.secret_arns, [module.rds.master_user_secret_arn])
  }
}

module "external_secrets_irsa" {
  source = "../../modules/irsa-role"

  name              = "${local.name}-external-secrets"
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer       = module.eks.oidc_issuer
  namespace         = local.service_accounts.external_secrets.namespace
  service_account   = local.service_accounts.external_secrets.name
  policy_json       = data.aws_iam_policy_document.external_secrets.json
}

resource "aws_cloudwatch_log_group" "services" {
  name              = "/${var.project}/${var.environment}/services"
  retention_in_days = var.service_log_retention_days
}

data "aws_iam_policy_document" "fluent_bit" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents",
    ]
    resources = [
      aws_cloudwatch_log_group.services.arn,
      "${aws_cloudwatch_log_group.services.arn}:*",
    ]
  }
}

module "fluent_bit_irsa" {
  source = "../../modules/irsa-role"

  name              = "${local.name}-fluent-bit"
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer       = module.eks.oidc_issuer
  namespace         = local.service_accounts.fluent_bit.namespace
  service_account   = local.service_accounts.fluent_bit.name
  policy_json       = data.aws_iam_policy_document.fluent_bit.json
}
