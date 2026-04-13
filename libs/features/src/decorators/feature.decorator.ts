import { SetMetadata } from "@nestjs/common"

/**
 * Metadata key used by the feature guard to read the flag name.
 *
 * @internal Not part of the public API.
 */
export const FEATURE_KEY = "neoma:feature"

/**
 * Marks a controller or route handler as gated behind a feature flag.
 *
 * When the flag is `false` or absent from the `flags` record, the route
 * returns HTTP 404 as if it does not exist. When applied to both a
 * controller and a handler, the handler-level flag overrides the
 * controller-level flag.
 *
 * @param flag - The feature flag name to check against the `flags` record
 *
 * @example
 * ```typescript
 * @Controller("bank-statements")
 * export class BankStatementsController {
 *   @Post("upload")
 *   @Feature("UPLOAD_BANK_STATEMENT")
 *   async upload(@Body() dto: UploadDto) {
 *     // Only reachable when UPLOAD_BANK_STATEMENT is true
 *   }
 * }
 * ```
 */
export function Feature(flag: string): ClassDecorator & MethodDecorator {
  return SetMetadata(FEATURE_KEY, flag)
}
