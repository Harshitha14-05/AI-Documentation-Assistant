// Dashboard functionality
let currentSection = 'chat';
let documents = [];
let isUploading = false;

// Logout function
function logout() {
    fetch('/logout', { method: 'GET' })
        .then(() => {
            window.location.href = '/';
        })
        .catch(() => {
            window.location.href = '/';
        });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    loadDocuments();
    loadUserInfo();
    initializeChat();
    initializeUpload();
    initializeProfile();
});

// Load user information
async function loadUserInfo() {
    try {
        const response = await fetch('/api/user_info');
        const result = await response.json();
        
        if (result.success) {
            // Update profile picture if available
            const profilePic = document.getElementById('profilePic');
            if (profilePic && result.user.profile_pic !== 'default-avatar.png') {
                profilePic.src = `/static/profile_pics/${result.user.profile_pic}?${Date.now()}`;
            }
            
            // Update profile form if in profile section
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            if (nameInput) nameInput.value = result.user.name;
            if (emailInput) emailInput.value = result.user.email;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

function initializeDashboard() {
    // Menu item click handlers
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Show initial section
    showSection('chat');
}

function showSection(sectionName) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Update header
    const titles = {
        'chat': { title: 'Chat Assistant', subtitle: 'Ask questions about your documents' },
        'documents': { title: 'My Documents', subtitle: 'Manage your uploaded files' },
        'upload': { title: 'Upload Files', subtitle: 'Add new documents to your knowledge base' },
        'profile': { title: 'Profile Settings', subtitle: 'Manage your account information' }
    };
    
    const titleData = titles[sectionName];
    document.getElementById('section-title').textContent = titleData.title;
    document.getElementById('section-subtitle').textContent = titleData.subtitle;
    
    currentSection = sectionName;
    
    // Load section-specific data
    if (sectionName === 'documents') {
        loadDocuments();
    } else if (sectionName === 'profile') {
        loadProfile();
    } else if (sectionName === 'chat') {
        loadChatHistory();
    }
}

// Chat functionality
async function initializeChat() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    
    // Load chat history when initializing
    await loadChatHistory();
    
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const question = chatInput.value.trim();
        if (!question) return;
        
        // Add user message
        addMessage(question, 'user');
        chatInput.value = '';
        
        // Add loading message
        const loadingId = addLoadingMessage();
        
        try {
            const response = await fetch('/ask_question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question })
            });
            
            const result = await response.json();
            
            // Remove loading message
            removeLoadingMessage(loadingId);
            
            if (result.success) {
                addMessage(result.answer, 'assistant', result.sources);
            } else {
                addMessage(result.message || 'Sorry, I encountered an error.', 'assistant');
            }
        } catch (error) {
            removeLoadingMessage(loadingId);
            addMessage('Sorry, I encountered an error while processing your question.', 'assistant');
        }
    });
}

async function loadChatHistory() {
    try {
        const response = await fetch('/get_chat_history');
        const result = await response.json();
        
        if (result.success && result.history.length > 0) {
            const chatMessages = document.getElementById('chatMessages');
            // Clear existing messages but keep welcome message
            const welcomeMessage = chatMessages.querySelector('.welcome-message');
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
            
            result.history.forEach(chat => {
                addMessage(chat.question, 'user');
                addMessage(chat.answer, 'assistant', chat.sources);
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

function addMessage(content, sender, sources = []) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${sender}`;
    
    let sourcesHtml = '';
    if (sources && sources.length > 0) {
        sourcesHtml = `
            <div class="message-sources">
                <strong>Sources:</strong> ${sources.join(', ')}
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${content}
            ${sourcesHtml}
        </div>
    `;
    
    // Remove welcome message if it exists
    const welcomeMessage = chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLoadingMessage() {
    const chatMessages = document.getElementById('chatMessages');
    const loadingId = 'loading-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-assistant';
    messageDiv.id = loadingId;
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas fa-spinner fa-spin"></i> Thinking...
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return loadingId;
}

function removeLoadingMessage(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Documents functionality
async function loadDocuments() {
    try {
        const response = await fetch('/get_documents');
        const result = await response.json();
        
        if (result.documents) {
            documents = result.documents;
            renderDocuments();
        }
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

function renderDocuments() {
    const documentsGrid = document.getElementById('documentsGrid');
    
    if (documents.length === 0) {
        documentsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;">
                    <i class="fas fa-folder-open"></i>
                </div>
                <h3 style="color: #666; margin-bottom: 1rem;">No documents uploaded yet</h3>
                <p style="color: #999;">Upload your first document to get started with the AI assistant</p>
                <button class="btn btn-primary" onclick="showSection('upload')" style="margin-top: 1rem;">
                    <i class="fas fa-upload"></i> Upload Document
                </button>
            </div>
        `;
        return;
    }
    
    documentsGrid.innerHTML = documents.map(doc => `
        <div class="document-card">
            <div class="document-icon">
                <i class="${getFileIcon(doc.filename)}"></i>
            </div>
            <div class="document-name">${doc.filename}</div>
            <div class="document-date">Uploaded: ${formatDate(doc.upload_date)}</div>
            <div class="document-actions">
                <button class="btn btn-danger btn-small" onclick="deleteDocument('${doc.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function deleteDocument(docId) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }
    
    try {
        const response = await fetch(`/delete_document/${docId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            loadDocuments();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Error deleting document', 'error');
    }
}

// Upload functionality
function initializeUpload() {
    const fileInput = document.getElementById('fileInput');
    const fileDropArea = document.getElementById('fileDropArea');
    const uploadProgress = document.getElementById('uploadProgress');
    
    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop handlers
    fileDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropArea.classList.add('dragover');
    });
    
    fileDropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileDropArea.classList.remove('dragover');
    });
    
    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    // Browse link click handler
    fileDropArea.addEventListener('click', () => {
        if (!isUploading) {
            fileInput.click();
        }
    });
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (isUploading) return;
    
    const allowedExtensions = ['pdf', 'docx', 'txt', 'csv'];
    
    Array.from(files).forEach(file => {
        if (validateFile(file, allowedExtensions)) {
            uploadFile(file);
        } else {
            showNotification(`Invalid file type: ${file.name}. Supported formats: PDF, DOCX, TXT, CSV`, 'error');
        }
    });
}

async function uploadFile(file) {
    if (isUploading) return;
    
    isUploading = true;
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = uploadProgress.querySelector('.progress-fill');
    const progressText = document.getElementById('uploadProgress').querySelector('.progress-text');
    
    uploadProgress.style.display = 'block';
    progressText.textContent = `Uploading ${file.name}...`;
    
    // Simulate progress animation
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressFill.style.width = progress + '%';
    }, 200);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/upload_document', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        
        setTimeout(() => {
            if (result.success) {
                showNotification(result.message, 'success');
                loadDocuments();
                
                // Reset form
                document.getElementById('fileInput').value = '';
                uploadProgress.style.display = 'none';
                progressFill.style.width = '0%';
            } else {
                showNotification(result.message, 'error');
                uploadProgress.style.display = 'none';
                progressFill.style.width = '0%';
            }
            
            isUploading = false;
        }, 1000);
        
    } catch (error) {
        clearInterval(progressInterval);
        showNotification('Error uploading file', 'error');
        uploadProgress.style.display = 'none';
        progressFill.style.width = '0%';
        isUploading = false;
    }
}

// Profile functionality
function initializeProfile() {
    const profileForm = document.getElementById('profileForm');
    const profilePicContainer = document.querySelector('.profile-pic-container');
    const profilePicInput = document.getElementById('profilePicInput');
    
    // Profile picture click handler
    profilePicContainer.addEventListener('click', () => {
        profilePicInput.click();
    });
    
    // Profile picture change handler
    profilePicInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const allowedTypes = ['png', 'jpg', 'jpeg', 'gif'];
        const fileType = file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileType)) {
            showNotification('Invalid image type. Please use PNG, JPG, JPEG, or GIF.', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/upload_profile_pic', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification(result.message, 'success');
                // Update profile picture display
                const profilePic = document.getElementById('profilePic');
                profilePic.src = `/static/profile_pics/${result.profile_pic}?${Date.now()}`;
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            showNotification('Error uploading profile picture', 'error');
        }
    });
    
    // Profile form submit handler
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = profileForm.querySelector('.btn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        
        // Show loading state
        btn.classList.add('loading');
        btnText.style.opacity = '0';
        btnLoader.style.opacity = '1';
        
        const formData = {
            name: profileForm.name.value,
            password: profileForm.password.value
        };
        
        try {
            const response = await fetch('/update_profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification(result.message, 'success');
                // Clear password field
                profileForm.password.value = '';
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            showNotification('Error updating profile', 'error');
        } finally {
            // Hide loading state
            btn.classList.remove('loading');
            btnText.style.opacity = '1';
            btnLoader.style.opacity = '0';
        }
    });
}

async function loadProfile() {
    // Load current user data
    await loadUserInfo();
}

// Make showSection available globally
window.showSection = showSection;