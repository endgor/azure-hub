# Azure Hub

A collection of tools for Azure administrators and developers: IP lookups, RBAC calculators, subnet planning, and tenant discovery.

**Live site:** [azurehub.org](https://azurehub.org)

## Features

- **IP Lookup** - Check if an IP belongs to Azure and which services use it
- **Service Tags** - Browse Azure service tags and their IP ranges
- **Tenant Discovery** - Look up Entra ID tenant information by domain
- **Subnet Calculator** - Plan VNet subnets with visual splitting and export to Excel/CSV
- **RBAC Calculator** - Find least-privilege Azure roles for required permissions
- **Entra ID Roles** - Analyze Entra ID administrative role permissions
- **Custom Role Creator** - Build custom RBAC role definitions

## Running Locally

```bash
git clone https://github.com/yourusername/azure-hub.git
cd azure-hub
npm install
npm run update-ip-data
npm run update-rbac-data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional: Entra ID Features

**Tenant Lookup** requires an Azure App Registration with:
- `User.Read.All` or `Directory.Read.All` (Microsoft Graph)

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
- `npm run update-ip-data` - Refresh Azure IP ranges
- `npm run update-rbac-data` - Refresh RBAC data
- `npm run fetch-entraid-roles` - Fetch Entra ID roles (requires credentials)

## Tech Stack

Next.js 15, React 19, TypeScript, Tailwind CSS

## Data Sources

- Azure IP ranges from [Microsoft Download Center](https://www.microsoft.com/download/details.aspx?id=56519)
- RBAC definitions via Azure CLI
- Entra ID roles via Microsoft Graph API

## Disclaimer

This project is not affiliated with Microsoft Corporation. Azure, Entra ID, and Microsoft Graph are trademarks of Microsoft Corporation. Use at your own risk.

## License

MIT
