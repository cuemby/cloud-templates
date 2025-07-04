# CloudStack Template Standards

## Base Template Requirements

### Disk Configuration
- **Root Partition**: 20GB minimum, ext4 filesystem (Linux), NTFS (Windows)
- **Swap**: 1GB swap partition for Linux systems
- **Boot**: Separate /boot partition (512MB) for Linux systems
- **Disk Format**: QCOW2 for KVM, VHD for XenServer, VMDK for VMware

### System Configuration
- **Hostname**: `localhost.localdomain` (will be set by CloudStack)
- **Timezone**: UTC
- **Language**: English (en_US.UTF-8)
- **Keyboard**: US layout

### Network Configuration
- **Interface**: eth0 configured for DHCP
- **DNS**: CloudStack will configure DNS servers
- **Firewall**: Minimal rules, SSH enabled
- **NetworkManager**: Disabled (use traditional networking)

### User Configuration
- **Root User**: Enabled with random password (CloudStack will reset)
- **Default User**: Created per OS convention (ubuntu, centos, etc.)
- **SSH**: Enabled for root and default user
- **Password Authentication**: Enabled (CloudStack handles key injection)

## Package Installation Standards

### Essential Packages (All OS)
- SSH server (openssh-server)
- CloudStack agent dependencies
- curl, wget, vim, nano
- Network tools (net-tools, iputils)
- System monitoring (htop, iotop)
- Development tools (build-essential/development tools)

### CloudStack Integration
- **Cloud-init**: Installed and configured
- **CloudStack Agent**: Latest version from CloudStack repository
- **Hypervisor Tools**: VMware Tools, XenServer PV drivers, or KVM guest agent
- **Password Reset**: CloudStack password reset script

### Security Packages
- **Firewall**: iptables/firewalld configured
- **SELinux**: Enforcing mode where applicable
- **Fail2ban**: Installed and configured for SSH protection
- **Automatic Updates**: Configured for security updates

## System Preparation Standards

### Pre-Template Cleanup
- Remove unique identifiers:
  - SSH host keys
  - Machine ID files
  - Network interface MAC addresses
  - DHCP leases
  - Log files
- Clear user history files
- Remove package cache
- Zero out free space for compression

### Service Configuration
- **SSH**: Configured for secure access
- **NTP**: Configured for time synchronization
- **Logging**: Configured for appropriate log levels
- **Cron**: Basic maintenance tasks configured

### CloudStack Specific Configuration
- **CloudStack Agent**: Configured but not started
- **Template Scripts**: CloudStack template preparation scripts
- **Metadata Service**: Configured for CloudStack metadata access
- **Volume Management**: LVM configured for dynamic disk expansion

## OS-Specific Standards

### Ubuntu Templates
- **Cloud-init**: Full cloud-init configuration
- **APT**: Security repository enabled
- **Snap**: Disabled for template consistency
- **Default User**: ubuntu

### RHEL-based Templates (AlmaLinux, RockyLinux, CentOS, RHEL)
- **YUM/DNF**: EPEL repository enabled
- **SELinux**: Enforcing mode
- **Firewalld**: Configured with basic rules
- **Default User**: centos/almalinux/rocky/rhel

### SUSE Templates
- **Zypper**: Update repositories configured
- **YaST**: Minimal configuration
- **Default User**: suse

### Fedora Templates
- **DNF**: Latest repositories
- **Systemd**: Modern systemd configuration
- **Default User**: fedora

## Template Metadata Standards

### CloudStack Template Properties
- **OS Type**: Accurate OS type identification
- **Architecture**: x86_64
- **Hypervisor**: KVM/XenServer/VMware as applicable
- **Format**: QCOW2/VHD/VMDK
- **Size**: Actual template size
- **Checksum**: SHA256 checksum

### Template Naming Convention
- Format: `{OS}-{Version}-{Architecture}-{Date}`
- Example: `ubuntu-22.04-x86_64-20241204`
- Include build number for iterations

### Template Documentation
- OS version and build details
- Installed packages list
- Security configurations
- Known limitations or issues
- Deployment instructions

## Quality Assurance Standards

### Template Testing
- **Boot Test**: Template boots successfully
- **Network Test**: Network configuration works
- **CloudStack Test**: Deploys correctly in CloudStack
- **Security Test**: Basic security validation
- **Performance Test**: Resource usage validation

### Validation Checklist
- [ ] Template boots in under 60 seconds
- [ ] Network interface configured correctly
- [ ] SSH access works
- [ ] CloudStack agent can be started
- [ ] Cloud-init processes metadata
- [ ] Disk space optimized
- [ ] All cleanup completed
- [ ] Security settings applied
- [ ] Template metadata correct
- [ ] Documentation complete

## Maintenance Standards

### Template Updates
- **Monthly**: Security updates and patches
- **Quarterly**: Major version updates
- **Annually**: OS version upgrades
- **Emergency**: Critical security patches

### Version Control
- Template version tracking
- Build script version control
- Configuration change history
- Rollback procedures

### Documentation
- Build logs maintained
- Change logs updated
- Deployment guides current
- Troubleshooting guides updated