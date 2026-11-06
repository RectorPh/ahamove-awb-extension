importScripts("extract.js");

const WAREHOUSE = /^https:\/\/([a-z0-9-]+\.)*ahamove\.com\//i;

async function tellPage(tabId, message) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (msg) => alert(msg),
    args: [message],
  });
}

// UTF-8 safe base64 for passing the order to awb.html in the URL hash.
function toBase64(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Runs in the warehouse page (isolated world): shows awb.html in an overlay
// above the page, so the user never leaves the order pop-up they were on.
function showAwbOverlay(src) {
  // Clicking the icon again replaces the open overlay (and its listeners).
  if (typeof window.__ahaAwbClose === "function") window.__ahaAwbClose();
  document.getElementById("aha-awb-overlay")?.remove();

  const wrap = document.createElement("div");
  wrap.id = "aha-awb-overlay";
  wrap.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.55);" +
    "display:flex;align-items:center;justify-content:center;";
  const frame = document.createElement("iframe");
  frame.src = src;
  frame.title = "Ahamove AWB";
  frame.style.cssText =
    "width:min(500px,96vw);height:min(660px,94vh);border:0;border-radius:12px;" +
    "background:#e9ebef;box-shadow:0 20px 60px rgba(0,0,0,.35);";
  wrap.appendChild(frame);

  const pageTitle = document.title;
  const close = () => {
    wrap.remove();
    document.title = pageTitle;
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keydown", onKey, true);
    window.__ahaAwbClose = null;
  };
  window.__ahaAwbClose = close;
  const onMessage = (e) => {
    if (e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === "awb-close") close();
    // "Save as PDF" names the file after the page title, so borrow it while printing.
    if (e.data.type === "awb-print-start") document.title = e.data.title;
    if (e.data.type === "awb-print-end") document.title = pageTitle;
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation(); // keep the order pop-up open underneath
      close();
    }
  };
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });
  window.addEventListener("message", onMessage);
  window.addEventListener("keydown", onKey, true);
  document.documentElement.appendChild(wrap);
  frame.focus();
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) chrome.action.setBadgeText({ tabId: tab.id, text: "" });
  if (!tab.id || !WAREHOUSE.test(tab.url || "")) {
    // Not on the warehouse tool: nothing to read.
    chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    chrome.action.setTitle({ tabId: tab.id, title: "Mở app.ahamove.com/v1/warehouse, mở chi tiết 1 đơn rồi bấm lại" });
    return;
  }

  let result;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: extractAwbOrder,
    });
    result = res && res.result;
  } catch (e) {
    await tellPage(tab.id, "Ahamove AWB: không đọc được trang (" + e.message + ")");
    return;
  }

  if (!result || result.error === "NO_POPUP") {
    await tellPage(tab.id, "Ahamove AWB: hãy bấm vào một mã đơn để mở pop-up chi tiết, rồi bấm lại icon extension.");
    return;
  }
  if (!result.tracking) {
    await tellPage(tab.id, "Ahamove AWB: không tìm thấy tracking number trong pop-up.");
    return;
  }

  const src = chrome.runtime.getURL("awb.html") + "?embed=1#data=" + encodeURIComponent(toBase64(result));
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: showAwbOverlay,
    args: [src],
  });
});
