import { ForbiddenException } from "@nestjs/common"

import { FEATURE_KEY, Feature } from "./feature.decorator"

describe("Feature", () => {
  describe("Given @Feature applied to a route handler", () => {
    const handler = (): void => {}
    const descriptor: PropertyDescriptor = { value: handler }
    Feature("MY_FLAG")({} as object, "method", descriptor)

    it("Then it should set the FEATURE_KEY metadata to { flag } only", () => {
      expect(Reflect.getMetadata(FEATURE_KEY, handler)).toEqual({
        flag: "MY_FLAG",
      })
    })

    it("Then it should not set an onDeny key on the metadata", () => {
      expect(Reflect.getMetadata(FEATURE_KEY, handler)).not.toHaveProperty(
        "onDeny",
      )
    })
  })

  describe("Given @Feature applied to a controller class", () => {
    @Feature("CLASS_FLAG")
    class TestController {}

    it("Then it should set the FEATURE_KEY metadata on the class", () => {
      expect(Reflect.getMetadata(FEATURE_KEY, TestController)).toEqual({
        flag: "CLASS_FLAG",
      })
    })
  })

  describe("Given @Feature with an onDeny option on a handler", () => {
    const onDeny = (): ForbiddenException => new ForbiddenException()
    const handler = (): void => {}
    const descriptor: PropertyDescriptor = { value: handler }
    Feature("WITH_ON_DENY", { onDeny })({} as object, "method", descriptor)

    it("Then the metadata carries both flag and onDeny", () => {
      expect(Reflect.getMetadata(FEATURE_KEY, handler)).toEqual({
        flag: "WITH_ON_DENY",
        onDeny,
      })
    })
  })

  describe("Given @Feature with an empty options object on a handler", () => {
    const handler = (): void => {}
    const descriptor: PropertyDescriptor = { value: handler }
    Feature("EMPTY_OPTIONS", {})({} as object, "method", descriptor)

    it("Then the metadata carries only flag (no onDeny key)", () => {
      const metadata = Reflect.getMetadata(FEATURE_KEY, handler)
      expect(metadata).toEqual({ flag: "EMPTY_OPTIONS" })
      expect(metadata).not.toHaveProperty("onDeny")
    })
  })

  describe("Given @Feature with options.onDeny explicitly undefined", () => {
    const handler = (): void => {}
    const descriptor: PropertyDescriptor = { value: handler }
    Feature("EXPLICIT_UNDEFINED", { onDeny: undefined })(
      {} as object,
      "method",
      descriptor,
    )

    it("Then the metadata carries only flag (no onDeny key)", () => {
      const metadata = Reflect.getMetadata(FEATURE_KEY, handler)
      expect(metadata).toEqual({ flag: "EXPLICIT_UNDEFINED" })
      expect(metadata).not.toHaveProperty("onDeny")
    })
  })
})
