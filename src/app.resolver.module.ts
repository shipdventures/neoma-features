import { type ExecutionContext, Module } from "@nestjs/common"

import { FeaturesModule } from "@lib"

import { ResolverController } from "./resolver.controller"

@Module({
  imports: [
    FeaturesModule.forRoot({
      resolve: (ctx: ExecutionContext): Record<string, boolean> => {
        const req = ctx.switchToHttp().getRequest()
        const header = req.headers?.["x-features"]
        if (typeof header === "string" && header === "RESOLVER_ENABLED") {
          return { RESOLVER_ENABLED: true }
        }
        return {}
      },
    }),
  ],
  controllers: [ResolverController],
})
export class ResolverAppModule {}
