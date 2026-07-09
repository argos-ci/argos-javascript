import { upload } from "@argos-ci/core";
import type { Vitest } from "vitest/node";
import type { Reporter } from "vitest/reporters";
import type { ArgosReporterConfig } from "./options";

export type { ArgosReporterConfig };

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
      ...this.config,
    });
    console.log(`✅ Argos build created: ${res.build.url}`);
  }
}
