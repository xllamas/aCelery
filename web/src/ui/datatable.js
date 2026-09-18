/**
 * Sortable, searchable, paged tables: DataTables 3, wrapped as a component.
 *
 * A separate import, like the charts, because it is 55 KB gzipped and most
 * apps never need it:
 *
 *     import { DataTable, sqlSource } from "acelery/datatable.js";
 *
 *     // Rows already in hand: sorted, searched and paged in the page.
 *     <${DataTable} rows=${rows} columns=${[
 *       { data: "mname", title: "Name" },
 *       { data: "email", title: "Email" },
 *     ]} />
 *
 *     // A table of any size: each page is a query (see datatable_sql.js).
 *     <${DataTable} source=${sqlSource(db, "person")} columns=${...}
 *       onRowClick=${(row) => open(row.rowid)} />
 *
 * `columns` is DataTables' own column vocabulary — `data`, `title`, `render`,
 * `className`, `orderable`, `searchable` — so its documentation applies as
 * written. What this wrapper decides for the author:
 *
 *  - **Cells are text.** DataTables writes cell data as HTML, so a value of
 *    `<img onerror=…>` would run. Every column without its own `render` gets
 *    `DataTables.render.text()`; a column that wants markup says so by
 *    supplying a renderer, and owns the escaping.
 *  - **No jQuery.** DataTables 3 dropped it. `$("#t").DataTable()`, which most
 *    examples online still show, does not work here; this component does.
 *  - **Errors land in the page.** DataTables reports them with `alert()` by
 *    default, which in a WebView is a native dialog with no context. They
 *    render as an Alert above the table instead, and reach `onError`.
 *  - **Phone first.** The Responsive extension folds columns that do not fit
 *    into a row's details rather than scrolling sideways, and paging shows
 *    five buttons.
 *
 * DataTables is not a VDOM: it wraps its `<table>` in controls and rewrites
 * the rows itself. So preact renders only an empty box, and the table is
 * created inside it and destroyed with it — the arrangement the editor and the
 * charts use. Nothing preact renders ever sits among DataTables' nodes.
 */

/* Preact comes from acelery/ui.js, never from preact directly: this is a
   separate bundle, and a second copy of the core would register this file's
   hooks on an instance that is not rendering the app (§3.1a). */
import {
  html, useEffect, useLayoutEffect, useRef, useState, Alert,
} from "acelery/ui.js";

import DataTables from "datatables.net-bs5";
import "datatables.net-responsive-bs5";
import tableCss from "datatables.net-bs5/css/dataTables.bootstrap5.min.css";
import responsiveCss from "datatables.net-responsive-bs5/css/responsive.bootstrap5.min.css";

import { isColumnName } from "./datatable_sql.js";

export { sqlSource, searchTerms } from "./datatable_sql.js";

/** The library itself, for its renderers and API:
    `render: DataTables.render.number(",", ".", 2)`. */
export { DataTables };

/* No alert(). The dt-error event still fires, and the component shows it. */
DataTables.ext.errMode = "none";

const STYLE_ID = "acelery-datatable-css";

/* The stylesheet travels inside the module, so an app needs one import and no
   <link>. It goes in once per page, after the theme's stylesheets, which is
   the order DataTables' Bootstrap integration is written for.

   Responsive draws its expand triangle in black at half opacity, and switches
   only on html[data-theme=dark] — not the data-bs-theme aCelery sets — so on
   a dark theme the control was dark on dark (seen on the Pixel 9a). Its colour
   follows the theme's body text instead, in either mode. */
const EXTRA_CSS = `
.ac-datatable {
  --dtr-control-triangle_color: rgba(var(--bs-body-color-rgb), 0.5);
  --dtr-details-list_border-bottom: 1px solid var(--bs-border-color);
}
.ac-datatable tbody tr.ac-dt-link { cursor: pointer; }
.ac-datatable tbody tr.ac-dt-link:focus-visible {
  outline: 2px solid var(--bs-primary); outline-offset: -2px;
}`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `${tableCss}\n${responsiveCss}\n${EXTRA_CSS}`;
  document.head.append(style);
}

/** DataTables prefixes its messages for the console; the page needs less. */
const plainMessage = (message) =>
  String(message ?? "")
    .replace(/^DataTables warning: (table id=\S+ - )?/, "")
    .replace(/\. For more information about this error.*$/, "");

/**
 * Fills in what the wrapper decides for a column. `data` is left alone, so a
 * nested path ("address.city") or a function behaves as DataTables documents.
 */
function prepareColumn(column, serverSide) {
  const out = {
    // A row without the key renders blank, rather than warning per cell.
    defaultContent: "",
    ...column,
  };
  if (!out.render) out.render = DataTables.render.text();
  // Server-side, sorting and searching are SQL: a column that is not a plain
  // column name cannot take part, so its header does not offer to.
  if (serverSide && !isColumnName(out.data)) {
    out.orderable = false;
    out.searchable = false;
  }
  return out;
}

/** What a column list means, for deciding when the table must be rebuilt.
    Renderers are functions and do not compare, so they do not count. */
const columnsKey = (columns) =>
  JSON.stringify(
    (columns ?? []).map((c) => [typeof c.data === "string" ? c.data : null,
                                c.title ?? null, c.className ?? null,
                                c.orderable ?? null, c.searchable ?? null,
                                c.visible ?? null]),
  );

/**
 * @param {object} props
 * @param {object[]} props.columns     DataTables columns: {data, title, ...}
 * @param {object[]} [props.rows]      rows to show, sorted and searched here
 * @param {object} [props.source]      server-side data, from sqlSource()
 * @param {unknown} [props.refresh]    change it to re-query the source
 * @param {(row: object, event: Event) => void} [props.onRowClick]
 * @param {(error: Error) => void} [props.onError]
 * @param {(api: object) => void} [props.onInit]  the DataTables API, once
 * @param {object} [props.options]     DataTables options, read when built
 * @param {boolean} [props.striped]
 * @param {boolean} [props.hover]      defaults to on when rows are clickable
 * @param {boolean} [props.small]
 */
export function DataTable({
  columns,
  rows,
  source,
  refresh,
  onRowClick,
  onError,
  onInit,
  options,
  striped = true,
  hover,
  small = false,
  className,
  ...rest
}) {
  const host = useRef(null);
  const api = useRef(null);
  const [error, setError] = useState(null);

  /* Read through refs so a new closure each render does not rebuild the
     table; only what the table is built from does that. */
  const latest = useRef({});
  latest.current = { rows, source, onRowClick, onError, onInit };
  const loadedRows = useRef(undefined);

  const clickable = typeof onRowClick === "function";
  const tableClass = [
    "table", "w-100", "align-middle",
    striped && "table-striped",
    (hover ?? clickable) && "table-hover",
    small && "table-sm",
  ].filter(Boolean).join(" ");

  const buildKey = [columnsKey(columns), source?.key ?? "rows", tableClass,
                    clickable].join("\n");

  useLayoutEffect(() => {
    if (!host.current) return;
    injectStyles();

    const { rows: initialRows, source: initialSource } = latest.current;
    const serverSide = Boolean(initialSource);

    const table = document.createElement("table");
    table.className = tableClass;
    host.current.append(table);

    const report = (err) => {
      const message = plainMessage(err?.message ?? err);
      setError(message);
      latest.current.onError?.(new Error(message));
    };

    const config = {
      columns: (columns ?? []).map((c) => prepareColumn(c, serverSide)),
      autoWidth: false,
      responsive: true,
      pageLength: 10,
      paging: { buttons: 5 },
      ...options,
      createdRow(tr, data, index) {
        if (clickable) {
          tr.classList.add("ac-dt-link");
          tr.tabIndex = 0;
        }
        options?.createdRow?.(tr, data, index);
      },
    };

    if (serverSide) {
      config.serverSide = true;
      config.processing = true;
      config.ajax = (request, callback) => {
        latest.current.source.fetch(request).then(
          (json) => {
            setError(null);
            callback(json);
          },
          (err) => {
            // An empty page, so DataTables clears its processing state; the
            // message itself goes through dt-error like any other.
            callback({ draw: request.draw, recordsTotal: 0,
                       recordsFiltered: 0, data: [],
                       error: err?.message ?? String(err) });
          },
        );
      };
    } else {
      config.data = initialRows ?? [];
      loadedRows.current = initialRows;
    }

    const instance = new DataTables(table, config);
    instance.on("dt-error", (e, settings, techNote, message) => report(message));
    api.current = instance;

    /* One listener on the box, not one per row: rows are DataTables' to
       create and discard. A row's own details (Responsive's child rows) and
       its expand control are not the row being opened. */
    const activate = (event) => {
      const handler = latest.current.onRowClick;
      if (!handler) return;
      if (event.type === "keydown" && event.key !== "Enter") return;
      const tr = event.target.closest?.("tbody tr");
      if (!tr || !table.contains(tr) || tr.classList.contains("child")) return;
      // While columns are folded away, the first cell is Responsive's
      // show-details control, and tapping it means that.
      if (table.classList.contains("collapsed")
          && event.target.closest(".dtr-control")) return;
      if (event.target.closest("a, button, input, select, textarea")) return;
      const data = instance.row(tr).data();
      if (data) handler(data, event);
    };
    const box = host.current;
    box.addEventListener("click", activate);
    box.addEventListener("keydown", activate);

    latest.current.onInit?.(instance);

    return () => {
      box.removeEventListener("click", activate);
      box.removeEventListener("keydown", activate);
      // true: take the table and DataTables' controls out of the DOM too.
      instance.destroy(true);
      api.current = null;
    };
    // Rebuilt only when what it is built from changes; rows and refresh
    // update the existing instance below.
  }, [buildKey]);

  useLayoutEffect(() => {
    const instance = api.current;
    if (!instance || source || rows === loadedRows.current) return;
    loadedRows.current = rows;
    // false: stay on the page being read, rather than jumping to the first.
    instance.clear().rows.add(rows ?? []).draw(false);
  }, [rows]);

  const refreshed = useRef(refresh);
  useEffect(() => {
    if (refreshed.current === refresh) return;
    refreshed.current = refresh;
    // Rows passed in are already current; only a source has anything to ask.
    if (latest.current.source) api.current?.ajax.reload(null, false);
  }, [refresh]);

  return html`
    <div class=${["ac-datatable", className].filter(Boolean).join(" ")}
         ...${rest}>
      ${error && html`<${Alert} variant="danger" className="mb-2">${error}<//>`}
      <div ref=${host}></div>
    </div>`;
}
