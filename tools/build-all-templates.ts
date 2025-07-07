#!/usr/bin/env -S deno run --allow-read --allow-run

import { walk } from "jsr:@std/fs";
import { basename } from "jsr:@std/path";

async function buildTemplate(templatePath: string): Promise<boolean> {
  const templateName = basename(templatePath, '.pkr.hcl');
  console.log(`Building ${templateName}...`);
  
  try {
    const process = new Deno.Command('packer', {
      args: ['build', '-var', `name=${templateName}`, templatePath],
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...Deno.env.toObject(),
        PACKER_LOG: '1'
      }
    });
    
    const result = await process.output();
    
    if (result.success) {
      console.log(`✅ ${templateName} - Built successfully`);
      return true;
    } else {
      console.error(`❌ ${templateName} - Build failed`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${templateName} - Error: ${error}`);
    return false;
  }
}

async function main() {
  const templateDir = './templates';
  const results: { template: string; success: boolean }[] = [];
  
  console.log('Building all Modern CloudStack Packer HCL templates...\n');
  
  try {
    for await (const entry of walk(templateDir, { 
      exts: ['.hcl'],
      includeDirs: false 
    })) {
      const templateName = basename(entry.path, '.pkr.hcl');
      const success = await buildTemplate(entry.path);
      results.push({ template: templateName, success });
      
      // Add a small delay between builds
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 Build Summary:');
    console.log('='.repeat(50));
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`✅ Successful builds: ${successCount}`);
    console.log(`❌ Failed builds: ${failureCount}`);
    console.log(`📋 Total templates: ${results.length}`);
    
    if (failureCount > 0) {
      console.log('\n❌ Failed builds:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.template}`);
      });
      Deno.exit(1);
    }
    
    console.log('\n🎉 All modern templates built successfully!');
    
  } catch (error) {
    console.error(`Error: ${error}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}