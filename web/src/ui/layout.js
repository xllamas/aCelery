/**
 * Layout and containers.
 *
 * `xbLayout` inherited `xLayout` unchanged, which built an HTML <table> with
 * percentage-width <td>s — so aCelery had no responsive layout at all, on a
 * phone-first product. These sit on Bootstrap's grid instead and stack on a
 * narrow screen for free (§3.4).
 */

import { html } from "htm/preact";
import Container from "react-bootstrap/Container";
import RBRow from "react-bootstrap/Row";
import RBCol from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";

export { Container };

/** A grid row. Children wrap rather than overflow. */
export function Row({ children, className, ...rest }) {
  return html`<${RBRow} className=${className} ...${rest}>${children}<//>`;
}

/**
 * A grid column. `span` is the width at md and up (1-12); below md every column
 * is full width, which is what a phone wants. Pass `col` props directly for
 * finer control.
 */
export function Col({ span, children, className, ...rest }) {
  const width = span === undefined ? true : { xs: 12, md: span };
  return html`
    <${RBCol} ...${typeof width === "object" ? width : { xs: 12 }}
              className=${className} ...${rest}>${children}<//>`;
}

/**
 * xbTitlePanel — a card with a header. `xbPanel` is the same thing without a
 * title, so `title` is optional rather than a second component.
 *
 * The title is rendered as a child, not interpolated into a string of HTML the
 * way xbTitlePanel built its header (§7.4), so a title containing a "<" is a
 * title.
 */
export function Panel({ title, footer, children, className, ...rest }) {
  return html`
    <${Card} className=${className} ...${rest}>
      ${title && html`<${Card.Header}>${title}<//>`}
      <${Card.Body}>${children}<//>
      ${footer && html`<${Card.Footer}>${footer}<//>`}
    <//>`;
}

export { Card };
