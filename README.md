# CloudStack Templates - Modern Edition

**Self-contained**, modern Packer HCL templates for building CloudStack-compatible VM images, with GitHub Actions CI/CD and TypeScript tooling.

## Quick Start

```bash
# Setup development environment
make setup

# Build a specific template
make build NAME=ubuntu-22.04

# Validate all templates
make validate-all

# List available templates
make list-templates
```

## Architecture

This modernized project is **completely self-contained** and includes:

- **Modern HCL templates** (converted from JSON)
- **GitHub Actions workflows** (replacing GitLab CI)
- **TypeScript/Deno tooling** (replacing Python)
- **GitHub Packages integration** (replacing S3)

```
cloudstack-templates-modern/
├── templates/              # Modern HCL templates (14 files)
├── scripts/               # All necessary shell scripts
├── config/
│   ├── files/            # Configuration files for all OS types
│   └── project.json      # Project configuration
├── src/
│   └── register-template.ts  # CloudStack registration
├── tools/                # Build and validation tools
└── .github/workflows/    # CI/CD automation
```

## Requirements

- [Packer](https://www.packer.io/downloads) (>= 1.9.0)
- [Deno](https://deno.com/manual/getting_started/installation) (>= 1.37.0)
- QEMU/KVM for local builds

## Available Templates

- Ubuntu: 18.04, 20.04, 22.04, 24.04
- Debian: 10, 11, 12  
- CentOS: 7, 8
- AlmaLinux: 8, 9, 10
- CloudLinux: 8, 9

## Key Commands

```bash
# Setup
make setup                   # Setup environment

# Building and validation
make build NAME=template     # Build specific template
make build-all              # Build all templates
make validate-all           # Validate all templates
make list-templates         # List available templates

# Maintenance
make clean                  # Clean build artifacts

# Using Deno tasks directly
deno task register          # Register template to CloudStack
deno task regenerate        # Show template information
```

## Features

### 🏗️ **Modern Architecture**
- **HCL syntax** instead of legacy JSON
- **Self-contained** with all necessary files included
- **Modern tooling** with TypeScript/Deno
- **Type-safe scripting** for reliability

### 🔄 **CI/CD Automation**  
- **GitHub Actions** with parallel builds
- **Change detection** - only builds modified templates
- **GitHub Packages** for artifact storage
- **Automated CloudStack registration**

### 🛠️ **Developer Experience**
- **Simple commands** via Makefile
- **Comprehensive validation** pipeline
- **Error handling** and logging
- **Self-contained workflow**

## CloudStack Integration

Set the `CLOUDSTACK_PROFILES` environment variable:

```bash
export CLOUDSTACK_PROFILES=$(echo '[
  {
    "name": "prod",
    "endpoint": "https://cloud/api",
    "key": "your-api-key",
    "secret": "your-secret"
  }
]' | base64)
```

Register templates:
```bash
deno task register --name ubuntu-22.04 --url https://github.com/owner/repo/releases/download/v1/ubuntu-22.04.tar.gz --manifest build_ubuntu-22.04/ubuntu-22.04.json
```

## Benefits Over Original

| Aspect | Original | Modern Edition |
|--------|----------|----------------|
| Template Format | JSON | HCL |
| CI/CD | GitLab CI | GitHub Actions |
| Storage | S3 | GitHub Packages |
| Scripting | Python | TypeScript/Deno |
| Structure | Monolithic | Self-contained modern project |
| Maintenance | Manual updates | Automated tooling |
| Type Safety | None | Full TypeScript |
| Error Handling | Basic | Comprehensive |

## Development Workflow

1. **Initial Setup**: `make setup`
2. **Development**: Modify templates in `templates/`
3. **Validation**: `make validate-all`
4. **Building**: `make build NAME=template-name`
5. **Testing**: Build and validate changes

## License

Apache License 2.0

---

*Modern, self-contained CloudStack Packer templates with HCL syntax, GitHub Actions CI/CD, and TypeScript tooling.*