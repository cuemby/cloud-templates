# OS Image Sources and URLs

## Ubuntu
- **Ubuntu 20.04 LTS**: https://releases.ubuntu.com/20.04/ubuntu-20.04.6-live-server-amd64.iso
- **Ubuntu 22.04 LTS**: https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso
- **Ubuntu 24.04 LTS**: https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso
- **Checksums**: Available at https://releases.ubuntu.com/[version]/SHA256SUMS

## AlmaLinux
- **AlmaLinux 8**: https://repo.almalinux.org/almalinux/8/isos/x86_64/AlmaLinux-8.10-x86_64-minimal.iso
- **AlmaLinux 9**: https://repo.almalinux.org/almalinux/9/isos/x86_64/AlmaLinux-9.4-x86_64-minimal.iso
- **Checksums**: Available at https://repo.almalinux.org/almalinux/[version]/isos/x86_64/CHECKSUM

## RockyLinux
- **RockyLinux 8**: https://download.rockylinux.org/pub/rocky/8/isos/x86_64/Rocky-8.10-x86_64-minimal.iso
- **RockyLinux 9**: https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.4-x86_64-minimal.iso
- **Checksums**: Available at https://download.rockylinux.org/pub/rocky/[version]/isos/x86_64/CHECKSUM

## CentOS
- **CentOS 7**: http://mirror.centos.org/centos/7/isos/x86_64/CentOS-7-x86_64-Minimal-2009.iso
- **CentOS Stream 8**: https://mirror.stream.centos.org/8-stream/isos/x86_64/CentOS-Stream-8-x86_64-latest-boot.iso
- **Checksums**: Available at respective mirror locations

## SUSE Linux Enterprise
- **SUSE Linux Enterprise Server 15**: https://www.suse.com/download/sles/
- **Note**: Requires SUSE account for download
- **Evaluation**: 60-day free trial available

## Red Hat Enterprise Linux
- **RHEL 8**: https://access.redhat.com/downloads/content/479/ver=/rhel---8/
- **RHEL 9**: https://access.redhat.com/downloads/content/479/ver=/rhel---9/
- **Note**: Requires Red Hat subscription for download
- **Developer**: Free developer subscription available

## Fedora
- **Fedora 39**: https://download.fedoraproject.org/pub/fedora/linux/releases/39/Server/x86_64/iso/Fedora-Server-netinst-x86_64-39-1.5.iso
- **Fedora 40**: https://download.fedoraproject.org/pub/fedora/linux/releases/40/Server/x86_64/iso/Fedora-Server-netinst-x86_64-40-1.14.iso
- **Checksums**: Available at https://download.fedoraproject.org/pub/fedora/linux/releases/[version]/Server/x86_64/iso/Fedora-Server-[version]-[release]-x86_64-CHECKSUM

## Download Strategy
- Use minimal/netinstall ISOs when available to reduce download size
- Verify checksums for all downloaded ISOs
- Store ISOs in local cache to avoid repeated downloads
- Consider using mirrors for faster downloads based on geographic location

## Automation Notes
- All URLs should be parameterized in build scripts
- Implement checksum verification in download process
- Add retry logic for failed downloads
- Consider using torrent downloads for better reliability