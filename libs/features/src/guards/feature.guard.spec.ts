import { type ExecutionContext, NotFoundException } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { executionContext } from "fixtures/nestjs"

import { FEATURE_KEY } from "../decorators/feature.decorator"
import {
  FEATURES_OPTIONS,
  type FeatureResolver,
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
  flags?: Record<string, boolean>,
  resolve?: FeatureResolver,
): Promise<FeatureGuard> {
  const options: FeaturesModuleOptions = {}
  if (flags !== undefined) {
    options.flags = flags
  }
  if (resolve !== undefined) {
    options.resolve = resolve
  }

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

        await expect(guard.canActivate(ctx)).resolves.toBe(true)
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

        await expect(guard.canActivate(ctx)).resolves.toBe(true)
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

        await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException)
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

        await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException)
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

        await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException)
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

        await expect(guard.canActivate(ctx)).resolves.toBe(true)
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

        await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException)
      })
    })

    describe("Given @Feature on both and the handler flag is not set", () => {
      describe("And the controller flag is enabled", () => {
        it("Then the handler-level flag wins and throws NotFoundException", async () => {
          const guard = await createGuard({ CONTROLLER_FLAG: true })
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

          await expect(guard.canActivate(ctx)).rejects.toThrow(
            NotFoundException,
          )
        })
      })
    })

    describe("Given @Feature on both and neither flag is set", () => {
      it("Then the handler-level flag wins and throws NotFoundException", async () => {
        const guard = await createGuard({})
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

        await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException)
      })
    })

    describe("Given only a resolver (no static flags)", () => {
      describe("And the resolver returns { X: true } for the gated flag X", () => {
        it("Then it should return true", async () => {
          const guard = await createGuard(undefined, () => ({ X: true }))
          const { handler, cls } = applyMetadata("X")
          const ctx = executionContext(
            undefined,
            undefined,
            handler,
            cls,
          ) as ExecutionContext

          await expect(guard.canActivate(ctx)).resolves.toBe(true)
        })
      })

      describe("And the resolver returns { X: false }", () => {
        it("Then it should throw NotFoundException", async () => {
          const guard = await createGuard(undefined, () => ({ X: false }))
          const { handler, cls } = applyMetadata("X")
          const ctx = executionContext(
            undefined,
            undefined,
            handler,
            cls,
          ) as ExecutionContext

          await expect(guard.canActivate(ctx)).rejects.toThrow(
            NotFoundException,
          )
        })
      })

      describe("And the resolver returns an empty object", () => {
        it("Then it should throw NotFoundException (flag absent)", async () => {
          const guard = await createGuard(undefined, () => ({}))
          const { handler, cls } = applyMetadata("X")
          const ctx = executionContext(
            undefined,
            undefined,
            handler,
            cls,
          ) as ExecutionContext

          await expect(guard.canActivate(ctx)).rejects.toThrow(
            NotFoundException,
          )
        })
      })
    })

    describe("Given both flags and a resolver", () => {
      describe("And flags: { X: true } with resolver returning { X: false }", () => {
        it("Then static true wins and it returns true (resolver does not veto)", async () => {
          const guard = await createGuard({ X: true }, () => ({ X: false }))
          const { handler, cls } = applyMetadata("X")
          const ctx = executionContext(
            undefined,
            undefined,
            handler,
            cls,
          ) as ExecutionContext

          await expect(guard.canActivate(ctx)).resolves.toBe(true)
        })
      })

      describe("And flags: { X: false } with resolver returning { X: true }", () => {
        it("Then the union admits and it returns true", async () => {
          const guard = await createGuard({ X: false }, () => ({ X: true }))
          const { handler, cls } = applyMetadata("X")
          const ctx = executionContext(
            undefined,
            undefined,
            handler,
            cls,
          ) as ExecutionContext

          await expect(guard.canActivate(ctx)).resolves.toBe(true)
        })
      })

      describe("And the gated flag appears in neither the flags nor the resolver's map", () => {
        it("Then it should throw NotFoundException", async () => {
          const guard = await createGuard({ OTHER: true }, () => ({
            ANOTHER: true,
          }))
          const { handler, cls } = applyMetadata("X")
          const ctx = executionContext(
            undefined,
            undefined,
            handler,
            cls,
          ) as ExecutionContext

          await expect(guard.canActivate(ctx)).rejects.toThrow(
            NotFoundException,
          )
        })
      })
    })

    describe("Given neither flags nor a resolver (options is {})", () => {
      it("Then it should throw NotFoundException", async () => {
        const guard = await createGuard()
        const { handler, cls } = applyMetadata("X")
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException)
      })
    })

    describe("Given an async resolver returning Promise.resolve({ X: true })", () => {
      it("Then it should await and return true", async () => {
        const guard = await createGuard(undefined, async () => ({ X: true }))
        const { handler, cls } = applyMetadata("X")
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).resolves.toBe(true)
      })
    })

    describe("Given a resolver that throws synchronously", () => {
      it("Then the error propagates unchanged (no NotFoundException substitution)", async () => {
        const boom = new Error("resolver exploded")
        const guard = await createGuard(undefined, () => {
          throw boom
        })
        const { handler, cls } = applyMetadata("X")
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toBe(boom)
      })
    })

    describe("Given a resolver that returns a rejected Promise", () => {
      it("Then the rejection propagates unchanged", async () => {
        const boom = new Error("resolver rejected")
        const guard = await createGuard(undefined, () => Promise.reject(boom))
        const { handler, cls } = applyMetadata("X")
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toBe(boom)
      })
    })

    describe("Given flags: { X: true } and a resolver spy", () => {
      it("Then the resolver is not invoked (short-circuit)", async () => {
        const resolver = jest.fn()
        const guard = await createGuard({ X: true }, resolver)
        const { handler, cls } = applyMetadata("X")
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).resolves.toBe(true)
        expect(resolver).not.toHaveBeenCalled()
      })
    })
  })
})
