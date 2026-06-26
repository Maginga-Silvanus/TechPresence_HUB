let inProgress = 0;

const availableDisplay = document.getElementById("available");
const progressDisplay = document.getElementById("progress");
const taskCount = document.getElementById("taskCount");
const tasksList = document.getElementById("tasksList");
const reviewNotice = document.getElementById("reviewNotice");

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

function getTasks(){
    return JSON.parse(localStorage.getItem("tasks") || "[]");
}

function saveTasks(tasks){
    localStorage.setItem("tasks", JSON.stringify(tasks));
    if (window.AppData) {
        window.AppData.saveCollection("tasks", tasks).catch(console.error);
    }
}

function getCurrentUser(){
    return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function getApplications(){
    return JSON.parse(localStorage.getItem("applications") || "[]");
}

function getUserApplication(email){
    return getApplications().find(application => application.email === email);
}

function escapeHtml(value){
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderTasks(){
    if (!tasksList) return;

    const user = getCurrentUser();

    if (user && user.role === "user" && !user.activated) {
        if (availableDisplay) availableDisplay.textContent = "0";
        if (taskCount) taskCount.textContent = "Account activation required";
        tasksList.innerHTML = `
            <div class="empty-tasks">
                Your account is not activated yet. You can update your profile and submit your application while waiting for activation.
            </div>
        `;
        return;
    }

    const savedReviewMessage = localStorage.getItem("taskReviewMessage");
    if (reviewNotice && savedReviewMessage) {
        reviewNotice.textContent = savedReviewMessage;
    }

    const tasks = getTasks();
    const available = tasks.length;
    const limit = Number(tasksList.dataset.limit) || tasks.length;
    const sortedTasks = [...tasks].sort((a, b) => Number(b.id) - Number(a.id));
    const visibleTasks = sortedTasks.slice(0, limit);

    if (availableDisplay) {
        availableDisplay.textContent = available;
    }

    taskCount.textContent = available === 1 ? "1 task available" : `${available} tasks available`;

    if (available === 0) {
        taskCount.textContent = "No tasks available";
        tasksList.innerHTML = `
            <div class="empty-tasks">
                No tasks have been uploaded yet.
            </div>
        `;
        return;
    }

    tasksList.innerHTML = visibleTasks.map(task => `
        <article class="task-card">
            <div>
                <h3>${escapeHtml(task.title)}</h3>
                <p>${escapeHtml(task.description)}</p>
            </div>
            <strong>Reward: ${escapeHtml(task.reward)}</strong>
            <div class="task-actions">
                <button class="claim-task" data-id="${task.id}">Claim Task</button>
                ${task.document ? `<a class="download-task" href="${escapeHtml(task.document)}" target="_blank" download>Download Document</a>` : ""}
            </div>
        </article>
    `).join("");
}

if (tasksList) {
    tasksList.addEventListener("click", (event) => {
    const claimButton = event.target.closest(".claim-task");

    if (!claimButton) return;

    const user = getCurrentUser();

    if (!user || (user.role === "user" && !user.activated)) {
        alert("Please activate your account before you claim tasks.");
        return;
    }

    const application = getUserApplication(user.email);

    if (!application) {
        alert("Please fill and submit the application form before you claim tasks.");
        window.location.href = "apply.html";
        return;
    }

    if (application.status !== "approved") {
        alert("Your application is in review. Please wait for admin approval before claiming tasks.");
        return;
    }

    const tasks = getTasks();
    const task = tasks.find(item => item.id === claimButton.dataset.id);

    if (!task) return;

    inProgress++;
    if (progressDisplay) {
        progressDisplay.textContent = inProgress;
    }

    claimButton.textContent = "Claimed";
    claimButton.disabled = true;
    const reviewMessage = "Task uploaded successfully. Waiting to be approved by the admin.";
    localStorage.setItem("taskReviewMessage", reviewMessage);

    if (reviewNotice) {
        reviewNotice.textContent = reviewMessage;
    }

    alert(`Task claimed: ${task.title}`);
    });
}

renderTasks();

// Display user name in sidebar
const currentUser = getCurrentUser();
if (currentUser && document.getElementById("sidebarName")) {
    document.getElementById("sidebarName").textContent = currentUser.name || "User";
}

// Logout functionality
const logoutBtn = document.querySelector("[data-logout]");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        window.location.href = "login.html";
    });

// Submission Handling
const submissionForm = document.getElementById("submissionForm");
const submissionList = document.getElementById("submissionList");

function getSubmissions() {
    return JSON.parse(localStorage.getItem("submissions") || "[]");
}

function getAwards() {
    return JSON.parse(localStorage.getItem("awards") || "[]");
}

function saveSubmissions(submissions) {
    localStorage.setItem("submissions", JSON.stringify(submissions));
    if (window.AppData) {
        window.AppData.saveCollection("submissions", submissions).catch(console.error);
    }
}

async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderUserSubmissions() {
    if (!submissionList) return;
    const user = getCurrentUser();
    if (!user) return;

    const submissions = getSubmissions().filter(s => s.userEmail === user.email);
    const awards = getAwards().filter(a => a.userEmail === user.email);
    
    // Update Earned Stat on Dashboard
    const taskEarnedAmount = submissions
        .filter(s => s.status === 'awarded')
        .reduce((sum, s) => sum + Number(s.reward), 0);
    const manualAwardAmount = awards.reduce((sum, award) => sum + Number(award.amount || 0), 0);
    const earnedAmount = taskEarnedAmount + manualAwardAmount;
    const withdraws = JSON.parse(localStorage.getItem("withdrawals") || "[]")
        .filter(w => w.userEmail === user.email && (w.status === 'approved' || w.status === 'pending'));
    const withdrawn = withdraws.reduce((sum, w) => sum + Number(w.amount || 0), 0);
    
    const earnedStat = document.querySelector('.card h2:not([id])') || document.getElementById('earnedAmount');
    if (earnedStat) {
        earnedStat.textContent = `$${earnedAmount}`;
        const subtitle = earnedStat.parentElement.querySelector('.stat-subtitle');
        if (subtitle) subtitle.textContent = `${submissions.filter(s => s.status === 'awarded').length} tasks paid, ${awards.length} awards`;
    }

    const balanceStat = document.getElementById("userBalance");
    const completedStat = document.getElementById("completed");
    const approvedStat = document.getElementById("approved");

    if (balanceStat) balanceStat.textContent = `$${earnedAmount - withdrawn}`;
    if (completedStat) completedStat.textContent = submissions.length;
    if (approvedStat) approvedStat.textContent = submissions.filter(s => s.status === 'approved' || s.status === 'awarded').length;
    
    // Update stats on submission page
    const count = document.getElementById("submissionCount");
    const pending = document.getElementById("submissionPending");
    const approved = document.getElementById("submissionApproved");
    const declined = document.getElementById("submissionDeclined");
    
    if (count) count.textContent = submissions.length; // For submission page total
    if (pending) pending.textContent = submissions.filter(s => s.status === 'pending').length; // For submission page pending
    if (approved) approved.textContent = submissions.filter(s => s.status === 'approved').length; // For submission page approved
    if (declined) declined.textContent = submissions.filter(s => s.status === 'declined').length; // For submission page declined

    if (submissions.length === 0) {
        submissionList.innerHTML = '<div class="empty-tasks">No submissions yet.</div>';
        return;
    }

    submissionList.innerHTML = submissions.map(s => `
        <div class="task-card">
            <h3>${escapeHtml(s.title)}</h3>
            <p>${escapeHtml(s.description)}</p>
            <div style="margin-top: 10px;">
                <span class="status-badge" style="background: ${s.status === 'approved' ? '#10b981' : s.status === 'declined' ? '#ef4444' : '#f59e0b'}; color: white; padding: 2px 8px; border-radius: 4px;">
                    ${s.status.toUpperCase()}
                </span>
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <a href="${s.document}" download="submission_doc" class="download-task">Download Doc</a>
                <a href="${s.screenshot}" target="_blank" class="download-task">View Screenshot</a>
            </div>
        </div>
    `).join("");
}

if (submissionForm) {
    submissionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        
        const title = document.getElementById("submissionTitle").value;
        const reward = document.getElementById("submissionReward").value;
        const description = document.getElementById("submissionDescription").value;
        const docFile = document.getElementById("submissionDocument").files[0];
        const screenshotFile = document.getElementById("submissionScreenshot").files[0];

        if (!docFile || !screenshotFile) {
            alert("Please select both a document and a screenshot.");
            return;
        }

        try {
            const docData = await fileToDataUrl(docFile);
            const screenshotData = await fileToDataUrl(screenshotFile);

            const submissions = getSubmissions();
            submissions.push({
                id: Date.now().toString(),
                userEmail: user.email,
                userName: user.name,
                title,
                reward,
                description,
                document: docData,
                screenshot: screenshotData,
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            saveSubmissions(submissions);
            submissionForm.reset();
            alert("Task submitted successfully!");
            renderUserSubmissions();
        } catch (error) {
            alert("Error processing files. Please try again.");
        }
    });
}

renderUserSubmissions();

const withdrawForm = document.getElementById("withdrawForm");
if (withdrawForm) {
    const adminSettings = JSON.parse(localStorage.getItem("adminSettings") || "{}");
    const minimumWithdrawal = Number(adminSettings.minimumWithdrawal || 100);
    const withdrawAmountInput = document.getElementById("withdrawAmount");
    const withdrawSubtitle = document.querySelector(".stat-subtitle");

    if (withdrawAmountInput) {
        withdrawAmountInput.min = minimumWithdrawal;
        withdrawAmountInput.placeholder = `Enter amount (min $${minimumWithdrawal})`;
    }

    if (withdrawSubtitle) {
        withdrawSubtitle.textContent = `Minimum withdrawal: $${minimumWithdrawal}`;
    }

    withdrawForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        const amount = Number(document.getElementById("withdrawAmount").value);
        const method = document.getElementById("withdrawMethod").value;

        if (amount < minimumWithdrawal) return alert(`Minimum withdrawal is $${minimumWithdrawal}`);

        const subs = JSON.parse(localStorage.getItem("submissions") || "[]");
        const earned = subs.filter(s => s.userEmail === user.email && s.status === 'awarded').reduce((sum, s) => sum + Number(s.reward), 0);
        const withdraws = JSON.parse(localStorage.getItem("withdrawals") || "[]").filter(w => w.userEmail === user.email && (w.status === 'approved' || w.status === 'pending'));
        const withdrawn = withdraws.reduce((sum, w) => sum + Number(w.amount), 0);
        const balance = earned - withdrawn;

        if (balance < amount) return alert("Insufficient balance");

        const allWithdrawals = JSON.parse(localStorage.getItem("withdrawals") || "[]");
        allWithdrawals.push({
            id: Date.now().toString(),
            userEmail: user.email,
            userName: user.name,
            amount,
            method,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem("withdrawals", JSON.stringify(allWithdrawals));
        if (window.AppData) {
            window.AppData.saveCollection("withdrawals", allWithdrawals).catch(console.error);
        }
        withdrawForm.reset();
        alert("Withdrawal request sent!");
        renderUserSubmissions();
    });
}

window.addEventListener("appdata:changed", (event) => {
    if (event.detail.collection === "tasks") renderTasks();
    if (event.detail.collection === "submissions" || event.detail.collection === "withdrawals" || event.detail.collection === "awards") renderUserSubmissions();
});
}
