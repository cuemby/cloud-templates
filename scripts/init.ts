#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

import { existsSync } from "@std/fs";
import { join } from "@std/path";

async function main(): Promise<void> {
  console.log("🔧 Initializing CloudStack Templates project...");
  
  // Ensure all required directories exist
  const directories = [
    "templates/ubuntu/output",
    "templates/almalinux/output", 
    "templates/rockylinux/output",
    "templates/centos/output",
    "templates/suse/output",
    "templates/redhat/output",
    "templates/fedora/output",
    "scripts/builders",
    "scripts/preparation", 
    "scripts/validation",
    "configs/packer",
    "configs/cloudstack",
  ];

  for (const dir of directories) {
    const fullPath = join(Deno.cwd(), dir);
    if (!existsSync(fullPath)) {
      await Deno.mkdir(fullPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  }

  // Check dependencies
  console.log("\n🔍 Checking dependencies...");
  
  const dependencies = [
    { name: "Packer", command: "packer", version: "--version" },
    { name: "QEMU", command: "qemu-system-x86_64", version: "--version" },
    { name: "curl", command: "curl", version: "--version" },
  ];

  for (const dep of dependencies) {
    try {
      const process = new Deno.Command(dep.command, {
        args: [dep.version],
        stdout: "piped",
        stderr: "piped",
      });

      const { success } = await process.output();
      
      if (success) {
        console.log(`✅ ${dep.name} is installed`);
      } else {
        console.log(`❌ ${dep.name} is not installed or not in PATH`);
      }
    } catch {
      console.log(`❌ ${dep.name} is not installed or not in PATH`);
    }
  }

  console.log("\n🎉 Project initialization completed!");
  console.log("\nNext steps:");
  console.log("1. Install missing dependencies if any");
  console.log("2. Run 'deno task status' to check template status");
  console.log("3. Run 'deno task build ubuntu' to build your first template");
  console.log("4. Run 'deno task build:all' to build all templates");
}

if (import.meta.main) {
  await main();
}