# aCelery — file and image pickers for user apps (evaluation and implementation, 2026-09-17)

How an app written in aCelery lets its user choose a file or a photo, whether
it runs in the phone's WebView or in a browser on another computer.

## 0. Verdict

**Use the web platform's own `<input type="file">` as the only picker, and
teach the Android host to answer it.**

- **In a browser on the network** it already works, and it picks from **that
  computer's** disk or, on a phone's browser, that phone's gallery and camera.
  This is the requirement that rules out any picker driven by the host: a
  host-side picker would always open on the phone, however far away the user
  is sitting.
- **In the iOS WKWebView** it already works too. WebKit shows its own sheet:
  photo library, camera, files. aCelery only needs the usage descriptions in
  `Info.plist`.
- **In the Android WebView** it does nothing today, because the WebView asks
  the host to show a chooser and nobody answers. `webview_flutter_android`
  exposes that request as `setOnShowFileSelector`. A spike on the emulator
  (§4) answered it from Dart, and the page received real `File` objects with
  the right names, types, sizes and bytes.

So an app author writes one thing, and gets a `File` (a `Blob`) in every
context. Picking is then solved; what remains is **what an app does with the
bytes**. The bridge carries only text today, so aCelery needs a binary write,
a way to show a stored image by URL, and a helper to shrink photos before they
leave the browser (§5).

**For the Android host, use `image_picker` for images and camera, and
`file_picker` for everything else** (§3, option B). `file_picker` is already a
dependency; `image_picker` is first-party (flutter.dev) and adds the camera and
Android's Photo Picker.

## 1. Today

- The file bridge (`opt=file`) opens handles and reads and writes **strings**:
  `filewrite` is `request.readAsString()` (`itf_handler.dart`). A picture
  cannot be stored through it.
- The server serves only `www/` as static files. `files/`, where
  `acelery/file.js` writes by default, is not reachable by URL, so an image
  stored there could not be put in an `<img>`.
- The SQL bridge passes JSON, so no BLOBs either.
- The only picker is the host's: Import project calls `FilePicker.pickFile`
  from `HostActions.importProject`. From a browser on the network it throws
  "needs the aCelery app" (`web/src/acelery/export.js`).
- Nothing in the bundle uses `<input type="file">`.

## 2. What each context does with `<input type="file">`

| Where the app runs | What happens now | What picks, and from where |
|---|---|---|
| Browser on a computer | works | the computer's file dialog; `capture` is ignored |
| Browser on another phone | works | that phone's gallery, camera, files |
| aCelery on iOS (WKWebView) | works, once `Info.plist` has the camera and microphone descriptions | WebKit's sheet: Photo Library, Take Photo, Choose File |
| aCelery on Android (WebView) | **nothing happens** | whatever the host returns from `setOnShowFileSelector` |

What the Android host is told (seen in the spike):

| Input | `acceptTypes` | `mode` | `isCaptureEnabled` |
|---|---|---|---|
| `accept="image/*" multiple` | `[image/*]` | `openMultiple` | false |
| `accept="image/*" capture="environment"` | `[image/*]` | `open` | true |
| `accept=".txt,.zip,application/json"` | `[application/json, .txt, .zip]` | `open` | false |

That is enough to choose between the camera, the photo picker and the
document picker.

## 3. The Android host: options

The callback returns a list of URI strings; the WebView reads them and hands
the page `File` objects.

**A. `file_picker` only** (already a dependency, 12.3.0)

- `FileType.image` sends `ACTION_GET_CONTENT image/*`. On the Android 16
  emulator the system redirected that to the Photo Picker
  (`PhotopickerGetContentActivity`), so the gallery experience is modern on
  recent Android without asking for it.
- Everything else uses `ACTION_OPEN_DOCUMENT` (the system file picker).
- **No camera.** `capture` could only fall back to the gallery.
- Copies every pick into the app's cache and returns a path, which becomes a
  `file://` URI.

**B. `image_picker` for images, `file_picker` for the rest** (recommended)

- `image_picker` 1.2.3, publisher flutter.dev. "On Android 13 and above this
  package uses the Android Photo Picker." Multiple selection
  (`pickMultiImage`), and the camera (`ImageSource.camera`).
- No Android permissions: the Photo Picker needs none, and camera capture goes
  through the camera app's intent. (Declaring `CAMERA` in the manifest would
  make that intent require the permission, so it must not be declared.)
- iOS is not involved: WKWebView never calls the host.
- Known Android behaviour: if the system kills aCelery while the camera app is
  in front, the result is lost. `retrieveLostData()` recovers the file, but
  the WebView's chooser request died with the page, so the app's input simply
  stays empty. Acceptable; say so in the guide.
- Also copies into the cache.

**C. Our own Kotlin** (`MainActivity`, a channel, `ACTION_OPEN_DOCUMENT`,
`PickVisualMedia`, `ACTION_IMAGE_CAPTURE` with a `FileProvider`)

- Returns `content://` URIs straight to the WebView, so nothing is copied.
- About 150 lines of activity-result plumbing, a `FileProvider` declaration,
  and the lost-activity case, all of which B already handles and tests.
- Worth it only if cache copies become a problem. They are bounded (§5.5).

**D. Replace `webview_flutter` with `flutter_inappwebview`**, which has file
inputs and camera built in. Rejected: it would redo the shell, the shim, the
console and snapshot work of M3, for one feature B gives in a few dozen lines.

## 4. Spike (emulator, Android 16, WebView 152)

Temporary code in `ACeleryWebView`, reverted afterwards; a test app with three
inputs.

- **The hook fires** with the parameters in §2.
- **`file_picker` launched the picker,** and Android turned it into the Photo
  Picker. The picker then never drew: the emulator's shared storage was stuck
  (a `cp` into `/sdcard` hung too), so picking through the system UI could not
  be finished there.
- **So the rest was tested without the system picker:** the callback wrote two
  files into the app's cache and returned their `file://` URIs.
  - The page's `change` event gave `spike note.txt`, `text/plain`, 17 bytes,
    starting `68 c3 a9` (UTF-8 `hé`), and `spike.png`, `image/png`, 277,330
    bytes, starting with the PNG signature. A space in the name survived.
  - `URL.createObjectURL(file)` showed the image.
  - `createImageBitmap` plus `OffscreenCanvas.convertToBlob` shrank the
    1024×1024 PNG to a 256×256 JPEG of 11,662 bytes, in the page.
- **The host must respect `mode`.** Returning two URIs to a single-file input
  gave the page two files ("2 files"); Chromium does not enforce it.

Not tested: the system pickers end to end (on a healthy emulator or a phone),
the camera, iOS.

## 5. After picking: bytes, storage and display

### 5.1 A binary write

`POST /android.itf?opt=file&action=upload&path=…&bpath=…` with the raw body:

- written as bytes, streamed to disk rather than read into memory;
- confined by `ACeleryPaths.isInside`, like every file route;
- refused past a size cap (suggest 25 MB) with 413;
- behind the same gate as the rest of `/android.itf`, so a paired browser can
  upload and nothing else can.

In a remote browser this is the only way a picked file reaches the phone, and
it is the same request the WebView makes, so there is one code path.

### 5.2 Showing a stored file

`GET /android.itf?opt=file&action=raw&path=…&bpath=…` answers the bytes with a
`Content-Type` from the extension (`mime` is already a dependency) and
`Cache-Control: no-cache`. An app then writes
`<img src=${file.url("photos/1.jpg")}>`. It works in the WebView and, through
the gate's cookie, in a paired browser.

### 5.3 Where apps keep them

In `files/` (per app, by convention `files/<App>/…`), not in the app's own
folder under `www/user/`:

- the app folder is code: `read_app` would list photos, Export project would
  carry the user's pictures with the app, and `write_file` refuses binaries;
- `www/` is served to every paired device without the app being involved.

A row in SQLite keeps the path, never the bytes.

### 5.4 Shrinking in the page

Phone photos are 3–12 MB. Resizing before upload is the one thing an app
author should not have to write, and the page is the right place: it works
in all three contexts, and the upload is small even over Wi-Fi from a remote
browser. Whether `createImageBitmap` applies a phone photo's EXIF orientation
in each WebView is to be checked with a portrait photo, not assumed.

Caveat: HEIC. iOS converts to JPEG when a page picks images; a desktop Chrome
cannot decode HEIC, so resizing fails there and the helper should upload the
original instead.

### 5.5 The cache copies

Both plugins copy into `cache/`. The WebView reads the file lazily, so the
copies cannot be deleted right after the callback returns. Clear the pickers'
cache folders at startup and before each new pick. Android may also clear
`cache/` itself when storage runs low.

## 6. Proposed page API

`acelery/picker.js`, new:

```js
// Must run inside a click handler: every browser requires a user gesture.
const [photo] = await pickImages({ camera: true });      // File[]
const files   = await pickFiles({ accept: ".csv,text/csv", multiple: true });
const small   = await shrinkImage(photo, { maxSide: 1600, quality: 0.85 }); // Blob
```

It creates a hidden `<input>`, clicks it, and resolves on `change`, or with
`[]` when the dialog is cancelled. That relies on the input's `cancel` event,
which recent Chromium and WebKit fire; whether the Android WebView fires it
when the host's callback returns an empty list is to be checked.

`acelery/file.js`, additions:

```js
await file.writeBytes("Garden/photos/1.jpg", small);   // Blob or ArrayBuffer
file.url("Garden/photos/1.jpg");                        // for <img src>
```

`ui.js` could later add an `ImageInput` widget (preview, remove, required),
built on these.

## 7. iOS

- Add `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` (and
  `NSPhotoLibraryUsageDescription`, which WebKit's sheet may use). Without
  the camera key, choosing Take Photo crashes the app; webview_flutter's
  report of that, flutter/flutter#163549, is marked fixed, but the key is
  Apple's rule either way.
- No host code. Verify on the simulator (library and files) and on a device
  (camera).

## 8. Side benefits and interactions

- **Import project from a browser.** The IDE's Import could use the same input
  and upload the zip through §5.1 to an import route, which removes the
  "needs the aCelery app" limit from a remote browser.
- **MCP.** Nothing changes for the tools. `write_file` stays text-only (§12 of
  `mcp-server.md`). `take_screenshot` and `read_dom` already show a picked
  image once it is on the page.
- **Security.** The upload route is a new way to put bytes into the tree, so
  it gets the confinement and size tests every file route has. A picked file's
  name is untrusted; apps choose their own stored names, and the helper does
  not reuse the original one.

## 9. Work, in order

1. **Host (Android):** `setOnShowFileSelector` in `ACeleryWebView`, mapping
   §2's parameters to `image_picker` (camera, gallery, multiple) or
   `file_picker` (by extension or MIME), respecting `mode`, and clearing the
   copies. Add `image_picker`.
2. **Server:** `upload` and `raw` on the file bridge, with tests for
   confinement, the size cap, binary round trips and MIME types.
3. **Page:** `acelery/picker.js`, `file.writeBytes`, `file.url`; tests in jsdom
   for the input lifecycle and cancel.
4. **iOS:** the `Info.plist` keys.
5. **Guide and Example:** a "Photos and files" section in
   `www/system/mcp/guide.md`, and a screen in the Example app.
6. **Verify:** the Xiaomi (Photo Picker, camera, documents), a browser on the
   Mac against the phone (picks from the Mac, uploads to the phone), the iOS
   simulator.

## 10. Cropping (added 2026-09-17)

Xavier proposed [Croppie](https://github.com/foliotek/croppie) for images: a
fixed frame, round or square, over a photo the user drags and pinch-zooms,
then a cropped result. That is the right interaction for a phone (avatars,
item photos, anything shown at a fixed shape), and it would sit between
`pickImages` and `writeBytes`, replacing the plain `shrinkImage`: a crop
already produces a picture of a chosen size.

Measured 2026-09-17. Sizes are the library bundled and minified with esbuild,
as `tool/build_js.sh` builds, then gzipped; the React components resolve to
the Preact that `ui.js` already ships, so Preact is not counted.

| Library | Last release | Model | Size (gzip) | Notes |
|---|---|---|---|---|
| **Croppie** 2.6.5 | **2020-06-16** | fixed frame, drag and pinch the image | 8.3 KB + 1.4 KB CSS | MIT, no dependencies. 270 open issues; the contributing notes say it is "difficult to maintain with one person". EXIF orientation only through a global `window.EXIF`, i.e. a second script (exif-js). Vanilla, so it needs a Preact wrapper. |
| **react-easy-crop** 6.2.3 (7.0 in canary, 2026-09) | 2026 | fixed frame, drag and pinch the image | 8.0 KB, styles injected | MIT, one dependency (`normalize-wheel`). Round or rectangular frame, aspect, min and max zoom, rotation, keyboard steps. Reports the crop in pixels; drawing it is a few lines of canvas. Rendered under `preact/compat` in jsdom without errors. |
| **Cropper.js** 1.6.3 / 2.2.0 | 2026-08-23 (both) | resizable crop box over the image | 12.9 KB + 1.3 KB CSS / 12.8 KB | MIT. The most complete: free or fixed aspect, rotate, flip, zoom, EXIF handled. 2.x is web components. Suits free-form cropping; heavier for a fixed avatar frame. |
| **react-image-crop** 11.1.2 | 2026-06-21 | resizable rectangle on a static image | 4.0 KB + 1.1 KB CSS | ISC. No zoom and no pinch, so on a 12 MP photo the rectangle is all a phone user gets. |

**Recommendation: react-easy-crop.** It is Croppie's interaction, and the
same size, but maintained, and a Preact component, which is what `ui.js`
widgets already are. Croppie itself would work today, but it has not had a
release in six years, it would need a wrapper, and its EXIF handling needs
another unmaintained script. If free-form cropping is wanted later, Cropper.js
1.x is the one to add.

What it becomes in aCelery:

- `ui.js`: an `ImageCropper` widget, a modal with the frame, a zoom slider as
  well as pinch (a slider is the accessible way to zoom), Cancel and Use.
  Props: `file`, `shape` (`"round"` or `"rect"`), `aspect`, `onDone(blob)`.
- `acelery/picker.js`: `cropImage(file, pixels, { maxSide, type, quality })`,
  which draws the chosen area to a canvas at most `maxSide` wide and returns a
  Blob. `shrinkImage` becomes the same function with the whole image as the
  area.
- The flow an app writes: `pickImages()` → `<ImageCropper>` → `writeBytes()`
  → `<img src=${file.url(path)}>`. The same in the WebView and in a remote
  browser, because every step runs in the page.

To verify with it, on a phone: a portrait photo straight from the camera
(orientation), pinch inside the WebView (the page's viewport must not zoom
instead), and a 12 MP photo's decode time on the Xiaomi.

## 11. Open decisions

1. **B or C for Android.** *Recommended: B.* Revisit only if the cache copies
   hurt.
2. **Where app files live** (§5.3). *Recommended: `files/<App>/`, served
   through `action=raw`.*
3. **Default resize.** *Recommended: none by default in `pickImages`; the
   guide shows `cropImage` (and `shrinkImage`), and the Example uses them.*
4. **Move Import project onto the same path** (§8). *Recommended: yes, once
   the upload route exists.*
5. **Cropper** (§10). *Recommended: react-easy-crop, wrapped as
   `ImageCropper` in `ui.js`, rather than Croppie.*

## 12. Implemented (2026-09-17)

Built as recommended: option B, react-easy-crop, `files/<App>/` served
through `action=raw`, and no resize by default.

**What was built:**

- **Server** (`file_bridge.dart`, `itf_handler.dart`):
  - `POST opt=file&action=upload` streams the body to a `.part` file and
    renames it into place, so a refused or dropped upload leaves the old file.
  - 25 MB cap: 413 up front from `Content-Length`, or once the stream passes
    it.
  - Refuses paths outside the tree and directories. Errors come back as
    `{"error": …}`, which `bridge.js` already shows.
  - `GET opt=file&action=raw` answers the bytes with a content type from the
    extension, and 404 for a missing, outside or directory path.
- **Page:**
  - `acelery/picker.js`: `pickFiles`, `pickImages`, `cropImage`,
    `shrinkImage`. Pictures are decoded through `<img>`, so EXIF orientation
    is applied the same way the page shows them.
  - `acelery/file.js`: `writeBytes` and `url`; `bridge.js` gained
    `postBytes`.
- **`ImageCropper`** (`web/src/ui/crop.js`), exported from `ui.js`:
  - A modal that is full screen on a phone, with a zoom slider as well as
    pinch, and Cancel / Use.
  - It imports `cropImage` from `acelery/picker.js` by bare name, so the
    widget bundle now builds with `--external:acelery/*`.
  - `ui.js` went from 50.5 to 59.0 KB gzipped. Both pages that load it
    (`index.html`, `launcher.html`) have the import map;
    `web/test/table_maint.test.js` gained the resolve hook the other tests
    had.
- **Android host** (`lib/src/shell/file_chooser.dart`):
  - `planChooser` turns the WebView's request into `TakePhoto`,
    `RecordVideo`, `PickImages`, `PickFiles` (video, audio, media, custom
    extensions, any) or `Unsupported`.
  - `FileChooser` opens `image_picker` or `file_picker` and moves the copies
    into `cache/acelery_picked/<pick>/`.
  - `ACeleryWebView` registers it with `setOnShowFileSelector`.
  - **Changed from §5.5:** copies are cleared when aCelery starts, and a
    pick's folder after an hour, not at the next pick. A page holds a `File`
    that is read lazily, and an app may pick again before it uploads the last
    one.
- **iOS:** `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` and
  `NSPhotoLibraryUsageDescription`.
- **Guide and Example:** the guide gained "Photos and files the user picks"
  and a row in the imports table. The Example app gained a Photos screen:
  take or choose, crop round, store, list by URL, delete, add several with
  `shrinkImage`, and a picker that shows what a picked file looks like.
  `bundleVersion` is `1.6.9+pickers`.

**Tests.** Dart went from 280 to 295 passing, node from 116 to 122, and
`flutter analyze` is clean.

- `bridge_test.dart`: byte round trip with every byte value, replace without
  a `.part` left behind, `bpath`, confinement both ways, directories, POST
  only, 413 at the cap, a stream that grows too large, and a client that
  drops mid-body.
- `file_chooser_test.dart`: which picker each accept list, `multiple` and
  `capture` produce.
- `web/test/picker.test.js`: the input's attributes, resolving on change and
  on cancel, removal from the page, and the camera asking for one photo.
- `acelery.test.js`: `writeBytes` sends the bytes untouched, `url` names the
  raw route, and a 413's message is thrown.
- `ui.test.js`: `ImageCropper` is closed without a picture, renders the crop
  area and the zoom slider with one, keeps Use disabled until the area is
  known, and Cancel reports.

**Verified on the emulator** (Android 16, WebView 152), after a reboot that
cleared the stuck shared storage:

- **Choose a photo:** the system Photo Picker; the crop dialog with the round
  frame; zoom by slider and drag. Use stored a 410×410 JPEG that matched the
  frame, and the list showed it through `file.url`.
- **Take a photo:** the camera app through `IMAGE_CAPTURE`, with no
  permission prompt. The 1440×1920 photo arrived in the cropper.
- **EXIF:** a copy of that photo tagged orientation 6 showed rotated in the
  Photo Picker, rotated the same way in the cropper, and the stored 800×800
  crop matched the frame.
- **Add several:** two photos selected in the Photo Picker; both shrunk and
  stored. The emulator took about 4 s for the pair.
- **Documents:** `accept=".jpg,.png,application/json" multiple` opened the
  system file picker. Two files came back with the right names, types
  (`image/png`, `image/jpeg`) and sizes.
- **Cancel:** Back in the file picker resolved `pickFiles()` with `[]` and
  removed the input. That is the open question in §6, and the Android
  WebView does fire `cancel`.
- **Over HTTP, as a remote browser uploads:** a PNG posted through
  `adb forward` came back byte-identical as `image/png`, and a 30 MB body got
  413.
- The test photos, files, key and forward were removed afterwards.

**Verified on a physical phone:** Xavier tested the pickers and the cropper
on the Xiaomi (HyperOS, Android 16) and reported that they worked.

**Verified from a remote browser:** Xavier picked an image in a browser on
another computer and reported that it worked, which is the requirement that
chose the design (§0).

**Not verified:**

- **iOS:** WebKit's sheet, the usage descriptions, `cancel`, HEIC.
- **Recording video,** and a camera app killing aCelery while it is in front
  (`retrieveLostData` is not wired).
- **Layout:** on this emulator the modal's buttons sat just above the gesture
  bar, because a user app's WebView ran on under the system bars. *Fixed the
  same day:* `UserAppScreen` puts the WebView in a `SafeArea` (bottom, left
  and right; the AppBar already clears the top). The strip below is painted
  the page's background, which `capture.js` measures and reports as
  `setChrome`, as the IDE's shell does. On the emulator the WebView measured
  2071 px, ending at y 2359, against a navigation bar from y 2361. Under
  Darkly the strip turned dark and the handle light. Xavier confirmed the
  fix on the Xiaomi.
