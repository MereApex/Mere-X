const THEME_STORAGE_KEY = "mere-x.theme";
const PLAN_PRICES = Object.freeze({ Free: "0.00", Starter: "9.99", Plus: "19.99", Pro: "39.99", Max: "79.99" });

const themeToggle = document.querySelector("#themeToggle");
const currentPlanChip = document.querySelector("#currentPlanChip");
const pricingToast = document.querySelector("#pricingToast");
const pricingToastText = document.querySelector("#pricingToastText");
const checkoutModal = document.querySelector("#checkoutModal");
const checkoutPlan = document.querySelector("#checkoutPlan");
const checkoutAmount = document.querySelector("#checkoutAmount");
const checkoutStatus = document.querySelector("#checkoutStatus");
const cardCheckout = document.querySelector("#cardCheckout");
const expressCheckout = document.querySelector("#expressCheckout");
const googlePayContainer = document.querySelector("#googlePayContainer");
const applePayButton = document.querySelector("#applePayButton");

let user = null;
let paypalConfig = null;
let selectedPlan = "";
let paypalReady = false;
let cardFields = null;

async function api(url, options = {}) {
  const response = await fetch(url, options);
  if (response.ok) return response.status === 204 ? null : response.json();
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  throw new Error(payload?.error?.message || `Request failed (${response.status})`);
}

function normalizedPlan(plan) {
  return Object.prototype.hasOwnProperty.call(PLAN_PRICES, plan) ? plan : "Free";
}

function showToast(message) {
  pricingToastText.textContent = message;
  pricingToast.hidden = false;
  window.setTimeout(() => { pricingToast.hidden = true; }, 5200);
}

function renderCurrentPlan() {
  const activePlan = normalizedPlan(user?.plan);
  currentPlanChip.textContent = `Current: ${activePlan}`;
  currentPlanChip.hidden = !user;
  document.querySelectorAll("[data-plan-card]").forEach((card) => {
    const isCurrent = Boolean(user) && card.dataset.planCard === activePlan;
    card.classList.toggle("current", isCurrent);
    const button = card.querySelector("[data-select-plan]");
    if (!button) return;
    button.disabled = isCurrent;
    button.textContent = isCurrent ? "Current plan" : `Choose ${card.dataset.planCard}`;
  });
}

function closeCheckout() {
  checkoutModal.hidden = true;
  document.body.classList.remove("checkout-open");
  selectedPlan = "";
  clearPlanIntent();
}

function clearPlanIntent() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("plan")) return;
  url.searchParams.delete("plan");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function setCheckoutStatus(message, tone = "") {
  checkoutStatus.textContent = message;
  checkoutStatus.dataset.tone = tone;
}

async function createOrder() {
  if (!selectedPlan) throw new Error("Choose a plan first.");
  const result = await api("/api/paypal/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: selectedPlan })
  });
  return result.id;
}

async function captureOrder(orderId) {
  setCheckoutStatus("Verifying your payment securely…");
  const result = await api(`/api/paypal/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST" });
  user = { ...user, plan: result.plan };
  renderCurrentPlan();
  closeCheckout();
  showToast(`Payment complete. Mere X ${result.plan} is active for 30 days.`);
  return result;
}

function loadScript(src, test) {
  if (test()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("A secure payment component could not load."));
    document.head.append(script);
  });
}

async function setupPayPalButtons() {
  const container = document.querySelector("#paypalButtonContainer");
  container.replaceChildren();
  await window.paypal.Buttons({
    style: { layout: "vertical", shape: "pill", height: 46, label: "paypal" },
    createOrder: async () => createOrder(),
    onApprove: async ({ orderID }) => captureOrder(orderID),
    onCancel: () => { clearPlanIntent(); setCheckoutStatus("Checkout was cancelled. No payment was taken.", "neutral"); },
    onError: (error) => setCheckoutStatus(error?.message || "PayPal could not complete this checkout.", "error")
  }).render(container);
}

async function setupCardFields() {
  if (!window.paypal.CardFields) return;
  cardFields = window.paypal.CardFields({
    style: {
      input: { "font-family": "Outfit, sans-serif", "font-size": "15px", color: document.documentElement.dataset.theme === "dark" ? "#f1ede4" : "#151510" },
      ".invalid": { color: "#b72b2b" }
    },
    createOrder: async () => createOrder(),
    onApprove: async ({ orderID }) => captureOrder(orderID),
    onError: (error) => setCheckoutStatus(error?.message || "The card payment could not be completed.", "error")
  });
  if (!cardFields.isEligible()) return;
  cardCheckout.hidden = false;
  await Promise.all([
    cardFields.NameField().render("#card-name-field-container"),
    cardFields.NumberField().render("#card-number-field-container"),
    cardFields.ExpiryField().render("#card-expiry-field-container"),
    cardFields.CVVField().render("#card-cvv-field-container")
  ]);
}

async function setupGooglePay() {
  if (!window.paypal.Googlepay) return;
  await loadScript("https://pay.google.com/gp/p/js/pay.js", () => Boolean(window.google?.payments?.api));
  const googlePay = window.paypal.Googlepay();
  const config = await googlePay.config();
  const paymentsClient = new window.google.payments.api.PaymentsClient({ environment: paypalConfig.environment === "production" ? "PRODUCTION" : "TEST" });
  const request = {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: config.allowedPaymentMethods,
    merchantInfo: config.merchantInfo,
    transactionInfo: {
      totalPriceStatus: "FINAL",
      totalPrice: PLAN_PRICES[selectedPlan] || "0.00",
      currencyCode: paypalConfig.currency,
      countryCode: config.countryCode || "US"
    }
  };
  const ready = await paymentsClient.isReadyToPay({ apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods: config.allowedPaymentMethods });
  if (!ready.result) return;
  const button = paymentsClient.createButton({
    buttonType: "pay",
    buttonColor: "black",
    buttonRadius: 22,
    onClick: async () => {
      try {
        request.transactionInfo.totalPrice = PLAN_PRICES[selectedPlan];
        const paymentData = await paymentsClient.loadPaymentData(request);
        const orderId = await createOrder();
        const confirmation = await googlePay.confirmOrder({ orderId, paymentMethodData: paymentData.paymentMethodData });
        const status = confirmation?.status || confirmation?.approveGooglePayPayment?.status;
        if (status && !["APPROVED", "COMPLETED", "PAYER_ACTION_REQUIRED"].includes(status)) throw new Error("Google Pay did not approve the payment.");
        await captureOrder(orderId);
      } catch (error) {
        if (error?.statusCode !== "CANCELED") setCheckoutStatus(error.message || "Google Pay could not complete this checkout.", "error");
      }
    }
  });
  googlePayContainer.replaceChildren(button);
  googlePayContainer.hidden = false;
  expressCheckout.hidden = false;
}

async function setupApplePay() {
  if (!window.paypal.Applepay || !window.ApplePaySession || !window.ApplePaySession.canMakePayments()) return;
  const applePay = window.paypal.Applepay();
  const config = await applePay.config();
  applePayButton.hidden = false;
  expressCheckout.hidden = false;
  applePayButton.onclick = () => {
    const session = new window.ApplePaySession(4, {
      countryCode: config.countryCode || "US",
      currencyCode: paypalConfig.currency,
      merchantCapabilities: config.merchantCapabilities || ["supports3DS"],
      supportedNetworks: config.supportedNetworks,
      total: { label: "Mere X", amount: PLAN_PRICES[selectedPlan], type: "final" }
    });
    session.onvalidatemerchant = async (event) => {
      try {
        const validation = await applePay.validateMerchant({ validationUrl: event.validationURL, displayName: "Mere X" });
        session.completeMerchantValidation(validation.merchantSession || validation);
      } catch (error) {
        session.abort();
        setCheckoutStatus(error.message || "Apple Pay merchant validation failed.", "error");
      }
    };
    session.onpaymentauthorized = async (event) => {
      try {
        const orderId = await createOrder();
        const confirmation = await applePay.confirmOrder({
          orderId,
          token: event.payment.token,
          billingContact: event.payment.billingContact,
          shippingContact: event.payment.shippingContact
        });
        const status = confirmation?.status || confirmation?.approveApplePayPayment?.status;
        if (status && !["APPROVED", "COMPLETED"].includes(status)) throw new Error("Apple Pay did not approve the payment.");
        session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
        await captureOrder(orderId);
      } catch (error) {
        session.completePayment(window.ApplePaySession.STATUS_FAILURE);
        setCheckoutStatus(error.message || "Apple Pay could not complete this checkout.", "error");
      }
    };
    session.begin();
  };
}

async function ensurePayPal() {
  if (paypalReady) return;
  if (!paypalConfig?.configured) throw new Error("PayPal checkout is not configured.");
  const components = "buttons,card-fields,googlepay,applepay";
  const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalConfig.clientId)}&currency=${encodeURIComponent(paypalConfig.currency)}&intent=capture&components=${components}&enable-funding=card`;
  await loadScript(src, () => Boolean(window.paypal?.Buttons));
  await setupPayPalButtons();
  await setupCardFields();
  await Promise.allSettled([setupGooglePay(), setupApplePay()]);
  paypalReady = true;
}

async function openCheckout(plan) {
  if (!user) {
    const returnTo = `/checkout?plan=${encodeURIComponent(plan)}`;
    window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    return;
  }
  if (plan === "Free") {
    await api("/api/paypal/plan/free", { method: "POST" });
    user = { ...user, plan: "Free" };
    renderCurrentPlan();
    showToast("Your account is now on the Mere X Free plan.");
    return;
  }
  selectedPlan = plan;
  checkoutPlan.textContent = plan;
  checkoutAmount.textContent = `$${PLAN_PRICES[plan]}`;
  checkoutModal.hidden = false;
  document.body.classList.add("checkout-open");
  setCheckoutStatus("Loading secure payment methods…");
  try {
    await ensurePayPal();
    setCheckoutStatus("Payments are processed securely by PayPal. Mere X never receives your full card number.");
  } catch (error) {
    setCheckoutStatus(error.message, "error");
  }
}

document.querySelectorAll("[data-select-plan]").forEach((button) => {
  button.addEventListener("click", () => openCheckout(button.dataset.selectPlan).catch((error) => showToast(error.message)));
});
document.querySelectorAll("[data-close-checkout]").forEach((button) => button.addEventListener("click", closeCheckout));
document.querySelector("[data-contact-sales]")?.addEventListener("click", () => {
  showToast("Business onboarding is handled personally. Contact the Mere X team through Support.");
});
cardCheckout.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!cardFields) return;
  const button = document.querySelector("#cardFieldSubmit");
  button.disabled = true;
  setCheckoutStatus("Submitting your card securely…");
  try { await cardFields.submit(); } catch (error) { setCheckoutStatus(error.message || "Check your card details and try again.", "error"); }
  finally { button.disabled = false; }
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "cream" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.dataset.themePreference = nextTheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nextTheme === "dark" ? "#151613" : "#f7f4ee");
  try { localStorage.setItem(THEME_STORAGE_KEY, nextTheme); } catch { /* theme can remain session-only */ }
});

async function initialize() {
  const [session, config] = await Promise.all([api("/api/auth/session"), api("/api/paypal/config")]);
  user = session.user;
  paypalConfig = config;
  renderCurrentPlan();
  /* Remove the stale key used by older releases. Checkout intent now lives in
     the URL, where it is explicit, inspectable, and cannot survive forever. */
  try { localStorage.removeItem("mere-x.pending-plan"); } catch { /* storage is optional */ }
  const requested = new URLSearchParams(window.location.search).get("plan");
  if (!requested) return;
  if (!Object.prototype.hasOwnProperty.call(PLAN_PRICES, requested) || requested === "Free") {
    clearPlanIntent();
    return;
  }
  if (requested === normalizedPlan(user?.plan)) {
    clearPlanIntent();
    showToast(`Mere X ${requested} is already your current plan.`);
    return;
  }
  if (user) await openCheckout(requested);
}

initialize().catch((error) => showToast(error.message));
