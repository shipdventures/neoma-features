import { Injectable } from "@nestjs/common"

@Injectable()
export class UserFeaturesService {
  public calls = 0

  public featuresFor(userId: string): Record<string, boolean> {
    void userId
    this.calls += 1
    return {
      ENABLED_FEATURE: true,
      DISABLED_FEATURE: false,
      DYNAMIC_FEATURE: true,
      DYNAMIC_DISABLED: false,
    }
  }
}
