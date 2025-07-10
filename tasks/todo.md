# Task: Include cloud-init.cfg in AlmaLinux builds

## Plan
Based on the analysis of the codebase, there is currently one AlmaLinux Packer template that can be used with two different variable files to create BIOS and EFI versions:

1. `almalinux-9-x86_64.pkr.hcl` - Main template
2. `almalinux-9-bios-x86_64.pkvars.hcl` - BIOS build variables
3. `almalinux-9-efi-x86_64.pkvars.hcl` - EFI build variables

## Todo Items
- [x] Add file provisioner to copy cloud-init.cfg to /etc/cloud/cloud.cfg
- [x] Ensure the provisioner runs after cloud-init-wait.sh script
- [ ] Test the change doesn't break existing functionality
- [ ] Commit the changes

## Implementation Details
The cloud-init.cfg file located at `files/generic/cloud-init.cfg` contains CloudStack-specific configuration that enables:
- CloudStack datasource with appropriate timeouts
- SSH key management
- Network configuration for CloudStack
- Proper user management with root access

This configuration will be copied to both BIOS and EFI builds since they use the same base template.