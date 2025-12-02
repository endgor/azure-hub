# API Reference

## Tenant Lookup API

**Endpoint:** `/api/tenantLookup`

Fetches Azure tenant information using Microsoft Graph API.

### Required Environment Variables

```env
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
```

Requires an Azure AD app registration with `RoleManagement.Read.Directory` permission for Entra ID features.

## Rate Limiting

All API endpoints use rate limiting via `src/lib/rateLimit.ts`.

**Configuration:**
- `RATE_LIMIT_REQUESTS` - Max requests per window (default varies by endpoint)
- `RATE_LIMIT_WINDOW_MS` - Window duration in milliseconds

## Debugging

**Bundle Analysis:**
```bash
npm run analyze
# or
ANALYZE=true npm run build
```

**IP Data Update Logging:**
```bash
DEBUG_UPDATE_IP_DATA=true npm run update-ip-data
```
