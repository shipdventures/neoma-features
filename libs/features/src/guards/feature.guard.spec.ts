import { type ExecutionContext, NotFoundException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { FEATURE_KEY } from "../decorators/feature.decorator"
import { type FeaturesModuleOptions } from "../features.options"

import { FeatureGuard } from "./feature.guard"

function createContext(
  handlerMetadata?: string,
  classMetadata?: string,
): ExecutionContext {
  const handler = (): void => {}
  const cls = class {}

  if (handlerMetadata !== undefined) {
    Reflect.defineMetadata(FEATURE_KEY, handlerMetadata, handler)
  }
  if (classMetadata !== undefined) {
    Reflect.defineMetadata(FEATURE_KEY, classMetadata, cls)
  }

  return {
    getHandler: (): (() => void) => handler,
    getClass: (): typeof cls => cls,
    switchToHttp: () => ({
      getRequest: (): object => ({}),
      getResponse: (): object => ({}),
      getNext: (): object => ({}),
    }),
  } as unknown as ExecutionContext
}

describe("FeatureGuard", () => {
  const reflector = new Reflector()

  describe("canActivate", () => {
    describe("Given no @Feature metadata on the handler or class", () => {
      const options: FeaturesModuleOptions = {
        flags: { SOME_FLAG: true },
      }
      const guard = new FeatureGuard(reflector, options)

      describe("When canActivate is called", () => {
        it("Then it should return true", () => {
          const context = createContext()
          expect(guard.canActivate(context)).toBe(true)
        })
      })
    })

    describe("Given @Feature with an enabled flag on the handler", () => {
      const options: FeaturesModuleOptions = {
        flags: { ENABLED_FEATURE: true },
      }
      const guard = new FeatureGuard(reflector, options)

      describe("When canActivate is called", () => {
        it("Then it should return true", () => {
          const context = createContext("ENABLED_FEATURE")
          expect(guard.canActivate(context)).toBe(true)
        })
      })
    })

    describe("Given @Feature with a disabled flag on the handler", () => {
      const options: FeaturesModuleOptions = {
        flags: { DISABLED_FEATURE: false },
      }
      const guard = new FeatureGuard(reflector, options)

      describe("When canActivate is called", () => {
        it("Then it should throw NotFoundException", () => {
          const context = createContext("DISABLED_FEATURE")
          expect(() => guard.canActivate(context)).toThrow(NotFoundException)
        })
      })
    })

    describe("Given @Feature with a flag that is not in the flags record", () => {
      const options: FeaturesModuleOptions = {
        flags: {},
      }
      const guard = new FeatureGuard(reflector, options)

      describe("When canActivate is called", () => {
        it("Then it should throw NotFoundException (fail-closed)", () => {
          const context = createContext("MISSING_FLAG")
          expect(() => guard.canActivate(context)).toThrow(NotFoundException)
        })
      })
    })

    describe("Given @Feature on the controller class", () => {
      const options: FeaturesModuleOptions = {
        flags: { CLASS_FLAG: false },
      }
      const guard = new FeatureGuard(reflector, options)

      describe("When canActivate is called", () => {
        it("Then it should use the class-level flag", () => {
          const context = createContext(undefined, "CLASS_FLAG")
          expect(() => guard.canActivate(context)).toThrow(NotFoundException)
        })
      })
    })

    describe("Given @Feature on both the controller and handler", () => {
      const options: FeaturesModuleOptions = {
        flags: { CONTROLLER_FLAG: false, HANDLER_FLAG: true },
      }
      const guard = new FeatureGuard(reflector, options)

      describe("When canActivate is called", () => {
        it("Then the handler-level flag overrides the controller-level flag", () => {
          const context = createContext("HANDLER_FLAG", "CONTROLLER_FLAG")
          expect(guard.canActivate(context)).toBe(true)
        })
      })
    })

    describe("Given @Feature on both and the handler flag is disabled", () => {
      const options: FeaturesModuleOptions = {
        flags: { CONTROLLER_FLAG: true, HANDLER_FLAG: false },
      }
      const guard = new FeatureGuard(reflector, options)

      describe("When canActivate is called", () => {
        it("Then the handler-level flag wins and throws NotFoundException", () => {
          const context = createContext("HANDLER_FLAG", "CONTROLLER_FLAG")
          expect(() => guard.canActivate(context)).toThrow(NotFoundException)
        })
      })
    })
  })
})
