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
  default = "https://mirrors.centos.org/mirrorlist?path=/9-stream/BaseOS/x86_64/iso/CentOS-Stream-9-latest-x86_64-boot.iso&redirect=1&protocol=https"
}

variable "iso_checksum" {
  type    = string
  default = "c87a2d81d67bbaeaf646aea5bedd70990078ec252f634796b5b87b721ccd9bdf"
}

variable "output_directory" {
  type    = string
  default = "templates/centos/output"
}

variable "vm_name" {
  type    = string
  default = "centos-stream-9-cloudstack"
}

source "qemu" "centos" {
  iso_url           = var.iso_url
  iso_checksum      = "sha256:${var.iso_checksum}"
  output_directory  = var.output_directory
  shutdown_command  = "echo 'packer' | sudo -S shutdown -P now"
  disk_size         = "20G"
  format            = "qcow2"
  accelerator       = "kvm"
  http_directory    = "templates/centos/http"
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
  name = "centos"
  sources = ["source.qemu.centos"]

  provisioner "shell" {
    environment_vars = [
      "HOME_DIR=/home/packer"
    ]
    execute_command = "echo 'packer' | sudo -S sh -c '{{ .Vars }} {{ .Path }}'"
    scripts = [
      "scripts/preparation/centos-prepare.sh"
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
      "echo 'CentOS template build completed'",
      "qemu-img info ${var.output_directory}/${var.vm_name}"
    ]
  }
}