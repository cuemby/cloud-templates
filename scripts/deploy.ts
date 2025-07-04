#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net --allow-run

import { join } from "@std/path";
import { existsSync } from "@std/fs";

interface CloudStackConfig {
  url: string;
  apiKey: string;
  secretKey: string;
  zoneId?: string;
  hypervisor?: string;
}

interface TemplateInfo {
  name: string;
  osType: string;
  displayText: string;
  format: string;
  hypervisor: string;
  url: string;
  filePath: string;
  checksum?: string;
}

class CloudStackDeployer {
  private config: CloudStackConfig;
  private httpServer?: Deno.HttpServer;
  private httpPort = 8080;

  constructor(config: CloudStackConfig) {
    this.config = config;
  }

  async deployTemplate(templateInfo: TemplateInfo): Promise<void> {
    console.log(`🚀 Deploying template: ${templateInfo.name}`);
    
    if (!existsSync(templateInfo.filePath)) {
      throw new Error(`Template file not found: ${templateInfo.filePath}`);
    }

    try {
      // Start HTTP server to serve the template file
      await this.startHttpServer(templateInfo.filePath);
      
      // Register template with CloudStack
      await this.registerTemplate(templateInfo);
      
      console.log(`✅ Template ${templateInfo.name} deployed successfully`);
    } finally {
      // Stop HTTP server
      await this.stopHttpServer();
    }
  }

  private async startHttpServer(filePath: string): Promise<void> {
    console.log(`📡 Starting HTTP server on port ${this.httpPort}...`);
    
    const handler = async (req: Request): Promise<Response> => {
      const url = new URL(req.url);
      
      if (url.pathname === "/template") {
        try {
          const file = await Deno.open(filePath, { read: true });
          const readableStream = file.readable;
          
          return new Response(readableStream, {
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Disposition": `attachment; filename="${templateInfo.name}"`,
            },
          });
        } catch (error) {
          return new Response(`Error serving file: ${error}`, { status: 500 });
        }
      }
      
      return new Response("Not Found", { status: 404 });
    };

    this.httpServer = Deno.serve({ port: this.httpPort }, handler);
    
    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async stopHttpServer(): Promise<void> {
    if (this.httpServer) {
      await this.httpServer.shutdown();
      console.log("🛑 HTTP server stopped");
    }
  }

  private async registerTemplate(templateInfo: TemplateInfo): Promise<void> {
    console.log(`📝 Registering template with CloudStack...`);
    
    const templateUrl = `http://localhost:${this.httpPort}/template`;
    
    const params = new URLSearchParams({
      command: "registerTemplate",
      name: templateInfo.name,
      displaytext: templateInfo.displayText,
      format: templateInfo.format,
      hypervisor: templateInfo.hypervisor,
      ostypeid: templateInfo.osType,
      url: templateUrl,
      ispublic: "true",
      isfeatured: "true",
      isextractable: "true",
    });

    if (this.config.zoneId) {
      params.append("zoneid", this.config.zoneId);
    }

    if (templateInfo.checksum) {
      params.append("checksum", templateInfo.checksum);
    }

    const signature = await this.signRequest(params);
    params.append("signature", signature);

    const url = `${this.config.url}?${params.toString()}`;
    
    console.log(`   API URL: ${this.config.url}`);
    console.log(`   Template: ${templateInfo.name}`);
    console.log(`   OS Type: ${templateInfo.osType}`);
    console.log(`   Format: ${templateInfo.format}`);
    console.log(`   Hypervisor: ${templateInfo.hypervisor}`);
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errorcode) {
        throw new Error(`CloudStack API error: ${result.errortext}`);
      }

      console.log(`   Template ID: ${result.registertemplate?.template[0]?.id}`);
      console.log(`   Status: ${result.registertemplate?.template[0]?.status}`);
      
    } catch (error) {
      throw new Error(`Failed to register template: ${error}`);
    }
  }

  private async signRequest(params: URLSearchParams): Promise<string> {
    // Sort parameters
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    // Create signature string
    const signatureString = sortedParams.toLowerCase();
    
    // Create HMAC-SHA1 signature
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.config.secretKey),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signatureString)
    );

    // Convert to base64
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    return base64Signature;
  }
}

function getTemplateInfo(osName: string): TemplateInfo {
  const templateMappings: Record<string, TemplateInfo> = {
    ubuntu: {
      name: "Ubuntu-22.04-CloudStack",
      osType: "184", // Ubuntu 22.04 LTS
      displayText: "Ubuntu 22.04 LTS CloudStack Template",
      format: "QCOW2",
      hypervisor: "KVM",
      url: "",
      filePath: join(Deno.cwd(), "templates", "ubuntu", "output", "ubuntu-22.04-cloudstack.qcow2"),
    },
    almalinux: {
      name: "AlmaLinux-9.3-CloudStack",
      osType: "279", // AlmaLinux 9
      displayText: "AlmaLinux 9.3 CloudStack Template",
      format: "QCOW2",
      hypervisor: "KVM",
      url: "",
      filePath: join(Deno.cwd(), "templates", "almalinux", "output", "almalinux-9.3-cloudstack.qcow2"),
    },
    rockylinux: {
      name: "RockyLinux-9.3-CloudStack",
      osType: "285", // Rocky Linux 9
      displayText: "Rocky Linux 9.3 CloudStack Template",
      format: "QCOW2",
      hypervisor: "KVM",
      url: "",
      filePath: join(Deno.cwd(), "templates", "rockylinux", "output", "rockylinux-9.3-cloudstack.qcow2"),
    },
    centos: {
      name: "CentOS-8-CloudStack",
      osType: "246", // CentOS 8
      displayText: "CentOS 8 Stream CloudStack Template",
      format: "QCOW2",
      hypervisor: "KVM",
      url: "",
      filePath: join(Deno.cwd(), "templates", "centos", "output", "centos-8-cloudstack.qcow2"),
    },
    suse: {
      name: "SUSE-15.5-CloudStack",
      osType: "267", // SUSE Linux Enterprise 15
      displayText: "SUSE Linux Enterprise 15.5 CloudStack Template",
      format: "QCOW2",
      hypervisor: "KVM",
      url: "",
      filePath: join(Deno.cwd(), "templates", "suse", "output", "suse-15.5-cloudstack.qcow2"),
    },
    redhat: {
      name: "RHEL-9.3-CloudStack",
      osType: "265", // Red Hat Enterprise Linux 9
      displayText: "Red Hat Enterprise Linux 9.3 CloudStack Template",
      format: "QCOW2",
      hypervisor: "KVM",
      url: "",
      filePath: join(Deno.cwd(), "templates", "redhat", "output", "redhat-9.3-cloudstack.qcow2"),
    },
    fedora: {
      name: "Fedora-39-CloudStack",
      osType: "283", // Fedora 39
      displayText: "Fedora 39 CloudStack Template",
      format: "QCOW2",
      hypervisor: "KVM",
      url: "",
      filePath: join(Deno.cwd(), "templates", "fedora", "output", "fedora-39-cloudstack.qcow2"),
    },
  };

  const templateInfo = templateMappings[osName];
  if (!templateInfo) {
    throw new Error(`Unknown OS: ${osName}`);
  }

  return templateInfo;
}

async function loadCloudStackConfig(): Promise<CloudStackConfig> {
  const configPath = join(Deno.cwd(), "configs", "cloudstack", "config.json");
  
  if (!existsSync(configPath)) {
    throw new Error(`CloudStack configuration file not found: ${configPath}`);
  }

  const configText = await Deno.readTextFile(configPath);
  const config = JSON.parse(configText);
  
  // Validate required fields
  if (!config.url || !config.apiKey || !config.secretKey) {
    throw new Error("CloudStack configuration must include url, apiKey, and secretKey");
  }

  return config;
}

async function main(): Promise<void> {
  const osName = Deno.args[0];
  
  if (!osName) {
    console.error("Usage: deno run deploy.ts <os-name>");
    console.error("Available OS: ubuntu, almalinux, rockylinux, centos, suse, redhat, fedora");
    Deno.exit(1);
  }

  try {
    const config = await loadCloudStackConfig();
    const templateInfo = getTemplateInfo(osName);
    
    const deployer = new CloudStackDeployer(config);
    await deployer.deployTemplate(templateInfo);
    
    console.log(`🎉 Successfully deployed ${osName} template to CloudStack`);
  } catch (error) {
    console.error(`💥 Deployment failed: ${error}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}