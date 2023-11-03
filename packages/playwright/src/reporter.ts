import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { readConfig, upload, UploadParameters } from "@argos-ci/core";
import { randomBytes } from "node:crypto";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { getAttachementFilename } from "./attachment";
import { getMetadataFromTestCase } from "./metadata";

async function createTempDirectory() {
  const osTmpDirectory = tmpdir();
  const path = join(osTmpDirectory, "argos." + randomBytes(16).toString("hex"));
  await mkdir(path, { recursive: true });
  return path;
}

export type ArgosReporterOptions = Omit<UploadParameters, "files" | "root">;

const getParallelFromConfig = (
  config: FullConfig,
): null | UploadParameters["parallel"] => {
  if (!config.shard) return null;
  if (config.shard.total === 1) return null;
  const argosConfig = readConfig();
  if (!argosConfig.parallelNonce) {
    throw new Error(
      "Playwright shard mode detected. Please specify ARGOS_PARALLEL_NONCE env variable. Read https://argos-ci.com/docs/parallel-testing",
    );
  }
  return {
    total: config.shard.total,
    nonce: argosConfig.parallelNonce,
  };
};

class ArgosReporter implements Reporter {
  uploadDir!: string;
  config: ArgosReporterOptions;
  playwrightConfig!: FullConfig;

  constructor(config: ArgosReporterOptions) {
    this.config = config;
  }

  async writeFile(path: string, body: Buffer | string) {
    const dir = dirname(path);
    if (dir !== this.uploadDir) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(path, body);
  }

  async onBegin(config: FullConfig, _suite: Suite) {
    this.playwrightConfig = config;
    this.uploadDir = await createTempDirectory();
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    await Promise.all(
      result.attachments.map(async (attachment) => {
        if (attachment.name.startsWith("argos/")) {
          if (!attachment.body) {
            throw new Error("Missing attachment body");
          }
          const path = join(
            this.uploadDir,
            getAttachementFilename(attachment.name),
          );
          await this.writeFile(path, attachment.body);
          return;
        }

        // Error screenshots are sent to Argos
        if (
          attachment.name === "screenshot" &&
          attachment.contentType === "image/png" &&
          attachment.path
        ) {
          const metadata = await getMetadataFromTestCase(test);
          const name = test.titlePath().join(" ");
          const path = join(
            this.uploadDir,
            result.status === "failed" || result.status === "timedOut"
              ? `${name} (failed).png`
              : `${name}.png`,
          );
          await Promise.all([
            this.writeFile(path + ".argos.json", JSON.stringify(metadata)),
            copyFile(attachment.path, path),
          ]);
        }
      }),
    );
  }

  async onEnd(_result: FullResult) {
    const parallel = getParallelFromConfig(this.playwrightConfig);

    try {
      await upload({
        files: ["**/*.png"],
        root: this.uploadDir,
        parallel: parallel ?? undefined,
        ...this.config,
      });
    } catch (error) {
      console.error(error);
      return { status: "failed" as const };
    }
    return;
  }
}

export default ArgosReporter;
