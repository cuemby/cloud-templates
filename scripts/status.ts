#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

import { join } from "@std/path";
import { existsSync } from "@std/fs";

interface TemplateStatus {
  name: string;
  status: "not_started" | "in_progress" | "completed" | "failed";
  lastBuild?: Date;
  outputPath?: string;
  sizeBytes?: number;
}

const supportedOS = ["ubuntu", "almalinux", "rockylinux", "centos", "suse", "redhat", "fedora"];

async function getTemplateStatus(osName: string): Promise<TemplateStatus> {
  const templateDir = join(Deno.cwd(), "templates", osName);
  const outputDir = join(templateDir, "output");
  
  // Check for various output formats
  const formats = ["qcow2", "vhd", "ova"];
  
  for (const format of formats) {
    const outputPath = join(outputDir, `${osName}.${format}`);
    
    if (existsSync(outputPath)) {
      const stat = await Deno.stat(outputPath);
      return {
        name: osName,
        status: "completed",
        lastBuild: stat.mtime || undefined,
        outputPath,
        sizeBytes: stat.size,
      };
    }
  }
  
  // Check if build is in progress (ISO downloaded but no output)
  const isoPath = join(templateDir, `${osName}.iso`);
  if (existsSync(isoPath)) {
    return {
      name: osName,
      status: "in_progress",
    };
  }
  
  return {
    name: osName,
    status: "not_started",
  };
}

function formatBytes(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

async function main(): Promise<void> {
  const osFilter = Deno.args[0];
  let osList = supportedOS;
  
  if (osFilter && osFilter !== "all") {
    if (supportedOS.includes(osFilter)) {
      osList = [osFilter];
    } else {
      console.error(`❌ Unknown OS: ${osFilter}`);
      console.error("Available OS: all, ubuntu, almalinux, rockylinux, centos, suse, redhat, fedora");
      Deno.exit(1);
    }
  }
  
  console.log("📊 CloudStack Template Status");
  console.log("=" .repeat(50));
  
  const statuses: TemplateStatus[] = [];
  
  for (const os of osList) {
    const status = await getTemplateStatus(os);
    statuses.push(status);
  }
  
  // Display status table
  const maxNameLength = Math.max(...statuses.map(s => s.name.length));
  
  console.log(`${"OS".padEnd(maxNameLength)} | Status      | Last Build          | Size`);
  console.log("-".repeat(maxNameLength + 3) + "|" + "-".repeat(13) + "|" + "-".repeat(21) + "|" + "-".repeat(10));
  
  statuses.forEach(status => {
    const statusEmoji = {
      "not_started": "⚪",
      "in_progress": "🟡",
      "completed": "🟢",
      "failed": "🔴",
    }[status.status];
    
    const statusText = `${statusEmoji} ${status.status.replace("_", " ")}`;
    const lastBuild = status.lastBuild ? formatDate(status.lastBuild) : "Never";
    const size = status.sizeBytes ? formatBytes(status.sizeBytes) : "-";
    
    console.log(
      `${status.name.padEnd(maxNameLength)} | ${statusText.padEnd(11)} | ${lastBuild.padEnd(19)} | ${size}`
    );
  });
  
  // Summary statistics
  const summary = statuses.reduce((acc, status) => {
    acc[status.status]++;
    return acc;
  }, { not_started: 0, in_progress: 0, completed: 0, failed: 0 });
  
  console.log("\n📈 Summary:");
  console.log(`   Total templates: ${statuses.length}`);
  console.log(`   Completed: ${summary.completed}`);
  console.log(`   In progress: ${summary.in_progress}`);
  console.log(`   Not started: ${summary.not_started}`);
  console.log(`   Failed: ${summary.failed}`);
  
  const totalSize = statuses
    .filter(s => s.sizeBytes)
    .reduce((sum, s) => sum + (s.sizeBytes || 0), 0);
  
  if (totalSize > 0) {
    console.log(`   Total size: ${formatBytes(totalSize)}`);
  }
  
  // Check for recent build report
  const reportPath = join(Deno.cwd(), "build-report.json");
  if (existsSync(reportPath)) {
    const reportStat = await Deno.stat(reportPath);
    const reportAge = Date.now() - (reportStat.mtime?.getTime() || 0);
    
    if (reportAge < 24 * 60 * 60 * 1000) { // Less than 24 hours old
      console.log(`\n📄 Recent build report available (${formatDate(reportStat.mtime!)})`);
      console.log(`   Run: cat build-report.json | jq`);
    }
  }
}

if (import.meta.main) {
  await main();
}