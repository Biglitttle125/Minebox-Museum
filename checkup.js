document.addEventListener("DOMContentLoaded", () => {
  let allItems = [];
  let museumIds = [];
  let currentUsername = localStorage.getItem("checkupUsername") || "";
  let playerDataLoaded = false;
  let currentFilter = 'total';
  let currentPage = 1;
  const itemsPerPage = 16;

  const rarityImages = {
    UNCOMMON: "pictures/rarity/uncommon.png",
    COMMON: "pictures/rarity/common.png",
    RARE: "pictures/rarity/rare.png",
    EPIC: "pictures/rarity/epic.png",
    LEGENDARY: "pictures/rarity/legendary.png",
    MYTHIC: "pictures/rarity/mythic.png"
  };

  // --- Elements ---
  const resultsBody = document.getElementById("results");
  const searchInput = document.getElementById("searchInput");
  const usernameInput = document.getElementById("usernameInput");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  const btnTotal = document.getElementById("btn-total");
  const btnDonated = document.getElementById("btn-donated");
  const btnMissing = document.getElementById("btn-missing");
  const jobFilter = document.getElementById("jobFilter");
  const checkBtn = document.getElementById("checkBtn");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const modalJob = document.getElementById("modalJob");
  const modal = document.getElementById("itemModal");
  const modalClose = document.getElementById("modalClose");
  const modalTitle = document.getElementById("modalTitle");
  const modalRarity = document.getElementById("modalRarity");
  const modalIngredients = document.getElementById("modalIngredients");
  const calculatorLink = document.getElementById("calculatorLink");
  const headerAvatar = document.getElementById("headerAvatar");
  const headerUsername = document.getElementById("headerUsername");
  let lastValidAvatar = headerAvatar?.src;
  const clearLocalStorageBtn = document.getElementById("clearLocalStorageBtn");

  // --- Helpers ---
  const formatID = id => (id||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
  const normalize = str => (str||"").toLowerCase().replace(/[\s_]+/g,"");
  const debounce = (fn, delay) => { let timer; return (...args)=>{ clearTimeout(timer); timer=setTimeout(()=>fn.apply(this,args), delay); }; };
const calcIcon = document.getElementById("calculatorIcon"); calcIcon.addEventListener("mouseenter", () => calcIcon.src = "pictures/calculator-secondary.svg"); calcIcon.addEventListener("mouseleave", () => calcIcon.src = "pictures/calculator.svg");
  // --- Show/Hide UI elements ---
  function updateUIVisibility() {
    if (!usernameInput || !checkBtn) return;

    // Username input and check button always visible if username exists
    usernameInput.classList.toggle("show", !!currentUsername);
    checkBtn.classList.toggle("show", !!currentUsername);

    // Elements that depend on player data loaded
    const dataUI = [
      searchInput, clearSearchBtn,
      prevPageBtn, nextPageBtn, pageInfo,
      btnTotal, btnDonated, btnMissing,
      jobFilter,checkBtn,usernameInput
    ];

    dataUI.forEach(el => {
      if (el) el.classList.toggle("show", !!currentUsername && playerDataLoaded);
    });

    // Clear localStorage button always visible
    if (clearLocalStorageBtn) clearLocalStorageBtn.classList.add("show");
  }

  function updateHeaderAvatar(username) {
    if (!headerAvatar || !headerUsername) return;
    const name = username || "Guest";
    headerAvatar.src = `https://vzge.me/head/250/${encodeURIComponent(name)}`;
    headerAvatar.alt = `${name}'s Head Skin`;
    headerUsername.textContent = name;
    headerUsername.title = name;
  }

  if (headerAvatar) {
    headerAvatar.onerror = () => { headerAvatar.src = lastValidAvatar; };
    headerAvatar.onload = () => { lastValidAvatar = headerAvatar.src; };
  }

  function promptUsername(message="Please enter your username:") {
    const username = window.prompt(message);
    if (username?.trim()) {
      currentUsername = username.trim();
      localStorage.setItem("checkupUsername", currentUsername);
      usernameInput.value = currentUsername;
      updateHeaderAvatar(currentUsername);
      updateUIVisibility();
      loadPlayerData(currentUsername);
    }
  }

  // --- Load items ---
  async function loadItems() {
    try {
      const res = await fetch("https://cdn2.minebox.co/data/items.json");
      const data = await res.json();
      allItems = Array.isArray(data) ? data : (data.items||[]);
      allItems = allItems.map(item => { if(!item.id) item.id=""; return item; });

      if(!currentUsername) {
        resultsBody.innerHTML=`<tr><td colspan="4" style="text-align:center; cursor:pointer; font-weight:bold; color:#FFFFFF;">Click here to enter your username.</td></tr>`;
        resultsBody.querySelector("td").addEventListener("click", ()=>promptUsername());
        updateUIVisibility();
        return;
      }

      updateHeaderAvatar(currentUsername);
      await loadPlayerData(currentUsername);
      populateJobFilter();
      updateUIVisibility();
    } catch(err) {
      console.error(err);
      resultsBody.innerHTML="<tr><td colspan='4'>Failed to load items.</td></tr>";
    }
  }

  // --- Load player data ---
  async function loadPlayerData(username){
    try {
      const res = await fetch(`https://api.minebox.co/data/${username}`);
      const data = await res.json();
      museumIds = (data.data.OBJECTIVES.museum||[]).map(id => id.toString());
      playerDataLoaded = true;
      updateCounts();
      currentPage = 1;
      renderItems(currentFilter, searchInput.value);
      updateHeaderAvatar(username);
      updateUIVisibility();
    } catch(err){
      console.error(err);
      museumIds = [];
      playerDataLoaded = false;
      resultsBody.innerHTML=`<tr><td colspan='4' style="text-align:center; cursor:pointer; font-weight:bold; color:#FFFFFF;">Failed to load player data. Click here to enter your username.</td></tr>`;
      resultsBody.querySelector("td").addEventListener("click", ()=>promptUsername());
      if(headerAvatar) headerAvatar.src = lastValidAvatar;
      updateUIVisibility();
    }
  }

  function updateCounts() {
    const excludeRegex=/^(?:xmas_|lny_|emote_|ship_default|Mount_Default|Valentine_Letter|Pet_Egg|nameplate_)/i;
    const total = allItems.filter(item=>!excludeRegex.test(item.id||"")).length;
    const donated = museumIds.length;
    const missing = total - donated;
    btnTotal.innerText = `Total (${total})`;
    btnDonated.innerText = `Donated (${donated})`;
    btnMissing.innerText = `Missing (${missing})`;
  }

  function populateJobFilter() {
    const jobSet = new Set();
    allItems.forEach(item => { if(item.recipe?.job) jobSet.add(item.recipe.job); });
    while(jobFilter.options.length>1) jobFilter.remove(1);
    Array.from(jobSet).sort().forEach(job => {
      const option = document.createElement("option");
      option.value = job;
      option.textContent = formatID(job);
      jobFilter.appendChild(option);
    });
  }

  // --- Render items ---
  function renderItems(filter, query="") {
    resultsBody.classList.add("fade-out");
    const normalizedQuery = normalize(query);
    const selectedJob = jobFilter.value;

    setTimeout(()=>{
      resultsBody.innerHTML="";
      const excludeRegex=/^(?:xmas_|lny_|emote_|nameplate_)/i;

      const filtered = allItems.filter(item => {
        const owned = museumIds.some(id=>id.toLowerCase() === (item.id||"").toLowerCase());
        if(filter==="donated" && !owned) return false;
        if(filter==="missing" && (owned || excludeRegex.test(item.id||""))) return false;
        if(filter==="total" && excludeRegex.test(item.id||"")) return false;
        if(normalizedQuery && !normalize(item.id).includes(normalizedQuery)) return false;
        const itemJob = item.recipe?.job || "__NO_JOB__";
        if(selectedJob && itemJob !== selectedJob) return false;
        return true;
      }).sort((a,b)=>(a.level||0)-(b.level||0));

      const totalPages = Math.ceil(filtered.length/itemsPerPage)||1;
      if(currentPage>totalPages) currentPage=totalPages;
      const pageItems = filtered.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);

      pageItems.forEach(item=>{
        const owned = museumIds.some(id=>id.toLowerCase() === (item.id||"").toLowerCase());
        const row = document.createElement("tr");
        const displayID = formatID(item.id);
        const iconSrc = item.image?.trim()? `data:image/png;base64,${item.image}`:"pictures/undefined.png";
        const rarityImg = item.rarity && rarityImages[item.rarity]? `<img class="rarity-icon" src="${rarityImages[item.rarity]}" title="${item.rarity}" alt="${item.rarity}">` : "-";

        row.innerHTML = `
          <td class="id-cell"><img class="item-icon" src="${iconSrc}" alt="${displayID}" loading="lazy"><span>${displayID}</span></td>
          <td>${rarityImg}</td>
          <td>${item.level||"-"}</td>
          <td>${item.category||"-"}</td>
        `;

        if(filter!=="donated" && !owned){
          row.style.backgroundColor="#ffcccc";
          row.style.color="#555";
          row.querySelector(".id-cell span").style.color="#555";
        }

        row.addEventListener("click",()=>openModal(item));
        resultsBody.appendChild(row);
      });

      if(pageItems.length===0) resultsBody.innerHTML="<tr><td colspan='4'>No items found.</td></tr>";

      prevPageBtn.disabled = currentPage===1;
      nextPageBtn.disabled = currentPage===totalPages;
      pageInfo.innerText = `Page ${currentPage} / ${totalPages}`;
      resultsBody.classList.remove("fade-out");
    },200);
  }

  // --- Modal ---
  function openModal(item){
    const iconSrc = item.image?.trim() ? `data:image/png;base64,${item.image}` : "pictures/undefined.png";
    const modalHeaderImage = document.getElementById("modalHeaderImage");
    modalHeaderImage.src = iconSrc;
    modalHeaderImage.alt = formatID(item.id);
    modalTitle.textContent = formatID(item.id);
    modalTitle.title = formatID(item.id);

    const rawJob = item.recipe?.job;
    if (rawJob) {
      const jobName = rawJob.charAt(0).toUpperCase() + rawJob.slice(1).toLowerCase();
      const jobImgSrc = `pictures/skills/${rawJob.toLowerCase()}.png`;
      modalJob.innerHTML = `<img src="${jobImgSrc}" alt="${jobName}" title="${jobName}" style="width:24px;height:24px;margin-right:4px;vertical-align:middle;"><span>${jobName}</span>`;
    } else modalJob.innerHTML = `<span>-</span>`;

    modalRarity.src = rarityImages[item.rarity] || "";

    modalIngredients.innerHTML = "";
    if(item.recipe?.ingredients?.length){
      item.recipe.ingredients.forEach(ing=>{
        const ingItem = allItems.find(i=>i.id===ing.id);
        const div = document.createElement("div");
        const ingImg = ingItem?.image ? `data:image/png;base64,${ingItem.image}` : "pictures/undefined.png";
        div.style.display="flex"; div.style.alignItems="center"; div.style.gap="0.3rem";
        div.innerHTML = `<img src="${ingImg}" alt="${ing.id}" title="${formatID(ing.id)}" style="width:32px;height:32px;object-fit:contain;cursor:pointer;"><span>${formatID(ing.id)}:</span>${ing.amount}`;
        div.querySelector("img").addEventListener("click", e=>{ e.stopPropagation(); openModal(ingItem); });
        modalIngredients.appendChild(div);
      });
    }

    calculatorLink.href = `https://minebox.co/universe/calculator?id=${encodeURIComponent(item.id)}`;
    calculatorLink.title = `Open ${formatID(item.id)} in the Official Minebox calculator`;

    modal.classList.add("active");
  }

  modalClose.addEventListener("click", ()=>modal.classList.remove("active"));
  modal.addEventListener("click", e => { if(e.target===modal) modal.classList.remove("active"); });

  // --- Pagination & Filters ---
  function changePage(delta){ currentPage+=delta; renderItems(currentFilter, searchInput.value); window.scrollTo({top:0,behavior:"smooth"}); }
  function filterItems(type){ currentFilter=type; currentPage=1; renderItems(currentFilter, searchInput.value); }
  function loadItemsForUser(){
    const val = usernameInput.value.trim();
    if(val){
      currentUsername = val;
      localStorage.setItem("checkupUsername", currentUsername);
      currentPage = 1;
      updateHeaderAvatar(currentUsername);
      updateUIVisibility();
      loadPlayerData(currentUsername);
    }
  }
  function clearSearch(){ searchInput.value=""; currentPage=1; renderItems(currentFilter); }

  // --- Event Listeners ---
  checkBtn.addEventListener("click", loadItemsForUser);
  usernameInput.addEventListener("keydown", e => { if(e.key==="Enter") loadItemsForUser(); });
  usernameInput.addEventListener("input", debounce(()=>updateHeaderAvatar(usernameInput.value.trim()),200));
  clearSearchBtn.addEventListener("click", clearSearch);
  prevPageBtn.addEventListener("click", ()=>changePage(-1));
  nextPageBtn.addEventListener("click", ()=>changePage(1));
  btnTotal.addEventListener("click", ()=>filterItems("total"));
  btnDonated.addEventListener("click", ()=>filterItems("donated"));
  btnMissing.addEventListener("click", ()=>filterItems("missing"));
  jobFilter.addEventListener("change", ()=>{ currentPage=1; renderItems(currentFilter, searchInput.value); });
  searchInput.addEventListener("input", debounce(()=>renderItems(currentFilter, searchInput.value),200));

  if(clearLocalStorageBtn){
    clearLocalStorageBtn.addEventListener("click", ()=>{
      localStorage.removeItem("checkupUsername");
      currentUsername = "";
      usernameInput.value = "";
      updateHeaderAvatar("");
      updateUIVisibility();
      resultsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-weight:bold; color:#FFFFFF; cursor:pointer;">Click here to enter your username.</td></tr>`;
      resultsBody.querySelector("td").addEventListener("click", ()=>promptUsername());
      museumIds = [];
      currentPage = 1;
    });
  }

  // --- Initial load ---
  updateUIVisibility();
  if(currentUsername){
    usernameInput.value=currentUsername;
    updateHeaderAvatar(currentUsername);
  }
  loadItems();
});
