packer {
  required_plugins {
    qemu = {
      source  = "github.com/hashicorp/qemu"
      version = "~> 1"
    }
  }
}

variable "name" {
  type    = string
  default = "ubuntu-18.04"
}

variable "url" {
  type    = string
  default = "https://releases.ubuntu.com/18.04/ubuntu-18.04.6-server-amd64.iso"
}

variable "iso_checksum" {
  type    = string
  default = "sha256:8c5fc24894394035402f66f3824beb7234b757dd2b5531379cb310cedfdf0996"
}

variable "boot_command" {
  type    = list(string)
  default = ["<esc><wait><esc><wait><enter><wait>/install/vmlinuz initrd=/install/initrd.gz preseed/url=http://{{ .HTTPIP }}:{{ .HTTPPort }}/preseed/ubuntu-18.04.preseed auto debian-installer=en_US locale=en_US kbd-chooser/method=us fb=false debconf/frontend=noninteractive keyboard-configuration/modelcode=SKIP keyboard-configuration/layout=USA keyboard-configuration/variant=USA console-setup/ask_detect=false hostname=ubuntu1804 -- <enter>"]
}

source "qemu" "ubuntu-18-04" {
  iso_url              = var.url
  iso_checksum         = var.iso_checksum
  vm_name              = var.name
  format               = "qcow2"
  accelerator          = "kvm"
  headless             = true
  cpus                 = 2
  memory               = 2048
  disk_size            = "8G"
  disk_interface       = "virtio-scsi"
  disk_discard         = "unmap"
  disk_compression     = true
  boot_command         = var.boot_command
  communicator         = "ssh"
  vnc_bind_address     = "[::]"
  ssh_wait_timeout     = "30m"
  ssh_username         = "root"
  ssh_password         = "zCgwHD5hvtnWRaJX"
  http_directory       = "files"
  http_port_min        = 8000
  http_port_max        = 8100
  output_directory     = "build_${var.name}"
}

build {
  sources = ["source.qemu.ubuntu-18-04"]

  provisioner "file" {
    source          = "config/files/apt/ubuntu-18.04.sources"
    destination     = "/etc/apt/sources.list"
  }

  provisioner "file" {
    source          = "config/files/generic/cloud-init.cfg"
    destination     = "/etc/cloud/cloud.cfg"
  }

  provisioner "file" {
    source          = "config/files/generic/watchdog.conf"
    destination     = "/etc/watchdog.conf"
  }

  provisioner "file" {
    source          = "config/files/generic/99-disable-ipv6-tempaddr.conf"
    destination     = "/etc/sysctl.d/99-disable-ipv6-tempaddr.conf"
  }

  provisioner "file" {
    source          = "config/files/generic/99-hotPlugCPU.rules"
    destination     = "/etc/udev/rules.d/99-hotPlugCPU.rules"
  }

  provisioner "shell" {
    scripts = [
      "scripts/ubuntu-18.04/remove-swap.sh",
    ]
    execute_command = "sh '{{ .Path }}'"
  }

  provisioner "shell" {
    scripts = [
      "scripts/ubuntu-18.04/post.sh",
    ]
    execute_command = "sh '{{ .Path }}'"
  }

  provisioner "shell" {
    inline = [
      "fstrim -v /",
    ]
  }

  post-processor "shell-local" {
    command         = "mv build_${var.name}/${var.name} build_${var.name}/${var.name}.qcow2"
  }

  post-processor "artifice" {
    files = [
      "build_${var.name}/${var.name}.qcow2",
    ]
  }

  post-processor "checksum" {
    checksum_types = [
      "sha256",
    ]
    output          = "build_${var.name}/${var.name}.checksum"
  }

  post-processor "manifest" {
    output          = "build_${var.name}/${var.name}.json"
    strip_path      = true
    custom_data = {
      oscategory    = split("-", var.name)[0]
      osversion     = split("-", var.name)[1]
      template_slug = var.name
    }
  }

}
