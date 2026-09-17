/*  Copyright 2014: Xavier Llamas Rolland                      */
/*                                                             */
/*  This software distributed under the GPLv3 License          */
/*                                                             */
////////////////////////////////////////////////////////////////

/**
 * The aCelery example app — and the reference documentation for authors.
 *
 * Everything an app needs comes from two bare-name imports, which the import
 * map in launcher.html resolves. There is no build step: htm compiles its
 * templates at runtime, so this file is what runs.
 *
 * Read it top to bottom for how an app is put together:
 *
 *   - `main` is the default export; launcher.html imports this module and
 *     calls it. acelery_app.json names the file.
 *   - the database is opened once and awaited; every call returns a promise
 *     and the UI does not freeze while one is in flight.
 *   - the UI is a component tree rendered into <body>. Navigating means
 *     changing state, not demolishing and rebuilding the page.
 */

import { openDB } from "acelery/sql.js";
import { saveFile, closeApp } from "acelery/export.js";
import * as file from "acelery/file.js";
import { pickFiles, pickImages, shrinkImage } from "acelery/picker.js";
/* Charts are a separate import because Chart.js is 68 KB gzipped and most apps
   never draw one — an app pays for it only by asking. */
import { Chart, fromRows } from "acelery/chart.js";
import {
  html, render, useState, useEffect, useRef, useDismiss,
  Navbar, Nav, NavDropdown, Container,
  Alert, Button, ButtonGroup, ListGroup, Modal, Tab, Tabs,
  Row, Col, Panel,
  Form, Input, Select, TextArea, CheckBox,
  TableMaint, ThemeSelect, ImageCropper,
  notEmpty, email,
} from "acelery/ui.js";

/* ------------------------------------------------------------------ schema */

const GROUPS = [
  { label: "Family", value: "family" },
  { label: "Friends", value: "friends" },
  { label: "Work", value: "work" },
];

/** The fields the Directory maintains, as TableMaint understands them. */
const PERSON_FIELDS = [
  { type: "string", title: "Name", name: "mname", validate: [notEmpty()] },
  { type: "email", title: "Email", name: "email", validate: [email()] },
  { type: "list", title: "Group", name: "grp", options: GROUPS },
];

/** A child table: one person has many phone numbers. */
const PHONE_FIELDS = [
  { type: "number", title: "Person", name: "person", inList: false },
  { type: "tel", title: "Number", name: "tel", validate: [notEmpty()] },
  {
    type: "list", title: "Type", name: "type",
    options: ["mobile", "home", "work"],
  },
];

async function openDatabase() {
  const db = await openDB("xtest.db");
  await db.exec(
    "create table if not exists person (mname text, email text, grp text)",
  );
  await db.exec(
    "create table if not exists person_tel (person integer, tel text, type text)",
  );
  return db;
}

/* -------------------------------------------------------------- the screens */

/** Directory, on its own: list, record, edit, search. */
const Directory = ({ db }) => html`
  <${TableMaint} db=${db} title="Directory" table="person"
                 fields=${PERSON_FIELDS} />`;

/**
 * The same directory with its phone numbers attached. `linked` renders a child
 * TableMaint inside each record, filtered to that record and filling in the
 * link column on save.
 */
const LinkedDirectory = ({ db }) => html`
  <${TableMaint} db=${db} title="Directory" table="person"
                 fields=${PERSON_FIELDS}
                 linked=${[
                   { title: "Phone numbers", table: "person_tel",
                     on: "person", fields: PHONE_FIELDS },
                 ]} />`;

/** Tabs. */
const TabsDemo = () => html`
  <${Panel} title="Tabs">
    <${Tabs} defaultActiveKey="two" className="mb-3">
      <${Tab} eventKey="one" title="Pane 1">
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      <//>
      <${Tab} eventKey="two" title="Pane 2">
        <p>Nam pellentesque, sem non consectetur cursus, ipsum nulla.</p>
      <//>
      <${Tab} eventKey="three" title="Pane 3">
        <p>Nullam lacinia, lorem non pretium tincidunt, arcu leo.</p>
      <//>
    <//>
  <//>`;

/**
 * The widgets, and the thing xScript never had: a responsive layout.
 *
 * `<Row>`/`<Col span>` sits on Bootstrap's grid, so these two columns are side
 * by side on a tablet and stacked on a phone. The old `xbLayout` built an HTML
 * table of percentage-width cells, which did neither.
 */
function WidgetsDemo() {
  const [saved, setSaved] = useState(null);

  return html`
    <${Panel} title="Widgets">
      <${Row}>
        <${Col} span=${6}>
          <${Form} initial=${{ name: "", grp: "friends", notes: "", active: true }}
                   onSubmit=${setSaved}>
            <${Input} label="Name" name="name" validate=${[notEmpty()]} />
            <${Select} label="Group" name="grp" options=${GROUPS} />
            <${TextArea} label="Notes" name="notes" rows=${3} />
            <${CheckBox} label="Active" name="active" />
            <${Button} type="submit" variant="primary">Save<//>
          <//>
        <//>
        <${Col} span=${6}>
          <${ThemeSelect} />
          ${saved
            ? html`<${Alert} variant="success">
                <pre class="mb-0">${JSON.stringify(saved, null, 2)}</pre>
              <//>`
            : html`<p class="text-muted">
                Fill the form in and press Save: the values come back as one
                object, already validated.
              </p>`}
        <//>
      <//>
    <//>`;
}

/** A modal, and a list built from data. */
function ModalDemo() {
  const [open, setOpen] = useState(false);
  return html`
    <${Panel} title="Modal">
      <${Button} variant="primary" onClick=${() => setOpen(true)}>Open<//>
      <${Modal} show=${open} onHide=${() => setOpen(false)} centered>
        <${Modal.Header} closeButton>
          <${Modal.Title}>aCelery Modal<//>
        <//>
        <${Modal.Body}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin et erat
          et metus auctor cursus.
        <//>
        <${Modal.Footer}>
          <${Button} variant="primary" onClick=${() => setOpen(false)}>Close<//>
        <//>
      <//>
    <//>`;
}

/** Exporting: build a file, hand it to the device's share sheet. */
function ExportDemo({ db }) {
  const [status, setStatus] = useState(null);

  async function exportCsv() {
    try {
      const rows = await db.select(
        "select p.mname, p.email, p.grp, t.tel, t.type" +
          " from person p left join person_tel t on t.person = p.rowid" +
          " order by p.mname",
      );
      if (!rows.length) {
        setStatus({ variant: "warning", text: "Nothing to export yet." });
        return;
      }
      const columns = Object.keys(rows[0]);
      const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [
        columns.join(","),
        ...rows.map((r) => columns.map((c) => escape(r[c])).join(",")),
      ].join("\r\n");

      await saveFile("text/csv", "directory.csv", csv);
      setStatus({ variant: "success", text: `Exported ${rows.length} rows.` });
    } catch (e) {
      setStatus({ variant: "danger", text: e.message });
    }
  }

  return html`
    <${Panel} title="Export">
      <p>
        Writes the directory out as CSV and hands it to the device — the share
        sheet on a phone, a download in a browser on your network.
      </p>
      <${Button} variant="primary" onClick=${exportCsv}>Export CSV<//>
      ${status
        ? html`<${Alert} variant=${status.variant} className="mt-3">
            ${status.text}
          <//>`
        : null}
    <//>`;
}

/**
 * Photos: pick, crop, store, show.
 *
 * The pickers are the page's own file input, so on the phone they open the
 * camera or the gallery, and in a browser on your network they pick from that
 * computer. The bytes then go to the phone with file.writeBytes, and come back
 * by URL for an <img>.
 */
const PHOTOS = "Example/photos";

function PhotoDemo() {
  const [photos, setPhotos] = useState(null);
  const [cropping, setCropping] = useState(null);
  const [picked, setPicked] = useState(null);
  const [status, setStatus] = useState(null);

  async function load() {
    const entries = await file.listFiles(PHOTOS);
    setPhotos(entries
      .filter((e) => !e.directory && /\.(jpe?g|png|webp)$/i.test(e.fname))
      .sort((a, b) => b.lastmodified - a.lastmodified));
  }

  useEffect(() => { load().catch((e) => setStatus({ variant: "danger", text: e.message })); }, []);

  /* A name of the app's choosing: the picked file's own name comes from the
     user's device and may be anything. */
  const store = async (blob) => {
    const name = `${Date.now()}.jpg`;
    await file.writeBytes(`${PHOTOS}/${name}`, blob);
    return name;
  };

  async function run(work) {
    setStatus(null);
    try {
      await work();
      await load();
    } catch (e) {
      setStatus({ variant: "danger", text: e.message });
    }
  }

  /* Browsers open a picker only from a tap, so these run in click handlers. */
  const takeOrChoose = (camera) => run(async () => {
    const [photo] = await pickImages({ camera });
    if (photo) setCropping(photo);
  });

  const addSeveral = () => run(async () => {
    const chosen = await pickImages({ multiple: true });
    for (const photo of chosen) await store(await shrinkImage(photo));
    if (chosen.length) {
      setStatus({ variant: "success", text: `Added ${chosen.length} photos.` });
    }
  });

  const remove = (entry) => run(async () => {
    const handle = await file.open(`${PHOTOS}/${entry.fname}`);
    await handle.delete();
  });

  const inspect = () => run(async () => {
    const [chosen] = await pickFiles();
    if (chosen) setPicked(chosen);
  });

  return html`
    <${Panel} title="Photos">
      <p>
        Take or choose a photo, crop it, and it is stored in
        <code>files/${PHOTOS}</code>.
      </p>
      <div class="d-flex flex-wrap gap-2 mb-3">
        <${Button} variant="primary" onClick=${() => takeOrChoose(true)}>Take a photo<//>
        <${Button} variant="outline-primary" onClick=${() => takeOrChoose(false)}>
          Choose a photo
        <//>
        <${Button} variant="outline-secondary" onClick=${addSeveral}>Add several<//>
      </div>
      ${status
        ? html`<${Alert} variant=${status.variant}>${status.text}<//>`
        : null}
      ${photos === null
        ? html`<p class="text-body-secondary">Loading…</p>`
        : photos.length
          ? html`
              <${Row}>
                ${photos.map((entry) => html`
                  <${Col} span=${3} key=${entry.fname} className="mb-3">
                    <img src=${file.url(`${PHOTOS}/${entry.fname}`)}
                         alt="" class="img-fluid rounded mb-1" />
                    <${Button} size="sm" variant="outline-danger"
                               onClick=${() => remove(entry)}>Delete<//>
                  <//>`)}
              <//>`
          : html`<p class="text-body-secondary">No photos yet.</p>`}
    <//>

    <${Panel} title="Any file" className="mt-3">
      <p>Pick any file to see what the app receives. Nothing is stored.</p>
      <${Button} variant="outline-primary" onClick=${inspect}>Pick a file<//>
      ${picked
        ? html`<p class="mt-3 mb-0">
            <strong>${picked.name}</strong>, ${picked.type || "unknown type"},
            ${picked.size.toLocaleString()} bytes
          </p>`
        : null}
    <//>

    <${ImageCropper} image=${cropping} shape="round" maxSide=${800}
      onCancel=${() => setCropping(null)}
      onDone=${(blob) => run(async () => {
        await store(blob);
        setCropping(null);
      })} />`;
}

/**
 * A chart over the data the Directory holds.
 *
 * `fromRows` is the step between a result set and a Chart.js config, which is
 * otherwise written once per app: group in SQL, chart the rows.
 */
function ChartDemo({ db }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    db.select(
      "select coalesce(nullif(grp, ''), 'unassigned') as grp, count(*) as people" +
        " from person group by grp order by people desc",
    ).then(
      (rows) => live && setData(rows),
      (e) => live && setError(e.message),
    );
    return () => { live = false; };
  }, [db]);

  if (error) return html`<${Alert} variant="danger">${error}<//>`;
  if (!data) return html`<p class="text-body-secondary">Counting…</p>`;

  return html`
    <${Panel} title="People per group">
      ${data.length
        ? html`
            <${Row}>
              <${Col} span=${6}>
                <${Chart} type="bar" height=${260}
                  data=${fromRows(data, "grp", "people")} />
              <//>
              <${Col} span=${6}>
                <${Chart} type="doughnut" height=${260}
                  data=${fromRows(data, "grp", "people")} />
              <//>
            <//>
            <p class="text-body-secondary mt-3 mb-0">
              One query, two charts. Add people in the Directory and come back.
            </p>`
        : html`<${Alert} variant="secondary">
            Nothing to chart yet — add someone in the Directory first.
          <//>`}
    <//>`;
}

/** The front page. */
const Welcome = () => html`
  <${Panel} title="aCelery Example">
    <p>
      This app is the reference for writing your own. Its source is one file,
      <code>example.js</code>, and every screen above is a component in it.
    </p>
    <${ListGroup} variant="flush">
      <${ListGroup.Item}>
        <strong>Directory</strong> — declare fields, get a working CRUD screen
      <//>
      <${ListGroup.Item}>
        <strong>Linked</strong> — a child table inside each record
      <//>
      <${ListGroup.Item}>
        <strong>Widgets</strong> — forms, validation and a responsive layout
      <//>
      <${ListGroup.Item}>
        <strong>Chart</strong> — group in SQL, chart the rows
      <//>
      <${ListGroup.Item}>
        <strong>Export</strong> — build a file and hand it to the device
      <//>
      <${ListGroup.Item}>
        <strong>Photos</strong> — take, choose and crop pictures, and store them
      <//>
    <//>
  <//>`;

/* ------------------------------------------------------------------- shell */

const SCREENS = {
  welcome: Welcome,
  directory: Directory,
  linked: LinkedDirectory,
  tabs: TabsDemo,
  widgets: WidgetsDemo,
  modal: ModalDemo,
  chart: ChartDemo,
  export: ExportDemo,
  photos: PhotoDemo,
};

function App() {
  const [db, setDb] = useState(null);
  const [failure, setFailure] = useState(null);
  const [screen, setScreen] = useState("welcome");
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useRef(null);

  /* The collapsed menu overlays the page rather than pushing it down, so it
     closes on a tap outside as well as on a choice. `useDismiss` is part of
     the widget layer; an app's own panels can use it too. */
  useDismiss(nav, () => setMenuOpen(false), menuOpen);

  useEffect(() => {
    let live = true;
    openDatabase().then(
      (opened) => live && setDb(opened),
      (e) => live && setFailure(e.message),
    );
    return () => { live = false; };
  }, []);

  /** Choosing anything closes the menu, which a phone needs and a desktop
      does not mind. */
  const go = (next) => {
    setScreen(next);
    setMenuOpen(false);
  };

  const Screen = SCREENS[screen];

  return html`
    <${Navbar} expand="lg" className="bg-body-tertiary mb-3"
               expanded=${menuOpen} onToggle=${setMenuOpen}>
      <${Container} fluid ref=${nav}>
        <${Navbar.Toggle} aria-controls="example-nav" />
        <${Navbar.Brand} href="#" onClick=${() => go("welcome")}>aCelery<//>
        <${Navbar.Collapse} id="example-nav">
          <${Nav} className="ms-auto">
            <${NavDropdown} title="Directory" id="example-directory">
              <${NavDropdown.Item} onClick=${() => go("directory")}>
                CRUD Single
              <//>
              <${NavDropdown.Item} onClick=${() => go("linked")}>
                CRUD Linked
              <//>
              <${NavDropdown.Divider} />
              <${NavDropdown.Item} onClick=${() => go("export")}>Export<//>
            <//>
            <${Nav.Link} onClick=${() => go("tabs")}>Tabs<//>
            <${Nav.Link} onClick=${() => go("widgets")}>Widgets<//>
            <${Nav.Link} onClick=${() => go("chart")}>Chart<//>
            <${Nav.Link} onClick=${() => go("photos")}>Photos<//>
            <${Nav.Link} onClick=${() => go("modal")}>Modal<//>
            <${Nav.Link} onClick=${closeApp}>Exit<//>
          <//>
        <//>
      <//>
    <//>

    <${Container} fluid>
      ${failure
        ? html`<${Alert} variant="danger">${failure}<//>`
        : db
          ? html`<${Screen} db=${db} />`
          : html`<p class="text-muted">Opening the database…</p>`}
    <//>`;
}

/**
 * The entry point. launcher.html imports this module and calls the default
 * export; acelery_app.json names the file.
 */
export default function main() {
  render(html`<${App} />`, document.body);
}
