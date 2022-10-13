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
}

export interface Service {
  detect(ctx: Context): boolean;
  config(ctx: Context): CiEnvironment;
}
