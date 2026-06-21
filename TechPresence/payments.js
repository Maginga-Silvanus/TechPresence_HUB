// Payment Management - Bank Details

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

function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function getPaymentMethods() {
    return JSON.parse(localStorage.getItem("paymentMethods") || "[]");
}

function savePaymentMethods(methods) {
    localStorage.setItem("paymentMethods", JSON.stringify(methods));
    if (window.AppData) {
        window.AppData.saveCollection("paymentMethods", methods).catch(console.error);
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

let selectedBank = null;

// Bank Selection
document.querySelectorAll(".bank-option").forEach(option => {
    option.addEventListener("click", () => {
        document.querySelectorAll(".bank-option").forEach(o => o.classList.remove("selected"));
        option.classList.add("selected");
        selectedBank = option.dataset.bank;
        document.getElementById("bankName").value = selectedBank;
        document.getElementById("previewBank").textContent = selectedBank.toUpperCase().substring(0, 4);
    });
});

// Card Number Formatting
document.getElementById("cardNumber").addEventListener("input", (e) => {
    let value = e.target.value.replace(/\s/g, "");
    let formattedValue = value.match(/.{1,4}/g)?.join(" ") || value;
    e.target.value = formattedValue;

    // Update preview
    const lastFour = value.slice(-4);
    const masked = lastFour ? "•••• •••• •••• " + lastFour : "•••• •••• •••• ••••";
    document.getElementById("previewCardNumber").textContent = masked;
});

// Full Name Update
document.getElementById("fullName").addEventListener("input", (e) => {
    document.getElementById("previewName").textContent = e.target.value || "YOUR NAME";
});

// Expiry Date Formatting
document.getElementById("expiry").addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 2) {
        value = value.substring(0, 2) + "/" + value.substring(2, 4);
    }
    e.target.value = value;
    document.getElementById("previewExpiry").textContent = e.target.value || "MM/YY";
});

// CVV Input (numbers only)
document.getElementById("cvv").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
});

// Account Number (numbers only)
document.getElementById("accountNumber").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
});

// Form Validation
function validateForm() {
    const fullName = document.getElementById("fullName").value.trim();
    const cardNumber = document.getElementById("cardNumber").value.replace(/\s/g, "");
    const accountNumber = document.getElementById("accountNumber").value.trim();
    const cvv = document.getElementById("cvv").value.trim();
    const expiry = document.getElementById("expiry").value.trim();
    const bankName = document.getElementById("bankName").value.trim();

    let isValid = true;

    // Clear all errors
    document.querySelectorAll(".error-message").forEach(el => {
        el.classList.remove("show");
        el.textContent = "";
    });

    // Validate Full Name
    if (!fullName) {
        showError("fullNameError", "Full name is required");
        isValid = false;
    } else if (fullName.length < 3) {
        showError("fullNameError", "Full name must be at least 3 characters");
        isValid = false;
    }

    // Validate Bank
    if (!bankName) {
        showError("bankError", "Please select a bank");
        isValid = false;
    }

    // Validate Card Number
    if (!cardNumber) {
        showError("cardNumberError", "Card number is required");
        isValid = false;
    } else if (cardNumber.length !== 16) {
        showError("cardNumberError", "Card number must be 16 digits");
        isValid = false;
    } else if (!luhnCheck(cardNumber)) {
        showError("cardNumberError", "Invalid card number (failed validation)");
        isValid = false;
    }

    // Validate Account Number
    if (!accountNumber) {
        showError("accountNumberError", "Account number is required");
        isValid = false;
    } else if (accountNumber.length < 8 || accountNumber.length > 17) {
        showError("accountNumberError", "Account number must be between 8 and 17 digits");
        isValid = false;
    }

    // Validate CVV
    if (!cvv) {
        showError("cvvError", "CVV is required");
        isValid = false;
    } else if (!/^\d{3,4}$/.test(cvv)) {
        showError("cvvError", "CVV must be 3 or 4 digits");
        isValid = false;
    }

    // Validate Expiry
    if (!expiry) {
        showError("expiryError", "Expiry date is required");
        isValid = false;
    } else if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        showError("expiryError", "Expiry date must be in MM/YY format");
        isValid = false;
    } else {
        const [month, year] = expiry.split("/");
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;

        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        if (monthNum < 1 || monthNum > 12) {
            showError("expiryError", "Invalid month (01-12)");
            isValid = false;
        } else if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
            showError("expiryError", "Card has expired");
            isValid = false;
        }
    }

    return isValid;
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add("show");
    }
}

// Luhn Algorithm for card validation
function luhnCheck(num) {
    let sum = 0;
    let isEven = false;

    for (let i = num.length - 1; i >= 0; i--) {
        let digit = parseInt(num.charAt(i), 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

// Form Submission
document.getElementById("paymentForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert("Please log in first");
        window.location.href = "login.html";
        return;
    }

    const cardNumber = document.getElementById("cardNumber").value.replace(/\s/g, "");
    const accountNumber = document.getElementById("accountNumber").value;
    const paymentMethod = {
        id: Date.now().toString(),
        userEmail: currentUser.email,
        fullName: document.getElementById("fullName").value,
        cardNumber,
        cardLast4: cardNumber.slice(-4),
        cardNumberMasked: "•••• •••• •••• " + cardNumber.slice(-4),
        accountNumber,
        accountLast4: accountNumber.slice(-4),
        accountMasked: accountNumber.slice(-4).padStart(accountNumber.length, "*"),
        expiry: document.getElementById("expiry").value,
        bankName: document.getElementById("bankName").value,
        createdAt: new Date().toISOString(),
        isDefault: false
    };

    const methods = getPaymentMethods();
    methods.push(paymentMethod);
    try {
        savePaymentMethods(methods);
        if (window.AppData) {
            await window.AppData.upsertItem("paymentMethods", paymentMethod);
        }
    } catch (error) {
        alert("Unable to save bank details online. Please try again.");
        return;
    }

    // Show success message
    const successMsg = document.getElementById("successMessage");
    successMsg.classList.add("show");
    setTimeout(() => {
        successMsg.classList.remove("show");
    }, 4000);

    // Reset form
    document.getElementById("paymentForm").reset();
    selectedBank = null;
    document.querySelectorAll(".bank-option").forEach(o => o.classList.remove("selected"));
    document.getElementById("previewCardNumber").textContent = "•••• •••• •••• ••••";
    document.getElementById("previewName").textContent = "YOUR NAME";
    document.getElementById("previewExpiry").textContent = "MM/YY";
    document.getElementById("previewBank").textContent = "BANK";

    renderSavedCards();
});

function renderSavedCards() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const methods = getPaymentMethods();
    const userMethods = methods.filter(m => m.userEmail === currentUser.email);
    const savedCardsList = document.getElementById("savedCardsList");

    if (userMethods.length === 0) {
        savedCardsList.innerHTML = `
            <div class="empty-message">
                <i class="fa-solid fa-inbox"></i>
                <p>No saved bank details yet</p>
            </div>
        `;
        return;
    }

    savedCardsList.innerHTML = userMethods.map(method => `
        <div class="saved-card-item">
            <div class="card-info-text">
                <strong>${escapeHtml(method.fullName)}</strong>
                <small>
                    <i class="fa-solid fa-building" style="margin-right: 5px;"></i>
                    ${escapeHtml(method.bankName)}<br>
                    Card: ${method.cardNumberMasked}<br>
                    Expires: ${escapeHtml(method.expiry)}
                </small>
            </div>
            <div class="card-actions">
                <button class="action-btn delete-btn" onclick="deletePaymentMethod('${method.id}')">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join("");
}

function deletePaymentMethod(methodId) {
    if (confirm("Are you sure you want to delete this bank details?")) {
        let methods = getPaymentMethods();
        methods = methods.filter(m => m.id !== methodId);
        savePaymentMethods(methods);
        if (window.AppData) {
            window.AppData.deleteItem("paymentMethods", methodId).catch(console.error);
        }
        renderSavedCards();
        alert("Bank details deleted successfully");
    }
}

window.addEventListener("appdata:changed", (event) => {
    if (event.detail.collection === "paymentMethods") renderSavedCards();
});

// Initial render
renderSavedCards();
