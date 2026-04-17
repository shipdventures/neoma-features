import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"

import { ConfigurableModuleClass } from "./features.module-definition"
import { FeatureGuard } from "./guards/feature.guard"

/**
 * Feature flagging module for NestJS applications.
 *
 * Registers a global guard that checks `@Feature` metadata against the
 * configured flags record. Routes with a disabled or missing flag return
 * HTTP 404.
 *
 * @example Static configuration
 * ```typescript
 * FeaturesModule.forRoot({
 *   flags: {
 *     UPLOAD_BANK_STATEMENT: true,
 *     NEW_DASHBOARD: false,
 *   },
 * })
 * ```
 *
 * @example Async configuration via DI
 * ```typescript
 * FeaturesModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     flags: {
 *       UPLOAD_BANK_STATEMENT: config.get("FEATURE_UPLOAD") === "true",
 *     },
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 *
 * @example Per-request resolver (admit rule is pure OR with `flags`)
 * ```typescript
 * FeaturesModule.forRoot({
 *   flags: { CHECKOUT_V2: true },
 *   resolve: (ctx) => {
 *     const req = ctx.switchToHttp().getRequest()
 *     return req.user?.features ?? {}
 *   },
 * })
 * ```
 */
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: FeatureGuard,
    },
  ],
})
export class FeaturesModule extends ConfigurableModuleClass {}
