# CLAUDE.md — Azure Hub

## Project Overview

Azure Hub ([azurehub.org](https://azurehub.org)) is a web application for Azure administrators and developers. Built with **Next.js 15** (Pages Router), **React 19**, **TypeScript**, and **Tailwind CSS**.

## Quick Reference

```bash
npm run dev              # Start dev server
npm run build            # Production build (runs validation, data fetch, sitemap generation)
npm run update-ip-data   # Refresh Azure IP ranges from Microsoft
npm run update-rbac-data # Refresh RBAC role definitions (requires Azure CLI login)
npm run generate-actions-index  # Rebuild action-to-role index from existing roles
npm run generate-ip-indexes     # Rebuild IP range search indexes
npm run fetch-entraid-roles     # Fetch Entra ID roles (requires Azure credentials)
npm run analyze          # Bundle analysis (or ANALYZE=true npm run build)
```

## Architecture

### Directory Structure

```
src/
├── pages/              # Next.js Pages Router
│   ├── api/            # API routes (server-side only)
│   ├── tools/          # Tool pages
│   ├── guides/         # Guide content pages
│   └── service-tags/   # Legacy redirects → /tools/service-tags
├── components/         # React components
│   ├── layout/         # Sidebar, SEOHead, ThemeToggle
│   ├── shared/         # Reusable UI (Button, SearchInput, ErrorBox, etc.)
│   ├── subnet/         # Subnet calculator components
│   ├── RbacCalculator/ # Azure RBAC mode tabs
│   ├── shared/RbacCalculator/  # Shared RBAC UI (SimpleMode, AdvancedMode, RoleCompareMode, etc.)
│   └── RoleCreator/    # Custom role builder
├── hooks/              # Custom React hooks
│   ├── rbac/           # useRbacMode, useAdvancedSearch, useServiceActions
│   └── subnet/         # useSubnetTree, useSubnetShare, useSubnetMetadata, useAzureVNetImport
├── lib/                # Core business logic
│   ├── server/         # Server-only RBAC logic
│   ├── subnet/         # Subnet math, tree operations, share link codec
│   ├── entraId/        # Entra ID role calculations and data
│   ├── tenant/         # Graph client, tenant metadata
│   ├── roleCreator/    # Custom role validation and export
│   ├── rbacConfig/     # RBAC configuration (Azure + Entra ID)
│   └── utils/          # Pattern matching, search, normalization
├── types/              # TypeScript type definitions (azure.ts, rbac.ts, tenant.ts, ipDiff.ts)
├── config/             # App constants (cache TTL, scoring weights, performance thresholds)
└── styles/             # Global styles

scripts/                # Build and data update scripts
public/data/            # Static Azure data files (IP ranges, RBAC roles, indexes)
content/guides/         # Markdown guide articles
```

### Key Patterns

- **Static generation** — All pages are statically generated. Only `pages/api/` contains server-side code.
- **Client/server separation** — `clientIpService.ts` for browser, `serverIpService.ts` for Node.js. Never import server modules from client code.
- **Data loading** — Client loads from `/data/*.json` with 6-hour caching. Server uses API routes.
- **Hooks by domain** — Hooks are grouped by feature (`hooks/rbac/`, `hooks/subnet/`).
- **Path alias** — `@/*` maps to `src/*`.
- **Dark mode** — Class-based via Tailwind. Custom color palette (Google-inspired light, Apple-inspired dark).

## Features / Tools

| Tool | Route | Description |
|------|-------|-------------|
| IP Lookup | `/tools/ip-lookup` | Check if an IP/CIDR/hostname belongs to Azure, with service tag and region filtering |
| Service Tags | `/tools/service-tags` | Browse Azure service tags and their IP ranges, with diff visualization |
| Tenant Lookup | `/tools/tenant-lookup` | Discover Entra ID tenant information |
| Subnet Calculator | `/tools/subnet-calculator` | Visual VNet subnet planner with splitting, coloring, Azure import, and URL sharing |
| RBAC Calculator | `/tools/azure-rbac-calculator` | Find least-privilege Azure roles (Simple, Advanced, Role Compare, Role Explorer modes) |
| Entra ID Roles | `/tools/entraid-roles-calculator` | Analyze Entra ID administrative role permissions |
| Custom Role Creator | (within RBAC calculator) | Build and export custom RBAC role definitions |
| Guides | `/guides/[category]/[slug]` | Markdown-based Azure guides |

## Data Files (public/data/)

| File | Purpose | Update Command |
|------|---------|----------------|
| `AzureCloud.json` | Public Azure IP ranges (~4 MB) | `npm run update-ip-data` |
| `AzureChinaCloud.json` | Azure China IP ranges | `npm run update-ip-data` |
| `AzureUSGovernment.json` | Azure Government IP ranges | `npm run update-ip-data` |
| `*-previous.json` | Previous versions for diff visualization | Auto-managed by update script |
| `roles-extended.json` | RBAC role definitions with permissions | `npm run update-rbac-data` |
| `actions-index.json` | Action-to-role index (enriched with provider operations) | `npm run generate-actions-index` |
| `service-tags-index.json` | Service tag search index | `npm run generate-ip-indexes` |
| `regions-index.json` | Azure region indexes | `npm run generate-ip-indexes` |
| `ip-diff.json` | IP range changes between releases | Auto-computed during build |
| `file-metadata.json` | Data file update timestamps | Auto-managed |

**Important:** `actions-index.json` eliminates expensive wildcard pattern matching at runtime. Always regenerate it after updating `roles-extended.json`.

## API Routes

| Endpoint | Purpose |
|----------|---------|
| `/api/ipLookup` | IP lookup with DNS resolution |
| `/api/dnsLookup` | DNS hostname resolution |
| `/api/tenantLookup` | Entra ID tenant information |
| `/api/rbac/calculate` | Server-side least privilege calculation |
| `/api/rbac/searchOperations` | RBAC action search |
| `/api/rbac/roles` | Role definitions retrieval |

All API routes use rate limiting via `src/lib/rateLimit.ts`.

## Environment Variables

```env
AZURE_TENANT_ID=        # Azure AD tenant (required for Entra ID features)
AZURE_CLIENT_ID=        # App registration client ID
AZURE_CLIENT_SECRET=    # App registration secret
AZURE_SUBSCRIPTION_ID=  # Azure subscription (for RBAC data updates)
```

Entra ID features require an Azure App Registration with `RoleManagement.Read.Directory` Microsoft Graph permission.

## Build Pipeline

The `npm run build` command runs these steps in order:
1. `validateData.js` — Verifies all required data files exist (fails build if missing)
2. `fetchEntraIdRolesIfPossible.js` — Conditionally fetches Entra ID roles if credentials available
3. `computeIpDiff.ts` — Calculates IP range changes between current and previous data
4. `next build` — Compiles the Next.js application
5. `generateSitemap.js` — Creates XML sitemap

## Configuration

- **TypeScript** — Strict mode, ES2020 target, incremental compilation
- **Next.js** — Trailing slashes enabled, security headers (HSTS, CSP, X-Frame-Options), www→non-www redirects
- **Tailwind** — Custom color palette, typography plugin for guide content
- **ESLint** — Next.js defaults + unused imports detection

## Debugging

```bash
ANALYZE=true npm run build         # Bundle analysis
DEBUG_UPDATE_IP_DATA=true npm run update-ip-data  # Verbose IP data update logging
```
