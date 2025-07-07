packer {
  required_plugins {
    qemu = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

variable "iso_url" {
  type    = string
  default = "https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso"
}

variable "iso_checksum" {
  type    = string
  default = "e240e4b801f7bb68c20d1356b60968ad0c33b41d00d828e74ceb3364a0317be9"
}

variable "output_directory" {
  type    = string
  default = "templates/ubuntu/output"
}

variable "vm_name" {
  type    = string
  default = "ubuntu-24.04.1-cloudstack"
}

source "qemu" "ubuntu" {
  iso_url           = var.iso_url
  iso_checksum      = "sha256:${var.iso_checksum}"
  output_directory  = var.output_directory
  shutdown_command  = "echo 'packer' | sudo -S shutdown -P now"
  disk_size         = "20G"
  format            = "qcow2"
  accelerator       = "kvm"
  http_directory    = "templates/ubuntu/http"
  ssh_username      = "packer"
  ssh_password      = "packer"
  ssh_timeout       = "20m"
  vm_name           = var.vm_name
  net_device        = "virtio-net"
  disk_interface    = "virtio"
  boot_wait         = "5s"
  headless          = true
  use_default_display = false
  display           = "none"
  boot_command = [
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "<spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait><spacebar><wait>",
    "c<wait>",
    "linux /casper/vmlinuz --- autoinstall ds=\"nocloud-net;seedfrom=http://{{.HTTPIP}}:{{.HTTPPort}}/\"<enter><wait>",
    "initrd /casper/initrd<enter><wait>",
    "boot<enter><wait>"
  ]
  memory = 2048
  cpus   = 2
}

build {
  name = "ubuntu"
  sources = ["source.qemu.ubuntu"]

  provisioner "shell" {
    environment_vars = [
      "HOME_DIR=/home/packer",
      "DEBIAN_FRONTEND=noninteractive"
    ]
    execute_command = "echo 'packer' | sudo -S sh -c '{{ .Vars }} {{ .Path }}'"
    scripts = [
      "scripts/preparation/ubuntu-prepare.sh"
    ]
  }

  provisioner "shell" {
    inline = [
      "sudo apt-get clean",
      "sudo rm -rf /var/lib/apt/lists/*",
      "sudo rm -rf /tmp/*",
      "sudo rm -rf /var/tmp/*",
      "sudo rm -f /var/log/wtmp /var/log/btmp",
      "sudo rm -rf /var/log/installer",
      "sudo rm -rf /var/lib/cloud/instances/*",
      "sudo rm -rf /home/packer/.ssh/authorized_keys",
      "sudo rm -rf /root/.ssh/authorized_keys",
      "history -c"
    ]
  }

  post-processor "shell-local" {
    inline = [
      "echo 'Ubuntu template build completed'",
      "qemu-img info ${var.output_directory}/${var.vm_name}"
    ]
  }
}