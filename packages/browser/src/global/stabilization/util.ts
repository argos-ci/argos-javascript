/**
 * Inject global styles in the DOM.
 */
export function injectGlobalStyles(css: string, id: string) {
  const style = document.createElement("style");
  style.textContent = css.trim();
  style.id = `argos-${id}`;
  document.head.appendChild(style);

  return () => {
    const style = document.getElementById(`argos-${id}`);
    if (style) {
      style.remove();
    }
  };
}
