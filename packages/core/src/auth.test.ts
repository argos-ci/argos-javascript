import { describe, it, expect } from "vitest";

import { getAuthToken } from "./auth";

describe("#getAuthToken", () => {
  describe("without CI", () => {
    describe("without token", () => {
      it("should throw", () => {
        const config = {};
        expect(() => getAuthToken(config)).toThrow(
          "Missing Argos repository token 'ARGOS_TOKEN'",
        );
      });
    });

    describe("with token", () => {
      it("should return bearer token", () => {
        const config = { token: "this-token" };
        expect(getAuthToken(config)).toBe(`this-token`);
      });
    });
  });

  describe("with unknown CI", () => {
    const configProps = { ciProvider: "unknown" };

    describe("without token", () => {
      it("should throw", () => {
        const config = { ...configProps };
        expect(() => getAuthToken(config)).toThrow(
          "Missing Argos repository token 'ARGOS_TOKEN'",
        );
      });
    });

    describe("with token", () => {
      it("should return bearer token", () => {
        const config = { ...configProps, token: "this-token" };
        expect(getAuthToken(config)).toBe(`this-token`);
      });
    });
  });

  describe("with Github Actions CI", () => {
    const configProps = { ciProvider: "github-actions" };

    describe("with token", () => {
      it("should return bearer token", () => {
        const config = { ...configProps, token: "this-token" };
        expect(getAuthToken(config)).toBe(`this-token`);
      });
    });

    describe("without token but with CI env variables", () => {
      it("should return a composite token", () => {
        const config = {
          ...configProps,
          owner: "this-owner",
          repository: "this-repository",
          jobId: "this-jobId",
          runId: "12345",
        };

        const base64 = Buffer.from(
          JSON.stringify({
            owner: config.owner,
            repository: config.repository,
            jobId: config.jobId,
            runId: config.runId,
          }),
          "utf8",
        ).toString("base64");

        const bearerToken = getAuthToken(config);

        expect(bearerToken).toBe(`tokenless-github-${base64}`);
        expect(bearerToken).toBe(
          "tokenless-github-eyJvd25lciI6InRoaXMtb3duZXIiLCJyZXBvc2l0b3J5IjoidGhpcy1yZXBvc2l0b3J5Iiwiam9iSWQiOiJ0aGlzLWpvYklkIiwicnVuSWQiOiIxMjM0NSJ9",
        );
      });
    });

    describe("without token and without CI env variables", () => {
      it("should throw", () => {
        const config = { ...configProps };
        expect(() => getAuthToken(config)).toThrow(
          "Automatic GitHub Actions variables detection failed. Please add the 'ARGOS_TOKEN'",
        );
      });
    });
  });
});
