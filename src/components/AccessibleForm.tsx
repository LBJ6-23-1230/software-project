import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FieldError = { field: Control; id: string; name: string; message: string };

/** Native HTML constraints, with a persistent, linked error summary. */
export function AccessibleForm({ children, onSubmit, onInputCapture, ...props }:
  Omit<ComponentPropsWithoutRef<"form">, "noValidate">) {
  const prefix = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const sequence = useRef(0);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const summary = useRef<HTMLDivElement>(null);
  const attempted = useRef(false);
  const owned = useRef(new Map<Control, { id: string; invalid: string | null }>());

  function clearAssociation(field: Control, saved: { id: string; invalid: string | null }) {
    const descriptions = (field.getAttribute("aria-describedby") || "")
      .split(/\s+/).filter(id => id && id !== saved.id);
    if (descriptions.length) field.setAttribute("aria-describedby", descriptions.join(" "));
    else field.removeAttribute("aria-describedby");
    if (saved.invalid === null) field.removeAttribute("aria-invalid");
    else field.setAttribute("aria-invalid", saved.invalid);
  }

  function validate(form: HTMLFormElement) {
    const controls = Array.from(form.elements).filter((el): el is Control =>
      el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement);
    const next: FieldError[] = [];
    for (const [field, saved] of owned.current) {
      clearAssociation(field, saved);
      if (!form.contains(field)) owned.current.delete(field);
    }
    controls.forEach(field => {
      if (!field.willValidate || field.validity.valid) return;
      const saved = owned.current.get(field) || {
        id: `${prefix}-error-${sequence.current++}`, invalid: field.getAttribute("aria-invalid"),
      };
      owned.current.set(field, saved);
      if (!field.id) field.id = `${saved.id}-field`;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), saved.id].filter(Boolean).join(" "));
      const label = field.labels?.[0];
      const name = field.getAttribute("aria-label") || (label && Array.from(label.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ").trim()) || "该字段";
      next.push({ field, id: saved.id, name, message: field.validationMessage });
    });
    setErrors(previous => previous.length === next.length && previous.every((error, index) => {
      const current = next[index];
      return error.field === current.field && error.id === current.id &&
        error.name === current.name && error.message === current.message;
    }) ? previous : next);
    return next;
  }

  // Controlled updates (demo account fill, conditional registration fields) do not
  // necessarily dispatch an input event. Reconcile after React commits the DOM.
  useLayoutEffect(() => {
    if (attempted.current && formRef.current) validate(formRef.current);
  });

  useEffect(() => () => {
    for (const [field, saved] of owned.current) clearAssociation(field, saved);
  }, []);

  return <form {...props} ref={formRef} noValidate onSubmit={event => {
    attempted.current = true;
    if (validate(event.currentTarget).length) {
      event.preventDefault();
      requestAnimationFrame(() => summary.current?.focus());
    } else onSubmit?.(event);
  }} onInputCapture={event => {
    onInputCapture?.(event);
    if (attempted.current) validate(event.currentTarget);
  }}>
    {errors.length > 0 && <div className="error-box form-errors" role="alert"
      aria-labelledby={`${prefix}-error-title`} tabIndex={-1} ref={summary}>
      <strong id={`${prefix}-error-title`}>请检查以下 {errors.length} 项后再提交</strong>
      <ul>{errors.map(({ field, id, name, message }) => <li key={id}>
        <a href={`#${field.id}`} onClick={event => {
          event.preventDefault();
          field.focus();
          field.scrollIntoView({ block: "center" });
        }}><span id={id}>{name}：{message}</span></a>
      </li>)}</ul>
    </div>}
    {children}
  </form>;
}
