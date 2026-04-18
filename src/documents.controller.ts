import { Controller, Get, Post } from "@nestjs/common"

import { Feature } from "@lib"

import { DocumentsService, type UploadResult } from "./documents.service"

@Controller("documents")
export class DocumentsController {
  public constructor(private readonly documents: DocumentsService) {}

  @Post()
  public upload(): Promise<UploadResult> {
    return this.documents.upload("DOCUMENT_AI_SUMMARY")
  }

  @Post("never")
  public uploadNever(): Promise<UploadResult> {
    return this.documents.upload("NEVER_ENABLED")
  }

  @Get("ai-only")
  @Feature("DOCUMENT_AI_SUMMARY")
  public aiOnly(): { ok: true } {
    return { ok: true }
  }

  @Get("never")
  @Feature("NEVER_ENABLED")
  public neverAdmit(): { ok: true } {
    return { ok: true }
  }
}
