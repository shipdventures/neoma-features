import { Module } from "@nestjs/common"

import { FeaturesModule } from "@lib"

import { AppController } from "./app.controller"
import { GatedEnabledController } from "./gated-enabled.controller"
import { GatedMissingController } from "./gated-missing.controller"
import { GatedController } from "./gated.controller"

@Module({
  imports: [
    FeaturesModule.forRootAsync({
      useFactory: () => ({
        flags: {
          ENABLED_FEATURE: true,
          DISABLED_FEATURE: false,
        },
      }),
    }),
  ],
  controllers: [
    AppController,
    GatedController,
    GatedEnabledController,
    GatedMissingController,
  ],
})
export class AsyncAppModule {}
