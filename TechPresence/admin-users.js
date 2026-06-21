// Admin Users Management

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

function getUsers() {
    return JSON.parse(localStorage.getItem("users") || "[]");
}

function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
    if (window.AppData) {
        window.AppData.saveCollection("users", users).catch(console.error);
    }
}

function escapeHtml(text) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function getInitials(name) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

let activationChart = null;
let paymentChart = null;

function renderCharts() {
    const users = getUsers();
    
    // Calculate statistics
    const activatedUsers = users.filter(u => u.activated).length;
    const inactivatedUsers = users.length - activatedUsers;
    const paidUsers = users.filter(u => u.activationPaid).length;
    const notPaidUsers = users.length - paidUsers;

    // Update stat boxes
    document.getElementById("activatedCount").textContent = activatedUsers;
    document.getElementById("inactivatedCount").textContent = inactivatedUsers;
    document.getElementById("paidCount").textContent = paidUsers;
    document.getElementById("notPaidCount").textContent = notPaidUsers;

    // Destroy existing charts if they exist
    if (activationChart) activationChart.destroy();
    if (paymentChart) paymentChart.destroy();

    // Get canvas contexts
    const activationCtx = document.getElementById("activationChart");
    const paymentCtx = document.getElementById("paymentChart");

    if (activationCtx) {
        activationChart = new Chart(activationCtx, {
            type: 'doughnut',
            data: {
                labels: ['Activated', 'Not Activated'],
                datasets: [{
                    data: [activatedUsers, inactivatedUsers],
                    backgroundColor: [
                        '#10b981',
                        '#ef4444'
                    ],
                    borderColor: [
                        '#059669',
                        '#dc2626'
                    ],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 13,
                                weight: 600
                            },
                            padding: 15,
                            color: '#6b7280'
                        }
                    }
                }
            }
        });
    }

    if (paymentCtx) {
        paymentChart = new Chart(paymentCtx, {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Not Paid'],
                datasets: [{
                    data: [paidUsers, notPaidUsers],
                    backgroundColor: [
                        '#3b82f6',
                        '#f97316'
                    ],
                    borderColor: [
                        '#1d4ed8',
                        '#ea580c'
                    ],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 13,
                                weight: 600
                            },
                            padding: 15,
                            color: '#6b7280'
                        }
                    }
                }
            }
        });
    }
}

function renderUsers(users = null) {
    const tbody = document.getElementById("usersTableBody");
    const userList = users || getUsers();

    if (userList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No users found</h3>
                    <p>No registered users yet</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = userList.map(user => {
        const initials = getInitials(user.name || "User");
        const activationStatus = user.activated ? "Activated" : "Not Activated";
        const paymentStatus = user.activationPaid ? "Paid" : "Not Paid";
        const activationBadgeClass = user.activated ? "status-active" : "status-inactive";
        const paymentBadgeClass = user.activationPaid ? "status-paid" : "status-unpaid";

        return `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-details">
                            <div class="user-name">${escapeHtml(user.name || "Unknown")}</div>
                            <div class="user-email">${escapeHtml(user.email)}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${activationBadgeClass}">${activationStatus}</span>
                </td>
                <td>
                    <span class="status-badge ${paymentBadgeClass}">${paymentStatus}</span>
                </td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <button class="action-btn activate-btn ${user.activated ? "activated" : ""}" data-email="${escapeHtml(user.email)}" ${user.activated ? "disabled" : ""}>
                        ${user.activated ? "✓ Activated" : "Activate"}
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function filterUsers() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    const statusFilter = document.getElementById("statusFilter").value;
    const paymentFilter = document.getElementById("paymentFilter").value;

    const users = getUsers();

    let filtered = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm) || 
                             user.email.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || 
                             (statusFilter === "active" && user.activated) ||
                             (statusFilter === "inactive" && !user.activated);
        
        const matchesPayment = !paymentFilter ||
                              (paymentFilter === "paid" && user.activationPaid) ||
                              (paymentFilter === "unpaid" && !user.activationPaid);

        return matchesSearch && matchesStatus && matchesPayment;
    });

    renderUsers(filtered);
}

// Search functionality
document.getElementById("searchInput").addEventListener("input", filterUsers);

// Status filter
document.getElementById("statusFilter").addEventListener("change", filterUsers);

// Payment filter
document.getElementById("paymentFilter").addEventListener("change", filterUsers);

// Activate user
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".activate-btn");
    if (!btn) return;

    const email = btn.dataset.email;
    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) return;

    user.activated = true;
    saveUsers(users);
    if (window.syncFirebaseUser) {
        window.syncFirebaseUser(user).catch(console.error);
    }
    renderCharts();
    renderUsers();
});

// Logout functionality
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    renderCharts();
    renderUsers();
});

window.addEventListener("appdata:changed", (event) => {
    if (event.detail.collection !== "users") return;
    renderCharts();
    renderUsers();
});
