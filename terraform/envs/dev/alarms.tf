resource "aws_sns_topic" "alarms" {
  # checkov:skip=CKV_AWS_26:CloudWatch cannot publish to a topic encrypted with the AWS managed SNS key; the messages hold alarm names only
  name = "${local.name}-alarms"
}

resource "aws_sns_topic_subscription" "alarm_email" {
  count = var.alarm_email == null ? 0 : 1

  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

locals {
  alarm_actions = [aws_sns_topic.alarms.arn]

  rds_alarms = {
    cpu = {
      description = "Database CPU above 80% for 15 minutes"
      metric      = "CPUUtilization"
      statistic   = "Average"
      operator    = "GreaterThanThreshold"
      threshold   = 80
    }
    storage = {
      description = "Less than 2 GiB of database storage left"
      metric      = "FreeStorageSpace"
      statistic   = "Minimum"
      operator    = "LessThanThreshold"
      threshold   = 2 * 1024 * 1024 * 1024
    }
    memory = {
      description = "Less than 100 MiB of free database memory for 15 minutes"
      metric      = "FreeableMemory"
      statistic   = "Minimum"
      operator    = "LessThanThreshold"
      threshold   = 100 * 1024 * 1024
    }
  }

  # The ALB is created by the AWS Load Balancer Controller, not by Terraform. Metrics Insights
  # queries across the region's load balancers avoid a dependency on its ARN; this account
  # has one ALB in the region.
  alb_alarms = {
    elb-5xx = {
      description = "The ALB itself returned more than 5 server errors in 5 minutes (for example, no healthy targets)"
      query       = "SELECT SUM(HTTPCode_ELB_5XX_Count) FROM SCHEMA(\"AWS/ApplicationELB\", LoadBalancer)"
      period      = 300
      periods     = 1
      threshold   = 5
    }
    target-5xx = {
      description = "The services returned more than 5 server errors through the ALB in 5 minutes"
      query       = "SELECT SUM(HTTPCode_Target_5XX_Count) FROM SCHEMA(\"AWS/ApplicationELB\", LoadBalancer)"
      period      = 300
      periods     = 1
      threshold   = 5
    }
    unhealthy-targets = {
      description = "At least one ALB target has been unhealthy for 3 minutes"
      query       = "SELECT MAX(UnHealthyHostCount) FROM SCHEMA(\"AWS/ApplicationELB\", LoadBalancer, TargetGroup)"
      period      = 60
      periods     = 3
      threshold   = 0
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "rds" {
  for_each = local.rds_alarms

  alarm_name          = "${local.name}-rds-${each.key}"
  alarm_description   = each.value.description
  namespace           = "AWS/RDS"
  metric_name         = each.value.metric
  dimensions          = { DBInstanceIdentifier = local.name }
  statistic           = each.value.statistic
  period              = 300
  evaluation_periods  = 3
  comparison_operator = each.value.operator
  threshold           = each.value.threshold
  treat_missing_data  = "missing"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "alb" {
  for_each = local.alb_alarms

  alarm_name          = "${local.name}-alb-${each.key}"
  alarm_description   = each.value.description
  evaluation_periods  = each.value.periods
  comparison_operator = "GreaterThanThreshold"
  threshold           = each.value.threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  metric_query {
    id          = "q1"
    expression  = each.value.query
    period      = each.value.period
    return_data = true
  }
}
