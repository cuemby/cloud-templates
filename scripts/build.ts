#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-run

import { join } from "@std/path";
import { BaseTemplateBuilder, OSConfig, BuildOptions } from "./builders/base.ts";
import { CloudTemplateBuilder, CloudBuildOptions } from "./builders/cloud.ts";

// OS configurations for each supported system
const osConfigs: Record<string, OSConfig> = {
  ubuntu: {
    name: "ubuntu",
    version: "24.04.2",
    isoUrl: "https://releases.ubuntu.com/24.04/ubuntu-24.04.2-live-server-amd64.iso",
    isoChecksum: "placeholder-checksum-will-be-logged-during-build",
    packerTemplate: "ubuntu.pkr.hcl",
    preparationScript: "ubuntu-prepare.sh",
    validationScript: "ubuntu-validate.ts",
  },
  almalinux: {
    name: "almalinux",
    version: "9",
    isoUrl: "https://repo.almalinux.org/almalinux/9/isos/x86_64/AlmaLinux-9-latest-x86_64-minimal.iso",
    isoChecksum: "27a346c74d8755516a4ad2057ea29c2450454f1a928628734f26e12b0b8120d7",
    packerTemplate: "almalinux.pkr.hcl",
    preparationScript: "almalinux-prepare.sh",
    validationScript: "almalinux-validate.ts",
  },
  rockylinux: {
    name: "rockylinux",
    version: "9",
    isoUrl: "https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9-latest-x86_64-minimal.iso",
    isoChecksum: "aed9449cf79eb2d1c365f4f2561f923a80451b3e8fdbf595889b4cf0ac6c58b8",
    packerTemplate: "rockylinux.pkr.hcl",
    preparationScript: "rockylinux-prepare.sh",
    validationScript: "rockylinux-validate.ts",
  },
  centos: {
    name: "centos",
    version: "9-stream",
    isoUrl: "https://mirrors.centos.org/mirrorlist?path=/9-stream/BaseOS/x86_64/iso/CentOS-Stream-9-latest-x86_64-boot.iso&redirect=1&protocol=https",
    isoChecksum: "c87a2d81d67bbaeaf646aea5bedd70990078ec252f634796b5b87b721ccd9bdf",
    packerTemplate: "centos.pkr.hcl",
    preparationScript: "centos-prepare.sh",
    validationScript: "centos-validate.ts",
  },
  suse: {
    name: "suse",
    version: "15.5",
    isoUrl: "https://download.opensuse.org/distribution/leap/15.5/iso/openSUSE-Leap-15.5-DVD-x86_64-Media.iso",
    isoChecksum: "b3b2e3f7e8d9c6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1",
    packerTemplate: "suse.pkr.hcl",
    preparationScript: "suse-prepare.sh",
    validationScript: "suse-validate.ts",
  },
  redhat: {
    name: "redhat",
    version: "9.3",
    isoUrl: "https://access.redhat.com/downloads/content/479/ver=/rhel---9/9.3/x86_64/product-software",
    isoChecksum: "9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d",
    packerTemplate: "redhat.pkr.hcl",
    preparationScript: "redhat-prepare.sh",
    validationScript: "redhat-validate.ts",
  },
  fedora: {
    name: "fedora",
    version: "41",
    isoUrl: "https://download.fedoraproject.org/pub/fedora/linux/releases/41/Server/x86_64/iso/Fedora-Server-dvd-x86_64-41-1.4.iso",
    isoChecksum: "placeholder-checksum-will-be-logged-during-build",
    packerTemplate: "fedora.pkr.hcl",
    preparationScript: "fedora-prepare.sh",
    validationScript: "fedora-validate.ts",
  },
};

async function main(): Promise<void> {
  const osName = Deno.args[0];
  
  if (!osName) {
    console.error("Usage: deno run build.ts <os-name>");
    console.error("Available OS: ubuntu, almalinux, rockylinux, centos, suse, redhat, fedora");
    Deno.exit(1);
  }

  const osConfig = osConfigs[osName];
  if (!osConfig) {
    console.error(`❌ Unknown OS: ${osName}`);
    console.error("Available OS: ubuntu, almalinux, rockylinux, centos, suse, redhat, fedora");
    Deno.exit(1);
  }

  const buildOptions: CloudBuildOptions = {
    outputDir: join(Deno.cwd(), "templates", osName, "output"),
    format: (Deno.env.get("PACKER_FORMAT") as "qcow2" | "vhd" | "ova") || "qcow2",
    skipValidation: Deno.env.get("SKIP_VALIDATION") === "true",
    cleanup: Deno.env.get("CLEANUP") !== "false",
    isCloudBuild: !!(Deno.env.get("GITHUB_ACTIONS") || Deno.env.get("CI")),
  };

  // Use cloud builder for CI/CD environments, local builder otherwise
  const builder = buildOptions.isCloudBuild 
    ? new CloudTemplateBuilder(osConfig, buildOptions)
    : new BaseTemplateBuilder(osConfig, buildOptions as BuildOptions);
  
  try {
    await builder.build();
    console.log(`🎉 Successfully built ${osName} template`);
  } catch (error) {
    console.error(`💥 Build failed for ${osName}:`, error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}