import { type ExecutionContext, NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { executionContext } from "fixtures/nestjs"

import { FEATURE_KEY } from "../decorators/feature.decorator"
import {
  FEATURES_OPTIONS,
  type FeaturesModuleOptions,
} from "../features.options"

import { FeatureGuard } from "./feature.guard"

function applyMetadata(
  handlerFlag?: string,
  classFlag?: string,
): { handler: () => void; cls: new () => any } {
  const handler = (): void => {}
  const cls = class {}

  if (handlerFlag !== undefined) {
    Reflect.defineMetadata(FEATURE_KEY, handlerFlag, handler)
  }
  if (classFlag !== undefined) {
    Reflect.defineMetadata(FEATURE_KEY, classFlag, cls)
  }

  return { handler, cls }
}

async function createGuard(
  flags: Record<string, boolean>,
): Promise<FeatureGuard> {
  const options: FeaturesModuleOptions = { flags }

  const module = await Test.createTestingModule({
    providers: [FeatureGuard, { provide: FEATURES_OPTIONS, useValue: options }],
  }).compile()

  return module.get(FeatureGuard)
}

describe("FeatureGuard", () => {
  describe("canActivate", () => {
    describe("Given no @Feature metadata on the handler or class", () => {
      it("Then it should return true", async () => {
        const guard = await createGuard({ SOME_FLAG: true })
        const { handler, cls } = applyMetadata()
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        expect(guard.canActivate(ctx)).toBe(true)
      })
    })

    describe("Given @Feature with an enabled flag on the handler", () => {
      it("Then it should return true", async () => {
        const guard = await createGuard({ ENABLED_FEATURE: true })
        const { handler, cls } = applyMetadata("ENABLED_FEATURE")
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        expect(guard.canActivate(ctx)).toBe(true)
      })
    })

    describe("Given @Feature with a disabled flag on the handler", () => {
      it("Then it should throw NotFoundException", async () => {
        const guard = await createGuard({ DISABLED_FEATURE: false })
        const { handler, cls } = applyMetadata("DISABLED_FEATURE")
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        expect(() => guard.canActivate(ctx)).toThrow(NotFoundException)
      })
    })

    describe("Given @Feature with a flag that is not in the flags record", () => {
      it("Then it should throw NotFoundException (fail-closed)", async () => {
        const guard = await createGuard({})
        const { handler, cls } = applyMetadata("MISSING_FLAG")
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        expect(() => guard.canActivate(ctx)).toThrow(NotFoundException)
      })
    })

    describe("Given @Feature on the controller class", () => {
      it("Then it should use the class-level flag", async () => {
        const guard = await createGuard({ CLASS_FLAG: false })
        const { handler, cls } = applyMetadata(undefined, "CLASS_FLAG")
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        expect(() => guard.canActivate(ctx)).toThrow(NotFoundException)
      })
    })

    describe("Given @Feature on both the controller and handler", () => {
      it("Then the handler-level flag overrides the controller-level flag", async () => {
        const guard = await createGuard({
          CONTROLLER_FLAG: false,
          HANDLER_FLAG: true,
        })
        const { handler, cls } = applyMetadata(
          "HANDLER_FLAG",
          "CONTROLLER_FLAG",
        )
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        expect(guard.canActivate(ctx)).toBe(true)
      })
    })

    describe("Given @Feature on both and the handler flag is disabled", () => {
      it("Then the handler-level flag wins and throws NotFoundException", async () => {
        const guard = await createGuard({
          CONTROLLER_FLAG: true,
          HANDLER_FLAG: false,
        })
        const { handler, cls } = applyMetadata(
          "HANDLER_FLAG",
          "CONTROLLER_FLAG",
        )
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        expect(() => guard.canActivate(ctx)).toThrow(NotFoundException)
      })
    })
  })
})
