import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { OK, NOT_FOUND, NO_CONTENT, FORBIDDEN } = HttpStatus

const appModules: [string, string][] = [
  ["forRoot", "src/app.module.ts#AppModule"],
  ["forRootAsync", "src/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`Feature gating onDeny (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance(modulePath)
    })

    describe("Given a disabled @Feature with an onDeny factory returning ForbiddenException", () => {
      it("Then the response is 403 (not 404)", async () => {
        const server = app.getHttpServer()
        const res = await request(server)
          .get("/on-deny/disabled")
          .expect(FORBIDDEN)
        expect(res.body.message).toBe("Webhook receiver disabled")
      })
    })

    describe("Given an onDeny factory that reads request headers", () => {
      it("Then the value extracted from the live Request is reflected in the response body", async () => {
        const server = app.getHttpServer()
        const svixId = "svix-123-abc"
        const res = await request(server)
          .get("/on-deny/disabled-with-header")
          .set("x-svix-id", svixId)
          .expect(FORBIDDEN)
        expect(res.body.requestId).toBe(svixId)
      })
    })

    describe("Given an enabled @Feature with an onDeny factory", () => {
      it("Then the route admits with 200 and onDeny is never observed", async () => {
        const server = app.getHttpServer()
        const res = await request(server).get("/on-deny/enabled").expect(OK)
        expect(res.text).toBe("admitted")
      })
    })

    describe("Given a route without any @Feature decorator", () => {
      it("Then it responds 204 (onDeny never observed on ungated routes)", async () => {
        const server = app.getHttpServer()
        await request(server).get("/on-deny/ungated").expect(NO_CONTENT)
      })
    })

    describe("Given a class-level @Feature with onDeny and a handler-level @Feature without options", () => {
      it("Then handler-level fully overrides — deny falls back to NotFoundException (404), not class onDeny", async () => {
        const server = app.getHttpServer()
        await request(server)
          .get("/on-deny-class/handler-plain")
          .expect(NOT_FOUND)
      })
    })

    describe("Regression smoke — existing routes under the new metadata shape", () => {
      it("Then /status still returns 204", async () => {
        const server = app.getHttpServer()
        await request(server).get("/status").expect(NO_CONTENT)
      })

      it("Then /enabled still returns 200", async () => {
        const server = app.getHttpServer()
        await request(server).get("/enabled").expect(OK)
      })

      it("Then /disabled still returns 404 (default deny unchanged)", async () => {
        const server = app.getHttpServer()
        await request(server).get("/disabled").expect(NOT_FOUND)
      })

      it("Then /missing still returns 404 (fail-closed unchanged)", async () => {
        const server = app.getHttpServer()
        await request(server).get("/missing").expect(NOT_FOUND)
      })

      it("Then /gated/override still returns 200 (handler-level override unchanged)", async () => {
        const server = app.getHttpServer()
        await request(server).get("/gated/override").expect(OK)
      })
    })
  })
})
