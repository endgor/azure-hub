/**
 * Server-side RBAC service - backward compatibility layer.
 *
 * This file re-exports all functions from the modular server RBAC library.
 * The actual implementation has been split into focused modules in src/lib/server/.
 *
 * All existing imports from '@/lib/serverRbacService' will continue to work.
 */

// Re-export everything from the modular implementation
export * from './server';
