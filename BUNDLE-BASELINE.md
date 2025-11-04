# Bundle Size Baseline - Phase 3a

**Date**: 2025-11-04
**Git Commit**: Prior to Phase 4-6 refactoring
**Next.js Version**: 15.5.6

## Page Bundle Sizes

| Route | Size | First Load JS | Type |
|-------|------|---------------|------|
| / (Homepage) | 1.64 kB | **114 kB** | Static |
| /404 | 1.02 kB | 113 kB | Static |
| /about | 1.95 kB | 114 kB | SSG |
| /tools/ip-lookup | 3.63 kB | 136 kB | Static |
| **/tools/rbac-calculator** | **111 kB** | **223 kB** | Static |
| /tools/service-tags | 2.77 kB | 130 kB | Static |
| /tools/service-tags/[serviceTag] | 2.02 kB | 134 kB | Static |
| /tools/subnet-calculator | 9.08 kB | 121 kB | Static |
| /tools/tenant-lookup | 2.64 kB | 115 kB | Static |

## Shared JavaScript

- **Total Shared**: 111 kB
  - `framework-292291387d6b2e39.js`: 59.7 kB
  - `main-89cdeaff6676ceb0.js`: 36.4 kB
  - Other shared chunks: 15.3 kB

## Key Observations

1. **RBAC Calculator is the largest page**: 223 kB First Load JS
   - Page-specific code: 111 kB
   - This is the primary target for optimization in Phase 4-6

2. **Baseline established before**:
   - Phase 4: Export Logic Consolidation
   - Phase 5: Component Splits
   - Phase 6: Performance Optimizations

3. **Expected improvements from refactoring**:
   - Phase 4 should reduce bundle size by migrating to single Excel library (xlsx)
   - Phase 5 should enable better code splitting for RoleCreator (1,012 lines)
   - Lazy loading xlsx library could reduce initial load

## Next Steps

- Monitor bundle size changes after each phase
- Re-run `npm run analyze` after Phase 4, 5, and 6
- Target: Reduce RBAC Calculator First Load JS below 200 kB
