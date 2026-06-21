const buttons = document.querySelectorAll(".approve");
const usersTable = document.getElementById("usersTable");
const applicationsTable = document.getElementById("applicationsTable");
const tasksTable = document.getElementById("tasksTable");
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskReward = document.getElementById("taskReward");
const taskDocument = document.getElementById("taskDocument");
const taskDescription = document.getElementById("taskDescription");
const taskSubmitBtn = document.getElementById("taskSubmitBtn");
const tasksStat = document.getElementById("tasks");
const usersStat = document.getElementById("users");
let editingTaskId = null;

// Sidebar Collapse Functionality
const collapseBtn = document.getElementById("collapseBtn");
const sidebar = document.querySelector(".sidebar");

if (collapseBtn) {
    // Auto-collapse on mobile, otherwise use saved preference
    let isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";

    if (window.innerWidth <= 768) {
        isCollapsed = true;
    }

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

function getUsers(){
    return JSON.parse(localStorage.getItem("users") || "[]");
}

function saveUsers(users){
    localStorage.setItem("users", JSON.stringify(users));
    if (window.AppData) {
        window.AppData.saveCollection("users", users).catch(console.error);
    }
}

function getApplications(){
    return JSON.parse(localStorage.getItem("applications") || "[]");
}

function saveApplications(applications){
    localStorage.setItem("applications", JSON.stringify(applications));
    if (window.AppData) {
        window.AppData.saveCollection("applications", applications).catch(console.error);
    }
}

function getTasks(){
    return JSON.parse(localStorage.getItem("tasks") || "[]");
}

function saveTasks(tasks){
    localStorage.setItem("tasks", JSON.stringify(tasks));
    if (window.AppData) {
        window.AppData.saveCollection("tasks", tasks).catch(console.error);
    }
}

function getSubmissions(){
    return JSON.parse(localStorage.getItem("submissions") || "[]");
}

function saveSubmissions(submissions){
    localStorage.setItem("submissions", JSON.stringify(submissions));
    if (window.AppData) {
        window.AppData.saveCollection("submissions", submissions).catch(console.error);
    }
}

function escapeHtml(value){
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderUsers(){
    const users = getUsers();

    if (usersStat) {
        usersStat.textContent = users.length;
    }

    if (!usersTable) return;

    if (users.length === 0) {
        usersTable.innerHTML = `
            <tr>
                <td colspan="5">No registered users yet.</td>
            </tr>
        `;
        return;
    }

    usersTable.innerHTML = users.map(user => {
        const paymentStatus = user.activationPaid ? "Paid" : "Not Paid";
        const activationStatus = user.activated ? "Active" : "Inactive";
        const paymentBadgeColor = user.activationPaid ? "#10b981" : "#ef4444";
        const activationBadgeColor = user.activated ? "#10b981" : "#ef4444";
        
        return `
        <tr>
            <td><strong>${escapeHtml(user.name)}</strong></td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <span style="display: inline-block; background: ${paymentBadgeColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                    ${paymentStatus}
                </span>
            </td>
            <td>
                <span style="display: inline-block; background: ${activationBadgeColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                    ${activationStatus}
                </span>
            </td>
            <td>
                <button class="activate ${user.activated ? "activated" : ""}" data-email="${escapeHtml(user.email)}" style="background: ${user.activated ? '#10b981' : '#2196F3'}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px;">
                    ${user.activated ? "✓ Activated" : "Activate"}
                </button>
            </td>
        </tr>
    `;
    }).join("");
}

function renderTasks(){
    const tasks = getTasks();

    if (tasksStat) {
        tasksStat.textContent = tasks.length;
    }

    if (!tasksTable) return;

    if (tasks.length === 0) {
        tasksTable.innerHTML = `
            <tr>
                <td colspan="5">No tasks uploaded yet.</td>
            </tr>
        `;
        return;
    }

    tasksTable.innerHTML = tasks.map(task => `
        <tr>
            <td>${escapeHtml(task.title)}</td>
            <td>${escapeHtml(task.description)}</td>
            <td>${escapeHtml(task.reward)}</td>
            <td>${task.document ? `<a href="${escapeHtml(task.document)}" target="_blank">Document</a>` : "No document"}</td>
            <td>
                <button class="edit-task" data-id="${task.id}">Edit</button>
                <button class="delete-task" data-id="${task.id}">Delete</button>
            </td>
        </tr>
    `).join("");
}

function renderApplications(){
    const applications = getApplications();
    const elTotal = document.getElementById("applicationsTotal");
    const elPending = document.getElementById("applicationsPending");
    const elApproved = document.getElementById("applicationsApproved");
    const elDeclined = document.getElementById("applicationsDeclined");

    if (elTotal) elTotal.textContent = applications.length;
    if (elPending) elPending.textContent = applications.filter(a => a.status === 'pending' || !a.status).length;
    if (elApproved) elApproved.textContent = applications.filter(a => a.status === 'approved').length;
    if (elDeclined) elDeclined.textContent = applications.filter(a => a.status === 'declined').length;

    if (!applicationsTable) return;

    if (applications.length === 0) {
        applicationsTable.innerHTML = `
            <tr>
                <td colspan="5">No applications submitted yet.</td>
            </tr>
        `;
        return;
    }

    applicationsTable.innerHTML = applications.map(application => `
        <tr>
            <td>
                <strong>${escapeHtml(application.fullName || application.name)}</strong><br>
                ${escapeHtml(application.email)}
            </td>
            <td>${escapeHtml(application.workType)}</td>
            <td>${escapeHtml(application.location)}</td>
            <td class="${application.status === "approved" ? "active-status" : ""}">
                ${application.status === "approved" ? "Approved" : "Pending"}
            </td>
            <td>
                <button class="approve-application ${application.status === "approved" ? "activated" : ""}" data-email="${escapeHtml(application.email)}">
                    ${application.status === "approved" ? "Approved" : "Approve"}
                </button>
            </td>
        </tr>
    `).join("");
}

function renderSubmissions() {
    const table = document.getElementById("adminSubmissionTable") || document.getElementById("submissionsTable");
    if (!table) return;

    const submissions = getSubmissions();
    const reviewsStat = document.getElementById("reviews");
    if (reviewsStat) {
        reviewsStat.textContent = submissions.filter(s => s.status === 'pending').length;
    }

    if (submissions.length === 0) {
        table.innerHTML = `<tr><td colspan="4">No submissions found.</td></tr>`;
        return;
    }

    table.innerHTML = submissions.map(s => `
        <tr>
            <td>
                <strong>${escapeHtml(s.userName)}</strong><br>
                <small>${escapeHtml(s.userEmail)}</small>
            </td>
            <td>${escapeHtml(s.title)}</td>
            <td>
                <span style="padding: 4px 8px; border-radius: 12px; font-size: 11px; background: ${s.status === 'approved' ? '#dcfce7' : s.status === 'declined' ? '#fee2e2' : '#fef3c7'}; color: ${s.status === 'approved' ? '#166534' : s.status === 'declined' ? '#991b1b' : '#92400e'}">
                    ${s.status.toUpperCase()}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <a href="${s.document}" download="submission_${s.id}" style="text-decoration: none; background: #eee; padding: 4px; border-radius: 4px; font-size: 12px;">Doc</a>
                    <a href="${s.screenshot}" target="_blank" style="text-decoration: none; background: #eee; padding: 4px; border-radius: 4px; font-size: 12px;">Img</a>
                    ${s.status === 'pending' ? `
                        <button onclick="updateSubmissionStatus('${s.id}', 'approved')" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Approve</button>
                        <button onclick="updateSubmissionStatus('${s.id}', 'declined')" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Decline</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join("");
}

window.updateSubmissionStatus = function(id, status) {
    const submissions = getSubmissions();
    const sub = submissions.find(s => s.id === id);
    if (sub) {
        sub.status = status;
        saveSubmissions(submissions);
        renderSubmissions();
    }
};

function resetTaskForm(){
    editingTaskId = null;
    taskForm.reset();
    taskSubmitBtn.textContent = "Upload Task";
}

buttons.forEach(button => {

    button.addEventListener("click", () => {

        button.innerText = "Approved";
        button.style.background = "#2563eb";

    });

});

if (usersTable) {
    usersTable.addEventListener("click", (event) => {
        const button = event.target.closest(".activate");

        if (!button) return;

        const users = getUsers();
        const user = users.find(item => item.email === button.dataset.email);

        if (!user) return;

        user.activated = true;
        saveUsers(users);
        if (window.syncFirebaseUser) {
            window.syncFirebaseUser(user).catch(console.error);
        }
        renderUsers();
    });
}

if (taskForm) {
    taskForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const title = taskTitle.value.trim();
        const reward = taskReward.value.trim();
        const documentLink = taskDocument.value.trim();
        const description = taskDescription.value.trim();

        if (!title || !reward || !description) {
            alert("Please fill all task fields.");
            return;
        }

        const tasks = getTasks();

        if (editingTaskId) {
            const task = tasks.find(item => item.id === editingTaskId);

            if (task) {
                task.title = title;
                task.reward = reward;
                task.document = documentLink;
                task.description = description;
            }
        } else {
            tasks.push({
                id: Date.now().toString(),
                title,
                reward,
                document: documentLink,
                description
            });
        }

        saveTasks(tasks);
        resetTaskForm();
        renderTasks();
    });
}

if (tasksTable) {
    tasksTable.addEventListener("click", (event) => {
        const editButton = event.target.closest(".edit-task");
        const deleteButton = event.target.closest(".delete-task");
        const tasks = getTasks();

        if (editButton) {
            const task = tasks.find(item => item.id === editButton.dataset.id);

            if (!task) return;

            editingTaskId = task.id;
            taskTitle.value = task.title;
            taskReward.value = task.reward;
            taskDocument.value = task.document || "";
            taskDescription.value = task.description;
            taskSubmitBtn.textContent = "Update Task";
            taskTitle.focus();
            return;
        }

        if (deleteButton) {
            const updatedTasks = tasks.filter(item => item.id !== deleteButton.dataset.id);
            saveTasks(updatedTasks);

            if (editingTaskId === deleteButton.dataset.id) {
                resetTaskForm();
            }

            renderTasks();
        }
    });
}

if (applicationsTable) {
    applicationsTable.addEventListener("click", (event) => {
        const button = event.target.closest(".approve-application");

        if (!button) return;

        const applications = getApplications();
        const application = applications.find(item => item.email === button.dataset.email);

        if (!application) return;

        application.status = "approved";
        saveApplications(applications);
        renderApplications();
    });
}

// Logout is now handled globally by auth.js using the [data-logout] or #logoutBtn selectors.
// Redundant listener removed to prevent conflicts.
const logoutBtnRef = document.getElementById("logoutBtn");
if (logoutBtnRef && !window.authInitialized) {
    // auth.js handles this globally via document listener
}

// Chart rendering functions
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
    const elAct = document.getElementById("activatedCount");
    const elInact = document.getElementById("inactivatedCount");
    const elPaid = document.getElementById("paidCount");
    const elNotPaid = document.getElementById("notPaidCount");

    if (elAct) elAct.textContent = activatedUsers;
    if (elInact) elInact.textContent = inactivatedUsers;
    if (elPaid) elPaid.textContent = paidUsers;
    if (elNotPaid) elNotPaid.textContent = notPaidUsers;

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

function renderApprovalCharts() {
    const users = getUsers();
    const subs = getSubmissions();

    const pendingUsers = users.filter(u => u.activationPaid && !u.activated).length;
    const activeUsers = users.filter(u => u.activated).length;
    const pendingSubs = subs.filter(s => s.status === 'pending').length;
    const approvedSubs = subs.filter(s => s.status === 'approved').length;

    if (document.getElementById("pendingUserCount")) document.getElementById("pendingUserCount").textContent = pendingUsers; // For approvals page
    if (document.getElementById("activeUserCount")) document.getElementById("activeUserCount").textContent = activeUsers; // For approvals page
    if (document.getElementById("pendingTaskCount")) document.getElementById("pendingTaskCount").textContent = pendingSubs; // For approvals page
    if (document.getElementById("approvedTaskCount")) document.getElementById("approvedTaskCount").textContent = approvedSubs; // For approvals page

    const uCtx = document.getElementById("userApprovalChart");
    if (uCtx) {
        new Chart(uCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Activated'],
                datasets: [{
                    data: [pendingUsers, activeUsers],
                    backgroundColor: ['#f59e0b', '#10b981']
                }]
            },
            options: { plugins: { legend: { position: 'bottom' } } }
        });
    }

    const tCtx = document.getElementById("taskApprovalChart");
    if (tCtx) {
        new Chart(tCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Approved'],
                datasets: [{
                    data: [pendingSubs, approvedSubs],
                    backgroundColor: ['#f59e0b', '#3b82f6']
                }]
            },
            options: { plugins: { legend: { position: 'bottom' } } }
        });
    }
}

renderUsers();
renderApplications();
renderTasks();
renderCharts();
renderSubmissions();
renderApprovalCharts();
if (typeof renderAwardCharts === "function") renderAwardCharts();

function renderAdminWithdrawals() {
    const table = document.getElementById("withdrawalsTable");
    const withdrawals = JSON.parse(localStorage.getItem("withdrawals") || "[]");
    
    const totalPaid = withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + Number(w.amount), 0);
    const pending = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + Number(w.amount), 0);

    if (document.getElementById("adminTotalWithdrawn")) document.getElementById("adminTotalWithdrawn").textContent = `$${totalPaid.toLocaleString()}`;
    if (document.getElementById("adminPendingWithdrawn")) document.getElementById("adminPendingWithdrawn").textContent = `$${pending.toLocaleString()}`;
    if (document.getElementById("adminWithdrawRequests")) document.getElementById("adminWithdrawRequests").textContent = withdrawals.filter(w => w.status === 'pending').length;

    if (!table) return;

    if (withdrawals.length === 0) {
        table.innerHTML = '<tr><td colspan="5">No withdrawal requests.</td></tr>';
        return;
    }

    table.innerHTML = withdrawals.map(w => `
        <tr>
            <td><strong>${escapeHtml(w.userName)}</strong><br><small>${escapeHtml(w.userEmail)}</small></td>
            <td>$${w.amount}</td>
            <td>${escapeHtml(w.method)}</td>
            <td><span style="padding: 4px 8px; border-radius: 12px; font-size: 11px; background: ${w.status === 'approved' ? '#dcfce7' : w.status === 'declined' ? '#fee2e2' : '#fef3c7'}; color: ${w.status === 'approved' ? '#166534' : w.status === 'declined' ? '#991b1b' : '#92400e'}">${w.status.toUpperCase()}</span></td>
            <td>
                ${w.status === 'pending' ? `
                    <button onclick="updateWithdrawalStatus('${w.id}', 'approved')" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Approve</button>
                    <button onclick="updateWithdrawalStatus('${w.id}', 'declined')" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Decline</button>
                ` : '-'}
            </td>
        </tr>
    `).join("");
}

window.updateWithdrawalStatus = function(id, status) {
    const withdrawals = JSON.parse(localStorage.getItem("withdrawals") || "[]");
    const w = withdrawals.find(item => item.id === id);
    if (w) {
        if (status === 'declined') {
            const msg = prompt("Reason for decline:");
            if (msg) w.adminMessage = msg;
        }
        w.status = status;
        localStorage.setItem("withdrawals", JSON.stringify(withdrawals));
        if (window.AppData) {
            window.AppData.saveCollection("withdrawals", withdrawals).catch(console.error);
        }
        renderAdminWithdrawals();
        renderWithdrawalCharts();
    }
};

function renderWithdrawalCharts() {
    const ctx = document.getElementById("withdrawalChart");
    if (!ctx) return;
    const withdrawals = JSON.parse(localStorage.getItem("withdrawals") || "[]");
    const approved = withdrawals.filter(w => w.status === 'approved').length;
    const pending = withdrawals.filter(w => w.status === 'pending').length;
    const declined = withdrawals.filter(w => w.status === 'declined').length;
    if (window.myWChart) window.myWChart.destroy();
    window.myWChart = new Chart(ctx, {
        type: 'pie',
        data: { labels: ['Approved', 'Pending', 'Declined'], datasets: [{ data: [approved, pending, declined], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

window.addEventListener("appdata:changed", (event) => {
    const collection = event.detail.collection;
    if (collection === "users") {
        renderUsers();
        renderCharts();
        renderApprovalCharts();
    }
    if (collection === "applications") renderApplications();
    if (collection === "tasks") renderTasks();
    if (collection === "submissions") {
        renderSubmissions();
        renderApprovalCharts();
        if (typeof renderAwardCharts === "function") renderAwardCharts();
    }
    if (collection === "withdrawals") {
        renderAdminWithdrawals();
        renderWithdrawalCharts();
    }
});
renderAdminWithdrawals();
renderWithdrawalCharts();
