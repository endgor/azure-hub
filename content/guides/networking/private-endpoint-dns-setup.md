---
title: "Private Endpoint DNS Setup for Hybrid and Cloud-Only Environments"
description: "A practical guide to configuring DNS resolution for Azure Private Endpoints, covering both cloud-only and hybrid (on-premises) setups"
category: "networking"
tags: ["private-endpoint", "dns", "private-link", "hybrid", "private-dns-resolver"]
date: "2026-03-26"
---

Getting DNS right for Private Endpoints is one of those things that looks simple on paper but trips people up constantly. Microsoft's documentation is detailed but spreads the information across multiple pages, making it hard to see the full picture. This guide covers what you actually need to know.

## Quick Setup (TLDR)

**Cloud-only:** Create a Private DNS Zone (e.g., `privatelink.blob.core.windows.net`), link it to your VNet, and make sure your VNet is using Azure-provided DNS or forwarding to `168.63.129.16`. For hub-and-spoke, either link every spoke VNet to the zone or use Azure DNS Private Resolver in the hub.

**Hybrid (on-premises + Azure):**

1. **On-premises DCs:** Add conditional forwarders for the **public** zone names (`blob.core.windows.net`, not `privatelink.blob.core.windows.net`). Point the forwarder IP to your Azure DNS Private Resolver or a DC in Azure.
2. **Azure DCs:** Set the server-level forwarder to `168.63.129.16`. No conditional forwarders needed.
3. **VNets:** Set custom DNS to your Azure DC or Private Resolver IPs.
4. **Private DNS Zones:** Link them to the VNet where your DNS resolver or Azure DC lives.

That's the short version. Read on for the why and common pitfalls.

## How Private Endpoint DNS Works

When you create a private endpoint for an Azure service, Azure does two things behind the scenes:

1. Creates a **network interface** with a private IP in your VNet (e.g., `10.0.1.5`)
2. Inserts a **CNAME record** in public DNS that redirects the service's FQDN into a `privatelink.*` namespace

For example, if you create a private endpoint for a storage account:

```
mystorageaccount.blob.core.windows.net
  → CNAME → mystorageaccount.privatelink.blob.core.windows.net
```

This CNAME is created globally in Azure public DNS the moment you create the private endpoint. Your application connection strings stay the same, still pointing to `mystorageaccount.blob.core.windows.net`. The CNAME silently redirects the lookup into the `privatelink.*` zone where your Private DNS Zone can answer with the private IP.

Clients on the public internet follow the same CNAME but get the public IP (since they don't have your Private DNS Zone). Clients going through your Azure DNS infrastructure get the private IP. Same FQDN, different answers depending on where the query is resolved.

## Cloud-Only Setup

If all your workloads are in Azure with no on-premises connectivity, the setup is straightforward.

### Default DNS (no custom DNS servers)

When your VNet uses Azure-provided DNS (the default), VMs automatically query `168.63.129.16`. This is a virtual IP present in every Azure VNet that provides DNS, DHCP, health probes, and VM agent communication.

All you need:

1. **Create a Private DNS Zone** for the service type (e.g., `privatelink.blob.core.windows.net`)
2. **Link the zone to your VNet**
3. The private endpoint's A record is automatically added to the zone

That's it. Azure DNS resolves the CNAME, checks linked Private DNS Zones, and returns the private IP.

**Important:** The Private DNS Zone only resolves for VNets that are directly linked to it. If you have a single VNet this is straightforward, but in a hub-and-spoke topology you need to think about this more carefully.

### Hub-and-spoke topology

Without a centralized DNS resolver, **every spoke VNet that needs to resolve private endpoints must be directly linked to the Private DNS Zone**. Azure DNS at `168.63.129.16` only checks zones linked to the VNet where the query originates. It doesn't follow peering or traverse hub networks. If a spoke VNet isn't linked, queries return the public IP instead of the private one.

This works fine for small setups, but doesn't scale well. If you have 10 Private DNS Zones and 20 spoke VNets, that's 200 zone links to manage. Every time you add a spoke or a new service type, you need to remember to link them.

For larger environments, use **Azure DNS Private Resolver** to centralize resolution and avoid the zone-linking multiplication:

1. Deploy the Private Resolver in your hub VNet
2. Link all Private DNS Zones to the hub VNet only
3. Configure spoke VNets to use the resolver's **inbound endpoint** IP as their DNS server (the inbound endpoint receives queries from clients and VNets, while the outbound endpoint is used for forwarding rules to on-premises or external DNS)

Now spoke VNets don't need direct links to the zones. Their queries are forwarded to the resolver in the hub, which has access to all linked zones. One zone link per service type instead of one per spoke.

### When you have custom DNS servers on the VNet

If your VNet has custom DNS configured (e.g., domain controllers for Active Directory), VMs no longer query `168.63.129.16` directly. This means Private DNS Zone links aren't consulted automatically.

Your custom DNS server must forward queries to `168.63.129.16` to re-enter the Azure DNS resolution path. Set it as a **server-level forwarder** on the DNS server. Without this forwarder, Private DNS Zones are effectively invisible to your workloads.

## Hybrid Setup (On-Premises + Azure)

This is where most of the confusion happens. The goal is simple: on-premises clients should resolve Azure private endpoints to their private IPs, not the public ones.

### On-premises DNS servers

Add **conditional forwarders** for the public DNS zone names of the Azure services you're using. For example:

- `blob.core.windows.net` (not ~~privatelink.blob.core.windows.net~~)
- `database.windows.net` (not ~~privatelink.database.windows.net~~)
- `vaultcore.azure.net` (not ~~privatelink.vaultcore.azure.net~~)

The forwarder IP should point to something in Azure that can resolve private endpoints:

- **Azure DNS Private Resolver** inbound endpoint IP (recommended)
- **Domain controller in Azure** that forwards to `168.63.129.16`
- **DNS forwarder VM** in Azure

Note that `168.63.129.16` is **only reachable from within Azure**. It's a virtual IP on the host node, not a routable address. You cannot use it as a forwarder IP on your on-premises DNS servers. That's why you need something in Azure (Private Resolver, DC, or forwarder VM) to act as the intermediary.

You do **not** need to set up the `privatelink.*` zones on your on-premises DNS servers. Use the public zone names only.

### Why the public zone name matters

This is the most common mistake. If you create a conditional forwarder for `privatelink.blob.core.windows.net`, the on-premises DNS server never intercepts the initial query for `blob.core.windows.net`. It resolves the original FQDN via the public internet and gets the public IP. The CNAME redirect from the public zone to the privatelink zone is the mechanism that makes everything work, so your forwarder must intercept at the public zone level.

### Azure-side DNS servers

On your domain controllers or DNS forwarder VMs in Azure:

1. Set the **server-level forwarder** to `168.63.129.16`
2. In most cases, you don't need to create conditional forwarder zones for each `privatelink.*` zone (as long as zones are properly linked to the VNet)

When the Azure DNS server forwards to `168.63.129.16`, Azure DNS handles the full chain: resolves the CNAME, checks linked Private DNS Zones, and returns the private IP. The Private DNS Zones just need to be linked to the VNet where the DNS server lives.

### VNet DNS settings

Set the domain controller or Azure DNS Private Resolver IP addresses as **custom DNS** on your virtual networks. This ensures VMs and other resources in those VNets use your DNS infrastructure instead of Azure-provided DNS directly.

### AD-integrated DNS: Conditional forwarder replication

If your domain controllers use AD-integrated DNS, be careful with conditional forwarder replication. When you create a conditional forwarder and store it in Active Directory, you can choose a replication scope:

- **All DNS servers in the forest** (replicates everywhere, including Azure DCs)
- **All DNS servers in the domain** (same issue, Azure DCs in the domain get it too)
- **All domain controllers in the domain** (legacy option, also replicates to Azure)
- **Custom directory partition** (you control exactly which DCs participate)
- **Not stored in AD** (local only, no replication)

The problem: if you replicate a conditional forwarder for `blob.core.windows.net` (pointing to the Private DNS Resolver) to all DCs in the domain, your Azure DCs will also get it. Those Azure DCs don't need it because they already resolve private endpoints through their server-level forwarder to `168.63.129.16`. At best it's an unnecessary extra hop, at worst it creates confusion.

**Two approaches to handle this:**

**Option 1: Don't replicate (simple).** Disable AD replication for the conditional forwarders and set them up manually on each on-premises DC. On Azure DCs, don't create them at all since the server-level forwarder to `168.63.129.16` already handles everything. This is straightforward and works well for smaller environments.

**Option 2: Custom DNS application directory partition (scalable).** Create a custom partition that only your on-premises DCs are enlisted in:

```powershell
# Create the partition
Add-DnsServerDirectoryPartition -Name "AzurePrivateDns.contoso.com"

# Enlist each on-premises DC
Register-DnsServerDirectoryPartition -Name "AzurePrivateDns.contoso.com" -ComputerName "DC-ONPREM1"
Register-DnsServerDirectoryPartition -Name "AzurePrivateDns.contoso.com" -ComputerName "DC-ONPREM2"
# Do NOT enlist Azure DCs

# Create the conditional forwarder using the custom partition
Add-DnsServerConditionalForwarderZone `
    -Name "blob.core.windows.net" `
    -MasterServers 10.10.0.4 `
    -ReplicationScope Custom `
    -DirectoryPartitionName "AzurePrivateDns.contoso.com"
```

This way the conditional forwarders replicate automatically across all on-premises DCs but never reach the Azure ones. Better for larger environments where manually configuring each DC isn't practical.

## The Full Resolution Flow (Hybrid)

Here's what happens step by step when an on-premises client queries `mystorageaccount.blob.core.windows.net`:

1. Client asks the on-premises DNS server
2. DNS server matches the conditional forwarder for `blob.core.windows.net`
3. Query is forwarded over VPN/ExpressRoute to the Azure DNS Private Resolver (or forwarder VM)
4. The resolver forwards to `168.63.129.16`
5. Azure DNS resolves the CNAME: `mystorageaccount.blob.core.windows.net` → `mystorageaccount.privatelink.blob.core.windows.net`
6. Azure DNS checks Private DNS Zones linked to the VNet and finds an A record: `mystorageaccount.privatelink.blob.core.windows.net` → `10.0.1.5`
7. The private IP travels back through the chain to the client
8. Client connects to `10.0.1.5` over VPN/ExpressRoute

## Quick Verification

Test from a VM in a linked VNet or from on-premises (after setting up forwarders):

```bash
nslookup mystorageaccount.blob.core.windows.net
```

- **Correct:** Returns a private IP (10.x.x.x or 172.x.x.x)
- **Wrong:** Returns a public IP, which means you need to check your DNS forwarders and zone links

## When Does Public Resolution Still Work?

A common concern: if you have a Private DNS Zone for `privatelink.blob.core.windows.net` linked to your VNet, can you still access storage accounts that **don't** have private endpoints?

**Yes, this works fine.** The key is understanding the CNAME. Azure only creates the CNAME redirect from `storageA.blob.core.windows.net` → `storageA.privatelink.blob.core.windows.net` when you create a private endpoint for that specific resource. If `storageB` has no private endpoint, there's no CNAME. The query for `storageB.blob.core.windows.net` resolves directly to its public IP through normal DNS. Your Private DNS Zone is never consulted because the query never enters the `privatelink.*` namespace.

So in a standard setup, private and public resolution coexist without issues. Resources with private endpoints resolve to private IPs, resources without them resolve to public IPs.

## The NXDOMAIN Edge Case

There is one scenario where this breaks. If a resource has a private endpoint **somewhere else** (a different tenant, subscription, or VNet that has its own Private DNS Zone), the CNAME to `privatelink.*` exists in public DNS, but the A record is not in **your** Private DNS Zone.

For example: `storageC` belongs to another team and they created a private endpoint for it in their VNet. Public DNS now returns `storageC.blob.core.windows.net → storageC.privatelink.blob.core.windows.net`. When your DNS infrastructure follows this CNAME, it hits your Private DNS Zone for `privatelink.blob.core.windows.net`. Your zone is authoritative but has no A record for `storageC`, so it returns NXDOMAIN. Resolution fails.

Microsoft introduced **Fallback to Internet** to address this. When enabled on a virtual network link, NXDOMAIN responses from the Private DNS Zone fall back to public DNS instead of failing. Enable it with the `resolutionPolicy` set to `NxDomainRedirect`:

```bash
az network private-dns link vnet create \
  --zone-name "privatelink.blob.core.windows.net" \
  --virtual-network myVNet \
  --registration-enabled false \
  --resolution-policy NxDomainRedirect
```

This is mainly relevant in multi-tenant or multi-region setups where private endpoints for the same service type exist across different environments.

## Common Mistakes

1. **Forwarding to the `privatelink.*` zone instead of the public zone.** The conditional forwarder must be for `blob.core.windows.net`, not `privatelink.blob.core.windows.net`.

2. **Not linking the Private DNS Zone to the right VNet.** The zone must be linked to the VNet where your DNS resolver or forwarder lives, not just the VNet where the private endpoint is deployed.

3. **Windows DNS forwarding timeout too low.** If using Windows DNS servers forwarding to `168.63.129.16`, increase the forwarding timeout to 5-10 seconds. The default 3 seconds is too short, especially over ExpressRoute or VPN where latency varies. If it times out, the server falls back to root hints and resolves the public IP instead.

4. **Creating multiple zones with the same name.** In hub-and-spoke, create one `privatelink.blob.core.windows.net` zone and link it to all VNets. Don't create separate zones per spoke.

5. **Missing zones for multi-zone services.** Some services require multiple DNS zones. Azure Monitor needs `privatelink.monitor.azure.com`, `privatelink.oms.opinsights.azure.com`, `privatelink.ods.opinsights.azure.com` and more. Azure Backup needs `privatelink.blob.core.windows.net` and `privatelink.queue.core.windows.net` on top of its own backup zone. Storage accounts need separate zones for blob, queue, table, and file if you use private endpoints for each. Miss one and that sub-service fails to resolve. Check the [DNS zone reference](/tools/private-dns-zones/) for the full list per service.

6. **Private endpoint in a different VNet than the zone link.** If you create a private endpoint in a spoke VNet but only link the Private DNS Zone to the hub, resolution only works if spoke VNets forward DNS through the hub (via Private Resolver or a DNS forwarder). If spokes use Azure-provided DNS directly, the zone must also be linked to the spoke VNet.

7. **Blocking `168.63.129.16`.** This IP must be reachable on port 53 from any VM acting as a DNS forwarder. Local firewall rules that block it will break the entire chain.

## References

- [Azure Private Endpoint DNS zone values](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Private Endpoint DNS integration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration)
- [What is IP address 168.63.129.16](https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16)
- [Azure DNS Private Resolver for hybrid DNS](https://learn.microsoft.com/en-us/azure/dns/private-resolver-hybrid-dns)
- [Private DNS Zones across VNets](https://oneuptime.com/blog/post/2026-02-16-how-to-configure-azure-private-dns-zones-for-name-resolution-across-vnets/view)
- [Azure Private DNS Zone Fallback to Internet](https://www.kristhecodingunicorn.com/post/azure-private-dns-zone-fallback-to-public/)
