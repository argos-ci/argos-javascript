import { readConfig, upload, type UploadParameters } from "@argos-ci/core";
import type { Vitest } from "vitest/node";
import type { Reporter } from "vitest/reporters";
import type { ArgosReporterConfig } from "./options";

export type { ArgosReporterConfig };

/**
 * Derive the Argos parallel configuration from Vitest's shard settings, matching
 * the Playwright reporter.
 *
 * Vitest's `--shard=<index>/<count>` populates `config.shard` as
 * `{ index, count }` (the `index` is 1-based, like the Argos `parallel.index`).
 * When sharding is active, Argos still needs `ARGOS_PARALLEL_NONCE` to group the
 * shards into a single build; the total and index default to the shard values
 * but can be overridden via `ARGOS_PARALLEL_TOTAL` / `ARGOS_PARALLEL_INDEX`.
 */
async function getParallelFromConfig(config: {
  shard?: { index: number; count: number } | undefined;
}): Promise<UploadParameters["parallel"] | null> {
  const { shard } = config;
  if (!shard || shard.count === 1) {
    return null;
  }
  const argosConfig = await readConfig();
  if (!argosConfig.parallelNonce) {
    throw new Error(
      "Vitest shard mode detected. Please specify the ARGOS_PARALLEL_NONCE environment variable. Read https://argos-ci.com/docs/parallel-testing",
    );
  }
  return {
    total: argosConfig.parallelTotal ?? shard.count,
    nonce: argosConfig.parallelNonce,
    index: argosConfig.parallelIndex ?? shard.index,
  };
}

/**
 * Vitest reporter that uploads the screenshots captured during the run to Argos.
 */
export class ArgosReporter implements Reporter {
  vitest!: Vitest;
  config: ArgosReporterConfig;

  constructor(config: ArgosReporterConfig) {
    this.config = config;
  }

  onInit(vitest: Vitest): void {
    this.vitest = vitest;
  }

  // Compatibility for Vitest v3
  async onFinished() {
    await this.onTestRunEnd();
  }

  // Only on Vitest v4
  async onTestRunEnd() {
    if (this.vitest.config.watch) {
      return;
    }
    // Auto-detect `vitest --shard=<index>/<count>` and map it to Argos parallel
    // options, so users only need `ARGOS_PARALLEL_NONCE`.
    const parallel = await getParallelFromConfig(this.vitest.config);
    const res = await upload({
      // Default to uploading screenshots, ARIA snapshots and `argosSnapshot`
      // files. Without this, `upload` only matches images
      // (`**/*.{png,jpg,jpeg}`), so the `.aria.yml` files produced by
      // `ariaSnapshot: true` and the `.snapshot.*` files produced by
      // `argosSnapshot` would be skipped.
      files: ["**/*.png", "**/*.aria.yml", "**/*.snapshot.*"],
      // The `.snapshot.*` glob would otherwise also match the `.argos.json`
      // metadata sidecars written next to each snapshot.
      ignore: ["**/*.argos.json"],
      // Auto-detected from the shard config; an explicit `parallel` in the
      // reporter config still wins (spread below).
      parallel: parallel ?? undefined,
      ...this.config,
    });
    console.log(`✅ Argos build created: ${res.build.url}`);
  }
}
