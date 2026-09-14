/**
 * Labelled inputs, and a form that can collect and validate them.
 *
 * react-bootstrap supplies the markup (§3.1a) but not xScript's other half:
 * `xbForm.getFormData()` and `validateForm()` walked their children calling
 * `getValue()` and `validate()` on each. There is no persistent widget instance
 * to walk in a VDOM, so that role moves here — one piece of state in <Form>,
 * shared with the fields through context.
 *
 * The label/control pairing is the component's business, not the author's,
 * exactly as it was in xbStringInput — and here it comes with the `for`/`id`
 * association that xscript.js never emitted (§7.3).
 */

import { html } from "htm/preact";
import { createContext } from "preact";
import { useContext, useMemo, useState, useCallback } from "preact/hooks";
import RBForm from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";

const FormContext = createContext(null);

/** Generates a stable id when the caller did not supply one. */
let seq = 0;
function useFieldId(given, name) {
  return useMemo(() => given ?? `${name || "field"}_${++seq}`, [given, name]);
}

/**
 * Runs a field's validators and returns the first failure message, or null.
 * A validator is `(value) => string | null | true` — a string is the message.
 */
function firstError(value, validators) {
  for (const v of validators) {
    const result = v(value);
    if (typeof result === "string") return result;
    if (result === false) return "Invalid";
  }
  return null;
}

/**
 * The form. Owns field values and errors; `onSubmit` receives the collected
 * values, and only fires once every field validates.
 *
 *     <${Form} onSubmit=${save}>
 *       <${Input} label="Name" name="mname" validate=${[notEmpty]} />
 *       <${Button} type="submit">Save<//>
 *     <//>
 */
export function Form({ initial = {}, onSubmit, children, ...rest }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const validators = useMemo(() => new Map(), []);

  const setValue = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    // Clear a field's error as soon as it is edited; re-check on submit.
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }, []);

  const register = useCallback(
    (name, fieldValidators) => {
      if (fieldValidators.length) validators.set(name, fieldValidators);
      else validators.delete(name);
      return () => validators.delete(name);
    },
    [validators],
  );

  /** xbForm.getFormData(): every field's current value. */
  const getFormData = useCallback(() => ({ ...values }), [values]);

  /** xbForm.validateForm(): true when every field passes. */
  const validateForm = useCallback(() => {
    const found = {};
    for (const [name, fieldValidators] of validators) {
      const message = firstError(values[name], fieldValidators);
      if (message) found[name] = message;
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }, [values, validators]);

  const context = useMemo(
    () => ({ values, errors, setValue, register, submitted }),
    [values, errors, setValue, register, submitted],
  );

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (validateForm()) onSubmit?.(getFormData());
  }

  return html`
    <${FormContext.Provider} value=${context}>
      <${RBForm} noValidate onSubmit=${handleSubmit} ...${rest}>
        ${children}
      <//>
    <//>`;
}

/** Lets a caller outside the tree read or check the form it is inside. */
export function useForm() {
  const context = useContext(FormContext);
  if (!context) throw new Error("useForm must be used inside a <Form>");
  return context;
}

/**
 * Shared plumbing for every labelled control: id, label, value wiring,
 * validation feedback, and the mb-3 wrapper xbStringInput hard-coded.
 */
function useField({ name, id, validate = [], value, onChange }) {
  const form = useContext(FormContext);
  const fieldId = useFieldId(id, name);

  useMemo(() => form?.register(name, validate), [form, name, validate.length]);

  const controlled = form && name !== undefined;
  return {
    fieldId,
    value: controlled ? (form.values[name] ?? "") : value,
    error: controlled ? form.errors[name] : undefined,
    handle(next) {
      if (controlled) form.setValue(name, next);
      onChange?.(next);
    },
  };
}

function Field({ fieldId, label, error, help, className, children }) {
  return html`
    <div class=${`mb-3 ${className ?? ""}`}>
      ${label &&
      html`<label class="form-label fw-bold" for=${fieldId}>${label}</label>`}
      ${children}
      ${error && html`<div class="invalid-feedback d-block">${error}</div>`}
      ${help && html`<div class="form-text">${help}</div>`}
    </div>`;
}

/** xbStringInput and its typed siblings, as one component with a `type`. */
export function Input({
  label,
  name,
  type = "text",
  validate,
  value,
  onChange,
  id,
  className,
  help,
  ...rest
}) {
  const f = useField({ name, id, validate, value, onChange });
  return html`
    <${Field} fieldId=${f.fieldId} label=${label} error=${f.error}
              help=${help} className=${className}>
      <${RBForm.Control} type=${type} id=${f.fieldId} name=${name}
        value=${f.value} isInvalid=${!!f.error}
        onInput=${(e) => f.handle(e.currentTarget.value)} ...${rest} />
    <//>`;
}

export function TextArea({
  label, name, rows = 4, validate, value, onChange, id, className, help, ...rest
}) {
  const f = useField({ name, id, validate, value, onChange });
  return html`
    <${Field} fieldId=${f.fieldId} label=${label} error=${f.error}
              help=${help} className=${className}>
      <${RBForm.Control} as="textarea" rows=${rows} id=${f.fieldId} name=${name}
        value=${f.value} isInvalid=${!!f.error}
        onInput=${(e) => f.handle(e.currentTarget.value)} ...${rest} />
    <//>`;
}

/**
 * xbSelect. `options` takes the `{label, value}` shape xScript's addOptions
 * used, or bare strings.
 */
export function Select({
  label, name, options = [], validate, value, onChange, id, className, help,
  placeholder, ...rest
}) {
  const f = useField({ name, id, validate, value, onChange });
  return html`
    <${Field} fieldId=${f.fieldId} label=${label} error=${f.error}
              help=${help} className=${className}>
      <${RBForm.Select} id=${f.fieldId} name=${name} value=${f.value}
        isInvalid=${!!f.error}
        onChange=${(e) => f.handle(e.currentTarget.value)} ...${rest}>
        ${placeholder && html`<option value="">${placeholder}</option>`}
        ${options.map((o) => {
          const value = typeof o === "string" ? o : o.value;
          const text = typeof o === "string" ? o : o.label;
          return html`<option key=${value} value=${value}>${text}</option>`;
        })}
      <//>
    <//>`;
}

/** xbCheckBox. The label belongs beside the box, so this does not use Field. */
export function CheckBox({ label, name, checked, onChange, id, className, ...rest }) {
  const form = useContext(FormContext);
  const fieldId = useFieldId(id, name);
  const controlled = form && name !== undefined;
  const isChecked = controlled ? !!form.values[name] : !!checked;
  return html`
    <${RBForm.Check} type="checkbox" id=${fieldId} name=${name} label=${label}
      className=${`mb-3 ${className ?? ""}`} checked=${isChecked}
      onChange=${(e) => {
        const next = e.currentTarget.checked;
        if (controlled) form.setValue(name, next);
        onChange?.(next);
      }} ...${rest} />`;
}

/** A control with text or a button attached, e.g. a search box. */
export { InputGroup };

/* Validators, in the shape `useField` expects. xscript.js shipped these as a
   class hierarchy (xValidator and friends); a validator that is just a function
   composes better and needs no documentation of its own. */

export const notEmpty =
  (message = "Required") =>
  (v) => (v === undefined || v === null || String(v).trim() === "" ? message : true);

export const notZero =
  (message = "Must not be zero") =>
  (v) => (Number(v) === 0 ? message : true);

export const email =
  (message = "Not a valid email address") =>
  (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : message);

export const tel =
  (message = "Not a valid phone number") =>
  (v) => (!v || /^[+0-9][0-9 ()./-]{4,}$/.test(v) ? true : message);

export const maxLength = (n, message) => (v) =>
  !v || String(v).length <= n ? true : (message ?? `At most ${n} characters`);
