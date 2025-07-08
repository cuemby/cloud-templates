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
  default = "almalinux-10"
}

variable "url" {
  type    = string
  default = "https://repo.almalinux.org/almalinux/10/isos/x86_64/AlmaLinux-10.0-x86_64-boot.iso"
}

variable "iso_checksum" {
  type    = string
  default = "a1549729bfb66a28e3546c953033c9928eae7280917bb1c490983dba3bb9941c"
}

variable "boot_command" {
  type    = list(string)
  default = ["<esc><wait><esc><wait>e<down><down><end> inst.text inst.ks=http://{{ .HTTPIP }}:{{ .HTTPPort }}/kickstart/almalinux-10.ks<wait><f10>"]
}

source "qemu" "almalinux-10" {
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
  ssh_wait_timeout     = "30m"
  ssh_username         = "root"
  ssh_password         = "RvHtrfTwCjTnhHrD"
  http_directory       = "config/files"
  http_port_min        = 8000
  http_port_max        = 8100
  output_directory     = "build_${var.name}"
}

build {
  sources = ["source.qemu.almalinux-10"]

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

  provisioner "file" {
    source          = "config/files/centos/90-dns-none.conf"
    destination     = "/etc/NetworkManager/conf.d/90-dns-none.conf"
  }

  provisioner "file" {
    source          = "config/files/centos/grub"
    destination     = "/etc/default/grub"
  }

  provisioner "file" {
    source          = "config/files/patches/DataSourceCloudStack.patch"
    destination     = "/tmp/DataSourceCloudStack.patch"
  }

  provisioner "file" {
    source          = "config/files/patches/net_dhcp.patch"
    destination     = "/tmp/net_dhcp.patch"
  }

  provisioner "shell" {
    scripts = [
      "scripts/almalinux-10/post.sh",
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
