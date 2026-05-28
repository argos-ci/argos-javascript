/* eslint-disable vitest/expect-expect */
import { describe, it } from "vitest";
import { join } from "node:path";
// import { fileURLToPath } from "node:url";
import { server, setupMockServer } from "../mocks/server";
import { uploadFile, uploadFileWithPresignedPost } from "./s3";
import { http } from "msw";

// const __dirname = fileURLToPath(new URL(".", import.meta.url));

setupMockServer();

describe("#upload", () => {
  it("uploads", async () => {
    mockPutUpload();
    await uploadFile({
      path: join(__dirname, "../../../__fixtures__/screenshots/penelope.png"),
      url: "https://api.s3.dev/upload/123",
      contentType: "image/png",
    });
  });

  it("uploads big images", async () => {
    mockPutUpload();
    await uploadFile({
      path: join(__dirname, "../../../__fixtures__/png-10mb.png"),
      url: "https://api.s3.dev/upload/123",
      contentType: "image/png",
    });
  });

  it("uploads with presigned POST fields", async () => {
    await uploadFileWithPresignedPost({
      path: join(__dirname, "../../../__fixtures__/screenshots/penelope.png"),
      url: "https://api.s3.dev/upload/123",
      contentType: "image/png",
      fields: {
        key: "123",
        "Content-Type": "image/png",
      },
    });
  });
});

function mockPutUpload() {
  server.use(
    http.put("https://api.s3.dev/upload/*", async () => {
      return new Response(null, { status: 201 });
    }),
  );
}
