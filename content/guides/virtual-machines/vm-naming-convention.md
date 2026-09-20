---
title: "Azure VM Naming Conventions"
description: "Learn how to read Azure VM size names. Understand what each character in names like Standard_D4s_v5 means, including family, vCPUs, and features."
category: "virtual-machines"
tags: ["vm", "compute", "sizing"]
date: "2026-09-20"
---

Azure virtual machine names follow a specific pattern that encodes important information about the VM's capabilities. Understanding this naming convention helps you quickly identify the right VM size for your workload.

## VM Name Structure

A typical VM name looks like: **Standard_D4s_v5**

Microsoft describes the full pattern as:

**[Family]** + *[Subfamily]* + **[# of vCPUs]** + *[Constrained vCPUs]* + **[Additive Features]** + *[Accelerator Type]* + *[Memory Capacity]* + **[Version]**

The parts in italics are optional. Let's break down each component:

### Family

The first letter (or two) indicates the VM Family Series. Most families use a single letter, but accelerated and specialized families use two, such as `NC` or `HB`.

| Family | Type | Typical workloads |
|--------|------|-------------------|
| `A` | General purpose | Entry-level, economical |
| `B` | General purpose | Burstable |
| `D` | General purpose | Enterprise applications, relational databases, in-memory caching, data analytics |
| `DC` | General purpose | D-family with confidential computing |
| `F` | Compute optimized | Web servers, network appliances, batch processing, application servers |
| `FX` | Compute optimized | EDA, large memory relational databases, in-memory analytics |
| `E` | Memory optimized | Relational databases, medium to large caches, in-memory analytics |
| `Eb` | Memory optimized | E-family with high remote storage performance |
| `EC` | Memory optimized | E-family with confidential computing |
| `M` | Memory optimized | Extremely large databases, very large memory footprints |
| `L` | Storage optimized | High disk throughput and IO, big data, NoSQL, data warehousing |
| `NC` | GPU accelerated | Compute-intensive, graphics-intensive, visualization |
| `ND` | GPU accelerated | Large memory AI training and inference |
| `NG` | GPU accelerated | Virtual desktop (VDI), cloud gaming |
| `NV` | GPU accelerated | Virtual desktop (VDI), single-precision compute, video encoding and rendering |
| `NP` | FPGA accelerated | Machine learning inference, video transcoding, database search |
| `HB` | High performance compute | High memory bandwidth, fluid dynamics, weather modeling |
| `HC` | High performance compute | High density compute, finite element analysis, molecular dynamics |
| `HX` | High performance compute | Large memory capacity, EDA |

Previous-generation families such as `G`/`GS` and `H` still show up in some regions and in pricing data, but Microsoft no longer lists them among the current sizes.

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

Most subfamilies are a single uppercase letter, but a few are lowercase and still count as a subfamily of the parent family — the `Ebsv5` series, for example, is a subfamily of the E-family.

### Number of vCPUs

The number following the family letter indicates the number of virtual CPUs.

**Example:** `D4` = 4 vCPUs

### Constrained vCPUs (Optional)

For certain VM sizes, this denotes the number of active vCPUs for [constrained vCPU capable sizes](https://learn.microsoft.com/en-us/azure/virtual-machines/constrained-vcpu). The VM keeps the memory, storage, and bandwidth of the full size while licensing costs drop with the reduced core count.

Azure writes the constrained count in one of two positions:

- Before the feature letters: `Standard_E128-32ads_v7` (128-core size running with 32 vCPUs)
- After the feature letters: `Standard_M176ds-44_3_v3` (176-core size running with 44 vCPUs)

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
| `s` | Compatible with any Premium SSD type |
| `t` | Tiny memory; smallest vCPU to memory ratio in a particular size |

A size can carry any number of these, from none (`Dv5`) to several (`Dpldsv6`). If no CPU letter is present, the series uses Intel x86-64 processors; `a` means AMD, and `p` means Arm-based (Microsoft Cobalt or Ampere Altra).

### Accelerator Type (Optional)

Denotes the type of hardware accelerator in specialized/GPU SKUs, separated by underscores. Only specialized/GPU SKUs launched from Q3 2020 onwards carry the accelerator name in the size name — older GPU sizes such as `Standard_NC6s_v3` do not.

Accelerators currently seen in Azure VM names include:

| Accelerator | Hardware |
|-------------|----------|
| `T4` | NVIDIA Tesla T4 |
| `A10` | NVIDIA A10 |
| `A100` | NVIDIA A100 |
| `H100` | NVIDIA H100 |
| `H200` | NVIDIA H200 |
| `GB200` / `GB300` | NVIDIA Grace Blackwell superchips |
| `RTXPRO6000BSE` | NVIDIA RTX PRO 6000 Blackwell Server Edition |
| `MI300X` | AMD Instinct MI300X |
| `V620` / `V710` | AMD Radeon PRO |
| `MA35D` | AMD Alveo MA35D media accelerator |

### Memory Capacity (Optional)

For M-series VMs, denotes memory capacity rounded to the nearest TiB. In `Standard_M48ds_1_v3` the `1` means roughly 1 TiB of memory (974 GiB).

### Version

The version number of the VM Family Series (e.g., `v7`, `v6`, `v5`). Version numbers only appear when a series has multiple generations — first-generation series such as `HB-series` or `B-series` often have no version segment at all.

### Other segments you may see

A few segments in the Azure API aren't part of the documented convention:

| Segment | Meaning |
|---------|---------|
| `Promo` | Promotional pricing variant of an existing size |
| `cc` | Confidential child capable (e.g. `Standard_DC16ads_cc_v5`) |
| `xl`, `flex`, `noIB`, `NDR` | Hardware variants within a series, such as different GPU memory tiers or InfiniBand configurations |

## Common Examples

### Standard_D4s_v5
- **D** - General purpose family
- **4** - 4 vCPUs
- **s** - Premium SSD capable
- **v5** - Version 5 of the D-series

### Standard_E16ads_v5
- **E** - Memory optimized family
- **16** - 16 vCPUs
- **a** - AMD processor
- **d** - Local temp disk included
- **s** - Premium SSD capable
- **v5** - Version 5

### Standard_E96bds_v5
- **E** - Memory optimized family
- **b** - Remote storage bandwidth optimized (the Eb subfamily, a SQL Server favourite)
- **96** - 96 vCPUs
- **d** - Local temp disk included
- **s** - Premium SSD capable
- **v5** - Version 5

### Standard_F8s_v2
- **F** - Compute optimized family
- **8** - 8 vCPUs
- **s** - Premium SSD capable
- **v2** - Version 2

### Standard_M16-4ms
- **M** - Memory optimized family
- **16** - 16 vCPUs in the base size
- **4** - Constrained to 4 active vCPUs
- **m** - Memory intensive
- **s** - Premium SSD capable
- No version segment - this is the first-generation M-series

### Standard_NC24ads_A100_v4
- **NC** - GPU accelerated family, compute-intensive subfamily
- **24** - 24 vCPUs
- **a** - AMD processor
- **d** - Local temp disk included
- **s** - Premium SSD capable
- **A100** - NVIDIA A100 GPU
- **v4** - Version 4

### Standard_D8pls_v6
- **D** - General purpose family
- **8** - 8 vCPUs
- **p** - Arm-based processor (Microsoft Cobalt)
- **l** - Low memory ratio
- **s** - Premium SSD capable
- **v6** - Version 6

## Quick Tips

1. **Premium Storage**: Look for the `s` suffix to ensure your VM supports premium SSDs for better performance.

2. **Local Temp Disk**: The `d` suffix indicates a local temporary disk is included, useful for page files or caching.

3. **CPU vendor**: No letter means Intel, `a` means AMD, and `p` means Arm. AMD and Arm sizes often provide better price-performance for scale-out workloads.

4. **Version Numbers**: Higher version numbers (v6, v7) typically offer better performance and newer features than older versions (v2, v3). The D and E families are on v7 today.

5. **Licensing**: Constrained vCPU sizes (`M16-4ms`, `E128-32ads_v7`) keep the memory and IO of the larger size while cutting per-core licensing costs.

## References

- [Azure VM Size Families](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes)
- [VM Size Naming Conventions](https://learn.microsoft.com/en-us/azure/virtual-machines/vm-naming-conventions)
- [Constrained vCPU capable VM sizes](https://learn.microsoft.com/en-us/azure/virtual-machines/constrained-vcpu)
