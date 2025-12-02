# Data Management

This document covers the Azure data files used by the application.

## Azure IP Data

Located in `public/data/`:
- `AzureCloud.json` - Public Azure IP ranges
- `AzureChinaCloud.json` - Azure China IP ranges
- `AzureUSGovernment.json` - Azure Government IP ranges
- `file-metadata.json` - Last update timestamps

**Update command:** `npm run update-ip-data`

This downloads from Microsoft Download Center using IDs defined in `scripts/updateIpData.ts`.

Data is loaded client-side with a 6-hour cache (`src/lib/clientIpService.ts:20-26`).

## Azure RBAC Data

Located in `public/data/`:
- `roles-extended.json` - Full role definitions with permissions
- `permissions.json` - All available Azure permissions
- `actions-cache.json` - Pre-computed action-to-role mappings

**Update commands:**
- `npm run update-rbac-data` - Fetches fresh data (requires Azure CLI login)
- `npm run generate-actions-cache` - Rebuilds cache from existing roles (no Azure CLI)

### Performance Note

The `actions-cache.json` eliminates expensive wildcard pattern matching at runtime. Regenerate it whenever `roles-extended.json` is updated.

## Build Validation

`scripts/validateData.js` runs during build to ensure all required data files exist. Build fails if data is missing.
