#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Fix relative paths in Packer HCL templates
 * Converts ../config/ and ../scripts/ paths to config/ and scripts/
 */

import { walk } from "jsr:@std/fs@^1.0.17";

async function fixTemplatePaths() {
  console.log("🔧 Fixing relative paths in all Packer templates...");
  
  let filesFixed = 0;
  
  for await (const entry of walk("templates", { exts: [".hcl"] })) {
    if (entry.isFile) {
      const content = await Deno.readTextFile(entry.path);
      
      // Fix all ../config/ and ../scripts/ paths
      const fixedContent = content
        .replace(/\.\.\//g, "")  // Remove all ../ references
      
      // Only write if content changed
      if (content !== fixedContent) {
        await Deno.writeTextFile(entry.path, fixedContent);
        console.log(`✅ Fixed paths in ${entry.path}`);
        filesFixed++;
      }
    }
  }
  
  console.log(`\n🎉 Fixed ${filesFixed} template files`);
  console.log("All templates should now validate correctly from project root");
}

if (import.meta.main) {
  try {
    await fixTemplatePaths();
  } catch (error) {
    console.error("❌ Error:", error.message);
    Deno.exit(1);
  }
}