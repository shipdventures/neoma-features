import { SetMetadata } from "@nestjs/common"

import type { FeatureOptions } from "../features.options"

/**
 * Shape of the metadata stored under `FEATURE_KEY`. Migrated from a bare
 * `string` in v0.1/v0.2 to an object in v0.3 so the decorator can carry
 * additional per-route options (e.g. `onDeny`) without introducing parallel
 * metadata keys.
 *
 * @internal Not part of the public API — consumers use `@Feature(...)`.
 */
export interface FeatureMetadata {
  flag: string
  onDeny?: FeatureOptions["onDeny"]
}

/**
 * Metadata key used by the feature guard to read the flag + options.
 *
 * @internal Not part of the public API.
 */
export const FEATURE_KEY = "neoma:feature"

/**
 * Marks a controller or route handler as gated behind a feature flag.
 *
 * When the flag is `false` or absent from the resolved flag set, the route
 * returns HTTP 404 as if it does not exist. Consumers may override the
 * deny-path exception per route by supplying `options.onDeny`.
 *
 * When applied to both a controller and a handler, the handler-level
 * `@Feature` fully overrides the controller-level `@Feature` — including
 * `onDeny`. There is no field-level inheritance: a handler that supplies
 * only a flag does not inherit a class-level `onDeny`.
 *
 * @param flag - The feature flag name to check against the resolved flag set
 * @param options - Optional per-decorator configuration
 *
 * @example Default deny (404)
 * ```typescript
 * @Feature("UPLOAD_BANK_STATEMENT")
 * ```
 *
 * @example Custom deny exception (e.g. 403 for a webhook receiver)
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
export function Feature(
  flag: string,
  options?: FeatureOptions,
): ClassDecorator & MethodDecorator {
  const metadata: FeatureMetadata = { flag }
  if (options?.onDeny !== undefined) {
    metadata.onDeny = options.onDeny
  }
  return SetMetadata(FEATURE_KEY, metadata)
}
