import { Controller, Get } from "@nestjs/common"

import { Feature } from "@lib"

@Controller()
export class GatedDynamicController {
  @Get("dynamic")
  @Feature("DYNAMIC_FEATURE")
  public dynamic(): string {
    return "dynamic"
  }

  @Get("dynamic-disabled")
  @Feature("DYNAMIC_DISABLED")
  public dynamicDisabled(): string {
    return "dynamic-disabled"
  }
}
