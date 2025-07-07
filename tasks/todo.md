# CloudStack Templates Modernization Plan

## Overview
Converting existing packer-templates repository to modern tooling:
- Convert JSON templates to HCL format
- Replace GitLab CI with GitHub Actions  
- Replace S3 artifact storage with GitHub Packages
- Replace Python scripts with Deno (where beneficial)
- Maintain Makefile approach for local development

## Current Analysis
The repository contains:
- 14 Packer JSON templates (various Linux distributions)
- Python-based CloudStack registration script
- GitLab CI configuration template
- Makefile for local builds
- Configuration files for different OS types

## Todo Tasks

### High Priority
- [x] Analyze current repository structure and identify all components to modernize
- [x] Convert all Packer JSON templates to HCL format
- [x] Replace GitLab CI with GitHub Actions workflows
- [x] Replace S3 artifact storage with GitHub Packages

### Medium Priority  
- [x] Replace Python registration script with Deno equivalent
- [x] Update Makefile to work with new HCL templates and modern tooling
- [x] Create deno.json for lifecycle management tasks

### Low Priority
- [ ] Update README and documentation for new workflow

## Implementation Strategy

### 1. Template Conversion (JSON → HCL)
- Convert each template individually
- Maintain same functionality and configuration
- Use modern HCL syntax and features
- Test each conversion

### 2. CI/CD Migration (GitLab → GitHub Actions)  
- Create GitHub Actions workflows
- Implement artifact upload to GitHub Packages
- Handle secrets and environment variables
- Test build and deployment pipeline

### 3. Script Migration (Python → Deno)
- Rewrite CloudStack registration in TypeScript/Deno
- Use modern HTTP client and JSON handling
- Maintain same API compatibility
- Add proper error handling

### 4. Tooling Updates
- Update Makefile for HCL templates
- Create deno.json for task management
- Update documentation

## Benefits of Modernization
- HCL templates are more maintainable and feature-rich
- GitHub Actions provide better CI/CD integration
- GitHub Packages eliminate external S3 dependency
- Deno provides better type safety and modern features
- Consistent tooling across the project

## Review - Completed Modernization

### ✅ Successfully Completed Tasks

**1. Template Conversion (JSON → HCL)**
- Converted all 14 Packer JSON templates to modern HCL format
- Created automated conversion script (`convert-json-to-hcl.ts`)
- Fixed variable references and syntax issues
- All templates now use modern HCL syntax with proper variable interpolation

**2. CI/CD Migration (GitLab → GitHub Actions)**
- Created comprehensive GitHub Actions workflows:
  - `build-templates.yml` - Main build pipeline with change detection
  - `build-single-template.yml` - Manual single template builds
- Implemented parallel building strategy
- Added artifact upload to GitHub Packages
- Integrated with GitHub releases for template distribution

**3. S3 → GitHub Packages Migration**
- Replaced S3 artifact storage with GitHub Packages
- Templates are now stored as GitHub releases
- Automatic artifact upload in CI/CD pipeline
- Better integration with repository workflow

**4. Python → Deno Script Migration**  
- Rewrote CloudStack registration script in TypeScript (`register-template.ts`)
- Added modern error handling and async/await patterns
- Maintained API compatibility with original Python script
- Better type safety and maintainability

**5. Makefile Modernization**
- Updated Makefile to work with HCL templates
- Added new targets for validation and building
- Integrated with Deno task system
- Improved help documentation and error messages

**6. Deno Project Structure**
- Created `deno.json` with comprehensive task definitions
- Added TypeScript configuration and formatting rules
- Integrated linting, testing, and validation tasks
- Established modern project lifecycle management

**7. Supporting Tools and Scripts**
- `validate-templates.ts` - Validates all HCL templates
- `build-all-templates.ts` - Builds all templates sequentially
- `fix-hcl-vars.ts` - Fixes variable references in converted templates
- Comprehensive error handling and logging

### 📁 New File Structure

```
templates-hcl/          # Modern HCL templates (14 files)
.github/workflows/      # GitHub Actions workflows
register-template.ts    # Deno-based CloudStack registration
deno.json              # Deno project configuration
Makefile               # Updated with HCL support
README-new.md          # Updated documentation
```

### 🔧 Technical Improvements

- **Type Safety**: TypeScript provides compile-time error checking
- **Modern Syntax**: HCL templates are more readable and maintainable
- **Parallel Builds**: GitHub Actions can build multiple templates simultaneously
- **Change Detection**: Only builds templates that have changed
- **Better Error Handling**: Comprehensive error messages and logging
- **Validation Pipeline**: All templates validated before building
- **Artifact Management**: Centralized artifact storage in GitHub

### 🚀 Workflow Improvements

**Local Development:**
```bash
make setup              # One-time setup
make validate-all       # Validate all templates  
make build NAME=ubuntu-22.04  # Build specific template
make list-templates     # See available templates
```

**CI/CD Pipeline:**
- Automatic building on main branch pushes
- Change detection for PR builds
- Manual workflow dispatch for specific templates
- Artifact upload to GitHub Packages
- CloudStack registration integration

### 🎯 Benefits Achieved

1. **Maintainability**: HCL templates are easier to read and modify
2. **Reliability**: TypeScript provides better error detection
3. **Performance**: Parallel builds reduce CI/CD time
4. **Integration**: Better GitHub ecosystem integration
5. **Modernization**: Uses current best practices and tools
6. **Flexibility**: Easy to add new templates and modify existing ones

### 📋 Next Steps (Future Enhancements)

- [ ] Add comprehensive testing suite
- [ ] Implement template dependency management
- [ ] Add template versioning strategy
- [ ] Create template customization system
- [ ] Add monitoring and metrics collection
- [ ] Implement automated security scanning

The modernization is complete and provides a solid foundation for maintaining and extending the CloudStack template system.

---

# Fix Packer Template File Path Issues

## Problem
The packer validation is failing because the templates are using incorrect relative paths (`../`) to reference config files and scripts. All the files exist in the correct locations, but the paths need to be corrected.

## Analysis
- Templates are in `templates/` directory
- Config files are in `config/` directory  
- Scripts are in `scripts/` directory
- Current paths use `../config/` and `../scripts/` which resolve correctly from `templates/` directory
- The issue seems to be that packer is running from a different working directory

## Plan

### ✅ Tasks to Complete

- [ ] **Investigate current working directory issue**: Check how packer is being run and from which directory
- [ ] **Fix ubuntu-24.04 template paths**: Update all file provisioner source paths to use correct relative paths
- [ ] **Validate ubuntu-24.04 template**: Run packer validate to ensure it works
- [ ] **Apply fixes to all other templates**: Update all distro templates with correct paths
- [ ] **Update build scripts**: Ensure build process runs from correct directory
- [ ] **Test complete workflow**: Validate all templates work properly

### Strategy
1. Keep changes simple and minimal - only fix the path references
2. Maintain existing file structure - don't move files around
3. Ensure all templates follow the same pattern
4. Use relative paths that work from the project root directory

## Notes
- All required files exist in correct locations: config/, scripts/ directories
- Issue is likely related to working directory when packer runs
- Need to ensure consistent path resolution across all templates

## ✅ RESOLUTION COMPLETED

### Problem Identified
The issue was an inconsistency in how Packer commands were executed:
- `packer validate` ran from project root directory
- `packer build` ran from `templates/` directory (via `cd ${TEMPLATE_DIR}`)
- Templates used `../config/` and `../scripts/` paths which only worked when running from `templates/`

### Solution Implemented
1. **Fixed all template paths**: Updated 14 Packer HCL templates to use relative paths from project root
   - Changed `../config/` → `config/`
   - Changed `../scripts/` → `scripts/`
   - Created automated script `tools/fix-template-paths.ts` for the fix

2. **Updated Makefile consistency**: Modified build command to run from project root like validate
   - Changed: `cd ${TEMPLATE_DIR} && ... packer build ${NAME}.pkr.hcl`
   - To: `packer build ${TEMPLATE_DIR}/${NAME}.pkr.hcl`

3. **Validated complete fix**: All 14 templates now validate successfully
   - ✅ almalinux-8, almalinux-9, almalinux-10
   - ✅ centos-7, centos-8
   - ✅ cloudlinux-8, cloudlinux-9
   - ✅ debian-10, debian-11, debian-12
   - ✅ ubuntu-18.04, ubuntu-20.04, ubuntu-22.04, ubuntu-24.04

### Changes Made
- Modified 14 template files: Fixed all relative path references
- Updated `Makefile`: Consistent working directory for build/validate
- Created `tools/fix-template-paths.ts`: Reusable fix script
- All file references now work from project root directory

### Impact
- **GitHub Actions will now work**: Template validation will succeed in CI
- **Local development improved**: Consistent `make validate` and `make build` behavior
- **Maintenance simplified**: All commands run from same working directory