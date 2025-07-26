import { upload, type UploadParameters } from "@argos-ci/core";
import type { Reporter, Vitest } from "vitest/node";

export type ArgosReporterConfig = UploadParameters;

export class ArgosReporter implements Reporter {
  ctx!: Vitest;
  config: ArgosReporterConfig;

  constructor(config: ArgosReporterConfig) {
    this.config = config;
  }

  onInit(ctx: Vitest): void {
    this.ctx = ctx;
  }

  async onFinished() {
    if (this.ctx.config.watch) {
      return;
    }
    const res = await upload(this.config);
    console.log(`✅ Argos build created: ${res.build.url}`);
  }
}
