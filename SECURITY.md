# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Create a [private security advisory](https://github.com/endgor/azure-hub/security/advisories/new) on GitHub
3. Or email the repository maintainers directly

We take all security reports seriously and will respond as quickly as possible.

## Supported Versions

We provide security updates for the latest version of this project. Please ensure you are running the most recent version.

## Security Features

This project implements the following security measures:

- **Environment Variable Protection**: Sensitive credentials stored in environment variables only
- **Secure Authentication**: Azure AD integration using official `@azure/identity` library
- **CORS Protection**: Configured whitelist for API endpoints
- **Input Validation**: All user inputs validated before processing
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, and Content-Security-Policy configured
- **Production Console Stripping**: Automatic removal of console statements in production builds

## Best Practices for Deployment

When deploying this application:

1. Set all required environment variables in your deployment platform (e.g., Vercel)
2. Never commit `.env.local` or similar files to version control
3. Ensure HTTPS is enforced for all production traffic
4. Keep dependencies up to date with `npm audit`

For detailed environment variable configuration, see `.env.example`.
