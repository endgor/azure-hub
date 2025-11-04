# Performance Baseline - Phase 3a

**Date**: 2025-11-04
**Target Function**: `extractActionsFromRoles` in `src/lib/clientRbacService.ts:113`

## Function Overview

The `extractActionsFromRoles` function is a critical performance bottleneck that:
- Processes all 808 Azure built-in roles
- Extracts and deduplicates thousands of actions
- Handles wildcard expansion (e.g., `Microsoft.Storage/*`)
- Tracks casing variants and role counts
- Caches results for 6 hours

## Current Implementation

**Complexity**: O(n*m*p) where:
- n = number of roles (~808)
- m = average permissions per role
- p = average actions per permission

**Key Operations**:
1. First pass: Collect explicit actions (line 127-149)
2. Second pass: Expand wildcards (line 151-186)
3. Third pass: Deduplicate and choose canonical casing (line 188-199)
4. Map construction with role counts

## Performance Characteristics

**Current Behavior**:
- ✅ Cached for 6 hours (prevents repeated computation)
- ✅ Uses lowercase normalization for deduplication
- ✅ Preloaded on page load via `requestIdleCallback`
- ⚠️ No memoization of intermediate results
- ⚠️ RegExp patterns created on every wildcard check

**Estimated Performance** (without profiling data):
- First run: ~100-500ms (uncached, processes all roles)
- Subsequent runs: <1ms (cached)
- Cache invalidation: 6 hours

## Recommended Optimizations (Phase 6)

### Only If Profiling Shows Bottleneck:

1. **Pre-compile RegExp patterns** (line 173-183)
   ```typescript
   // Instead of: new RegExp('^' + wildcardAction.replace(...)...)
   // Use: Pre-compiled patterns with Map<string, RegExp>
   ```

2. **Memoize wildcard expansions**
   ```typescript
   const wildcardCache = new Map<string, Set<string>>();
   ```

3. **Consider WebWorker for initial processing**
   - Move role processing to background thread
   - Only if initial load time >500ms

### Current Cache Strategy (Already Good):
- 6-hour TTL is reasonable
- requestIdleCallback prevents UI blocking
- Cache key based on role definitions

## Measurement Strategy

**Before optimizing**, measure actual performance:

```typescript
// Add to function start:
const start = performance.now();

// Add before return:
const duration = performance.now() - start;
console.log(`extractActionsFromRoles took ${duration}ms`);
```

**Success Criteria**:
- Initial load: <200ms
- Cached load: <5ms
- No UI freezing during extraction

## Notes

- Function is already well-optimized with caching
- **DO NOT optimize without profiling data**
- Current implementation may already be fast enough
- Focus optimization efforts on proven bottlenecks only

## Next Steps

1. Add performance.mark() calls in production
2. Collect real-world timing data
3. Only optimize if >200ms consistently
4. Consider WebWorker only if >500ms
