variable "repositories" {
  description = "Names of the image repositories to create."
  type        = list(string)
}

variable "keep_images" {
  description = "Number of most recent images to keep in each repository."
  type        = number
  default     = 10
}
