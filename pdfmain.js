// PDFNest API Client
class PDFNestAPI {
    constructor() {
        this.baseURL = window.PDFNEST_API.BASE_URL;
        this.token = localStorage.getItem('pdfnest_token');
        this.user = null;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authentication header if token exists
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async register(email, password, displayName) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                displayName
            })
        });

        if (data.success) {
            this.setAuthData(data.data.token, data.data.user);
        }

        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success) {
            this.setAuthData(data.data.token, data.data.user);
        }

        return data;
    }

    async getProfile() {
        const data = await this.request('/auth/profile');

        if (data.success) {
            this.user = data.data.user;
        }

        return data;
    }

    async updateProfile(displayName) {
        const data = await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ displayName })
        });

        if (data.success) {
            this.user = data.data.user;
        }

        return data;
    }

    async changePassword(currentPassword, newPassword) {
        return await this.request('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    // File methods
    async uploadFiles(files, categoryId = 'uncategorized') {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        formData.append('categoryId', categoryId);

        const data = await this.request('/files/upload', {
            method: 'POST',
            headers: {}, // Let browser set content-type for FormData
            body: formData
        });

        // Update user storage usage if upload successful
        if (data.success && this.user) {
            this.user.storage_used = data.data.storageUsed;
        }

        return data;
    }

    async getFiles(categoryId = null) {
        const params = categoryId ? `?categoryId=${categoryId}` : '';
        const data = await this.request(`/files${params}`);
        return data;
    }

    async downloadFile(fileId) {
        const url = `${this.baseURL}/files/download/${fileId}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        return response.blob();
    }

    async deleteFile(fileId) {
        const data = await this.request(`/files/${fileId}`, {
            method: 'DELETE'
        });

        // Update user storage usage if deletion successful
        if (data.success && this.user) {
            this.user.storage_used = data.data.storageUsed;
        }

        return data;
    }

    async updateFileCategory(fileId, categoryId) {
        return await this.request(`/files/${fileId}/category`, {
            method: 'PUT',
            body: JSON.stringify({ categoryId })
        });
    }

    async getStorageUsage() {
        return await this.request('/files/storage/usage');
    }

    // Category methods
    async getCategories() {
        return await this.request('/categories');
    }

    async addCategory(name, color = 'bg-gray-100 text-gray-700') {
        return await this.request('/categories', {
            method: 'POST',
            body: JSON.stringify({ name, color })
        });
    }

    async updateCategory(categoryId, name, color) {
        return await this.request(`/categories/${categoryId}`, {
            method: 'PUT',
            body: JSON.stringify({ name, color })
        });
    }

    async deleteCategory(categoryId) {
        return await this.request(`/categories/${categoryId}`, {
            method: 'DELETE'
        });
    }

    // Auth utility methods
    setAuthData(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('pdfnest_token', token);
        localStorage.setItem('pdfnest_user', JSON.stringify(user));
    }

    clearAuthData() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('pdfnest_token');
        localStorage.removeItem('pdfnest_user');
    }

    isAuthenticated() {
        return !!this.token;
    }

    // Initialize from localStorage
    initFromStorage() {
        const token = localStorage.getItem('pdfnest_token');
        const user = localStorage.getItem('pdfnest_user');

        if (token && user) {
            this.token = token;
            try {
                this.user = JSON.parse(user);
                return true;
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.clearAuthData();
            }
        }
        return false;
    }
}

// Initialize API client
const pdfnestAPI = new PDFNestAPI();

// Global authentication functions
window.signInWithEmail = async function(email, password) {
    try {
        const result = await pdfnestAPI.login(email, password);
        console.log('✅ Email sign-in successful:', result.data.user.email);

        // Update UI
        updateUserHeader();
        await loadUserFiles();

        return result.data.user;
    } catch (err) {
        console.error('❌ Email sign-in failed:', err);
        throw err;
    }
};

window.signUpWithEmail = async function(email, password, displayName) {
    try {
        const result = await pdfnestAPI.register(email, password, displayName);
        console.log('✅ Email signup successful:', result.data.user.email);
        console.log('📧 Registration completed');

        // Update UI
        updateUserHeader();
        await loadUserFiles();

        return result.data.user;
    } catch (err) {
        console.error('❌ Email signup failed:', err);
        throw err;
    }
};

// For Google OAuth, we'll need to implement it differently since we're not using Firebase
window.signInWithGoogle = async function() {
    try {
        // Google OAuth would need to be implemented with a different library
        // For now, show a message
        alert('Google sign-in will be available soon. Please use email/password to sign in.');
        throw new Error('Google sign-in not yet implemented');
    } catch (err) {
        console.error('❌ Google sign-in failed:', err);
        throw err;
    }
};

window.resetPassword = async function(email) {
    try {
        // This would need to be implemented with a separate email service
        alert('Password reset will be available soon. Please contact support for assistance.');
        return true;
    } catch (err) {
        console.error('❌ Password reset failed:', err);
        throw err;
    }
};

window.signOut = async function() {
    try {
        pdfnestAPI.clearAuthData();
        console.log('✅ User signed out');

        // Show auth screen and hide main app
        const authScreen = document.getElementById('auth-screen');
        const mainContainer = document.getElementById('main-container');

        if (authScreen) authScreen.classList.remove('hidden');
        if (mainContainer) mainContainer.classList.add('hidden');

        // Clear global files array
        if (typeof window.files !== 'undefined') {
            window.files = [];
        }
    } catch (err) {
        console.error('❌ Sign out failed:', err);
    }
};

// App initialization functions
function showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const mainContainer = document.getElementById('main-container');

    if (authScreen) authScreen.classList.remove('hidden');
    if (mainContainer) mainContainer.classList.add('hidden');
}

function showMainApp() {
    const authScreen = document.getElementById('auth-screen');
    const mainContainer = document.getElementById('main-container');

    if (authScreen) authScreen.classList.add('hidden');
    if (mainContainer) mainContainer.classList.remove('hidden');

    // Update user header information
    updateUserHeader();
}

function updateUserHeader() {
    const user = pdfnestAPI.user;
    if (!user) return;

    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const userAvatar = document.getElementById('user-avatar');

    if (userName) {
        userName.textContent = user.display_name || user.email.split('@')[0];
    }

    if (userEmail) {
        userEmail.textContent = user.email;
    }

    if (userAvatar) {
        // For now, use default avatar since we don't have Google profile photos
        userAvatar.innerHTML = `
            <svg class="icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
            </svg>
        `;
    }
}

// Check authentication state on page load
async function checkAuthState() {
    try {
        // Try to initialize from localStorage first
        if (pdfnestAPI.initFromStorage()) {
            // Verify token is still valid by fetching profile
            await pdfnestAPI.getProfile();
            showMainApp();
            await loadUserFiles();
            await loadUserCategories();
        } else {
            showAuthScreen();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        pdfnestAPI.clearAuthData();
        showAuthScreen();
    }
}

// Load user files
async function loadUserFiles(categoryId = null) {
    try {
        const result = await pdfnestAPI.getFiles(categoryId);

        if (result.success) {
            const userFiles = result.data.files.map(file => ({
                id: file.id,
                name: file.name.replace('.pdf', ''),
                size: file.size,
                url: `${pdfnestAPI.baseURL}/files/download/${file.id}`,
                categoryId: file.categoryId || 'uncategorized',
                uploadedAt: file.uploadedAt,
                file: null, // Will be loaded when needed for PDF viewer
                dataUrl: null // Will be loaded when needed
            }));

            // Update global files array for the UI
            window.files = userFiles;

            // Update files array in pdfscript.js if it exists
            if (typeof window.updatePDFScriptFiles === 'function') {
                window.updatePDFScriptFiles(userFiles);
            }

            // Trigger UI update if function exists
            if (typeof window.updateUI === 'function') {
                window.updateUI();
            }

            console.log('✅ Loaded', userFiles.length, 'files for user');
        }
    } catch (err) {
        console.error('❌ Error loading user files:', err);
    }
}

// Load user categories
async function loadUserCategories() {
    try {
        const result = await pdfnestAPI.getCategories();

        if (result.success && result.data.categories.length > 0) {
            // Update categories in pdfscript.js if it exists
            if (typeof window.updateCategoriesFromAPI === 'function') {
                window.updateCategoriesFromAPI(result.data.categories);
            }
        }
    } catch (err) {
        console.error('❌ Error loading categories:', err);
    }
}

// Update storage display
async function updateStorageDisplay() {
    try {
        if (!pdfnestAPI.isAuthenticated()) return;

        const result = await pdfnestAPI.getStorageUsage();
        if (result.success) {
            const { currentUsage, quota, usagePercentage } = result.data;
            const usageMB = (currentUsage / (1024 * 1024)).toFixed(1);
            const quotaMB = (quota / (1024 * 1024)).toFixed(1);

            const storageDisplay = document.getElementById('storage-display');
            if (storageDisplay) {
                const storageFill = storageDisplay.querySelector('.storage-fill');
                const storageText = storageDisplay.querySelector('.storage-text');

                if (storageText) {
                    storageText.textContent = `${usageMB}MB / ${quotaMB}MB`;
                }

                if (storageFill) {
                    storageFill.style.width = `${usagePercentage}%`;

                    // Update color based on usage
                    storageFill.className = 'storage-fill';
                    if (usagePercentage > 90) {
                        storageFill.classList.add('danger');
                    } else if (usagePercentage > 80) {
                        storageFill.classList.add('warning');
                    }
                }
            }

            // Show upgrade button if usage > 80%
            const upgradeBtn = document.getElementById('upgrade-storage-btn');
            if (upgradeBtn) {
                upgradeBtn.style.display = usagePercentage > 80 ? 'block' : 'none';
            }

            // Update global storage quota for validation
            if (typeof window.updateStorageQuota === 'function') {
                window.updateStorageQuota(quota);
            }
        }
    } catch (err) {
        console.error('❌ Error updating storage display:', err);
    }
}

// File upload handler for the UI
window.handleFileUploadAPI = async function(files, categoryId = 'uncategorized') {
    try {
        if (!pdfnestAPI.isAuthenticated()) {
            alert('Please sign in to upload files.');
            showAuthScreen();
            return;
        }

        // Validate files
        const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
        if (pdfFiles.length === 0) {
            alert('Only PDF files are allowed!');
            return;
        }

        // Show progress
        const progressBar = document.getElementById('uploadProgress');
        if (progressBar) {
            progressBar.style.display = 'block';
            progressBar.value = 0;
        }

        // Upload files
        const result = await pdfnestAPI.uploadFiles(pdfFiles, categoryId);

        if (result.success) {
            // Reload files and update UI
            await loadUserFiles(categoryId);
            await updateStorageDisplay();

            // Hide progress
            if (progressBar) {
                progressBar.style.display = 'none';
            }

            return result;
        }
    } catch (error) {
        console.error('Upload failed:', error);

        // Hide progress
        const progressBar = document.getElementById('uploadProgress');
        if (progressBar) {
            progressBar.style.display = 'none';
        }

        if (error.message.includes('quota exceeded')) {
            // Show upgrade modal
            const modal = document.getElementById('upgrade-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        } else {
            alert('Upload failed: ' + error.message);
        }
    }
};

// Make API client globally available
window.pdfnestAPI = pdfnestAPI;
window.loadUserFiles = loadUserFiles;
window.loadUserCategories = loadUserCategories;
window.updateStorageDisplay = updateStorageDisplay;

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { pdfnestAPI };
}