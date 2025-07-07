variable "name" {
  type    = string
  default = "debian-10"
}

variable "url" {
  type    = string
  default = "http://compute.o.auroraobjects.eu/iso/debian-10.7.0-amd64-netinst.iso"
}

variable "iso_checksum" {
  type    = string
  default = "sha256:b317d87b0a3d5b568f48a92dcabfc4bc51fe58d9f67ca13b013f1b8329d1306d"
}

variable "boot_command" {
  type    = string
  default = "<esc><wait5>install <wait> preseed/url=http://{{ .HTTPIP }}:{{ .HTTPPort }}/preseed/debian-10.preseed debian-installer=en_US auto locale=en_US kbd-chooser/method=us keyboard-configuration/xkb-keymap=us netcfg/get_hostname=debian10 netcfg/get_domain=auroracompute.com fb=false debconf/frontend=noninteractive console-setup/ask_detect=false <wait> console-keymaps-at/keymap=us <wait><enter>"
}

source "qemu" "debian-10" {
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
  ssh_password         = "PVT6HXW4t7PDy7Pb"
  http_directory       = "files"
  http_port_min        = 8000
  http_port_max        = 8100
  output_directory     = build_${var.name}
}

build {
  sources = ["source.qemu.debian-10"]

  provisioner "file" {
    source          = "../config/files/apt/debian-10.sources"
    destination     = "/etc/apt/sources.list"
  }

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

  provisioner "shell" {
    scripts = [
      "../scripts/debian-10/post.sh",
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
