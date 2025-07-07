#!/usr/bin/env -S deno run --allow-read --allow-write

import { walk } from "jsr:@std/fs";

async function fixHclFiles() {
  const hclDir = "./templates";
  
  for await (const entry of walk(hclDir, { 
    exts: [".hcl"],
    includeDirs: false 
  })) {
    console.log(`Fixing ${entry.path}...`);
    
    let content = await Deno.readTextFile(entry.path);
    
    // Fix variable references
    content = content.replace(/"var\.([^"]+)"/g, 'var.$1');
    content = content.replace(/"build_var\.([^"]+)"/g, 'build_${var.$1}');
    content = content.replace(/boot_command\s*=\s*"([^"]+)"/g, 'boot_command = ["$1"]');
    
    await Deno.writeTextFile(entry.path, content);
    console.log(`✓ Fixed ${entry.path}`);
  }
}

if (import.meta.main) {
  fixHclFiles();
}