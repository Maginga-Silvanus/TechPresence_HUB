const defaultSettings = {
    platformName: "Tech Presence",
    supportEmail: "support@techpresence.com",
    activationFee: "300",
    minimumWithdrawal: "100",
    adminEmail: "silvamanguye@gmail.com"
};

const settingsForm = document.getElementById("settingsForm");

function getSettings(){
    return JSON.parse(localStorage.getItem("adminSettings") || JSON.stringify(defaultSettings));
}

function saveSettings(settings){
    localStorage.setItem("adminSettings", JSON.stringify(settings));
}

function setText(id, value){
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function renderSettings(){
    const settings = { ...defaultSettings, ...getSettings() };

    document.getElementById("settingPlatformName").value = settings.platformName;
    document.getElementById("settingSupportEmail").value = settings.supportEmail;
    document.getElementById("settingActivationFee").value = settings.activationFee;
    document.getElementById("settingMinimumWithdrawal").value = settings.minimumWithdrawal;
    document.getElementById("settingAdminEmail").value = settings.adminEmail;

    setText("summaryPlatformName", settings.platformName);
    setText("summarySupportEmail", settings.supportEmail);
    setText("summaryActivationFee", settings.activationFee);
    setText("summaryMinimumWithdrawal", settings.minimumWithdrawal);
    setText("summaryAdminEmail", settings.adminEmail);
}

if (settingsForm) {
    settingsForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const settings = {
            platformName: document.getElementById("settingPlatformName").value.trim(),
            supportEmail: document.getElementById("settingSupportEmail").value.trim(),
            activationFee: document.getElementById("settingActivationFee").value.trim(),
            minimumWithdrawal: document.getElementById("settingMinimumWithdrawal").value.trim(),
            adminEmail: document.getElementById("settingAdminEmail").value.trim()
        };

        saveSettings(settings);
        renderSettings();
        alert("Settings saved successfully.");
    });
}

renderSettings();
