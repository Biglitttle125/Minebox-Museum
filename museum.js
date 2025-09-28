document.addEventListener("DOMContentLoaded", () => {
  const ITEMS_URL = "https://cdn2.minebox.co/data/items.json";
  const usernameInput = document.getElementById("usernameInput");
  const btnLoadUser = document.getElementById("btnLoadUser");
  const searchEl = document.getElementById("search");
  const btnClearSearch = document.getElementById("btnClearSearch");
  const btnTotal = document.getElementById("btn-total");
  const btnDonated = document.getElementById("btn-donated");
  const btnMissing = document.getElementById("btn-missing");
  const jobFilterEl = document.getElementById("jobFilter");
  const grid = document.getElementById("itemsGrid");
  const emptyEl = document.getElementById("empty");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  const headerAvatar = document.getElementById("headerAvatar");
  const headerUsername = document.getElementById("headerUsername");

  let lastValidHeaderSrc = headerAvatar?.src;

  let state = {
    username: localStorage.getItem("museumUsername") || "",
    allItems: [],
    museumIDs: new Set(),
    filteredItems: [],
    currentFilter: "total",
    currentPage: 1,
    rowsPerPage: 4,
    excludeRegex: /^(xmas_|lny_|emote_|ship_default|Mount_Default|Valentine_Letter|Pet_Egg|nameplate_)/i,
    debounce: null,
    loadFailed: false
  };

  // --- Helpers ---
  const safeImageSrc = base64 =>
    base64?.trim()
      ? base64.startsWith("data:")
        ? base64
        : "data:image/png;base64," + base64
      : "pictures/undefined.png";

  const formatID = id => (id ?? "(no id)").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const getItemsPerPage = () => {
    const cardWidth = 200;
    return Math.floor(grid.clientWidth / cardWidth) * state.rowsPerPage || state.rowsPerPage;
  };

  // --- Header Avatar & Username ---
  function updateHeaderAvatar(username) {
    if (!username || !headerAvatar || !headerUsername) return;

    headerAvatar.src = `https://vzge.me/head/51/${encodeURIComponent(username)}`;
    headerAvatar.alt = `${username}'s Head Skin`;

    headerUsername.textContent = username;
    headerUsername.title = username;
    headerUsername.style.whiteSpace = "nowrap";
    headerUsername.style.overflow = "hidden";
    headerUsername.style.textOverflow = "ellipsis";
    headerUsername.style.maxWidth = "150px";
  }

  if (headerAvatar) {
    headerAvatar.onerror = () => { headerAvatar.src = lastValidHeaderSrc; };
    headerAvatar.onload = () => { lastValidHeaderSrc = headerAvatar.src; };
  }

  // --- Controls visibility using .show ---
  function toggleControls() {
    if (usernameInput) usernameInput.classList.toggle("show", !!state.username);
    if (btnLoadUser) btnLoadUser.classList.toggle("show", !!state.username);

    const dataDependentControls = [
      searchEl, btnClearSearch, usernameInput, btnLoadUser,
      btnTotal, btnDonated, btnMissing,
      jobFilterEl, prevBtn, nextBtn, pageInfo
    ];

    dataDependentControls.forEach(el => {
      if (!el) return;
      el.classList.toggle("show", !!state.username && !state.loadFailed);
    });
  }

  // --- Set username ---
  function setUsername(username) {
    state.username = username || "";
    if (username) localStorage.setItem("museumUsername", username);
    usernameInput.value = username || "";
    updateHeaderAvatar(username);
    toggleControls();
  }

  // --- Counts & Filters ---
  function updateCounts() {
    const total = state.allItems.filter(i => !state.excludeRegex.test(i.id ?? "")).length;
    const donated = state.museumIDs.size;
    btnTotal.textContent = `Total (${total})`;
    btnDonated.textContent = `Donated (${donated})`;
    btnMissing.textContent = `Missing (${total - donated})`;
  }

  function populateJobFilter() {
    const jobs = new Set();
    let hasNoJob = false;
    state.allItems.forEach(i => i.recipe?.job ? jobs.add(i.recipe.job) : hasNoJob = true);
    jobFilterEl.innerHTML = '<option value="">All jobs</option>';
    if (hasNoJob) jobFilterEl.innerHTML += '<option value="NO_JOB">No job</option>';
    Array.from(jobs).sort().forEach(job => {
      jobFilterEl.innerHTML += `<option value="${job}">${job.charAt(0).toUpperCase() + job.slice(1).toLowerCase()}</option>`;
    });
  }

  function applyFilters() {
    if (state.loadFailed) return;
    const query = (searchEl.value || "").toLowerCase().replace(/[\s_]+/g, "");
    const filterJob = jobFilterEl.value;

    state.filteredItems = state.allItems.filter(item => {
      const idNorm = (item.id ?? "").toLowerCase().replace(/[\s_]+/g, "");
      const job = item.recipe?.job ?? null;

      if (filterJob) {
        if (filterJob === "NO_JOB" && job) return false;
        if (filterJob !== "NO_JOB" && job !== filterJob) return false;
      }
      if (query && !idNorm.includes(query)) return false;
      if (state.currentFilter === "total" && state.excludeRegex.test(item.id ?? "")) return false;
      if (state.currentFilter === "donated" && !state.museumIDs.has((item.id ?? "").toString())) return false;
      if (state.currentFilter === "missing" && (state.museumIDs.has((item.id ?? "").toString()) || state.excludeRegex.test(item.id ?? ""))) return false;
      return true;
    });

    state.filteredItems.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    state.currentPage = 1;
    renderGrid();
  }

  // --- Render grid ---
  function renderGrid() {
    grid.classList.add("fade-out");
    setTimeout(() => {
      grid.innerHTML = "";
      const items = state.filteredItems;
      if (!items.length) {
        grid.style.display = "none";
        emptyEl.style.display = "block";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        pageInfo.textContent = "Page 0 / 0";
        grid.classList.remove("fade-out");
        return;
      }
      grid.style.display = "";
      emptyEl.style.display = "none";

      const itemsPerPage = getItemsPerPage();
      const totalPages = Math.ceil(items.length / itemsPerPage);
      if (state.currentPage > totalPages) state.currentPage = totalPages;

      const start = (state.currentPage - 1) * itemsPerPage;
      const pageItems = items.slice(start, start + itemsPerPage);

      pageItems.forEach(item => {
        const id = item.id ?? "(no id)";
        const job = item.recipe?.job ?? null;
        const inMuseum = state.museumIDs.has((id ?? "").toString());

        const card = document.createElement("div");
        card.className = "card";
        if (inMuseum) card.classList.add("donated");
        else if (state.currentFilter === "total") card.classList.add("not-museum");
        if (inMuseum) card.innerHTML = `<div class="badge">Donated</div>`;

        const jobDisplay = job ? job.charAt(0).toUpperCase() + job.slice(1).toLowerCase() : "No job";
        const jobImg = job ? `<img src="pictures/skills/${job.toLowerCase()}.png" alt="${job}" style="width:18px;height:18px;vertical-align:middle;margin-right:4px;">` : "";

        card.innerHTML += `
          <img class="item" src="${safeImageSrc(item.image)}" alt="${id}" loading="lazy">
          <div class="id">${formatID(id)}</div>
          <div class="job">${jobImg}${jobDisplay}</div>
          <div class="rarity">
            ${item.rarity ? `<img src="pictures/rarity/${item.rarity.toLowerCase()}.png" alt="${item.rarity}">` : '<span class="placeholder">No rarity</span>'}
          </div>
        `;
        grid.appendChild(card);
      });

      prevBtn.disabled = state.currentPage === 1;
      nextBtn.disabled = state.currentPage >= totalPages;
      pageInfo.textContent = `Page ${state.currentPage} / ${totalPages}`;
      grid.classList.remove("fade-out");
    }, 200);
  }

  function changePage(delta) {
    const totalPages = Math.ceil(state.filteredItems.length / getItemsPerPage());
    const newPage = state.currentPage + delta;
    if (newPage < 1 || newPage > totalPages) return;
    state.currentPage = newPage;
    renderGrid();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- Load Items & Player Data ---
  async function loadItems() {
    try {
      const res = await fetch(ITEMS_URL);
      const data = await res.json();
      const itemsArray = Array.isArray(data) ? data : Object.values(data);
      state.allItems = itemsArray.map(item => { if (!item.id) item.id = ""; return item; });

      populateJobFilter();
      updateCounts();
      toggleControls();

      if (!state.username) {
        grid.innerHTML = '<div class="card" id="placeholderCard">Click here to enter your username</div>';
        document.getElementById("placeholderCard").addEventListener("click", () => {
          const u = prompt("Please enter your username:");
          if (u?.trim()) {
            setUsername(u.trim());
            loadPlayerData(state.username);
          }
        });
        return;
      }

      await loadPlayerData(state.username);
      applyFilters();
    } catch (e) {
      grid.style.display = "none";
      emptyEl.style.display = "block";
      emptyEl.textContent = "Error loading items";
      state.loadFailed = true;
      toggleControls();
      console.error(e);
    }
  }

  async function loadPlayerData(username) {
    try {
      const res = await fetch(`https://api.minebox.co/data/${username}`);
      if (!res.ok) throw new Error("Network response was not ok");
      const userData = await res.json();
      state.museumIDs = new Set((userData?.data?.OBJECTIVES?.museum || []).map(id => id.toString()));
      state.loadFailed = false;
      updateCounts();
      applyFilters();
      toggleControls();
    } catch (e) {
      console.error(e);
      state.loadFailed = true;
      grid.innerHTML = '';
      const errorCard = document.createElement("div");
      errorCard.className = "card";
      errorCard.style.gridColumn = "1 / -1";
      errorCard.style.textAlign = "center";
      errorCard.style.cursor = "pointer";
      errorCard.textContent = "Failed to load player data. Click here to enter your username.";
      errorCard.onclick = () => {
        const newUsername = prompt("Please enter your username:");
        if (newUsername?.trim()) setUsername(newUsername.trim());
        loadPlayerData(state.username);
      };
      grid.appendChild(errorCard);
      toggleControls();
    }
  }

  // --- Event Bindings ---
  btnLoadUser.addEventListener("click", () => {
    const u = usernameInput.value.trim();
    if (u) {
      setUsername(u);
      loadPlayerData(state.username);
    }
  });

  usernameInput.addEventListener("keydown", e => { if (e.key === "Enter") btnLoadUser.click(); });

  // 🔹 Live header avatar + username preview
  usernameInput.addEventListener("input", () => {
    const u = usernameInput.value.trim();
    if (u) {
      updateHeaderAvatar(u);
      headerUsername.textContent = u;
      headerUsername.title = u;
    } else {
      const guestName = "Guest";
      headerAvatar.src = `https://vzge.me/head/51/${encodeURIComponent(guestName)}`;
      headerAvatar.alt = "Guest's Head Skin";
      headerUsername.textContent = guestName;
      headerUsername.title = guestName;
    }
  });

  searchEl.addEventListener("input", () => { clearTimeout(state.debounce); state.debounce = setTimeout(applyFilters, 200); });
  jobFilterEl.addEventListener("change", applyFilters);
  btnClearSearch.addEventListener("click", () => { searchEl.value = ""; applyFilters(); });
  btnTotal.addEventListener("click", () => { state.currentFilter = "total"; applyFilters(); });
  btnDonated.addEventListener("click", () => { state.currentFilter = "donated"; applyFilters(); });
  btnMissing.addEventListener("click", () => { state.currentFilter = "missing"; applyFilters(); });
  prevBtn.addEventListener("click", () => changePage(-1));
  nextBtn.addEventListener("click", () => changePage(1));

  // --- Initial Load ---
  if (state.username) setUsername(state.username);
  else toggleControls();

  // --- Clear LocalStorage Button ---
  const clearLocalStorageBtn = document.getElementById("clearLocalStorageBtn");
  if (clearLocalStorageBtn) {
    clearLocalStorageBtn.addEventListener("click", () => {
      localStorage.removeItem("museumUsername");
      state.username = "";
      usernameInput.value = "";
      state.museumIDs.clear();
      state.currentPage = 1;
      state.filteredItems = [];
      grid.innerHTML = '<div class="card" id="placeholderCard">Click here to enter your username</div>';
      const placeholderCard = document.getElementById("placeholderCard");
      placeholderCard.addEventListener("click", () => {
        const u = prompt("Please enter your username:");
        if (u?.trim()) {
          setUsername(u.trim());
          loadPlayerData(state.username);
        }
      });

      const guestName = "Guest";
      if (headerAvatar) {
        headerAvatar.src = `https://vzge.me/head/51/${encodeURIComponent(guestName)}`;
        headerAvatar.alt = "Guest's Head Skin";
      }
      if (headerUsername) {
        headerUsername.textContent = guestName;
        headerUsername.title = guestName;
      }

      toggleControls();
    });
  }

  loadItems();
});
