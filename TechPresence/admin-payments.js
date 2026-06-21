// Admin Payment Management

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

function getPaymentMethods() {
    return JSON.parse(localStorage.getItem("paymentMethods") || "[]");
}

function getUsers() {
    return JSON.parse(localStorage.getItem("users") || "[]");
}

function savePaymentMethods(payments) {
    localStorage.setItem("paymentMethods", JSON.stringify(payments));
    if (window.AppData) {
        window.AppData.saveCollection("paymentMethods", payments).catch(console.error);
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

let currentViewingPaymentId = null;
let allPayments = [];

// Get user info by email
function getUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email === email);
}

// Get initials for avatar
function getInitials(name) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
}

// Render payments table
function renderPayments(payments = null) {
    const table = document.getElementById("paymentsTable");
    const paymentMethods = payments || getPaymentMethods();

    if (paymentMethods.length === 0) {
        table.innerHTML = `
            <thead>
                <tr>
                    <th>User</th>
                    <th>Bank</th>
                    <th>Card (Last 4)</th>
                    <th>Account</th>
                    <th>Date Added</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i><p>No payment methods found</p></td></tr>
            </tbody>
        `;
        return;
    }

    const tableHTML = `
        <thead>
            <tr>
                <th>User</th>
                <th>Bank</th>
                <th>Card (Last 4)</th>
                <th>Account</th>
                <th>Date Added</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${paymentMethods.map(payment => {
                const initials = getInitials(payment.fullName);
                const lastFour = payment.cardLast4 || (payment.cardNumber || "").slice(-4);
                const accountMasked = payment.accountMasked || (payment.accountNumber || "").slice(-4).padStart((payment.accountNumber || "").length, '*');

                return `
                    <tr>
                        <td>
                            <div class="user-info">
                                <div class="user-avatar">${initials}</div>
                                <div>
                                    <strong>${escapeHtml(payment.fullName)}</strong><br>
                                    <small style="color: #6b7280;">${escapeHtml(payment.userEmail)}</small>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="bank-badge">${escapeHtml(payment.bankName)}</span>
                        </td>
                        <td>
                            <span class="card-number-masked">•••• •••• •••• ${lastFour}</span>
                        </td>
                        <td>
                            <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">**${accountMasked}</code>
                        </td>
                        <td>
                            <small>${escapeHtml(payment.createdAt)}</small>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="view-btn" onclick="viewPaymentDetails('${payment.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="delete-btn" onclick="deletePayment('${payment.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("")}
        </tbody>
    `;

    table.innerHTML = tableHTML;
}

// Update statistics
function updateStats() {
    const paymentMethods = getPaymentMethods();
    const uniqueUsers = new Set(paymentMethods.map(p => p.userEmail)).size;

    // Total methods
    document.getElementById("totalMethods").textContent = paymentMethods.length;

    // Total users
    document.getElementById("totalUsers").textContent = uniqueUsers;

    // Most used bank
    if (paymentMethods.length > 0) {
        const bankCounts = {};
        paymentMethods.forEach(p => {
            bankCounts[p.bankName] = (bankCounts[p.bankName] || 0) + 1;
        });
        const topBank = Object.keys(bankCounts).reduce((a, b) => 
            bankCounts[a] > bankCounts[b] ? a : b
        );
        document.getElementById("topBank").textContent = topBank;
    }

    // This month
    const now = new Date();
    const thisMonth = paymentMethods.filter(p => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate.getMonth() === now.getMonth() && 
               paymentDate.getFullYear() === now.getFullYear();
    }).length;
    document.getElementById("thisMonth").textContent = thisMonth;

    // Populate bank filter
    const bankFilter = document.getElementById("bankFilter");
    const banks = [...new Set(paymentMethods.map(p => p.bankName))].sort();
    const currentValue = bankFilter.value;
    bankFilter.innerHTML = '<option value="">All Banks</option>' + 
        banks.map(bank => `<option value="${escapeHtml(bank)}">${escapeHtml(bank)}</option>`).join("");
    bankFilter.value = currentValue;
}

// View payment details
function viewPaymentDetails(paymentId) {
    const payments = getPaymentMethods();
    const payment = payments.find(p => p.id === paymentId);

    if (!payment) return;

    currentViewingPaymentId = paymentId;

    // Populate modal
    document.getElementById("cardHolderDisplay").textContent = escapeHtml(payment.fullName);
    document.getElementById("cardNumberDisplay").textContent = payment.cardNumberMasked;
    document.getElementById("expiryDisplay").textContent = escapeHtml(payment.expiry);
    document.getElementById("bankDisplay").textContent = escapeHtml(payment.bankName).toUpperCase();

    document.getElementById("detailName").textContent = escapeHtml(payment.fullName);
    document.getElementById("detailBank").textContent = escapeHtml(payment.bankName);
    document.getElementById("detailCardNumber").textContent = payment.cardNumber || payment.cardNumberMasked || `•••• •••• •••• ${payment.cardLast4 || ""}`;
    document.getElementById("detailAccountNumber").textContent = payment.accountNumber || payment.accountMasked || "••••••••";
    document.getElementById("detailExpiry").textContent = escapeHtml(payment.expiry);
    document.getElementById("detailDate").textContent = escapeHtml(payment.createdAt);
    document.getElementById("detailEmail").textContent = escapeHtml(payment.userEmail);

    document.getElementById("detailsModal").classList.add("active");
}

function closeDetailsModal() {
    document.getElementById("detailsModal").classList.remove("active");
    currentViewingPaymentId = null;
}

function deletePayment(paymentId) {
    if (confirm("Are you sure you want to delete this payment method?")) {
        let payments = getPaymentMethods();
        payments = payments.filter(p => p.id !== paymentId);
        savePaymentMethods(payments);
        if (window.AppData) {
            window.AppData.deleteItem("paymentMethods", paymentId).catch(console.error);
        }
        
        renderPayments();
        updateStats();
        
        if (currentViewingPaymentId === paymentId) {
            closeDetailsModal();
        }
        
        alert("Payment method deleted successfully");
    }
}

// Search functionality
document.getElementById("searchInput").addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const bankFilter = document.getElementById("bankFilter").value;
    
    const payments = getPaymentMethods().filter(p => {
        const matchesSearch = p.fullName.toLowerCase().includes(searchTerm) || 
                             p.userEmail.toLowerCase().includes(searchTerm);
        const matchesBank = !bankFilter || p.bankName === bankFilter;
        return matchesSearch && matchesBank;
    });
    
    renderPayments(payments);
});

// Bank filter functionality
document.getElementById("bankFilter").addEventListener("change", (e) => {
    const bankFilter = e.target.value;
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    
    const payments = getPaymentMethods().filter(p => {
        const matchesBank = !bankFilter || p.bankName === bankFilter;
        const matchesSearch = p.fullName.toLowerCase().includes(searchTerm) || 
                             p.userEmail.toLowerCase().includes(searchTerm);
        return matchesSearch && matchesBank;
    });
    
    renderPayments(payments);
});

// Delete from modal
document.getElementById("deleteConfirmBtn").addEventListener("click", () => {
    if (currentViewingPaymentId) {
        deletePayment(currentViewingPaymentId);
    }
});

// Close modal on outside click
document.getElementById("detailsModal").addEventListener("click", (e) => {
    if (e.target.id === "detailsModal") {
        closeDetailsModal();
    }
});

// Initial render
renderPayments();
updateStats();

window.addEventListener("appdata:changed", (event) => {
    if (event.detail.collection !== "paymentMethods" && event.detail.collection !== "users") return;
    renderPayments();
    updateStats();
});
