// Referral Management System

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

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
}

// Get referral data for current user
function getReferralData() {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;

    const referralData = JSON.parse(localStorage.getItem("referralData") || "{}");
    if (!referralData[currentUser.email]) {
        referralData[currentUser.email] = {
            referralCode: generateReferralCode(currentUser),
            referrals: [],
            totalEarnings: 0
        };
        localStorage.setItem("referralData", JSON.stringify(referralData));
    }
    return referralData[currentUser.email];
}

// Generate unique referral code based on user
function generateReferralCode(user) {
    const name = user.name || user.email;
    const firstLetters = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 3);
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return firstLetters + randomChars;
}

// Initialize referral data on page load
function initializeReferralData() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    // Set sidebar name
    document.getElementById("sidebarName").textContent = currentUser.name || "User";

    const referralData = getReferralData();
    
    // Display referral code
    document.getElementById("referralCode").textContent = referralData.referralCode;

    // Update stats
    updateStats(referralData);

    // Render referrals table
    renderReferrals(referralData.referrals);
}

// Update statistics
function updateStats(referralData) {
    const totalReferrals = referralData.referrals.length;
    const activeReferrals = referralData.referrals.filter(r => r.status === "active").length;
    const totalEarnings = referralData.referrals.reduce((sum, r) => sum + (r.earnings || 0), 0);

    document.getElementById("totalReferrals").textContent = totalReferrals;
    document.getElementById("activeReferrals").textContent = activeReferrals;
    document.getElementById("totalEarned").textContent = "$" + totalEarnings.toFixed(2);
}

// Escape HTML
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

// Get initials from name
function getInitials(name) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Render referrals table
function renderReferrals(referrals, filter = "all") {
    const tbody = document.getElementById("referralsTableBody");
    
    let filteredReferrals = referrals;
    if (filter !== "all") {
        filteredReferrals = referrals.filter(r => r.status === filter);
    }

    if (filteredReferrals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <h3>No referrals ${filter !== "all" ? `with status "${filter}"` : "yet"}</h3>
                    <p>Start sharing your referral code to earn money</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredReferrals.map(referral => {
        const initials = getInitials(referral.name);
        const statusBadgeClass = {
            "pending": "status-pending",
            "active": "status-active",
            "converted": "status-converted"
        }[referral.status] || "status-pending";

        const statusLabel = {
            "pending": "Pending",
            "active": "Active",
            "converted": "Converted"
        }[referral.status] || referral.status;

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <div class="user-name">${escapeHtml(referral.name)}</div>
                            <div class="user-email">${escapeHtml(referral.email)}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
                </td>
                <td>${formatDate(referral.dateReferred)}</td>
                <td>
                    <div class="earnings-cell">$${referral.earnings.toFixed(2)}</div>
                </td>
            </tr>
        `;
    }).join("");
}

// Filter referrals
function filterReferrals(filter) {
    // Update active filter button
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    event.target.classList.add("active");

    const referralData = getReferralData();
    renderReferrals(referralData.referrals, filter);
}

// Copy code to clipboard
function copyCode() {
    const referralData = getReferralData();
    const code = referralData.referralCode;

    navigator.clipboard.writeText(code).then(() => {
        showToast("Referral code copied to clipboard!");
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showToast("Referral code copied to clipboard!");
    });
}

// Copy share link
function copyShareLink() {
    const referralData = getReferralData();
    const code = referralData.referralCode;
    const shareLink = `${window.location.origin}/register.html?ref=${code}`;

    navigator.clipboard.writeText(shareLink).then(() => {
        showToast("Share link copied to clipboard!");
    }).catch(() => {
        const textarea = document.createElement("textarea");
        textarea.value = shareLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showToast("Share link copied to clipboard!");
    });
}

// Share via WhatsApp
function shareViaWhatsApp() {
    const referralData = getReferralData();
    const code = referralData.referralCode;
    const message = `Hey! 🎉 Join Tech Presence using my referral code: ${code}\n\nYou'll get 5% off and I'll earn a commission. Win-win! 💰\n\n${window.location.origin}`;
    
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    
    window.open(whatsappUrl, "_blank");
}

// Share code (generic)
function shareCode() {
    if (navigator.share) {
        const referralData = getReferralData();
        navigator.share({
            title: "Join Tech Presence",
            text: `Use my referral code: ${referralData.referralCode} and get 5% off!`,
            url: window.location.href
        }).catch(err => console.log("Error sharing:", err));
    } else {
        copyCode();
    }
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Test function to add sample referrals (for demo)
function addSampleReferral() {
    const referralData = getReferralData();
    
    const sampleReferral = {
        id: Date.now(),
        name: "Sample User",
        email: "sample@example.com",
        status: Math.random() > 0.3 ? "active" : "pending",
        dateReferred: new Date().toISOString(),
        earnings: Math.random() * 100
    };

    referralData.referrals.push(sampleReferral);
    referralData.totalEarnings += sampleReferral.earnings;

    const currentUser = getCurrentUser();
    const referralDataStorage = JSON.parse(localStorage.getItem("referralData") || "{}");
    referralDataStorage[currentUser.email] = referralData;
    localStorage.setItem("referralData", JSON.stringify(referralDataStorage));

    updateStats(referralData);
    renderReferrals(referralData.referrals);
}

// Logout functionality
document.querySelector("[data-logout]").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", initializeReferralData);
