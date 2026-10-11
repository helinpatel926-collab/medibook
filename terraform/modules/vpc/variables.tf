variable "name" {
  description = "Name prefix for every resource in the network."
  type        = string
}

variable "cidr" {
  description = "CIDR block of the VPC."
  type        = string
}

variable "azs" {
  description = "Availability zones to spread the subnets across."
  type        = list(string)

  validation {
    condition     = length(var.azs) >= 2
    error_message = "Use at least two availability zones."
  }
}

variable "public_subnets" {
  description = "CIDR blocks of the public subnets, one per availability zone."
  type        = list(string)
}

variable "private_subnets" {
  description = "CIDR blocks of the private subnets, one per availability zone."
  type        = list(string)
}

variable "database_subnets" {
  description = "CIDR blocks of the database subnets, one per availability zone."
  type        = list(string)
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for all private subnets instead of one per availability zone."
  type        = bool
  default     = true
}
