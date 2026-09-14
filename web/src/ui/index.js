/**
 * The aCelery widget layer.
 *
 * Preact 10 + htm for rendering, react-bootstrap for the Bootstrap 5 component
 * set, and a small aCelery layer on top for the parts react-bootstrap has no
 * equivalent of — labelled inputs that own their label/id pairing, a form that
 * can collect and validate its fields, and theming (§3.1, §3.1a, §3.4).
 *
 * Apps import it by bare name, which the import map resolves:
 *
 *     import { html, render, Panel, Input, Button } from "acelery/ui.js";
 *
 *     export default function main() {
 *       render(html`
 *         <${Panel} title="Directory">
 *           <${Input} label="Name" name="mname" validate=${[notEmpty()]} />
 *         <//>`, document.body);
 *     }
 *
 * htm compiles its templates at runtime, so an app is a plain file that needs
 * no build step — the constraint that survived the clean slate (§1, C1).
 */

/* Rendering. */
export { html } from "htm/preact";
export { render, createRef, Fragment, createContext } from "preact";
export {
  useState, useEffect, useMemo, useRef, useCallback, useContext, useReducer,
} from "preact/hooks";

/* aCelery's own components. */
export {
  Form, useForm, Input, TextArea, Select, CheckBox, InputGroup,
  notEmpty, notZero, email, tel, maxLength,
} from "./form.js";
export { Container, Row, Col, Panel, Card } from "./layout.js";
export {
  THEMES, applyTheme, currentTheme, isDark, ThemeSelect,
} from "./theme.js";

/* react-bootstrap, re-exported so an app needs one import. Everything here is
   Bootstrap 5 markup rendered to light DOM, so the themes reach it. */
export { default as Alert } from "react-bootstrap/Alert";
export { default as Badge } from "react-bootstrap/Badge";
export { default as Button } from "react-bootstrap/Button";
export { default as ButtonGroup } from "react-bootstrap/ButtonGroup";
export { default as Dropdown } from "react-bootstrap/Dropdown";
export { default as DropdownButton } from "react-bootstrap/DropdownButton";
export { default as Image } from "react-bootstrap/Image";
export { default as ListGroup } from "react-bootstrap/ListGroup";
export { default as Modal } from "react-bootstrap/Modal";
export { default as Nav } from "react-bootstrap/Nav";
export { default as NavDropdown } from "react-bootstrap/NavDropdown";
export { default as Navbar } from "react-bootstrap/Navbar";
export { default as Offcanvas } from "react-bootstrap/Offcanvas";
export { default as Pagination } from "react-bootstrap/Pagination";
export { default as ProgressBar } from "react-bootstrap/ProgressBar";
export { default as Spinner } from "react-bootstrap/Spinner";
export { default as Tab } from "react-bootstrap/Tab";
export { default as Table } from "react-bootstrap/Table";
export { default as Tabs } from "react-bootstrap/Tabs";
