/**
 * Closing a panel by tapping outside it.
 *
 * Needed the moment a menu became an overlay: an inline menu that stays open
 * is merely in the way, an overlaid one hides what is under it, and the only
 * way to get rid of it was to pick something.
 *
 * Listens on `pointerdown` rather than `click` so the panel closes as the
 * finger lands, and in the capture phase so it still fires when whatever is
 * underneath stops the event. `contains` is checked against the element the
 * caller names, so a tap on the toggler itself does not count as outside — the
 * toggler has its own handler and would otherwise close and reopen in one tap.
 */

import { useEffect } from "preact/hooks";

/**
 * @param {{current: Element|null}} ref   the panel, toggler included
 * @param {() => void} onDismiss
 * @param {boolean} [active]  only listens while true
 */
export function useDismiss(ref, onDismiss, active = true) {
  useEffect(() => {
    if (!active) return;

    function handle(event) {
      const node = ref.current;
      if (node && !node.contains(event.target)) onDismiss();
    }

    document.addEventListener("pointerdown", handle, true);
    // A hardware keyboard is a real input here: aCelery runs in a desktop
    // browser over the LAN as well as on the device.
    function onKey(event) {
      if (event.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", handle, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onDismiss, active]);
}
