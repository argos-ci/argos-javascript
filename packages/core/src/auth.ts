const base64Encode = (obj: any) =>
  Buffer.from(JSON.stringify(obj), "utf8").toString("base64");

/**
 * Get the authentication token.
 */
export function getAuthToken({
  token,
  ciProvider,
  owner,
  repository,
  jobId,
  runId,
  prNumber,
}: {
  token?: string | null;
  ciProvider?: string | null;
  owner?: string | null;
  repository?: string | null;
  jobId?: string | null;
  runId?: string | null;
  prNumber?: number | null;
}) {
  if (token) {
    return token;
  }

  switch (ciProvider) {
    case "github-actions": {
      if (!owner || !repository || !jobId || !runId) {
        throw new Error(
          `Automatic GitHub Actions variables detection failed. Please add the 'ARGOS_TOKEN'`,
        );
      }

      return `tokenless-github-${base64Encode({
        owner,
        repository,
        jobId,
        runId,
        prNumber,
      })}`;
    }

    default:
      throw new Error("Missing Argos repository token 'ARGOS_TOKEN'");
  }
}
