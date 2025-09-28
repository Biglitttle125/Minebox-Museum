document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const avatarImg = document.getElementById("avatar");
    const headerAvatar = document.getElementById("headerAvatar");
    const headerUsername = document.getElementById("headerUsername");
    const usernameInput = document.getElementById("usernameInput");
    const profileCard = document.getElementById("userStatsCard");
    const skillsCard = document.getElementById("skillsCard");
    const skillsList = document.getElementById("skillsList");

    // --- Special User Logo ---
    const logoImg = document.createElement("img");
    logoImg.src = "pictures/mineboxdev.png";
    logoImg.alt = "Special Logo";
    logoImg.title = "Minebox dev";
    logoImg.style.width = "32px";
    logoImg.style.height = "32px";
    logoImg.style.position = "absolute";
    logoImg.style.top = "8px";
    logoImg.style.right = "8px";
    logoImg.style.display = "none";
    logoImg.style.borderRadius = "50%";
    profileCard.style.position = "relative";
    profileCard.appendChild(logoImg);

    // --- Crown Overlay for Level 100 ---
    const crownImg = document.createElement("img");
    crownImg.src = "pictures/crown.png";
    crownImg.alt = "Crown";
    crownImg.style.position = "absolute";
    crownImg.style.pointerEvents = "none"; 
    crownImg.style.display = "none";
    avatarImg.parentElement.style.position = "relative";
    avatarImg.parentElement.appendChild(crownImg);

    // --- Add CSS animation for floating crown ---
    const style = document.createElement("style");
    style.textContent = `
        @keyframes floatCrown {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(2deg); }
            100% { transform: translateY(0px) rotate(0deg); }
        }
        .floating-crown {
            animation: floatCrown 2s ease-in-out infinite;
        }
        .skill-line {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .skill-line img {
            width: 20px;
            height: 20px;
            object-fit: contain;
        }
    `;
    document.head.appendChild(style);

    function positionCrown() {
        const crownWidth = avatarImg.clientWidth * 0.6;
        crownImg.style.width = `${crownWidth}px`;
        crownImg.style.left = `${avatarImg.offsetLeft + avatarImg.clientWidth / 2 - crownWidth / 2}px`;
        crownImg.style.top = `${avatarImg.offsetTop - crownWidth * 0.35}px`;
    }

    function updateCrown(level) {
        if (level >= 100) {
            crownImg.style.display = "block";
            crownImg.classList.add("floating-crown");
            positionCrown();
        } else {
            crownImg.style.display = "none";
            crownImg.classList.remove("floating-crown");
        }
    }

    window.addEventListener("resize", () => {
        if (crownImg.style.display !== "none") positionCrown();
    });

    // --- Fetch Skills Data ---
    let skillsData = {};
    fetch("https://cdn2.minebox.co/data/skills.json")
        .then(res => res.json())
        .then(data => { skillsData = data; })
        .catch(err => console.error("Failed to load skills.json", err));

    // --- Avatar Fallbacks ---
    let lastValidAvatarSrc = avatarImg.src;
    let lastValidHeaderSrc = headerAvatar.src;
    avatarImg.onerror = () => { avatarImg.src = lastValidAvatarSrc; };
    headerAvatar.onerror = () => { headerAvatar.src = lastValidHeaderSrc; };
    avatarImg.onload = () => { 
        lastValidAvatarSrc = avatarImg.src; 
        if (crownImg.style.display !== "none") positionCrown(); 
    };
    headerAvatar.onload = () => { lastValidHeaderSrc = headerAvatar.src; };

// --- Update Avatars & Header Username ---
function updateAvatars(username) {
    const name = username || "Guest";

    // Avatar images
    avatarImg.src = `https://vzge.me/full/500/${encodeURIComponent(name)}`;
    avatarImg.alt = `${name}'s Minecraft Skin`;

    headerAvatar.src = `https://vzge.me/head/51/${encodeURIComponent(name)}`;
    headerAvatar.alt = `${name}'s Head Skin`;

    // Header username
    if(headerUsername){
        headerUsername.textContent = name;
        headerUsername.title = name; // tooltip
    }
}


    // --- Update User Stats ---
    async function updateUserStats(username) {
        const name = username || "";
        if (!name) {
            skillsList.innerHTML = "";
            logoImg.style.display = "none";
            updateCrown(0);
            return;
        }

        const specialUsers = ["evlad", "qdpyy"];
        logoImg.style.display = specialUsers.includes(name.toLowerCase()) ? "block" : "none";
        document.getElementById("displayUsername").textContent = name;

        try {
            const response = await fetch(`https://api.minebox.co/data/${encodeURIComponent(name)}`);
            if (!response.ok) throw new Error("API request failed");
            const data = await response.json();

            const overallLevel = data.level ?? 0;
            updateCrown(overallLevel);

            // --- Playtime ---
            const playtimeSeconds = data.playtime || 0;
            const playtimeElement = document.getElementById("displayPlaytime");
            if (playtimeSeconds) {
                const days = Math.floor(playtimeSeconds / 86400);
                const hours = Math.floor((playtimeSeconds % 86400) / 3600);
                const minutes = Math.floor((playtimeSeconds % 3600) / 60);
                playtimeElement.textContent = `${days}d ${hours}h ${minutes}m`;
                playtimeElement.title = `Total hours: ${Math.floor(playtimeSeconds / 3600)}`;
            } else {
                playtimeElement.textContent = "⌚";
                playtimeElement.title = "";
            }

            // --- Donated Items ---
            const museumItems = data.data.OBJECTIVES.museum || [];
            document.getElementById("displayDonated").textContent =
                museumItems.length ? `${museumItems.length} items` : "🖼️";

            // --- Skills ---
            const userSkills = data.data.SKILLS.data || {};
            skillsList.innerHTML = "";

            // --- Overall Level with crown in front ---
if (overallLevel !== undefined) {
    const overallLine = document.createElement("p");
    overallLine.classList.add("skill-line");

    // Crown image in front
    const iconImg = document.createElement("img");
    iconImg.src = "pictures/skills/crown.png";
    iconImg.alt = "Crown";
    overallLine.appendChild(iconImg);

    // "Player:" matches skills style
    overallLine.innerHTML += `<strong>Player:</strong> Level ${overallLevel}`;

    // GG animation for level 100
    if (overallLevel >= 100) {
        const ggImg = document.createElement("img");
        ggImg.src = "pictures/gg.svg";
        ggImg.alt = "GG!";
        ggImg.classList.add("pulse-img");
        overallLine.appendChild(ggImg);
    }

    // Add line to skills list
    skillsList.appendChild(overallLine);

    // --- Header icon (🥇🥈🥉👑) ---
    const skillsHeader = skillsCard.querySelector("h3");
    const spanIcon = document.createElement("span");
    let icon = "", tooltip = "";

    if (overallLevel >= 100) { icon = "👑"; tooltip = "Level 100"; }
    else if (overallLevel >= 61) { icon = "🥇"; tooltip = "Level 61–99"; }
    else if (overallLevel >= 31) { icon = "🥈"; tooltip = "Level 31–60"; }
    else { icon = "🥉"; tooltip = "Level 0–30"; }

    spanIcon.textContent = ` ${icon}`;
    spanIcon.title = tooltip;
    spanIcon.classList.add("level-icon");

    // Remove old icon if it exists
    const existingIcon = skillsHeader.querySelector(".level-icon");
    if (existingIcon) existingIcon.remove();

    // Add new icon to header
    skillsHeader.appendChild(spanIcon);
}


            // --- Individual Skills ---
            Object.keys(userSkills).sort().forEach(skill => {
                const xp = userSkills[skill];
                const skillInfo = skillsData[skill.toLowerCase()];
                let level = 0;
                if (skillInfo && Array.isArray(skillInfo.experience_per_level)) {
                    let total = 0;
                    const thresholds = skillInfo.experience_per_level.map(cost => total += cost);
                    for (let i = 0; i < thresholds.length; i++) {
                        if (xp >= thresholds[i]) level = i + 1;
                        else break;
                    }
                }

                const line = document.createElement("p");
                line.classList.add("skill-line");

                const iconImg = document.createElement("img");
                iconImg.src = `pictures/skills/${skill.toLowerCase()}.png`;
                iconImg.alt = skill;
                line.appendChild(iconImg);

                const skillName = skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();
                line.innerHTML += level >= 100
                    ? `<strong>${skillName}:</strong> Level <span class="pulse"> ${level}</span>`
                    : `<strong>${skillName}:</strong> Level ${level}`;

                skillsList.appendChild(line);
            });

        } catch (error) {
            console.error(error);
            document.getElementById("displayPlaytime").textContent = "⌚";
            document.getElementById("displayDonated").textContent = "🖼️";
            skillsList.innerHTML = "<p>⌚</p>";
            updateCrown(0);
        }
    }

    // --- Input Event ---
    usernameInput.addEventListener("input", () => {
        const username = usernameInput.value.trim();
        updateUserStats(username);
        updateAvatars(username);
    });

    // --- Initial Load ---
    const initialUsername = usernameInput.value.trim();
    updateUserStats(initialUsername);
    updateAvatars(initialUsername);

    // --- Navigation Underline ---
    const nav = document.querySelector('nav ul');
    const underline = document.getElementById('navUnderline');
    const links = document.querySelectorAll('nav a');

    links.forEach(link => {
        link.addEventListener('mouseenter', e => {
            const rect = e.target.getBoundingClientRect();
            const navRect = nav.getBoundingClientRect();
            underline.style.width = rect.width + "px";
            underline.style.left = (rect.left - navRect.left) + "px";
        });
        link.addEventListener('mouseleave', () => underline.style.width = "0");
    });

    const currentPage = window.location.pathname.split("/").pop();
    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            const rect = link.getBoundingClientRect();
            const navRect = nav.getBoundingClientRect();
            underline.style.width = rect.width + "px";
            underline.style.left = (rect.left - navRect.left) + "px";
        }
    });
});
