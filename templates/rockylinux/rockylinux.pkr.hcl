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
  default = "https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9-latest-x86_64-minimal.iso"
}

variable "iso_checksum" {
  type    = string
  default = "aed9449cf79eb2d1c365f4f2561f923a80451b3e8fdbf595889b4cf0ac6c58b8"
}

variable "output_directory" {
  type    = string
  default = "templates/rockylinux/output"
}

variable "vm_name" {
  type    = string
  default = "rockylinux-9-cloudstack"
}

source "qemu" "rockylinux" {
  iso_url           = var.iso_url
  iso_checksum      = "sha256:${var.iso_checksum}"
  output_directory  = var.output_directory
  shutdown_command  = "echo 'packer' | sudo -S shutdown -P now"
  disk_size         = "20G"
  format            = "qcow2"
  accelerator       = "kvm"
  http_directory    = "templates/rockylinux/http"
  ssh_username      = "packer"
  ssh_password      = "packer"
  ssh_timeout       = "20m"
  vm_name           = var.vm_name
  net_device        = "virtio-net"
  disk_interface    = "virtio"
  boot_wait         = "10s"
  boot_command = [
    "<tab><wait>",
    " text ks=http://{{.HTTPIP}}:{{.HTTPPort}}/ks.cfg<enter><wait>"
  ]
  memory = 2048
  cpus   = 2
}

build {
  name = "rockylinux"
  sources = ["source.qemu.rockylinux"]

  provisioner "shell" {
    environment_vars = [
      "HOME_DIR=/home/packer"
    ]
    execute_command = "echo 'packer' | sudo -S sh -c '{{ .Vars }} {{ .Path }}'"
    scripts = [
      "scripts/preparation/rockylinux-prepare.sh"
    ]
  }

  provisioner "shell" {
    inline = [
      "sudo yum clean all",
      "sudo rm -rf /tmp/*",
      "sudo rm -rf /var/tmp/*",
      "sudo rm -f /var/log/wtmp /var/log/btmp",
      "sudo rm -rf /var/lib/cloud/instances/*",
      "sudo rm -rf /home/packer/.ssh/authorized_keys",
      "sudo rm -rf /root/.ssh/authorized_keys",
      "history -c"
    ]
  }

  post-processor "shell-local" {
    inline = [
      "echo 'RockyLinux template build completed'",
      "qemu-img info ${var.output_directory}/${var.vm_name}"
    ]
  }
}