terraform {
  backend "s3" {
    bucket       = "medibook-tfstate-710590320983"
    key          = "dev/terraform.tfstate"
    region       = "ca-central-1"
    encrypt      = true
    use_lockfile = true
  }
}
