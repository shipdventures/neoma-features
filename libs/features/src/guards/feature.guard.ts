import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { FEATURE_KEY } from "../decorators/feature.decorator"
import {
  FEATURES_OPTIONS,
  type FeaturesModuleOptions,
} from "../features.options"

/**
 * Guard that enforces feature flag gating.
 *
 * Reads the `@Feature` metadata from the handler or controller using raw
 * `Reflect.getMetadata` and admits the request when either the static `flags`
 * map or the optional per-request `resolve` function reports the flag as
 * strictly `true`. Throws `NotFoundException` otherwise (fail-closed). Routes
 * without `@Feature` metadata are allowed through unconditionally.
 *
 * Handler-level metadata takes priority over class-level metadata. The
 * resolver is invoked lazily — only when the static path did not already
 * admit — and its return value is awaited uniformly so sync and async
 * resolvers share the same code path.
 *
 * @internal Registered globally via `APP_GUARD` -- not exported.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  public constructor(
    @Inject(FEATURES_OPTIONS)
    private readonly options: FeaturesModuleOptions,
  ) {}

  /**
   * Checks whether the requested route's feature flag is enabled.
   *
   * @param context - The current execution context
   * @returns `true` if the route is allowed
   * @throws {NotFoundException} If the feature flag is disabled or missing
   *   from both the static map and the resolver's returned map
   */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler()
    const cls = context.getClass()

    const flag: string | undefined =
      Reflect.getMetadata(FEATURE_KEY, handler) ??
      Reflect.getMetadata(FEATURE_KEY, cls)

    if (flag === undefined) {
      return true
    }

    const { flags, resolve } = this.options
    const staticAdmits = flags?.[flag] === true
    if (staticAdmits) {
      return true
    }

    const resolved = await resolve?.(context)
    if (resolved?.[flag] === true) {
      return true
    }

    throw new NotFoundException()
  }
}
