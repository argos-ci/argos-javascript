/**
 * Utility functions for parsing Git remote URLs.
 * Supports SSH, HTTPS, and git protocols.
 */
export function getRepositoryNameFromURL(url: string): string | null {
  const sshMatch = url.match(/^git@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch && sshMatch[1] && sshMatch[2]) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }

  const httpsMatch = url.match(
    /^(?:https?|git):\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/,
  );
  if (httpsMatch && httpsMatch[1] && httpsMatch[2]) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  return null;
}
