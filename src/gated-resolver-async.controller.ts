import { Controller, Get } from "@nestjs/common"

import { Feature } from "@lib"

@Controller()
export class GatedResolverAsyncController {
  @Get("resolver-async")
  @Feature("RESOLVER_ENABLED")
  public resolverAsync(): string {
    return "resolver-async"
  }
}
