document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    // --- DOM Elements ---
    const avatarImg = $("avatar");
    const headerAvatar = $("headerAvatar");
    const headerUsername = $("headerUsername");
    const usernameInput = $("usernameInput");
    const profileCard = $("userStatsCard");
    const statsContent = $("statsContent");
    const skillsCard = $("skillsCard");
    const skillsList = $("skillsList");
    const mountGrid = $("mountGrid");
    const randomStats = $("randomStats");

    // --- Utility Functions ---
    const createImg = ({ src, alt, width, height, className, style = {} }) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = alt;
        if (width) img.width = width;
        if (height) img.height = height;
        if (className) img.className = className;
        Object.assign(img.style, style);
        return img;
    };

    const createLoadingIcon = () => {
        const span = document.createElement("span");
        span.className = "loading-icon";
        span.textContent = "⌚";
        return span;
    };

    const setFallback = (img, lastValidSrc) => {
        img.onerror = () => { img.src = lastValidSrc.value; };
        img.onload = () => { lastValidSrc.value = img.src; };
    };

    const formatPlaytime = seconds => {
        if (!seconds) return { text: "⌚", title: "" };
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return { text: `${days}d ${hours}h ${minutes}m`, title: `Total hours: ${Math.floor(seconds / 3600)}` };
    };

    const getLastSeenText = lastConnectionDate => {
        const now = new Date();
        const diffMs = now - lastConnectionDate;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) return "just now";
        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    // --- Special Logo ---
    const logoImg = createImg({
        src: "pictures/mineboxdev.png",
        alt: "Special Logo",
        style: { width: "32px", height: "32px", position: "absolute", top: "8px", right: "8px", display: "none", borderRadius: "50%" }
    });
    profileCard.style.position = "relative";
    profileCard.appendChild(logoImg);

    // --- Crown Overlay (unchanged) ---
    const crownImg = createImg({
        src: "pictures/crown.png",
        alt: "Crown",
        style: { position: "absolute", display: "none" }
    });
    avatarImg.parentElement.style.position = "relative";
    avatarImg.parentElement.appendChild(crownImg);

    const positionCrown = () => {
        const crownWidth = avatarImg.clientWidth * 0.6;
        crownImg.style.width = `${crownWidth}px`;
        crownImg.style.left = `${avatarImg.offsetLeft + avatarImg.clientWidth / 2 - crownWidth / 2}px`;
        crownImg.style.top = `${avatarImg.offsetTop - crownWidth * 0.35}px`;
    };

    const updateCrown = level => {
        if (level >= 100) {
            crownImg.style.display = "block";
            crownImg.classList.add("floating-crown");
            crownImg.title = "Congratulations! Player Level 100 👑";
            positionCrown();
        } else {
            crownImg.style.display = "none";
            crownImg.classList.remove("floating-crown");
            crownImg.title = "";
        }
    };

    window.addEventListener("resize", () => {
        if (crownImg.style.display !== "none") positionCrown();
    });

    // --- Avatar Fallbacks ---
    const lastValidAvatarSrc = { value: avatarImg.src };
    const lastValidHeaderSrc = { value: headerAvatar.src };
    setFallback(avatarImg, lastValidAvatarSrc);
    setFallback(headerAvatar, lastValidHeaderSrc);

    const updateAvatars = username => {
        const name = username.trim() || "Guest";
        avatarImg.src = `https://vzge.me/full/500/${encodeURIComponent(name)}`;
        avatarImg.alt = `${name}'s Minecraft Skin`;
        headerAvatar.src = `https://vzge.me/head/51/${encodeURIComponent(name)}`;
        headerAvatar.alt = `${name}'s Head Skin`;
        if (headerUsername) {
            headerUsername.textContent = name;
            headerUsername.title = name;
        }
    };

    // --- Fetch Skills & Items ---
    let skillsData = {}, itemsData = {};
    const fetchJSON = async url => {
        try { return await (await fetch(url)).json(); }
        catch (err) { console.error(`Failed to load ${url}`, err); return {}; }
    };
    fetchJSON("https://cdn2.minebox.co/data/skills.json").then(data => skillsData = data);
    fetchJSON("https://cdn2.minebox.co/data/items.json").then(data => itemsData = data);

    // --- Mount Names ---
    const mountNames = {
        cloud: "High Cloud", default: "Dumbhoof", motorcycle: "Thunderbike", panda: "Bamboo Blaster",
        paperplane: "Paperplane", rocket: "Boomstick 9000", shark: "Sharktron MK-II",
        shopping_cart: "Shopping Cart of Chaos", flying_carpet: "Flying Carpet", wooden_plane: "Splinterwing",
        hipster_bike: "Hipster bike", lny_snake: "Lunar Crimson Snake", valentine_pegase: "Love-struck Pegasus",
        puddle: "Sloshrat", ufo: "Blorbo", truck: "Truckzilla", broomstick: "Sweep"
    };

    // --- Mount Card ---
    const updateMountCard = activeMountId => {
        mountGrid.innerHTML = "<h3>Active Mount</h3>";
        if (!activeMountId || !itemsData) {
            mountGrid.appendChild(createLoadingIcon());
            return;
        }

        const mountData = Object.values(itemsData).find(item => item.id === `mount_${activeMountId}`);
        if (!mountData) {
            mountGrid.appendChild(createLoadingIcon());
            return;
        }

        const header = mountGrid.querySelector("h3");
        const rarityImg = createImg({ src: `pictures/rarity/${mountData.rarity.toLowerCase()}.png`, alt: mountData.rarity, className: "rarity-icon" });
        header.querySelector(".rarity-icon")?.remove();
        header.appendChild(rarityImg);

        const mountName = document.createElement("p");
        mountName.textContent = mountNames[activeMountId] || activeMountId;
        mountName.style.fontWeight = "bold";
        mountName.style.marginBottom = "0.5rem";

        const rarityGradients = {
            common: "", uncommon: "", rare: "linear-gradient(90deg, #084cfb, #adf3fd)",
            epic: "linear-gradient(90deg,#ef16ff,#ff86fa)", legendary: "linear-gradient(90deg,#fb9a09,#f8fd10)",
            mythic: "linear-gradient(90deg,red,#530e0e)"
        };
        const gradient = rarityGradients[mountData.rarity.toLowerCase()] || "";
        if (gradient) {
            mountName.style.backgroundImage = gradient;
            mountName.style.backgroundClip = "text";
            mountName.style.webkitBackgroundClip = "text";
            mountName.style.color = "transparent";
        }
        mountGrid.appendChild(mountName);

        const mountContainer = document.createElement("div");
        mountContainer.style.display = "flex";
        mountContainer.style.alignItems = "flex-start";
        mountContainer.style.gap = "1rem";

        mountContainer.appendChild(createImg({ src: `pictures/mounts/${activeMountId}.png`, alt: mountName.textContent, width: 64, height: 64 }));

        const statsDiv = document.createElement("div");
        statsDiv.style.display = "flex";
        statsDiv.style.flexDirection = "column";

        ["speed", "jump_height", "flyable"].forEach(stat => {
            const p = document.createElement("p");
            const label = stat === "jump_height" ? "Jump height" : stat.charAt(0).toUpperCase() + stat.slice(1);
            const value = stat === "flyable" ? (mountData.mount?.flyable ? "Yes" : "No") : mountData.mount?.[stat] ?? "-";
            p.innerHTML = `<strong class="mountGrid-text">${label}:</strong> ${value}`;
            statsDiv.appendChild(p);
        });
        mountContainer.appendChild(statsDiv);
        mountGrid.appendChild(mountContainer);
    };

    // --- User Stats ---
    const updateUserStats = async username => {
        const name = username.trim();
        statsContent.innerHTML = "";
        skillsList.innerHTML = "";
        mountGrid.innerHTML = "<h3>Active Mount</h3>";
        randomStats.innerHTML = "";

        logoImg.style.display = "none";
        updateCrown(0);

        const skillsHeader = skillsCard.querySelector("h3");
        skillsHeader.querySelector(".level-icon")?.remove();

        if (!name) return;

        // Show temporary loading icons
        [statsContent, skillsList, mountGrid, randomStats].forEach(el => el.appendChild(createLoadingIcon()));

        const specialUsers = ["evlad", "qdpyy"];
        if (specialUsers.includes(name.toLowerCase())) {
            logoImg.style.display = "block";
            logoImg.title = "Minebox Dev 🎉";
        }

        try {
            const response = await fetch(`https://api.minebox.co/data/${encodeURIComponent(name)}`);
            if (!response.ok) throw new Error("API request failed");
            const data = await response.json();

            // Clear loading icons
            statsContent.innerHTML = "";
            skillsList.innerHTML = "";
            mountGrid.innerHTML = "";
            randomStats.innerHTML = "";

            const overallLevel = data.level ?? 0;
            updateCrown(overallLevel);

            // --- Stats ---
            const lastConn = new Date(data.last_connection);
            const online = (new Date() - lastConn) < 75_000;
            const statusHtml = online
                ? `<span class="status-online" title="Online">🟢</span>`
                : `<span class="status-offline" title="Last seen ${getLastSeenText(lastConn)}">🔴</span>`;
            const { text: playtimeText, title: playtimeTitle } = formatPlaytime(data.playtime);
            const donatedText = (data.data.OBJECTIVES.museum?.length || 0) ? `${data.data.OBJECTIVES.museum.length} items` : "⌚";

            statsContent.innerHTML = `
                <p><strong class="mountGrid-text">Username:</strong> ${name} ${statusHtml}</p>
                <p><strong class="mountGrid-text">Total Playtime:</strong> <span title="${playtimeTitle}">${playtimeText}</span></p>
                <p><strong class="mountGrid-text">Total Donated:</strong> ${donatedText}</p>
            `;

            // --- Skills ---
            const userSkills = data.data?.SKILLS?.data || {};
            if (Object.keys(userSkills).length === 0) skillsList.appendChild(createLoadingIcon());
            else {
                const overallLine = document.createElement("p");
                overallLine.classList.add("skill-line");
                overallLine.appendChild(createImg({ src: "pictures/skills/crown.png", alt: "Crown", width: 20, height: 20 }));
                overallLine.innerHTML += `<strong class="mountGrid-text">Player:</strong> Level ${overallLevel}`;
                if (overallLevel >= 100) overallLine.appendChild(createImg({ src: "pictures/gg.svg", alt: "GG!", width: 24, height: 24, className: "pulse-img" }));
                skillsList.appendChild(overallLine);

                const levelIcon = document.createElement("span");
                if (overallLevel >= 100) levelIcon.textContent = " 👑", levelIcon.title = "Level 100";
                else if (overallLevel >= 61) levelIcon.textContent = " 🥇", levelIcon.title = "Level 61–99";
                else if (overallLevel >= 31) levelIcon.textContent = " 🥈", levelIcon.title = "Level 31–60";
                else levelIcon.textContent = " 🥉", levelIcon.title = "Level 0–30";
                levelIcon.classList.add("level-icon");
                skillsHeader.appendChild(levelIcon);

                Object.keys(userSkills).sort().forEach(skill => {
                    const xp = userSkills[skill];
                    const skillInfo = skillsData[skill.toLowerCase()];
                    let level = 0;
                    if (skillInfo?.experience_per_level?.length) {
                        let total = 0;
                        skillInfo.experience_per_level.forEach(cost => { total += cost; if (xp >= total) level++; });
                    }

                    const line = document.createElement("p");
                    line.classList.add("skill-line");
                    line.appendChild(createImg({ src: `pictures/skills/${skill.toLowerCase()}.png`, alt: skill, width: 20, height: 20 }));
                    const skillName = skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();
                    line.innerHTML += level >= 100
                        ? `<strong class="mountGrid-text">${skillName}:</strong> Level <span class="pulse">${level}</span>`
                        : `<strong class="mountGrid-text">${skillName}:</strong> Level ${level}`;
                    skillsList.appendChild(line);
                });
            }

            // --- Mount ---
            updateMountCard(data.data?.COMPANIONS?.active_mount);

           // --- Achievements ---
randomStats.innerHTML = "";
if (data.first_connection) {
    const firstConnDate = new Date(data.first_connection);
    const firstConnElem = document.createElement("p");
    firstConnElem.innerHTML = `<strong class="mountGrid-text">First Connection:</strong> <span style="color:white">${firstConnDate.toLocaleDateString()}</span>`;
    randomStats.appendChild(firstConnElem);
}

        } catch (error) {
            console.error(error);
        }
    };

    usernameInput.addEventListener("input", () => {
        const username = usernameInput.value.trim();
        updateUserStats(username);
        updateAvatars(username);
    });

    const initialUsername = usernameInput.value.trim();
    updateUserStats(initialUsername);
    updateAvatars(initialUsername);
});
document.querySelectorAll('.toggle').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const submenu = btn.nextElementSibling;
    submenu.classList.toggle('show');
    btn.querySelector('.arrow').classList.toggle('rotate');
  });
});