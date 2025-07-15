output "packer_ssh_key_id" {
  value = cloudstack_ssh_keypair.packer_ssh_key.id
}

output "packer_ssh_key_private_key" {
  value = cloudstack_ssh_keypair.packer_ssh_key.private_key
}

output "packer_ssh_key_public_key" {
  value = cloudstack_ssh_keypair.packer_ssh_key.public_key
}