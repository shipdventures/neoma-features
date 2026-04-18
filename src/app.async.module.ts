import { Module } from "@nestjs/common"

import { FeaturesModule, type FeaturesModuleOptions } from "@lib"

import { AppController } from "./app.controller"
import { GatedDynamicController } from "./gated-dynamic.controller"
import { GatedEnabledController } from "./gated-enabled.controller"
import { GatedMissingController } from "./gated-missing.controller"
import { GatedResolverAsyncController } from "./gated-resolver-async.controller"
import { GatedController } from "./gated.controller"
import { UserFeaturesModule } from "./user-features.module"
import { UserFeaturesService } from "./user-features.service"

@Module({
  imports: [
    FeaturesModule.forRootAsync({
      imports: [UserFeaturesModule],
      inject: [UserFeaturesService],
      useFactory: (users: UserFeaturesService): FeaturesModuleOptions => ({
        flags: {
          ENABLED_FEATURE: true,
          DISABLED_FEATURE: false,
        },
        resolve: (req): Record<string, boolean> => {
          const header = req.headers?.["x-features"]
          return users.featuresFor(
            typeof header === "string" ? header : undefined,
          )
        },
      }),
    }),
  ],
  controllers: [
    AppController,
    GatedController,
    GatedDynamicController,
    GatedEnabledController,
    GatedMissingController,
    GatedResolverAsyncController,
  ],
})
export class AsyncAppModule {}
