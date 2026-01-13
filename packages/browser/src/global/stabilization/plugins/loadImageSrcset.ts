import type { Plugin } from "..";

/**
 * Force srcset to resolve to the biggest candidate for the current run.
 * This collapses srcset to a single candidate while staying consistent with
 * descriptor rules from the spec.
 */
export const plugin = {
  name: "loadImageSrcset" as const,
  beforeEach(options) {
    if (!options.viewports || options.viewports.length === 0) {
      return undefined;
    }

    type ParsedCandidate =
      | { url: string; kind: "w"; value: number }
      | { url: string; kind: "x"; value: number }
      | { url: string; kind: "none"; value: 1 };

    function parseSrcset(srcset: string): ParsedCandidate[] {
      return srcset
        .split(",")
        .reduce<ParsedCandidate[]>((candidates, rawPart) => {
          const part = rawPart.trim();
          if (!part) {
            return candidates;
          }

          const tokens = part.split(/\s+/);
          const maybeDescriptor =
            tokens.length > 1 ? tokens[tokens.length - 1] : null;

          if (maybeDescriptor && /^\d+w$/.test(maybeDescriptor)) {
            const url = tokens.slice(0, -1).join(" ");
            if (url) {
              candidates.push({
                url,
                kind: "w",
                value: Number.parseInt(maybeDescriptor.slice(0, -1), 10),
              });
            }
            return candidates;
          }

          if (maybeDescriptor && /^\d+\.?\d*x$/.test(maybeDescriptor)) {
            const url = tokens.slice(0, -1).join(" ");
            if (url) {
              candidates.push({
                url,
                kind: "x",
                value: Number.parseFloat(maybeDescriptor.slice(0, -1)),
              });
            }
            return candidates;
          }

          const url = tokens[0] ?? "";
          if (url) {
            candidates.push({ url, kind: "none", value: 1 });
          }

          return candidates;
        }, []);
    }

    function pickLargestCandidate(
      candidates: ParsedCandidate[],
    ): ParsedCandidate | null {
      let winner: ParsedCandidate | null = null;
      let kind: ParsedCandidate["kind"] | null = null;

      for (const candidate of candidates) {
        if (kind !== null && candidate.kind !== kind) {
          return null;
        }

        kind ??= candidate.kind;

        if (winner === null || candidate.value > winner.value) {
          winner = candidate;
        }
      }

      return winner;
    }

    function candidateToSingleSrcset(
      candidate: ParsedCandidate,
      requireW: boolean,
    ): string {
      if (candidate.kind === "none") {
        return requireW ? `${candidate.url} 1w` : candidate.url;
      }

      return `${candidate.url} ${candidate.value}${candidate.kind}`;
    }

    function forceSrcsetReload(el: Element): void {
      const srcset = el.getAttribute("srcset");
      if (!srcset) {
        return;
      }

      const candidates = parseSrcset(srcset);
      const chosen = pickLargestCandidate(candidates);
      if (!chosen) {
        return;
      }

      const requireW =
        el.hasAttribute("sizes") ||
        chosen.kind === "w" ||
        candidates.some((c) => c.kind === "w");

      el.setAttribute("srcset", "");

      if (el instanceof HTMLImageElement) {
        el.src = chosen.url;
      }

      void el.clientWidth;

      el.setAttribute("srcset", candidateToSingleSrcset(chosen, requireW));
    }

    Array.from(document.querySelectorAll("img,source")).forEach(
      forceSrcsetReload,
    );

    return undefined;
  },
} satisfies Plugin;
