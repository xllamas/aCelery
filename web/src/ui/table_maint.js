/**
 * Declarative CRUD over a SQLite table.
 *
 * This is aCelery's actual differentiator: declare fields and validators, get a
 * working list / record / edit / search UI, with linked child tables. No
 * mainstream framework ships anything like it, so the design is preserved and
 * the implementation rebuilt (doc/js-ui-framework-evaluation.md §3.5).
 *
 *     <${TableMaint} db=${db} title="Directory" table="person"
 *       fields=${[
 *         { type: "string", title: "Name",  name: "mname", validate: [notEmpty()] },
 *         { type: "email",  title: "Email", name: "email", validate: [email()] },
 *         { type: "list",   title: "Group", name: "grp", options: GROUPS },
 *       ]}
 *       linked=${[{ title: "Phones", table: "phone", on: "person", fields: [...] }]} />
 *
 * What the rebuild changes, and why:
 *
 *  - **Nothing is demolished to redraw it.** Five `this.clear()` sites rebuilt
 *    the whole card body on every navigation, save and drill-down, destroying
 *    scroll position, focus and in-progress input. A VDOM with keyed rows is
 *    what stops that happening, without anyone designing a fix.
 *  - **SQL is parameterised.** The original concatenated values into every
 *    statement and quoted them by hand; the bridge now binds them (§3.3).
 *    That also fixes a real defect: `findResult` interpolated `fld.getName` —
 *    the function object, not its result — into both range branches, so range
 *    search on a number, money or date column has never worked.
 *  - **The database calls are async**, so the UI does not freeze on each one,
 *    and one `select` replaces the per-row cursor walk (§1.2).
 *
 * What it preserves: the five views and their button sets, rowid pagination,
 * slave mode for linked tables, the field types, the list/search flags, the
 * validator model, and every one of the pre/post hooks an app can redefine.
 */

import { html } from "htm/preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Dropdown from "react-bootstrap/Dropdown";
import Table from "react-bootstrap/Table";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";

import { Panel } from "./layout.js";
import { Form, Input, TextArea, Select, CheckBox } from "./form.js";

/** Types whose column holds a number, and which support a range search. */
const NUMERIC = new Set(["number", "money"]);
const RANGEABLE = new Set(["number", "money", "date"]);

/** Fills in a field declaration's defaults. */
function normalise(field) {
  return {
    type: "string",
    inList: true,
    inSearch: true,
    readOnly: false,
    validate: [],
    ...field,
    numeric: NUMERIC.has(field.type ?? "string"),
    rangeable: RANGEABLE.has(field.type ?? "string"),
  };
}

/**
 * Renders a value for the list and record views.
 *
 * Money keeps xScript's `Number.prototype.formatMoney(2, ".", ",")` output —
 * thousands separated, two decimals — because a column of figures that changes
 * format between releases is a visible regression, not a refinement.
 */
function formatValue(field, value) {
  if (value === null || value === undefined) return "";
  if (field.type === "money") {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    const fixed = Math.abs(n).toFixed(2);
    const [whole, fraction] = fixed.split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${n < 0 ? "-" : ""}${grouped}.${fraction}`;
  }
  if (field.type === "checkbox") {
    return value === (field.onValue ?? 1) || value === true ? "Yes" : "No";
  }
  if (field.type === "list" && Array.isArray(field.options)) {
    const match = field.options.find(
      (o) => String(typeof o === "string" ? o : o.value) === String(value),
    );
    if (match) return typeof match === "string" ? match : match.label;
  }
  return String(value);
}

/** Numbers right-align; everything else reads left. */
const alignOf = (field) => (field.numeric ? "text-end" : "text-start");

/** One declared field, as the input it edits with. */
function FieldInput({ field, disabled }) {
  const common = {
    label: field.title,
    name: field.name,
    validate: field.validate,
    disabled: disabled || field.readOnly,
    placeholder: field.title,
  };
  switch (field.type) {
    case "textarea":
      return html`<${TextArea} ...${common} rows=${field.rows ?? 4} />`;
    case "checkbox":
      return html`<${CheckBox} ...${common} />`;
    case "list":
      return html`<${Select} ...${common} options=${field.options ?? []}
                             placeholder=${field.placeholder} />`;
    case "number":
    case "money":
      return html`<${Input} ...${common} type="number"
                            step=${field.type === "money" ? "0.01" : "any"} />`;
    case "date":
      // The platform picker: bigger touch targets, correct locale, free
      // accessibility, and 136 KB lighter than Tempus Dominus (§3.9).
      return html`<${Input} ...${common} type="date" />`;
    case "email":
      return html`<${Input} ...${common} type="email" />`;
    case "tel":
      return html`<${Input} ...${common} type="tel" />`;
    default:
      return html`<${Input} ...${common} type="text" />`;
  }
}

/** Coerces a form value to what the column should hold. */
function toColumn(field, value) {
  if (field.type === "checkbox") {
    return value ? (field.onValue ?? 1) : (field.offValue ?? 0);
  }
  if (field.numeric) {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return typeof value === "string" ? value.trim() : value;
}

/** Turns a record from the database into the shape the form edits. */
function toForm(fields, record) {
  const out = {};
  for (const f of fields) {
    const raw = record?.[f.name];
    out[f.name] =
      f.type === "checkbox"
        ? raw === (f.onValue ?? 1) || raw === true
        : (raw ?? "");
  }
  return out;
}

/**
 * Builds the WHERE clause a search asks for, with its bound arguments.
 *
 * The original concatenated values straight in and interpolated `fld.getName`
 * (the function, not the name) into both range branches. Everything here is a
 * placeholder.
 */
function buildSearch(fields, criteria) {
  const clauses = [];
  const args = [];

  for (const field of fields) {
    const c = criteria[field.name];
    if (!c?.enabled) continue;

    const from = String(c.from ?? "").trim();
    const to = String(c.to ?? "").trim();
    if (from === "" && to === "") continue;

    if (field.rangeable && from !== "" && to !== "") {
      clauses.push(`(${field.name} >= ? and ${field.name} <= ?)`);
      args.push(toColumn(field, from), toColumn(field, to));
    } else if (field.numeric) {
      clauses.push(`(${field.name} = ?)`);
      args.push(toColumn(field, from));
    } else if (field.type === "date") {
      clauses.push(`(${field.name} = ?)`);
      args.push(from);
    } else {
      // Text matches on a prefix, as it always has.
      clauses.push(`(${field.name} like ?)`);
      args.push(`${from}%`);
    }
  }

  return { where: clauses.join(" and "), args };
}

/** A column-name guard: identifiers cannot be bound, so they are checked. */
function safeName(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`"${name}" is not a usable column or table name`);
  }
  return name;
}

export function TableMaint({
  db,
  title,
  table,
  fields: declared,
  linked = [],
  pageSize = 20,
  /* Slave mode: rendered inside a parent record, showing only the child rows
     that belong to it. The link column is hidden and filled in on save. */
  linkField,
  linkId,
  /* The hooks an app redefines. Each may be async. */
  validateForm,
  preNew,
  postNew,
  preEdit,
  postEdit,
  preDelete,
  postDelete,
  specialActions,
  onError,
}) {
  const slave = linkField !== undefined && linkId !== undefined;
  const fields = useMemo(() => declared.map(normalise), [declared]);

  /* Fields the current mode shows. In slave mode the link column is implied by
     which parent record you are looking at, so showing it is noise. */
  const visible = useMemo(
    () => fields.filter((f) => !slave || f.name !== linkField),
    [fields, slave, linkField],
  );

  const [view, setView] = useState({ mode: "list", id: null });
  const [rows, setRows] = useState([]);
  const [record, setRecord] = useState(null);
  const [restrict, setRestrict] = useState(null);
  const [criteria, setCriteria] = useState({});
  const [page, setPage] = useState({ from: 0, to: null });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);

  const fail = useCallback(
    (e) => {
      const message = e?.message ?? String(e);
      if (live.current) setError(message);
      onError?.(e);
    },
    [onError],
  );

  /** Runs an async step with the spinner and error banner around it. */
  const guard = useCallback(
    async (step) => {
      setBusy(true);
      setError(null);
      try {
        await step();
      } catch (e) {
        fail(e);
      } finally {
        if (live.current) setBusy(false);
      }
    },
    [fail],
  );

  /* ------------------------------------------------------------------ list */

  const loadList = useCallback(
    (from = 0, to = null) =>
      guard(async () => {
        const name = safeName(table);
        const where = [];
        const args = [];

        if (slave) {
          where.push(`${safeName(linkField)} = ?`);
          args.push(linkId);
        }
        if (restrict) {
          where.push(`(${restrict.where})`);
          args.push(...restrict.args);
        }

        /* Pagination walks rowids rather than counting offsets, which is what
           makes Prev/Next cheap on a table of any size. `to` set means we are
           paging backwards and the result needs reversing for display. */
        const backwards = to !== null;
        if (backwards) where.push("rowid <= ?");
        else where.push("rowid >= ?");
        args.push(backwards ? to : from);

        /* `as rowid` keeps the name: a table with an INTEGER PRIMARY KEY would
           otherwise report the rowid under that column's name instead. */
        const sql =
          `select rowid as rowid, * from ${name}` +
          (where.length ? ` where ${where.join(" and ")}` : "") +
          ` order by rowid ${backwards ? "desc" : "asc"}` +
          (slave ? "" : ` limit ${Number(pageSize) | 0}`);

        const result = await db.select(sql, args);
        if (!live.current) return;
        setRows(backwards ? result.slice().reverse() : result);
        setPage({ from, to });
        setView({ mode: "list", id: null });
      }),
    [db, table, slave, linkField, linkId, restrict, pageSize, guard],
  );

  /* ---------------------------------------------------------------- record */

  const loadRecord = useCallback(
    (id) =>
      guard(async () => {
        const found = await db.selectOne(
          `select rowid as rowid, * from ${safeName(table)} where rowid = ?`,
          [id],
        );
        if (!live.current) return;
        if (!found) throw new Error(`No record ${id} in ${table}`);
        setRecord(found);
        setView({ mode: "record", id });
      }),
    [db, table, guard],
  );

  useEffect(() => {
    loadList(0, null);
    // Reloading when the parent record changes is what makes a linked table
    // follow its parent.
  }, [db, table, linkId, restrict]);

  /* ----------------------------------------------------------------- write */

  const save = useCallback(
    (values, id) =>
      guard(async () => {
        const next = {};
        for (const f of visible) next[f.name] = toColumn(f, values[f.name]);
        if (slave) next[linkField] = linkId;

        const editing = id !== null && id !== undefined;
        if (editing) await preEdit?.(id, next);
        else await preNew?.(next);

        if ((await validateForm?.(next, id)) === false) return;

        const names = Object.keys(next).map(safeName);
        const args = names.map((n) => next[n]);

        if (editing) {
          await db.exec(
            `update ${safeName(table)} set ${names.map((n) => `${n} = ?`).join(", ")}` +
              ` where rowid = ?`,
            [...args, id],
          );
          await postEdit?.(id, next);
          await loadRecord(id);
        } else {
          const rowid = await db.insert(
            `insert into ${safeName(table)} (${names.join(", ")})` +
              ` values (${names.map(() => "?").join(", ")})`,
            args,
          );
          await postNew?.(rowid, next);
          await loadRecord(rowid);
        }
      }),
    [db, table, visible, slave, linkField, linkId, guard, loadRecord,
     preEdit, preNew, postEdit, postNew, validateForm],
  );

  const remove = useCallback(
    (id) =>
      guard(async () => {
        if (!globalThis.confirm("Delete Record?")) return;
        await preDelete?.(id);
        await db.exec(`delete from ${safeName(table)} where rowid = ?`, [id]);
        await postDelete?.(id);
        await loadList(0, null);
      }),
    [db, table, guard, loadList, preDelete, postDelete],
  );

  /* ------------------------------------------------------------------ view */

  const heading = slave
    ? title
    : `${title} - ${
        { list: "List", record: "Record", edit: "Edit", new: "New", search: "Search" }[
          view.mode
        ]
      }`;

  const banner = error
    ? html`<${Alert} variant="danger" dismissible onClose=${() => setError(null)}>
        ${error}
      <//>`
    : null;

  const spinner = busy
    ? html`<div class="text-center my-3">
        <${Spinner} animation="border" role="status" size="sm" />
        <span class="visually-hidden">Loading…</span>
      </div>`
    : null;

  function ListView() {
    const columns = visible.filter((f) => f.inList);
    return html`
      <div class="table-responsive">
        <${Table} hover size="sm" className="align-middle">
          <thead>
            <tr>
              <th scope="col">${slave ? "Details" : "Id"}</th>
              ${columns.map(
                (f) => html`<th key=${f.name} scope="col" class=${alignOf(f)}>
                  ${f.title}
                </th>`,
              )}
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              (row) => html`
                <tr key=${row.rowid}>
                  <td>
                    <${Button} size="sm" variant="primary"
                      onClick=${() => loadRecord(row.rowid)}
                      aria-label=${`Open record ${row.rowid}`}>
                      ${slave
                        ? html`<i class="fa-solid fa-circle-info"></i>`
                        : row.rowid}
                    <//>
                  </td>
                  ${columns.map(
                    (f) => html`<td key=${f.name} class=${alignOf(f)}>
                      ${formatValue(f, row[f.name])}
                    </td>`,
                  )}
                </tr>`,
            )}
            ${!rows.length && !busy
              ? html`<tr>
                  <td colspan=${columns.length + 1} class="text-center text-muted">
                    ${restrict ? "Nothing matched that search" : "No records yet"}
                  </td>
                </tr>`
              : null}
          </tbody>
        <//>
      </div>

      <div class="text-center">
        <${ButtonGroup} size="sm">
          <${Button} variant="primary" onClick=${() => setView({ mode: "new", id: null })}>
            New
          <//>
          ${!slave
            ? html`
                <${Button} variant="secondary" onClick=${() => loadList(0, null)}>First<//>
                <${Button} variant="secondary"
                  disabled=${!rows.length}
                  onClick=${() => loadList(0, Math.max(0, (rows[0]?.rowid ?? 1) - 1))}>
                  Prev.
                <//>
                <${Button} variant="secondary"
                  disabled=${rows.length < pageSize}
                  onClick=${() => loadList((rows[rows.length - 1]?.rowid ?? 0) + 1, null)}>
                  Next
                <//>
                <${Button} variant="secondary"
                  onClick=${() => loadList(0, Number.MAX_SAFE_INTEGER)}>Last<//>
                ${restrict
                  ? html`<${Button} variant="secondary" onClick=${() => setRestrict(null)}>
                      Clear Search
                    <//>`
                  : html`<${Button} variant="secondary"
                      onClick=${() => setView({ mode: "search", id: null })}>
                      Search
                    <//>`}
              `
            : null}
        <//>
      </div>`;
  }

  function RecordView() {
    const actions = specialActions?.(view.id) ?? [];
    return html`
      <${Table} borderless size="sm" className="align-middle">
        <tbody>
          ${visible.map(
            (f) => html`
              <tr key=${f.name}>
                <th scope="row" class="w-25">${f.title}</th>
                <td class=${alignOf(f)}>${formatValue(f, record?.[f.name])}</td>
              </tr>`,
          )}
        </tbody>
      <//>

      <div class="text-center">
        <${ButtonGroup} size="sm">
          <${Button} variant="primary" onClick=${() => setView({ mode: "edit", id: view.id })}>
            Edit
          <//>
          <${Button} variant="secondary" onClick=${() => remove(view.id)}>Delete<//>
          <${Button} variant="secondary" onClick=${() => loadList(0, null)}>Ok<//>
          ${actions.length
            ? html`
                <${Dropdown} as=${ButtonGroup}>
                  <${Dropdown.Toggle} variant="secondary" size="sm">Special<//>
                  <${Dropdown.Menu}>
                    ${actions.map(
                      (a) => html`<${Dropdown.Item} key=${a.label}
                        onClick=${() => a.bind(view.id)}>${a.label}<//>`,
                    )}
                  <//>
                <//>`
            : null}
        <//>
      </div>

      ${linked.map(
        (child) => html`
          <hr key=${`${child.table}-rule`} />
          <${TableMaint} key=${child.table}
            db=${db}
            title=${child.title ?? child.table}
            table=${child.table}
            fields=${child.fields}
            linkField=${child.on}
            linkId=${view.id}
            onError=${onError} />`,
      )}`;
  }

  function EditView({ editing }) {
    const initial = editing ? toForm(visible, record) : toForm(visible, {});
    return html`
      <${Form} initial=${initial} onSubmit=${(v) => save(v, editing ? view.id : null)}>
        ${visible.map(
          (f) => html`<${FieldInput} key=${f.name} field=${f} disabled=${busy} />`,
        )}
        <div class="text-center">
          <${ButtonGroup} size="sm">
            <${Button} type="submit" variant="primary" disabled=${busy}>Save<//>
            <${Button} type="button" variant="secondary"
              onClick=${() => (editing ? loadRecord(view.id) : loadList(0, null))}>
              Cancel
            <//>
          <//>
        </div>
      <//>`;
  }

  function SearchView() {
    const searchable = visible.filter((f) => f.inSearch);
    const set = (name, patch) =>
      setCriteria((c) => ({ ...c, [name]: { ...c[name], ...patch } }));

    return html`
      <${Table} borderless size="sm" className="align-middle">
        <tbody>
          ${searchable.map(
            (f) => html`
              <tr key=${f.name}>
                <td class="w-auto">
                  <input type="checkbox" class="form-check-input"
                    id=${`${f.name}_x`}
                    checked=${!!criteria[f.name]?.enabled}
                    onChange=${(e) => set(f.name, { enabled: e.currentTarget.checked })} />
                </td>
                <td>
                  <label class="form-label fw-bold" for=${`${f.name}_s1`}>${f.title}</label>
                  <div class="d-flex align-items-center gap-2">
                    <input class="form-control" id=${`${f.name}_s1`}
                      type=${f.type === "date" ? "date" : f.numeric ? "number" : "text"}
                      value=${criteria[f.name]?.from ?? ""}
                      onInput=${(e) => set(f.name, { from: e.currentTarget.value })} />
                    ${f.rangeable
                      ? html`
                          <span>-</span>
                          <input class="form-control" id=${`${f.name}_s2`}
                            aria-label=${`${f.title} range end`}
                            type=${f.type === "date" ? "date" : "number"}
                            value=${criteria[f.name]?.to ?? ""}
                            onInput=${(e) => set(f.name, { to: e.currentTarget.value })} />`
                      : null}
                  </div>
                </td>
              </tr>`,
          )}
        </tbody>
      <//>

      <div class="text-center">
        <${ButtonGroup} size="sm">
          <${Button} variant="primary"
            onClick=${() => {
              const built = buildSearch(searchable, criteria);
              setRestrict(built.where ? built : null);
            }}>
            Search
          <//>
          <${Button} variant="secondary" onClick=${() => loadList(0, null)}>List<//>
        <//>
      </div>`;
  }

  const body = {
    list: ListView,
    record: RecordView,
    search: SearchView,
    edit: () => EditView({ editing: true }),
    new: () => EditView({ editing: false }),
  }[view.mode];

  return html`
    <${Panel} title=${heading}>
      ${banner}
      ${spinner}
      ${body()}
    <//>`;
}

/**
 * Options for a `list` field, read from another table — xbTableListField.
 *
 * A hook rather than a field type, because it has to fetch: pass the result in
 * as the field's `options`.
 *
 *     const groups = useTableOptions(db, "grp", "name");
 *     fields=${[{ type: "list", title: "Group", name: "grp", options: groups }]}
 */
export function useTableOptions(db, table, field) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const rows = await db.select(
          `select rowid as rowid, ${safeName(field)} from ${safeName(table)}` +
            ` order by ${safeName(field)}`,
        );
        if (live) {
          setOptions(rows.map((r) => ({ label: r[field], value: r.rowid })));
        }
      } catch {
        if (live) setOptions([]);
      }
    })();
    return () => { live = false; };
  }, [db, table, field]);

  return options;
}
