const base64Encode = (obj: any) =>
  Buffer.from(JSON.stringify(obj), "utf8").toString("base64");

/**
 * Get the authentication token.
 */
export function getAuthToken({
  token,
  ciProvider,
  repository,
  jobId,
  runId,
  prNumber,
}: {
  token: string | null;
  ciProvider: string | null;
  repository: string | null;
  jobId: string | null;
  runId: string | null;
  prNumber: number | null;
}) {
  if (token) {
    return token;
  }

  switch (ciProvider) {
    case "github-actions": {
      if (!repository || !jobId || !runId) {
        throw new Error(
          `Automatic GitHub Actions variables detection failed. Please add the 'ARGOS_TOKEN'`,
        );
      }

      const [owner, repo] = repository.split("/");

      return `tokenless-github-${base64Encode({
        owner,
        repository: repo,
        jobId,
        runId,
        prNumber: prNumber ?? undefined,
      })}`;
    }

    default:
      throw new Error("Missing Argos repository token 'ARGOS_TOKEN'");
  }
}
