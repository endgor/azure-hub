# Architecture

## Directory Structure

```
src/
├── pages/           # Next.js routes
│   ├── index.tsx    # Homepage
│   ├── api/         # API routes (server-side)
│   ├── tools/       # Tool pages (ip-lookup, tenant-lookup, subnet-calculator, rbac-calculator)
│   └── service-tags/# Service tag browser
├── components/      # React components
├── hooks/           # Custom React hooks
│   ├── rbac/        # RBAC calculator hooks
│   ├── subnet/      # Subnet calculator hooks
│   └── roleCreator/ # Role creator hooks
├── lib/             # Core business logic
│   ├── server/      # Server-only utilities
│   ├── entraId/     # Entra ID integration
│   └── subnet/      # Subnet calculation logic
└── types/           # TypeScript definitions (azure.ts, rbac.ts)

scripts/             # Build and data update scripts
public/data/         # Static Azure data files
docs/                # Setup guides
```

## Key Patterns

### Data Loading
- Client-side: Load from `/data/*.json` with caching
- Server-side: API routes in `pages/api/` only

### Service Separation
- `clientIpService.ts` - Browser-safe IP operations
- `serverIpService.ts` - Node.js IP operations

### Hooks Organization
Domain-specific hooks are grouped by feature:
- `useRbacMode`, `useServiceActions` - RBAC features
- `useSubnetTree`, `useSubnetShare` - Subnet calculator
- `useLocalStorageState` - SSR-safe localStorage wrapper

### Static Generation
All pages are statically generated. Only `pages/api/` contains server-side code.

## Configuration

- **TypeScript**: Strict mode, `@/*` path alias for `src/`
- **Tailwind**: Dark mode with custom color theme
- **Next.js**: Security headers, redirects, bundle analyzer support
- **ESLint**: Next.js defaults + unused imports detection
