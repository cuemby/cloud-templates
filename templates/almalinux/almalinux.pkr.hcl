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
  default = "https://repo.almalinux.org/almalinux/9/isos/x86_64/AlmaLinux-9-latest-x86_64-minimal.iso"
}

variable "iso_checksum" {
  type    = string
  default = "27a346c74d8755516a4ad2057ea29c2450454f1a928628734f26e12b0b8120d7"
}

variable "output_directory" {
  type    = string
  default = "templates/almalinux/output"
}

variable "vm_name" {
  type    = string
  default = "almalinux-9-cloudstack"
}

source "qemu" "almalinux" {
  iso_url           = var.iso_url
  iso_checksum      = "sha256:${var.iso_checksum}"
  output_directory  = var.output_directory
  shutdown_command  = "echo 'packer' | sudo -S /sbin/halt -h -p"
  disk_size         = "20G"
  format            = "qcow2"
  accelerator       = "kvm"
  http_directory    = "templates/almalinux/http"
  ssh_username      = "packer"
  ssh_password      = "packer"
  ssh_timeout       = "20m"
  vm_name           = var.vm_name
  net_device        = "virtio-net"
  disk_interface    = "virtio"
  boot_wait         = "10s"
  boot_command = [
    "<tab> text ks=http://{{.HTTPIP}}:{{.HTTPPort}}/ks.cfg<enter><wait>"
  ]
  memory = 2048
  cpus   = 2
}

build {
  name = "almalinux"
  sources = ["source.qemu.almalinux"]

  provisioner "shell" {
    environment_vars = [
      "HOME_DIR=/home/packer"
    ]
    execute_command = "echo 'packer' | sudo -S sh -c '{{ .Vars }} {{ .Path }}'"
    scripts = [
      "scripts/preparation/almalinux-prepare.sh"
    ]
  }

  provisioner "shell" {
    inline = [
      "sudo dnf clean all",
      "sudo rm -rf /var/cache/dnf/*",
      "sudo rm -rf /tmp/*",
      "sudo rm -rf /var/tmp/*",
      "sudo rm -f /var/log/wtmp /var/log/btmp",
      "sudo rm -rf /var/log/anaconda",
      "sudo rm -rf /home/packer/.ssh/authorized_keys",
      "sudo rm -rf /root/.ssh/authorized_keys",
      "history -c"
    ]
  }

  post-processor "shell-local" {
    inline = [
      "echo 'AlmaLinux template build completed'",
      "qemu-img info ${var.output_directory}/${var.vm_name}"
    ]
  }
}