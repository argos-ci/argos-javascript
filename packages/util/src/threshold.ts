/**
 * Validates the threshold value.
 */
export function validateThreshold(threshold: number) {
  if (threshold < 0 || threshold > 1) {
    throw new Error("The threshold must be between 0 and 1.");
  }
}
