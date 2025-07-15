locals {
  # VPC
  vpc = {
    name                        = "packer_vpc"
    cidr                        = "192.168.1.0/24"
    packer_vpc_display_text     = "Packer VPC"
    packer_network_display_text = "Packer Network"
    packer_network_acl_name     = "packer_network_acl"
    packer_network_name         = "packer_network"
    packer_ssh_key_name         = "packer_ssh_key"
  }

  # ACL Rules
  acl_rules = {
    "allow-ingress-ssh" = {
      action       = "allow"
      protocol     = "tcp"
      cidr_list    = ["0.0.0.0/0"]
      ports        = ["22"]
      traffic_type = "ingress"
    }

    "allow-egress-all" = {
      action       = "allow"
      protocol     = "all"
      cidr_list    = ["0.0.0.0/0"]
      ports        = []
      traffic_type = "egress"
    }
  }

  # Offerings defaults
  offering_defaults = {
    burstable = {
      speed        = 500
      storage_type = "shared"
      offer_ha     = false
    }
    standard = {
      speed        = 1000
      storage_type = "shared"
      offer_ha     = false
    }
    compute = {
      speed        = 2000
      storage_type = "shared"
      offer_ha     = false
    }
    memory = {
      speed        = 1000
      storage_type = "shared"
      offer_ha     = false
    }
  }

  # Service Offerings
  burstable_service_offerings = {
    "burstable-1-512" = {
      name         = "burstable-1-512"
      display_text = "Burstable 1 vCPU 512MB"
      cpu_number   = 1
      memory       = 512
    }
    "burstable-1-2048" = {
      name         = "burstable-1-2048"
      display_text = "Burstable 1 vCPU 2048MB"
      cpu_number   = 1
      memory       = 2048
    }
    "burstable-2-4096" = {
      name         = "burstable-2-4096"
      display_text = "Burstable 2 vCPU 4096MB"
      cpu_number   = 2
      memory       = 4096
    }
  }

  standard_service_offerings = {
    "standard-2-8192" = {
      name         = "standard-2-8192"
      display_text = "Standard 2 vCPU 8192MB"
      cpu_number   = 2
      memory       = 8192
    }
    "standard-4-16384" = {
      name         = "standard-4-16384"
      display_text = "Standard 4 vCPU 16384MB"
      cpu_number   = 4
      memory       = 16384
    }
    "standard-8-32768" = {
      name         = "standard-8-32768"
      display_text = "Standard 8 vCPU 32768MB"
      cpu_number   = 8
      memory       = 32768
    }
  }

  compute_service_offerings = {
    "compute-16-32768" = {
      name         = "compute-16-32768"
      display_text = "Compute 16 vCPU 32768MB"
      cpu_number   = 16
      memory       = 32768
    }
    "compute-30-65536" = {
      name         = "compute-30-65536"
      display_text = "Compute 30 vCPU 65536MB"
      cpu_number   = 30
      memory       = 65536
    }
    "compute-60-131072" = {
      name         = "compute-60-131072"
      display_text = "Compute 60 vCPU 131072MB"
      cpu_number   = 60
      memory       = 131072
    }
  }

  memory_service_offerings = {
    "memory-4-32768" = {
      name         = "memory-4-32768"
      display_text = "Memory 4 vCPU 32768MB"
      cpu_number   = 4
      memory       = 32768
    }
    "memory-8-65536" = {
      name         = "memory-8-65536"
      display_text = "Memory 8 vCPU 65536MB"
      cpu_number   = 8
      memory       = 65536
    }
    "memory-16-122880" = {
      name         = "memory-16-122880"
      display_text = "Memory 16 vCPU 122880MB"
      cpu_number   = 16
      memory       = 122880
    }
  }

  # Disk Offerings
  ssd_disk_offerings = {
    "ssd-40" = {
      name         = "ssd-40"
      display_text = "Disk SSD 40GB"
      disk_size    = 40
    }
    "ssd-80" = {
      name         = "ssd-80"
      display_text = "Disk SSD 80GB"
      disk_size    = 80
    }
    "ssd-160" = {
      name         = "ssd-160"
      display_text = "Disk SSD 160GB"
      disk_size    = 160
    }
    "ssd-320" = {
      name         = "ssd-320"
      display_text = "Disk SSD 320GB"
      disk_size    = 320
    }
    "ssd-640" = {
      name         = "ssd-640"
      display_text = "Disk SSD 640GB"
      disk_size    = 640
    }
    "ssd-1280" = {
      name         = "ssd-1280"
      display_text = "Disk SSD 1280GB"
      disk_size    = 1280
    }
    "ssd-2000" = {
      name         = "ssd-2000"
      display_text = "Disk SSD 2000GB"
      disk_size    = 2000
    }
  }

  template_defaults = {
    format           = "QCOW2"
    hypervisor       = "KVM"
    is_featured      = false
    is_public        = true
    password_enabled = true
  }

  # Templates
  base_templates = {
    almalinux_8_x86_64 = {
      name         = "almalinux-8-x86_64"
      display_text = "AlmaLinux 8 x86_64"
      os_type      = "AlmaLinux 8.10"
      url          = "https://repo.almalinux.org/almalinux/8/cloud/x86_64/images/AlmaLinux-8-GenericCloud-8.10-20240530.x86_64.qcow2"
    }

    almalinux_9_x86_64 = {
      name         = "almalinux-9-x86_64"
      display_text = "AlmaLinux 9 x86_64"
      os_type      = "AlmaLinux 9.6"
      url          = "https://raw.repo.almalinux.org/almalinux/9/cloud/x86_64/images/AlmaLinux-9-GenericCloud-9.6-20250522.x86_64.qcow2"
    }

    ubuntu_22_04_x86_64 = {
      name         = "ubuntu-22-04-x86_64"
      display_text = "Ubuntu 22.04 x86_64"
      os_type      = "Ubuntu 22.04 LTS"
      url          = "https://cloud-images.ubuntu.com/releases/jammy/release-20250619/ubuntu-22.04-server-cloudimg-amd64.img"
    }

    ubuntu_24_04_x86_64 = {
      name         = "ubuntu-24-04-x86_64"
      display_text = "Ubuntu 24.04 x86_64"
      os_type      = "Ubuntu 24.04 LTS"
      url          = "https://cloud-images.ubuntu.com/releases/noble/release-20250610/ubuntu-24.04-server-cloudimg-amd64.img"
    }
  }
}
