import { join } from "node:path";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createCaptureClient } from "./index";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    return false;
  }
}

describe("#screenshot", () => {
  it("screenshots website", async () => {
    const client = createCaptureClient({
      outputDir: join(__dirname, "../screenshots"),
    });
    await client.start();
    await client.capture("https://argos-ci.com");
    await exists(join(__dirname, "../screenshots/argos-ci.com.png"));
    await client.capture("https://docs.argos-ci.com");
    await exists(join(__dirname, "../screenshots/docs.argos-ci.com.png"));
    await client.stop();
  });
});
