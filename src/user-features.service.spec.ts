import { faker } from "@faker-js/faker"

import { UserFeaturesService } from "./user-features.service"

describe("UserFeaturesService", () => {
  let service: UserFeaturesService

  beforeEach(() => {
    service = new UserFeaturesService()
  })

  describe("featuresFor", () => {
    describe("Given the x-features header is 'RESOLVER_ENABLED'", () => {
      it("Then RESOLVER_ENABLED is true alongside the static dynamic flags", () => {
        const result = service.featuresFor("RESOLVER_ENABLED")

        expect(result).toEqual({
          DYNAMIC_FEATURE: true,
          DYNAMIC_DISABLED: false,
          RESOLVER_ENABLED: true,
        })
      })
    })

    describe("Given the x-features header is an unrelated string", () => {
      it("Then RESOLVER_ENABLED is false", () => {
        const header = faker.lorem.word()

        const result = service.featuresFor(header)

        expect(result).toEqual({
          DYNAMIC_FEATURE: true,
          DYNAMIC_DISABLED: false,
          RESOLVER_ENABLED: false,
        })
      })
    })

    describe("Given no header is provided", () => {
      it("Then RESOLVER_ENABLED is false", () => {
        const result = service.featuresFor()

        expect(result).toEqual({
          DYNAMIC_FEATURE: true,
          DYNAMIC_DISABLED: false,
          RESOLVER_ENABLED: false,
        })
      })
    })
  })
})
