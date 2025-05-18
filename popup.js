(async function () {
  const params = new URLSearchParams(window.location.search);
  let raw = params.get("payload");
  if (!raw) {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    raw = tab.url;
  }
  const info = await window.WormholeTransform.parseInput(raw);
  const list = document.getElementById("dest");
  if (!info?.atUri) {
    list.innerHTML = "<li>No at:// reference found.</li>";
    return;
  }
  const dests = window.WormholeTransform.buildDestinations(info);
  list.innerHTML = dests
    .map(
      (d) =>
        `<li>
        <a href="${d.url}"
           target="_blank"
           rel="noopener noreferrer"
           style="display:block; padding:6px 8px; border:1px solid #ccc; border-radius:6px; background:#fafafa; text-decoration:none; color:inherit; font-size:14px;">
          ${d.label}
        </a>
      </li>`
    )
    .join("");
})();
