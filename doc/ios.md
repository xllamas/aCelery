# aCelery on iOS — first run (2026-09-16)

Everything before this date was built and tested on Android only. This records
the first time aCelery ran on iOS: what worked, what changed, and what is still
unverified.

Setup: Xcode 26.2, the iPhone 17 Pro simulator on iOS 26.2, and a debug build
from `flutter build ios --simulator --debug`. No physical iPhone or iPad was
used.

## Changes

- **Deployment target 13.0 → 16.4** (`project.pbxproj`, and `platform :ios` in
  the `Podfile`).
  - The first build failed in `pod install`: `file_picker_darwin` needs 14.0.
  - The real floor is set by the bundle, not the plugins. `launcher.html` and
    the IDE load modules through an import map, which WKWebView supports from
    iOS 16.4. On 14 or 15 the app would install and then show nothing that
    works.
  - The other plugins need 13.0 or less.
- **CocoaPods integration.** `Podfile.lock`, plus the Pods references
  `pod install` adds to `project.pbxproj` and the workspace.
- **`NSLocalNetworkUsageDescription`** in `Info.plist`.
  - Serving needs no permission: accepting incoming connections is exempt from
    local network privacy.
  - Outgoing requests to local-network addresses are not exempt. An app
    calling a device on the Wi-Fi through `acelery/http.js` needs the user's
    consent, and from iOS 18 the prompt only appears when this key is set.
  - `NSAllowsLocalNetworking` was already set for App Transport Security, so
    `http://127.0.0.1:8123` loads.
- **Network access says iOS is foreground-only.** With sharing on, the sheet
  adds that on iPhone and iPad sharing works only while aCelery is on screen,
  and suggests Keep screen on. Connect an assistant says the assistant loses
  its connection when aCelery leaves the screen. Both are shown on iOS only.
- **The Example's export text** said "the system share sheet on Android". It
  now says "the share sheet on a phone". `bundleVersion` is `1.6.5+ios`.

## Verified on the simulator

The simulator was driven by clicking its window through macOS Accessibility.
Native iOS menus and sheets ignore synthesized clicks and keys, so those steps
were tapped by hand.

- **Start-up.** The bundle installed into `Documents/aCelery`, the server bound
  `127.0.0.1:8123`, and the IDE rendered correctly: theme, icons, fonts and
  bottom navigation.
- **Bridges, over HTTP.**
  - SQLite round-tripped types and Unicode (`{"n":42,"s":"ünï"}`), and ATTACH
    was refused.
  - `listfiles` found the Example.
- **The Example app.**
  - It ran, and its menu and Directory screen worked.
  - A new record typed into the WebView was saved to `xtest.db`.
  - The native `<select>` menu set `grp` to `work`.
- **Export.** The share sheet opened ("CSV · 66 bytes"). Save to Files wrote
  `directory.csv` with the right header and row. The sheet's preview shows no
  file name, although the file is named correctly.
- **Import.** The document picker opened. Choosing `ImportTest.zip` unpacked
  the project into `www/user/ImportTest`, and it appeared in Code.
- **Editor.** CodeMirror rendered with highlighting. Pasted text and Save
  reached `example.css` on disk.
- **Network access.**
  - The sheet opened, and turning sharing on showed the LAN address and the
    iOS note.
  - Turning it off left the socket on `127.0.0.1` only.
  - A key's last-seen survived a reinstall.
- **MCP.** A key created in the app worked from the Mac. `tools/list`,
  `list_apps` and `query_db` (returning the record saved above) all answered.
- **Background.**
  - With aCelery in front, `/mcp` answered in 6 ms.
  - After switching to the Settings app, every probe timed out, from 4 s
    until the app was reopened 70 s later.
  - Back in front, it answered at once, with no rebind.
  - `lib/src/serving.dart` does nothing on iOS; there is no equivalent of
    Android's foreground service.
- **iPad sharing.** `share_plus` 13.3.0 anchors the popover at the view's
  centre when no origin is passed (`FPPSharePlusPlugin.m`), so sharing without
  `sharePositionOrigin` does not crash on iPad. That comes from reading the
  source, not from running an iPad.

## Seen once, not confirmed

- **A blank band while typing.** With the keyboard up on the second form field,
  a blank band about 50 pt tall appeared between the native title bar and the
  page. It disappeared when the keyboard closed, and did not reappear in later
  edits. Check on a device before treating it as a bug; it may be WKWebView and
  Flutter both adjusting for the keyboard.

## Not verified

- A physical iPhone or iPad, including the local-network prompt and another
  device reaching a shared iPhone.
- The native date and time inputs (`js-ui-framework-evaluation.md` §9.9): the
  Example has no date field.
- The safe-area insets on a device with a home indicator, beyond how the
  simulator looks (`shell-redesign.md`).
- Running a user app in debug mode, the error log, and "Keep screen on".
- Signing, App Store builds and App Review.
