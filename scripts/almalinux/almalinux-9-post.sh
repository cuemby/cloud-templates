#!/bin/bash
set -xe

echo "Remove DHCP leases"
find /var/lib -type f -name '*.lease' -print -delete

#packer sees ens4, cloudstack ens3. So we need to prepare ens3.
echo "Configuring network interface"
nmcli con add connection.interface-name ens3 type ethernet connection.id ens3
nmcli connection modify ens3 autoconnect yes

echo "Set NetworkManager global ipv6 address generation mode to eui64"
echo "[connection]" | tee -a /etc/NetworkManager/NetworkManager.conf
echo "ipv6.addr-gen-mode=0" | tee -a /etc/NetworkManager/NetworkManager.conf

echo "Configuring DNS"
find /etc -maxdepth 1 -type l -name 'resolv.conf' -print -delete
echo "nameserver 2a00:f10:ff04:153::53"|tee /etc/resolv.conf
echo "nameserver 2a00:f10:ff04:253::53"|tee -a /etc/resolv.conf

echo "Enabling systemd services"
systemctl enable cloud-init cloud-config fstrim.timer qemu-guest-agent

#[cloudinit dhcp/datasource issue](https://github.com/canonical/cloud-init/issues/5378)
echo "Workaround cloud-init issue 5378"
sed -i "s/    lease_file = dhcp.IscDhclient.parse_dhcp_server_from_lease_file/    latest_address = dhcp.IscDhclient.parse_dhcp_server_from_lease_file/" /usr/lib/python*/site-packages/cloudinit/sources/DataSourceCloudStack.py

echo "Cleaning up cloud-init"
find /var/log -type f -name 'cloud-init*.log' -print -delete
cloud-init clean -s -l

echo "Configure users for CloudStack password management"
# Unlock root account and clear password (CloudStack will set it)
passwd --delete root
passwd --unlock root || true
# Create cloud-user if it doesn't exist
if ! id -u cloud-user >/dev/null 2>&1; then
    useradd -m -s /bin/bash -G wheel,adm,systemd-journal cloud-user
fi
# Clear cloud-user password and unlock (CloudStack will set it)
passwd --delete cloud-user
passwd --unlock cloud-user || true

# Remove any authorized keys that might allow passwordless login
echo "Removing all SSH authorized keys to prevent passwordless login"
rm -rf /root/.ssh
rm -rf /home/packer/.ssh
rm -rf /home/cloud-user/.ssh
# Also remove the packer user since it's only for build
userdel -r packer || true

# Configure SSH to allow both password and key authentication for CloudStack
echo "Configuring SSH settings"
# First uncomment the lines, then set the values
sed -i 's|^#*PermitRootLogin .*|PermitRootLogin yes|g' /etc/ssh/sshd_config
sed -i 's|^#*PasswordAuthentication .*|PasswordAuthentication yes|g' /etc/ssh/sshd_config
sed -i 's|^#*PubkeyAuthentication .*|PubkeyAuthentication yes|g' /etc/ssh/sshd_config
sed -i 's|^#*ChallengeResponseAuthentication .*|ChallengeResponseAuthentication no|g' /etc/ssh/sshd_config

# If the settings don't exist, add them
grep -q "^PermitRootLogin" /etc/ssh/sshd_config || echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
grep -q "^PasswordAuthentication" /etc/ssh/sshd_config || echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config
grep -q "^PubkeyAuthentication" /etc/ssh/sshd_config || echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
grep -q "^ChallengeResponseAuthentication" /etc/ssh/sshd_config || echo "ChallengeResponseAuthentication no" >> /etc/ssh/sshd_config

# Validate SSH configuration
echo "Validating SSH configuration"
sshd -t && echo "SSH configuration is valid" || echo "SSH configuration has errors"

echo "Deleting existing ssh host keys"
rm -f /etc/ssh/ssh_host*

unset HISTFILE

sync