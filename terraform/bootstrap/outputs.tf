output "state_bucket" {
  description = "Name of the S3 bucket that stores Terraform state."
  value       = aws_s3_bucket.state.id
}

output "region" {
  description = "Region of the state bucket."
  value       = var.region
}

output "backend_config" {
  description = "Backend block to use in other stacks."
  value       = <<-EOT
    backend "s3" {
      bucket       = "${aws_s3_bucket.state.id}"
      key          = "<stack>/terraform.tfstate"
      region       = "${var.region}"
      encrypt      = true
      use_lockfile = true
    }
  EOT
}
