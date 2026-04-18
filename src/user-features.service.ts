import { Injectable } from "@nestjs/common"

type DynamicFlags = {
  DYNAMIC_FEATURE: boolean
  DYNAMIC_DISABLED: boolean
  RESOLVER_ENABLED?: boolean
}

@Injectable()
export class UserFeaturesService {
  public featuresFor(xFeaturesHeader?: string): DynamicFlags {
    return {
      DYNAMIC_FEATURE: true,
      DYNAMIC_DISABLED: false,
      RESOLVER_ENABLED: xFeaturesHeader === "RESOLVER_ENABLED",
    }
  }
}
