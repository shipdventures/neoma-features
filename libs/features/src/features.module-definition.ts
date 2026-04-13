import { ConfigurableModuleBuilder } from "@nestjs/common"

import {
  FEATURES_OPTIONS,
  type FeaturesModuleOptions,
} from "./features.options"

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<FeaturesModuleOptions>({
  optionsInjectionToken: FEATURES_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({ isGlobal: true }, (definition, extras) => ({
    ...definition,
    global: extras.isGlobal,
  }))
  .build()
