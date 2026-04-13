import { Controller, Get } from "@nestjs/common"

import { Feature } from "@lib"

@Controller("gated-missing")
@Feature("MISSING_FEATURE")
export class GatedMissingController {
  @Get("handler-also-missing")
  @Feature("ALSO_MISSING")
  public handlerAlsoMissing(): string {
    return "gated-missing-handler-also-missing"
  }
}
