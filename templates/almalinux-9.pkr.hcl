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
  default = "almalinux-9"
}

variable "url" {
  type    = string
  default = "http://compute.o.auroraobjects.eu/iso/AlmaLinux-9.4-x86_64-boot.iso"
}

variable "iso_checksum" {
  type    = string
  default = "sha256:1e5d7da3d84d5d9a5a1177858a5df21b868390bfccf7f0f419b1e59acc293160"
}

variable "boot_command" {
  type    = list(string)
  default = ["<tab> inst.text inst.ks=http://{{ .HTTPIP }}:{{ .HTTPPort }}/kickstart/almalinux-9.ks<enter><wait>"]
}

source "qemu" "almalinux-9" {
  iso_url              = var.url
  iso_checksum         = var.iso_checksum
  vm_name              = var.name
  format               = "qcow2"
  accelerator          = "kvm"
  headless             = true
  cpus                 = 2
  qemuargs = [
    ["-cpu", "host,+nx"],
  ]
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
  ssh_password         = "RvHtrfTwCjTnhHrD"
  http_directory       = "files"
  http_port_min        = 8000
  http_port_max        = 8100
  output_directory     = "build_${var.name}"
}

build {
  sources = ["source.qemu.almalinux-9"]

  provisioner "file" {
    source          = "../config/files/generic/cloud-init.cfg"
    destination     = "/etc/cloud/cloud.cfg"
  }

  provisioner "file" {
    source          = "../config/files/generic/watchdog.conf"
    destination     = "/etc/watchdog.conf"
  }

  provisioner "file" {
    source          = "../config/files/generic/99-disable-ipv6-tempaddr.conf"
    destination     = "/etc/sysctl.d/99-disable-ipv6-tempaddr.conf"
  }

  provisioner "file" {
    source          = "../config/files/generic/99-hotPlugCPU.rules"
    destination     = "/etc/udev/rules.d/99-hotPlugCPU.rules"
  }

  provisioner "file" {
    source          = "../config/files/centos/90-dns-none.conf"
    destination     = "/etc/NetworkManager/conf.d/90-dns-none.conf"
  }

  provisioner "file" {
    source          = "../config/files/centos/90-dhcp-client.conf"
    destination     = "/etc/NetworkManager/conf.d/90-dhcp-client.conf"
  }

  provisioner "file" {
    source          = "../config/files/centos/grub"
    destination     = "/etc/default/grub"
  }

  provisioner "shell" {
    scripts = [
      "../scripts/almalinux-9/post.sh",
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
