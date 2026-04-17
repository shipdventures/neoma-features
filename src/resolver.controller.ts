import { Controller, Get } from "@nestjs/common"

import { Feature } from "@lib"

@Controller()
export class ResolverController {
  @Get("resolver-only")
  @Feature("RESOLVER_ENABLED")
  public resolverOnly(): string {
    return "resolver-only"
  }

  @Get("resolver-denied")
  @Feature("UNKNOWN_FEATURE")
  public resolverDenied(): string {
    return "resolver-denied"
  }
}
