# Testing Guide for Developer Findings Fixes

This guide helps you verify that all fixes are working correctly in your development environment.

## Pre-Testing Setup

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Generate data files** (if missing):
   ```bash
   npm run update-ip-data
   npm run update-rbac-data
   npm run generate-actions-cache
   npm run generate-ip-indexes
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser** to http://localhost:3000

---

## Test #1: Data Mutation Leak Fix ✅

**What was fixed**: `checkIpAddress` now returns cloned objects to prevent cache pollution.

### Test Scenario A: DNS Lookup Followed by Service Search

**Steps**:
1. Navigate to `/tools/ip-lookup`
2. Search for a hostname: `myaccount.blob.core.windows.net`
   - This performs DNS resolution and mutates results with `resolvedFrom` and `resolvedIp`
3. Clear the search box
4. Search for a service: `Storage` (without any IP/hostname)
5. **Expected**: Results should NOT contain `resolvedFrom` or `resolvedIp` fields
6. **Verify**: Check browser DevTools Console - no stale DNS fields should appear

### Test Scenario B: Multiple Hostname Lookups

**Steps**:
1. Search: `github.com` → Note the resolved IPs shown
2. Clear and search: `google.com` → Note different IPs
3. Search again: `github.com`
4. **Expected**: Should show the same IPs as step 1 (not polluted by google.com data)

### How to Verify
Open browser DevTools → Console tab, and add this to check results:
```javascript
// After search completes, inspect the results
console.log('Results:', results);
// Check if resolvedFrom appears when it shouldn't
```

**✅ PASS**: Service searches don't show DNS metadata
**❌ FAIL**: Service searches include `resolvedFrom`/`resolvedIp` fields from previous DNS queries

---

## Test #2: Canonical URL Fix ✅

**What was fixed**: Layout now uses `router.asPath` instead of `router.pathname` for dynamic routes.

### Test Scenario: Service Tag Detail Pages

**Steps**:
1. Navigate to `/tools/service-tags`
2. Click on any service tag (e.g., "Storage")
3. You should land on `/tools/service-tags/Storage`
4. **View Page Source** (Right-click → View Page Source)
5. Search for `<link rel="canonical"`

### Expected Canonical URLs

**✅ CORRECT**:
```html
<link rel="canonical" href="https://azurehub.org/tools/service-tags/Storage/" />
```

**❌ WRONG** (old behavior):
```html
<link rel="canonical" href="https://azurehub.org/tools/service-tags/[serviceTag]/" />
```

### Test Multiple Routes

Verify canonical URLs on these pages:

| Page | Expected Canonical |
|------|-------------------|
| `/` | `https://azurehub.org/` |
| `/tools/ip-lookup` | `https://azurehub.org/tools/ip-lookup/` |
| `/tools/service-tags/Storage` | `https://azurehub.org/tools/service-tags/Storage/` |
| `/tools/rbac-calculator` | `https://azurehub.org/tools/rbac-calculator/` |

### Additional Check: Query Parameters

1. Navigate to `/tools/ip-lookup?ipOrDomain=1.2.3.4`
2. View page source
3. **Expected**: Canonical URL should NOT include `?ipOrDomain=1.2.3.4`
4. **Should be**: `https://azurehub.org/tools/ip-lookup/`

**✅ PASS**: Canonical URLs show actual paths, not templates
**❌ FAIL**: Canonical URLs contain `[serviceTag]` or query parameters

---

## Test #3: Rate Limiting Documentation ✅

**What was fixed**: Added comprehensive documentation about per-instance limitation.

### Test Scenario: Review Documentation

**Steps**:
1. Open `/docs/RATE_LIMITING.md`
2. Verify it contains:
   - ⚠️ Warning about per-instance limitation
   - Migration path to distributed solutions (Vercel KV, Upstash)
   - Configuration options

### Test Rate Limiter in Dev

**Steps**:
1. Navigate to `/tools/tenant-lookup` or any API-using page
2. Open DevTools → Network tab
3. Make 15+ rapid requests (refresh or re-submit form quickly)
4. **Expected**: After ~10 requests, you should see 429 (Rate Limit) responses
5. Check DevTools Console for warning message:
   ```
   [RateLimit] Using in-memory rate limiter in distributed environment...
   ```

### Verify Warning Appears in Production Mode

**Steps**:
```bash
npm run build
npm start
```

Check terminal output - should see rate limiter warning if VERCEL or AWS env vars are set.

**✅ PASS**: Documentation exists, warnings appear in production
**❌ FAIL**: No documentation or warnings

---

## Test #4: Performance Optimization Setup ✅

**What was fixed**: Created index generation script and documentation.

### Test Scenario: Generate Index Files

**Steps**:
1. Run the index generation script:
   ```bash
   npm run generate-ip-indexes
   ```

2. **Expected output**:
   ```
   Starting IP data indexes generation...

   Reading data from /path/to/public/data/AzureCloud.json...
   ✓ Loaded X service tags

   Generating service tags index...
   ✓ Generated index with X service tags
     Saved to: /path/to/public/data/service-tags-index.json
     Size: ~50 KB (98.7% smaller)

   Generating regions index...
   ✓ Generated index with X regions
     Saved to: /path/to/public/data/regions-index.json
     Size: ~5 KB (99.9% smaller)
   ```

3. **Verify files exist**:
   ```bash
   ls -lh public/data/service-tags-index.json
   ls -lh public/data/regions-index.json
   ```

4. **Check file sizes**:
   - `service-tags-index.json` should be ~50-100 KB
   - `regions-index.json` should be ~5-10 KB
   - Both much smaller than `AzureCloud.json` (~3.9 MB)

### Test Index File Content

**Steps**:
1. Open `public/data/service-tags-index.json`
2. Verify structure:
   ```json
   [
     {
       "id": "ActionGroup",
       "systemService": "Microsoft.Insights",
       "region": "westus",
       "prefixCount": 4
     },
     ...
   ]
   ```
3. **Should NOT contain**: Actual IP addresses or CIDR ranges
4. **Should contain**: Metadata only (names, counts, regions)

**✅ PASS**: Index files generated successfully, contain metadata only
**❌ FAIL**: Script fails, or indexes contain full IP lists

---

## Test #5: Overall Functionality Check

Verify the app still works correctly after all changes.

### IP Lookup Tool
1. **Test IP**: `40.112.127.224` → Should find Azure services
2. **Test CIDR**: `74.7.51.32/29` → Should find matching ranges
3. **Test Hostname**: `github.com` → Should resolve and find matches
4. **Test Service**: `Storage` → Should list Storage-related IPs
5. **Test Region**: `WestEurope` → Should list West Europe IPs

### Service Tags Tool
1. Navigate to `/tools/service-tags`
2. Click on a service tag → Detail page loads
3. Verify canonical URL in page source (see Test #2)

### RBAC Calculator
1. Navigate to `/tools/rbac-calculator`
2. Search for an action: `Microsoft.Storage/storageAccounts/read`
3. Should load results without errors

### Performance Check (DevTools)
1. Open DevTools → Network tab
2. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Check loaded files:
   - `AzureCloud.json` (~3.9 MB) - should load
   - `roles-extended.json` (~1.4 MB) - should load
4. Check Console for errors → Should be none

---

## Regression Testing

Ensure nothing broke:

### Navigation
- [ ] All menu items work
- [ ] Dark mode toggle works
- [ ] Mobile menu works

### Search Functionality
- [ ] IP lookup returns results
- [ ] Service tag search works
- [ ] RBAC search returns roles
- [ ] No console errors during searches

### Data Loading
- [ ] Pages load within reasonable time (<5s on fast connection)
- [ ] No infinite loading spinners
- [ ] Error messages appear if data fails to load

---

## Browser Compatibility

Test on multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)
- [ ] Mobile browsers (Chrome Mobile, Safari iOS)

---

## Production Deployment Checklist

Before deploying to production:

1. **Run all tests above** in development ✅
2. **Build succeeds**:
   ```bash
   npm run build
   ```
3. **Generate indexes** (add to build script if desired):
   ```bash
   npm run generate-ip-indexes
   ```
4. **Verify bundle size** hasn't increased significantly:
   ```bash
   npm run analyze
   ```
5. **Test production build locally**:
   ```bash
   npm start
   ```
6. **Deploy to staging** (if available) and test
7. **Monitor for errors** in production logs after deployment

---

## Troubleshooting

### Issue: "Cannot read property of undefined"
**Solution**: Make sure data files are generated:
```bash
npm run update-ip-data
npm run update-rbac-data
```

### Issue: Canonical URLs still show `[serviceTag]`
**Solution**: Hard refresh the page (Ctrl+Shift+R) or clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

### Issue: Index generation fails
**Solution**: Ensure `AzureCloud.json` exists:
```bash
npm run update-ip-data
npm run generate-ip-indexes
```

### Issue: Rate limiting not working
**Solution**: Rate limiter is per-instance. In dev, you're hitting the same instance, so it should work. In production on Vercel, see `/docs/RATE_LIMITING.md` for distributed solutions.

---

## Success Criteria

All fixes are working correctly if:

1. ✅ DNS lookups don't pollute cache (Test #1)
2. ✅ Canonical URLs use actual paths (Test #2)
3. ✅ Rate limiting is documented and warns in prod (Test #3)
4. ✅ Index files generate successfully (Test #4)
5. ✅ All core functionality still works (Test #5)
6. ✅ No console errors during normal usage
7. ✅ Build completes without errors

---

## Questions or Issues?

If any tests fail:
1. Check console for errors
2. Review the specific fix in the code
3. Check documentation:
   - `/docs/RATE_LIMITING.md`
   - `/docs/PERFORMANCE_OPTIMIZATION.md`
4. Report issues with detailed error messages
