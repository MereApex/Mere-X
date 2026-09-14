/* ============================================================
   TOAST — transient confirmations for console actions
   ============================================================ */

import { icon } from "./icons.js";

let stack = null;

function ensureStack() {
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.setAttribute("role", "status");
    stack.setAttribute("aria-live", "polite");
    document.body.append(stack);
  }
  return stack;
}

export function toast(message, { icon: name = "check", duration = 2800 } = {}) {
  const host = ensureStack();
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = icon(name).value;
  const copy = document.createElement("span");
  copy.textContent = String(message ?? "");
  node.append(copy);
  host.append(node);

  const remove = () => {
    node.classList.add("is-out");
    node.addEventListener("animationend", () => node.remove(), { once: true });
  };
  const timer = setTimeout(remove, duration);
  node.addEventListener("click", () => { clearTimeout(timer); remove(); });
  return remove;
}

/* ---- Modal -------------------------------------------- */

/**
 * Show a modal and resolve with the chosen action value (or null).
 * `collect(modalRoot)` runs while the dialog is still mounted, so form
 * values must be read there — by the time the promise resolves the DOM
 * is gone. When provided, the promise resolves to `{ action, data }`.
 */
export function modal({ title, body, actions = [], size = "", collect = null }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="between" style="margin-bottom:18px">
          <h3 style="font-size:1.3rem">${title}</h3>
          <button class="icon-btn" data-close aria-label="Close">${icon("close").value}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${actions.length ? `<div class="row" style="margin-top:24px;justify-content:flex-end">${actions
          .map((a) => `<button class="btn ${a.class || "btn-secondary"}" data-action="${a.value}">${a.label}</button>`)
          .join("")}</div>` : ""}
      </div>`;
    document.body.append(backdrop);
    document.body.style.overflow = "hidden";

    const close = (value) => {
      const data = collect ? collect(backdrop.firstElementChild) : undefined;
      document.body.style.overflow = "";
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
      resolve(collect ? { action: value, data } : value);
    };
    const onKey = (event) => { if (event.key === "Escape") close(null); };

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close(null);
      const closer = event.target.closest("[data-close]");
      if (closer) close(null);
      const action = event.target.closest("[data-action]");
      if (action) close(action.dataset.action);
    });
    document.addEventListener("keydown", onKey);
    backdrop.querySelector("input, textarea, button")?.focus();
  });
}
