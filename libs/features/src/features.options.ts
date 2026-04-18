import type { Request } from "express"

/**
 * Injection token for the features module options.
 *
 * @internal Used by the module builder — not part of the public API.
 */
export const FEATURES_OPTIONS = Symbol("FEATURES_OPTIONS")

/**
 * Per-request feature resolver. Invoked on every `@Feature`-gated guard
 * activation and unioned with the static `flags` map under strict `=== true`
 * semantics. Sync and async resolvers are both supported — the guard awaits
 * uniformly.
 *
 * @param req - The current express `Request`; read request-bound state
 *   (headers, `req.user`, etc.) directly.
 * @returns A map of feature flag names to their enabled/disabled state for
 *   this request.
 */
export type FeatureResolver = (
  req: Request,
) => Record<string, boolean> | Promise<Record<string, boolean>>

/**
 * Configuration options for the features module.
 *
 * The admit rule for a `@Feature(name)`-gated route is pure OR with strict
 * equality:
 *
 * ```
 * admit = flags?.[name] === true || (await resolve?.(req))?.[name] === true
 * ```
 *
 * A resolver returning `{ name: false }` does NOT override
 * `flags[name] === true` — static `true` wins.
 *
 * @example Static flags only
 * ```typescript
 * FeaturesModule.forRoot({
 *   flags: {
 *     UPLOAD_BANK_STATEMENT: true,
 *     NEW_DASHBOARD: false,
 *   },
 * })
 * ```
 *
 * @example Static flags combined with a per-request resolver
 * ```typescript
 * FeaturesModule.forRoot({
 *   flags: { CHECKOUT_V2: true },
 *   resolve: async (req) => req.user?.features ?? {},
 * })
 * ```
 */
export interface FeaturesModuleOptions {
  /**
   * Static, bootstrap-time feature flag map. Missing flags are treated as
   * disabled (fail-closed). Optional: a consumer may configure only `resolve`.
   */
  flags?: Record<string, boolean>

  /**
   * Optional per-request resolver. Invoked on every `@Feature`-gated guard
   * activation. Returns (or resolves to) a `Record<string, boolean>` that is
   * unioned with `flags` under strict `=== true` semantics:
   *
   *   admit = flags?.[name] === true || (await resolve?.(req))?.[name] === true
   *
   * A resolver returning `{ name: false }` does NOT override
   * `flags[name] === true`. Errors thrown by the resolver propagate through
   * the Nest exception pipeline.
   */
  resolve?: FeatureResolver
}

/**
 * Factory invoked by the feature guard on the deny path for a route whose
 * `@Feature` decorator supplied an `onDeny` option. The returned value is
 * thrown — it is the caller's responsibility to install an exception filter
 * that handles non-`HttpException` values if they return plain `Error`s or
 * arbitrary objects.
 *
 * Invoked only on deny. Never invoked when the flag admits, and never
 * invoked for routes without `@Feature` metadata.
 *
 * @param req - The current express `Request`. Read headers, `req.user`, etc.
 *   directly — the signature mirrors {@link FeatureResolver} for consistency.
 * @returns The value to throw. Typically an `HttpException` subclass
 *   (e.g. `ForbiddenException`) so Nest's default exception filter formats
 *   the response.
 */
export type FeatureOnDeny = (req: Request) => unknown

/**
 * Options accepted by the `@Feature` decorator.
 *
 * @example Override the default `NotFoundException` on deny
 * ```typescript
 * @Feature("RESEND_WEBHOOK", {
 *   onDeny: (req) =>
 *     new ForbiddenException({
 *       message: "Webhook receiver disabled",
 *       requestId: req.headers["svix-id"],
 *     }),
 * })
 * ```
 */
export interface FeatureOptions {
  /**
   * Factory invoked on the deny path to construct the value to throw. When
   * omitted, the guard throws `NotFoundException` (v0.1 / v0.2 behaviour).
   */
  onDeny?: FeatureOnDeny
}
