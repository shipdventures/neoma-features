import { Injectable } from "@nestjs/common"

type DynamicFlags = {
  DYNAMIC_FEATURE: boolean
  DYNAMIC_DISABLED: boolean
}

@Injectable()
export class UserFeaturesService {
  public featuresFor(): DynamicFlags {
    return {
      DYNAMIC_FEATURE: true,
      DYNAMIC_DISABLED: false,
    }
  }
}
