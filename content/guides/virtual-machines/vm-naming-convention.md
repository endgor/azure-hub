---
title: "Azure VM Naming Conventions"
description: "Explaining Virtual machine size names and understand what each character means"
category: "virtual-machines"
tags: ["vm", "compute", "sizing"]
date: "2025-11-17"
---

Azure virtual machine names follow a specific pattern that encodes important information about the VM's capabilities. Understanding this naming convention helps you quickly identify the right VM size for your workload.

## VM Name Structure

A typical VM name looks like: **Standard_D4s_v5**

Let's break down each component:

### Family

The first letter(s) indicate the VM Family Series.

**Examples:**
- `D` - General purpose
- `E` - Memory optimized
- `F` - Compute optimized
- `M` - Memory intensive
- `N` - GPU-enabled

### Subfamily (Optional)

Used for specialized VM differentiations:

| Subfamily | Meaning |
|-----------|---------|
| `B` | Memory bandwidth optimized |
| `C` | Confidential (for DC, EC, NCC series) OR Compute intensive (for HC, NC, NCC series) |
| `D` | AI training and inference optimized |
| `G` | Cloud gaming and remote desktop optimized |
| `V` | Visualization and graphics optimized |
| `X` | Extra memory |

### Number of vCPUs

The number following the family letter indicates the number of virtual CPUs.

**Example:** `D4` = 4 vCPUs

### Constrained vCPUs (Optional)

For certain VM sizes, this denotes the number of vCPUs for constrained vCPU capable sizes.

### Additive Features

Lower case letters denote additive features:

| Feature | Meaning |
|---------|---------|
| `a` | AMD-based processor |
| `b` | Remote storage bandwidth optimized |
| `d` | Includes a local temp disk |
| `e` | Encrypted; contains confidential TDX capabilities |
| `f` | Flat ratio (1:1) of vCPU to memory size |
| `i` | Isolated size |
| `l` | Low memory; decreased vCPU to memory ratio |
| `m` | Memory intensive; highest vCPU to memory ratio in a particular series |
| `n` | Network optimized; increased vCPU to network bandwidth ratio |
| `o` | Increased vCPU to local SSD storage capacity ratio |
| `p` | ARM-based processor |
| `r` | Includes RDMA (InfiniBand) secondary network |
| `s` | Compatible with any premium SSD type |
| `t` | Tiny memory; smallest vCPU to memory ratio in a particular size |

### Accelerator Type (Optional)

Denotes the type of hardware accelerator in specialized/GPU SKUs.

### Memory Capacity (Optional)

For M-series VMs, denotes memory capacity rounded to the nearest TiB.

### Version

The version number of the VM Family Series (e.g., `v5`, `v4`, `v3`).

## Common Examples

### Standard_D4s_v5
- **D** - General purpose family
- **4** - 4 vCPUs
- **s** - Premium storage capable
- **v5** - Version 5 of the D-series

### Standard_E16ads_v5
- **E** - Memory optimized family
- **16** - 16 vCPUs
- **a** - AMD processor
- **d** - Local temp disk included
- **s** - Premium storage capable
- **v5** - Version 5

### Standard_F8s_v2
- **F** - Compute optimized family
- **8** - 8 vCPUs
- **s** - Premium storage capable
- **v2** - Version 2

## Quick Tips

1. **Premium Storage**: Look for the `s` suffix to ensure your VM supports premium SSDs for better performance.

2. **Local Temp Disk**: The `d` suffix indicates a local temporary disk is included, useful for page files or caching.

3. **AMD vs Intel**: The `a` suffix indicates AMD processors, which often provide better price-performance for certain workloads.

4. **Version Numbers**: Higher version numbers (v5, v6) typically offer better performance and newer features than older versions (v2, v3).

## References

- [Azure VM Size Families](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes)
- [VM Size Naming Conventions](https://learn.microsoft.com/en-us/azure/virtual-machines/vm-naming-conventions)
