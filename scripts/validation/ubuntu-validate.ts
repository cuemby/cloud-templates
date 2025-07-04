#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-run

import { existsSync } from "@std/fs";
import { join } from "@std/path";

interface ValidationResult {
  test: string;
  passed: boolean;
  message: string;
}

class UbuntuTemplateValidator {
  private templatePath: string;
  private results: ValidationResult[] = [];

  constructor(templatePath: string) {
    this.templatePath = templatePath;
  }

  async validate(): Promise<boolean> {
    console.log("🧪 Validating Ubuntu CloudStack template...");
    
    await this.validateFileExists();
    await this.validateImageInfo();
    await this.validateSize();
    
    return this.generateReport();
  }

  private async validateFileExists(): Promise<void> {
    const exists = existsSync(this.templatePath);
    this.results.push({
      test: "Template file exists",
      passed: exists,
      message: exists ? `Template found at ${this.templatePath}` : `Template not found at ${this.templatePath}`,
    });
  }

  private async validateImageInfo(): Promise<void> {
    if (!existsSync(this.templatePath)) {
      this.results.push({
        test: "Image format validation",
        passed: false,
        message: "Cannot validate image format - file does not exist",
      });
      return;
    }

    try {
      const process = new Deno.Command("qemu-img", {
        args: ["info", this.templatePath],
        stdout: "piped",
        stderr: "piped",
      });

      const { success, stdout, stderr } = await process.output();
      
      if (!success) {
        this.results.push({
          test: "Image format validation",
          passed: false,
          message: `Failed to get image info: ${new TextDecoder().decode(stderr)}`,
        });
        return;
      }

      const output = new TextDecoder().decode(stdout);
      const isQcow2 = output.includes("file format: qcow2");
      
      this.results.push({
        test: "Image format validation",
        passed: isQcow2,
        message: isQcow2 ? "Image is in QCOW2 format" : "Image is not in QCOW2 format",
      });
    } catch (error) {
      this.results.push({
        test: "Image format validation",
        passed: false,
        message: `Error validating image format: ${error}`,
      });
    }
  }

  private async validateSize(): Promise<void> {
    if (!existsSync(this.templatePath)) {
      this.results.push({
        test: "Template size validation",
        passed: false,
        message: "Cannot validate size - file does not exist",
      });
      return;
    }

    try {
      const stat = await Deno.stat(this.templatePath);
      const sizeGB = stat.size / (1024 * 1024 * 1024);
      
      // Template should be reasonable size (not too small, not too large)
      const minSize = 0.5; // 500MB
      const maxSize = 10;   // 10GB
      
      const sizeOk = sizeGB >= minSize && sizeGB <= maxSize;
      
      this.results.push({
        test: "Template size validation",
        passed: sizeOk,
        message: `Template size: ${sizeGB.toFixed(2)}GB ${sizeOk ? "(within acceptable range)" : "(outside acceptable range)"}`,
      });
    } catch (error) {
      this.results.push({
        test: "Template size validation",
        passed: false,
        message: `Error validating template size: ${error}`,
      });
    }
  }

  private generateReport(): boolean {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log("\n📊 Validation Report:");
    console.log(`   Tests passed: ${passed}/${total}`);
    console.log("   Results:");
    
    this.results.forEach(result => {
      const status = result.passed ? "✅" : "❌";
      console.log(`   ${status} ${result.test}: ${result.message}`);
    });
    
    const allPassed = passed === total;
    console.log(`\n${allPassed ? "🎉" : "💥"} Validation ${allPassed ? "PASSED" : "FAILED"}`);
    
    return allPassed;
  }
}

async function main(): Promise<void> {
  const templatePath = Deno.args[0];
  
  if (!templatePath) {
    const defaultPath = join(Deno.cwd(), "templates", "ubuntu", "output", "ubuntu-22.04-cloudstack.qcow2");
    console.log(`No template path provided, using default: ${defaultPath}`);
    
    const validator = new UbuntuTemplateValidator(defaultPath);
    const success = await validator.validate();
    
    if (!success) {
      Deno.exit(1);
    }
    return;
  }

  const validator = new UbuntuTemplateValidator(templatePath);
  const success = await validator.validate();
  
  if (!success) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}