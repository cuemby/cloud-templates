#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-run

import { CloudTemplateBuilder } from "./builders/cloud.ts";

async function testCloudBuild() {
  console.log("🧪 Testing cloud build environment...");
  
  // Simple test OS config (using minimal data)
  const testConfig = {
    name: "test",
    version: "1.0",
    isoUrl: "https://httpbin.org/status/200", // Just a test URL
    isoChecksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // Empty file hash
    packerTemplate: "test.pkr.hcl",
    preparationScript: "test-prepare.sh",
    validationScript: "test-validate.ts",
  };

  const buildOptions = {
    outputDir: "/tmp/test-output",
    format: "qcow2" as const,
    skipValidation: true,
    cleanup: true,
    isCloudBuild: true,
  };

  const builder = new CloudTemplateBuilder(testConfig, buildOptions);
  
  try {
    // Test environment detection
    const status = await builder.getStatus();
    console.log("Environment detection:", status);
    
    // Test cloud environment validation (will fail but should show what's missing)
    console.log("Testing cloud environment validation...");
    await builder.validateCloudEnvironment();
    
    console.log("✅ Cloud build environment test passed!");
  } catch (error) {
    console.error("❌ Cloud build environment test failed:", error);
    if (error instanceof Error && (error.message.includes("Packer") || error.message.includes("QEMU"))) {
      console.log("ℹ️  This is expected in local environment - tools missing for cloud builds");
    }
  }
}

if (import.meta.main) {
  await testCloudBuild();
}