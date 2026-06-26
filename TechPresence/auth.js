// Simple client-side auth for demo purposes
(function(){
    const ADMIN_EMAIL = 'silvamanguye@gmail.com';
    // Allow common variants for the demo admin password (core token: Silvanus@001)
    const ADMIN_PASSWORD = 'a Silvanus@001...';
    const ADMIN_PASSWORD_CORE = 'Silvanus@001';

    function getUsers(){
        return JSON.parse(localStorage.getItem('users')||'[]');
    }

    function getLocalUser(email){
        const normalizedEmail = (email || '').toLowerCase();
        return getUsers().find(item=>(item.email || '').toLowerCase()===normalizedEmail) || null;
    }

    function saveUsers(users){
        localStorage.setItem('users', JSON.stringify(users));
        if (window.AppData) {
            window.AppData.saveCollection('users', users).catch(console.error);
        }
    }

    function getFirebase(){
        return window.AppFirebase && window.AppFirebase.isConfigured ? window.AppFirebase : null;
    }

    function upsertLocalUser(user){
        const users = getUsers();
        const existingIndex = users.findIndex(item=>item.email===user.email);

        if (existingIndex >= 0) {
            users[existingIndex] = { ...users[existingIndex], ...user };
        } else {
            users.push(user);
        }

        saveUsers(users);
    }

    async function saveFirebaseUser(user){
        const fb = getFirebase();
        if (!fb) return;

        if (window.AppData) {
            await window.AppData.upsertItem('users', user);
            return;
        }

        await fb.db.collection('users').doc(user.email).set({
            ...user,
            updatedAt: fb.serverTimestamp(),
            createdAt: user.createdAt || fb.serverTimestamp()
        }, { merge: true });
    }

    async function getFirebaseUser(email){
        const fb = getFirebase();
        if (!fb) return null;

        const doc = await fb.db.collection('users').doc(email).get();
        return doc.exists ? doc.data() : null;
    }

    function createSessionUser(user){
        return {
            uid: user.uid || '',
            email: user.email,
            name: user.name,
            activated: !!user.activated,
            activationPaid: !!user.activationPaid,
            phone: user.phone || '',
            profilePic: user.profilePic || '',
            role: user.role || 'user'
        };
    }

    async function getOrCreateFirebaseProfile(firebaseUser){
        const email = (firebaseUser.email || '').toLowerCase();
        let existingUser = null;

        try {
            existingUser = await getFirebaseUser(email);
        } catch (error) {
            console.warn('Unable to read Firebase profile; using local profile if available.', error);
            existingUser = getLocalUser(email);
        }

        if (existingUser) {
            const mergedUser = {
                ...existingUser,
                uid: existingUser.uid || firebaseUser.uid,
                email,
                name: existingUser.name || firebaseUser.displayName || email.split('@')[0],
                profilePic: existingUser.profilePic || firebaseUser.photoURL || ''
            };

            await saveFirebaseUser(mergedUser).catch(error => console.warn('Unable to update Firebase profile.', error));
            upsertLocalUser(mergedUser);
            return mergedUser;
        }

        const newUser = {
            uid: firebaseUser.uid,
            email,
            name: firebaseUser.displayName || email.split('@')[0],
            activated: false,
            activationPaid: false,
            phone: firebaseUser.phoneNumber || '',
            profilePic: firebaseUser.photoURL || '',
            role: 'user',
            provider: firebaseUser.providerData && firebaseUser.providerData[0] ? firebaseUser.providerData[0].providerId : 'google.com',
            createdAt: new Date().toISOString()
        };

        await saveFirebaseUser(newUser).catch(error => console.warn('Unable to save Firebase profile.', error));
        upsertLocalUser(newUser);
        return newUser;
    }

    async function signInWithGoogle(){
        const fb = getFirebase();

        if (!fb) {
            alert('Firebase is not configured yet. Please add your Firebase config first.');
            return;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            const credential = await fb.auth.signInWithPopup(provider);
            const user = await getOrCreateFirebaseProfile(credential.user);

            setCurrentUser(createSessionUser(user));
            location.href = 'index.html';
        } catch (error) {
            alert(error.message || 'Google sign in failed. Please try again.');
        }
    }

    window.syncFirebaseUser = saveFirebaseUser;

    async function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function setCurrentUser(u){
        localStorage.setItem('currentUser', JSON.stringify(u));
    }

    function getCurrentUser(){
        return JSON.parse(localStorage.getItem('currentUser')||'null');
    }

    function getApplications(){
        return JSON.parse(localStorage.getItem('applications')||'[]');
    }

    function getSubmissions(){
        return JSON.parse(localStorage.getItem('submissions')||'[]');
    }

    function getWithdrawals(){
        return JSON.parse(localStorage.getItem('withdrawals')||'[]');
    }

    function saveApplications(applications){
        localStorage.setItem('applications', JSON.stringify(applications));
        if (window.AppData) {
            window.AppData.saveCollection('applications', applications).catch(console.error);
        }
    }

    function getAdminSettings(){
        return {
            platformName: 'Tech Presence',
            supportEmail: 'support@techpresence.com',
            activationFee: '300',
            minimumWithdrawal: '100',
            adminEmail: ADMIN_EMAIL,
            ...JSON.parse(localStorage.getItem('adminSettings') || '{}')
        };
    }

    function formatMoney(amount){
        return `$${Number(amount || 0).toLocaleString()}`;
    }

    function refreshCurrentUser(){
        const user = getCurrentUser();
        if (!user || user.role !== 'user') return user;

        const savedUser = getLocalUser(user.email);
        if (!savedUser) return user;

        const refreshedUser = {
            uid: savedUser.uid || user.uid || '',
            email: savedUser.email,
            name: savedUser.name,
            activated: !!savedUser.activated,
            activationPaid: !!savedUser.activationPaid,
            phone: savedUser.phone || '',
            profilePic: savedUser.profilePic || '',
            role: 'user'
        };

        setCurrentUser(refreshedUser);
        return refreshedUser;
    }

    async function refreshCurrentUserFromFirebase(){
        const user = getCurrentUser();
        const fb = getFirebase();

        if (!user || user.role !== 'user' || !fb) return user;

        try {
            const savedUser = await getFirebaseUser(user.email);
            if (!savedUser) return user;

            upsertLocalUser(savedUser);
            return refreshCurrentUser();
        } catch (error) {
            console.warn('Unable to refresh user activation from Firebase.', error);
            return user;
        }
    }

    function logout(){
        localStorage.removeItem('currentUser');
        const fb = getFirebase();
        if (fb) {
            fb.auth.signOut().catch(console.error);
        }
        location.href = 'login.html';
    }

    function initResponsiveSidebar(){
        const sidebar = document.querySelector('.sidebar');
        const collapseBtn = document.getElementById('collapseBtn');
        const content = document.querySelector('.main-content, .content');

        if (!sidebar) return;

        const mobileQuery = window.matchMedia('(max-width: 768px)');
        const toggleBtn = document.createElement('button');
        const overlay = document.createElement('div');

        toggleBtn.type = 'button';
        toggleBtn.className = 'mobile-menu-btn';
        toggleBtn.setAttribute('aria-label', 'Open navigation menu');
        toggleBtn.setAttribute('aria-controls', 'siteSidebar');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';

        overlay.className = 'mobile-sidebar-overlay';
        overlay.hidden = true;

        sidebar.id = sidebar.id || 'siteSidebar';
        document.body.appendChild(toggleBtn);
        document.body.appendChild(overlay);

        function setCollapseIcon(collapsed){
            if (!collapseBtn) return;
            collapseBtn.innerHTML = collapsed
                ? '<i class="fa-solid fa-chevron-right"></i>'
                : '<i class="fa-solid fa-chevron-left"></i>';
            collapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        }

        function setMobileOpen(open){
            sidebar.classList.toggle('mobile-open', open);
            document.body.classList.toggle('mobile-nav-open', open);
            toggleBtn.setAttribute('aria-expanded', String(open));
            toggleBtn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
            toggleBtn.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
            overlay.hidden = !open;
        }

        function applyMode(){
            if (mobileQuery.matches) {
                sidebar.classList.remove('collapsed');
                setMobileOpen(false);
                if (collapseBtn) {
                    collapseBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    collapseBtn.setAttribute('aria-label', 'Close navigation menu');
                }
                return;
            }

            setMobileOpen(false);
            const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            sidebar.classList.toggle('collapsed', collapsed);
            setCollapseIcon(collapsed);
        }

        toggleBtn.addEventListener('click', () => {
            setMobileOpen(!sidebar.classList.contains('mobile-open'));
        });

        overlay.addEventListener('click', () => setMobileOpen(false));

        if (collapseBtn) {
            collapseBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();

                if (mobileQuery.matches) {
                    setMobileOpen(false);
                    return;
                }

                sidebar.classList.toggle('collapsed');
                const collapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('sidebarCollapsed', collapsed);
                setCollapseIcon(collapsed);
            }, true);
        }

        sidebar.addEventListener('click', (event) => {
            if (mobileQuery.matches && event.target.closest('.menu a')) {
                setMobileOpen(false);
            }
        });

        if (content) {
            content.addEventListener('focusin', () => {
                if (mobileQuery.matches) setMobileOpen(false);
            });
        }

        if (mobileQuery.addEventListener) {
            mobileQuery.addEventListener('change', applyMode);
        } else {
            mobileQuery.addListener(applyMode);
        }

        applyMode();
    }

    function showActivationFeeInfo(){
        const banner = document.getElementById('activationBanner');
        if (!banner) return;

        banner.innerHTML = '';

        const message = document.createElement('span');
        const settings = getAdminSettings();
        message.textContent = `For your account to be activated, you are required to pay an activation fee of ${settings.activationFee}. `;

        const payButton = document.createElement('button');
        payButton.type = 'button';
        payButton.setAttribute('data-pay-activation', '');
        payButton.textContent = 'Pay';
        payButton.style.marginLeft = '10px';
        payButton.style.background = '#2563eb';
        payButton.style.color = 'white';
        payButton.style.border = 'none';
        payButton.style.padding = '8px 12px';
        payButton.style.borderRadius = '6px';
        payButton.style.cursor = 'pointer';

        banner.appendChild(message);
        banner.appendChild(payButton);
    }

    function payActivationFee(){
        const phone = prompt('Enter your phone number to pay the activation fee');

        if (phone === null) return;

        const cleanPhone = phone.trim();

        if (!cleanPhone) {
            alert('Please enter your phone number.');
            return;
        }

        const settings = getAdminSettings();
        const amount = prompt(`Payment prompt sent to ${cleanPhone}. Enter activation fee amount`, settings.activationFee);

        if (amount === null) return;

        if (amount.trim() !== String(settings.activationFee)) {
            alert(`Activation fee must be ${settings.activationFee}.`);
            return;
        }

        const user = getCurrentUser();
        if (!user) return alert('Please login first');
        if (user.role === 'admin') return alert('Admin account is already active');

        const users = getUsers();
        const savedUser = users.find(item=>item.email===user.email);

        if (savedUser) {
            savedUser.activationPaid = true;
            savedUser.phone = cleanPhone;
            saveUsers(users);
            saveFirebaseUser(savedUser).catch(console.error);
        }

        if (window.AppData) {
            window.AppData.upsertItem('activationPayments', {
                id: `${user.email}-${Date.now()}`,
                userEmail: user.email,
                userName: user.name,
                phone: cleanPhone,
                amount: Number(settings.activationFee),
                status: 'pending',
                createdAt: new Date().toISOString()
            }).catch(console.error);
        }

        user.activationPaid = true;
        user.phone = cleanPhone;
        setCurrentUser(user);
        alert('Payment prompt sent. Please wait for the admin to activate your account.');
        location.href = 'index.html';
    }

    // Register handler
    const regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', async (e)=>{
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm').value;

            if (!name || !email || !password) return alert('Please fill all fields');
            if (password !== confirm) return alert('Passwords do not match');

            const users = getUsers();
            if (!getFirebase() && users.find(u=>u.email===email)) return alert('A user with that email already exists');

            const newUser = { name, email, activated: false, activationPaid: false, phone: '', profilePic: '', role: 'user', createdAt: new Date().toISOString() };

            try {
                const fb = getFirebase();

                if (fb) {
                    const credential = await fb.auth.createUserWithEmailAndPassword(email, password);
                    await credential.user.updateProfile({ displayName: name });
                    await saveFirebaseUser({ ...newUser, uid: credential.user.uid });
                    upsertLocalUser({ ...newUser, uid: credential.user.uid });
                } else {
                    users.push({ ...newUser, password });
                    saveUsers(users);
                }
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    alert('This email already has a Firebase account. Please login instead; your online profile will be restored automatically.');
                } else {
                    alert(error.message || 'Unable to register. Please try again.');
                }
                return;
            }

            alert('Registered successfully. Please login to continue.');
            location.href = 'login.html';
        });
    }

    // Login handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e)=>{
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;

            const adminEmail = getAdminSettings().adminEmail.toLowerCase();

            // admin shortcut - accept exact demo password or any variant containing the core token
            if (email === adminEmail && (password === ADMIN_PASSWORD || password.trim().includes(ADMIN_PASSWORD_CORE))) {
                const fb = getFirebase();
                if (fb) {
                    try {
                        const credential = await fb.auth.signInWithEmailAndPassword(email, password);
                        await saveFirebaseUser({
                            uid: credential.user.uid,
                            email: adminEmail,
                            name: credential.user.displayName || 'Admin',
                            activated: true,
                            activationPaid: true,
                            role: 'admin',
                            createdAt: new Date().toISOString()
                        });
                    } catch (error) {
                        console.warn('Admin Firebase sign-in failed; using local admin session.', error);
                    }
                }
                setCurrentUser({ email: adminEmail, name: 'Admin', activated: true, activationPaid: true, role: 'admin' });
                location.href = 'admin.html';
                return;
            }

            let user = null;

            try {
                const fb = getFirebase();

                if (fb) {
                    const credential = await fb.auth.signInWithEmailAndPassword(email, password);
                    try {
                        user = await getFirebaseUser(email);
                    } catch (error) {
                        console.warn('Unable to read Firebase profile after login; using local session profile.', error);
                        user = getLocalUser(email);
                    }

                    if (!user) {
                        user = {
                            uid: credential.user.uid,
                            email,
                            name: credential.user.displayName || email.split('@')[0],
                            activated: false,
                            activationPaid: false,
                            phone: '',
                            profilePic: '',
                            role: 'user',
                            createdAt: new Date().toISOString()
                        };
                    }

                    user = {
                        ...user,
                        uid: user.uid || credential.user.uid,
                        email,
                        name: user.name || credential.user.displayName || email.split('@')[0],
                        role: user.role || 'user'
                    };

                    await saveFirebaseUser(user).catch(error => console.warn('Unable to save Firebase profile after login.', error));

                    upsertLocalUser(user);
                } else {
                    const users = getUsers();
                    user = users.find(u=>u.email===email && u.password===password);
                }
            } catch (error) {
                alert(error.message || 'Invalid credentials');
                return;
            }

            if (!user) return alert('Invalid credentials');

            setCurrentUser(createSessionUser(user));
            location.href = 'index.html';
        });
    }

    // On pages with a logout link (optional) wire it
    document.addEventListener('click', (e)=>{
        if (e.target && (e.target.matches('[data-logout]') || e.target.closest('[data-logout]') || e.target.id === 'logoutBtn')){
            e.preventDefault(); logout();
        }

        if (e.target && (e.target.matches('[data-google-signin]') || e.target.closest('[data-google-signin]'))){
            e.preventDefault(); signInWithGoogle();
        }

        if (e.target && e.target.matches('[data-activate]')){
            e.preventDefault(); showActivationFeeInfo();
        }

        if (e.target && e.target.matches('[data-pay-activation]')){
            e.preventDefault(); payActivationFee();
        }
    });

    // When on index/dashboard, show activation banner if needed
    document.addEventListener('DOMContentLoaded', async ()=>{
        initResponsiveSidebar();

        if (window.AppData) {
            await window.AppData.syncAll().catch(console.error);
        }

        let user = refreshCurrentUser();
        user = await refreshCurrentUserFromFirebase();
        const isUserPage = location.pathname.endsWith('index.html') || location.pathname.endsWith('tasks.html') || location.pathname.endsWith('profile.html') || location.pathname.endsWith('apply.html') || location.pathname === '/' || location.pathname === '';

        if (isUserPage && !user) {
            location.href = 'login.html';
            return;
        }

        const container = document.querySelector('.main-content') || document.body;
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileStatus = document.getElementById('profileStatus');
        const profilePayment = document.getElementById('profilePayment');
        const profilePhone = document.getElementById('profilePhone');
        const profileRole = document.getElementById('profileRole');
        const profilePhoneDisplay = document.getElementById('profilePhoneDisplay');
        const profileApplicationStatus = document.getElementById('profileApplicationStatus');
        const profileWorkType = document.getElementById('profileWorkType');
        const profileLocation = document.getElementById('profileLocation');
        const profileSubmissionCount = document.getElementById('profileSubmissionCount');
        const profileApprovedCount = document.getElementById('profileApprovedCount');
        const profileEarned = document.getElementById('profileEarned');
        const profileWithdrawn = document.getElementById('profileWithdrawn');
        const profileBalance = document.getElementById('profileBalance');
        const profileForm = document.getElementById('profileForm');
        const sidebarName = document.getElementById('sidebarName');
        const sidebarImg = document.querySelector('.sidebar .profile img');
        const profileAvatarContainer = document.querySelector('.profile-avatar');
        const applicationForm = document.getElementById('applicationForm');
        const applicationNotice = document.getElementById('applicationNotice');

        if (user && user.role === 'user' && profileName) {
            const avatarUrl = user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
            profileName.textContent = user.name;
            if (sidebarImg) sidebarImg.src = avatarUrl;
            if (profileAvatarContainer) {
                profileAvatarContainer.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
            }
            profileEmail.textContent = user.email;
            profileStatus.textContent = user.activated ? 'Active' : 'Inactive';
            profilePayment.textContent = user.activationPaid ? 'Paid' : 'Not paid';
            profilePhone.value = user.phone || '';

            const application = getApplications().find(item=>item.email===user.email);
            const userSubmissions = getSubmissions().filter(item=>item.userEmail===user.email);
            const approvedSubmissions = userSubmissions.filter(item=>item.status === 'approved' || item.status === 'awarded');
            const earned = userSubmissions
                .filter(item=>item.status === 'awarded')
                .reduce((sum, item)=>sum + Number(item.reward || 0), 0);
            const withdrawn = getWithdrawals()
                .filter(item=>item.userEmail===user.email && (item.status === 'approved' || item.status === 'pending'))
                .reduce((sum, item)=>sum + Number(item.amount || 0), 0);

            if (profileRole) profileRole.textContent = user.role === 'admin' ? 'Admin' : 'User';
            if (profilePhoneDisplay) profilePhoneDisplay.textContent = user.phone || 'Not added';
            if (profileApplicationStatus) profileApplicationStatus.textContent = application ? (application.status || 'Pending') : 'Not submitted';
            if (profileWorkType) profileWorkType.textContent = application && application.workType ? application.workType : 'Not set';
            if (profileLocation) profileLocation.textContent = application && application.location ? application.location : 'Not set';
            if (profileSubmissionCount) profileSubmissionCount.textContent = userSubmissions.length;
            if (profileApprovedCount) profileApprovedCount.textContent = approvedSubmissions.length;
            if (profileEarned) profileEarned.textContent = formatMoney(earned);
            if (profileWithdrawn) profileWithdrawn.textContent = formatMoney(withdrawn);
            if (profileBalance) profileBalance.textContent = formatMoney(earned - withdrawn);
        }

        if (user && user.role === 'user' && sidebarName) {
            sidebarName.textContent = user.name;
            const avatarUrl = user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
            if (sidebarImg) sidebarImg.src = avatarUrl;
        }

        if (profileForm) {
            profileForm.addEventListener('submit', async (event)=>{
                event.preventDefault();

                const currentUser = getCurrentUser();
                if (!currentUser) return alert('Please login first');

                const phone = profilePhone.value.trim();
                const picInput = document.getElementById('profilePicInput');
                let profilePic = currentUser.profilePic || '';

                if (picInput && picInput.files[0]) {
                    try {
                        profilePic = await fileToDataUrl(picInput.files[0]);
                    } catch (err) {
                        alert("Error processing image.");
                    }
                }

                const users = getUsers();
                const savedUser = users.find(item=>item.email===currentUser.email);

                if (savedUser) {
                    savedUser.phone = phone;
                    savedUser.profilePic = profilePic;
                    saveUsers(users);
                    saveFirebaseUser(savedUser).catch(console.error);
                }

                currentUser.phone = phone;
                currentUser.profilePic = profilePic;
                setCurrentUser(currentUser);
                alert('Profile updated successfully.');
                location.reload();
            });
        }

        if (applicationForm && user && user.role === 'user') {
            const applications = getApplications();
            const existingApplication = applications.find(item=>item.email===user.email);

            if (existingApplication) {
                document.getElementById('appFullName').value = existingApplication.fullName || '';
                document.getElementById('appEducation').value = existingApplication.education || '';
                document.getElementById('appOccupation').value = existingApplication.occupation || '';
                document.getElementById('appWorkType').value = existingApplication.workType || '';
                document.getElementById('appLocation').value = existingApplication.location || '';
                document.getElementById('appContacts').value = existingApplication.contacts || '';
                document.getElementById('appReason').value = existingApplication.reason || '';
                document.getElementById('appAbout').value = existingApplication.about || '';

                if (applicationNotice) {
                    applicationNotice.textContent = existingApplication.status === 'approved'
                        ? 'Your application has been approved. You can now claim tasks.'
                        : 'Your application is in review. Waiting for admin response.';
                }
            }

            applicationForm.addEventListener('submit', (event)=>{
                event.preventDefault();

                const updatedApplications = getApplications();
                const application = {
                    email: user.email,
                    name: user.name,
                    fullName: document.getElementById('appFullName').value.trim(),
                    education: document.getElementById('appEducation').value.trim(),
                    occupation: document.getElementById('appOccupation').value.trim(),
                    workType: document.getElementById('appWorkType').value,
                    location: document.getElementById('appLocation').value.trim(),
                    contacts: document.getElementById('appContacts').value.trim(),
                    reason: document.getElementById('appReason').value.trim(),
                    about: document.getElementById('appAbout').value.trim(),
                    status: 'pending'
                };

                const index = updatedApplications.findIndex(item=>item.email===user.email);

                if (index >= 0) {
                    updatedApplications[index] = application;
                } else {
                    updatedApplications.push(application);
                }

                saveApplications(updatedApplications);
                if (window.AppData) {
                    window.AppData.upsertItem('applications', {
                        ...application,
                        createdAt: existingApplication && existingApplication.createdAt ? existingApplication.createdAt : new Date().toISOString()
                    }).catch(console.error);
                }

                if (applicationNotice) {
                    applicationNotice.textContent = 'Your application is in review. Waiting for admin response.';
                }

                alert('Application submitted. In review, waiting for admin response.');
            });
        }

        if (container && user && user.role === 'user' && !user.activated){
            const banner = document.createElement('div');
            banner.id = 'activationBanner';
            banner.style.background = '#fff3cd';
            banner.style.border = '1px solid #ffeeba';
            banner.style.padding = '10px';
            banner.style.margin = '10px 0';
            if (user.activationPaid) {
                banner.textContent = 'Payment prompt sent. Please wait for the admin to activate your account.';
                container.insertBefore(banner, container.firstChild);
                return;
            }

            banner.textContent = 'Your account is not activated yet. ';
            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('data-activate', '');
            button.textContent = 'Activate Account';
            button.style.marginLeft = '10px';
            button.style.background = '#10b981';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.padding = '8px 12px';
            button.style.borderRadius = '6px';
            button.style.cursor = 'pointer';
            banner.appendChild(button);
            container.insertBefore(banner, container.firstChild);
        }
    });

    window.addEventListener('appdata:changed', (event) => {
        if (!event.detail || event.detail.collection !== 'users') return;

        const previousUser = getCurrentUser();
        const refreshedUser = refreshCurrentUser();

        if (!previousUser || !refreshedUser || previousUser.email !== refreshedUser.email) return;
        if (previousUser.activated !== refreshedUser.activated || previousUser.activationPaid !== refreshedUser.activationPaid) {
            location.reload();
        }
    });

})();
