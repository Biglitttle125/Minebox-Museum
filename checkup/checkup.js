document.addEventListener("DOMContentLoaded", () => {
  // --- State ---
  let allItems = [];
  let museumIds = [];
  let currentUsername = localStorage.getItem("checkupUsername") || "";
  let playerDataLoaded = false;
  let currentFilter = "total";
  let currentPage = 1;
  const itemsPerPage = 16;

  // --- Rarity Images ---
  const rarityImages = {
    UNCOMMON: "pictures/rarity/uncommon.png",
    COMMON: "pictures/rarity/common.png",
    RARE: "pictures/rarity/rare.png",
    EPIC: "pictures/rarity/epic.png",
    LEGENDARY: "pictures/rarity/legendary.png",
    MYTHIC: "pictures/rarity/mythic.png"
  };

  // --- DOM Helpers ---
  const $ = id => document.getElementById(id);

  const resultsBody = $("results");
  const searchInput = $("searchInput");
  const usernameInput = $("usernameInput");
  const prevPageBtn = $("prevPage");
  const nextPageBtn = $("nextPage");
  const pageInfo = $("pageInfo");
  const btnTotal = $("btn-total");
  const btnDonated = $("btn-donated");
  const btnMissing = $("btn-missing");
  const jobFilter = $("jobFilter");
  const checkBtn = $("checkBtn");
  const clearSearchBtn = $("clearSearchBtn");
  const modal = $("itemModal");
  const modalClose = $("modalClose");
  const modalTitle = $("modalTitle");
  const modalRarity = $("modalRarity");
  const modalIngredients = $("modalIngredients");
  const modalJob = $("modalJob");
  const calculatorLink = $("calculatorLink");
  const headerAvatar = $("headerAvatar");
  const headerUsername = $("headerUsername");
  const clearLocalStorageBtn = $("clearLocalStorageBtn");

  let lastValidAvatar = headerAvatar?.src;

  // --- Utility Functions ---
  const formatID = id => (id || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const normalize = str => (str || "").toLowerCase().replace(/[\s_]+/g, "");
  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };
  const isOwned = id => museumIds.some(mid => mid.toLowerCase() === (id || "").toLowerCase());

  // --- Image Helper ---
  const getSafeImage = item => {
    if (item.image?.trim()) return `data:image/png;base64,${item.image}`;
    if (item.id?.toLowerCase().startsWith("mount_")) return `pictures/mounts/${item.id.substring(6)}.png`;
    if (item.id?.toLowerCase().startsWith("spawner_")) return "pictures/undefined/spawner.png";
    return "pictures/undefined.png";
  };

  // --- Header Avatar ---
  const updateHeaderAvatar = name => {
    if (!headerAvatar || !headerUsername) return;
    const displayName = name || "Guest";
    headerAvatar.src = `https://vzge.me/head/250/${encodeURIComponent(displayName)}`;
    headerAvatar.alt = `${displayName}'s Head Skin`;
    headerUsername.textContent = displayName;
    headerUsername.title = displayName;
  };

  if (headerAvatar) {
    headerAvatar.onerror = () => { headerAvatar.src = lastValidAvatar; };
    headerAvatar.onload = () => { lastValidAvatar = headerAvatar.src; };
  }

  // --- UI Visibility ---
  const updateUIVisibility = () => {
    const visible = !!currentUsername && playerDataLoaded;
    [searchInput, clearSearchBtn, prevPageBtn, nextPageBtn, pageInfo, btnTotal, btnDonated, btnMissing, jobFilter, checkBtn, usernameInput].forEach(el => {
      if (el) el.classList.toggle("show", visible);
    });
    if (clearLocalStorageBtn) clearLocalStorageBtn.classList.add("show");
  };

  // --- Prompt Username ---
  const promptUsername = (message = "Please enter your username:") => {
    const username = window.prompt(message)?.trim();
    if (username) {
      currentUsername = username;
      localStorage.setItem("checkupUsername", currentUsername);
      usernameInput.value = currentUsername;
      updateHeaderAvatar(currentUsername);
      updateUIVisibility();
      loadPlayerData(currentUsername);
    }
  };

  // --- Load Items ---
  const loadItems = async () => {
    try {
      const res = await fetch("https://cdn2.minebox.co/data/items.json");
      const data = await res.json();
      allItems = Array.isArray(data) ? data : data.items || [];
      allItems.forEach(item => { if (!item.id) item.id = ""; });

      if (!currentUsername) {
        showEnterUsernameMessage("Click here to enter your username.");
        return;
      }

      updateHeaderAvatar(currentUsername);
      await loadPlayerData(currentUsername);
      populateJobFilter();
      updateUIVisibility();
    } catch (err) {
      console.error(err);
      resultsBody.innerHTML = "<tr><td colspan='4'>Failed to load items.</td></tr>";
    }
  };

  // --- Show Enter Username Box ---
  const showEnterUsernameMessage = (text) => {
    resultsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; cursor:pointer; font-weight:bold; color:#FFFFFF;" title="Click to enter your username">${text}</td></tr>`;
    resultsBody.querySelector("td").addEventListener("click", () => promptUsername("Please enter your username:"));
  };

  // --- Load Player Data ---
  const loadPlayerData = async username => {
    try {
      const res = await fetch(`https://api.minebox.co/data/${username}`);
      const data = await res.json();
      museumIds = (data.data.OBJECTIVES.museum || []).map(String);
      playerDataLoaded = true;
      updateCounts();
      currentPage = 1;
      renderItems(currentFilter, searchInput.value);
      updateHeaderAvatar(username);
      updateUIVisibility();
    } catch (err) {
      console.error(err);
      museumIds = [];
      playerDataLoaded = false;
      showEnterUsernameMessage("Failed to load player data. Click here to enter your username.");
      if (headerAvatar) headerAvatar.src = lastValidAvatar;
      updateUIVisibility();
    }
  };

  // --- Update Counts ---
  const updateCounts = () => {
    const excludeRegex = /^(?:xmas_|lny_|emote_|ship_default|Mount_Default|Valentine_Letter|Pet_Egg|nameplate_)/i;
    const total = allItems.filter(item => !excludeRegex.test(item.id || "")).length;
    const donated = museumIds.length;
    const missing = total - donated;
    btnTotal.innerText = `Total (${total})`;
    btnDonated.innerText = `Donated (${donated})`;
    btnMissing.innerText = `Missing (${missing})`;
  };

  // --- Populate Job Filter ---
  const populateJobFilter = () => {
    const jobs = Array.from(new Set(allItems.filter(i => i.recipe?.job).map(i => i.recipe.job))).sort();
    while (jobFilter.options.length > 1) jobFilter.remove(1);
    jobs.forEach(job => {
      const opt = document.createElement("option");
      opt.value = job;
      opt.textContent = formatID(job);
      jobFilter.appendChild(opt);
    });
  };

  // --- Render Items ---
  const renderItems = (filter, query = "") => {
    resultsBody.classList.add("fade-out");
    const normalizedQuery = normalize(query);
    const selectedJob = jobFilter.value;

    setTimeout(() => {
      resultsBody.innerHTML = "";
      const excludeRegex = /^(?:xmas_|lny_|emote_|nameplate_)/i;

      const filtered = allItems.filter(item => {
        const owned = isOwned(item.id);
        if (filter === "donated" && !owned) return false;
        if (filter === "missing" && (owned || excludeRegex.test(item.id || ""))) return false;
        if (filter === "total" && excludeRegex.test(item.id || "")) return false;
        if (normalizedQuery && !normalize(item.id).includes(normalizedQuery)) return false;
        if (selectedJob && (item.recipe?.job || "__NO_JOB__") !== selectedJob) return false;
        return true;
      }).sort((a, b) => (a.level || 0) - (b.level || 0));

      const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
      if (currentPage > totalPages) currentPage = totalPages;
      const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

      if (!pageItems.length) {
        resultsBody.innerHTML = "<tr><td colspan='4'>No items found.</td></tr>";
      } else {
        pageItems.forEach(item => {
          const owned = isOwned(item.id);
          const row = document.createElement("tr");
          const displayID = formatID(item.id);
          const iconSrc = getSafeImage(item);
          const rarityImg = item.rarity && rarityImages[item.rarity] ? `<img class="rarity-icon" src="${rarityImages[item.rarity]}" title="${item.rarity}" alt="${item.rarity}">` : "-";

          row.innerHTML = `
            <td class="id-cell"><img class="item-icon" src="${iconSrc}" alt="${displayID}" loading="lazy"><span>${displayID}</span></td>
            <td>${rarityImg}</td>
            <td>${item.level || "-"}</td>
            <td>${item.category || "-"}</td>
          `;

          if (filter !== "donated" && !owned) {
            row.style.backgroundColor = "#ffcccc";
            row.style.color = "#555";
            row.querySelector(".id-cell span").style.color = "#555";
          }

          row.addEventListener("click", () => openModal(item));
          resultsBody.appendChild(row);
        });
      }

      prevPageBtn.disabled = currentPage === 1;
      nextPageBtn.disabled = currentPage === totalPages;
      pageInfo.innerText = `Page ${currentPage} / ${totalPages}`;
      resultsBody.classList.remove("fade-out");
    }, 200);
  };

  // --- Modal ---
  const openModal = item => {
    const iconSrc = getSafeImage(item);
    $("modalHeaderImage").src = iconSrc;
    $("modalHeaderImage").alt = formatID(item.id);
    modalTitle.textContent = formatID(item.id);
    modalTitle.title = formatID(item.id);

    const job = item.recipe?.job;
    modalJob.innerHTML = job
      ? `<img src="pictures/skills/${job.toLowerCase()}.png" alt="${formatID(job)}" title="${formatID(job)}" style="width:24px;height:24px;margin-right:4px;vertical-align:middle;"><span>${formatID(job)}</span>`
      : "<span>-</span>";

    modalRarity.src = rarityImages[item.rarity] || "";

    modalIngredients.innerHTML = "";
    item.recipe?.ingredients?.forEach(ing => {
      const ingItem = allItems.find(i => i.id === ing.id);
      const div = document.createElement("div");
      const ingImg = ingItem ? getSafeImage(ingItem) : "pictures/undefined.png";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.gap = "0.3rem";
      div.innerHTML = `<img src="${ingImg}" alt="${ing.id}" title="${formatID(ing.id)}" style="width:32px;height:32px;object-fit:contain;cursor:pointer;"><span>${formatID(ing.id)}:</span>${ing.amount}`;
      div.querySelector("img").addEventListener("click", e => {
        e.stopPropagation();
        if (ingItem) openModal(ingItem);
      });
      modalIngredients.appendChild(div);
    });

    calculatorLink.href = `https://minebox.co/universe/calculator?id=${encodeURIComponent(item.id)}`;
    calculatorLink.title = `Open ${formatID(item.id)} in the Official Minebox calculator`;

    modal.classList.add("active");
  };

  modalClose.addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("active"); });

  // --- Pagination & Filters ---
  const changePage = delta => { currentPage += delta; renderItems(currentFilter, searchInput.value); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const filterItems = type => { currentFilter = type; currentPage = 1; renderItems(currentFilter, searchInput.value); };
  const loadItemsForUser = () => {
    const val = usernameInput.value.trim();
    if (val) {
      currentUsername = val;
      localStorage.setItem("checkupUsername", currentUsername);
      currentPage = 1;
      updateHeaderAvatar(currentUsername);
      updateUIVisibility();
      loadPlayerData(currentUsername);
    }
  };
  const clearSearch = () => { searchInput.value = ""; currentPage = 1; renderItems(currentFilter); };

  // --- Event Listeners ---
  checkBtn.addEventListener("click", loadItemsForUser);
  usernameInput.addEventListener("keydown", e => { if (e.key === "Enter") loadItemsForUser(); });
  usernameInput.addEventListener("input", debounce(() => updateHeaderAvatar(usernameInput.value.trim()), 200));
  clearSearchBtn.addEventListener("click", clearSearch);
  prevPageBtn.addEventListener("click", () => changePage(-1));
  nextPageBtn.addEventListener("click", () => changePage(1));
  btnTotal.addEventListener("click", () => filterItems("total"));
  btnDonated.addEventListener("click", () => filterItems("donated"));
  btnMissing.addEventListener("click", () => filterItems("missing"));
  jobFilter.addEventListener("change", () => { currentPage = 1; renderItems(currentFilter, searchInput.value); });
  searchInput.addEventListener("input", debounce(() => renderItems(currentFilter, searchInput.value), 200));

  if (clearLocalStorageBtn) {
    clearLocalStorageBtn.addEventListener("click", () => {
      localStorage.removeItem("checkupUsername");
      currentUsername = "";
      usernameInput.value = "";
      updateHeaderAvatar("");
      updateUIVisibility();
      showEnterUsernameMessage("Click here to enter your username.");
      museumIds = [];
      currentPage = 1;
    });
  }

  // --- Initial Load ---
  updateUIVisibility();
  if (currentUsername) {
    usernameInput.value = currentUsername;
    updateHeaderAvatar(currentUsername);
  } else {
    showEnterUsernameMessage("Click here to enter your username.");
  }
  loadItems();
});
