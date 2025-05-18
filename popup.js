(async function () {
  console.log("Popup script started"); // Log: Script start
  const params = new URLSearchParams(window.location.search);
  let raw = params.get("payload");
  console.log("Initial raw payload:", raw); // Log: Raw payload
  if (!raw) {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    raw = tab.url;
    console.log("Raw payload from active tab:", raw); // Log: Tab URL payload
  }

  const list = document.getElementById("dest");
  list.innerHTML = "<li>Processing...</li>";

  // Ensure WormholeTransform and its methods are available
  if (
    !window.WormholeTransform ||
    typeof window.WormholeTransform.parseInput !== "function"
  ) {
    list.innerHTML = "<li>Error: Transform script not loaded correctly.</li>";
    console.error("Popup: WormholeTransform.parseInput is not available.");
    return;
  }

  const info = await window.WormholeTransform.parseInput(raw);
  console.log("Parsed info:", JSON.stringify(info, null, 2)); // Log: Parsed info object

  if (!info || (!info.did && !info.atUri)) {
    list.innerHTML = "<li>No DID or at:// reference found in the input.</li>";
    console.log("No DID or atUri found in info, exiting."); // Log: Exit condition
    return;
  }

  const DID_HANDLE_CACHE_KEY = "didHandleCache"; // Caching re-enabled

  const renderDestinations = (destinations) => {
    console.log(
      "Rendering destinations:",
      JSON.stringify(destinations, null, 2)
    ); // Log: Destinations to render
    if (destinations && destinations.length > 0) {
      list.innerHTML = destinations
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
    } else {
      list.innerHTML = "<li>No actions available at this time.</li>";
      console.log("No destinations to render."); // Log: No destinations
    }
  };

  // Initial render based on whatever info.handle might exist (e.g. from direct handle input)
  let currentDests = window.WormholeTransform.buildDestinations(info);
  renderDestinations(currentDests);

  // If a DID is present but the handle is not, try to resolve or get from cache.
  if (info.did && !info.handle) {
    console.log(
      `Popup: DID ${info.did} present, handle missing. Checking cache...`
    );

    const cacheData = await chrome.storage.local.get(DID_HANDLE_CACHE_KEY);
    const cachedHandles = cacheData[DID_HANDLE_CACHE_KEY] || {};

    if (cachedHandles[info.did]) {
      console.log(
        `Popup: Found handle '${cachedHandles[info.did]}' for DID ${
          info.did
        } in cache.`
      );
      info.handle = cachedHandles[info.did];
      currentDests = window.WormholeTransform.buildDestinations(info);
      renderDestinations(currentDests);
    } else {
      console.log(
        `Popup: Handle for DID ${info.did} not in cache. Attempting to resolve...`
      );
      if (!currentDests || currentDests.length === 0) {
        list.innerHTML =
          "<li>Resolving identifier to check for more actions...</li>";
      }
      try {
        if (typeof window.WormholeTransform.resolveDidToHandle !== "function") {
          list.innerHTML = "<li>Error: Resolve function not loaded.</li>";
          console.error(
            "Popup: WormholeTransform.resolveDidToHandle is not available."
          );
          return;
        }
        const resolvedHandle =
          await window.WormholeTransform.resolveDidToHandle(info.did);
        console.log(
          `Popup: Resolved handle: ${resolvedHandle} for DID: ${info.did}`
        );
        if (resolvedHandle) {
          info.handle = resolvedHandle;
          currentDests = window.WormholeTransform.buildDestinations(info);
          console.log("Popup: Re-rendering destinations with resolved handle.");
          renderDestinations(currentDests);

          // Update cache with the newly resolved handle
          const updatedCachedHandles = {
            ...cachedHandles,
            [info.did]: resolvedHandle,
          };
          await chrome.storage.local.set({
            [DID_HANDLE_CACHE_KEY]: updatedCachedHandles,
          });
          console.log(
            `Popup: Saved resolved handle ${resolvedHandle} for DID ${info.did} to cache.`
          );
        } else {
          if (!currentDests || currentDests.length === 0) {
            list.innerHTML =
              "<li>Could not resolve identifier. No actions available.</li>";
          }
          console.log(
            `Popup: Handle resolution returned null/false for DID: ${info.did}`
          );
        }
      } catch (error) {
        console.error("Popup: Error resolving handle:", error);
        if (!currentDests || currentDests.length === 0) {
          list.innerHTML =
            "<li>Error resolving identifier. No actions available.</li>";
        }
      }
    }
  } else if (info.did && info.handle) {
    console.log(
      "Popup: DID and handle already present in info, no resolution or cache check needed.",
      JSON.stringify(info, null, 2)
    );
  } else {
    console.log(
      "Popup: Condition for handle resolution/cache check not met (no DID or handle already present)."
    );
  }

  // Add event listener for the Empty Cache button
  const emptyCacheButton = document.getElementById("emptyCacheBtn");
  if (emptyCacheButton) {
    emptyCacheButton.addEventListener("click", async () => {
      try {
        await chrome.storage.local.remove(DID_HANDLE_CACHE_KEY);
        console.log("Popup: DID Handle Cache Cleared!");
        // Optionally, provide user feedback in the popup itself, e.g., change button text
        emptyCacheButton.textContent = "Cache Cleared!";
        setTimeout(() => {
          emptyCacheButton.textContent = "Empty Cache";
        }, 1500);
        // You might want to re-render or force a re-check if the current view depends on cached data
        // For now, it just clears it. Next time popup opens with a relevant DID, it will miss cache.
      } catch (error) {
        console.error("Popup: Error clearing cache:", error);
        emptyCacheButton.textContent = "Error Clearing!";
      }
    });
  } else {
    console.warn("Popup: Empty Cache button not found.");
  }

  console.log("Popup script finished (caching re-enabled)."); // Log: Script end
})();
