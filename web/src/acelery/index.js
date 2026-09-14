/**
 * The aCelery capability API.
 *
 * Apps import from the bare name, which the import map in launcher.html
 * resolves to this directory:
 *
 *     import { openDB } from "acelery/sql.js";
 *     import * as acelery from "acelery";
 *
 * Namespaced rather than flattened, because `file.open` and `http.get` would
 * otherwise collide with each other and with anything an app defines.
 */

export * as sql from "./sql.js";
export * as file from "./file.js";
export * as http from "./http.js";
export * as exports from "./export.js";
export { BridgeError } from "./bridge.js";
