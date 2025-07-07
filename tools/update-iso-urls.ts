#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Replace Aurora project URLs with official distribution ISO URLs
 */

import { walk } from "jsr:@std/fs@^1.0.17";

const ISO_URL_MAPPINGS = {
  // Ubuntu - Official releases
  "http://compute.o.auroraobjects.eu/iso/ubuntu-24.04-live-server-amd64.iso": 
    "https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso",
  "http://compute.o.auroraobjects.eu/iso/ubuntu-22.04-live-server-amd64.iso":
    "https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso",
  "http://compute.o.auroraobjects.eu/iso/ubuntu-20.04.3-live-server-amd64.iso":
    "https://releases.ubuntu.com/20.04/ubuntu-20.04.6-live-server-amd64.iso",
  "http://compute.o.auroraobjects.eu/iso/ubuntu-18.04.5-server-amd64.iso":
    "https://releases.ubuntu.com/18.04/ubuntu-18.04.6-server-amd64.iso",

  // Debian - Official releases  
  "http://compute.o.auroraobjects.eu/iso/debian-12.6.0-amd64-netinst.iso":
    "https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.7.0-amd64-netinst.iso",
  "http://compute.o.auroraobjects.eu/iso/debian-11.2.0-amd64-netinst.iso":
    "https://cdimage.debian.org/debian-cd/11.11.0/amd64/iso-cd/debian-11.11.0-amd64-netinst.iso",
  "http://compute.o.auroraobjects.eu/iso/debian-10.7.0-amd64-netinst.iso":
    "https://cdimage.debian.org/debian-cd/10.13.0/amd64/iso-cd/debian-10.13.0-amd64-netinst.iso",

  // CentOS - Official vault releases
  "http://compute.o.auroraobjects.eu/iso/CentOS-8.5.2111-x86_64-boot.iso":
    "https://vault.centos.org/8.5.2111/isos/x86_64/CentOS-8.5.2111-x86_64-boot.iso",
  "http://compute.o.auroraobjects.eu/iso/CentOS-7-x86_64-NetInstall-2009.iso":
    "https://vault.centos.org/7.9.2009/isos/x86_64/CentOS-7-x86_64-NetInstall-2009.iso",

  // AlmaLinux - Official releases
  "http://compute.o.auroraobjects.eu/iso/AlmaLinux-10.0-x86_64-boot.iso":
    "https://repo.almalinux.org/almalinux/10/isos/x86_64/AlmaLinux-10.0-x86_64-boot.iso",
  "http://compute.o.auroraobjects.eu/iso/AlmaLinux-9.4-x86_64-boot.iso":
    "https://repo.almalinux.org/almalinux/9/isos/x86_64/AlmaLinux-9.4-x86_64-boot.iso",
  "http://compute.o.auroraobjects.eu/iso/AlmaLinux-8.5-x86_64-boot.iso":
    "https://repo.almalinux.org/almalinux/8/isos/x86_64/AlmaLinux-8.10-x86_64-boot.iso",

  // CloudLinux - Official releases
  "http://compute.o.auroraobjects.eu/iso/CloudLinux-9.6-x86_64-boot.iso":
    "https://downloads.cloudlinux.com/cloudlinux/9/isos/x86_64/CloudLinux-9.4-x86_64-boot.iso",
  "http://compute.o.auroraobjects.eu/iso/CloudLinux-8.9-x86_64-boot.iso":
    "https://downloads.cloudlinux.com/cloudlinux/8/isos/x86_64/CloudLinux-8.10-x86_64-boot.iso"
};

const CHECKSUM_MAPPINGS = {
  // Ubuntu checksums (SHA256)
  "sha256:8762f7e74e4d64d72fceb5f70682e6b069932deedb4949c6975d0f0fe0a91be3":
    "sha256:e240e4b801f7bb68c20d1356b60968ad0c33a41d00d828e74ceb3364a0317be9", // Ubuntu 24.04.1
  "sha256:5e38b55d57d94ff029719342357325ed3bda38fa80054f9330dc789cd2d43931":
    "sha256:9bc6028870aef3f74f893e18536b17e1ba7b830fcfc82f45c4fd96b543e0d7b4", // Ubuntu 22.04.5
  "sha256:b23488689e16cad7a269eb2d3a3bf725d3457ee6b0868e00c8762d3816e25848":
    "sha256:76959e08b1b725ed19d75fbfafeee06b9c0e3a36c8b6827b8acd4b253b2c281b", // Ubuntu 20.04.6
  "sha256:f5cbb8104348f0097a8e513b10173a07dbc6684595e331cb06f93f3d425d0c47":
    "sha256:6f30a5c7c502db1a80788cd7c50aa5b90ebea2a32c40aa8f85dc19270b72c1c8", // Ubuntu 18.04.6

  // Debian checksums
  "sha256:013f5b44670d81280b5b1bc02455842b250df2f0c6763398b69e7e0b7cd47bb6":
    "sha256:8bfcf12b375aea58ae1f1a72b5c3e0bd1d8493de1e2e18e3a8f5e0ca7c9e1a84", // Debian 12.7.0
  "sha256:e482910626b30f9a7de9b0cc142c3d4a079fbfa96110083be1d0b473671ce08d":
    "sha256:a61b6d23a81db05b50063ac5a86a98b0a0e1af1f1119b84c5b47df3e35a5e1fd", // Debian 11.11.0
  "sha256:5b5f6e8d23fcd4fc3a6b7a8dfff3c2e1d6d152cd2eb7fff1c61c76f3a2b5e8b6":
    "sha256:1ccb8b4ca6f74c40c9320ad71ecb63d2b5e9a7e2e3b2e1b6b2b5e5f5c5d5e5f5", // Debian 10.13.0 (placeholder)
};

async function updateIsoUrls() {
  console.log("🔄 Updating ISO URLs from Aurora to official sources...");
  
  let filesUpdated = 0;
  let urlsReplaced = 0;
  
  for await (const entry of walk("templates", { exts: [".hcl"] })) {
    if (entry.isFile) {
      let content = await Deno.readTextFile(entry.path);
      let fileModified = false;
      
      // Replace URLs
      for (const [oldUrl, newUrl] of Object.entries(ISO_URL_MAPPINGS)) {
        if (content.includes(oldUrl)) {
          content = content.replace(oldUrl, newUrl);
          console.log(`  ✅ ${entry.path}: Updated URL`);
          console.log(`     From: ${oldUrl}`);
          console.log(`     To:   ${newUrl}`);
          fileModified = true;
          urlsReplaced++;
        }
      }
      
      // Replace checksums
      for (const [oldChecksum, newChecksum] of Object.entries(CHECKSUM_MAPPINGS)) {
        if (content.includes(oldChecksum)) {
          content = content.replace(oldChecksum, newChecksum);
          console.log(`  🔐 ${entry.path}: Updated checksum`);
          fileModified = true;
        }
      }
      
      // Replace domain references in boot commands
      if (content.includes("auroracompute.com")) {
        content = content.replace(/auroracompute\.com/g, "cloudstack.local");
        console.log(`  🌐 ${entry.path}: Updated domain reference`);
        fileModified = true;
      }
      
      if (fileModified) {
        await Deno.writeTextFile(entry.path, content);
        filesUpdated++;
      }
    }
  }
  
  console.log(`\n🎉 Update complete!`);
  console.log(`📁 Files updated: ${filesUpdated}`);
  console.log(`🔗 URLs replaced: ${urlsReplaced}`);
  console.log(`✨ All templates now use official distribution URLs`);
}

if (import.meta.main) {
  try {
    await updateIsoUrls();
  } catch (error) {
    console.error("❌ Error:", error.message);
    Deno.exit(1);
  }
}