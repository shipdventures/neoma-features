import { FEATURE_KEY, Feature } from "./feature.decorator"

describe("Feature", () => {
  describe("Given @Feature applied to a route handler", () => {
    const handler = (): void => {}
    const descriptor: PropertyDescriptor = { value: handler }
    Feature("MY_FLAG")({} as object, "method", descriptor)

    it("Then it should set the FEATURE_KEY metadata to the flag name", () => {
      expect(Reflect.getMetadata(FEATURE_KEY, handler)).toBe("MY_FLAG")
    })
  })

  describe("Given @Feature applied to a controller class", () => {
    @Feature("CLASS_FLAG")
    class TestController {}

    it("Then it should set the FEATURE_KEY metadata on the class", () => {
      expect(Reflect.getMetadata(FEATURE_KEY, TestController)).toBe(
        "CLASS_FLAG",
      )
    })
  })
})
