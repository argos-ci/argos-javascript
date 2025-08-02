/* eslint-disable vitest/expect-expect */
import { describe, it } from "vitest";
import { join } from "node:path";
// import { fileURLToPath } from "node:url";
import { setupMockServer } from "../mocks/server";
import { uploadFile } from "./s3";

// const __dirname = fileURLToPath(new URL(".", import.meta.url));

setupMockServer();

describe("#upload", () => {
  it("uploads", async () => {
    await uploadFile({
      path: join(__dirname, "../../../__fixtures__/screenshots/penelope.png"),
      url: "https://api.s3.dev/upload/123",
      contentType: "image/png",
    });
  });

  it("uploads big images", async () => {
    await uploadFile({
      path: join(__dirname, "../../../__fixtures__/png-10mb.png"),
      url: "https://api.s3.dev/upload/123",
      contentType: "image/png",
    });
  });
});
