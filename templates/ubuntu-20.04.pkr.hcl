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
  default = "ubuntu-20.04"
}

variable "url" {
  type    = string
  default = "https://releases.ubuntu.com/20.04/ubuntu-20.04.6-live-server-amd64.iso"
}

variable "iso_checksum" {
  type    = string
  default = "sha256:b8f31413336b9393ad5d8ef0282717b2ab19f007df2e9ed5196c13d8f9153c8b"
}

source "qemu" "ubuntu-20-04" {
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
  boot_wait            = "2s"
  boot_command = [
    "<enter><enter><f6><esc><wait> ",
    "autoinstall ds=nocloud-net;seedfrom=http://{{ .HTTPIP }}:{{ .HTTPPort }}/",
    "<enter><wait>",
  ]
  communicator         = "ssh"
  vnc_bind_address     = "[::]"
  ssh_wait_timeout     = "45m"
  ssh_username         = "root"
  ssh_password         = "mL9QHd95JrCdhc5V"
  ssh_handshake_attempts = "300"
  pause_before_connecting = "2m"
  http_directory       = "config/files/ubuntu-20.04"
  http_port_min        = 8000
  http_port_max        = 8100
  output_directory     = "build_${var.name}"
}

build {
  sources = ["source.qemu.ubuntu-20-04"]

  provisioner "file" {
    source          = "config/files/apt/ubuntu-20.04.sources"
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
    source          = "config/files/ubuntu-20.04/01-netcfg.yaml"
    destination     = "/etc/netplan/01-netcfg.yaml"
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
      "scripts/ubuntu-20.04/remove-swap.sh",
    ]
    execute_command = "sh '{{ .Path }}'"
  }

  provisioner "shell" {
    scripts = [
      "scripts/ubuntu-20.04/post.sh",
    ]
    execute_command = "sudo sh '{{ .Path }}'"
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
