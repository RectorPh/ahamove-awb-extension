// Runs inside the warehouse page (MAIN world) and returns the order shown in the
// open detail pop-up. Must be self-contained: chrome.scripting serialises it.
// Primary source: the pop-up's Vue component (NewPackageDetail), which holds the
// same values the pop-up renders. Fallback: read the rendered text.
// eslint-disable-next-line no-unused-vars
function extractAwbOrder() {
  const roots = [...document.querySelectorAll(".v-dialog--active .aha-package-detail")];
  const root = roots[roots.length - 1];
  if (!root) return { error: "NO_POPUP" };

  const clean = (v) => (v == null ? "" : String(v).trim());
  const vm = root.__vue__;

  if (vm && vm.data) {
    const d = vm.data;
    const path = d.path || [];
    const s = vm.senderData || path[0] || {};
    const r = vm.deliveryData || path[1] || {};
    const pi = vm.packageItem || {};
    const dim = vm.packageDimension || d.package_dimensions || {};
    const items = (pi.items || d.items || []).map((i) => ({
      cat: clean(i.category),
      qty: Number(i.num) || 1,
      name: clean(i.name),
    }));
    return {
      source: "vue",
      tracking: clean(vm.trackingNumber || r.tracking_number),
      warehouseId: clean(d._id),
      status: clean(d.status),
      partner: clean(d.partner),
      sender: { name: clean(s.name), phone: clean(s.mobile), addr: clean(s.address), note: clean(s.remarks) },
      receiver: { name: clean(r.name), phone: clean(r.mobile), addr: clean(r.address), note: clean(r.remarks) },
      weight: clean(pi.weight) || (dim.weight != null ? dim.weight + " kg" : ""),
      size: clean(pi.size).replace(/\s*cm$/i, "") ||
        (dim.length ? `${dim.length} x ${dim.width} x ${dim.height}` : ""),
      packWeight: clean(pi.billableWeight ?? dim.billable_weight),
      items,
    };
  }

  // ---- Fallback: parse the rendered pop-up ----
  const text = (el) => clean(el && el.innerText).replace(/\s+/g, " ");
  const tracking = text(root.querySelector(".package-id"));
  // Each info card has a <h3> title and rows "Tên: … SĐT: … Địa chỉ: … Ghi chú: …".
  // Climb from the title to the smallest ancestor that holds the rows.
  const readCard = (title) => {
    let card = [...root.querySelectorAll("h3")].find((h) => text(h) === title);
    while (card && card !== root && !/Ghi chú:/.test(card.innerText)) card = card.parentElement;
    const t = card && card !== root ? card.innerText : "";
    const grab = (label, next) => {
      const m = t.match(new RegExp(label + ":\\s*([\\s\\S]*?)\\s*(?:" + next + ":|$)"));
      return m ? m[1].replace(/\s+/g, " ").trim() : "";
    };
    return {
      name: grab("Tên", "SĐT"),
      phone: grab("SĐT", "Địa chỉ"),
      addr: grab("Địa chỉ", "Ghi chú"),
      note: grab("Ghi chú", "\\n\\n"),
    };
  };
  const cell = (label) => {
    const th = [...root.querySelectorAll("td.thead")].find((td) => text(td).startsWith(label));
    return th ? th.nextElementSibling : null;
  };
  const items = [...root.querySelectorAll(".items-board .item-row")].map((p) => {
    const t = text(p);
    const m = t.match(/^(?:\[(.+?)\]:)?\s*(\d+)x\s+(.*)$/);
    return m ? { cat: m[1] || "", qty: Number(m[2]), name: m[3] } : { cat: "", qty: 1, name: t };
  });
  return {
    source: "dom",
    tracking,
    warehouseId: "",
    status: "",
    partner: "",
    sender: readCard("Lấy hàng"),
    receiver: readCard("Giao hàng"),
    weight: text(cell("Khối lượng")),
    size: text(cell("Kích thước")).replace(/\s*cm$/i, ""),
    packWeight: text(cell("KL đóng gói")),
    items,
  };
}
