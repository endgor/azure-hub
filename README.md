# Azure Hub

A collection of tools for Azure administrators and developers: IP lookups, RBAC calculators, subnet planning, and tenant discovery.

**Live site:** [azurehub.org](https://azurehub.org)

## Features

- **IP Lookup** - Check if an IP belongs to Azure and which services use it
- **Service Tags** - Browse Azure service tags and their IP ranges
- **IP Changes** - Track modifications to Azure IP ranges between updates
- **Tenant Discovery** - Look up Entra ID tenant information by domain
- **Subnet Calculator** - Plan VNet subnets with visual splitting and export to Excel/CSV
- **RBAC Calculator** - Find least-privilege Azure roles for required permissions
- **Entra ID Roles** - Analyze Entra ID administrative role permissions
- **Custom Role Creator** - Build custom RBAC role definitions
- **Private DNS Zones** - Look up Azure Private Endpoint DNS zone configurations
- **Guides** - Azure guides and tutorials

## Running Locally

```bash
git clone https://github.com/endgor/azure-hub.git
cd azure-hub
npm install
npm run update-ip-data
npm run update-rbac-data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional: Entra ID Features

**Tenant Lookup** requires an Azure App Registration with:
- `CrossTenantInformation.ReadBasic.All` (Microsoft Graph)

**Entra ID Roles** requires:
- `RoleManagement.Read.Directory` (Microsoft Graph)

Add credentials to `.env.local`:
```env
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

Then run: `npm run fetch-entraid-roles`

## Commands

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview the app in the Cloudflare Workers runtime
- `npm run deploy` - Deploy the production Worker to Cloudflare
- `npm run deploy:preview` - Deploy the preview Worker to Cloudflare
- `npm run update-ip-data` - Refresh Azure IP ranges
- `npm run update-rbac-data` - Refresh RBAC data
- `npm run fetch-entraid-roles` - Fetch Entra ID roles (requires credentials)
- `npm run update-private-dns-zones` - Refresh Private DNS zone data

## Tech Stack

Next.js 15, React 19, TypeScript, Tailwind CSS

## Cloudflare Deployment

This repository is configured to deploy to Cloudflare Workers using OpenNext.

- Production Worker: `azure-hub`
- Preview Worker: `azure-hub-preview`
- Runtime config: [wrangler.jsonc](/Users/ender/Repos/personal/azure-hub/wrangler.jsonc)
- OpenNext config: [open-next.config.ts](/Users/ender/Repos/personal/azure-hub/open-next.config.ts)

GitHub Actions deploys:

- `main` to the production Worker
- `codex/cloudflare-migration` to the preview Worker

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Runtime secrets such as `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `RESEND_API_KEY`, and `INDEXNOW_SECRET` should be configured in Cloudflare for each Worker environment before go-live.

## Data Sources

- Azure IP ranges from [Microsoft Download Center](https://www.microsoft.com/download/details.aspx?id=56519)
- RBAC definitions via Azure CLI
- Entra ID roles via Microsoft Graph API

## Disclaimer

This project is not affiliated with Microsoft Corporation. Azure, Entra ID, and Microsoft Graph are trademarks of Microsoft Corporation. Use at your own risk.

## License

MIT
