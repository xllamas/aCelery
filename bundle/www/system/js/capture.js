/*  Copyright 2014: Xavier Llamas Rolland                      */
/*                                                             */
/*  This software distributed under the GPLv3 License          */
/*                                                             */
////////////////////////////////////////////////////////////////

/* Hands what a running app says to the aCelery host: its console, the errors
 * it does not catch, and how its start went (doc/mcp-server.md §7 P3).
 *
 * A classic script, loaded before anything else in launcher.html. The host's
 * own shim is injected when the page has finished loading, which is too late:
 * an app can fail to start before that. The host channel, by contrast, exists
 * from the first line.
 *
 * In a browser on the network there is no host, and this only leaves the
 * console as it was.
 */
(function () {
  "use strict";
  if (window.__aCeleryCapture) return;

  /* A page logging in a loop must not swamp the channel: past this many
     messages in a second the rest are counted, and the count is sent. */
  var PER_SECOND = 200;
  var ENTRY_CHARS = 4000;

  function cap(text, max) {
    return text.length <= max
      ? text
      : text.slice(0, max) + "… (" + text.length + " characters)";
  }

  function isError(value) {
    return value instanceof Error ||
      (value !== null && typeof value === "object" &&
       typeof value.message === "string" && typeof value.stack === "string");
  }

  /* V8 starts a stack with "Name: message"; JavaScriptCore does not. */
  function errorText(error) {
    var head = String(error);
    var stack = typeof error.stack === "string" ? error.stack : "";
    if (!stack) return head;
    return stack.indexOf(head) === 0 ? stack : head + "\n" + stack;
  }

  /** Makes any value readable as text, in at most max characters. */
  function describe(value, max) {
    max = max || ENTRY_CHARS;
    var text;
    if (typeof value === "string") text = value;
    else if (value === undefined) text = "undefined";
    else if (value === null || typeof value !== "object" && typeof value !== "function") {
      text = String(value);
    } else if (typeof value === "function") {
      text = "function " + (value.name || "(anonymous)") + "()";
    } else if (isError(value)) {
      text = errorText(value);
    } else if (value.nodeType === 1) {
      text = value.outerHTML;
    } else if (typeof value.nodeType === "number") {
      text = value.nodeName + (value.textContent ? " " + value.textContent : "");
    } else {
      var seen = typeof WeakSet === "function" ? new WeakSet() : null;
      try {
        text = JSON.stringify(value, function (key, v) {
          if (typeof v === "bigint") return v.toString();
          if (typeof v === "function") return "function " + (v.name || "(anonymous)") + "()";
          if (v && typeof v === "object" && seen) {
            if (seen.has(v)) return "[Circular]";
            seen.add(v);
          }
          return v;
        }, 2);
      } catch (e) {
        text = undefined;
      }
      if (text === undefined) text = String(value);
    }
    return cap(text, max);
  }

  var windowStart = 0;
  var sent = 0;
  var dropped = 0;

  function flushDropped() {
    if (!dropped) return;
    var count = dropped;
    dropped = 0;
    post({ action: "consoleDropped", count: count });
  }

  function post(payload) {
    var host = window.ACeleryHost;
    if (!host) return;
    try {
      host.postMessage(JSON.stringify(payload));
    } catch (e) {
      // Nothing to report to; the console itself still has it.
    }
  }

  function send(payload) {
    var now = Date.now();
    if (now - windowStart >= 1000) {
      flushDropped();
      windowStart = now;
      sent = 0;
    }
    if (sent >= PER_SECOND) {
      if (!dropped) setTimeout(flushDropped, 1000 - (now - windowStart));
      dropped++;
      return;
    }
    sent++;
    post(payload);
  }

  function entry(level, text, stack, source) {
    var payload = { action: "console", level: level, text: cap(text, ENTRY_CHARS) };
    if (stack) payload.stack = cap(stack, ENTRY_CHARS);
    if (source) payload.source = source;
    send(payload);
  }

  ["log", "info", "warn", "error", "debug"].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      var parts = [];
      var stack = null;
      for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        if (isError(arg)) {
          parts.push(String(arg));
          if (!stack && typeof arg.stack === "string") stack = arg.stack;
        } else {
          parts.push(describe(arg));
        }
      }
      entry(level, parts.join(" "), stack);
      if (typeof original === "function") return original.apply(console, arguments);
    };
  });

  /* Capturing, so an image or script that fails to load is reported too:
     those error events do not bubble to window. */
  window.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target !== window && target.nodeType === 1) {
      var url = target.src || target.href || "";
      entry("error", "Could not load <" + target.nodeName.toLowerCase() + "> " + url);
      return;
    }
    var error = event.error;
    var source = event.filename
      ? event.filename + ":" + event.lineno + ":" + event.colno
      : null;
    entry(
      "error",
      "Uncaught " + (isError(error) ? String(error) : event.message || "error"),
      isError(error) ? error.stack : null,
      source,
    );
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    entry(
      "error",
      "Unhandled rejection: " + (isError(reason) ? String(reason) : describe(reason)),
      isError(reason) ? reason.stack : null,
    );
  });

  window.__aCeleryCapture = {
    describe: describe,

    /** launcher.html: main() returned. */
    started: function () {
      post({ action: "appStarted" });
    },

    /** launcher.html's fail(): the app could not start. */
    failed: function (title, detail) {
      post({ action: "appFailed", title: String(title), detail: describe(detail || "") });
    },
  };
})();
