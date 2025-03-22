/**
 * Inject global styles in the DOM.
 */
export function injectGlobalStyles(css: string, id: string) {
  const style = document.createElement("style");
  style.textContent = css;
  style.id = `argos-${id}`;
  document.head.appendChild(style);
}

/**
 * Remove global styles from the DOM.
 */
export function removeGlobalStyles(id: string) {
  const style = document.getElementById(`argos-${id}`);
  if (style) {
    style.remove();
  }
}
