import { Injectable } from "@nestjs/common"

type DynamicFlags = {
  DYNAMIC_FEATURE: boolean
  DYNAMIC_DISABLED: boolean
}

@Injectable()
export class UserFeaturesService {
  public calls = 0

  public featuresFor(_userId: string): DynamicFlags {
    this.calls += 1
    return {
      DYNAMIC_FEATURE: true,
      DYNAMIC_DISABLED: false,
    }
  }
}
