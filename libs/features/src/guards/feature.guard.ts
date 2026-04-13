import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { FEATURE_KEY } from "../decorators/feature.decorator"
import {
  FEATURES_OPTIONS,
  type FeaturesModuleOptions,
} from "../features.options"

/**
 * Guard that enforces feature flag gating.
 *
 * Reads the `@Feature` metadata from the handler or controller and checks
 * the flags record. Throws `NotFoundException` when the flag is `false`
 * or absent (fail-closed). Routes without `@Feature` metadata are allowed
 * through unconditionally.
 *
 * @internal Registered globally via `APP_GUARD` — not exported.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    @Inject(FEATURES_OPTIONS)
    private readonly options: FeaturesModuleOptions,
  ) {}

  /**
   * Checks whether the requested route's feature flag is enabled.
   *
   * @param context - The current execution context
   * @returns `true` if the route is allowed
   * @throws {NotFoundException} If the feature flag is disabled or missing
   */
  public canActivate(context: ExecutionContext): boolean {
    const flag = this.reflector.getAllAndOverride<string | undefined>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (flag === undefined) {
      return true
    }

    if (this.options.flags[flag] !== true) {
      throw new NotFoundException()
    }

    return true
  }
}
