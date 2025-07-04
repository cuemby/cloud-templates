#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-run

import { join } from "@std/path";
import { existsSync } from "@std/fs";

const supportedOS = ["ubuntu", "almalinux", "rockylinux", "centos", "suse", "redhat", "fedora"];

interface ValidationResult {
  os: string;
  success: boolean;
  error?: string;
  details?: string[];
}

async function validateTemplate(osName: string): Promise<ValidationResult> {
  console.log(`🧪 Validating ${osName} template...`);
  
  try {
    const validationScript = join(Deno.cwd(), "scripts", "validation", `${osName}-validate.ts`);
    
    if (!existsSync(validationScript)) {
      return {
        os: osName,
        success: false,
        error: `Validation script not found: ${validationScript}`,
      };
    }

    const process = new Deno.Command("deno", {
      args: ["run", "--allow-all", validationScript],
      stdout: "piped",
      stderr: "piped",
    });

    const { success, stdout, stderr } = await process.output();
    
    const output = new TextDecoder().decode(stdout);
    const errorOutput = new TextDecoder().decode(stderr);
    
    return {
      os: osName,
      success,
      error: success ? undefined : errorOutput,
      details: output.split("\n").filter(line => line.trim()),
    };
  } catch (error) {
    return {
      os: osName,
      success: false,
      error: `Validation failed: ${error}`,
    };
  }
}

async function main(): Promise<void> {
  const osFilter = Deno.args[0];
  
  let osList = supportedOS;
  if (osFilter && osFilter !== "all") {
    if (supportedOS.includes(osFilter)) {
      osList = [osFilter];
    } else {
      console.error(`❌ Unknown OS: ${osFilter}`);
      console.error("Available OS: all, ubuntu, almalinux, rockylinux, centos, suse, redhat, fedora");
      Deno.exit(1);
    }
  }

  console.log(`🧪 Validating ${osList.length} OS templates...`);
  
  const results: ValidationResult[] = [];
  
  for (const os of osList) {
    const result = await validateTemplate(os);
    results.push(result);
  }
  
  // Display results
  console.log("\n📊 Validation Summary:");
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`   Successful: ${successful.length}/${results.length}`);
  console.log(`   Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log("\n✅ Successful validations:");
    successful.forEach(r => {
      console.log(`   ${r.os}: PASSED`);
    });
  }
  
  if (failed.length > 0) {
    console.log("\n❌ Failed validations:");
    failed.forEach(r => {
      console.log(`   ${r.os}: ${r.error}`);
    });
  }
  
  // Save validation report
  const reportPath = join(Deno.cwd(), "validation-report.json");
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
    },
    results,
  };
  
  await Deno.writeTextFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Validation report saved to: ${reportPath}`);
  
  if (failed.length > 0) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}