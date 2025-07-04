#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-run

import { join } from "@std/path";
import { existsSync } from "@std/fs";
import { $ } from "dax";

export interface OSConfig {
  name: string;
  version: string;
  isoUrl: string;
  isoChecksum: string;
  packerTemplate: string;
  preparationScript: string;
  validationScript: string;
}

export interface BuildOptions {
  outputDir: string;
  format: "qcow2" | "vhd" | "ova";
  skipValidation?: boolean;
  cleanup?: boolean;
}

export class BaseTemplateBuilder {
  private osConfig: OSConfig;
  private buildOptions: BuildOptions;
  private workDir: string;

  constructor(osConfig: OSConfig, buildOptions: BuildOptions) {
    this.osConfig = osConfig;
    this.buildOptions = buildOptions;
    this.workDir = join(Deno.cwd(), "templates", osConfig.name);
  }

  async build(): Promise<void> {
    console.log(`🚀 Starting template build for ${this.osConfig.name}`);
    
    try {
      await this.validateEnvironment();
      await this.downloadISO();
      await this.runPackerBuild();
      
      if (!this.buildOptions.skipValidation) {
        await this.validateTemplate();
      }
      
      if (this.buildOptions.cleanup) {
        await this.cleanup();
      }
      
      console.log(`✅ Template build completed for ${this.osConfig.name}`);
    } catch (error) {
      console.error(`❌ Template build failed for ${this.osConfig.name}:`, error);
      throw error;
    }
  }

  private async validateEnvironment(): Promise<void> {
    console.log("🔍 Validating build environment...");
    
    // Check if Packer is installed
    try {
      await $`packer version`;
    } catch {
      throw new Error("Packer is not installed or not in PATH");
    }

    // Check if QEMU is installed (for KVM builds)
    try {
      await $`qemu-system-x86_64 --version`;
    } catch {
      throw new Error("QEMU is not installed or not in PATH");
    }

    // Ensure work directory exists
    if (!existsSync(this.workDir)) {
      await Deno.mkdir(this.workDir, { recursive: true });
    }

    // Ensure output directory exists
    if (!existsSync(this.buildOptions.outputDir)) {
      await Deno.mkdir(this.buildOptions.outputDir, { recursive: true });
    }
  }

  private async downloadISO(): Promise<void> {
    const isoPath = join(this.workDir, `${this.osConfig.name}.iso`);
    
    if (existsSync(isoPath)) {
      console.log(`📦 ISO already exists: ${isoPath}`);
      return;
    }

    console.log(`📥 Downloading ISO for ${this.osConfig.name}...`);
    console.log(`   Source: ${this.osConfig.isoUrl}`);
    
    try {
      await $`curl -L -o ${isoPath} ${this.osConfig.isoUrl}`;
      
      // Verify checksum if provided
      if (this.osConfig.isoChecksum) {
        await this.verifyChecksum(isoPath, this.osConfig.isoChecksum);
      }
    } catch (error) {
      throw new Error(`Failed to download ISO: ${error}`);
    }
  }

  private async verifyChecksum(filePath: string, expectedChecksum: string): Promise<void> {
    console.log("🔐 Verifying ISO checksum...");
    
    try {
      const result = await $`sha256sum ${filePath}`.text();
      const actualChecksum = result.split(" ")[0];
      
      if (actualChecksum !== expectedChecksum) {
        throw new Error(`Checksum mismatch. Expected: ${expectedChecksum}, Got: ${actualChecksum}`);
      }
      
      console.log("✅ ISO checksum verified");
    } catch (error) {
      throw new Error(`Failed to verify checksum: ${error}`);
    }
  }

  private async runPackerBuild(): Promise<void> {
    console.log(`🏗️  Running Packer build for ${this.osConfig.name}...`);
    
    const packerFile = join(this.workDir, this.osConfig.packerTemplate);
    if (!existsSync(packerFile)) {
      throw new Error(`Packer template not found: ${packerFile}`);
    }

    const env = {
      ...Deno.env.toObject(),
      PACKER_OUTPUT_DIR: this.buildOptions.outputDir,
      PACKER_FORMAT: this.buildOptions.format,
    };

    try {
      await $`packer build ${packerFile}`.env(env);
    } catch (error) {
      throw new Error(`Packer build failed: ${error}`);
    }
  }

  private async validateTemplate(): Promise<void> {
    console.log(`🧪 Validating template for ${this.osConfig.name}...`);
    
    const validationScript = join(Deno.cwd(), "scripts", "validation", this.osConfig.validationScript);
    if (!existsSync(validationScript)) {
      console.log("⚠️  No validation script found, skipping validation");
      return;
    }

    try {
      await $`deno run --allow-all ${validationScript}`;
    } catch (error) {
      throw new Error(`Template validation failed: ${error}`);
    }
  }

  private async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up temporary files for ${this.osConfig.name}...`);
    
    const tempDirs = [
      join(this.workDir, "packer_cache"),
      join(this.workDir, "tmp"),
    ];

    for (const dir of tempDirs) {
      if (existsSync(dir)) {
        await Deno.remove(dir, { recursive: true });
      }
    }
  }

  async getStatus(): Promise<{
    name: string;
    status: "not_started" | "in_progress" | "completed" | "failed";
    lastBuild?: Date;
    outputPath?: string;
  }> {
    const outputPath = join(this.buildOptions.outputDir, `${this.osConfig.name}.${this.buildOptions.format}`);
    
    if (existsSync(outputPath)) {
      const stat = await Deno.stat(outputPath);
      return {
        name: this.osConfig.name,
        status: "completed",
        lastBuild: stat.mtime || undefined,
        outputPath,
      };
    }

    return {
      name: this.osConfig.name,
      status: "not_started",
    };
  }
}