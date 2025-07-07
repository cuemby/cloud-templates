#!/usr/bin/env -S deno run --allow-read --allow-run

import { walk } from "jsr:@std/fs";
import { basename } from "jsr:@std/path";

async function validateTemplate(templatePath: string): Promise<boolean> {
  const templateName = basename(templatePath);
  console.log(`Validating ${templateName}...`);
  
  try {
    const process = new Deno.Command('packer', {
      args: ['validate', templatePath],
      stdout: 'piped',
      stderr: 'piped'
    });
    
    const result = await process.output();
    
    if (result.success) {
      console.log(`✅ ${templateName} - Valid`);
      return true;
    } else {
      const error = new TextDecoder().decode(result.stderr);
      console.error(`❌ ${templateName} - Invalid:`);
      console.error(error);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${templateName} - Error: ${error}`);
    return false;
  }
}

async function main() {
  const templateDir = './templates';
  const results: { template: string; valid: boolean }[] = [];
  
  console.log('Validating Modern CloudStack Packer HCL templates...\n');
  
  try {
    for await (const entry of walk(templateDir, { 
      exts: ['.hcl'],
      includeDirs: false 
    })) {
      const templateName = basename(entry.path);
      const isValid = await validateTemplate(entry.path);
      results.push({ template: templateName, valid: isValid });
    }
    
    console.log('\n📊 Validation Summary:');
    console.log('='.repeat(50));
    
    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.length - validCount;
    
    console.log(`✅ Valid templates: ${validCount}`);
    console.log(`❌ Invalid templates: ${invalidCount}`);
    console.log(`📋 Total templates: ${results.length}`);
    
    if (invalidCount > 0) {
      console.log('\n❌ Invalid templates:');
      results.filter(r => !r.valid).forEach(r => {
        console.log(`  - ${r.template}`);
      });
      Deno.exit(1);
    }
    
    console.log('\n🎉 All modern templates are valid!');
    
  } catch (error) {
    console.error(`Error: ${error}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}