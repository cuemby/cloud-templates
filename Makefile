TEMPLATE_DIR=templates
BUILD_DIR_PREFIX=build_
TIMEOUT=240m

.PHONY: build build-all validate validate-all clean setup dev help list-templates

default: help

help:
	@echo 'CloudStack Packer Templates - Modern Edition'
	@echo 'Self-contained modern CloudStack template project'
	@echo ''
	@echo 'Usage:'
	@echo '  make build NAME=template_name    Build specific template (e.g., ubuntu-22.04)'
	@echo '  make build-all                   Build all templates'
	@echo '  make validate NAME=template_name Validate specific template'
	@echo '  make validate-all                Validate all templates'
	@echo '  make list-templates              List all available templates'
	@echo '  make clean                       Clean build artifacts'
	@echo '  make setup                       Setup development environment'
	@echo '  make dev                         Setup development environment'
	@echo ''
	@echo 'Examples:'
	@echo '  make build NAME=ubuntu-22.04'
	@echo '  make validate NAME=debian-12'
	@echo '  make build-all'

build:
	@if [ -z "$(NAME)" ]; then echo "Error: NAME is required. Use: make build NAME=template_name"; exit 1; fi
	@if [ ! -f "${TEMPLATE_DIR}/${NAME}.pkr.hcl" ]; then echo "Error: Template ${NAME}.pkr.hcl not found in ${TEMPLATE_DIR}/."; exit 1; fi
	cd ${TEMPLATE_DIR} && env PACKER_LOG=1 timeout ${TIMEOUT} packer build -var "name=${NAME}" ${NAME}.pkr.hcl

build-all:
	@if [ ! -d "${TEMPLATE_DIR}" ] || [ -z "$$(find ${TEMPLATE_DIR} -name '*.pkr.hcl' 2>/dev/null)" ]; then echo "No templates found in ${TEMPLATE_DIR}/."; exit 1; fi
	deno task build-all

validate:
	@if [ -z "$(NAME)" ]; then echo "Error: NAME is required. Use: make validate NAME=template_name"; exit 1; fi
	@if [ ! -f "${TEMPLATE_DIR}/${NAME}.pkr.hcl" ]; then echo "Error: Template ${NAME}.pkr.hcl not found in ${TEMPLATE_DIR}/."; exit 1; fi
	packer validate ${TEMPLATE_DIR}/${NAME}.pkr.hcl

validate-all:
	@if [ ! -d "${TEMPLATE_DIR}" ] || [ -z "$$(find ${TEMPLATE_DIR} -name '*.pkr.hcl' 2>/dev/null)" ]; then echo "No templates found in ${TEMPLATE_DIR}/."; exit 1; fi
	deno task validate-all

list-templates:
	@if [ -d "${TEMPLATE_DIR}" ]; then \
		echo "Available modern templates:"; \
		find ${TEMPLATE_DIR} -name "*.pkr.hcl" -exec basename {} .pkr.hcl \; | sort; \
	else \
		echo "No templates found in ${TEMPLATE_DIR}/."; \
	fi

clean:
	rm -rf ${BUILD_DIR_PREFIX}*
	rm -rf ${TEMPLATE_DIR}/${BUILD_DIR_PREFIX}*

setup:
	@echo "Setting up modern CloudStack templates development environment..."
	@command -v deno >/dev/null 2>&1 || (echo "Error: Deno is required. Install from https://deno.com/manual/getting_started/installation"; exit 1)
	@command -v packer >/dev/null 2>&1 || (echo "Error: Packer is required. Install from https://www.packer.io/downloads"; exit 1)
	deno task init
	@echo "✅ Modern development environment ready!"
	@echo "Self-contained project with $(shell find ${TEMPLATE_DIR} -name '*.pkr.hcl' 2>/dev/null | wc -l) templates available."
	@echo "Next steps:"
	@echo "  1. Run 'make validate-all' to validate templates"
	@echo "  2. Run 'make build NAME=template_name' to build a template"
	@echo "  3. Run 'make list-templates' to see available templates"

dev: setup