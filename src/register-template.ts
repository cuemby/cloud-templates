#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

import { parseArgs } from "jsr:@std/cli/parse-args";
import { crypto } from "jsr:@std/crypto";
import { encodeBase64 } from "jsr:@std/encoding/base64";

interface CloudStackProfile {
  name: string;
  endpoint: string;
  key: string;
  secret: string;
}

interface TemplateManifest {
  builds: Array<{
    custom_data: {
      oscategory: string;
      osversion: string;
      template_slug: string;
    };
  }>;
}

interface CloudStackApiResponse {
  [key: string]: any;
}

class CloudStackClient {
  private endpoint: string;
  private apiKey: string;
  private secretKey: string;

  constructor(profile: CloudStackProfile) {
    this.endpoint = profile.endpoint;
    this.apiKey = profile.key;
    this.secretKey = profile.secret;
  }

  private async sign(params: Record<string, string>): Promise<string> {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const queryString = sortedParams.toLowerCase();
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.secretKey);
    const msgData = encoder.encode(queryString);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    return encodeBase64(signature);
  }

  async request(command: string, params: Record<string, string> = {}): Promise<CloudStackApiResponse> {
    const allParams = {
      apikey: this.apiKey,
      command,
      response: 'json',
      ...params
    };

    const signature = await this.sign(allParams);
    const queryString = Object.keys(allParams)
      .sort()
      .map(key => `${key}=${encodeURIComponent(allParams[key])}`)
      .join('&');

    const url = `${this.endpoint}?${queryString}&signature=${encodeURIComponent(signature)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async listOsTypes(description: string): Promise<string> {
    const response = await this.request('listOsTypes', { description });
    if (!response.listostypesresponse?.ostype?.length) {
      throw new Error(`OS type not found: ${description}`);
    }
    return response.listostypesresponse.ostype[0].id;
  }

  async registerTemplate(params: {
    name: string;
    displayText: string;
    url: string;
    ostypeId: string;
    format: string;
    hypervisor: string;
    zoneIds: string;
    isPublic: boolean;
    isFeatured: boolean;
    isExtractable: boolean;
    isDynamicallyScalable: boolean;
    passwordEnabled: boolean;
  }): Promise<string> {
    const response = await this.request('registerTemplate', {
      name: params.name,
      displaytext: params.displayText,
      url: params.url,
      ostypeid: params.ostypeId,
      format: params.format,
      hypervisor: params.hypervisor,
      zoneids: params.zoneIds,
      ispublic: params.isPublic.toString(),
      isfeatured: params.isFeatured.toString(),
      isextractable: params.isExtractable.toString(),
      isdynamicallyscalable: params.isDynamicallyScalable.toString(),
      passwordenabled: params.passwordEnabled.toString()
    });

    if (!response.registertemplateresponse?.template?.length) {
      throw new Error('Template registration failed');
    }

    return response.registertemplateresponse.template[0].id;
  }

  async createTags(resourceId: string, resourceType: string, tags: Record<string, string>): Promise<void> {
    const tagParams = Object.entries(tags).map(([key, value], index) => ({
      [`tags[${index}].key`]: key,
      [`tags[${index}].value`]: value
    }));

    const allTagParams = tagParams.reduce((acc, tag) => ({ ...acc, ...tag }), {});

    await this.request('createTags', {
      resourceids: resourceId,
      resourcetype: resourceType,
      ...allTagParams
    });
  }
}

function getCloudStackProfiles(): CloudStackProfile[] {
  const profilesBase64 = Deno.env.get('CLOUDSTACK_PROFILES');
  if (!profilesBase64) {
    throw new Error('CLOUDSTACK_PROFILES environment variable not set');
  }

  try {
    const profilesJson = atob(profilesBase64);
    return JSON.parse(profilesJson);
  } catch (error) {
    throw new Error(`Failed to parse CLOUDSTACK_PROFILES: ${error}`);
  }
}

async function readManifest(manifestPath: string): Promise<TemplateManifest> {
  try {
    const manifestContent = await Deno.readTextFile(manifestPath);
    return JSON.parse(manifestContent);
  } catch (error) {
    throw new Error(`Failed to read manifest file: ${error}`);
  }
}

async function registerTemplate(
  profile: CloudStackProfile,
  templateName: string,
  templateUrl: string,
  manifest: TemplateManifest
): Promise<void> {
  const client = new CloudStackClient(profile);
  
  console.log(`Registering template "${templateName}" to profile "${profile.name}"`);

  try {
    // Get OS type ID
    const ostypeId = await client.listOsTypes("Other PV Virtio-SCSI (64-bit)");
    console.log(`Found OS type ID: ${ostypeId}`);

    // Register template
    const templateId = await client.registerTemplate({
      name: templateName,
      displayText: templateName,
      url: templateUrl,
      ostypeId,
      format: "qcow2",
      hypervisor: "kvm",
      zoneIds: "-1",
      isPublic: true,
      isFeatured: true,
      isExtractable: true,
      isDynamicallyScalable: true,
      passwordEnabled: true
    });

    console.log(`Template registered with ID: ${templateId}`);

    // Add tags from manifest
    if (manifest.builds && manifest.builds.length > 0) {
      const customData = manifest.builds[0].custom_data;
      const tags = {
        oscategory: customData.oscategory,
        osversion: customData.osversion,
        template_slug: customData.template_slug
      };

      await client.createTags(templateId, "Template", tags);
      console.log(`Tags applied: ${JSON.stringify(tags)}`);
    }

    console.log(`✅ Successfully registered template "${templateName}" to "${profile.name}"`);
  } catch (error) {
    console.error(`❌ Failed to register template "${templateName}" to "${profile.name}": ${error}`);
    throw error;
  }
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ['name', 'url', 'manifest', 'profile'],
    boolean: ['help'],
    alias: {
      h: 'help',
      n: 'name',
      u: 'url',
      m: 'manifest',
      p: 'profile'
    }
  });

  if (args.help) {
    console.log(`
CloudStack Template Registration Tool - Modern Edition

Usage: register-template.ts [OPTIONS]

Options:
  -n, --name <name>         Template name
  -u, --url <url>           Template download URL
  -m, --manifest <path>     Path to manifest file
  -p, --profile <profile>   Specific profile to use (optional)
  -h, --help               Show this help message

Environment Variables:
  CLOUDSTACK_PROFILES      Base64 encoded JSON array of CloudStack profiles

Example:
  deno task register --name ubuntu-22.04 --url https://github.com/owner/repo/releases/download/v1/ubuntu-22.04.tar.gz --manifest build_ubuntu-22.04/ubuntu-22.04.json
`);
    return;
  }

  if (!args.name || !args.url || !args.manifest) {
    console.error('Error: --name, --url, and --manifest are required');
    Deno.exit(1);
  }

  try {
    const profiles = getCloudStackProfiles();
    const manifest = await readManifest(args.manifest);

    const targetProfiles = args.profile 
      ? profiles.filter(p => p.name === args.profile)
      : profiles;

    if (targetProfiles.length === 0) {
      throw new Error(`Profile "${args.profile}" not found`);
    }

    console.log(`Found ${targetProfiles.length} profile(s) to deploy to`);

    const results = await Promise.allSettled(
      targetProfiles.map(profile => 
        registerTemplate(profile, args.name, args.url, manifest)
      )
    );

    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.error(`\n❌ ${failures.length} registration(s) failed`);
      failures.forEach((failure, index) => {
        console.error(`Profile ${targetProfiles[index].name}: ${failure.reason}`);
      });
      Deno.exit(1);
    }

    console.log(`\n✅ Successfully registered template to all ${targetProfiles.length} profile(s)`);
  } catch (error) {
    console.error(`Error: ${error}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}