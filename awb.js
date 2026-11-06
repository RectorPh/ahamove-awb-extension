/* global qrcode, JsBarcode */
const $ = (id) => document.getElementById(id);

// ---------- masking ----------
const maskName = (n) => {
  const p = (n || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "–";
  if (p.length === 1) return [...p[0]][0] + "***";
  return p.map((w, i) => (i === 0 ? w : [...w][0] + "***")).join(" ");
};
const maskPhone = (s) => {
  s = (s || "").replace(/\s+/g, "");
  if (!s) return "–";
  return s.length <= 6 ? s : s.slice(0, 3) + "*".repeat(s.length - 6) + s.slice(-3);
};
const maskAddr = (a) => {
  const seen = new Set();
  const segs = (a || "").split(",").map((s) => s.trim())
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
  if (!segs.length) return "–";
  segs[0] = segs[0].replace(/[\p{L}\d/\-]*\d[\p{L}\d/\-]*/u, "***"); // hide house number
  return segs.join(", ");
};
const noteText = (n) => "Ghi chú: " + (n && n !== "-" ? n : "–");

// ---------- data ----------
// The order arrives in the URL hash: awb.html?embed=1#data=<base64 UTF-8 JSON>
function loadOrder() {
  if (!location.hash.startsWith("#data=")) return null;
  const b64 = decodeURIComponent(location.hash.slice(6));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
}

// Inside the overlay on the warehouse page (iframe) vs. opened on its own.
const EMBED = new URLSearchParams(location.search).get("embed") === "1" && window.parent !== window;
const toParent = (msg) => { if (EMBED) window.parent.postMessage(msg, "*"); };

// ---------- render ----------
function render(o) {
  document.title = "AWB_" + o.tracking; // default file name for "Save as PDF"
  $("tb-tn").textContent = o.tracking;
  $("tn").textContent = o.tracking;
  for (const [k, p] of [["s", o.sender || {}], ["r", o.receiver || {}]]) {
    $(k + "-name").textContent = maskName(p.name);
    $(k + "-phone").textContent = "SĐT: " + maskPhone(p.phone);
    $(k + "-addr").textContent = maskAddr(p.addr);
    $(k + "-note").textContent = noteText(p.note);
  }
  $("w").textContent = o.weight || "–";
  $("dim").textContent = o.size || "–";
  $("pw").textContent = o.packWeight === "" || o.packWeight == null ? "–" : o.packWeight;

  const ul = $("goods");
  ul.textContent = "";
  for (const it of o.items || []) {
    const li = document.createElement("li");
    const qty = document.createElement("span");
    qty.className = "qty";
    qty.textContent = (it.qty || 1) + "x";
    const body = document.createElement("span");
    if (it.cat) {
      const cat = document.createElement("span");
      cat.className = "cat";
      cat.textContent = "[" + it.cat + "] ";
      body.appendChild(cat);
    }
    body.appendChild(document.createTextNode(it.name || ""));
    li.append(qty, body);
    li.dataset.qty = it.qty || 1;
    ul.appendChild(li);
  }

  const qr = qrcode(0, "M");
  qr.addData(o.tracking);
  qr.make();
  $("qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  JsBarcode("#bc", o.tracking, { format: "CODE128", displayValue: false, margin: 12, height: 60, width: 2 });
  $("bc").setAttribute("preserveAspectRatio", "none"); // stretch to box; 12-module quiet zone kept
}

// Fit the item list into its box: shrink text down to 6pt, then fold the tail
// into "+N loại khác — xem trên app".
function fitItems() {
  const ul = $("goods");
  const lis = [...ul.querySelectorAll("li:not(.more)")];
  lis.forEach((li) => (li.style.display = ""));
  ul.querySelector(".more")?.remove();
  for (let tenths = 80; tenths >= 60; tenths -= 2) {
    ul.style.fontSize = tenths / 10 + "pt";
    if (ul.scrollHeight <= ul.clientHeight) return;
  }
  const more = document.createElement("li");
  more.className = "more";
  ul.appendChild(more);
  for (let hidden = 1; hidden < lis.length; hidden++) {
    lis[lis.length - hidden].style.display = "none";
    const qty = lis.slice(lis.length - hidden).reduce((s, li) => s + Number(li.dataset.qty), 0);
    more.innerHTML = "";
    const q = document.createElement("span");
    q.className = "qty";
    q.textContent = "+" + qty;
    const b = document.createElement("b");
    b.textContent = hidden + " loại khác — xem trên app";
    more.append(q, b);
    if (ul.scrollHeight <= ul.clientHeight) return;
  }
}

(async () => {
  let o;
  try {
    o = loadOrder();
  } catch (e) {
    o = null;
  }
  if (!o || !o.tracking) {
    $("error").hidden = false;
    $("error").textContent = "Không có dữ liệu đơn. Hãy mở pop-up chi tiết đơn trên app.ahamove.com/v1/warehouse rồi bấm lại icon Ahamove AWB.";
    return;
  }
  render(o);
  $("paper").hidden = false;
  $("toolbar").hidden = false;
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  fitItems();
  document.body.dataset.ready = "1";
  $("btn-print").onclick = () => {
    toParent({ type: "awb-print-start", title: document.title });
    window.print();
  };
  window.addEventListener("afterprint", () => toParent({ type: "awb-print-end" }));
  if (EMBED) {
    document.body.classList.add("embed");
    $("btn-close").hidden = false;
    $("btn-close").onclick = () => toParent({ type: "awb-close" });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") toParent({ type: "awb-close" }); });
    $("btn-print").focus();
  }
})();
