export interface Options {
  env?: Record<string, string | undefined>;
}

export interface Context {
  env: Record<string, string | undefined>;
}

export interface CiEnvironment {
  name: string | null;
  commit: string | null;
  branch: string | null;
  owner: string | null;
  repository: string | null;
  jobId: string | null;
  runId: string | null;
  prNumber: number | null;
  prHeadCommit: string | null;
  nonce: string | null;
}

export interface Service {
  name: string;
  detect(ctx: Context): boolean;
  config(
    ctx: Context,
  ): Omit<CiEnvironment, "name"> | Promise<Omit<CiEnvironment, "name">>;
}
