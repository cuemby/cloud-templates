#!/usr/bin/env -S deno run --allow-read --allow-net

/**
 * ISO URL and Checksum Validation Script
 * 
 * This script validates that ISO URLs and checksums in Packer templates are valid.
 * It checks URL accessibility and verifies checksums against official sources.
 */

import { walk } from "@std/fs";
import { parse as parseHCL } from "npm:@cdktf/hcl2json";

interface ValidationResult {
  template: string;
  url: string;
  checksum: string;
  urlValid: boolean;
  checksumValid: boolean;
  error?: string;
}

async function validateURL(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    console.error(`Error validating URL ${url}:`, error);
    return false;
  }
}

async function getOfficialChecksum(url: string): Promise<string | null> {
  try {
    // Extract the filename from the URL
    const filename = url.split("/").pop();
    if (!filename) return null;

    // Try to get checksum from official sources
    if (url.includes("releases.ubuntu.com")) {
      const basePath = url.substring(0, url.lastIndexOf("/"));
      const checksumUrl = `${basePath}/SHA256SUMS`;
      const response = await fetch(checksumUrl);
      if (response.ok) {
        const checksumData = await response.text();
        const match = checksumData.match(new RegExp(`([a-f0-9]{64})\\s+\\*?${filename}`));
        return match ? match[1] : null;
      }
    }
    
    // Add more sources as needed for other distributions
    return null;
  } catch (error) {
    console.error(`Error getting checksum:`, error);
    return null;
  }
}

async function validateTemplate(templatePath: string): Promise<ValidationResult> {
  const templateName = templatePath.split("/").pop()?.replace(".pkr.hcl", "") || "unknown";
  
  try {
    const content = await Deno.readTextFile(templatePath);
    
    // Extract URL and checksum from HCL content
    // Look for variable definitions first
    const urlVarMatch = content.match(/variable\s+"url"\s*\{[^}]*default\s*=\s*"([^"]+)"/s);
    const checksumVarMatch = content.match(/variable\s+"iso_checksum"\s*\{[^}]*default\s*=\s*"([^"]+)"/s);
    
    if (!urlVarMatch || !checksumVarMatch) {
      return {
        template: templateName,
        url: "",
        checksum: "",
        urlValid: false,
        checksumValid: false,
        error: "Could not extract URL or checksum from template variables"
      };
    }
    
    const url = urlVarMatch[1];
    const checksum = checksumVarMatch[1].replace("sha256:", "");
    
    console.log(`Validating ${templateName}...`);
    console.log(`  URL: ${url}`);
    console.log(`  Checksum: ${checksum}`);
    
    // Validate URL
    const urlValid = await validateURL(url);
    console.log(`  URL valid: ${urlValid}`);
    
    // Validate checksum
    const officialChecksum = await getOfficialChecksum(url);
    const checksumValid = officialChecksum ? officialChecksum === checksum : false;
    
    if (officialChecksum) {
      console.log(`  Official checksum: ${officialChecksum}`);
      console.log(`  Checksum valid: ${checksumValid}`);
    } else {
      console.log(`  Could not retrieve official checksum for validation`);
    }
    
    return {
      template: templateName,
      url,
      checksum,
      urlValid,
      checksumValid,
      error: undefined
    };
    
  } catch (error) {
    return {
      template: templateName,
      url: "",
      checksum: "",
      urlValid: false,
      checksumValid: false,
      error: `Error reading template: ${error.message}`
    };
  }
}

async function main() {
  const templateDir = "templates";
  const results: ValidationResult[] = [];
  
  console.log("🔍 Validating ISO URLs and checksums in Packer templates...\n");
  
  // Find all .pkr.hcl files
  for await (const entry of walk(templateDir, { exts: ["hcl"] })) {
    if (entry.isFile && entry.path.endsWith(".pkr.hcl")) {
      const result = await validateTemplate(entry.path);
      results.push(result);
      console.log("");
    }
  }
  
  // Summary
  console.log("📊 Validation Summary:");
  console.log("=" .repeat(50));
  
  const validUrls = results.filter(r => r.urlValid).length;
  const invalidUrls = results.filter(r => !r.urlValid).length;
  const validChecksums = results.filter(r => r.checksumValid).length;
  const invalidChecksums = results.filter(r => !r.checksumValid).length;
  
  console.log(`URLs: ${validUrls} valid, ${invalidUrls} invalid`);
  console.log(`Checksums: ${validChecksums} valid, ${invalidChecksums} invalid`);
  
  if (invalidUrls > 0) {
    console.log("\n❌ Templates with invalid URLs:");
    results.filter(r => !r.urlValid).forEach(r => {
      console.log(`  - ${r.template}: ${r.url}`);
      if (r.error) console.log(`    Error: ${r.error}`);
    });
  }
  
  if (invalidChecksums > 0) {
    console.log("\n⚠️  Templates with invalid checksums:");
    results.filter(r => !r.checksumValid).forEach(r => {
      console.log(`  - ${r.template}: ${r.checksum}`);
    });
  }
  
  if (invalidUrls === 0 && invalidChecksums === 0) {
    console.log("\n✅ All templates have valid URLs and checksums!");
  }
  
  // Exit with error if any issues found
  if (invalidUrls > 0 || invalidChecksums > 0) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}