import { nextStep, prevStep, TOTAL_STEPS, type DraftStore, type DraftValues, type WizardStep } from "./draft";
import { describeSubmitResult, submitAanvraag } from "./submit";
import { createBrowserAanvraagRuntime, retryQueuedAanvragen } from "./runtime";
import { isValidEmailAddress } from "../email/guard";

export type ReisOption = {
  slug: string;
  titel: string;
};

export type BindOptions = {
  reizen: ReisOption[];
  preselectedSlug: string;
  baseUrl: string;
};

const STEP_TITLES: Record<WizardStep, string> = {
  1: "Kies je reis",
  2: "Jouw gegevens",
  3: "Controleer en verstuur",
};

function joinBase(baseUrl: string, path: string): string {
  const origin = window.location.origin;
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ""), origin + base).pathname;
}

export function bindAanvraagForm(root: Document, options: BindOptions): void {
  const formNode = root.getElementById("aanvraag-form");
  if (!(formNode instanceof HTMLFormElement)) {
    return;
  }
  const form: HTMLFormElement = formNode;

  const querySlug = new URLSearchParams(window.location.search).get("reis") ?? "";
  const bootOptions = {
    ...options,
    preselectedSlug: querySlug || options.preselectedSlug,
  };

  const runtime = createBrowserAanvraagRuntime();
  void retryQueuedAanvragen(runtime);

  const status = root.getElementById("form-status");
  const summary = root.getElementById("controle-samenvatting");
  const confirmation = root.getElementById("bevestiging");
  const confirmationRef = root.getElementById("bevestiging-referentie");
  const confirmationText = root.getElementById("bevestiging-tekst");
  const wizard = root.getElementById("aanvraag-wizard");

  let step: WizardStep = 1;
  const values = loadInitialValues(runtime.drafts, bootOptions);

  applyValues(form, values);
  renderStep(root, step);
  updateSummary(summary, values, options.reizen);

  form.addEventListener("input", () => {
    syncValues(form, values);
    runtime.drafts.save(values);
    updateSummary(summary, values, options.reizen);
  });

  form.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const action = target.dataset.action;
    if (action === "next") {
      event.preventDefault();
      if (!validateCurrentStep(form, step, status)) {
        return;
      }
      step = nextStep(step);
      renderStep(root, step);
      updateSummary(summary, values, options.reizen);
    }
    if (action === "prev") {
      event.preventDefault();
      step = prevStep(step);
      renderStep(root, step);
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (step !== TOTAL_STEPS) {
      if (!validateCurrentStep(form, step, status)) {
        return;
      }
      step = nextStep(step);
      renderStep(root, step);
      return;
    }
    void handleSubmit();
  });

  async function handleSubmit(): Promise<void> {
    syncValues(form, values);
    runtime.drafts.save(values);
    setStatus(status, "", false);
    setBusy(form, true);

    const reis = options.reizen.find((item) => item.slug === values.reisSlug);
    const result = await submitAanvraag(
      {
        naam: values.naam,
        email: values.email,
        reisSlug: values.reisSlug,
        reisTitel: reis?.titel ?? "",
        opmerking: values.opmerking,
      },
      runtime,
    );

    setBusy(form, false);

    if (result.status === "invalid") {
      const emailError = result.errors.find((error) => error.field === "email");
      const naamError = result.errors.find((error) => error.field === "naam");
      const reisError = result.errors.find((error) => error.field === "reisSlug");
      setFieldError(form, "email", emailError?.message ?? "");
      setFieldError(form, "naam", naamError?.message ?? "");
      setFieldError(form, "reisSlug", reisError?.message ?? "");
      if (reisError) {
        step = 1;
      } else if (emailError || naamError) {
        step = 2;
      }
      renderStep(root, step);
      setStatus(
        status,
        emailError?.message || naamError?.message || reisError?.message || describeSubmitResult(result),
        true,
      );
      return;
    }

    if (result.status === "queued") {
      setStatus(status, result.message, true);
      return;
    }

    runtime.drafts.clear();
    if (wizard) {
      wizard.hidden = true;
    }
    if (confirmation && confirmationRef && confirmationText) {
      confirmation.hidden = false;
      confirmationRef.textContent = result.reference;
      confirmationText.textContent = result.message;
      confirmation.focus();
    }
    const path = joinBase(options.baseUrl, "aanvraag/bevestiging");
    const nextUrl = `${path}?ref=${encodeURIComponent(result.reference)}`;
    window.history.pushState({}, "", nextUrl);
  }
}

function loadInitialValues(drafts: DraftStore, options: BindOptions): DraftValues {
  const stored = drafts.load();
  return {
    reisSlug: options.preselectedSlug || stored.reisSlug,
    naam: stored.naam,
    email: stored.email,
    opmerking: stored.opmerking,
  };
}

function applyValues(form: HTMLFormElement, values: DraftValues): void {
  setInputValue(form, "reisSlug", values.reisSlug);
  setInputValue(form, "naam", values.naam);
  setInputValue(form, "email", values.email);
  setInputValue(form, "opmerking", values.opmerking);
}

function syncValues(form: HTMLFormElement, values: DraftValues): void {
  values.reisSlug = getInputValue(form, "reisSlug");
  values.naam = getInputValue(form, "naam");
  values.email = getInputValue(form, "email");
  values.opmerking = getInputValue(form, "opmerking");
}

function getInputValue(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    return field.value;
  }
  return "";
}

function setInputValue(form: HTMLFormElement, name: string, value: string): void {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    field.value = value;
  }
}

function renderStep(root: Document, step: WizardStep): void {
  root.querySelectorAll<HTMLElement>("[data-step]").forEach((panel) => {
    const panelStep = Number(panel.dataset.step);
    panel.hidden = panelStep !== step;
  });
  root.querySelectorAll<HTMLElement>("[data-step-indicator]").forEach((indicator) => {
    const indicatorStep = Number(indicator.dataset.stepIndicator) as WizardStep;
    if (indicatorStep === step) {
      indicator.setAttribute("aria-current", "step");
    } else {
      indicator.removeAttribute("aria-current");
    }
  });
  const heading = root.getElementById("stap-heading");
  if (heading) {
    heading.textContent = `Stap ${step} van ${TOTAL_STEPS}: ${STEP_TITLES[step]}`;
  }
}

function validateCurrentStep(
  form: HTMLFormElement,
  step: WizardStep,
  status: HTMLElement | null,
): boolean {
  if (step === 1) {
    const reisSlug = getInputValue(form, "reisSlug");
    if (!reisSlug) {
      setFieldError(form, "reisSlug", "Kies een reis.");
      setStatus(status, "Kies een reis om verder te gaan.", true);
      return false;
    }
    setFieldError(form, "reisSlug", "");
  }
  if (step === 2) {
    const naam = getInputValue(form, "naam").trim();
    const email = getInputValue(form, "email").trim();
    let ok = true;
    if (naam.length < 2) {
      setFieldError(form, "naam", "Vul je naam in (minimaal twee letters).");
      ok = false;
    } else {
      setFieldError(form, "naam", "");
    }
    if (!isValidEmailAddress(email)) {
      setFieldError(form, "email", "Vul een geldig e-mailadres in.");
      ok = false;
    } else {
      setFieldError(form, "email", "");
    }
    if (!ok) {
      setStatus(status, "Controleer je gegevens voordat je verdergaat.", true);
      return false;
    }
  }
  setStatus(status, "", false);
  return true;
}

function setFieldError(form: HTMLFormElement, name: string, message: string): void {
  const field = form.elements.namedItem(name);
  const error = form.querySelector(`[data-error-for="${name}"]`);
  if (field instanceof HTMLElement) {
    field.setAttribute("aria-invalid", message ? "true" : "false");
    const errorId = `${name}-error`;
    const describedBy = new Set((field.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean));
    if (message) {
      describedBy.add(errorId);
    } else {
      describedBy.delete(errorId);
    }
    if (describedBy.size > 0) {
      field.setAttribute("aria-describedby", [...describedBy].join(" "));
    } else {
      field.removeAttribute("aria-describedby");
    }
  }
  if (error) {
    error.textContent = message;
  }
}

function setStatus(status: HTMLElement | null, message: string, isError: boolean): void {
  if (!status) {
    return;
  }
  status.textContent = message;
  status.dataset.tone = isError ? "error" : "info";
}

function setBusy(form: HTMLFormElement, busy: boolean): void {
  const submit = form.querySelector<HTMLButtonElement>("[data-action='submit']");
  if (submit) {
    submit.disabled = busy;
    submit.textContent = busy ? "Versturen…" : "Verstuur aanvraag";
  }
}

function updateSummary(
  summary: HTMLElement | null,
  values: DraftValues,
  reizen: ReisOption[],
): void {
  if (!summary) {
    return;
  }
  const reis = reizen.find((item) => item.slug === values.reisSlug);
  summary.replaceChildren();
  addSummaryRow(summary, "Reis", reis?.titel ?? "Nog niet gekozen");
  addSummaryRow(summary, "Naam", values.naam || "Nog niet ingevuld");
  addSummaryRow(summary, "E-mail", values.email || "Nog niet ingevuld");
  addSummaryRow(summary, "Opmerking", values.opmerking || "Geen");
}

function addSummaryRow(summary: HTMLElement, label: string, value: string): void {
  const dt = summary.ownerDocument.createElement("dt");
  dt.textContent = label;
  const dd = summary.ownerDocument.createElement("dd");
  dd.textContent = value;
  summary.append(dt, dd);
}
