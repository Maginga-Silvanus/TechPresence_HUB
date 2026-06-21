// Training Slots Management - User Side

// Sidebar Collapse Functionality
const collapseBtn = document.getElementById("collapseBtn");
const sidebar = document.querySelector(".sidebar");

if (collapseBtn) {
    const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (isCollapsed) {
        sidebar.classList.add("collapsed");
        collapseBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    }

    collapseBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        const collapsed = sidebar.classList.contains("collapsed");
        localStorage.setItem("sidebarCollapsed", collapsed);
        
        if (collapsed) {
            collapseBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        } else {
            collapseBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        }
    });
}

function getTrainingSlots() {
    return JSON.parse(localStorage.getItem("trainingSlots") || "[]");
}

function getUserSelections() {
    return JSON.parse(localStorage.getItem("userTrainingSelections") || "[]");
}

function saveUserSelections(selections) {
    localStorage.setItem("userTrainingSelections", JSON.stringify(selections));
    if (window.AppData) {
        window.AppData.saveCollection("userTrainingSelections", selections).catch(console.error);
    }
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function getApplications() {
    return JSON.parse(localStorage.getItem("applications") || "[]");
}

function getUserApplication(email) {
    return getApplications().find(app => app.email === email);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

let currentViewingSlotId = null;

function renderSlots(filterType = "all") {
    const slotsGrid = document.getElementById("slotsGrid");
    if (!slotsGrid) return;

    const slots = getTrainingSlots();
    const currentUser = getCurrentUser();
    const userSelections = getUserSelections();

    if (!currentUser) {
        slotsGrid.innerHTML = `
            <div class="empty-slots">
                <i class="fa-solid fa-lock"></i>
                <p>Please log in to view training slots</p>
            </div>
        `;
        return;
    }

    let filteredSlots = slots.filter(slot => {
        if (filterType === "available") return slot.status === "available";
        if (filterType === "pending") return userSelections.some(sel => sel.slotId === slot.id && sel.status === "pending");
        if (filterType === "approved") return userSelections.some(sel => sel.slotId === slot.id && sel.status === "approved");
        return true;
    });

    if (filteredSlots.length === 0) {
        slotsGrid.innerHTML = `
            <div class="empty-slots" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-inbox"></i>
                <p>No slots available</p>
            </div>
        `;
        return;
    }

    slotsGrid.innerHTML = filteredSlots.map(slot => {
        const userSelection = userSelections.find(sel => sel.slotId === slot.id && sel.userEmail === currentUser.email);
        const isSelected = !!userSelection;
        const statusBadge = userSelection?.status || "available";

        let badgeClass = "badge-available";
        if (statusBadge === "pending") badgeClass = "badge-pending";
        if (statusBadge === "approved") badgeClass = "badge-approved";
        if (statusBadge === "rejected") badgeClass = "badge-rejected";

        return `
            <div class="slot-card">
                <div class="slot-header">
                    <div class="slot-title">${escapeHtml(slot.title)}</div>
                    <span class="slot-badge ${badgeClass}">
                        ${userSelection ? userSelection.status.toUpperCase() : "AVAILABLE"}
                    </span>
                </div>

                <div class="slot-details">
                    <div class="detail-row">
                        <i class="fa-solid fa-user"></i>
                        <strong>Trainer:</strong> ${escapeHtml(slot.trainer)}
                    </div>
                    <div class="detail-row">
                        <i class="fa-solid fa-calendar"></i>
                        <strong>Date:</strong> ${escapeHtml(slot.date)}
                    </div>
                    <div class="detail-row">
                        <i class="fa-solid fa-clock"></i>
                        <strong>Time:</strong> ${escapeHtml(slot.time)}
                    </div>
                    <div class="detail-row">
                        <i class="fa-solid fa-hourglass-end"></i>
                        <strong>Duration:</strong> ${escapeHtml(slot.duration)}
                    </div>
                    <div class="detail-row">
                        <i class="fa-solid fa-map-pin"></i>
                        <strong>Location:</strong> ${escapeHtml(slot.location)}
                    </div>
                </div>

                <div class="slot-description">
                    ${escapeHtml(slot.description)}
                </div>

                <div class="slot-actions">
                    <button class="select-slot" data-id="${slot.id}" ${isSelected || slot.status !== "available" ? 'disabled' : ''}>
                        ${isSelected ? 'Already Selected' : 'Select Slot'}
                    </button>
                    <button class="view-details" data-id="${slot.id}" onclick="viewSlotDetails('${slot.id}')">
                        <i class="fa-solid fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    }).join("");

    // Add event listeners to select buttons
    document.querySelectorAll(".select-slot:not(:disabled)").forEach(btn => {
        btn.addEventListener("click", () => selectSlot(btn.dataset.id));
    });
}

function viewSlotDetails(slotId) {
    const slots = getTrainingSlots();
    const slot = slots.find(s => s.id === slotId);
    
    if (!slot) return;

    currentViewingSlotId = slotId;
    document.getElementById("modalTitle").textContent = escapeHtml(slot.title);
    
    const modalBody = document.getElementById("modalBody");
    modalBody.innerHTML = `
        <p><strong>Trainer:</strong> ${escapeHtml(slot.trainer)}</p>
        <p><strong>Date:</strong> ${escapeHtml(slot.date)}</p>
        <p><strong>Time:</strong> ${escapeHtml(slot.time)}</p>
        <p><strong>Duration:</strong> ${escapeHtml(slot.duration)}</p>
        <p><strong>Location:</strong> ${escapeHtml(slot.location)}</p>
        <p><strong>Category:</strong> ${escapeHtml(slot.category)}</p>
        <p><strong>Level:</strong> ${escapeHtml(slot.level)}</p>
        <hr>
        <p><strong>Description:</strong></p>
        <p>${escapeHtml(slot.description)}</p>
        ${slot.requirements ? `
            <hr>
            <p><strong>Prerequisites:</strong></p>
            <p>${escapeHtml(slot.requirements)}</p>
        ` : ''}
    `;

    document.getElementById("detailsModal").classList.add("active");
}

function closeModal() {
    document.getElementById("detailsModal").classList.remove("active");
    currentViewingSlotId = null;
}

function selectSlotFromModal() {
    if (currentViewingSlotId) {
        selectSlot(currentViewingSlotId);
        closeModal();
    }
}

function selectSlot(slotId) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        alert("Please log in to select training slots");
        return;
    }

    const application = getUserApplication(currentUser.email);
    if (!application) {
        alert("Please complete your application before selecting training slots");
        window.location.href = "apply.html";
        return;
    }

    if (application.status !== "approved") {
        alert("Your application must be approved before you can select training slots");
        return;
    }

    const slots = getTrainingSlots();
    const slot = slots.find(s => s.id === slotId);

    if (!slot) {
        alert("Slot not found");
        return;
    }

    if (slot.status !== "available") {
        alert("This slot is no longer available");
        renderSlots();
        return;
    }

    const userSelections = getUserSelections();
    
    // Check if user already selected this slot
    if (userSelections.some(sel => sel.slotId === slotId && sel.userEmail === currentUser.email)) {
        alert("You have already selected this slot");
        return;
    }

    // Add new selection
    const selection = {
        id: Date.now().toString(),
        slotId: slotId,
        userEmail: currentUser.email,
        userName: currentUser.name,
        status: "pending",
        selectedAt: new Date().toISOString(),
        adminResponse: null,
        adminMessage: ""
    };

    userSelections.push(selection);
    saveUserSelections(userSelections);

    alert(`You have selected "${slot.title}". Waiting for admin approval.`);
    
    updateTrainingNotice();
    renderSlots();
    renderUserStatus();
}

function updateTrainingNotice() {
    const notice = document.getElementById("trainingNotice");
    const userSelections = getUserSelections();
    
    if (userSelections.length === 0) {
        notice.textContent = "Select training slots to expand your skills and get certified.";
        return;
    }

    const pending = userSelections.filter(s => s.status === "pending").length;
    const approved = userSelections.filter(s => s.status === "approved").length;
    
    if (pending > 0) {
        notice.innerHTML = `<strong>✓ ${pending} slot(s) pending admin approval</strong> | ${approved} approved`;
    } else if (approved > 0) {
        notice.innerHTML = `<strong>✓ ${approved} training slot(s) approved!</strong>`;
    }
}

function renderUserStatus() {
    const statusSection = document.getElementById("statusSection");
    const statusList = document.getElementById("statusList");
    const userSelections = getUserSelections();
    const currentUser = getCurrentUser();
    const slots = getTrainingSlots();

    if (!currentUser) {
        statusSection.style.display = "none";
        return;
    }

    const userStatus = userSelections.filter(sel => sel.userEmail === currentUser.email);

    if (userStatus.length === 0) {
        statusSection.style.display = "none";
        return;
    }

    statusSection.style.display = "block";

    statusList.innerHTML = userStatus.map(selection => {
        const slot = slots.find(s => s.id === selection.slotId);
        const statusClass = selection.status === "rejected" ? "rejected" : 
                           selection.status === "approved" ? "approved" : "";

        return `
            <div class="status-item ${statusClass}">
                <div class="status-item-title">
                    ${slot ? escapeHtml(slot.title) : "Unknown Slot"}
                    <span style="float: right; font-size: 12px; color: #999;">
                        ${selection.selectedAt}
                    </span>
                </div>
                <div style="margin-top: 8px;">
                    <strong>Status:</strong> 
                    <span style="text-transform: uppercase; font-weight: 600;">
                        ${selection.status}
                    </span>
                </div>
                ${selection.adminMessage ? `
                    <div class="status-item-message">
                        <strong>Admin Message:</strong><br>
                        ${escapeHtml(selection.adminMessage)}
                    </div>
                ` : ''}
                ${selection.status === "approved" && slot ? `
                    <div style="margin-top: 12px; padding: 10px; background: #e8f5e9; border-radius: 3px; font-size: 13px;">
                        <i class="fa-solid fa-check-circle" style="color: #4caf50; margin-right: 6px;"></i>
                        Training on ${escapeHtml(slot.date)} at ${escapeHtml(slot.time)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join("");
}

// Filter functionality
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        renderSlots(e.target.dataset.filter);
    });
});

// Close modal on outside click
document.getElementById("detailsModal").addEventListener("click", (e) => {
    if (e.target.id === "detailsModal") {
        closeModal();
    }
});

// Initial render
renderSlots();
renderUserStatus();
updateTrainingNotice();

// Refresh status periodically (check for admin updates)
setInterval(() => {
    renderUserStatus();
    updateTrainingNotice();
}, 5000);

window.addEventListener("appdata:changed", (event) => {
    if (event.detail.collection !== "trainingSlots" && event.detail.collection !== "userTrainingSelections") return;
    renderSlots();
    renderUserStatus();
    updateTrainingNotice();
});
