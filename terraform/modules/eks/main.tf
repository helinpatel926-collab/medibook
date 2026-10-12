data "aws_partition" "current" {}

locals {
  partition = data.aws_partition.current.partition
}

# Created before the cluster so the retention period applies from the first log line.
resource "aws_cloudwatch_log_group" "cluster" {
  # checkov:skip=CKV_AWS_338:Dev logs are kept for 3 days
  # checkov:skip=CKV_AWS_158:Encrypted with the CloudWatch Logs service key; a customer managed KMS key costs extra
  name              = "/aws/eks/${var.name}/cluster"
  retention_in_days = var.log_retention_days
}

data "aws_iam_policy_document" "cluster_assume" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]

    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "cluster" {
  name               = "${var.name}-cluster"
  assume_role_policy = data.aws_iam_policy_document.cluster_assume.json
}

resource "aws_iam_role_policy_attachment" "cluster" {
  role       = aws_iam_role.cluster.name
  policy_arn = "arn:${local.partition}:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_eks_cluster" "this" {
  # checkov:skip=CKV_AWS_58:EKS encrypts all Kubernetes API data, Secrets included, with KMS by default
  # checkov:skip=CKV_AWS_38:Access is controlled by IAM: only principals with an access entry can use the API
  # checkov:skip=CKV_AWS_39:Admins and CI reach the API from changing addresses; IAM and MFA protect it
  # checkov:skip=CKV_AWS_37:api, audit and authenticator logs are enough for dev
  name     = var.name
  version  = var.kubernetes_version
  role_arn = aws_iam_role.cluster.arn

  # Add-ons are installed as EKS managed add-ons (addons.tf) instead of the default self-managed copies.
  bootstrap_self_managed_addons = false
  enabled_cluster_log_types     = ["api", "audit", "authenticator"]

  access_config {
    authentication_mode                         = "API"
    bootstrap_cluster_creator_admin_permissions = false
  }

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  # Upgrade automatically at the end of standard support instead of paying for extended support.
  upgrade_policy {
    support_type = "STANDARD"
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster,
    aws_cloudwatch_log_group.cluster,
  ]
}

resource "aws_eks_access_entry" "admin" {
  for_each = toset(var.cluster_admin_arns)

  cluster_name  = aws_eks_cluster.this.name
  principal_arn = each.value
}

resource "aws_eks_access_policy_association" "admin" {
  for_each = toset(var.cluster_admin_arns)

  cluster_name  = aws_eks_cluster.this.name
  principal_arn = each.value
  policy_arn    = "arn:${local.partition}:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.admin]
}
