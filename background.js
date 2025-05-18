// chrome.runtime.onInstalled.addListener(() => {
//   chrome.contextMenus.create({
//     id: "wormhole-open",
//     title: "Open in Wormhole...",
//     contexts: ["all"],
//   });
// });

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   const payload = info.linkUrl || info.selectionText || tab.url;
//   chrome.tabs.create({
//     url:
//       chrome.runtime.getURL("popup.html") +
//       "?payload=" +
//       encodeURIComponent(payload),
//   });
// });
