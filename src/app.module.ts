import { Module } from "@nestjs/common"

import { FeaturesModule } from "@lib"

import { AppController } from "./app.controller"
import { GatedDynamicController } from "./gated-dynamic.controller"
import { GatedEnabledController } from "./gated-enabled.controller"
import { GatedMissingController } from "./gated-missing.controller"
import { GatedController } from "./gated.controller"

@Module({
  imports: [
    FeaturesModule.forRoot({
      flags: {
        ENABLED_FEATURE: true,
        DISABLED_FEATURE: false,
      },
      resolve: () => ({
        DYNAMIC_FEATURE: true,
        DYNAMIC_DISABLED: false,
      }),
    }),
  ],
  controllers: [
    AppController,
    GatedController,
    GatedDynamicController,
    GatedEnabledController,
    GatedMissingController,
  ],
})
export class AppModule {}
