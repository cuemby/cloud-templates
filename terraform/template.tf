terraform {
  required_providers {
    cloudstack = {
      source  = "cloudstack/cloudstack"
      version = "0.5.0"
    }
  }
}

variable "cloudstack_api_url" {
  type = string
  description = "CloudStack API URL"
}

variable "cloudstack_api_key" {
  type = string
  description = "CloudStack API Key"
}

variable "cloudstack_secret_key" {
  type = string
  description = "CloudStack Secret Key"
}

provider "cloudstack" {
  api_url = var.cloudstack_api_url
  api_key = var.cloudstack_api_key
  secret_key = var.cloudstack_secret_key
}

resource "cloudstack_template" "almalinux-9-efi-x86_64" {
  name = "almalinux-9-efi-x86_64"
  display_text = "AlmaLinux 9 EFI x86_64"
  format = "QCOW2"
  hypervisor = "KVM"
  url = "https://github.com/cuemby/cloud-templates/releases/download/almalinux-9-20250715-896486a/almalinux-9-efi-x86_64.qcow2"
  os_type = "AlmaLinux 9.6"
  zone = "-1"
  password_enabled = true
  is_featured = true
  is_public = true
}