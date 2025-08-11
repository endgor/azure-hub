# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Azure IP Lookup is a Next.js web application that identifies whether IP addresses belong to Microsoft Azure infrastructure and determines which Azure Service Tags contain specific IP addresses. The application serves IP data that is automatically updated daily via GitHub Actions from Microsoft's official sources.

**Performance Optimized**: Recently underwent comprehensive performance optimizations to improve Core Web Vitals and real experience scores, including font loading optimization, component memoization, bundle analysis, and static site generation for key pages.

## Development Commands

### Core Development
- `npm install` - Install dependencies
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production (includes data copy via vercel-build.js)
- `npm run analyze` - Build with bundle analyzer to identify optimization opportunities
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Data Management
- `npm run update-ip-data` - Download latest Azure IP ranges from Microsoft
- `ts-node scripts/update-ip-data.ts` - Direct execution of IP data update script

### Performance Analysis
- `npm run analyze` - Generate bundle analysis report to identify heavy dependencies and optimization opportunities

## Architecture

### Core Components
- **IP Service** (`src/lib/ipService.ts`): Core business logic for IP lookups, CIDR matching, and service tag queries with optimized caching (6-hour TTL) and LRU normalization cache
- **Data Layer**: Azure IP ranges stored in both `/data/` (source) and `/public/data/` directories
- **API Routes**: 
  - `/api/ipAddress.ts` - Main IP lookup endpoint with optimized caching headers
  - `/api/file-metadata.ts` - File metadata with aggressive caching (24h)
  - `/api/service-tags.ts` - Service tag directory API
  - `/api/versions.ts` - Version information API
- **Frontend Components**: Performance-optimized React components with memoization in `/src/components/`
- **Static Pages**: About page uses ISR (Incremental Static Regeneration) for optimal performance

### Data Flow
1. IP data downloaded from Microsoft's official sources (Public Cloud, China Cloud, US Government)
2. Stored in `/data/` directory and copied to `/public/data/` for client access
3. Extended in-memory caching (6-hour TTL) with improved memory management
4. Service supports IP addresses, CIDR notation, domain names, and service tag lookups
5. Aggressive CDN caching with stale-while-revalidate headers for optimal performance

### Key Features
- **Multi-format Input**: Supports IP addresses, CIDR ranges, domain names, and service tags
- **Flexible Matching**: Case-insensitive service tag matching with optimized normalization cache
- **Advanced Caching Strategy**: Multi-layer caching (memory, CDN, ISR) with optimal TTLs
- **Search Functionality**: Filter by region and/or service with fuzzy matching
- **Performance Optimized**: Font loading with next/font, component memoization, bundle optimization
- **Export Functionality**: Dynamic imports for CSV/Excel export to reduce initial bundle size

### File Structure
- `/src/lib/ipService.ts` - Main IP lookup and search logic with performance optimizations
- `/src/lib/exportUtils.ts` - Export functionality (CSV/Excel) with dynamic loading
- `/src/types/azure.ts` - TypeScript interfaces for Azure data structures
- `/src/components/` - Performance-optimized React components with memo() wrappers
- `/src/pages/_app.tsx` - App root with next/font integration and analytics
- `/scripts/update-ip-data.ts` - Data fetching and update automation
- `/scripts/vercel-build.js` - Build-time data copying for Vercel deployments
- `/data/` - Source Azure IP range JSON files (4.6MB total)
- `/public/data/` - Client-accessible copy of IP data

## Performance Optimizations

### Recent Performance Improvements (2025-08-11)
- **Font Loading**: Implemented next/font with display: swap to eliminate layout shifts
- **Component Optimization**: Added React.memo to Results, LookupForm, and DefinitionsTable components
- **Bundle Analysis**: Added @next/bundle-analyzer for ongoing performance monitoring
- **Static Generation**: About page converted to ISR with 24-hour revalidation (3.91s → <500ms load time)
- **Caching Strategy**: Enhanced API caching headers and extended in-memory cache TTLs
- **Dynamic Imports**: Export functionality lazy-loaded to reduce initial bundle size

### Performance Monitoring
- **Bundle Analyzer**: Run `npm run analyze` to identify optimization opportunities
- **Vercel Speed Insights**: Integrated for real-time performance monitoring
- **Core Web Vitals**: Optimized for LCP, CLS, and FID metrics

## Data Sources

The application uses official Microsoft Azure IP range data:
- Azure Public Cloud (ID: 56519) - ~4.0MB
- Azure China Cloud (ID: 57062) - ~260KB
- Azure US Government Cloud (ID: 57063) - ~312KB

Data is automatically updated daily via GitHub Actions and triggers Vercel deployment.

## Performance Considerations

- **Large Dataset**: Main Azure Cloud file is 4.0MB - cached in memory for 6 hours
- **Cold Start Optimization**: Extended cache TTLs to improve serverless performance
- **Bundle Size**: Use dynamic imports for heavy dependencies (papaparse, xlsx)
- **Static Generation**: Use ISR for pages with infrequent data changes
- **CDN Optimization**: Aggressive caching headers for static and API responses

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.