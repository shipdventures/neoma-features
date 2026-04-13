import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { OK, NOT_FOUND, NO_CONTENT } = HttpStatus

const appModules: [string, string][] = [
  ["forRoot", "src/app.module.ts#AppModule"],
  ["forRootAsync", "src/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`Feature gating (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance(modulePath)
    })

    describe("Given a route without @Feature", () => {
      it("Then it should be accessible", async () => {
        const server = app.getHttpServer()
        await request(server).get("/status").expect(NO_CONTENT)
      })
    })

    describe("Given a route with an enabled flag", () => {
      it("Then it should return 200", async () => {
        const server = app.getHttpServer()
        await request(server).get("/enabled").expect(OK)
      })
    })

    describe("Given a route with a disabled flag", () => {
      it("Then it should return 404", async () => {
        const server = app.getHttpServer()
        await request(server).get("/disabled").expect(NOT_FOUND)
      })
    })

    describe("Given a route with a missing flag", () => {
      it("Then it should return 404 (fail-closed)", async () => {
        const server = app.getHttpServer()
        await request(server).get("/missing").expect(NOT_FOUND)
      })
    })

    describe("Given a controller with @Feature(DISABLED)", () => {
      it("Then all routes return 404", async () => {
        const server = app.getHttpServer()
        await request(server).get("/gated").expect(NOT_FOUND)
      })

      describe("When a handler overrides with @Feature(ENABLED)", () => {
        it("Then the handler-level flag wins", async () => {
          const server = app.getHttpServer()
          await request(server).get("/gated/override").expect(OK)
        })
      })
    })
  })
})
