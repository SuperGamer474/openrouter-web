// FULL UPDATED CHAT APP JS — Locked to GPT OSS 120B only and NO API KEY POPUP
// Model: gpt-oss-120b (labelled 'GPT OSS 120B')

// Application State
const appState = {
    apiKey: "null",
    currentChatId: null,
    chats: {},
    selectedModel: 'gpt-oss-120b',

    fallbackModels: [],
    settings: {
        temperature: 1.0,
        topP: 1.0,
        topK: 0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        repetitionPenalty: 1.0,
        minP: 0.0,
        topA: 0.0,
        seed: null,
        maxTokens: null,
        logprobs: false,
        topLogprobs: null,
        streaming: true,
        reasoning: {
            effort: null,
            maxTokens: null,
            exclude: false
        }
    },
    uploadedFiles: [],
    currentlyStreaming: false,
    streamController: null
};

async function fetchApiKey() {
    try {
        const apiKey = "csk-nhykr5xjwe495twcvtx383wh3vnyj2n4x9nr26k56mje6jxr"
        appState.apiKey = apiKey;
        localStorage.setItem('apiKey', apiKey);
        sessionStorage.setItem('apiKey', apiKey);
        console.log('API key loaded successfully ✅');
    } catch (err) {
        console.error('Error fetching API key:', err);
        appState.apiKey = ''; // fallback to empty
    }
}

// ONE model only
const models = [
    { label: 'GPT OSS 120B', value: 'gpt-oss-120b', context: 131072 }
];

// DOM Elements
const elements = {
    apiKeyModal: document.getElementById('apiKeyModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    apiKeySubmit: document.getElementById('apiKeySubmit'),
    leavePageModal: document.getElementById('leavePageModal'),
    confirmLeavePage: document.getElementById('confirmLeavePage'),
    chatMessages: document.getElementById('chatMessages'),
    promptEditor: document.getElementById('promptEditor'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    fileUploadBtn: document.getElementById('fileUploadBtn'),
    fileInput: document.getElementById('fileInput'),
    fileAttachments: document.getElementById('fileAttachments'),
    newChatBtn: document.getElementById('newChatBtn'),
    modelDropdown: document.getElementById('modelDropdown'),
    modelDropdownMenu: document.getElementById('modelDropdownMenu'),
    modelSettingsBtn: document.getElementById('modelSettingsBtn'),
    modelSettingsModal: document.getElementById('modelSettingsModal'),
    exportChatBtn: document.getElementById('exportChatBtn'),
    importChatBtn: document.getElementById('importChatBtn'),
    deleteChatBtn: document.getElementById('deleteChatBtn'),
    tokenCounter: document.getElementById('tokenCounter'),
    messageReceivedSound: document.getElementById('messageReceivedSound'),
    errorSound: document.getElementById('errorSound'),

    // Model settings elements
    temperatureSlider: document.getElementById('temperatureSlider'),
    temperatureValue: document.getElementById('temperatureValue'),
    topPSlider: document.getElementById('topPSlider'),
    topPValue: document.getElementById('topPValue'),
    topKSlider: document.getElementById('topKSlider'),
    topKValue: document.getElementById('topKValue'),
    frequencyPenaltySlider: document.getElementById('frequencyPenaltySlider'),
    frequencyPenaltyValue: document.getElementById('frequencyPenaltyValue'),
    presencePenaltySlider: document.getElementById('presencePenaltySlider'),
    presencePenaltyValue: document.getElementById('presencePenaltyValue'),
    repetitionPenaltySlider: document.getElementById('repetitionPenaltySlider'),
    repetitionPenaltyValue: document.getElementById('repetitionPenaltyValue'),
    minPSlider: document.getElementById('minPSlider'),
    minPValue: document.getElementById('minPValue'),
    topASlider: document.getElementById('topASlider'),
    topAValue: document.getElementById('topAValue'),
    seedInput: document.getElementById('seedInput'),
    maxTokensInput: document.getElementById('maxTokensInput'),
    logprobsCheckbox: document.getElementById('logprobsCheckbox'),
    topLogprobsInput: document.getElementById('topLogprobsInput'),
    streamingCheckbox: document.getElementById('streamingCheckbox'),
    reasoningEffortSelect: document.getElementById('reasoningEffortSelect'),
    reasoningTokensInput: document.getElementById('reasoningTokensInput'),
    excludeReasoningCheckbox: document.getElementById('excludeReasoningCheckbox'),
    resetSettingsBtn: document.getElementById('resetSettingsBtn')
};

// Bootstrap Modal Instances (we won't auto-show API key modal)
let apiKeyModalInstance, modelSettingsModalInstance, leavePageModalInstance;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    (async () => {
    // Initialize Bootstrap tooltips if bootstrap exists
    try {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    } catch (e) {
        console.warn('Bootstrap tooltips not available or initialization failed', e);
    }

    // Initialize Bootstrap modals if bootstrap exists
    try {
        apiKeyModalInstance = new bootstrap.Modal(elements.apiKeyModal);
        modelSettingsModalInstance = new bootstrap.Modal(elements.modelSettingsModal);
        leavePageModalInstance = new bootstrap.Modal(elements.leavePageModal);
    } catch (e) {
        // Ignore if bootstrap isn't present — app still works
    }

    // Initialize AOS animations if available
    try { AOS.init({ duration: 800, once: true }); } catch (e) { /* ignore */ }

    // Load api key
    await fetchApiKey();

    // Initialize Event Listeners
    initEventListeners();

    // Initialize rich text editor
    initRichTextEditor();

    // Populate model dropdown (only one model)
    populateModelDropdown();

    // Initialize settings sliders
    initializeSettingsUI();

    // Add MutationObserver to watch for content changes and auto-scroll
    setupMutationObserver();

    preloadSounds();

    // Add window resize handler to fix scrolling on resize
    window.addEventListener('resize', forceScrollToBottom);

    // After basic init, continue app flow
    initializeAfterAuth(); // don't wait for a key — app is usable and key can be saved from settings
    })();
});

function preloadSounds() {
    if (!elements.messageReceivedSound || !elements.errorSound) return;

    elements.messageReceivedSound.load();
    elements.errorSound.load();

    elements.messageReceivedSound.addEventListener('canplaythrough', () => {
        console.log('Success sound loaded successfully');
    });

    elements.errorSound.addEventListener('canplaythrough', () => {
        console.log('Error sound loaded successfully');
    });
}

// Setup mutation observer for chat container
function setupMutationObserver() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const observer = new MutationObserver((mutations) => {
        forceScrollToBottom();
    });

    observer.observe(chatMessages, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false
    });

    console.log("Mutation observer setup for chat messages");
}

// Set up event listeners
function initEventListeners() {
    // NOTE: We do NOT show any API key modal on load. The api key input remains available in settings (if present)

    // Prevent leaving page without confirmation
    window.addEventListener('beforeunload', handleBeforeUnload);
    if (elements.confirmLeavePage) elements.confirmLeavePage.addEventListener('click', () => window.close());

    // Chat UI
    if (elements.promptEditor) {
        elements.promptEditor.addEventListener('keydown', handlePromptKeydown);
        elements.promptEditor.addEventListener('input', updateTokenCount);
    }
    if (elements.sendMessageBtn) elements.sendMessageBtn.addEventListener('click', sendMessage);

    // File Upload - FIXED
    if (elements.fileUploadBtn) elements.fileUploadBtn.addEventListener('click', () => { if (elements.fileInput) elements.fileInput.click(); });
    if (elements.fileInput) elements.fileInput.addEventListener('change', handleFileUpload);

    // Chat Management
    if (elements.newChatBtn) elements.newChatBtn.addEventListener('click', createNewChat);
    if (elements.exportChatBtn) elements.exportChatBtn.addEventListener('click', exportChat);
    if (elements.importChatBtn) elements.importChatBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = handleImportChat;
        input.click();
    });
    if (elements.deleteChatBtn) elements.deleteChatBtn.addEventListener('click', deleteCurrentChat);

    // Model Settings
    if (elements.modelSettingsBtn) elements.modelSettingsBtn.addEventListener('click', () => modelSettingsModalInstance?.show());

    // Settings sliders and inputs
    if (elements.temperatureSlider) elements.temperatureSlider.addEventListener('input', updateSettingValue);
    if (elements.topPSlider) elements.topPSlider.addEventListener('input', updateSettingValue);
    if (elements.topKSlider) elements.topKSlider.addEventListener('input', updateSettingValue);
    if (elements.frequencyPenaltySlider) elements.frequencyPenaltySlider.addEventListener('input', updateSettingValue);
    if (elements.presencePenaltySlider) elements.presencePenaltySlider.addEventListener('input', updateSettingValue);
    if (elements.repetitionPenaltySlider) elements.repetitionPenaltySlider.addEventListener('input', updateSettingValue);
    if (elements.minPSlider) elements.minPSlider.addEventListener('input', updateSettingValue);
    if (elements.topASlider) elements.topASlider.addEventListener('input', updateSettingValue);
    if (elements.resetSettingsBtn) elements.resetSettingsBtn.addEventListener('click', resetSettings);

    // Save settings when settings modal hides
    if (elements.modelSettingsModal) elements.modelSettingsModal.addEventListener('hidden.bs.modal', saveModelSettings);

    console.log("Event listeners initialized");
}

// Initialize the rich text editor
function initRichTextEditor() {
    if (!elements.promptEditor) return;

    elements.promptEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            e.preventDefault();
            sendMessage();
            return;
        }

        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && isPromptEditorScrollable()) {
            const lineHeight = parseInt(getComputedStyle(elements.promptEditor).lineHeight) || 20;
            const scrollAmount = e.key === 'ArrowUp' ? -lineHeight : lineHeight;

            if (e.key === 'ArrowUp' && elements.promptEditor.scrollTop > 0) {
                e.preventDefault();
                elements.promptEditor.scrollTop += scrollAmount;
            } else if (e.key === 'ArrowDown' &&
                elements.promptEditor.scrollTop + elements.promptEditor.clientHeight <
                elements.promptEditor.scrollHeight) {
                e.preventDefault();
                elements.promptEditor.scrollTop += scrollAmount;
            }
        }
    });

    elements.promptEditor.addEventListener('input', debounce(updateTokenCount, 300));
    optimizePromptEditorScrolling();
}

function isPromptEditorScrollable() {
    return elements.promptEditor && elements.promptEditor.scrollHeight > elements.promptEditor.clientHeight;
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function optimizePromptEditorScrolling() {
    if (!elements.promptEditor) return;
    elements.promptEditor.addEventListener('scroll', () => { }, { passive: true });
    elements.promptEditor.style.transform = 'translateZ(0)';
    elements.promptEditor.style.willChange = 'transform';
    elements.promptEditor.style.scrollBehavior = 'auto';

    elements.promptEditor.addEventListener('input', (e) => {
        if (e.target.innerText.length > 5000) {
            e.target.style.willChange = 'contents';
            clearTimeout(e.target.resetTimer);
            e.target.resetTimer = setTimeout(() => {
                e.target.style.willChange = 'transform';
            }, 1000);
        }
    });
}

// Rough token count estimation
function updateTokenCount() {
    if (!elements.promptEditor || !elements.tokenCounter) return;
    const text = elements.promptEditor.innerText || '';
    const tokenEstimate = Math.ceil(text.length / 4);
    elements.tokenCounter.textContent = `~${tokenEstimate} tokens`;
}

function initializeSettingsUI() {
    if (!elements.temperatureValue || !elements.temperatureSlider) return;

    elements.temperatureValue.textContent = appState.settings.temperature.toFixed(1);
    elements.temperatureSlider.value = appState.settings.temperature;

    elements.topPValue && (elements.topPValue.textContent = appState.settings.topP.toFixed(2));
    elements.topPSlider && (elements.topPSlider.value = appState.settings.topP);

    elements.topKValue && (elements.topKValue.textContent = appState.settings.topK);
    elements.topKSlider && (elements.topKSlider.value = appState.settings.topK);

    elements.frequencyPenaltyValue && (elements.frequencyPenaltyValue.textContent = appState.settings.frequencyPenalty.toFixed(1));
    elements.frequencyPenaltySlider && (elements.frequencyPenaltySlider.value = appState.settings.frequencyPenalty);

    elements.presencePenaltyValue && (elements.presencePenaltyValue.textContent = appState.settings.presencePenalty.toFixed(1));
    elements.presencePenaltySlider && (elements.presencePenaltySlider.value = appState.settings.presencePenalty);

    elements.repetitionPenaltyValue && (elements.repetitionPenaltyValue.textContent = appState.settings.repetitionPenalty.toFixed(1));
    elements.repetitionPenaltySlider && (elements.repetitionPenaltySlider.value = appState.settings.repetitionPenalty);

    elements.minPValue && (elements.minPValue.textContent = appState.settings.minP.toFixed(2));
    elements.minPSlider && (elements.minPSlider.value = appState.settings.minP);

    elements.topAValue && (elements.topAValue.textContent = appState.settings.topA.toFixed(2));
    elements.topASlider && (elements.topASlider.value = appState.settings.topA);

    elements.seedInput && (elements.seedInput.value = appState.settings.seed || '');
    elements.maxTokensInput && (elements.maxTokensInput.value = appState.settings.maxTokens || '');

    elements.logprobsCheckbox && (elements.logprobsCheckbox.checked = appState.settings.logprobs);
    elements.topLogprobsInput && (elements.topLogprobsInput.value = appState.settings.topLogprobs || '');

    elements.streamingCheckbox && (elements.streamingCheckbox.checked = appState.settings.streaming);

    elements.reasoningEffortSelect && (elements.reasoningEffortSelect.value = appState.settings.reasoning.effort || '');
    elements.reasoningTokensInput && (elements.reasoningTokensInput.value = appState.settings.reasoning.maxTokens || '');
    elements.excludeReasoningCheckbox && (elements.excludeReasoningCheckbox.checked = appState.settings.reasoning.exclude);

    // Populate API key field in settings UI if present
    if (elements.apiKeyInput) elements.apiKeyInput.value = appState.apiKey || '';
}

function updateSettingValue(e) {
    const element = e.target;
    const value = parseFloat(element.value);

    switch (element.id) {
        case 'temperatureSlider':
            elements.temperatureValue.textContent = value.toFixed(1);
            break;
        case 'topPSlider':
            elements.topPValue.textContent = value.toFixed(2);
            break;
        case 'topKSlider':
            elements.topKValue.textContent = value;
            break;
        case 'frequencyPenaltySlider':
            elements.frequencyPenaltyValue.textContent = value.toFixed(1);
            break;
        case 'presencePenaltySlider':
            elements.presencePenaltyValue.textContent = value.toFixed(1);
            break;
        case 'repetitionPenaltySlider':
            elements.repetitionPenaltyValue.textContent = value.toFixed(1);
            break;
        case 'minPSlider':
            elements.minPValue.textContent = value.toFixed(2);
            break;
        case 'topASlider':
            elements.topAValue.textContent = value.toFixed(2);
            break;
    }
}

function resetSettings() {
    appState.settings = {
        temperature: 1.0,
        topP: 1.0,
        topK: 0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        repetitionPenalty: 1.0,
        minP: 0.0,
        topA: 0.0,
        seed: null,
        maxTokens: null,
        logprobs: false,
        topLogprobs: null,
        streaming: true,
        reasoning: {
            effort: null,
            maxTokens: null,
            exclude: false
        }
    };

    initializeSettingsUI();
}

function saveModelSettings() {
    // Save numeric settings if UI elements exist
    if (elements.temperatureSlider) appState.settings.temperature = parseFloat(elements.temperatureSlider.value);
    if (elements.topPSlider) appState.settings.topP = parseFloat(elements.topPSlider.value);
    if (elements.topKSlider) appState.settings.topK = parseInt(elements.topKSlider.value);
    if (elements.frequencyPenaltySlider) appState.settings.frequencyPenalty = parseFloat(elements.frequencyPenaltySlider.value);
    if (elements.presencePenaltySlider) appState.settings.presencePenalty = parseFloat(elements.presencePenaltySlider.value);
    if (elements.repetitionPenaltySlider) appState.settings.repetitionPenalty = parseFloat(elements.repetitionPenaltySlider.value);
    if (elements.minPSlider) appState.settings.minP = parseFloat(elements.minPSlider.value);
    if (elements.topASlider) appState.settings.topA = parseFloat(elements.topASlider.value);

    const seedValue = elements.seedInput ? elements.seedInput.value.trim() : '';
    appState.settings.seed = seedValue ? parseInt(seedValue) : null;

    const maxTokensValue = elements.maxTokensInput ? elements.maxTokensInput.value.trim() : '';
    appState.settings.maxTokens = maxTokensValue ? parseInt(maxTokensValue) : null;

    appState.settings.logprobs = elements.logprobsCheckbox ? elements.logprobsCheckbox.checked : false;

    const topLogprobsValue = elements.topLogprobsInput ? elements.topLogprobsInput.value.trim() : '';
    appState.settings.topLogprobs = topLogprobsValue ? parseInt(topLogprobsValue) : null;

    appState.settings.streaming = elements.streamingCheckbox ? elements.streamingCheckbox.checked : true;

    // Reasoning settings
    appState.settings.reasoning.effort = elements.reasoningEffortSelect ? elements.reasoningEffortSelect.value || null : null;

    const reasoningTokensValue = elements.reasoningTokensInput ? elements.reasoningTokensInput.value.trim() : '';
    appState.settings.reasoning.maxTokens = reasoningTokensValue ? parseInt(reasoningTokensValue) : null;

    appState.settings.reasoning.exclude = elements.excludeReasoningCheckbox ? elements.excludeReasoningCheckbox.checked : false;

    // Save API key from settings input (NO POPUP)
    if (elements.apiKeyInput) {
        const key = elements.apiKeyInput.value.trim();
        if (key) {
            appState.apiKey = key;
            // Persist to localStorage so next load has it
            localStorage.setItem('apiKey', key);
            sessionStorage.setItem('apiKey', key);
        }
    }

    // Save settings to localStorage
    saveAppState();
}

// Initialize app after "auth" (no modal required)
function initializeAfterAuth() {
    loadAppState();

    if (Object.keys(appState.chats).length === 0) {
        createNewChat();
    } else {
        const chatIds = Object.keys(appState.chats);
        const lastChatId = chatIds[chatIds.length - 1];
        loadChat(lastChatId);
    }
}

function loadAppState() {
    const savedState = localStorage.getItem('llmChatAppState');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            appState.chats = parsedState.chats || {};
            appState.selectedModel = parsedState.selectedModel || appState.selectedModel;
            appState.settings = parsedState.settings || appState.settings;

            // If the selected model somehow got changed elsewhere, force back to GPT OSS 120B
            appState.selectedModel = 'gpt-oss-120b';

            updateModelDropdown();
            initializeSettingsUI();
        } catch (e) {
            console.warn('Failed to parse saved app state', e);
        }
    }
}

function saveAppState() {
    const stateToSave = {
        chats: appState.chats,
        selectedModel: appState.selectedModel,
        settings: appState.settings
    };
    localStorage.setItem('llmChatAppState', JSON.stringify(stateToSave));
}

function populateModelDropdown() {
    if (!elements.modelDropdownMenu || !elements.modelDropdown) return;
    elements.modelDropdownMenu.innerHTML = '';

    models.forEach(model => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.classList.add('dropdown-item');
        a.href = '#';
        a.textContent = model.label;
        a.dataset.value = model.value;

        // Only one model — show active and prevent switching to anything else
        if (model.value === appState.selectedModel) {
            a.classList.add('active');
            elements.modelDropdown.textContent = model.label;
        }

        // Clicking will still set the model, but there's nowhere else to pick
        a.addEventListener('click', (e) => {
            e.preventDefault();
            changeModel(model.value, model.label);
        });

        li.appendChild(a);
        elements.modelDropdownMenu.appendChild(li);
    });
}

function updateModelDropdown() {
    const selectedModelObj = models.find(model => model.value === appState.selectedModel);
    if (selectedModelObj && elements.modelDropdown) {
        elements.modelDropdown.textContent = selectedModelObj.label;
        const dropdownItems = elements.modelDropdownMenu.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            if (item.dataset.value === appState.selectedModel) item.classList.add('active'); else item.classList.remove('active');
        });
    }
}

function changeModel(modelValue, modelLabel) {
    // Force lock to GPT OSS 120B — ignore attempts to select anything else
    appState.selectedModel = 'gpt-oss-120b';
    elements.modelDropdown && (elements.modelDropdown.textContent = 'GPT OSS 120B');
    createNewChat();
    saveAppState();
}

function createNewChat() {
    const chatId = 'chat_' + Date.now();
    appState.chats[chatId] = {
        id: chatId,
        title: 'New Conversation',
        model: appState.selectedModel,
        messages: [],
        createdAt: new Date().toISOString()
    };

    appState.currentChatId = chatId;
    elements.chatMessages && (elements.chatMessages.innerHTML = '');
    if (elements.promptEditor) elements.promptEditor.innerHTML = '';
    clearUploadedFiles();
    saveAppState();

    const systemMessageElement = document.createElement('div');
    systemMessageElement.className = 'system-message';
    systemMessageElement.textContent = `New conversation started with GPT OSS 120B`;
    elements.chatMessages && elements.chatMessages.appendChild(systemMessageElement);
}

function getModelLabel(modelValue) {
    const model = models.find(m => m.value === modelValue);
    return model ? model.label : modelValue;
}

function loadChat(chatId) {
    if (!appState.chats[chatId]) return;

    appState.currentChatId = chatId;
    const chatItems = document.querySelectorAll('.chat-history-item');
    chatItems.forEach(item => {
        if (item.dataset.chatId === chatId) item.classList.add('active'); else item.classList.remove('active');
    });

    elements.chatMessages && (elements.chatMessages.innerHTML = '');
    if (elements.promptEditor) elements.promptEditor.innerHTML = '';
    clearUploadedFiles();

    const chat = appState.chats[chatId];
    const systemMessageElement = document.createElement('div');
    systemMessageElement.className = 'system-message';
    systemMessageElement.textContent = `Loaded conversation with ${getModelLabel(chat.model)}`;
    elements.chatMessages && elements.chatMessages.appendChild(systemMessageElement);

    chat.messages.forEach(message => renderMessage(message));
    scrollToBottom();
}

function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (elements.promptEditor) elements.promptEditor.contentEditable = "false";
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'file-loading-indicator';
    loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading file...';
    elements.fileAttachments && elements.fileAttachments.appendChild(loadingIndicator);

    let filesProcessed = 0;
    Array.from(files).forEach(file => {
        if (isTextFile(file)) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const fileContent = event.target.result;
                const formattedContent = `\n\nFile: ${file.name}\n${'='.repeat(file.name.length + 6)}\n${fileContent}\n${'='.repeat(file.name.length + 6)}\n\n`;
                if (elements.promptEditor) elements.promptEditor.innerHTML += formattedContent.replace(/\n/g, '<br>');
                filesProcessed++;
                if (filesProcessed === files.length) {
                    if (elements.promptEditor) elements.promptEditor.contentEditable = "true";
                    loadingIndicator.parentNode && loadingIndicator.parentNode.removeChild(loadingIndicator);
                    placeCursorAtEnd(elements.promptEditor);
                    updateTokenCount();
                }
            };
            reader.onerror = function (event) {
                console.error("File read error:", event.target.error);
                alert(`Error reading file: ${file.name}`);
                filesProcessed++;
                if (filesProcessed === files.length) {
                    if (elements.promptEditor) elements.promptEditor.contentEditable = "true";
                    loadingIndicator.parentNode && loadingIndicator.parentNode.removeChild(loadingIndicator);
                }
            };
            reader.readAsText(file);
        } else {
            alert(`File type not supported: ${file.type}`);
            filesProcessed++;
            if (filesProcessed === files.length) {
                if (elements.promptEditor) elements.promptEditor.contentEditable = "true";
                loadingIndicator.parentNode && loadingIndicator.parentNode.removeChild(loadingIndicator);
            }
        }
    });
}

function isTextFile(file) {
    const textTypes = [
        'text/',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/xhtml+xml',
        'application/x-sh',
        'application/x-javascript',
        'application/x-httpd-php',
        'application/x-python',
        'application/x-ruby',
        'application/csv'
    ];

    const textExtensions = [
        '.txt', '.md', '.js', '.html', '.css', '.py', '.sh', '.json', '.csv',
        '.xml', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.c', '.cpp',
        '.h', '.java', '.php', '.rb', '.pl', '.sql', '.ts', '.jsx', '.tsx'
    ];

    const isTextMime = file.type && textTypes.some(type => file.type.startsWith(type));
    const fileName = file.name.toLowerCase();
    const isTextExt = textExtensions.some(ext => fileName.endsWith(ext));

    return isTextMime || isTextExt;
}

function addFileAttachment(fileName) {
    if (!elements.fileAttachments) return;
    const fileAttachment = document.createElement('div');
    fileAttachment.className = 'file-attachment';
    fileAttachment.dataset.fileName = fileName;

    const fileIcon = document.createElement('i');
    fileIcon.className = 'fas fa-file';

    const fileNameSpan = document.createElement('span');
    fileNameSpan.className = 'file-name';
    fileNameSpan.textContent = fileName;

    const removeButton = document.createElement('i');
    removeButton.className = 'fas fa-times remove-file';
    removeButton.addEventListener('click', () => removeFileAttachment(fileName));

    fileAttachment.appendChild(fileIcon);
    fileAttachment.appendChild(fileNameSpan);
    fileAttachment.appendChild(removeButton);

    elements.fileAttachments.appendChild(fileAttachment);
}

function removeFileAttachment(fileName) {
    const fileAttachment = document.querySelector(`.file-attachment[data-file-name="${fileName}"]`);
    if (fileAttachment) fileAttachment.remove();

    appState.uploadedFiles = appState.uploadedFiles.filter(file => file.name !== fileName);
    updateTokenCount();
}

function clearUploadedFiles() {
    if (elements.fileAttachments) elements.fileAttachments.innerHTML = '';
    appState.uploadedFiles = [];
    updateTokenCount();
}

function formatFileContents() {
    if (appState.uploadedFiles.length === 0) return '';
    let formattedContent = '--- File Attachments ---\n\n';
    appState.uploadedFiles.forEach((file, index) => {
        formattedContent += `FILE ${index + 1}: ${file.name}\n${'='.repeat(20)}\n${file.content}\n${'='.repeat(20)}\n\n`;
    });
    formattedContent += '--- End of File Attachments ---\n\n';
    return formattedContent;
}

async function sendMessage() {
    const promptText = elements.promptEditor ? elements.promptEditor.innerText.trim() : '';
    if (promptText === '') return;

    const userMessage = {
        role: 'user',
        content: promptText,
    };

    appState.chats[appState.currentChatId].messages.push(userMessage);
    renderMessage(userMessage);

    if (elements.promptEditor) elements.promptEditor.innerHTML = '';

    const waitingIndicator = addWaitingIndicator();
    callApi(waitingIndicator);
}

function addWaitingIndicator() {
    const waitingIndicator = document.createElement('div');
    waitingIndicator.className = 'waiting-indicator';
    waitingIndicator.innerHTML = `
        <div class="typing-indicator me-2">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
        <span>Waiting for response...</span>
    `;
    elements.chatMessages && elements.chatMessages.appendChild(waitingIndicator);
    scrollToBottom();
    return waitingIndicator;
}

function renderMessage(message) {
    if (!elements.chatMessages) return null;
    const messageElement = document.createElement('div');
    messageElement.className = `chat-bubble ${message.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`;
    messageElement.dataset.messageId = message.timestamp;
    messageElement.setAttribute('data-aos', 'fade-up');

    let contentHTML = '';

    if (message.role === 'user') {
        contentHTML = `
            <div class="bubble-actions">
                <button class="btn btn-sm btn-outline-secondary copy-btn" title="Copy message">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary edit-btn" title="Edit message">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
            <div class="message-content">${message.content.replace(/\n/g, '<br>')}</div>
            <div class="bubble-metadata">
                <div>${new Date(message.timestamp).toLocaleTimeString()}</div>
            </div>
        `;
    } else {
        contentHTML = `
            <div class="bubble-actions">
                <button class="btn btn-sm btn-outline-secondary copy-btn" title="Copy message">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary regenerate-btn" title="Regenerate response">
                    <i class="fas fa-redo-alt"></i>
                </button>
            </div>
            <div class="markdown-content">${marked.parse(message.content || '')}</div>
            <div class="bubble-metadata">
                <div>Model: ${getModelLabel(message.model || appState.selectedModel)}</div>
                ${message.processingTime ? `<div>Time: ${message.processingTime.toFixed(2)}s</div>` : ''}
                ${message.usage?.total_tokens ? `<div>Tokens: ${message.usage.total_tokens}</div>` : ''}
                <div>${new Date(message.timestamp).toLocaleTimeString()}</div>
            </div>
        `;
    }

    messageElement.innerHTML = contentHTML;

    if (message.role === 'assistant') {
        messageElement.querySelectorAll('pre code').forEach(block => { try { hljs.highlightElement(block); } catch (e) { } });
    }

    const copyBtn = messageElement.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => { copyMessageContent(message.content); copyBtn.classList.add('copy-feedback'); setTimeout(() => copyBtn.classList.remove('copy-feedback'), 300); });
    }

    if (message.role === 'user') {
        const editBtn = messageElement.querySelector('.edit-btn');
        if (editBtn) editBtn.addEventListener('click', () => editUserMessage(messageElement, message));
    } else {
        const regenerateBtn = messageElement.querySelector('.regenerate-btn');
        if (regenerateBtn) regenerateBtn.addEventListener('click', () => regenerateResponse(message));
    }

    elements.chatMessages.appendChild(messageElement);
    scrollToBottom();
    return messageElement;
}

function copyMessageContent(content) {
    navigator.clipboard.writeText(content).then(() => console.log('Content copied')).catch(err => console.error('Copy failed', err));
}

function editUserMessage(messageElement, message) {
    messageElement.classList.add('edit-mode');
    const contentElement = messageElement.querySelector('.message-content');
    const originalContent = message.content;

    contentElement.innerHTML = `
        <div contenteditable="true" class="edit-content promptEditor">${originalContent.replace(/\n/g, '<br>')}</div>
        <div class="edit-actions">
            <button class="btn btn-sm btn-outline-secondary cancel-edit-btn">Cancel</button>
            <button class="btn btn-sm btn-primary save-edit-btn">Save & Regenerate</button>
        </div>
    `;

    const editableArea = contentElement.querySelector('.edit-content');
    editableArea.focus();

    const cancelBtn = contentElement.querySelector('.cancel-edit-btn');
    const saveBtn = contentElement.querySelector('.save-edit-btn');

    cancelBtn.addEventListener('click', () => { messageElement.classList.remove('edit-mode'); contentElement.innerHTML = originalContent.replace(/\n/g, '<br>'); });

    saveBtn.addEventListener('click', () => {
        const editedContent = editableArea.innerText.trim();
        messageElement.classList.remove('edit-mode');
        contentElement.innerHTML = editedContent.replace(/\n/g, '<br>');

        // update message in state
        const currentChat = appState.chats[appState.currentChatId];
        const msgIndex = currentChat.messages.findIndex(m => m.timestamp === message.timestamp);
        if (msgIndex !== -1) {
            currentChat.messages[msgIndex].content = editedContent;
            currentChat.messages[msgIndex].timestamp = new Date().toISOString();
            // remove subsequent messages
            currentChat.messages = currentChat.messages.slice(0, msgIndex + 1);
            // remove subsequent message elements from UI
            const allMessageElements = Array.from(elements.chatMessages.querySelectorAll('.chat-bubble'));
            const currentIndex = allMessageElements.indexOf(messageElement);
            allMessageElements.slice(currentIndex + 1).forEach(el => el.remove());
            const waitingIndicator = addWaitingIndicator();
            callApi(waitingIndicator);
        }
    });
}

function regenerateResponse(afterMessage) {
    const currentChat = appState.chats[appState.currentChatId];
    const messageIndex = currentChat.messages.findIndex(msg => msg.timestamp === afterMessage.timestamp);
    if (messageIndex !== -1) {
        let lastUserMessageIndex = messageIndex - 1;
        while (lastUserMessageIndex >= 0 && currentChat.messages[lastUserMessageIndex].role !== 'user') lastUserMessageIndex--;
        if (lastUserMessageIndex >= 0) {
            currentChat.messages = currentChat.messages.slice(0, lastUserMessageIndex + 1);
            const allMessageElements = Array.from(elements.chatMessages.querySelectorAll('.chat-bubble'));
            for (let i = messageIndex; i < allMessageElements.length; i++) allMessageElements[i].remove();
            const waitingIndicator = addWaitingIndicator();
            callApi(waitingIndicator);
        }
    }
}

// API call — locked to single model and NO fallbacks
async function callApi(waitingIndicator) {
    try {
        if (appState.currentlyStreaming && appState.streamController) appState.streamController.abort();

        const messages = (appState.chats[appState.currentChatId].messages || []).map(msg => ({ role: msg.role, content: msg.content }));

        const requestPayload = {
            model: appState.selectedModel,
            messages: messages,
            stream: appState.settings.streaming
        };

        if (appState.settings.temperature !== 1.0) requestPayload.temperature = appState.settings.temperature;
        if (appState.settings.topP !== 1.0) requestPayload.top_p = appState.settings.topP;
        if (appState.settings.topK !== 0) requestPayload.top_k = appState.settings.topK;
        if (appState.settings.frequencyPenalty !== 0.0) requestPayload.frequency_penalty = appState.settings.frequencyPenalty;
        if (appState.settings.presencePenalty !== 0.0) requestPayload.presence_penalty = appState.settings.presencePenalty;
        if (appState.settings.repetitionPenalty !== 1.0) requestPayload.repetition_penalty = appState.settings.repetitionPenalty;
        if (appState.settings.minP !== 0.0) requestPayload.min_p = appState.settings.minP;
        if (appState.settings.topA !== 0.0) requestPayload.top_a = appState.settings.topA;
        if (appState.settings.seed !== null) requestPayload.seed = appState.settings.seed;
        if (appState.settings.maxTokens !== null) requestPayload.max_tokens = appState.settings.maxTokens;
        if (appState.settings.logprobs) requestPayload.logprobs = true;
        if (appState.settings.topLogprobs !== null) requestPayload.top_logprobs = appState.settings.topLogprobs;

        if (appState.settings.reasoning.effort || appState.settings.reasoning.maxTokens || appState.settings.reasoning.exclude) {
            requestPayload.reasoning = {};
            if (appState.settings.reasoning.effort) requestPayload.reasoning.effort = appState.settings.reasoning.effort;
            if (appState.settings.reasoning.maxTokens) requestPayload.reasoning.max_tokens = appState.settings.reasoning.maxTokens;
            if (appState.settings.reasoning.exclude) requestPayload.reasoning.exclude = true;
        }

        console.log("Sending API request with payload:", requestPayload);

        appState.streamController = new AbortController();
        const signal = appState.streamController.signal;
        const startTime = Date.now();

        // Ensure Authorization header uses stored API key (may be empty)
        const authHeader = appState.apiKey ? `Bearer ${appState.apiKey}` : '';

        if (appState.settings.streaming) {
            appState.currentlyStreaming = true;

            const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify(requestPayload),
                signal: signal
            });

            if (!response.ok) {
                let errorData = {};
                try { errorData = await response.json(); } catch (e) { }
                throw new Error(errorData.error?.message || `HTTP error: ${response.status}`);
            }

            const assistantMessage = {
                role: 'assistant',
                content: '',
                model: appState.selectedModel,
                timestamp: new Date().toISOString(),
                processingTime: 0,
                usage: {}
            };

            waitingIndicator && waitingIndicator.parentNode && waitingIndicator.parentNode.removeChild(waitingIndicator);
            appState.chats[appState.currentChatId].messages.push(assistantMessage);
            const messageBubble = renderMessage(assistantMessage);
            const contentElement = messageBubble ? messageBubble.querySelector('.markdown-content') : null;

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || trimmedLine === 'data: [DONE]' || trimmedLine.startsWith(':')) continue;
                        if (trimmedLine.startsWith('data: ')) {
                            const data = trimmedLine.slice(6);
                            try {
                                const parsedData = JSON.parse(data);
                                const contentDelta = parsedData.choices[0]?.delta?.content;
                                if (contentDelta) {
                                    assistantMessage.content += contentDelta;
                                    if (contentElement) {
                                        contentElement.innerHTML = marked.parse(assistantMessage.content);
                                        contentElement.querySelectorAll('pre code').forEach(block => { try { hljs.highlightElement(block); } catch (e) { } });
                                    }
                                    if (assistantMessage.content.length % 5 === 0) forceScrollToBottom();
                                }
                                if (parsedData.choices[0]?.finish_reason) assistantMessage.finish_reason = parsedData.choices[0].finish_reason;
                                if (parsedData.usage) {
                                    assistantMessage.usage = parsedData.usage;
                                    const metadataElement = messageBubble.querySelector('.bubble-metadata');
                                    if (metadataElement) {
                                        const endTime = Date.now();
                                        const processingTime = (endTime - startTime) / 1000;
                                        assistantMessage.processingTime = processingTime;
                                        metadataElement.innerHTML = `\n                                            <div>Model: ${getModelLabel(assistantMessage.model)}</div>\n                                            <div>Time: ${processingTime.toFixed(2)}s</div>\n                                            <div>Tokens: ${assistantMessage.usage.total_tokens || 'N/A'}</div>\n                                            <div>${new Date(assistantMessage.timestamp).toLocaleTimeString()}</div>\n                                        `;
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing stream data:', e);
                            }
                        }
                    }
                }

                forceScrollToBottom();
                playSoundSafely(elements.messageReceivedSound);
            } catch (streamError) {
                if (streamError.name === 'AbortError') console.log('Stream cancelled'); else throw streamError;
            } finally {
                appState.currentlyStreaming = false;
            }

        } else {
            const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                let errorData = {};
                try { errorData = await response.json(); } catch (e) { }
                throw new Error(errorData.error?.message || `HTTP error: ${response.status}`);
            }

            const responseData = await response.json();
            const assistantMessage = {
                role: 'assistant',
                content: responseData.choices[0]?.message?.content || '',
                model: responseData.model || appState.selectedModel,
                timestamp: new Date().toISOString(),
                processingTime: (Date.now() - startTime) / 1000,
                usage: responseData.usage || {}
            };

            waitingIndicator && waitingIndicator.parentNode && waitingIndicator.parentNode.removeChild(waitingIndicator);
            appState.chats[appState.currentChatId].messages.push(assistantMessage);
            renderMessage(assistantMessage);
            forceScrollToBottom();
            playSoundSafely(elements.messageReceivedSound);
        }

        saveAppState();

    } catch (error) {
        console.error('API Error:', error);
        waitingIndicator && waitingIndicator.parentNode && waitingIndicator.parentNode.removeChild(waitingIndicator);

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `\n            <div class="d-flex justify-content-between align-items-start">\n                <div>\n                    <i class="fas fa-exclamation-circle me-2"></i>\n                    <strong>Error:</strong> ${error.message || 'Something went wrong'}\n                </div>\n                <button class="btn btn-sm btn-danger retry-btn">\n                    <i class="fas fa-redo-alt me-1"></i> Retry\n                </button>\n            </div>\n        `;
        elements.chatMessages && elements.chatMessages.appendChild(errorElement);

        const retryBtn = errorElement.querySelector('.retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', () => {
            errorElement.parentNode && errorElement.parentNode.removeChild(errorElement);
            const newWaitingIndicator = addWaitingIndicator();
            callApi(newWaitingIndicator);
        });

        playSoundSafely(elements.errorSound);
        forceScrollToBottom();
    }
}

function handlePromptKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function exportChat() {
    if (!appState.currentChatId) return;
    const currentChat = appState.chats[appState.currentChatId];
    const chatData = JSON.stringify(currentChat, null, 2);
    const blob = new Blob([chatData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `chat_export_${new Date().toISOString().replace(/:/g, '-')}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}

function handleImportChat(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const importedChat = JSON.parse(e.target.result);
            if (!importedChat.id || !importedChat.messages || !Array.isArray(importedChat.messages)) throw new Error('Invalid chat format');
            const newChatId = 'chat_' + Date.now();
            importedChat.id = newChatId;
            appState.chats[newChatId] = importedChat;
            saveAppState();
            loadChat(newChatId);
            const systemMessageElement = document.createElement('div');
            systemMessageElement.className = 'system-message';
            systemMessageElement.textContent = 'Chat imported successfully';
            elements.chatMessages && elements.chatMessages.appendChild(systemMessageElement);
        } catch (error) {
            console.error('Error importing chat:', error);
            alert('Error importing chat: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function deleteCurrentChat() {
    if (!appState.currentChatId || Object.keys(appState.chats).length <= 1) { createNewChat(); return; }
    delete appState.chats[appState.currentChatId];
    saveAppState();
    const chatIds = Object.keys(appState.chats);
    if (chatIds.length > 0) loadChat(chatIds[0]); else createNewChat();
}

function forceScrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 150);
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        const lastMessage = chatMessages.lastElementChild;
        if (lastMessage) lastMessage.scrollIntoView({ behavior: 'auto', block: 'end' });
    }, 300);
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleBeforeUnload(e) {
    if (Object.keys(appState.chats).length > 0) {
        e.preventDefault();
        try { leavePageModalInstance?.show(); } catch (err) { }
        e.returnValue = '';
    }
}

function placeCursorAtEnd(element) {
    if (!element) return;
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    element.focus();
}

function playSoundSafely(audioElement) {
    if (!audioElement) return;
    const sound = new Audio(audioElement.src);
    sound.volume = 0.7;
    sound.play().then(() => { console.log('Sound played'); }).catch(err => {
        console.warn('Could not play sound:', err.message);
        if (err.name === 'NotAllowedError') {
            const playOnClick = () => { sound.play().catch(e => console.warn('Still could not play sound:', e.message)); document.removeEventListener('click', playOnClick); };
            document.addEventListener('click', playOnClick, { once: true });
        }
    });
}







