#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-run

import { join } from "@std/path";
import { $ } from "dax";

const supportedOS = ["ubuntu", "almalinux", "rockylinux", "centos", "suse", "redhat", "fedora"];

interface BuildResult {
  os: string;
  success: boolean;
  error?: string;
  duration: number;
}

async function buildOS(osName: string): Promise<BuildResult> {
  const startTime = Date.now();
  
  console.log(`🚀 Starting build for ${osName}...`);
  
  try {
    await $`deno run --allow-all scripts/build.ts ${osName}`;
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${osName} build completed in ${Math.round(duration / 1000)}s`);
    
    return {
      os: osName,
      success: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${osName} build failed after ${Math.round(duration / 1000)}s:`, error);
    
    return {
      os: osName,
      success: false,
      error: error.toString(),
      duration,
    };
  }
}

async function main(): Promise<void> {
  const osFilter = Deno.args[0];
  const maxConcurrency = parseInt(Deno.env.get("MAX_CONCURRENCY") || "3");
  
  let osList = supportedOS;
  if (osFilter) {
    if (osFilter === "all") {
      osList = supportedOS;
    } else if (supportedOS.includes(osFilter)) {
      osList = [osFilter];
    } else {
      console.error(`❌ Unknown OS: ${osFilter}`);
      console.error("Available OS: all, ubuntu, almalinux, rockylinux, centos, suse, redhat, fedora");
      Deno.exit(1);
    }
  }

  console.log(`🏗️  Building ${osList.length} OS templates with max concurrency of ${maxConcurrency}`);
  console.log(`   OS List: ${osList.join(", ")}`);
  
  const startTime = Date.now();
  const results: BuildResult[] = [];
  
  // Build in batches to respect concurrency limits
  for (let i = 0; i < osList.length; i += maxConcurrency) {
    const batch = osList.slice(i, i + maxConcurrency);
    console.log(`📦 Building batch: ${batch.join(", ")}`);
    
    const batchPromises = batch.map(os => buildOS(os));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log("\n📊 Build Summary:");
  console.log(`   Total time: ${Math.round(totalDuration / 1000)}s`);
  console.log(`   Successful: ${successful.length}/${results.length}`);
  console.log(`   Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log("\n✅ Successful builds:");
    successful.forEach(r => {
      console.log(`   ${r.os}: ${Math.round(r.duration / 1000)}s`);
    });
  }
  
  if (failed.length > 0) {
    console.log("\n❌ Failed builds:");
    failed.forEach(r => {
      console.log(`   ${r.os}: ${r.error}`);
    });
  }
  
  // Save build report
  const reportPath = join(Deno.cwd(), "build-report.json");
  const report = {
    timestamp: new Date().toISOString(),
    totalDuration,
    results,
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
    },
  };
  
  await Deno.writeTextFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Build report saved to: ${reportPath}`);
  
  if (failed.length > 0) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}