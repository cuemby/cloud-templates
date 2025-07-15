terraform {
  required_providers {
    cloudstack = {
      source  = "cloudstack/cloudstack"
      version = "0.5.0"
    }
  }
}

resource "cloudstack_vpc" "packer_vpc" {
  name         = local.vpc.name
  cidr         = local.vpc.cidr
  display_text = local.vpc.packer_vpc_display_text
  vpc_offering = var.cloudstack_vpc_offering
  zone         = var.cloudstack_zone
}

resource "cloudstack_network_acl" "packer_network_acl" {
  name   = local.vpc.packer_network_acl_name
  vpc_id = cloudstack_vpc.packer_vpc.id
}

resource "cloudstack_network_acl_rule" "packer_network_acl_rule" {
  acl_id = cloudstack_network_acl.packer_network_acl.id

  dynamic "rule" {
    for_each = local.acl_rules

    content {
      action       = rule.value.action
      protocol     = rule.value.protocol
      cidr_list    = rule.value.cidr_list
      ports        = rule.value.ports
      traffic_type = rule.value.traffic_type
    }
  }
}

resource "cloudstack_network" "packer_network" {
  name             = local.vpc.packer_network_name
  display_text     = local.vpc.packer_network_display_text
  cidr             = local.vpc.cidr
  vpc_id           = cloudstack_vpc.packer_vpc.id
  network_offering = var.cloudstack_network_offering
  zone             = var.cloudstack_zone
  acl_id           = cloudstack_network_acl.packer_network_acl.id
}

resource "cloudstack_ssh_keypair" "packer_ssh_key" {
  name = local.vpc.packer_ssh_key_name
}

resource "cloudstack_disk_offering" "ssd_disk_offerings" {
  for_each = local.ssd_disk_offerings

  name         = each.value.name
  display_text = each.value.display_text
  disk_size    = each.value.disk_size
}

resource "cloudstack_service_offering" "burstable_service_offerings" {
  for_each = local.burstable_service_offerings

  name         = each.value.name
  display_text = each.value.display_text
  cpu_number   = each.value.cpu_number
  cpu_speed    = local.offering_defaults.burstable.speed
  memory       = each.value.memory
  offer_ha     = local.offering_defaults.burstable.offer_ha
  storage_type = local.offering_defaults.burstable.storage_type
}

resource "cloudstack_service_offering" "standard_service_offerings" {
  for_each = local.standard_service_offerings

  name         = each.value.name
  display_text = each.value.display_text
  cpu_number   = each.value.cpu_number
  cpu_speed    = local.offering_defaults.standard.speed
  memory       = each.value.memory
  offer_ha     = local.offering_defaults.standard.offer_ha
  storage_type = local.offering_defaults.standard.storage_type
}

resource "cloudstack_service_offering" "memory_service_offerings" {
  for_each = local.memory_service_offerings

  name         = each.value.name
  display_text = each.value.display_text
  cpu_number   = each.value.cpu_number
  cpu_speed    = local.offering_defaults.memory.speed
  memory       = each.value.memory
  offer_ha     = local.offering_defaults.memory.offer_ha
  storage_type = local.offering_defaults.memory.storage_type
}

resource "cloudstack_service_offering" "compute_service_offerings" {
  for_each = local.compute_service_offerings

  name         = each.value.name
  display_text = each.value.display_text
  cpu_number   = each.value.cpu_number
  cpu_speed    = local.offering_defaults.compute.speed
  memory       = each.value.memory
  offer_ha     = local.offering_defaults.compute.offer_ha
  storage_type = local.offering_defaults.compute.storage_type
}

resource "cloudstack_template" "base_templates" {
  for_each = local.base_templates

  name         = each.value.name
  display_text = each.value.display_text
  url          = each.value.url
  zone         = var.cloudstack_zone
  os_type      = each.value.os_type

  format           = local.template_defaults.format
  hypervisor       = local.template_defaults.hypervisor
  is_featured      = local.template_defaults.is_featured
  is_public        = local.template_defaults.is_public
  password_enabled = local.template_defaults.password_enabled
}
