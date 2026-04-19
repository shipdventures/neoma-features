import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { ContextIdFactory, ModuleRef } from "@nestjs/core"
import type { Request } from "express"

import { FEATURE_KEY } from "../decorators/feature.decorator"
import { type FeatureOnDeny } from "../features.options"
import { FeaturesService } from "../services/features.service"

interface FeatureMetadata {
  flag: string
  onDeny?: FeatureOnDeny
}

/**
 * Guard that enforces feature flag gating.
 *
 * Reads the `@Feature` metadata from the handler or controller using raw
 * `Reflect.getMetadata` and delegates the admit decision to the
 * request-scoped `FeaturesService`. Throws `NotFoundException` by default,
 * or the value returned by the decorator's `onDeny` factory when one is
 * supplied (fail-closed). Routes without `@Feature` metadata are allowed
 * through unconditionally.
 *
 * Handler-level metadata takes priority over class-level metadata. The
 * guard itself is a singleton (registered via `APP_GUARD`), so it obtains
 * the request-scoped `FeaturesService` per call via `ModuleRef.resolve`
 * keyed by the in-flight request's `ContextId`. Using
 * `ContextIdFactory.getByRequest(req)` — not `.create()` — is what keeps
 * the service's DI tree (and therefore its view of the live `Request`)
 * aligned with the rest of the request-scoped graph.
 *
 * @internal Registered globally via `APP_GUARD` -- not exported.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  public constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Checks whether the requested route's feature flag is enabled.
   *
   * @param context - The current execution context
   * @returns `true` if the route is allowed
   * @throws `NotFoundException` by default when the feature flag is
   *   disabled or missing from both the static map and the resolver's
   *   returned map. When the decorator supplied an `onDeny` factory, the
   *   value it returns is thrown instead — whatever it is. The consumer's
   *   exception filter is responsible for handling it.
   */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler()
    const cls = context.getClass()

    const metadata: FeatureMetadata | undefined =
      Reflect.getMetadata(FEATURE_KEY, handler) ??
      Reflect.getMetadata(FEATURE_KEY, cls)

    if (metadata === undefined) {
      return true
    }

    const req = context.switchToHttp().getRequest<Request>()
    const contextId = ContextIdFactory.getByRequest(req)
    // When the target controller is fully static (singleton), Nest's
    // router skips its per-request setup and REQUEST is never registered
    // for this contextId. Register it ourselves so the request-scoped
    // FeaturesService receives the in-flight request. This is a no-op
    // when Nest has already registered the request (idempotent).
    this.moduleRef.registerRequestByContextId(req, contextId)
    const features = await this.moduleRef.resolve(FeaturesService, contextId, {
      strict: false,
    })

    const enabled = await features.isEnabled(metadata.flag)
    if (enabled) {
      return true
    }

    const { onDeny } = metadata
    if (onDeny) {
      throw onDeny(req)
    }
    throw new NotFoundException()
  }
}
