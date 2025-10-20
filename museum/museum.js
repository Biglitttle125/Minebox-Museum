document.addEventListener("DOMContentLoaded", () => {
  const ITEMS_URL = "https://cdn2.minebox.co/data/items.json";

  const $ = id => document.getElementById(id);
  const usernameInput = $("usernameInput");
  const btnLoadUser = $("btnLoadUser");
  const searchEl = $("search");
  const btnClearSearch = $("btnClearSearch");
  const btnTotal = $("btn-total");
  const btnDonated = $("btn-donated");
  const btnMissing = $("btn-missing");
  const jobFilterEl = $("jobFilter");
  const grid = $("itemsGrid");
  const emptyEl = $("empty");
  const prevBtn = $("prevPage");
  const nextBtn = $("nextPage");
  const pageInfo = $("pageInfo");
  const headerAvatar = $("headerAvatar");
  const headerUsername = $("headerUsername");
  const clearLocalStorageBtn = $("clearLocalStorageBtn");

  let lastValidHeaderSrc = headerAvatar?.src;

  const state = {
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
const getSafeImage = item => {
  if (item.image?.trim()) {
    return `data:image/png;base64,${item.image}`;
  } 
  if (item.id?.toLowerCase().startsWith("mount_")) {
    return `../pictures/mounts/${item.id.substring(6)}.png`;
  }
  if (item.id?.toLowerCase().startsWith("spawner_")) {
    return "../pictures/undefined/spawner.png";
  }
  return "../pictures/undefined.png";
};

  const formatID = id => (id ?? "(no id)").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const getItemsPerPage = () => Math.floor(grid.clientWidth / 200) * state.rowsPerPage || state.rowsPerPage;

  // --- Header ---
  const updateHeaderAvatar = username => {
    const displayName = username || "Guest";
    if (!headerAvatar || !headerUsername) return;
    headerAvatar.src = `https://vzge.me/head/51/${encodeURIComponent(displayName)}`;
    headerAvatar.alt = `${displayName}'s Head Skin`;
    headerUsername.textContent = displayName;
    headerUsername.title = displayName;
    headerUsername.style.whiteSpace = "nowrap";
    headerUsername.style.overflow = "hidden";
    headerUsername.style.textOverflow = "ellipsis";
    headerUsername.style.maxWidth = "150px";
  };

  if (headerAvatar) {
    headerAvatar.onerror = () => (headerAvatar.src = lastValidHeaderSrc);
    headerAvatar.onload = () => (lastValidHeaderSrc = headerAvatar.src);
  }

  // --- Controls ---
  const toggleControls = () => {
    const visible = !!state.username && !state.loadFailed;
    [usernameInput, btnLoadUser].forEach(el => el?.classList.toggle("show", !!state.username));
    [searchEl, btnClearSearch, usernameInput, btnLoadUser, btnTotal, btnDonated, btnMissing, jobFilterEl, prevBtn, nextBtn, pageInfo]
      .forEach(el => el?.classList.toggle("show", visible));
  };

  const setUsername = username => {
    state.username = username || "";
    if (username) localStorage.setItem("museumUsername", username);
    usernameInput.value = username || "";
    updateHeaderAvatar(username);
    toggleControls();
  };

  const updateCounts = () => {
    const total = state.allItems.filter(i => !state.excludeRegex.test(i.id ?? "")).length;
    const donated = state.museumIDs.size;
    btnTotal.textContent = `Total (${total})`;
    btnDonated.textContent = `Donated (${donated})`;
    btnMissing.textContent = `Missing (${total - donated})`;
  };

  const populateJobFilter = () => {
    const jobs = new Set();
    let hasNoJob = false;
    state.allItems.forEach(i => i.recipe?.job ? jobs.add(i.recipe.job) : hasNoJob = true);
    jobFilterEl.innerHTML = '<option value="">All jobs</option>';
    if (hasNoJob) jobFilterEl.innerHTML += '<option value="NO_JOB">No job</option>';
    Array.from(jobs).sort().forEach(job => {
      jobFilterEl.innerHTML += `<option value="${job}">${job.charAt(0).toUpperCase() + job.slice(1).toLowerCase()}</option>`;
    });
  };

  // --- Filters & Grid ---
  const applyFilters = () => {
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
  };

  const renderGrid = () => {
    grid.classList.add("fade-out");
    setTimeout(() => {
      grid.innerHTML = "";
      if (!state.filteredItems.length) {
        grid.style.display = "none";
        emptyEl.style.display = "block";
        prevBtn.disabled = nextBtn.disabled = true;
        pageInfo.textContent = "Page 0 / 0";
        grid.classList.remove("fade-out");
        return;
      }
      grid.style.display = "";
      emptyEl.style.display = "none";

      const itemsPerPage = getItemsPerPage();
      const totalPages = Math.ceil(state.filteredItems.length / itemsPerPage);
      if (state.currentPage > totalPages) state.currentPage = totalPages;

      const start = (state.currentPage - 1) * itemsPerPage;
      state.filteredItems.slice(start, start + itemsPerPage).forEach(item => {
        const id = item.id ?? "(no id)";
        const job = item.recipe?.job ?? null;
        const inMuseum = state.museumIDs.has(id.toString());

        const card = document.createElement("div");
        card.className = "card" + (inMuseum ? " donated" : state.currentFilter === "total" ? " not-museum" : "");
        if (inMuseum) card.innerHTML = `<div class="badge">Donated</div>`;

        const jobDisplay = job ? job.charAt(0).toUpperCase() + job.slice(1).toLowerCase() : "No job";
        const jobImg = job ? `<img src="../pictures/skills/${job.toLowerCase()}.png" alt="${job}" style="width:18px;height:18px;vertical-align:middle;margin-right:4px;">` : "";

        card.innerHTML += `
          <img class="item" src="${getSafeImage(item)}" alt="${id}" loading="lazy">
          <div class="id">${formatID(id)}</div>
          <div class="job">${jobImg}${jobDisplay}</div>
          <div class="rarity">
            ${item.rarity ? `<img src="../pictures/rarity/${item.rarity.toLowerCase()}.png" alt="${item.rarity}">` : '<span class="placeholder">No rarity</span>'}
          </div>
        `;
        grid.appendChild(card);
      });

      prevBtn.disabled = state.currentPage === 1;
      nextBtn.disabled = state.currentPage >= totalPages;
      pageInfo.textContent = `Page ${state.currentPage} / ${totalPages}`;
      grid.classList.remove("fade-out");
    }, 200);
  };

  const changePage = delta => {
    const totalPages = Math.ceil(state.filteredItems.length / getItemsPerPage());
    const newPage = state.currentPage + delta;
    if (newPage < 1 || newPage > totalPages) return;
    state.currentPage = newPage;
    renderGrid();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Data Load ---
  const loadItems = async () => {
    try {
      const res = await fetch(ITEMS_URL);
      const data = await res.json();
      state.allItems = (Array.isArray(data) ? data : Object.values(data)).map(item => ({ ...item, id: item.id ?? "" }));
      populateJobFilter();
      updateCounts();
      toggleControls();

      if (!state.username) {
        const placeholder = document.createElement("div");
        placeholder.className = "card";
        placeholder.textContent = "Click here to enter your username";
        placeholder.onclick = () => {
          const u = prompt("Please enter your username:");
          if (u?.trim()) {
            setUsername(u.trim());
            loadPlayerData(state.username);
          }
        };
        grid.innerHTML = "";
        grid.appendChild(placeholder);
        return;
      }

      await loadPlayerData(state.username);
      applyFilters();
    } catch (e) {
      console.error(e);
      grid.style.display = "none";
      emptyEl.style.display = "block";
      emptyEl.textContent = "Error loading items";
      state.loadFailed = true;
      toggleControls();
    }
  };

  const loadPlayerData = async username => {
    try {
      const res = await fetch(`https://api.minebox.co/data/${username}`);
      if (!res.ok) throw new Error("Network error");
      const userData = await res.json();
      state.museumIDs = new Set((userData?.data?.OBJECTIVES?.museum || []).map(String));
      state.loadFailed = false;
      updateCounts();
      applyFilters();
      toggleControls();
    } catch (e) {
      console.error(e);
      state.loadFailed = true;
      grid.innerHTML = "";
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
  };

  // --- Event Listeners ---
  btnLoadUser.addEventListener("click", () => {
    const u = usernameInput.value.trim();
    if (u) {
      setUsername(u);
      loadPlayerData(state.username);
    }
  });

  usernameInput.addEventListener("keydown", e => { if (e.key === "Enter") btnLoadUser.click(); });
  usernameInput.addEventListener("input", () => updateHeaderAvatar(usernameInput.value.trim() || "Guest"));

  searchEl.addEventListener("input", () => {
    clearTimeout(state.debounce);
    state.debounce = setTimeout(applyFilters, 200);
  });

  jobFilterEl.addEventListener("change", applyFilters);
  btnClearSearch.addEventListener("click", () => { searchEl.value = ""; applyFilters(); });
  btnTotal.addEventListener("click", () => { state.currentFilter = "total"; applyFilters(); });
  btnDonated.addEventListener("click", () => { state.currentFilter = "donated"; applyFilters(); });
  btnMissing.addEventListener("click", () => { state.currentFilter = "missing"; applyFilters(); });
  prevBtn.addEventListener("click", () => changePage(-1));
  nextBtn.addEventListener("click", () => changePage(1));

  if (clearLocalStorageBtn) {
    clearLocalStorageBtn.addEventListener("click", () => {
      localStorage.removeItem("museumUsername");
      state.username = "";
      usernameInput.value = "";
      state.museumIDs.clear();
      state.currentPage = 1;
      state.filteredItems = [];
      grid.innerHTML = "";
      const placeholder = document.createElement("div");
      placeholder.className = "card";
      placeholder.textContent = "Click here to enter your username";
      placeholder.onclick = () => {
        const u = prompt("Please enter your username:");
        if (u?.trim()) {
          setUsername(u.trim());
          loadPlayerData(state.username);
        }
      };
      grid.appendChild(placeholder);
      updateHeaderAvatar("Guest");
      toggleControls();
    });
  }

  if (state.username) setUsername(state.username);
  else toggleControls();

  loadItems();
});

