# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it by creating a private security advisory on GitHub or by emailing the repository maintainers directly. Please do not disclose security vulnerabilities publicly until they have been addressed.

## Security Measures

This project implements several security best practices:

### 1. Credential Management

- **Environment Variables**: All sensitive credentials (Azure AD app registration) are stored in environment variables, never hardcoded
- **No Secrets in Logs**: Error messages are sanitized to prevent credential leakage
- **Production Console Stripping**: All `console.*` calls are automatically removed in production builds
- **Generic Error Messages**: API endpoints return user-friendly errors without exposing internal details

### 2. Authentication & Authorization

- **Azure AD Integration**: Uses `@azure/identity` with ClientSecretCredential for secure authentication
- **Token Caching**: Credentials cached at module level to minimize exposure
- **Credential Validation**: Missing or invalid credentials fail gracefully with generic error messages

### 3. API Security

- **CORS Protection**: Whitelist-based CORS configuration for tenant lookup API
  - Defaults to localhost only
  - Requires explicit configuration via `TENANT_LOOKUP_ALLOWED_ORIGINS` for additional origins
- **Input Validation**:
  - Domain validation using strict regex patterns
  - Service tag name validation to prevent injection attacks
  - SQL injection protection via single-quote escaping
- **Security Headers**: Configured in `staticwebapp.config.json`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy` with restricted directives

### 4. Data Processing

- **Service Tag Validation**: All Azure service tags are validated before being stored
  - Only alphanumeric characters, dots, underscores, and hyphens allowed
  - Invalid tags are logged and rejected
- **Manual Excel Generation**: Excel files are generated using `jszip` with custom XML construction
  - No use of potentially vulnerable parsing libraries
  - Full control over output format and content

### 5. Dependency Management

- **No Known High-Severity Vulnerabilities**: Regular dependency audits via `npm audit`
- **Minimal Dependencies**: Only essential packages are included
- **Automated Updates**: Consider using Dependabot or Snyk for automated vulnerability scanning

### 6. Client-Side Security

- **No Sensitive Data Exposure**: Client-side code only uses public APIs
- **Server-Side API Routes**: All authentication happens server-side
- **Local Storage**: Only non-sensitive user preferences stored (tenant lookup history)

## Security Configuration

### Required Environment Variables

Set these in your deployment platform (e.g., Vercel):

```bash
# Azure AD App Registration (required for tenant lookup)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Optional: CORS configuration
TENANT_LOOKUP_ALLOWED_ORIGINS=https://yourdomain.com
```

### Security Checklist for Deployment

- [ ] All environment variables are set in the deployment platform
- [ ] No `.env.local` files are committed to version control
- [ ] `DEBUG_UPDATE_IP_DATA` is not set in production
- [ ] CORS origins are explicitly configured (not using wildcards)
- [ ] HTTPS is enforced for all production traffic
- [ ] Security headers are enabled (verify `staticwebapp.config.json`)
- [ ] Dependencies are up to date (`npm audit`)

## Known Limitations & Recommendations

### Current State

✅ **Implemented**:
- Environment variable protection
- Input validation
- CORS protection
- Security headers
- Service tag sanitization
- Console log stripping in production

⚠️ **Recommended Improvements**:
1. **Rate Limiting**: Add rate limiting to `/api/tenantLookup` to prevent abuse
2. **Request Logging**: Implement security audit logging for API requests
3. **Content Security Policy Reporting**: Add CSP reporting endpoint
4. **Automated Dependency Scanning**: Set up Dependabot or Snyk
5. **Security.txt**: Add a security.txt file per RFC 9116

### Rate Limiting Recommendation

The tenant lookup API currently has no rate limiting. Consider implementing:

```typescript
// Example rate limiting middleware
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});
```

## Security Best Practices for Contributors

1. **Never commit secrets**: Always use environment variables
2. **Validate all inputs**: Use regex patterns and type checking
3. **Sanitize error messages**: Don't expose internal details in API responses
4. **Test security changes**: Verify CORS, headers, and input validation
5. **Keep dependencies updated**: Run `npm audit` before submitting PRs
6. **Review security implications**: Consider the security impact of all code changes

## Version Support

We release security updates for the latest version only. Please ensure you are running the most recent version of this project.

## Contact

For security concerns, please create a private security advisory on GitHub.
