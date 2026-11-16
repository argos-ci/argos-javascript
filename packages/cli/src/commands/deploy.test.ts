import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CliError } from "../lib/cli-error";
import { getDeploySource } from "./deploy";

describe("getDeploySource", () => {
  it("deploys a directory on Argos", () => {
    expect(getDeploySource("storybook-static", undefined)).toEqual({
      root: resolve("storybook-static"),
    });
  });

  it("reports a deployment hosted elsewhere", () => {
    expect(
      getDeploySource(undefined, "https://web-git-feature.vercel.app"),
    ).toEqual({ url: "https://web-git-feature.vercel.app" });
  });

  it("accepts an http URL", () => {
    expect(getDeploySource(undefined, "http://preview.internal")).toEqual({
      url: "http://preview.internal",
    });
  });

  it("refuses a directory and --url together", () => {
    expect(() =>
      getDeploySource("storybook-static", "https://web.vercel.app"),
    ).toThrow(
      new CliError(
        "Pass a directory or --url, not both. A directory deploys a static build on Argos; --url reports a deployment hosted elsewhere.",
      ),
    );
  });

  it("asks for a directory or --url when both are missing", () => {
    expect(() => getDeploySource(undefined, undefined)).toThrow(
      new CliError(
        "Missing directory or --url. Pass a directory to deploy a static build on Argos, or --url to report a deployment hosted elsewhere.",
      ),
    );
  });

  it.each(["web-git-feature.vercel.app", "ftp://files.example.com", ""])(
    "refuses %j as a URL",
    (url) => {
      expect(() => getDeploySource(undefined, url)).toThrow(
        new CliError(
          `Invalid --url value: "${url}". Use the full URL of the deployment, starting with https:// or http://.`,
        ),
      );
    },
  );
});
