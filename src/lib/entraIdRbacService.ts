/**
 * Entra ID RBAC service - backward compatibility layer.
 *
 * This file re-exports all functions and types from the modular Entra ID library.
 * The actual implementation has been split into focused modules in src/lib/entraId/.
 *
 * All existing imports from '@/lib/entraIdRbacService' will continue to work.
 */

// Re-export everything from the modular implementation
export * from './entraId';
