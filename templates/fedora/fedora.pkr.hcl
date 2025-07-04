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
  default = "https://download.fedoraproject.org/pub/fedora/linux/releases/41/Server/x86_64/iso/Fedora-Server-netinst-x86_64-41-1.4.iso"
}

variable "iso_checksum" {
  type    = string
  default = "630c52ba9e7a7f229b026e241ba74b9bc105e60ba5bf7b222693ae0e25f05c97"
}

variable "output_directory" {
  type    = string
  default = "templates/fedora/output"
}

variable "vm_name" {
  type    = string
  default = "fedora-41-cloudstack"
}

source "qemu" "fedora" {
  iso_url           = var.iso_url
  iso_checksum      = "sha256:${var.iso_checksum}"
  output_directory  = var.output_directory
  shutdown_command  = "echo 'packer' | sudo -S shutdown -P now"
  disk_size         = "20G"
  format            = "qcow2"
  accelerator       = "kvm"
  http_directory    = "templates/fedora/http"
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
  name = "fedora"
  sources = ["source.qemu.fedora"]

  provisioner "shell" {
    environment_vars = [
      "HOME_DIR=/home/packer"
    ]
    execute_command = "echo 'packer' | sudo -S sh -c '{{ .Vars }} {{ .Path }}'"
    scripts = [
      "scripts/preparation/fedora-prepare.sh"
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
      "echo 'Fedora template build completed'",
      "qemu-img info ${var.output_directory}/${var.vm_name}"
    ]
  }
}