/**
 * Charts.
 *
 * The one genuinely new dependency in Phase 4 (§3.8). Nothing in xScript's 119
 * classes drew a chart, and the shipped Example's entire reporting story was
 * `dirExport()` writing a CSV — so this adds a capability rather than
 * replacing one.
 *
 * Chart.js is registered piecewise rather than through `chart.js/auto`, which
 * pulls every controller, scale and plugin whether a page draws a pie or not.
 * The set below is what an aCelery app plausibly needs over a SQLite table:
 * bar, line, pie, doughnut.
 *
 *     <${Chart} type="bar"
 *       data=${{ labels, datasets: [{ label: "Sales", data }] }} />
 *
 * Canvas is not a VDOM: the chart instance is created against a node this
 * component owns and destroyed with it, the same arrangement the editor uses.
 * Data changes update the existing instance rather than rebuilding it, so a
 * refresh animates from where it was instead of flashing.
 */

/* Preact comes from acelery/ui.js, not from preact directly.
 *
 * This is a separate bundle, so importing preact here would embed a second
 * copy of the core — and then the hooks in this file would register on a
 * different instance than the one rendering the app, which is the failure
 * §3.1a documents: the first render dies with "Cannot read properties of
 * undefined (reading 'context')". The specifier stays bare and external, so
 * the import map resolves both to the same module at runtime.
 *
 * Usefully, this also makes the mistake unbuildable rather than merely
 * detectable: drop --external:acelery/* and esbuild refuses the bare specifier
 * outright instead of quietly bundling a second copy. */
import { html, useEffect, useLayoutEffect, useRef } from "acelery/ui.js";

import {
  Chart as ChartJs,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  PieController, DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend, Title, Colors, Filler,
} from "chart.js";

ChartJs.register(
  BarController, BarElement,
  LineController, LineElement, PointElement,
  PieController, DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend, Title, Colors, Filler,
);

/** The chart types this build registers controllers for. */
export const CHART_TYPES = ["bar", "line", "pie", "doughnut"];

/**
 * @param {object} props
 * @param {"bar"|"line"|"pie"|"doughnut"} [props.type]
 * @param {object} props.data      Chart.js data: {labels, datasets}
 * @param {object} [props.options] Chart.js options, merged over the defaults
 * @param {string|number} [props.height] CSS height for the canvas box
 * @param {string} [props.title]
 */
export function Chart({
  type = "bar",
  data,
  options,
  height = 300,
  title,
  className,
  ...rest
}) {
  const canvas = useRef(null);
  const chart = useRef(null);

  /* Created in a layout effect so the canvas has been laid out and Chart.js
     measures a real box rather than zero. */
  useLayoutEffect(() => {
    if (!canvas.current) return;
    chart.current = new ChartJs(canvas.current, {
      type,
      data,
      options: {
        responsive: true,
        // The parent box sets the height; without this Chart.js keeps a 2:1
        // aspect ratio and ignores it.
        maintainAspectRatio: false,
        plugins: {
          legend: { display: (data?.datasets?.length ?? 0) > 1 },
          title: title ? { display: true, text: title } : { display: false },
        },
        ...options,
      },
    });
    return () => {
      chart.current?.destroy();
      chart.current = null;
    };
    // Changing the type means a different controller, so the instance is
    // rebuilt; data changes are handled below.
  }, [type]);

  useEffect(() => {
    const instance = chart.current;
    if (!instance) return;
    instance.data = data;
    if (options) Object.assign(instance.options, options);
    instance.update();
  }, [data, options]);

  return html`
    <div class=${className}
         style=${{ position: "relative",
                   height: typeof height === "number" ? `${height}px` : height }}
         ...${rest}>
      <canvas ref=${canvas}></canvas>
    </div>`;
}

/**
 * Turns rows from `db.select` into Chart.js data.
 *
 * The shape an aCelery app has is a result set, not a Chart.js config, so this
 * is the step that would otherwise be written in every app:
 *
 *     const rows = await db.select("select grp, count(*) n from person group by grp");
 *     <${Chart} type="pie" data=${fromRows(rows, "grp", "n")} />
 *
 * @param {object[]} rows
 * @param {string} labelColumn
 * @param {string|string[]} valueColumns
 */
export function fromRows(rows, labelColumn, valueColumns) {
  const columns = Array.isArray(valueColumns) ? valueColumns : [valueColumns];
  return {
    labels: rows.map((r) => String(r[labelColumn] ?? "")),
    datasets: columns.map((column) => ({
      label: column,
      data: rows.map((r) => Number(r[column] ?? 0)),
    })),
  };
}
