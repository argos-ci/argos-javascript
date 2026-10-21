/**
 * Overlay drawing a box over each masked element.
 */
interface MaskOverlay {
  /**
   * Element covering the viewport, shown in the top layer.
   */
  glass: HTMLElement;
  /**
   * Shadow root holding the boxes, isolated from the page styles.
   */
  root: ShadowRoot;
  /**
   * Masked elements and the box covering each of them.
   */
  boxes: { element: Element; box: HTMLElement }[];
  /**
   * Animation frame request keeping the boxes in place.
   */
  frame: number;
}

let overlay: MaskOverlay | null = null;

/**
 * Set inline styles that win over any page style.
 */
function setImportantStyles(
  element: HTMLElement,
  styles: Record<string, string>,
) {
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value, "important");
  }
}

/**
 * Create the overlay, like Playwright does for its `mask` option: a glass
 * pane covering the viewport, in the top layer so it is drawn above modal
 * dialogs and popovers.
 */
function createOverlay(): MaskOverlay {
  const glass = document.createElement("argos-mask");
  glass.setAttribute("popover", "manual");
  setImportantStyles(glass, {
    display: "block",
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    "max-width": "none",
    "max-height": "none",
    margin: "0",
    padding: "0",
    border: "none",
    overflow: "visible",
    background: "transparent",
    opacity: "1",
    transform: "none",
    "pointer-events": "none",
    "z-index": "2147483647",
  });
  const root = glass.attachShadow({ mode: "open" });
  document.documentElement.appendChild(glass);
  if (typeof glass.showPopover === "function") {
    glass.showPopover();
  }

  const overlay: MaskOverlay = { glass, root, boxes: [], frame: 0 };
  // Puppeteer scrolls the element into view before an element screenshot and
  // resizes the viewport for some full page screenshots: follow the masked
  // elements until the screenshot is taken.
  const follow = () => {
    updateBoxes(overlay);
    overlay.frame = requestAnimationFrame(follow);
  };
  overlay.frame = requestAnimationFrame(follow);
  return overlay;
}

/**
 * Move each box over its element.
 */
function updateBoxes(overlay: MaskOverlay) {
  for (const { element, box } of overlay.boxes) {
    const rect = element.getBoundingClientRect();
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  }
}

/**
 * Cover elements with a box of the given color, like the
 * `data-visual-test="blackout"` helper does, until `afterEach` runs.
 * Call it once the page is stable, right before taking the screenshot, for
 * SDKs whose automation library has no native mask.
 */
export function maskElements(elements: Element[], color: string) {
  overlay ??= createOverlay();
  for (const element of elements) {
    const box = document.createElement("div");
    box.style.position = "absolute";
    box.style.background = color;
    overlay.root.appendChild(box);
    overlay.boxes.push({ element, box });
  }
  updateBoxes(overlay);
}

/**
 * Remove the boxes covering the masked elements.
 */
export function unmaskElements() {
  if (!overlay) {
    return;
  }
  cancelAnimationFrame(overlay.frame);
  overlay.glass.remove();
  overlay = null;
}
