import {
  ConflictException,
  type ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { express } from "fixtures/express"
import { executionContext } from "fixtures/nestjs"

import { Feature } from "../decorators/feature.decorator"
import {
  FEATURES_OPTIONS,
  type FeatureOnDeny,
  type FeaturesModuleOptions,
} from "../features.options"

import { FeatureGuard } from "./feature.guard"

async function createGuard(
  options: FeaturesModuleOptions = {},
): Promise<FeatureGuard> {
  const module = await Test.createTestingModule({
    providers: [FeatureGuard, { provide: FEATURES_OPTIONS, useValue: options }],
  }).compile()

  return module.get(FeatureGuard)
}

function ctxFor(
  controller: new (...args: any[]) => any,
  methodName: string,
  req = express.request(),
): ExecutionContext {
  const handler = controller.prototype[methodName] as () => void
  return executionContext(
    req,
    undefined,
    handler,
    controller,
  ) as ExecutionContext
}

// --- Test fixtures: real classes with real @Feature decorators. -----------

class Ungated {
  public method(): void {}
}

class HandlerX {
  @Feature("X")
  public method(): void {}
}

@Feature("X")
class ClassX {
  public method(): void {}
}

@Feature("CLASS_FLAG")
class ClassAndHandler {
  @Feature("HANDLER_FLAG")
  public method(): void {}
}

const forbidden = new ForbiddenException("denied by factory")
const onDenyForbidden: FeatureOnDeny = () => forbidden

class HandlerXWithOnDeny {
  @Feature("X", { onDeny: onDenyForbidden })
  public method(): void {}
}

@Feature("CLASS_FLAG", { onDeny: onDenyForbidden })
class ClassOnDenyHandlerPlain {
  @Feature("HANDLER_FLAG")
  public method(): void {}
}

@Feature("CLASS_FLAG")
class ClassPlainHandlerOnDeny {
  @Feature("HANDLER_FLAG", { onDeny: onDenyForbidden })
  public method(): void {}
}

@Feature("CLASS_FLAG", { onDeny: onDenyForbidden })
class ClassOnlyOnDeny {
  public method(): void {}
}

@Feature("X", { onDeny: () => new ForbiddenException() })
class ClassAndHandlerOnDeny {
  @Feature("X", { onDeny: () => new ConflictException() })
  public method(): void {}
}

// --------------------------------------------------------------------------

describe("FeatureGuard", () => {
  describe("Given a route with no @Feature metadata", () => {
    it("Then canActivate returns true", async () => {
      const guard = await createGuard({ flags: { X: true } })
      await expect(guard.canActivate(ctxFor(Ungated, "method"))).resolves.toBe(
        true,
      )
    })
  })

  describe("Given @Feature('X') on a handler", () => {
    const denyCases: Array<[string, FeaturesModuleOptions]> = [
      ["flags explicitly deny X", { flags: { X: false } }],
      ["X is absent from flags", { flags: {} }],
      ["no flags nor resolver are configured", {}],
    ]

    it("Then flags admitting X resolves true", async () => {
      const guard = await createGuard({ flags: { X: true } })
      await expect(guard.canActivate(ctxFor(HandlerX, "method"))).resolves.toBe(
        true,
      )
    })

    denyCases.forEach(([label, options]) => {
      it(`Then it throws NotFoundException when ${label}`, async () => {
        const guard = await createGuard(options)
        await expect(
          guard.canActivate(ctxFor(HandlerX, "method")),
        ).rejects.toThrow(NotFoundException)
      })
    })
  })

  describe("Given @Feature('X') on a controller class (no handler override)", () => {
    it("Then the class-level flag gates the route", async () => {
      const guard = await createGuard({ flags: { X: false } })
      await expect(guard.canActivate(ctxFor(ClassX, "method"))).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe("Given @Feature on both controller and handler", () => {
    it("Then the handler-level flag wins when it admits", async () => {
      const guard = await createGuard({
        flags: { CLASS_FLAG: false, HANDLER_FLAG: true },
      })
      await expect(
        guard.canActivate(ctxFor(ClassAndHandler, "method")),
      ).resolves.toBe(true)
    })

    it("Then the handler-level flag wins when it denies (class flag admits)", async () => {
      const guard = await createGuard({
        flags: { CLASS_FLAG: true, HANDLER_FLAG: false },
      })
      await expect(
        guard.canActivate(ctxFor(ClassAndHandler, "method")),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe("Given a resolver", () => {
    it("Then a resolver that admits X resolves true", async () => {
      const guard = await createGuard({ resolve: async () => ({ X: true }) })
      await expect(guard.canActivate(ctxFor(HandlerX, "method"))).resolves.toBe(
        true,
      )
    })

    it("Then a resolver that denies X throws NotFoundException", async () => {
      const guard = await createGuard({ resolve: async () => ({ X: false }) })
      await expect(
        guard.canActivate(ctxFor(HandlerX, "method")),
      ).rejects.toThrow(NotFoundException)
    })

    it("Then static-true wins over resolver-false (union, static first)", async () => {
      const resolver = jest.fn().mockResolvedValue({ X: false })
      const guard = await createGuard({
        flags: { X: true },
        resolve: resolver,
      })
      await expect(guard.canActivate(ctxFor(HandlerX, "method"))).resolves.toBe(
        true,
      )
      expect(resolver).not.toHaveBeenCalled()
    })

    it("Then resolver-true admits even when flags deny (union)", async () => {
      const guard = await createGuard({
        flags: { X: false },
        resolve: async () => ({ X: true }),
      })
      await expect(guard.canActivate(ctxFor(HandlerX, "method"))).resolves.toBe(
        true,
      )
    })

    it("Then a resolver rejection propagates unchanged", async () => {
      const boom = new Error("resolver rejected")
      const onDeny = jest.fn().mockReturnValue(new ForbiddenException())
      class HandlerWithOnDeny {
        @Feature("X", { onDeny })
        public method(): void {}
      }
      const guard = await createGuard({
        resolve: async () => {
          throw boom
        },
      })
      await expect(
        guard.canActivate(ctxFor(HandlerWithOnDeny, "method")),
      ).rejects.toBe(boom)
      expect(onDeny).not.toHaveBeenCalled()
    })
  })

  describe("Given @Feature('X', { onDeny }) on the deny path", () => {
    it("Then the value returned by onDeny is thrown (not NotFoundException)", async () => {
      const guard = await createGuard({ flags: { X: false } })
      await expect(
        guard.canActivate(ctxFor(HandlerXWithOnDeny, "method")),
      ).rejects.toBe(forbidden)
    })

    it("Then onDeny runs even when nothing is configured (fail-closed)", async () => {
      const onDeny = jest.fn().mockReturnValue(forbidden)
      class FailClosed {
        @Feature("X", { onDeny })
        public method(): void {}
      }
      const guard = await createGuard()
      await expect(
        guard.canActivate(ctxFor(FailClosed, "method")),
      ).rejects.toBe(forbidden)
      expect(onDeny).toHaveBeenCalledTimes(1)
    })

    it("Then an onDeny that throws synchronously propagates the thrown value", async () => {
      const boom = new Error("onDeny exploded")
      class Throws {
        @Feature("X", {
          onDeny: () => {
            throw boom
          },
        })
        public method(): void {}
      }
      const guard = await createGuard({ flags: { X: false } })
      await expect(guard.canActivate(ctxFor(Throws, "method"))).rejects.toBe(
        boom,
      )
    })

    it("Then a non-Error return value is thrown as-is (consumer's responsibility)", async () => {
      class StringReturn {
        @Feature("X", { onDeny: () => "denied" as unknown as Error })
        public method(): void {}
      }
      const guard = await createGuard({ flags: { X: false } })
      await expect(
        guard.canActivate(ctxFor(StringReturn, "method")),
      ).rejects.toBe("denied")
    })

    it("Then onDeny runs when an async resolver denies X (no static flag present)", async () => {
      const guard = await createGuard({
        resolve: async () => ({ X: false }),
      })
      await expect(
        guard.canActivate(ctxFor(HandlerXWithOnDeny, "method")),
      ).rejects.toBe(forbidden)
    })
  })

  describe("Given @Feature('X', { onDeny }) on the admit path", () => {
    const admitCases: Array<[string, FeaturesModuleOptions]> = [
      ["flags admit", { flags: { X: true } }],
      ["the resolver admits", { resolve: async () => ({ X: true }) }],
    ]

    admitCases.forEach(([label, options]) => {
      it(`Then onDeny is not invoked when ${label}`, async () => {
        const onDeny = jest.fn()
        class Admitted {
          @Feature("X", { onDeny })
          public method(): void {}
        }
        const guard = await createGuard(options)
        await expect(
          guard.canActivate(ctxFor(Admitted, "method")),
        ).resolves.toBe(true)
        expect(onDeny).not.toHaveBeenCalled()
      })
    })
  })

  describe("Given controller-and-handler onDeny combinations (no field inheritance)", () => {
    it("Then a handler without options fully overrides class-level onDeny (falls back to 404)", async () => {
      const guard = await createGuard({ flags: { HANDLER_FLAG: false } })
      await expect(
        guard.canActivate(ctxFor(ClassOnDenyHandlerPlain, "method")),
      ).rejects.toThrow(NotFoundException)
    })

    it("Then a handler-level onDeny is used when the class has none", async () => {
      const guard = await createGuard({ flags: { HANDLER_FLAG: false } })
      await expect(
        guard.canActivate(ctxFor(ClassPlainHandlerOnDeny, "method")),
      ).rejects.toBe(forbidden)
    })

    it("Then a class-level onDeny is used when no handler-level @Feature is present", async () => {
      const guard = await createGuard({ flags: { CLASS_FLAG: false } })
      await expect(
        guard.canActivate(ctxFor(ClassOnlyOnDeny, "method")),
      ).rejects.toBe(forbidden)
    })

    it("Then the handler-level onDeny fully overrides the class-level onDeny", async () => {
      const guard = await createGuard({ flags: { X: false } })
      await expect(
        guard.canActivate(ctxFor(ClassAndHandlerOnDeny, "method")),
      ).rejects.toBeInstanceOf(ConflictException)
    })
  })

  describe("Given non-strict-true values for the gated flag", () => {
    const cases: Array<[string, unknown]> = [
      ['string "true"', "true"],
      ["number 1", 1],
      ["empty object {}", {}],
    ]

    cases.forEach(([label, value]) => {
      it(`Then flags: { X: ${label} } denies (strict === true only)`, async () => {
        const guard = await createGuard({
          flags: { X: value as unknown as boolean },
        })
        await expect(
          guard.canActivate(ctxFor(HandlerX, "method")),
        ).rejects.toThrow(NotFoundException)
      })

      it(`Then a resolver returning { X: ${label} } denies (strict === true only)`, async () => {
        const guard = await createGuard({
          resolve: async () =>
            ({ X: value }) as unknown as Record<string, boolean>,
        })
        await expect(
          guard.canActivate(ctxFor(HandlerX, "method")),
        ).rejects.toThrow(NotFoundException)
      })
    })
  })
})
