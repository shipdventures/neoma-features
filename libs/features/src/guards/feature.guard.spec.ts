import {
  type ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { express } from "fixtures/express"
import { executionContext } from "fixtures/nestjs"

import {
  FEATURE_KEY,
  type FeatureMetadata,
} from "../decorators/feature.decorator"
import {
  FEATURES_OPTIONS,
  type FeatureResolver,
  type FeaturesModuleOptions,
} from "../features.options"

import { FeatureGuard } from "./feature.guard"

function applyMetadata(
  handlerMetadata?: FeatureMetadata,
  classMetadata?: FeatureMetadata,
): { handler: () => void; cls: new () => any } {
  const handler = (): void => {}
  const cls = class {}

  if (handlerMetadata !== undefined) {
    Reflect.defineMetadata(FEATURE_KEY, handlerMetadata, handler)
  }
  if (classMetadata !== undefined) {
    Reflect.defineMetadata(FEATURE_KEY, classMetadata, cls)
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
        const { handler, cls } = applyMetadata({ flag: "ENABLED_FEATURE" })
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
        const { handler, cls } = applyMetadata({ flag: "DISABLED_FEATURE" })
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
        const { handler, cls } = applyMetadata({ flag: "MISSING_FLAG" })
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
        const { handler, cls } = applyMetadata(undefined, {
          flag: "CLASS_FLAG",
        })
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
          { flag: "HANDLER_FLAG" },
          { flag: "CONTROLLER_FLAG" },
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
          { flag: "HANDLER_FLAG" },
          { flag: "CONTROLLER_FLAG" },
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
            { flag: "HANDLER_FLAG" },
            { flag: "CONTROLLER_FLAG" },
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
          { flag: "HANDLER_FLAG" },
          { flag: "CONTROLLER_FLAG" },
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
          const { handler, cls } = applyMetadata({ flag: "X" })
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
          const { handler, cls } = applyMetadata({ flag: "X" })
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
          const { handler, cls } = applyMetadata({ flag: "X" })
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
          const { handler, cls } = applyMetadata({ flag: "X" })
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
          const { handler, cls } = applyMetadata({ flag: "X" })
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
          const { handler, cls } = applyMetadata({ flag: "X" })
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
        const { handler, cls } = applyMetadata({ flag: "X" })
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
        const { handler, cls } = applyMetadata({ flag: "X" })
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
        const { handler, cls } = applyMetadata({ flag: "X" })
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
        const { handler, cls } = applyMetadata({ flag: "X" })
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
        const { handler, cls } = applyMetadata({ flag: "X" })
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

    describe("Given @Feature('X', { onDeny }) and flags: { X: false }", () => {
      it("Then it rejects with the value returned by onDeny (not NotFoundException)", async () => {
        const forbidden = new ForbiddenException("denied by factory")
        const onDeny = jest.fn().mockReturnValue(forbidden)
        const guard = await createGuard({ X: false })
        const { handler, cls } = applyMetadata({ flag: "X", onDeny })
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toBe(forbidden)
        await expect(guard.canActivate(ctx)).rejects.not.toThrow(
          NotFoundException,
        )
      })
    })

    describe("Given @Feature('X', { onDeny }) and flags: { X: true }", () => {
      it("Then it resolves true and onDeny is not invoked", async () => {
        const onDeny = jest.fn()
        const guard = await createGuard({ X: true })
        const { handler, cls } = applyMetadata({ flag: "X", onDeny })
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).resolves.toBe(true)
        expect(onDeny).not.toHaveBeenCalled()
      })
    })

    describe("Given @Feature('X', { onDeny }) and a resolver that admits", () => {
      it("Then it resolves true and onDeny is not invoked", async () => {
        const onDeny = jest.fn()
        const guard = await createGuard(undefined, () => ({ X: true }))
        const { handler, cls } = applyMetadata({ flag: "X", onDeny })
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).resolves.toBe(true)
        expect(onDeny).not.toHaveBeenCalled()
      })
    })

    describe("Given @Feature('X', { onDeny }) with no flags and no resolver (fail-closed)", () => {
      it("Then onDeny is still invoked on the deny path", async () => {
        const forbidden = new ForbiddenException()
        const onDeny = jest.fn().mockReturnValue(forbidden)
        const guard = await createGuard()
        const { handler, cls } = applyMetadata({ flag: "X", onDeny })
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toBe(forbidden)
        expect(onDeny).toHaveBeenCalledTimes(1)
      })
    })

    describe("Given an onDeny that throws synchronously", () => {
      it("Then the thrown value propagates unchanged (no substitution)", async () => {
        const boom = new Error("onDeny exploded")
        const onDeny = jest.fn().mockImplementation(() => {
          throw boom
        })
        const guard = await createGuard({ X: false })
        const { handler, cls } = applyMetadata({ flag: "X", onDeny })
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toBe(boom)
      })
    })

    describe("Given an onDeny that returns a plain Error (non-HttpException)", () => {
      it("Then the plain Error is thrown as-is (no wrapping)", async () => {
        const plain = new Error("bare error")
        const onDeny = jest.fn().mockReturnValue(plain)
        const guard = await createGuard({ X: false })
        const { handler, cls } = applyMetadata({ flag: "X", onDeny })
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toBe(plain)
      })
    })

    describe("Given onDeny is invoked", () => {
      it("Then it receives the same express Request the guard extracted", async () => {
        let received: unknown
        const onDeny = jest.fn((req: unknown) => {
          received = req
          return new ForbiddenException()
        })
        const guard = await createGuard({ X: false })
        const { handler, cls } = applyMetadata({ flag: "X", onDeny })
        const req = express.request()
        const ctx = executionContext(
          req,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
        expect(received).toBe(req)
        expect(onDeny).toHaveBeenCalledWith(req)
      })
    })

    describe("Given onDeny is invoked when both flags and resolver deny", () => {
      it("Then the same Request is passed to both resolver and onDeny", async () => {
        let resolverReq: unknown
        let onDenyReq: unknown
        const resolve: FeatureResolver = (req) => {
          resolverReq = req
          return { X: false }
        }
        const onDeny = jest.fn((req: unknown) => {
          onDenyReq = req
          return new ForbiddenException()
        })
        const guard = await createGuard({ X: false }, resolve)
        const { handler, cls } = applyMetadata({ flag: "X", onDeny })
        const req = express.request()
        const ctx = executionContext(
          req,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
        expect(resolverReq).toBe(req)
        expect(onDenyReq).toBe(req)
      })
    })

    describe("Given onDeny on the controller class and a handler-level @Feature without options", () => {
      it("Then the handler-level metadata fully overrides — class onDeny is NOT invoked (no field inheritance)", async () => {
        const classOnDeny = jest.fn().mockReturnValue(new ForbiddenException())
        const guard = await createGuard({ HANDLER_FLAG: false })
        const { handler, cls } = applyMetadata(
          { flag: "HANDLER_FLAG" },
          { flag: "CLASS_FLAG", onDeny: classOnDeny },
        )
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException)
        expect(classOnDeny).not.toHaveBeenCalled()
      })
    })

    describe("Given a handler-level @Feature with onDeny and a class-level @Feature without onDeny", () => {
      it("Then the handler-level onDeny is used", async () => {
        const forbidden = new ForbiddenException()
        const handlerOnDeny = jest.fn().mockReturnValue(forbidden)
        const guard = await createGuard({ HANDLER_FLAG: false })
        const { handler, cls } = applyMetadata(
          { flag: "HANDLER_FLAG", onDeny: handlerOnDeny },
          { flag: "CLASS_FLAG" },
        )
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toBe(forbidden)
        expect(handlerOnDeny).toHaveBeenCalledTimes(1)
      })
    })

    describe("Given class-level @Feature with onDeny and no handler-level @Feature", () => {
      it("Then the class-level onDeny is invoked on deny", async () => {
        const forbidden = new ForbiddenException()
        const classOnDeny = jest.fn().mockReturnValue(forbidden)
        const guard = await createGuard({ CLASS_FLAG: false })
        const { handler, cls } = applyMetadata(undefined, {
          flag: "CLASS_FLAG",
          onDeny: classOnDeny,
        })
        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          cls,
        ) as ExecutionContext

        await expect(guard.canActivate(ctx)).rejects.toBe(forbidden)
        expect(classOnDeny).toHaveBeenCalledTimes(1)
      })
    })
  })
})
