/**
 * Subnet calculator module - backward compatibility layer.
 *
 * This file re-exports all functions and types from the modular subnet library.
 * The actual implementation has been split into focused modules in src/lib/subnet/.
 *
 * All existing imports from '@/lib/subnetCalculator' will continue to work.
 */

// Re-export everything from the modular implementation
export * from './subnet';
