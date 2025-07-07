# Cloud-Native Build Architecture

This document outlines the cloud-native build system for CloudStack OS templates, addressing M1 Mac incompatibility issues.

## Architecture Overview

### Problem Statement
The original local build system requires x86 virtualization (QEMU/KVM) which is incompatible with Apple Silicon (M1/M2) hardware.

### Solution
Cloud-native GitHub Actions-based build system with x86 runners that can execute Packer builds with full virtualization support.

## Key Components

### 1. GitHub Actions Workflow
- **Location**: `.github/workflows/build-templates.yml`
- **Features**:
  - Matrix builds for all supported OS templates
  - Automated ISO caching and management
  - Artifact storage with versioning
  - Security scanning and validation
  - Automated releases on main branch

### 2. Cloud Template Builder
- **Location**: `scripts/builders/cloud.ts`
- **Features**:
  - Cloud environment detection
  - Enhanced error handling and retry logic
  - Headless build support
  - Virtual display management
  - ISO download with retries

### 3. Hybrid Build System
- **Location**: `scripts/build.ts`
- **Features**:
  - Automatic environment detection
  - Falls back to local builder on non-CI environments
  - Uses cloud builder in CI/CD environments

## Supported Operating Systems

The system builds templates for:
- Ubuntu 22.04 LTS
- AlmaLinux 9
- RockyLinux 9
- CentOS Stream 9
- Fedora 41 Server

## Usage

### Local Development
```bash
# Test cloud build compatibility
deno task test:cloud

# Build specific OS (uses appropriate builder)
deno task build:ubuntu

# Build all templates
deno task build:all
```

### GitHub Actions
The workflow automatically triggers on:
- Push to main/develop branches
- Pull requests to main
- Manual workflow dispatch

#### Manual Trigger
```bash
# Trigger via GitHub CLI
gh workflow run build-templates.yml -f os_filter=ubuntu

# Build all templates
gh workflow run build-templates.yml -f os_filter=all
```

## Build Process

1. **Environment Setup**
   - Install Packer and QEMU/KVM
   - Configure virtual display for headless builds
   - Set up ISO caching

2. **Template Building**
   - Download and verify ISO checksums
   - Run Packer with cloud-optimized settings
   - Generate template artifacts

3. **Validation & Packaging**
   - Run template validation scripts
   - Compress templates for distribution
   - Generate metadata files

4. **Artifact Storage**
   - Upload to GitHub Actions artifacts
   - Create versioned releases on main branch
   - Maintain retention policies

## Configuration

### Environment Variables
- `PACKER_VERSION`: Packer version to install
- `QEMU_VERSION`: QEMU version to use
- `SKIP_VALIDATION`: Skip template validation
- `PACKER_FORMAT`: Output format (qcow2, vhd, ova)

### Matrix Configuration
Modify the `prepare` job in the workflow to customize which OS templates to build:

```yaml
strategy:
  matrix:
    os: ["ubuntu", "almalinux", "rockylinux", "centos", "fedora"]
```

## Benefits

1. **Cross-Platform Compatibility**: Works on any development machine
2. **Scalable Builds**: Parallel execution across multiple OS templates
3. **Consistent Environment**: Reproducible builds in controlled cloud environment
4. **Cost Effective**: Pay-per-use model with GitHub Actions
5. **Version Control**: All build configurations in Git
6. **Automated Testing**: Built-in validation and security scanning

## Limitations

1. **Network Dependency**: Requires internet connectivity for builds
2. **GitHub Actions Limits**: Subject to GitHub usage limits
3. **Slower Iteration**: Longer feedback loop compared to local builds
4. **Cloud Cost**: Usage-based pricing (mitigated by efficient caching)

## Migration Status

- ✅ **Phase 4a**: GitHub Actions foundation with matrix builds
- ✅ **Phase 4b**: Cloud builder with environment detection
- ✅ **Phase 4c**: Hybrid local/cloud build system
- 🔄 **Phase 4d**: Production hardening and optimization (in progress)

## Next Steps

1. **Self-Hosted Runners**: Reduce costs with dedicated x86 infrastructure
2. **Advanced Caching**: Optimize ISO downloads and build artifacts
3. **CloudStack Integration**: Automated template deployment pipeline
4. **Monitoring**: Build success rate and performance metrics
5. **Multi-Cloud Support**: Extend to other CI/CD platforms

## Security Considerations

- ISO checksums verified for all downloads
- Templates scanned for vulnerabilities
- Secure artifact storage with access controls
- Audit logging for all build operations

## Cost Optimization

- Efficient caching strategies for ISOs and dependencies
- Parallel builds to minimize total runtime
- Artifact retention policies to manage storage costs
- Self-hosted runner option for high-volume usage