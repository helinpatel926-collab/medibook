# GitHub Actions signs in to AWS with short-lived OIDC tokens, so no AWS keys are stored in GitHub.
# Each role trusts only this repository, and only the event, branch or environment it is meant for.

locals {
  issuer = "token.actions.githubusercontent.com"
  repo   = "repo:${var.repository}"

  trusted_subjects = {
    tf_plan  = ["${local.repo}:pull_request", "${local.repo}:ref:refs/heads/${var.main_branch}"]
    tf_apply = ["${local.repo}:environment:${var.apply_environment}"]
    ecr_push = ["${local.repo}:ref:refs/heads/${var.main_branch}"]
  }
}

data "aws_partition" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://${local.issuer}"
  client_id_list = ["sts.amazonaws.com"]

  tags = {
    Name = "${var.name}-github"
  }
}

data "aws_iam_policy_document" "trust" {
  for_each = local.trusted_subjects

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.issuer}:sub"
      values   = each.value
    }
  }
}

# Terraform plan on pull requests and on main: read-only, plus the state lock file.

resource "aws_iam_role" "tf_plan" {
  name               = "${var.name}-github-tf-plan"
  description        = "GitHub Actions: terraform plan (read-only)"
  assume_role_policy = data.aws_iam_policy_document.trust["tf_plan"].json
}

resource "aws_iam_role_policy_attachment" "tf_plan_read_only" {
  role       = aws_iam_role.tf_plan.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/ReadOnlyAccess"
}

data "aws_iam_policy_document" "tf_plan" {
  statement {
    sid       = "StateLock"
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:${data.aws_partition.current.partition}:s3:::${var.state_bucket}/${var.state_key}.tflock"]
  }

  # ReadOnlyAccess cannot read secret values, which the plan needs to refresh the secret versions.
  statement {
    sid       = "RefreshSecretValues"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = var.secret_arns
  }
}

resource "aws_iam_role_policy" "tf_plan" {
  name   = "${var.name}-github-tf-plan"
  role   = aws_iam_role.tf_plan.id
  policy = data.aws_iam_policy_document.tf_plan.json
}

# Terraform apply: only from the GitHub environment that requires a reviewer's approval.
# It creates IAM roles, so it needs full access; the trust policy is what limits it.

resource "aws_iam_role" "tf_apply" {
  name               = "${var.name}-github-tf-apply"
  description        = "GitHub Actions: terraform apply (approved runs only)"
  assume_role_policy = data.aws_iam_policy_document.trust["tf_apply"].json
}

resource "aws_iam_role_policy_attachment" "tf_apply_admin" {
  role       = aws_iam_role.tf_apply.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AdministratorAccess"
}

# Image builds on main: push to the project's ECR repositories only.

resource "aws_iam_role" "ecr_push" {
  name               = "${var.name}-github-ecr-push"
  description        = "GitHub Actions: push images to the MediBook ECR repositories"
  assume_role_policy = data.aws_iam_policy_document.trust["ecr_push"].json
}

data "aws_iam_policy_document" "ecr_push" {
  statement {
    sid       = "Login"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "PushAndPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = var.ecr_repository_arns
  }
}

resource "aws_iam_role_policy" "ecr_push" {
  name   = "${var.name}-github-ecr-push"
  role   = aws_iam_role.ecr_push.id
  policy = data.aws_iam_policy_document.ecr_push.json
}
