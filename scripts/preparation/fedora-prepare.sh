#!/bin/bash
set -e

echo "Starting Fedora CloudStack template preparation..."

# Update system
dnf update -y

# Install essential packages
dnf install -y \
    cloud-init \
    cloud-utils-growpart \
    openssh-server \
    curl \
    wget \
    vim \
    htop \
    net-tools \
    bind-utils \
    sudo \
    NetworkManager \
    qemu-guest-agent \
    acpid

# Configure cloud-init for CloudStack
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
    name: fedora
    lock_passwd: false
    gecos: Fedora User
    groups: [wheel, adm, systemd-journal]
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
  - rsyslog
  - users-groups
  - ssh

cloud_config_modules:
  - locale
  - set-passwords
  - yum-configure
  - ntp
  - timezone
  - runcmd

cloud_final_modules:
  - package-update-upgrade-install
  - puppet
  - chef
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

# Enable services
systemctl enable cloud-init
systemctl enable cloud-init-local
systemctl enable cloud-config
systemctl enable cloud-final
systemctl enable sshd
systemctl enable NetworkManager
systemctl enable qemu-guest-agent
systemctl enable acpid

# Configure network interfaces
cat > /etc/NetworkManager/conf.d/99-dhcp.conf << 'EOF'
[main]
dhcp=dhclient

[connection]
ipv6.method=ignore
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
        echo "fedora:$PASSWORD" | chpasswd
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
    grub2-mkconfig -o /boot/grub2/grub.cfg
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
rm -rf /var/log/anaconda

# Clear bash history
history -c
> /root/.bash_history
> /home/fedora/.bash_history 2>/dev/null || true

echo "Fedora CloudStack template preparation completed successfully!"