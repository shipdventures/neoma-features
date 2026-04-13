/**
 * Injection token for the features module options.
 *
 * @internal Used by the module builder — not part of the public API.
 */
export const FEATURES_OPTIONS = Symbol("FEATURES_OPTIONS")

/**
 * Configuration options for the features module.
 *
 * @example
 * ```typescript
 * FeaturesModule.forRoot({
 *   flags: {
 *     UPLOAD_BANK_STATEMENT: true,
 *     NEW_DASHBOARD: false,
 *   },
 * })
 * ```
 */
export interface FeaturesModuleOptions {
  /**
   * A record of feature flag names to their enabled/disabled state.
   * Missing flags are treated as disabled (fail-closed).
   */
  flags: Record<string, boolean>
}
