/* Bannk Paystack-compatible inline checkout (v2). Drop-in for https://js.paystack.co/v2/inline.js
 * Point this script src at your Bannk APP_URL, and use Dev Mode pk_test_ / sk_test_ keys.
 */
(function (root) {
  "use strict";
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    try { return s ? new URL(s).origin : location.origin; } catch (e) { return location.origin; }
  })();

  function post(path, body) {
    return fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  function openCheckout(url, opts) {
    var overlay = document.createElement("div");
    overlay.setAttribute("data-bannk-paystack", "1");
    overlay.style.cssText = "position:fixed;inset:0;z-index:999999;background:rgba(15,17,21,.55);display:flex;align-items:center;justify-content:center;padding:16px;";
    var frameWrap = document.createElement("div");
    frameWrap.style.cssText = "position:relative;width:100%;max-width:420px;height:min(720px,90vh);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);";
    var close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close");
    close.style.cssText = "position:absolute;right:8px;top:8px;z-index:2;width:32px;height:32px;border:0;border-radius:999px;background:#f2f2f2;font-size:20px;cursor:pointer;line-height:32px;";
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = "Bannk checkout";
    iframe.style.cssText = "border:0;width:100%;height:100%;";
    iframe.allow = "payment";
    frameWrap.appendChild(close);
    frameWrap.appendChild(iframe);
    overlay.appendChild(frameWrap);
    document.body.appendChild(overlay);

    var done = false;
    function cleanup() {
      window.removeEventListener("message", onMsg);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    function succeed(reference) {
      if (done) return;
      done = true;
      cleanup();
      if (typeof opts.onSuccess === "function") opts.onSuccess({ reference: reference, status: "success" });
      if (typeof opts.callback === "function") opts.callback({ reference: reference, trxref: reference, status: "success" });
    }
    function cancel() {
      if (done) return;
      done = true;
      cleanup();
      if (typeof opts.onCancel === "function") opts.onCancel();
      if (typeof opts.onClose === "function") opts.onClose();
    }
    function onMsg(ev) {
      var d = ev && ev.data;
      if (!d || d.type !== "bannk:paystack") return;
      if (d.event === "success" && d.reference) succeed(d.reference);
    }
    window.addEventListener("message", onMsg);
    close.addEventListener("click", cancel);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) cancel(); });
  }

  function PaystackPop() {}
  PaystackPop.prototype.newTransaction = function (options) {
    if (!options || !options.key) throw new Error("Paystack public key is required");
    var body = {
      key: options.key,
      email: options.email,
      amount: options.amount,
      currency: options.currency || "NGN",
      ref: options.ref || options.reference,
      callback_url: options.callback_url || options.callbackUrl,
    };
    return post("/checkout/paystack/init", body).then(function (res) {
      if (!res.d || res.d.status !== true || !res.d.data || !res.d.data.authorization_url) {
        throw new Error((res.d && (res.d.message || res.d.error)) || "Unable to start checkout");
      }
      openCheckout(res.d.data.authorization_url, options);
    });
  };
  PaystackPop.setup = function (options) {
    return { openIframe: function () { return (new PaystackPop()).newTransaction(Object.assign({ onSuccess: options.callback, onCancel: options.onClose }, options)); } };
  };
  root.PaystackPop = PaystackPop;
})(typeof window !== "undefined" ? window : this);
