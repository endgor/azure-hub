# Fetching Entra ID Roles for RBAC Calculator

This guide explains how to fetch all Entra ID (Azure AD) role definitions using your existing app registration.

## Prerequisites

You already have an Azure app registration configured for tenant lookup with these environment variables:
- `AZURE_CLIENT_ID` (or `GRAPH_CLIENT_ID`)
- `AZURE_CLIENT_SECRET` (or `GRAPH_CLIENT_SECRET`)
- `AZURE_TENANT_ID` (or `GRAPH_TENANT_ID`)

## Required API Permission

Your app registration needs the following **Microsoft Graph API permission**:

### Permission Details
- **API**: Microsoft Graph
- **Permission**: `RoleManagement.Read.Directory`
- **Type**: Application (not Delegated)
- **Admin Consent**: Required

### How to Add the Permission

1. Go to [Azure Portal](https://portal.azure.com) > **App registrations**
2. Find and select your app registration
3. Click **API permissions** in the left menu
4. Click **+ Add a permission**
5. Select **Microsoft Graph**
6. Select **Application permissions** (not Delegated)
7. Search for `RoleManagement.Read.Directory`
8. Check the box and click **Add permissions**
9. Click **Grant admin consent for [Your Tenant]** (requires Global Administrator or Privileged Role Administrator)
10. Confirm the consent dialog

## Fetching Entra ID Roles

Once the permission is granted, run:

```bash
npm run fetch-entraid-roles
```

This will:
1. Authenticate to Microsoft Graph using your app registration
2. Fetch all Entra ID role definitions (100+ built-in roles)
3. Calculate permission counts for each role
4. Save to `/public/data/entraid-roles.json`

## Expected Output

```
Starting Entra ID roles data fetch...

Fetching Entra ID role definitions from Microsoft Graph...
Request: GET https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions
✓ Fetched 107 Entra ID role definitions
Processing Entra ID role data and calculating permission counts...

Writing 107 Entra ID roles to /path/to/public/data/entraid-roles.json...
✓ Entra ID roles data saved successfully!

Summary:
  Total roles: 107
  Built-in roles: 107
  Custom roles: 0
  Enabled roles: 107

File saved: /path/to/public/data/entraid-roles.json
```

## Troubleshooting

### Error: Missing credentials
Make sure your environment variables are set:
```bash
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
```

### Error: 401 Unauthorized or 403 Forbidden
Your app registration is missing the required permission:
1. Add `RoleManagement.Read.Directory` (Application) permission
2. Grant admin consent
3. Wait a few minutes for the permission to propagate
4. Try again

### Error: 0 roles returned
Check that:
1. The permission was granted correctly
2. Admin consent was provided
3. You're using **Application** permissions, not Delegated

## What Gets Fetched

The script fetches all Entra ID roles including:

**Identity Management**
- Global Administrator
- Global Reader
- User Administrator
- Groups Administrator
- Guest Inviter

**Security & Compliance**
- Security Administrator
- Security Reader
- Compliance Administrator
- Helpdesk Administrator
- Password Administrator

**Application Management**
- Application Administrator
- Cloud Application Administrator
- Application Developer

**Directory Management**
- Directory Readers
- Directory Writers
- Hybrid Identity Administrator

**And 90+ more roles...**

Each role includes:
- Display name and description
- Role permissions (allowed/excluded actions)
- Built-in vs custom status
- Permission counts for least-privilege calculation

## Data Structure

The fetched data includes permission namespaces like:
- `microsoft.directory` - Directory objects (users, groups, apps)
- `microsoft.azure` - Azure services
- `microsoft.exchange` - Exchange Online
- `microsoft.sharepoint` - SharePoint Online
- `microsoft.teams` - Microsoft Teams
- `microsoft.intune` - Intune device management
- `microsoft.insights` - Monitoring and analytics
- `microsoft.office365` - Office 365 services

## Updating Roles

Entra ID roles are updated periodically by Microsoft. Re-run the fetch script to get the latest:
```bash
npm run fetch-entraid-roles
```

Consider fetching roles:
- Monthly - to stay current with new role definitions
- After major Azure updates
- When you notice missing roles in the calculator

## Local Development vs Production

### Local Development
Set environment variables in `.env.local`:
```
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
```

### Production (Vercel)
Environment variables are already configured for tenant lookup. The same credentials work for fetching roles.

## Security Notes

- The `RoleManagement.Read.Directory` permission is **read-only**
- It cannot create, modify, or delete roles
- It cannot assign roles to users
- It only reads role definitions and metadata
- This is the minimum permission needed for the RBAC Calculator

## Next Steps

After fetching roles:
1. Verify the data file was created: `public/data/entraid-roles.json`
2. Check the file size (should be 200-500 KB for all roles)
3. The RBAC Calculator will automatically use the new data
4. Test by searching for common permissions like `microsoft.directory/users/password/update`
