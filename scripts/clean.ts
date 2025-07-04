#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-run

import { join } from "@std/path";
import { existsSync } from "@std/fs";

const supportedOS = ["ubuntu", "almalinux", "rockylinux", "centos", "suse", "redhat", "fedora"];

async function cleanOS(osName: string, options: { iso?: boolean; output?: boolean; cache?: boolean }): Promise<void> {
  const templateDir = join(Deno.cwd(), "templates", osName);
  
  console.log(`🧹 Cleaning ${osName} template files...`);
  
  // Clean ISO files
  if (options.iso) {
    const isoPath = join(templateDir, `${osName}.iso`);
    if (existsSync(isoPath)) {
      await Deno.remove(isoPath);
      console.log(`   ✅ Removed ISO: ${isoPath}`);
    }
  }
  
  // Clean output files
  if (options.output) {
    const outputDir = join(templateDir, "output");
    if (existsSync(outputDir)) {
      await Deno.remove(outputDir, { recursive: true });
      console.log(`   ✅ Removed output directory: ${outputDir}`);
    }
  }
  
  // Clean cache files
  if (options.cache) {
    const cacheDirs = [
      join(templateDir, "packer_cache"),
      join(templateDir, "tmp"),
      join(templateDir, ".packer"),
    ];
    
    for (const cacheDir of cacheDirs) {
      if (existsSync(cacheDir)) {
        await Deno.remove(cacheDir, { recursive: true });
        console.log(`   ✅ Removed cache directory: ${cacheDir}`);
      }
    }
  }
}

async function main(): Promise<void> {
  const args = Deno.args;
  const osFilter = args[0];
  
  // Parse options
  const options = {
    iso: args.includes("--iso") || args.includes("--all"),
    output: args.includes("--output") || args.includes("--all"),
    cache: args.includes("--cache") || args.includes("--all") || (!args.includes("--iso") && !args.includes("--output")),
  };
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: deno run clean.ts [OS] [OPTIONS]");
    console.log("");
    console.log("Options:");
    console.log("  --iso     Clean downloaded ISO files");
    console.log("  --output  Clean built template output files");
    console.log("  --cache   Clean Packer cache files (default)");
    console.log("  --all     Clean all files");
    console.log("");
    console.log("Examples:");
    console.log("  deno run clean.ts ubuntu --cache");
    console.log("  deno run clean.ts all --all");
    console.log("  deno run clean.ts --output");
    return;
  }
  
  let osList = supportedOS;
  if (osFilter && osFilter !== "all") {
    if (supportedOS.includes(osFilter)) {
      osList = [osFilter];
    } else if (!osFilter.startsWith("--")) {
      console.error(`❌ Unknown OS: ${osFilter}`);
      console.error("Available OS: all, ubuntu, almalinux, rockylinux, centos, suse, redhat, fedora");
      Deno.exit(1);
    } else {
      // Filter is actually an option, include all OS
      osList = supportedOS;
    }
  }
  
  console.log(`🧹 Cleaning ${osList.length} OS templates...`);
  console.log(`   ISOs: ${options.iso ? "✅" : "⏭️"}`);
  console.log(`   Output: ${options.output ? "✅" : "⏭️"}`);
  console.log(`   Cache: ${options.cache ? "✅" : "⏭️"}`);
  
  for (const os of osList) {
    await cleanOS(os, options);
  }
  
  // Clean global files
  const globalCleanFiles = [
    join(Deno.cwd(), "build-report.json"),
    join(Deno.cwd(), "packer_cache"),
  ];
  
  for (const file of globalCleanFiles) {
    if (existsSync(file)) {
      await Deno.remove(file, { recursive: true });
      console.log(`✅ Removed global file: ${file}`);
    }
  }
  
  console.log("🎉 Cleanup completed!");
}

if (import.meta.main) {
  await main();
}