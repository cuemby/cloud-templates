packer {
  required_plugins {
    qemu = {
      version = "~> 1"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

variable "cpus" {
  type        = number
  default     = 1
  description = "The number of virtual cpus to use when building the VM."
}

variable "memory" {
  type        = number
  default     = 2048
  description = "The amount of memory to use when building the VM in megabytes. This defaults to 512 megabytes."
}

variable "efi_boot" {
  type    = bool
  default = false
}

variable "efi_firmware_code" {
  type    = string
  default = null
}

variable "efi_firmware_vars" {
  type    = string
  default = null
}

variable "headless" {
  type    = bool
  default = true
}

variable "ssh_username" {
  type    = string
  default = "packer"
}

variable "ssh_password" {
  type    = string
  default = ""
  description = "SSH password for the build user. If empty, a random password will be generated."
}

variable "ssh_timeout" {
  type    = string
  default = "120s"
}

variable "vm_name" {
  type    = string
  default = "almalinux-9-x86_64"
}

locals {
  # Generate a random password if not provided - using UUID without hyphens
  build_password = var.ssh_password != "" ? var.ssh_password : replace(uuidv4(), "-", "")
}

source "file" "user_data" {
  content = <<EOF
#cloud-config
user: ${var.ssh_username}
password: ${local.build_password}
chpasswd: { expire: False }
ssh_pwauth: True
EOF
  target  = "boot-${var.vm_name}/user-data"
}

source "file" "meta_data" {
  content = <<EOF
instance-id: almalinux-cloud
local-hostname: almalinux-cloud
EOF
  target  = "boot-${var.vm_name}/meta-data"
}

build {
  sources = ["sources.file.user_data", "sources.file.meta_data"]

  provisioner "shell-local" {
    inline = ["genisoimage -output boot-${var.vm_name}/cidata.iso -input-charset utf-8 -volid cidata -joliet -r boot-${var.vm_name}/user-data boot-${var.vm_name}/meta-data"]
  }
}

variable "iso_checksum" {
  type    = string
  default = "file:https://repo.almalinux.org/almalinux/9/cloud/x86_64/images/CHECKSUM"
}

variable "iso_url" {
  type    = string
  default = "https://repo.almalinux.org/almalinux/9/cloud/x86_64/images/AlmaLinux-9-GenericCloud-latest.x86_64.qcow2"
}

source "qemu" "almalinux" {
  cpu_model        = "host"
  cpus             = var.cpus
  memory           = var.memory
  disk_compression = true
  disk_image       = true
  disk_size        = "32G"
  headless         = var.headless
  iso_checksum     = var.iso_checksum
  iso_url          = var.iso_url
  machine_type     = "q35"
  vnc_bind_address = "127.0.0.1"
  qemuargs = [
    ["-cdrom", "boot-${var.vm_name}/cidata.iso"],
    ["-display", "none"],
    ["-vga", "none"],
    ["-nographic"]
  ]
  output_directory  = "output-${var.vm_name}"
  shutdown_command  = "echo '${local.build_password}' | sudo -S shutdown -P now"
  ssh_password      = local.build_password
  ssh_timeout       = var.ssh_timeout
  ssh_username      = var.ssh_username
  vm_name           = "${var.vm_name}.qcow2"
  efi_boot          = var.efi_boot
  efi_firmware_code = var.efi_firmware_code
  efi_firmware_vars = var.efi_firmware_vars
}

build {
  sources = ["source.qemu.almalinux"]

  # Show the generated build password for debugging
  provisioner "shell-local" {
    inline = ["echo '=== Generated build password: ${local.build_password} ==='"]
  }

  # cloud-init may still be running when we start executing scripts
  # To avoid race conditions, make sure cloud-init is done first
  provisioner "shell" {
    execute_command = "echo '${local.build_password}' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
    scripts = [
      "../../../scripts/cloud-init-wait.sh",
    ]
  }

  # Copy CloudStack-specific cloud-init configuration
  provisioner "file" {
    source      = "../../../files/generic/cloud-init.cfg"
    destination = "/tmp/cloud-init.cfg"
  }

  # Install the cloud-init configuration
  provisioner "shell" {
    execute_command = "echo '${local.build_password}' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
    inline = [
      "sudo cp /tmp/cloud-init.cfg /etc/cloud/cloud.cfg",
      "sudo chown root:root /etc/cloud/cloud.cfg",
      "sudo chmod 644 /etc/cloud/cloud.cfg"
    ]
  }

  # Copy CloudStack user configuration  
  provisioner "file" {
    source      = "../../../files/generic/80_cloudstack_user.cfg"
    destination = "/tmp/80_cloudstack_user.cfg"
  }

  # Install CloudStack user configuration
  provisioner "shell" {
    execute_command = "echo '${local.build_password}' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
    inline = [
      "sudo mkdir -p /etc/cloud/cloud.cfg.d",
      "sudo cp /tmp/80_cloudstack_user.cfg /etc/cloud/cloud.cfg.d/80_cloudstack_user.cfg",
      "sudo chown root:root /etc/cloud/cloud.cfg.d/80_cloudstack_user.cfg",
      "sudo chmod 644 /etc/cloud/cloud.cfg.d/80_cloudstack_user.cfg"
    ]
  }

  # Copy generic configuration files
  provisioner "file" {
    source      = "../../../files/generic/99-disable-ipv6-tempadrr.conf"
    destination = "/tmp/99-disable-ipv6-tempadrr.conf"
  }

  provisioner "file" {
    source      = "../../../files/generic/99-hostPlugCPU.rules"
    destination = "/tmp/99-hostPlugCPU.rules"
  }

  provisioner "file" {
    source      = "../../../files/generic/watchdog.conf"
    destination = "/tmp/watchdog.conf"
  }

  # Copy CentOS-specific configuration files
  provisioner "file" {
    source      = "../../../files/centos/90-dhcp-client.conf"
    destination = "/tmp/90-dhcp-client.conf"
  }

  provisioner "file" {
    source      = "../../../files/centos/90-dns-none.conf"
    destination = "/tmp/90-dns-none.conf"
  }

  provisioner "file" {
    source      = "../../../files/centos/grub"
    destination = "/tmp/grub"
  }

  # Install configuration files to their correct locations
  provisioner "shell" {
    execute_command = "echo '${local.build_password}' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
    inline = [
      "sudo cp /tmp/99-disable-ipv6-tempadrr.conf /etc/sysctl.d/99-disable-ipv6-tempadrr.conf",
      "sudo cp /tmp/99-hostPlugCPU.rules /etc/udev/rules.d/99-hostPlugCPU.rules",
      "sudo cp /tmp/watchdog.conf /etc/watchdog.conf",
      "sudo cp /tmp/90-dhcp-client.conf /etc/NetworkManager/conf.d/90-dhcp-client.conf",
      "sudo cp /tmp/90-dns-none.conf /etc/NetworkManager/conf.d/90-dns-none.conf",
      "sudo cp /tmp/grub /etc/default/grub",
      "sudo chown root:root /etc/sysctl.d/99-disable-ipv6-tempadrr.conf /etc/udev/rules.d/99-hostPlugCPU.rules /etc/watchdog.conf /etc/NetworkManager/conf.d/90-dhcp-client.conf /etc/NetworkManager/conf.d/90-dns-none.conf /etc/default/grub",
      "sudo chmod 644 /etc/sysctl.d/99-disable-ipv6-tempadrr.conf /etc/udev/rules.d/99-hostPlugCPU.rules /etc/watchdog.conf /etc/NetworkManager/conf.d/90-dhcp-client.conf /etc/NetworkManager/conf.d/90-dns-none.conf /etc/default/grub"
    ]
  }

  # Execute AlmaLinux post-installation script
  provisioner "shell" {
    execute_command = "echo '${local.build_password}' | {{ .Vars }} sudo -S -E sh -eux '{{ .Path }}'"
    scripts = [
      "../../../scripts/almalinux/almalinux-9-post.sh"
    ]
  }
}