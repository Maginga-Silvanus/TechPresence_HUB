// Admin Training Management

// Sidebar Collapse Functionality
const collapseBtn = document.getElementById("collapseBtn");
const sidebar = document.querySelector(".sidebar");

if (collapseBtn) {
    const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (isCollapsed) {
        sidebar.classList.add("collapsed");
        collapseBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    }

    collapseBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        const collapsed = sidebar.classList.contains("collapsed");
        localStorage.setItem("sidebarCollapsed", collapsed);
        
        if (collapsed) {
            collapseBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        } else {
            collapseBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        }
    });
}

function getTrainingSlots() {
    return JSON.parse(localStorage.getItem("trainingSlots") || "[]");
}

function saveTrainingSlots(slots) {
    localStorage.setItem("trainingSlots", JSON.stringify(slots));
    if (window.AppData) {
        window.AppData.saveCollection("trainingSlots", slots).catch(console.error);
    }
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

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

let currentActionRequestId = null;
let currentActionType = null;

// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const tabName = btn.dataset.tab;
        
        // Remove active from all tabs and content
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        
        // Add active to clicked tab and corresponding content
        btn.classList.add("active");
        document.getElementById(tabName + "-tab").classList.add("active");

        if (tabName === "manage-slots") {
            renderSlots();
        } else if (tabName === "user-requests") {
            renderUserRequests();
        }
    });
});

// Create Slot Form Handler
document.getElementById("slotForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const slots = getTrainingSlots();
    
    const newSlot = {
        id: Date.now().toString(),
        title: document.getElementById("slotTitle").value,
        description: document.getElementById("slotDescription").value,
        trainer: document.getElementById("slotTrainer").value,
        category: document.getElementById("slotCategory").value,
        level: document.getElementById("slotLevel").value,
        date: document.getElementById("slotDate").value,
        time: document.getElementById("slotTime").value,
        duration: document.getElementById("slotDuration").value,
        location: document.getElementById("slotLocation").value,
        requirements: document.getElementById("slotRequirements").value,
        status: "available",
        createdAt: new Date().toISOString()
    };

    slots.push(newSlot);
    saveTrainingSlots(slots);

    // Show success message
    const successMsg = document.getElementById("successMessage");
    successMsg.classList.add("show");
    setTimeout(() => successMsg.classList.remove("show"), 3000);

    // Reset form
    document.getElementById("slotForm").reset();
});

function renderSlots() {
    const slotsTable = document.getElementById("slotsTable");
    const slots = getTrainingSlots();

    if (slots.length === 0) {
        slotsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Trainer</th>
                    <th>Date & Time</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="6" class="empty-message">No slots created yet</td></tr>
            </tbody>
        `;
        return;
    }

    const tableHTML = `
        <thead>
            <tr>
                <th>Title</th>
                <th>Trainer</th>
                <th>Date & Time</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${slots.map(slot => `
                <tr>
                    <td><strong>${escapeHtml(slot.title)}</strong></td>
                    <td>${escapeHtml(slot.trainer)}</td>
                    <td>${escapeHtml(slot.date)} at ${escapeHtml(slot.time)}</td>
                    <td>${escapeHtml(slot.category)}</td>
                    <td><span class="status-badge badge-available">${slot.status.toUpperCase()}</span></td>
                    <td>
                        <button class="action-btn edit-btn" onclick="editSlot('${slot.id}')">Edit</button>
                        <button class="action-btn delete-btn" onclick="deleteSlot('${slot.id}')">Delete</button>
                    </td>
                </tr>
            `).join("")}
        </tbody>
    `;

    slotsTable.innerHTML = tableHTML;
}

function editSlot(slotId) {
    alert("Edit functionality coming soon");
}

function deleteSlot(slotId) {
    if (confirm("Are you sure you want to delete this training slot?")) {
        let slots = getTrainingSlots();
        slots = slots.filter(s => s.id !== slotId);
        saveTrainingSlots(slots);
        renderSlots();
        alert("Slot deleted successfully");
    }
}

function renderUserRequests() {
    const requestsTable = document.getElementById("requestsTable");
    const selections = getUserSelections();
    const slots = getTrainingSlots();

    if (selections.length === 0) {
        requestsTable.innerHTML = `
            <thead>
                <tr>
                    <th>User Name</th>
                    <th>Training Slot</th>
                    <th>Requested On</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="5" class="empty-message">No requests yet</td></tr>
            </tbody>
        `;
        return;
    }

    const tableHTML = `
        <thead>
            <tr>
                <th>User Name</th>
                <th>Training Slot</th>
                <th>Requested On</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${selections.map(selection => {
                const slot = slots.find(s => s.id === selection.slotId);
                const statusClass = selection.status === "pending" ? "status-pending" :
                                   selection.status === "approved" ? "status-approved" : "status-rejected";
                
                return `
                    <tr>
                        <td>${escapeHtml(selection.userName)}</td>
                        <td>${slot ? escapeHtml(slot.title) : "Deleted Slot"}</td>
                        <td>${escapeHtml(selection.selectedAt)}</td>
                        <td><span class="request-status ${statusClass}">${selection.status.toUpperCase()}</span></td>
                        <td>
                            <div class="request-actions">
                                ${selection.status === "pending" ? `
                                    <button class="approve-btn" onclick="openActionModal('${selection.id}', 'approve')">Approve</button>
                                    <button class="reject-btn" onclick="openActionModal('${selection.id}', 'reject')">Reject</button>
                                    <button class="reschedule-btn" onclick="openRescheduleModal('${selection.id}')">Reschedule</button>
                                ` : `
                                    ${selection.status === "approved" ? 
                                        `<button class="reschedule-btn" onclick="openRescheduleModal('${selection.id}')">Reschedule</button>` : 
                                        ""}
                                    <button class="delete-btn" onclick="deleteRequest('${selection.id}')" style="width: auto;">Remove</button>
                                `}
                            </div>
                        </td>
                    </tr>
                `;
            }).join("")}
        </tbody>
    `;

    requestsTable.innerHTML = tableHTML;
}

function openActionModal(requestId, actionType) {
    currentActionRequestId = requestId;
    currentActionType = actionType;
    
    const title = actionType === "approve" ? "Approve Request" : "Reject Request";
    document.getElementById("actionModalTitle").textContent = title;
    document.getElementById("actionMessage").value = "";
    document.getElementById("actionModal").classList.add("active");
}

function closeActionModal() {
    document.getElementById("actionModal").classList.remove("active");
    currentActionRequestId = null;
    currentActionType = null;
}

function confirmAction() {
    if (!currentActionRequestId || !currentActionType) return;

    const selections = getUserSelections();
    const message = document.getElementById("actionMessage").value;
    
    const selection = selections.find(s => s.id === currentActionRequestId);
    if (!selection) return;

    selection.status = currentActionType === "approve" ? "approved" : "rejected";
    selection.adminMessage = message;
    selection.adminResponse = new Date().toLocaleString();

    saveUserSelections(selections);
    
    const action = currentActionType === "approve" ? "approved" : "rejected";
    alert(`Request has been ${action}!`);
    
    closeActionModal();
    renderUserRequests();
}

function openRescheduleModal(requestId) {
    currentActionRequestId = requestId;
    document.getElementById("newDate").value = "";
    document.getElementById("newTime").value = "";
    document.getElementById("rescheduleMessage").value = "";
    document.getElementById("rescheduleModal").classList.add("active");
}

function closeRescheduleModal() {
    document.getElementById("rescheduleModal").classList.remove("active");
    currentActionRequestId = null;
}

function confirmReschedule() {
    if (!currentActionRequestId) return;

    const newDate = document.getElementById("newDate").value;
    const newTime = document.getElementById("newTime").value;
    const message = document.getElementById("rescheduleMessage").value;

    if (!newDate || !newTime) {
        alert("Please provide both date and time");
        return;
    }

    const selections = getUserSelections();
    const selection = selections.find(s => s.id === currentActionRequestId);
    
    if (!selection) return;

    // Store reschedule info in the selection
    selection.rescheduledDate = newDate;
    selection.rescheduledTime = newTime;
    selection.rescheduleMessage = message || "Your training has been rescheduled";
    selection.rescheduleStatus = "pending";
    
    saveUserSelections(selections);
    
    alert("User has been notified of the reschedule!");
    closeRescheduleModal();
    renderUserRequests();
}

function deleteRequest(requestId) {
    if (confirm("Are you sure you want to remove this request?")) {
        let selections = getUserSelections();
        selections = selections.filter(s => s.id !== requestId);
        saveUserSelections(selections);
        renderUserRequests();
        alert("Request removed");
    }
}

// Close modals on outside click
document.getElementById("actionModal").addEventListener("click", (e) => {
    if (e.target.id === "actionModal") {
        closeActionModal();
    }
});

document.getElementById("rescheduleModal").addEventListener("click", (e) => {
    if (e.target.id === "rescheduleModal") {
        closeRescheduleModal();
    }
});

// Initial render
renderSlots();
renderUserRequests();

window.addEventListener("appdata:changed", (event) => {
    if (event.detail.collection === "trainingSlots") renderSlots();
    if (event.detail.collection === "userTrainingSelections") renderUserRequests();
});
