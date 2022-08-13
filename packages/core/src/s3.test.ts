import { join } from "node:path";
import { setupJest } from "../mocks/server";
import { upload } from "./s3";

setupJest();

describe("#upload", () => {
  it("uploads", async () => {
    await upload({
      path: join(__dirname, "../__fixtures__/screenshots/penelope.jpg"),
      url: "https://api.s3.dev/upload/123",
    });
  });
});
