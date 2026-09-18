/**
 * Settings (doc/shell-redesign.md §4.6). Replaces Configure, and the About,
 * Network access, Keep screen on and Website items from the host's own menu.
 *
 * Changes apply and persist as they are made. Configure's Save button existed
 * so a theme could be previewed before committing to it, and applying on
 * change already is the preview.
 */

import {
  html, useState, THEMES, applyTheme, currentTheme, currentMode, themeHasModes,
  isDark,
} from "acelery/ui.js";
import { EDITOR_THEMES, isDarkTheme } from "acelery/editor.js";

import { Screen } from "./frame.js";
import { Icon, ListRow, Segmented } from "./parts.js";
import { hasHost, hostPost } from "./store.js";

/* Shipped in the bundle, so it opens with no network and nothing to fetch.
   tool/build_guide.mjs builds it from doc/user-guide.md.

   A WebView will not render a PDF, so inside the app this link never
   navigates: decideNavigation hands it to the host, which passes the file to
   whatever reads PDFs on the device (lib/src/shell/host_bridge.dart). In a
   browser on the network the same href simply opens in a tab. */
const GUIDE = "/system/doc/aCelery-guide.pdf";

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const themeLabel = (t) => (t === "acelery" ? "aCelery" : titleCase(t));

/* The wakelock lives in the host and resets when the IDE route does. The page
   reloads after every Run, though, so the switch remembers its position for
   the session rather than snapping back to off while the screen stays on. */
const AWAKE_KEY = "acelery.keepAwake";

function readAwake() {
  try {
    return sessionStorage.getItem(AWAKE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAwake(on) {
  try {
    sessionStorage.setItem(AWAKE_KEY, on ? "1" : "0");
  } catch {
    // Storage can be unavailable; the switch still works for this page.
  }
}

export function SettingsScreen({ settings, updateSettings }) {
  const [keepAwake, setKeepAwake] = useState(readAwake);
  const theme = currentTheme();
  const modal = themeHasModes(theme);
  const editorTheme = settings.editortheme ?? "";

  function pickTheme(next) {
    updateSettings({ theme: applyTheme(next) });
  }

  function pickMode(next) {
    applyTheme(currentTheme(), { mode: next });
    updateSettings({ "theme.mode": next });
  }

  function toggleAwake(on) {
    setKeepAwake(on);
    writeAwake(on);
    hostPost({ action: "setKeepAwake", on });
  }

  return html`
    <${Screen} title="Settings">
      <section class="ac-section" aria-labelledby="settings-appearance">
        <h2 class="ac-section-title" id="settings-appearance">Appearance</h2>
        <div class="ac-list">
          <div class="ac-setting">
            <div class="ac-setting-label">
              <span class="ac-setting-name" id="settings-mode">Mode</span>
              <div class="ac-setting-help">
                ${modal
                  ? "Follow the device, or always light or dark."
                  : `${themeLabel(theme)} is always ${isDark() ? "dark" : "light"}.`}
              </div>
            </div>
            <${Segmented} role="radiogroup" label="Mode"
              value=${modal ? currentMode() : isDark() ? "dark" : "light"}
              onChange=${pickMode}
              options=${[
                { value: "system", label: "System", icon: "fa-solid fa-circle-half-stroke", disabled: !modal },
                { value: "light", label: "Light", icon: "fa-solid fa-sun", disabled: !modal },
                { value: "dark", label: "Dark", icon: "fa-solid fa-moon", disabled: !modal },
              ]} />
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-theme">Theme</label>
              <div class="ac-setting-help">aCelery and Default follow Mode.</div>
            </div>
            <select id="settings-theme" class="form-select" value=${theme}
                    onChange=${(e) => pickTheme(e.currentTarget.value)}>
              ${THEMES.map((t) => html`<option key=${t} value=${t}>${themeLabel(t)}</option>`)}
            </select>
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-editor">Editor colours</label>
              <div class="ac-setting-help">
                ${editorTheme
                  ? `A ${isDarkTheme(editorTheme) ? "dark" : "light"} scheme, whatever the mode.`
                  : "Light or dark, to match the app."}
              </div>
            </div>
            <select id="settings-editor" class="form-select" value=${editorTheme}
                    onChange=${(e) => updateSettings({ editortheme: e.currentTarget.value })}>
              ${EDITOR_THEMES.map((t) => html`<option key=${t.value} value=${t.value}>${t.label}</option>`)}
            </select>
          </div>
        </div>
      </section>

      ${hasHost()
        ? html`
            <section class="ac-section" aria-labelledby="settings-device">
              <h2 class="ac-section-title" id="settings-device">This device</h2>
              <div class="ac-list">
                <${ListRow} icon="fa-solid fa-wifi" title="Network access"
                  meta="Let other devices on your network open aCelery"
                  onOpen=${() => hostPost({ action: "showNetworkAccess" })} />
                <div class="ac-setting">
                  <div class="ac-setting-label">
                    <label for="settings-awake">Keep screen on</label>
                    <div class="ac-setting-help">While aCelery is open</div>
                  </div>
                  <div class="form-check form-switch m-0">
                    <input id="settings-awake" class="form-check-input" type="checkbox"
                      role="switch" checked=${keepAwake}
                      onChange=${(e) => toggleAwake(e.currentTarget.checked)} />
                  </div>
                </div>
              </div>
            </section>`
        : null}

      <section class="ac-section" aria-labelledby="settings-about">
        <h2 class="ac-section-title" id="settings-about">About</h2>
        <div class="ac-list">
          <div class="ac-row">
            <div class="ac-row-icon" aria-hidden="true"><${Icon} name="fa-solid fa-seedling" /></div>
            <div class="ac-row-body">
              <div class="ac-row-title">aCelery</div>
              <div class="ac-row-meta">Build and run your own JavaScript apps · GPLv3</div>
            </div>
          </div>
          <div class="ac-row">
            <div class="ac-row-icon" aria-hidden="true"><${Icon} name="fa-solid fa-circle-info" /></div>
            <div class="ac-row-body">
              <div class="ac-row-title">Serving</div>
              <div class="ac-row-meta">${window.location.origin}</div>
            </div>
          </div>
          <div class="ac-row is-action">
            <div class="ac-row-icon" aria-hidden="true">
              <${Icon} name="fa-solid fa-file-lines" />
            </div>
            <div class="ac-row-body">
              <a class="ac-stretch ac-row-title" href=${GUIDE}
                 target="_blank" rel="noopener">User's guide</a>
              <div class="ac-row-meta">
                ${hasHost()
                  ? "The PDF, opened with your reader"
                  : "The PDF, in a new tab"}
              </div>
            </div>
          </div>
          <div class="ac-row is-action">
            <div class="ac-row-icon" aria-hidden="true">
              <${Icon} name="fa-solid fa-arrow-up-right-from-square" />
            </div>
            <div class="ac-row-body">
              <a class="ac-stretch ac-row-title" href="http://www.acelery.com/"
                 target="_blank" rel="noopener">Website</a>
              <div class="ac-row-meta">www.acelery.com</div>
            </div>
          </div>
        </div>
      </section>
    <//>`;
}
