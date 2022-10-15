import { join } from "node:path";
// import { fileURLToPath } from "node:url";
import { setupJest } from "../mocks/server";
import { upload } from "./s3";

// const __dirname = fileURLToPath(new URL(".", import.meta.url));

setupJest();

describe("#upload", () => {
  it("uploads", async () => {
    await upload({
      path: join(__dirname, "../../../__fixtures__/screenshots/penelope.jpg"),
      url: "https://api.s3.dev/upload/123",
      format: "jpg",
    });
  });
});
