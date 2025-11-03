RBAC Calculator Refactoring Plan

## Sequencing Strategy (Based on Code Review Feedback)

**Key Principle**: Test infrastructure must be in place BEFORE high-risk refactors (Phases 4-5). Low-risk utility extraction (Phase 1) can proceed immediately to build confidence and reduce duplication. Measure performance before optimizing (Phase 6).

**Critical Dependencies**:
- Phase 3a (Test Infrastructure) MUST complete before Phase 4 (Export Consolidation) and Phase 5 (Component Splits)
- Bundle size baseline must be captured before Phase 4
- Performance profiling required before Phase 6

## Phase 1: Extract Shared Utilities (Low Risk - START HERE)

 1. Create /src/lib/downloadUtils.ts - Consolidate 4 duplicate file download implementations
 2. Create /src/lib/filenameUtils.ts - Extract timestamp generation and pluralization logic
 3. Share calculatePermissionCount - Move to shared location, import in both rbacService.ts and update-rbac-data.ts
 4. Create /src/config/privilegedRoles.ts - Move hardcoded PRIVILEGED_ROLES list with documentation

 Phase 2: Create Reusable UI Components (Medium Risk)

 5. Create /src/components/shared/DismissibleBanner.tsx - Generic dismissible banner with localStorage
 6. Create /src/components/shared/SearchDropdown.tsx - Generic search dropdown with results
 7. Create /src/components/shared/Chip.tsx - Tag component with remove button
 8. Create /src/components/shared/LoadingSpinner.tsx - Spinner with size variants

 Phase 3: Extract Custom Hooks (Medium Risk)

 9. Create /src/hooks/useClickOutside.ts - Consolidate click-outside handlers (used 4+ times)
 10. Create /src/hooks/useTableSort.ts - Extract table sorting logic
 11. Create /src/hooks/useLocalStorageState.ts - localStorage state management with SSR guards

 Phase 3a: Test Infrastructure (REQUIRED BEFORE PHASE 4+)

 12. Set up testing framework (Jest/Vitest + React Testing Library)
 13. Add integration tests for RBAC calculator modes (scope-based, role-based, custom)
 14. Add regression tests for export functions (CSV/JSON/Excel formats)
 15. Capture bundle-size baseline with `npm run analyze`
 16. Profile current performance for extractActionsFromRoles

 Phase 4: Consolidate Export Logic (Higher Risk - REQUIRES PHASE 3a)

 17. Migrate exportUtils.ts to SheetJS - Replace custom JSZip implementation with xlsx library
 18. Deduplicate export functions - Merge similar functions between exportUtils.ts and rbacExportUtils.ts
 19. Lazy load xlsx library - Code-split for better initial load performance

 Phase 5: Split Large Components (Higher Risk - REQUIRES PHASE 3a)

 20. Split RoleCreator (1,012 lines) into:
   - /src/components/RoleCreator/index.tsx (orchestrator)
   - /src/components/RoleCreator/RoleInformationSection.tsx
   - /src/components/RoleCreator/ImportRoleSection.tsx
   - /src/components/RoleCreator/PermissionsSection.tsx
   - /src/components/RoleCreator/TemplateSelector.tsx
   - /src/hooks/useRoleCreator.ts (state management)
 21. Refactor rbac-calculator.tsx (918 lines) into mode components:
   - /src/components/RbacCalculator/SimpleMode.tsx
   - /src/components/RbacCalculator/AdvancedMode.tsx
   - /src/components/RbacCalculator/RoleExplorerMode.tsx
   - /src/components/RbacCalculator/shared/ (ExampleScenarios, DisclaimerBanner)
 22. Refactor RolePermissionsTable - Use shared ExportDropdown component instead of custom dropdown

 Phase 6: Performance Optimizations (Measure First - Requires Phase 3a Profiling)

 23. Optimize extractActionsFromRoles - Add memoization, pre-compile RegExp patterns (only if profiling shows benefit)
 24. Add memoization to RoleCreator - Wrap expensive computations (totalPermissions, hasDuplicates)
 25. Extract magic numbers - Create constants for cache TTL, permission scoring

 Estimated Impact:
 - ~600 lines of code reduction through deduplication
 - 2 large components → 11 focused components
 - Improved bundle size (single Excel implementation)
 - Better maintainability and testability

---

## Changelog

### 2025-11-03 - Phase 2 Complete ✅
**Completed Items:**
- [x] Phase 2.1: Created `src/components/shared/DismissibleBanner.tsx` (commit 776387a)
  - Dismissible banner with localStorage persistence
  - 4 color variants (info, warning, success, error)
  - SSR-safe with controlled/uncontrolled modes
  - Optional title and custom dismiss callback

- [x] Phase 2.2: Created `src/components/shared/SearchDropdown.tsx` (commit 776387a)
  - Generic search dropdown with type-safe results
  - Click-outside detection with automatic cleanup
  - Loading and empty states
  - Controlled/uncontrolled dropdown visibility
  - Custom styling and max-height support

- [x] Phase 2.3: Created `src/components/shared/Chip.tsx` (commit 776387a)
  - Flexible chip/tag component with remove button
  - 5 color variants and 3 size variants
  - Optional icon and click handlers
  - Keyboard accessible with stop propagation

- [x] Phase 2.4: Created `src/components/shared/LoadingSpinner.tsx` (commit 776387a)
  - Loading spinner with 5 sizes and 4 colors
  - Optional label and centered layout
  - Full accessibility (ARIA, sr-only)

**Phase 2 Summary:**
- **New components**: 4 shared UI components created
- **Total lines added**: ~685 lines of reusable code
- **Build status**: ✅ All builds passing
- **Features**: Dark mode, TypeScript, accessibility, SSR-safe
- **Documentation**: Comprehensive JSDoc with usage examples

**Ready for Phase 3:**
- Foundation laid for extracting custom hooks
- Components ready to replace inline implementations
- Consistent patterns established for UI elements

### 2025-11-03 - Phase 1 Complete ✅
**Completed Items:**
- [x] Phase 1.1: Created `src/lib/downloadUtils.ts` (commit b09a2e9)
  - Consolidated 4 duplicate file download implementations
  - Added convenience functions: downloadJSON, downloadCSV, downloadExcel
  - Updated exportUtils.ts, rbacExportUtils.ts, RoleCreator.tsx
  - Removed ~60 lines of duplicate code

- [x] Phase 1.2: Created `src/lib/filenameUtils.ts` (commit b09a2e9)
  - Extracted timestamp generation and pluralization logic
  - Added helpers: getDateTimestamp, sanitizeForFilename, pluralize
  - Created filename generators: generateQueryFilename, generateCountFilename, generateNameFilename
  - Updated exportUtils.ts and rbacExportUtils.ts to use shared utilities

- [x] Phase 1.3: Created `src/lib/rbacUtils.ts` (commit 3d0b24c)
  - Shared calculatePermissionCount between client and scripts
  - Node-safe implementation with minimal type requirements
  - Updated rbacService.ts to import and re-export
  - Updated scripts/update-rbac-data.ts to use shared function
  - Removed ~85 lines of duplicate code
  - Verified: Successfully computes permissions for 808 roles

- [x] Phase 1.4: Created `src/config/privilegedRoles.ts` (commit 1cde1a5)
  - Centralized PRIVILEGED_ROLES constant with 16 privileged roles
  - Added comprehensive documentation and best practices
  - Created helpers: isPrivilegedRole, getPrivilegedRoles, countPrivilegedRoles
  - Updated RolePermissionsTable.tsx to use shared config
  - Removed ~27 lines of duplicate code

**Phase 1 Summary:**
- **Code reduction**: ~172 lines removed through deduplication
- **New utilities**: 4 shared modules created (downloadUtils, filenameUtils, rbacUtils, privilegedRoles)
- **Build status**: ✅ All builds passing
- **Test status**: ✅ Script validation successful (808 roles processed)
- **Commits**: 4 focused commits created

**What to Test Manually:**
- RBAC Calculator: Verify all 4 modes work (scope-based, role-based, custom, role explorer)
- Export functions: Test JSON/CSV/Excel export from RBAC Calculator and Role Permissions Table
- Role Creator: Test custom role export with filename generation
- Privileged role warnings: Verify warning banner appears when selecting Owner/Contributor roles

### 2025-11-03 - Refactor Plan Updated
- Added sequencing strategy based on code review feedback
- Inserted Phase 3a (Test Infrastructure) as blocker for high-risk phases
- Updated Phase 6 to require profiling before optimization
- Added SSR considerations for hooks (Phase 3)
- Renumbered items to accommodate new phase
