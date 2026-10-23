---
title: "Private Endpoints vs Service Endpoints: Which One Should You Use?"
description: "How Azure Private Endpoints and Service Endpoints differ, how traffic flows with each, the pros and cons, and the gotchas that catch people out"
category: "networking"
tags: ["private-endpoint", "service-endpoint", "private-link", "network-security", "hub-and-spoke"]
date: "2026-10-23"
draft: true
---

"Should we use private endpoints or service endpoints?" comes up in almost every Azure landing zone discussion I'm part of. Both lock a PaaS resource down to your network, both keep traffic on the Microsoft backbone, and both appear on the same **Networking** blade in the portal. They work in very different ways, though. Picking the wrong one usually only becomes obvious later, when someone tries to reach the resource from on-premises or the firewall team asks why they can't see the traffic.

This guide covers how each one works, what the traffic actually looks like, and the things I wish someone had told me before I rolled them out.

## Quick Answer (TLDR)

- **Service endpoint:** a subnet setting. Traffic from that subnet still goes to the service's **public IP**, but over the Azure backbone and with your **private source IP**, so the service firewall can allow "this subnet". Free, quick to set up, no DNS changes. **Does not work from on-premises** or from other VNets, and it lets the subnet reach *every* resource of that service type.
- **Private endpoint:** a **NIC with a private IP in your VNet** that maps to **one specific resource**. Reachable from the VNet, peered VNets and on-premises over VPN/ExpressRoute. You can turn public access off completely. Costs money and **requires DNS work**.

**Default choice:** use private endpoints for production, anything reached from on-premises, and anything with data exfiltration requirements. Use service endpoints where cost or simplicity matters more and all traffic starts in Azure, or for platform dependencies (for example a firewall subnet reaching Storage) where a private endpoint is overkill.

## How Service Endpoints Work

You enable a service endpoint on a **subnet** for a **service type** (for example `Microsoft.Storage` or `Microsoft.Sql`). Two things change for traffic from that subnet to that service:

1. **Routing:** Azure adds system routes for the service's public prefixes with next hop `VirtualNetworkServiceEndpoint`. Traffic goes straight to the service over the backbone.
2. **Identity:** the request reaches the service with the VM's **private IP** as the source, tagged with the VNet and subnet it came from. That's what lets you add a "virtual network rule" on the resource's firewall.

What does **not** change: DNS. `mystorage.blob.core.windows.net` still resolves to the public IP. The resource still has a public endpoint. You're just restricting who can use it.

![Service endpoint traffic flow](/guides/private-vs-service-endpoints/service-endpoint-flow.svg)

1. The VM connects to the storage account's public IP. The service endpoint route sends it over the backbone with source `10.1.1.4`. The storage firewall allows `vnet-spoke/snet-app`, so the request succeeds.
2. An on-premises client over VPN/ExpressRoute isn't covered. Its traffic reaches the public endpoint from a public NAT IP and is rejected unless you add that IP to the resource firewall.
3. Internet clients hit the same public endpoint and get rejected by the network rules.

## How Private Endpoints Work

A private endpoint is a **network interface in your subnet** with a private IP (for example `10.2.1.5`), connected through Private Link to **one specific resource** and sub-resource (for example `mystorage` / `blob`). From the network's point of view, the storage account now lives at `10.2.1.5`.

Because it's just an IP in your VNet, anything that can route to that IP can use it: VMs in the same VNet, peered VNets (they get a `/32` route to the endpoint), and on-premises over VPN or ExpressRoute.

DNS is what makes it work. Creating the private endpoint adds a CNAME in public DNS from `mystorage.blob.core.windows.net` to `mystorage.privatelink.blob.core.windows.net`. Your Private DNS zone answers that name with `10.2.1.5`. Applications keep using the normal FQDN. If you haven't set this up before, read the [Private Endpoint DNS guide](/guides/networking/private-endpoint-dns-setup/) first, because this is where most problems come from.

![Private endpoint traffic flow](/guides/private-vs-service-endpoints/private-endpoint-flow.svg)

1. The VM resolves `mystorage.blob.core.windows.net` to `10.2.1.5` and connects to it directly. The private endpoint passes the traffic to the storage account over Private Link.
2. The on-premises client's DNS forwards `blob.core.windows.net` to the DNS Private Resolver in the hub and gets `10.2.1.5` back. Traffic goes over VPN/ExpressRoute into the hub, optionally through the firewall, then to the endpoint. Private IPs the whole way.
3. Public network access is disabled on the storage account, so internet clients are rejected.

## Side-by-Side Comparison

| | Service Endpoint | Private Endpoint |
|---|---|---|
| **What you deploy** | A setting on a subnet | A NIC with a private IP (plus a DNS record) |
| **Scope** | Whole service type (all storage accounts, all SQL servers) | One resource and sub-resource |
| **Destination IP** | Service's public IP | Private IP in your VNet |
| **DNS changes** | None | Private DNS zone and forwarding required |
| **Reachable from on-premises** | No (only by allowing public NAT IPs) | Yes, over VPN/ExpressRoute |
| **Reachable from peered VNets** | No, enable it on each subnet separately | Yes |
| **Public endpoint can be disabled** | No, you restrict it with network rules | Yes |
| **Data exfiltration protection** | Weak by default (Service Endpoint Policies help for Storage) | Strong, the endpoint only reaches the mapped resource |
| **Cross-region** | Yes for most services, SQL Database must be same region | Yes |
| **Cost** | Free | Hourly charge per endpoint plus per-GB data processing |
| **Effect on routing** | Service prefixes bypass your UDRs and BGP routes | `/32` route per endpoint, propagated to peered VNets |
| **Service support** | Limited list of services | Most PaaS services, plus your own via Private Link Service |
| **Setup effort** | Minutes | DNS planning, IP planning, approval workflow |

## Pros and Cons

### Service endpoints

**Pros**

- **Free.** No per-hour or per-GB charge.
- **Simple.** One checkbox on the subnet and one rule on the resource. No DNS, no IP planning.
- **Nothing changes for clients.** Same FQDN, same public IP, no resolution path to troubleshoot.
- **Works across subscriptions** and for most services across regions.

**Cons**

- **Azure-only.** On-premises clients can't use them.
- **Per-subnet, not per-VNet.** Every subnet that needs access must have the endpoint enabled, including subnets in peered VNets.
- **Exfiltration risk.** The subnet can reach *any* storage account (including one in an attacker's subscription) as long as its egress allows it. Service Endpoint Policies close this gap for Storage, but they're another thing to manage.
- **Public endpoint stays.** The resource is still exposed on the internet, just behind network rules. Some compliance frameworks don't accept that.
- **Bypasses your firewall** (see the routing section below).

### Private endpoints

**Pros**

- **Truly private.** The resource gets a private IP and public access can be turned off.
- **Works from anywhere routable:** peered VNets, other regions and on-premises.
- **Per-resource scope.** An endpoint for `mystorage` can't be used to reach `attackerstorage`.
- **Standard network controls.** NSGs and UDRs work once you enable network policies on the subnet.
- **Broad support**, including your own services through Private Link Service.

**Cons**

- **Costs money.** Small per endpoint, but it adds up across hundreds of endpoints and heavy data transfer.
- **DNS is mandatory and easy to get wrong.** A broken zone link or forwarder silently sends clients to the public IP.
- **Consumes IP addresses** and needs subnet planning. Some services need several endpoints (blob, file, queue and table are separate sub-resources).
- **More moving parts:** endpoint approval, zone records, network policies and route tables.

## Things That Are Good to Know

### Service endpoints bypass your firewall

This one surprises a lot of people. Service endpoint routes **override UDRs and BGP routes** for the service's prefixes. If your spoke has `0.0.0.0/0 → Azure Firewall` and you enable a `Microsoft.Storage` service endpoint on that subnet, Storage traffic no longer goes through the firewall.

If you need inspection, enable the service endpoint on the **firewall's subnet** instead of the workload subnet, and allow that subnet on the resource.

### Private endpoints can bypass your firewall too

Each private endpoint creates a `/32` route (next hop `InterfaceEndpoint`) in its own VNet and in peered VNets. Longest prefix wins, so a UDR like `10.0.0.0/8 → firewall` doesn't catch it.

To force private endpoint traffic through a firewall:

1. Enable **private endpoint network policies** (route tables) on the private endpoint subnet. That lets a UDR with a prefix equal to or larger than the VNet's address space override the `/32`.
2. Or add a matching `/32` UDR per endpoint. That works, but route tables are limited to 400 routes.
3. Make the firewall **SNAT** that traffic so the return path is symmetric. Azure Firewall always SNATs traffic matched by application rules. With network rules or a third-party NVA, you have to configure SNAT yourself.

A dedicated "private endpoints" VNet or subnet with one route covering its whole range is the most manageable design at scale.

### NSGs on the private endpoint subnet don't apply by default

Private endpoint network policies are **disabled** by default, so an NSG on the private endpoint subnet isn't evaluated for endpoint traffic. Filter on the source subnet, or enable network policies for NSGs on the private endpoint subnet.

### Enabling a service endpoint drops existing connections

When you enable or disable a service endpoint, the source IP for that service changes from public to private. **Existing TCP connections are closed.** Any firewall rule on the resource that allowed your VNet's *public* IP also stops matching. Do this in a maintenance window.

### A private endpoint doesn't close the public endpoint

Creating a private endpoint doesn't disable public access on the resource. You need to set **Public network access: Disabled** (or restrict it) yourself. Otherwise the resource stays reachable from the internet and you've only added a private path.

### You can use both at the same time

They aren't mutually exclusive. A common pattern is private endpoints for application and on-premises access, plus a service endpoint on a platform subnet that needs to reach the same service. If a client has both a service endpoint and a working private endpoint DNS record, the private endpoint wins because DNS returns the private IP and the client never reaches the public endpoint.

### Watch out for multi-sub-resource services

A storage account with a `blob` private endpoint isn't reachable privately over `file`, `queue`, `table` or `dfs`. Each sub-resource needs its own endpoint and DNS zone. Some services, such as Azure Monitor and Azure Backup, need several zones. See the [DNS zone reference](/tools/private-dns-zones/).

### Trusted Microsoft services

When you lock a resource down with either approach, some Azure services that talk to it from Microsoft's side (Backup, Event Grid, Defender and others) may stop working. Many resources have an **"Allow trusted Microsoft services"** exception, or support **resource instance rules**, to let them through. Check this before you turn public access off.

### Network Security Perimeter

For PaaS-to-PaaS access (for example a Key Vault that should only be reachable from a specific storage account), look at **Network Security Perimeter**. It's designed for that case and avoids building private endpoints just to connect two PaaS services.

## Decision Guide

| Scenario | Recommendation |
|---|---|
| Clients on-premises need access | **Private endpoint** |
| Compliance requires no public endpoint | **Private endpoint** |
| Data exfiltration is a concern | **Private endpoint** (or service endpoint plus Service Endpoint Policies for Storage) |
| Hub-and-spoke with many spokes using a shared resource | **Private endpoint** in a shared or dedicated VNet |
| Dev/test, Azure-only traffic, cost-sensitive | **Service endpoint** |
| A firewall or NVA subnet needs to reach Storage or SQL | **Service endpoint** on the firewall subnet |
| Service doesn't support private endpoints | **Service endpoint**, if supported |

## Quick Verification

**Service endpoint:** check effective routes on a NIC in the subnet. You should see the service's prefixes with next hop `VirtualNetworkServiceEndpoint`:

```bash
az network nic show-effective-route-table \
  --resource-group myResourceGroup \
  --name myVmNic \
  --output table
```

The resource's diagnostic logs should show the caller's **private** IP as the source.

**Private endpoint:** the FQDN should resolve to the private IP, and the NIC's effective routes should include a `/32` with next hop `InterfaceEndpoint`:

```bash
nslookup mystorage.blob.core.windows.net
# Expected: mystorage.privatelink.blob.core.windows.net -> 10.2.1.5
```

If it returns a public IP, the problem is DNS, not the endpoint.

## References

- [Azure virtual network service endpoints](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview)
- [What is a private endpoint?](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview)
- [Private Link FAQ (includes service endpoint questions)](https://learn.microsoft.com/en-us/azure/private-link/private-link-faq)
- [Manage network policies for private endpoints](https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy)
- [Azure Firewall scenarios to inspect traffic destined to a private endpoint](https://learn.microsoft.com/en-us/azure/private-link/inspect-traffic-with-azure-firewall)
- [Virtual network service endpoint policies for Azure Storage](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoint-policies-overview)
- [Network Security Perimeter](https://learn.microsoft.com/en-us/azure/private-link/network-security-perimeter-concepts)
- [Azure Private Link pricing](https://azure.microsoft.com/en-us/pricing/details/private-link/)
