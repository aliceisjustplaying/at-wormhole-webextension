/*
 * Central place for all our domain models
 * 
 * This demonstrates Effect's approach to domain modeling:
 * - Branded types for compile-time safety
 * - Schema validation for runtime safety
 * - Union types for flexible data structures
 */

export * from "./handle"
export * from "./did"

// We'll add more models here as we build them:
// - TransformInfo
// - ServiceConfig
// - DestinationLink
// etc.