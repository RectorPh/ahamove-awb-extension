importScripts("extract.js");

const WAREHOUSE = /^https:\/\/([a-z0-9-]+\.)*ahamove\.com\//i;

async function tellPage(tabId, message) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (msg) => alert(msg),
    args: [message],
  });
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

  const key = "awb_" + Date.now();
  await chrome.storage.session.set({ [key]: result });
  await chrome.tabs.create({ url: chrome.runtime.getURL("awb.html") + "?k=" + key, index: tab.index + 1 });
});
