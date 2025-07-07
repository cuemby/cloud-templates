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

export interface CloudBuildOptions {
  outputDir: string;
  format: "qcow2" | "vhd" | "ova";
  skipValidation?: boolean;
  cleanup?: boolean;
  isCloudBuild?: boolean;
}

/**
 * Cloud-native template builder optimized for GitHub Actions
 * Handles x86 virtualization requirements and cloud-specific constraints
 */
export class CloudTemplateBuilder {
  private osConfig: OSConfig;
  private buildOptions: CloudBuildOptions;
  private workDir: string;
  private isCloudEnvironment: boolean;

  constructor(osConfig: OSConfig, buildOptions: CloudBuildOptions) {
    this.osConfig = osConfig;
    this.buildOptions = buildOptions;
    this.workDir = join(Deno.cwd(), "templates", osConfig.name);
    this.isCloudEnvironment = buildOptions.isCloudBuild || this.detectCloudEnvironment();
  }

  private detectCloudEnvironment(): boolean {
    return !!(
      Deno.env.get("GITHUB_ACTIONS") ||
      Deno.env.get("CI") ||
      Deno.env.get("GITLAB_CI") ||
      Deno.env.get("JENKINS_URL")
    );
  }

  async build(): Promise<void> {
    console.log(`🚀 Starting cloud template build for ${this.osConfig.name}`);
    
    if (this.isCloudEnvironment) {
      console.log("🌐 Running in cloud environment");
    }
    
    try {
      await this.validateCloudEnvironment();
      await this.downloadISOWithRetry();
      await this.runPackerBuild();
      
      if (!this.buildOptions.skipValidation) {
        await this.validateTemplate();
      }
      
      if (this.buildOptions.cleanup) {
        await this.cleanup();
      }
      
      console.log(`✅ Cloud template build completed for ${this.osConfig.name}`);
    } catch (error) {
      console.error(`❌ Cloud template build failed for ${this.osConfig.name}:`, error);
      throw error;
    }
  }

  async validateCloudEnvironment(): Promise<void> {
    console.log("🔍 Validating cloud build environment...");
    
    // Check if Packer is installed
    try {
      const packerVersion = await $`packer version`.text();
      console.log(`📦 Packer version: ${packerVersion.trim()}`);
    } catch {
      throw new Error("Packer is not installed or not in PATH");
    }

    // Check if QEMU is available
    try {
      const qemuVersion = await $`qemu-system-x86_64 --version`.text();
      console.log(`🖥️  QEMU version: ${qemuVersion.split('\n')[0]}`);
    } catch {
      throw new Error("QEMU is not installed or not in PATH");
    }

    // Check KVM availability in cloud environment
    if (this.isCloudEnvironment) {
      try {
        const kvmStatus = await $`ls -la /dev/kvm`.text();
        console.log(`🏃 KVM device: ${kvmStatus.trim()}`);
      } catch {
        console.log("⚠️  KVM not available, builds will use software emulation (slower)");
      }
    }

    // Ensure directories exist
    await this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    const directories = [
      this.workDir,
      this.buildOptions.outputDir,
      join(this.workDir, "output"),
      join(this.workDir, "http"),
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        await Deno.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  private async downloadISOWithRetry(): Promise<void> {
    const isoPath = join(this.workDir, `${this.osConfig.name}.iso`);
    
    if (existsSync(isoPath)) {
      console.log(`📦 ISO already exists: ${isoPath}`);
      await this.verifyExistingISO(isoPath);
      return;
    }

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 Downloading ISO for ${this.osConfig.name} (attempt ${attempt}/${maxRetries})...`);
        console.log(`   Source: ${this.osConfig.isoUrl}`);
        
        // Use curl with retry and timeout options for cloud environments
        await $`curl -L -o ${isoPath} --retry 3 --retry-delay 5 --connect-timeout 60 --max-time 3600 ${this.osConfig.isoUrl}`;
        
        // Verify checksum if provided
        if (this.osConfig.isoChecksum) {
          await this.verifyChecksum(isoPath, this.osConfig.isoChecksum);
        }
        
        console.log(`✅ ISO downloaded successfully`);
        return;
      } catch (error) {
        console.error(`❌ Download attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to download ISO after ${maxRetries} attempts: ${error}`);
        }
        
        // Clean up partial download
        if (existsSync(isoPath)) {
          await Deno.remove(isoPath);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  private async verifyExistingISO(isoPath: string): Promise<void> {
    if (this.osConfig.isoChecksum) {
      console.log("🔐 Verifying existing ISO checksum...");
      try {
        await this.verifyChecksum(isoPath, this.osConfig.isoChecksum);
      } catch (error) {
        console.warn("⚠️  Existing ISO checksum verification failed, re-downloading...");
        await Deno.remove(isoPath);
        await this.downloadISOWithRetry();
      }
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
      PACKER_LOG: "1",
      PACKER_LOG_PATH: join(this.workDir, "packer.log"),
      // Cloud-specific environment variables
      HEADLESS: "true",
      DISPLAY: ":99",
    };

    // Start virtual display for cloud environments
    if (this.isCloudEnvironment) {
      try {
        await $`Xvfb :99 -screen 0 1024x768x24 &`.spawn();
        console.log("🖥️  Started virtual display for headless build");
      } catch (error) {
        console.warn("⚠️  Could not start virtual display:", error);
      }
    }

    try {
      // Run Packer with cloud-optimized settings
      await $`packer build -force -timestamp-ui ${packerFile}`.env(env);
      console.log("✅ Packer build completed successfully");
    } catch (error) {
      // Output packer logs for debugging
      const logPath = join(this.workDir, "packer.log");
      if (existsSync(logPath)) {
        console.error("📋 Packer build logs:");
        const logs = await Deno.readTextFile(logPath);
        console.error(logs.split('\n').slice(-50).join('\n')); // Last 50 lines
      }
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
      console.log("✅ Template validation passed");
    } catch (error) {
      throw new Error(`Template validation failed: ${error}`);
    }
  }

  private async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up temporary files for ${this.osConfig.name}...`);
    
    const tempPaths = [
      join(this.workDir, "packer_cache"),
      join(this.workDir, "tmp"),
      join(this.workDir, "packer.log"),
    ];

    for (const path of tempPaths) {
      if (existsSync(path)) {
        await Deno.remove(path, { recursive: true });
      }
    }
  }

  async getStatus(): Promise<{
    name: string;
    status: "not_started" | "in_progress" | "completed" | "failed";
    lastBuild?: Date;
    outputPath?: string;
    environment: string;
  }> {
    const outputPath = join(this.buildOptions.outputDir, `${this.osConfig.name}.${this.buildOptions.format}`);
    
    if (existsSync(outputPath)) {
      const stat = await Deno.stat(outputPath);
      return {
        name: this.osConfig.name,
        status: "completed",
        lastBuild: stat.mtime || undefined,
        outputPath,
        environment: this.isCloudEnvironment ? "cloud" : "local",
      };
    }

    return {
      name: this.osConfig.name,
      status: "not_started",
      environment: this.isCloudEnvironment ? "cloud" : "local",
    };
  }
}