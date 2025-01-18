import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import chalk from "chalk";
import { readConfig, upload } from "@argos-ci/core";
import type { UploadParameters } from "@argos-ci/core";
import { randomBytes } from "node:crypto";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  checkIsArgosScreenshot,
  checkIsArgosScreenshotMetadata,
  checkIsAutomaticScreenshot,
  checkIsTrace,
  getAttachmentFilename,
} from "./attachment";
import { getMetadataFromTestCase } from "./metadata";
import { debug } from "./debug";

const createDirectoryPromises = new Map<string, Promise<void>>();

/**
 * Create a directory if it doesn't exist.
 */
async function createDirectory(pathname: string) {
  let promise = createDirectoryPromises.get(pathname);
  if (promise) {
    return promise;
  }

  promise = mkdir(pathname, { recursive: true }).then(() => {});
  createDirectoryPromises.set(pathname, promise);
  return promise;
}

/**
 * Create temporary directory.
 */
async function createTemporaryDirectory() {
  debug("Creating temporary directory");
  const osTmpDirectory = tmpdir();
  const path = join(osTmpDirectory, "argos." + randomBytes(16).toString("hex"));
  await createDirectory(path);
  debug(`Temporary directory created: ${path}`);
  return path;
}

/**
 * Dynamic build name.
 * We require all values in order to ensure it works correctly in parallel mode.
 */
type DynamicBuildName<T extends readonly string[]> = {
  /**
   * The values that the build name can take.
   * It is required to ensure Argos will always upload
   * for each build name in order to work in sharding mode.
   */
  values: readonly [...T];
  /**
   * Get the build name for a test case.
   * Returns any of the values in `values`.
   */
  get: (test: TestCase) => T[number];
};

export type ArgosReporterOptions<T extends string[] = string[]> = Omit<
  UploadParameters,
  "files" | "root" | "buildName" | "metadata"
> & {
  /**
   * Upload the report to Argos.
   * @default true
   */
  uploadToArgos?: boolean;

  /**
   * The name of the build in Argos.
   * Can be a string or a function that receives the test case and returns the build name.
   */
  buildName?: string | DynamicBuildName<T> | null;
};

/**
 * Check if the build name is dynamic.
 */
function checkIsDynamicBuildName(
  buildName: ArgosReporterOptions["buildName"],
): buildName is DynamicBuildName<string[]> {
  return Boolean(typeof buildName === "object" && buildName);
}

export function createArgosReporterOptions<T extends string[]>(
  options: ArgosReporterOptions<T>,
): ArgosReporterOptions<T> {
  return options;
}

async function getParallelFromConfig(
  config: FullConfig,
): Promise<null | UploadParameters["parallel"]> {
  if (!config.shard) {
    return null;
  }
  if (config.shard.total === 1) {
    return null;
  }
  const argosConfig = await readConfig();
  if (!argosConfig.parallelNonce) {
    throw new Error(
      "Playwright shard mode detected. Please specify ARGOS_PARALLEL_NONCE env variable. Read /parallel-testing",
    );
  }
  return {
    total: config.shard.total,
    nonce: argosConfig.parallelNonce,
    index: config.shard.current,
  };
}

/**
 * Get the automatic screenshot name.
 */
function getAutomaticScreenshotName(test: TestCase, result: TestResult) {
  let name = test.titlePath().join(" ");
  name += result.retry > 0 ? ` #${result.retry + 1}` : "";
  name +=
    result.status === "failed" || result.status === "timedOut"
      ? " (failed)"
      : "";
  return name;
}

class ArgosReporter implements Reporter {
  rootUploadDirectoryPromise: null | Promise<string>;
  uploadDirectoryPromises: Map<string, Promise<string>>;
  config: ArgosReporterOptions;
  playwrightConfig!: FullConfig;
  uploadToArgos: boolean;

  constructor(config: ArgosReporterOptions) {
    this.config = config;
    this.uploadToArgos = config.uploadToArgos ?? true;
    this.rootUploadDirectoryPromise = null;
    this.uploadDirectoryPromises = new Map();
  }

  /**
   * Write a file to the temporary directory.
   */
  async writeFile(path: string, body: Buffer | string) {
    await createDirectory(dirname(path));
    debug(`Writing file to ${path}`);
    await writeFile(path, body);
    debug(`File written to ${path}`);
  }

  /**
   * Copy a file to the temporary directory.
   */
  async copyFile(from: string, to: string) {
    await createDirectory(dirname(to));
    debug(`Copying file from ${from} to ${to}`);
    await copyFile(from, to);
    debug(`File copied from ${from} to ${to}`);
  }

  /**
   * Copy the trace file if found in the result.
   */
  async copyTraceIfFound(result: TestResult, path: string) {
    const trace = result.attachments.find(checkIsTrace) ?? null;
    if (trace) {
      await this.copyFile(trace.path, path + ".pw-trace.zip");
    }
  }

  /**
   * Get the root upload directory (cached).
   */
  getRootUploadDirectory() {
    if (!this.rootUploadDirectoryPromise) {
      this.rootUploadDirectoryPromise = createTemporaryDirectory();
    }
    return this.rootUploadDirectoryPromise;
  }

  onBegin(config: FullConfig) {
    debug("ArgosReporter:onBegin");
    this.playwrightConfig = config;
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    const buildName = checkIsDynamicBuildName(this.config.buildName)
      ? this.config.buildName.get(test)
      : this.config.buildName;

    if (buildName === "") {
      throw new Error('Argos "buildName" cannot be an empty string.');
    }

    const rootUploadDir = await this.getRootUploadDirectory();
    const uploadDir = buildName
      ? join(rootUploadDir, buildName)
      : rootUploadDir;
    debug("ArgosReporter:onTestEnd");
    await Promise.all(
      result.attachments.map(async (attachment) => {
        if (
          checkIsArgosScreenshot(attachment) ||
          checkIsArgosScreenshotMetadata(attachment)
        ) {
          const path = join(uploadDir, getAttachmentFilename(attachment.name));
          await Promise.all([
            this.copyFile(attachment.path, path),
            this.copyTraceIfFound(result, path),
          ]);
          return;
        }

        // Error screenshots are sent to Argos
        if (checkIsAutomaticScreenshot(attachment)) {
          const metadata = await getMetadataFromTestCase(test, result);
          const name = getAutomaticScreenshotName(test, result);
          const path = join(uploadDir, `${name}.png`);
          await Promise.all([
            this.writeFile(path + ".argos.json", JSON.stringify(metadata)),
            this.copyFile(attachment.path, path),
            this.copyTraceIfFound(result, path),
          ]);
          return;
        }
      }),
    );
  }

  async onEnd(result: FullResult) {
    debug("ArgosReporter:onEnd");
    const rootUploadDir = await this.getRootUploadDirectory();
    if (!this.uploadToArgos) {
      debug("Not uploading to Argos because uploadToArgos is false.");
      debug(`Upload directory: ${rootUploadDir}`);
      return;
    }

    debug("Getting parallel from config");
    const parallel = await getParallelFromConfig(this.playwrightConfig);
    if (parallel) {
      debug(
        `Using parallel config — total: ${parallel.total}, nonce: "${parallel.nonce}"`,
      );
    } else {
      debug("Non-parallel mode");
    }

    const buildNameConfig = this.config.buildName;
    const uploadOptions = {
      files: ["**/*.png"],
      parallel: parallel ?? undefined,
      ...this.config,
      buildName: undefined, // We will set it later
      metadata: {
        testReport: {
          status: result.status,
          stats: {
            startTime: result.startTime.toISOString(),
            duration: result.duration,
          },
        },
      },
    } satisfies Partial<UploadParameters>;
    try {
      if (checkIsDynamicBuildName(buildNameConfig)) {
        debug(
          `Dynamic build names, uploading to Argos for each build name: ${buildNameConfig.values.join()}`,
        );
        const directories = await readdir(rootUploadDir);
        // Check if the buildName.values are consistent with the directories created
        if (directories.some((dir) => !buildNameConfig.values.includes(dir))) {
          throw new Error(
            `The \`buildName.values\` (${buildNameConfig.values.join(", ")}) are inconsistent with the \`buildName.get\` returns values (${directories.join(", ")}). Please fix the configuration.`,
          );
        }
        // In non-parallel mode, we iterate over the directories to avoid creating useless builds
        const iteratesOnBuildNames = parallel
          ? buildNameConfig.values
          : directories;
        // Iterate over each build name and upload the screenshots
        for (const buildName of iteratesOnBuildNames) {
          const uploadDir = join(rootUploadDir, buildName);
          await createDirectory(uploadDir);
          debug(`Uploading to Argos for build: ${buildName}`);
          const res = await upload({
            ...uploadOptions,
            root: uploadDir,
            buildName,
          });
          console.log(
            chalk.green(
              `✅ Argos "${buildName}" build created: ${res.build.url}`,
            ),
          );
        }
      } else {
        debug("Uploading to Argos");
        const uploadDir = buildNameConfig
          ? join(rootUploadDir, buildNameConfig)
          : rootUploadDir;
        const res = await upload({
          ...uploadOptions,
          root: uploadDir,
          buildName: buildNameConfig ?? undefined,
        });
        console.log(chalk.green(`✅ Argos build created: ${res.build.url}`));
      }
    } catch (error) {
      console.error(error);
      return { status: "failed" as const };
    }
    return;
  }
}

export default ArgosReporter;
