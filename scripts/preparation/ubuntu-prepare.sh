#!/bin/bash
set -e

echo "Starting Ubuntu CloudStack template preparation..."

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# Install essential packages
apt-get install -y \
    cloud-init \
    cloud-utils \
    cloud-guest-utils \
    openssh-server \
    curl \
    wget \
    vim \
    htop \
    net-tools \
    iputils-ping \
    dnsutils \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    qemu-guest-agent \
    acpid

# Configure cloud-init
cat > /etc/cloud/cloud.cfg.d/99-cloudstack.cfg << 'EOF'
# CloudStack specific cloud-init configuration
datasource_list: ['CloudStack']
datasource:
  CloudStack:
    timeout: 20
    max_wait: 60
    metadata_urls: ['http://169.254.169.254/']
    password_server_port: 8080

# Enable password authentication
ssh_pwauth: True

# Default user configuration
system_info:
  default_user:
    name: ubuntu
    lock_passwd: false
    gecos: Ubuntu User
    groups: [adm, audio, cdrom, dialout, dip, floppy, lxd, netdev, plugdev, sudo, video]
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    shell: /bin/bash

# Cloud-init modules
cloud_init_modules:
  - migrator
  - seed_random
  - bootcmd
  - write-files
  - growpart
  - resizefs
  - disk_setup
  - mounts
  - set_hostname
  - update_hostname
  - update_etc_hosts
  - ca-certs
  - rsyslog
  - users-groups
  - ssh

cloud_config_modules:
  - emit_upstart
  - snap
  - ssh-import-id
  - locale
  - set-passwords
  - grub-dpkg
  - apt-pipelining
  - apt-configure
  - ubuntu-advantage
  - ntp
  - timezone
  - disable-ec2-metadata
  - runcmd
  - byobu

cloud_final_modules:
  - package-update-upgrade-install
  - fan
  - landscape
  - lxd
  - ubuntu-drivers
  - puppet
  - chef
  - mcollective
  - salt-minion
  - rightscale_userdata
  - scripts-vendor
  - scripts-per-once
  - scripts-per-boot
  - scripts-per-instance
  - scripts-user
  - ssh-authkey-fingerprints
  - keys-to-console
  - phone-home
  - final-message
  - power-state-change
EOF

# Configure SSH
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Enable services
systemctl enable cloud-init
systemctl enable cloud-init-local
systemctl enable cloud-config
systemctl enable cloud-final
systemctl enable ssh
systemctl enable qemu-guest-agent
systemctl enable acpid

# Configure network interfaces
cat > /etc/netplan/01-netcfg.yaml << 'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: false
      dhcp-identifier: mac
EOF

# Install CloudStack password server script
mkdir -p /opt/cloudstack
cat > /opt/cloudstack/set_password.sh << 'EOF'
#!/bin/bash
# CloudStack password reset script
PASSWORD_SERVER_PORT=8080
PASSWORD_URL="http://169.254.169.254/latest/meta-data/password"

# Check if password server is available
if curl -m 5 -s ${PASSWORD_URL} > /dev/null; then
    PASSWORD=$(curl -s ${PASSWORD_URL})
    if [ -n "$PASSWORD" ]; then
        echo "ubuntu:$PASSWORD" | chpasswd
        echo "Password updated from CloudStack password server"
    fi
fi
EOF

chmod +x /opt/cloudstack/set_password.sh

# Create systemd service for password reset
cat > /etc/systemd/system/cloudstack-password.service << 'EOF'
[Unit]
Description=CloudStack Password Reset
After=network.target

[Service]
Type=oneshot
ExecStart=/opt/cloudstack/set_password.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable cloudstack-password.service

# Configure grub for consistent device naming
if [ -f /etc/default/grub ]; then
    sed -i 's/GRUB_CMDLINE_LINUX=""/GRUB_CMDLINE_LINUX="net.ifnames=0 biosdevname=0"/' /etc/default/grub
    update-grub
fi

# Remove machine-specific identifiers
rm -f /etc/machine-id
rm -f /var/lib/dbus/machine-id
rm -f /etc/hostname
rm -f /etc/hosts

# Clean up logs and temporary files
rm -rf /var/log/cloud-init*
rm -rf /var/lib/cloud/instances/*
rm -rf /tmp/*
rm -rf /var/tmp/*
rm -f /var/log/wtmp
rm -f /var/log/btmp
rm -rf /var/log/installer

# Clear bash history
history -c
> /root/.bash_history
> /home/ubuntu/.bash_history 2>/dev/null || true

echo "Ubuntu CloudStack template preparation completed successfully!"