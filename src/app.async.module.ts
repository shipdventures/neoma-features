import { Module } from "@nestjs/common"

import { FeaturesModule, type FeaturesModuleOptions } from "@lib"

import { AppController } from "./app.controller"
import { GatedDynamicController } from "./gated-dynamic.controller"
import { GatedEnabledController } from "./gated-enabled.controller"
import { GatedMissingController } from "./gated-missing.controller"
import { GatedController } from "./gated.controller"
import {
  OnDenyClassOverrideController,
  OnDenyController,
} from "./on-deny.controller"
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
        resolve: () => users.featuresFor(),
      }),
    }),
  ],
  controllers: [
    AppController,
    GatedController,
    GatedDynamicController,
    GatedEnabledController,
    GatedMissingController,
    OnDenyController,
    OnDenyClassOverrideController,
  ],
})
export class AsyncAppModule {}
