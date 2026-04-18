import { Injectable } from "@nestjs/common"

import { FeaturesService } from "@lib"

export interface UploadResult {
  stored: true
  summary?: string
}

@Injectable()
export class DocumentsService {
  public constructor(private readonly features: FeaturesService) {}

  public async upload(flag: string): Promise<UploadResult> {
    const result: UploadResult = { stored: true }
    if (await this.features.isEnabled(flag)) {
      result.summary = "ai-generated summary"
    }
    return result
  }
}
