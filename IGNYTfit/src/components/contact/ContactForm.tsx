"use client";

import { CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

interface Errors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const SUBJECTS = [
  "General question",
  "Technical issue",
  "Bug report",
  "Feature request",
  "Privacy or data request",
  "Business enquiry",
];

/**
 * Accessible contact form with two layers of spam protection and no backend
 * requirement.
 *
 * Spam protection:
 *   1. A honeypot field, visually hidden and removed from the tab order. Real
 *      users never fill it; most bots fill every input they find.
 *   2. A submission-time floor — anything sent within three seconds of the
 *      form mounting is treated as automated.
 *
 * Delivery: if `NEXT_PUBLIC_CONTACT_ENDPOINT` is set (a Formspree, Resend
 * handler, or any endpoint accepting JSON), the message is POSTed there.
 * Without it, the form composes a pre-filled mail message instead, so the page
 * is useful the moment it is deployed and gains a real inbox later with a
 * single environment variable.
 *
 * Validation is announced through `aria-invalid` + `aria-describedby`, and the
 * result through a polite live region.
 */
export function ContactForm() {
  const formId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  // Stamped on mount rather than during render: reading the clock while
  // rendering is impure, and the value is only ever read on submit.
  const mountedAt = useRef(0);
  const endpoint = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT;

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const validate = (data: FormData): Errors => {
    const next: Errors = {};
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (name.length < 2) next.name = "Please enter your name.";
    // Deliberately permissive: the only reliable test of an address is
    // sending to it, and over-strict patterns reject valid addresses.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      next.email = "Please enter a valid email address.";
    if (!subject) next.subject = "Please choose a subject.";
    if (message.length < 10)
      next.message = "Please give us at least a sentence to work with.";

    return next;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    // Honeypot and time-trap. Both fail silently as a "success" so a bot gets
    // no signal about why it was rejected.
    const trapped =
      String(data.get("company") ?? "") !== "" ||
      Date.now() - mountedAt.current < 3000;

    const nextErrors = validate(data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // Focus the first field in *document* order, resolved from the form's
      // own elements rather than by querying for `aria-invalid` — that
      // attribute is set by the render this call has not triggered yet, so
      // querying for it here would always come back empty.
      const order = ["name", "email", "subject", "message"] as const;
      const firstInvalid = order.find((field) => nextErrors[field]);
      const control = firstInvalid
        ? form.elements.namedItem(firstInvalid)
        : null;
      if (control instanceof HTMLElement) control.focus();
      return;
    }

    if (trapped) {
      setStatus("success");
      form.reset();
      return;
    }

    const payload = {
      name: String(data.get("name")),
      email: String(data.get("email")),
      subject: String(data.get("subject")),
      message: String(data.get("message")),
    };

    if (!endpoint) {
      // No inbox configured — hand the message to the visitor's mail client.
      const body = `${payload.message}\n\n—\n${payload.name}\n${payload.email}`;
      window.location.href = `mailto:${site.email.support}?subject=${encodeURIComponent(
        `[IGNYT] ${payload.subject}`,
      )}&body=${encodeURIComponent(body)}`;
      setStatus("success");
      form.reset();
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  };

  const fieldClasses = (invalid: boolean) =>
    cn(
      "w-full rounded-tile border bg-surface/70 px-4 py-3 text-[15px] text-text",
      "placeholder:text-text-dim transition-colors duration-200",
      invalid
        ? "border-bad/60 focus:border-bad"
        : "border-line focus:border-pulse/70",
    );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {/* Honeypot. `aria-hidden` + `tabIndex={-1}` keep it away from real
          users and assistive technology alike. */}
      <div
        aria-hidden
        className="absolute left-[-9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor={`${formId}-company`}>Company (leave blank)</label>
        <input
          id={`${formId}-company`}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${formId}-name`}
            className="mb-2 block text-[13.5px] font-semibold text-text"
          >
            Name <span className="text-ember">*</span>
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
            className={fieldClasses(Boolean(errors.name))}
            placeholder="Your name"
          />
          {errors.name ? (
            <p
              id={`${formId}-name-error`}
              className="mt-2 text-[13px] text-bad"
            >
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`${formId}-email`}
            className="mb-2 block text-[13.5px] font-semibold text-text"
          >
            Email <span className="text-ember">*</span>
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? `${formId}-email-error` : undefined
            }
            className={fieldClasses(Boolean(errors.email))}
            placeholder="you@example.com"
          />
          {errors.email ? (
            <p
              id={`${formId}-email-error`}
              className="mt-2 text-[13px] text-bad"
            >
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label
          htmlFor={`${formId}-subject`}
          className="mb-2 block text-[13.5px] font-semibold text-text"
        >
          Subject <span className="text-ember">*</span>
        </label>
        <select
          id={`${formId}-subject`}
          name="subject"
          required
          defaultValue=""
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={
            errors.subject ? `${formId}-subject-error` : undefined
          }
          className={fieldClasses(Boolean(errors.subject))}
        >
          <option value="" disabled>
            Choose a subject…
          </option>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
        {errors.subject ? (
          <p
            id={`${formId}-subject-error`}
            className="mt-2 text-[13px] text-bad"
          >
            {errors.subject}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={`${formId}-message`}
          className="mb-2 block text-[13.5px] font-semibold text-text"
        >
          Message <span className="text-ember">*</span>
        </label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={6}
          required
          aria-invalid={Boolean(errors.message)}
          aria-describedby={
            errors.message
              ? `${formId}-message-error`
              : `${formId}-message-hint`
          }
          className={cn(fieldClasses(Boolean(errors.message)), "resize-y")}
          placeholder="What can we help with? For a bug, include your device model and Android version."
        />
        {errors.message ? (
          <p
            id={`${formId}-message-error`}
            className="mt-2 text-[13px] text-bad"
          >
            {errors.message}
          </p>
        ) : (
          <p
            id={`${formId}-message-hint`}
            className="mt-2 text-[13px] text-text-dim"
          >
            Never include passwords or account recovery codes.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={status === "submitting"}>
          {status === "submitting" ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send aria-hidden className="size-4" />
              Send message
            </>
          )}
        </Button>

        <p className="text-[13px] text-text-dim">
          Or email{" "}
          <a
            href={`mailto:${site.email.support}`}
            className="font-semibold text-text-mute hover:text-ember"
          >
            {site.email.support}
          </a>
        </p>
      </div>

      {/* Result announcement */}
      <div aria-live="polite" className="min-h-0">
        {status === "success" ? (
          <p className="flex items-start gap-2.5 rounded-tile border border-good/35 bg-good/10 p-4 text-[14px] text-text-mute">
            <CheckCircle2
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-good"
            />
            Thanks — your message is on its way. We reply to everything, usually
            within two working days.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="flex items-start gap-2.5 rounded-tile border border-bad/35 bg-bad/10 p-4 text-[14px] text-text-mute">
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-bad"
            />
            That did not go through. Please email{" "}
            <a
              href={`mailto:${site.email.support}`}
              className="font-semibold text-text hover:text-ember"
            >
              {site.email.support}
            </a>{" "}
            directly and we will pick it up.
          </p>
        ) : null}
      </div>
    </form>
  );
}
