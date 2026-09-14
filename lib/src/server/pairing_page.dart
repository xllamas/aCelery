/// The page an unpaired device gets instead of aCelery.
///
/// Served by the server itself rather than out of `bundle/www`, because an
/// unpaired device must not be handed anything from the document root — that
/// is the thing being protected. It is therefore deliberately self-contained:
/// no stylesheet, no module, no font.
String pairingPage({required String pairingId, required String code}) => '''
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>aCelery — approve this device</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font: 16px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    padding: 1.5rem; background: Canvas; color: CanvasText;
  }
  main { max-width: 26rem; text-align: center; }
  h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
  p { margin: 0 0 1rem; }
  .code {
    font: 700 2.5rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: .2em; margin: 1.5rem 0; padding-left: .2em;
  }
  .muted { opacity: .7; font-size: .875rem; }
  .status { margin-top: 1rem; min-height: 1.5rem; }
  .denied { color: #b3261e; font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>Approve this device</h1>
  <p>aCelery on the other device is asking whether to let this browser in.</p>
  <p class="muted">Check that it shows this code, then choose Allow.</p>
  <div class="code">$code</div>
  <div class="status" id="status">Waiting…</div>
  <p class="muted">
    Nothing here is served until you are approved.
  </p>
</main>
<script>
const status = document.getElementById("status");

async function poll() {
  try {
    const response = await fetch(
      "/acelery.pair/status?id=${Uri.encodeComponent(pairingId)}",
      { cache: "no-store" },
    );
    const body = await response.json();

    if (body.state === "approved") {
      // The token arrives as an HttpOnly cookie on this very response, so
      // there is nothing to store here — just go where we were headed.
      status.textContent = "Approved. Opening aCelery…";
      location.replace("/");
      return;
    }
    if (body.state === "denied") {
      status.innerHTML = '<span class="denied">Not approved.</span>';
      return;
    }
    if (body.state === "unknown") {
      // The request expired or the app restarted; asking again is the fix.
      location.reload();
      return;
    }
  } catch {
    status.textContent = "Lost contact with aCelery. Retrying…";
  }
  setTimeout(poll, 1500);
}

poll();
</script>
</body>
</html>
''';
