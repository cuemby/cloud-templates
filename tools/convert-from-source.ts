#!/usr/bin/env -S deno run --allow-read --allow-write

import { walk } from "jsr:@std/fs";
import { join, basename, dirname } from "jsr:@std/path";

interface SourceConfig {
  source: {
    type: string;
    path: string;
    description: string;
  };
  mapping: Record<string, string>;
  conversion: {
    json_to_hcl: boolean;
    maintain_compatibility: boolean;
    preserve_functionality: boolean;
  };
}

interface PackerTemplate {
  variables: Record<string, string>;
  builders: Array<{
    type: string;
    [key: string]: any;
  }>;
  provisioners: Array<{
    type: string;
    [key: string]: any;
  }>;
  "post-processors": Array<Array<{
    type: string;
    [key: string]: any;
  }>>;
}

function convertJsonToHcl(template: PackerTemplate, templateName: string): string {
  const name = templateName.replace('.json', '');
  
  // Variables section
  let hcl = '';
  Object.entries(template.variables).forEach(([key, value]) => {
    hcl += `variable "${key}" {\n`;
    hcl += `  type    = string\n`;
    hcl += `  default = "${value}"\n`;
    hcl += `}\n\n`;
  });
  
  // Source section (builder)
  const builder = template.builders[0];
  const sourceName = name.replace(/[.-]/g, '-');
  hcl += `source "${builder.type}" "${sourceName}" {\n`;
  
  Object.entries(builder).forEach(([key, value]) => {
    if (key === 'type') return;
    
    if (typeof value === 'string') {
      // Convert template variables - reference files relative to source
      const convertedValue = value
        .replace(/\{\{user `([^`]+)`\}\}/g, 'var.$1')
        .replace(/\{\{\.HTTPIP\}\}/g, '{{ .HTTPIP }}')
        .replace(/\{\{\.HTTPPort\}\}/g, '{{ .HTTPPort }}')
        .replace(/\{\{\.Path\}\}/g, '{{ .Path }}')
        .replace(/^files\//, '../config/files/')  // Point to config/files
        .replace(/^scripts\//, '../scripts/');    // Point to scripts
      
      hcl += `  ${key.padEnd(20)} = "${convertedValue}"\n`;
    } else if (typeof value === 'number') {
      hcl += `  ${key.padEnd(20)} = ${value}\n`;
    } else if (typeof value === 'boolean') {
      hcl += `  ${key.padEnd(20)} = ${value}\n`;
    } else if (Array.isArray(value)) {
      hcl += `  ${key} = [\n`;
      value.forEach(item => {
        if (typeof item === 'string') {
          const convertedItem = item
            .replace(/\{\{user `([^`]+)`\}\}/g, 'var.$1')
            .replace(/\{\{\.HTTPIP\}\}/g, '{{ .HTTPIP }}')
            .replace(/\{\{\.HTTPPort\}\}/g, '{{ .HTTPPort }}');
          hcl += `    "${convertedItem}",\n`;
        } else {
          hcl += `    "${item}",\n`;
        }
      });
      hcl += `  ]\n`;
    }
  });
  
  hcl += `}\n\n`;
  
  // Build section
  hcl += `build {\n`;
  hcl += `  sources = ["source.${builder.type}.${sourceName}"]\n\n`;
  
  // Provisioners
  template.provisioners.forEach(provisioner => {
    hcl += `  provisioner "${provisioner.type}" {\n`;
    Object.entries(provisioner).forEach(([key, value]) => {
      if (key === 'type') return;
      
      if (typeof value === 'string') {
        let convertedValue = value.replace(/\{\{\.Path\}\}/g, '{{ .Path }}');
        // Update file paths to reference source
        convertedValue = convertedValue
          .replace(/^files\//, '../config/files/')
          .replace(/^scripts\//, '../scripts/');
        hcl += `    ${key.padEnd(15)} = "${convertedValue}"\n`;
      } else if (Array.isArray(value)) {
        hcl += `    ${key} = [\n`;
        value.forEach(item => {
          let convertedItem = item;
          if (typeof item === 'string') {
            convertedItem = item
              .replace(/^scripts\//, '../scripts/');
          }
          hcl += `      "${convertedItem}",\n`;
        });
        hcl += `    ]\n`;
      }
    });
    hcl += `  }\n\n`;
  });
  
  // Post-processors
  template["post-processors"][0].forEach(postProcessor => {
    hcl += `  post-processor "${postProcessor.type}" {\n`;
    Object.entries(postProcessor).forEach(([key, value]) => {
      if (key === 'type') return;
      
      if (typeof value === 'string') {
        const convertedValue = value
          .replace(/\{\{user `([^`]+)`\}\}/g, '${var.$1}')
          .replace(/\{\{split \(user `([^`]+)`\) "-" ([0-9]+)\}\}/g, 'split("-", var.$1)[$2]');
        hcl += `    ${key.padEnd(15)} = "${convertedValue}"\n`;
      } else if (Array.isArray(value)) {
        hcl += `    ${key} = [\n`;
        value.forEach(item => {
          const convertedItem = item.replace(/\{\{user `([^`]+)`\}\}/g, '${var.$1}');
          hcl += `      "${convertedItem}",\n`;
        });
        hcl += `    ]\n`;
      } else if (typeof value === 'object') {
        hcl += `    ${key} = {\n`;
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (typeof subValue === 'string') {
            const convertedSubValue = subValue
              .replace(/\{\{split \(user `([^`]+)`\) "-" ([0-9]+)\}\}/g, 'split("-", var.$1)[$2]')
              .replace(/\{\{user `([^`]+)`\}\}/g, 'var.$1');
            hcl += `      ${subKey.padEnd(13)} = ${convertedSubValue}\n`;
          }
        });
        hcl += `    }\n`;
      } else if (typeof value === 'boolean') {
        hcl += `    ${key.padEnd(15)} = ${value}\n`;
      }
    });
    hcl += `  }\n\n`;
  });
  
  hcl += `}\n`;
  
  return hcl;
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  try {
    await Deno.mkdir(dest, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) {
      throw e;
    }
  }

  for await (const entry of walk(src, { includeDirs: false })) {
    const relativePath = entry.path.substring(src.length + 1);
    const destPath = join(dest, relativePath);
    const destDir = dirname(destPath);
    
    try {
      await Deno.mkdir(destDir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.AlreadyExists)) {
        throw e;
      }
    }
    
    await Deno.copyFile(entry.path, destPath);
  }
}

async function main() {
  // Read source configuration
  const configPath = './config/source.json';
  const config: SourceConfig = JSON.parse(await Deno.readTextFile(configPath));
  
  const sourcePath = config.source.path;
  console.log(`Converting from source: ${sourcePath}`);
  
  // Copy and convert templates
  const sourceTemplatesDir = join(sourcePath, 'templates');
  const destTemplatesDir = './templates';
  
  console.log('Converting JSON templates to HCL...');
  
  try {
    await Deno.mkdir(destTemplatesDir, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) {
      throw e;
    }
  }
  
  // Process each JSON template
  for await (const entry of walk(sourceTemplatesDir, { 
    exts: [".json"],
    includeDirs: false 
  })) {
    const templateName = basename(entry.path);
    console.log(`Converting ${templateName}...`);
    
    try {
      const jsonContent = await Deno.readTextFile(entry.path);
      const template: PackerTemplate = JSON.parse(jsonContent);
      
      const hclContent = convertJsonToHcl(template, templateName);
      const outputPath = join(destTemplatesDir, templateName.replace('.json', '.pkr.hcl'));
      
      await Deno.writeTextFile(outputPath, hclContent);
      console.log(`✓ Created ${outputPath}`);
    } catch (error) {
      console.error(`✗ Error converting ${templateName}:`, error);
    }
  }
  
  // Copy scripts directory (create symlink to preserve references)
  const sourceScriptsDir = join(sourcePath, 'scripts');
  const destScriptsDir = './scripts';
  
  try {
    await Deno.remove(destScriptsDir, { recursive: true });
  } catch {
    // Ignore if doesn't exist
  }
  
  // Create symlink to scripts
  try {
    await Deno.symlink(join('..', sourcePath, 'scripts'), destScriptsDir);
    console.log(`✓ Created symlink to scripts: ${destScriptsDir} -> ${sourceScriptsDir}`);
  } catch (error) {
    console.log(`Note: Could not create symlink, copying scripts instead...`);
    await copyDirectory(sourceScriptsDir, destScriptsDir);
    console.log(`✓ Copied scripts to ${destScriptsDir}`);
  }
  
  // Copy files directory to config/files
  const sourceFilesDir = join(sourcePath, 'files');
  const destFilesDir = './config/files';
  
  try {
    await Deno.remove(destFilesDir, { recursive: true });
  } catch {
    // Ignore if doesn't exist
  }
  
  try {
    await Deno.symlink(join('..', '..', sourcePath, 'files'), destFilesDir);
    console.log(`✓ Created symlink to files: ${destFilesDir} -> ${sourceFilesDir}`);
  } catch (error) {
    console.log(`Note: Could not create symlink, copying files instead...`);
    await copyDirectory(sourceFilesDir, destFilesDir);
    console.log(`✓ Copied files to ${destFilesDir}`);
  }
  
  console.log('\n✅ Conversion complete!');
  console.log('Files updated:');
  console.log('- HCL templates in ./templates/');
  console.log('- Scripts referenced from source');
  console.log('- Configuration files in ./config/files/');
}

if (import.meta.main) {
  main();
}