/**
 * ═══════════════════════════════════════════════════════════
 *  AI Character Chat — Frontend Application
 * ═══════════════════════════════════════════════════════════
 */

// ── State ────────────────────────────────────────────────
let state = {
    characters: [],
    currentCharacterId: null,
    currentChatId: null,
    currentMessages: [],
    chats: [],
    memory: null,
    personas: [],
    sendingChats: new Set(),
    config: {},
    pinterest: { results: [], index: 0, loading: false },
    unreadChats: new Set(),
    _chatNavToken: 0 // monotonic guard against out-of-order chat navigation
};

function getActiveChatId() {
    return state.currentChatId;
}

function isChatSending(chatId) {
    if (!chatId) return false;
    return state.sendingChats && state.sendingChats.has(chatId);
}

function isCurrentChatSending() {
    return isChatSending(getActiveChatId());
}

function updateChatSendingUI() {
    const isBusy = isCurrentChatSending();
    const typingIndicator = $('#typing-indicator');
    const sendBtn = $('#btn-send');
    const takeTurnBtn = $('#btn-take-turn');
    if (typingIndicator) {
        typingIndicator.style.display = isBusy ? 'flex' : 'none';
    }
    if (sendBtn) {
        sendBtn.disabled = isBusy;
    }
    if (takeTurnBtn) {
        takeTurnBtn.disabled = isBusy;
    }
    if (typeof updateJumpToLatestBtn === 'function') {
        updateJumpToLatestBtn();
    }
}

// Backward-compatibility getter/setter for state.sending
Object.defineProperty(state, 'sending', {
    get() {
        return isCurrentChatSending();
    },
    set(val) {
        const id = getActiveChatId();
        if (!id) return;
        if (val) state.sendingChats.add(id);
        else state.sendingChats.delete(id);
        updateChatSendingUI();
    }
});

window.langData = {};
window.t = (key) => window.langData[key] || key;

// ── DOM Refs & Crisp Icons ───────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const UI_ICONS = {
    copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    regen: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`,
    chat: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    group: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
};

// ── Avatar Helper ────────────────────────────────────────
function getAvatarInnerHtml(avatar, name) {
    if (avatar && (avatar.startsWith('data:') || avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/'))) {
        return `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name || 'avatar')}">`;
    }
    return escapeHtml(avatar || (name ? name.charAt(0).toUpperCase() : 'A'));
}

function getActivePersona() {
    if (!state.personas || state.personas.length === 0) return null;
    const personaId = state.memory?.personaId || null;
    if (personaId) {
        const found = state.personas.find(p => String(p.id) === String(personaId));
        if (found) return found;
    }
    return state.personas[0] || null;
}

function getUserAvatarInnerHtml() {
    const persona = getActivePersona();
    if (persona && persona.avatar) {
        return getAvatarInnerHtml(persona.avatar, persona.name || 'User');
    }
    const initial = (persona && persona.name) ? persona.name.trim().charAt(0).toUpperCase() : 'U';
    return escapeHtml(initial || 'U');
}

function updateAvatarPreview(avatarData) {
    const preview = $('#avatar-preview');
    const removeBtn = $('#avatar-remove-btn');
    if (!preview || !removeBtn) return;
    if (avatarData && (avatarData.startsWith('data:') || avatarData.startsWith('http://') || avatarData.startsWith('https://') || avatarData.startsWith('/'))) {
        preview.innerHTML = `<img src="${escapeHtml(avatarData)}" alt="avatar">`;
        preview.classList.add('has-image');
        removeBtn.style.display = 'flex';
    } else {
        preview.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload</span>`;
        preview.classList.remove('has-image');
        removeBtn.style.display = 'none';
    }
}

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadConfig();
    } catch (err) {
        console.error('Failed to load config', err);
    }
    try {
        await Promise.all([loadCharacters(), loadPersonas()]);
        await initSingleCharacter();
    } catch (err) {
        console.error('Failed to initialize playground', err);
        if (typeof toast === 'function') toast('Failed to load data from server. Check that the server is running.', 'error');
    }
    testConnection();
    bindEvents(); // must always run so the UI stays interactive even if the above failed
});

async function initSingleCharacter() {
    if (!state.characters || state.characters.length === 0) {
        const defaultChar = await api('POST', '/api/characters', {
            name: 'Assistant',
            personality: '',
            scenario: '',
            firstMessage: '',
            exampleDialogue: '',
            systemPrompt: ''
        });
        if (defaultChar && !defaultChar.error) {
            state.characters = [defaultChar];
        } else {
            return;
        }
    }
    await selectCharacter(state.characters[0].id);
}

async function loadPersonas() {
    try {
        const personas = await api('GET', '/api/personas');
        if (Array.isArray(personas)) {
            state.personas = personas;
        }
    } catch (err) {
        console.error('Failed to load personas', err);
    }
}

// ══════════════════════════════════════════════════════════
//  API Helpers
// ══════════════════════════════════════════════════════════

async function api(method, url, body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
        res = await fetch(url, opts);
    } catch (err) {
        // Network-level failure (server down, DNS, offline, etc.)
        return { error: `Network error: ${err.message}` };
    }

    let data;
    try {
        data = await res.json();
    } catch {
        // Response wasn't valid JSON (e.g. an HTML error page from a 500)
        data = { error: `Server returned an unexpected response (HTTP ${res.status})` };
    }

    if (!res.ok && !data.error) {
        data.error = `Request failed (HTTP ${res.status})`;
    }
    return data;
}

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

async function loadConfig() {
    state.config = await api('GET', '/api/config');

    if (state.config.uiLang) {
        await loadLanguage(state.config.uiLang, state.config.showLangWarning);
    }
}

const RTL_LANGS = ['AR', 'HE', 'FA', 'UR'];

async function loadLanguage(langCode, showWarning) {
    try {
        const res = await fetch(`/Lang/${langCode}.json`);
        if (res.ok) {
            window.langData = await res.json();

            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (window.langData[key]) el.innerHTML = window.langData[key];
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (window.langData[key]) el.placeholder = window.langData[key];
            });

            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                if (window.langData[key]) el.title = window.langData[key];
            });

            document.documentElement.lang = langCode.toLowerCase();
            document.documentElement.dir = RTL_LANGS.includes(langCode.toUpperCase()) ? 'rtl' : 'ltr';

            if (showWarning && typeof openModal === 'function') {
                openModal('modal-lang-warning');
            }
        } else {
            console.error(`Language file not found: /Lang/${langCode}.json (HTTP ${res.status})`);
            if (typeof toast === 'function') {
                toast(`Language "${langCode}" not found — falling back to default text`, 'error');
            }
        }
    } catch (err) {
        console.error('Failed to load language', err);
        if (typeof toast === 'function') toast('Failed to load language file', 'error');
    }
}

async function testConnection() {
    const result = await api('GET', '/api/test-connection');
    const statusDot = $('.status-dot');
    const statusText = $('.status-text');
    if (!statusDot || !statusText) return;

    const baseUrl = (state.config && state.config.baseUrl) ? state.config.baseUrl.trim() : '';
    const modelLabel = (state.config && state.config.modelName) ? state.config.modelName : '';

    if (!baseUrl) {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Not configured — set URL';
    } else if (result.ok) {
        statusDot.className = 'status-dot online';
        const baseConnected = t('sidebar.connected') || 'Connected';
        statusText.textContent = modelLabel ? `${baseConnected} · ${modelLabel}` : baseConnected;
    } else {
        statusDot.className = 'status-dot error';
        statusText.textContent = result.error || t('sidebar.disconnected') || 'Disconnected';
    }
}

// ══════════════════════════════════════════════════════════
//  CHARACTERS
// ══════════════════════════════════════════════════════════

async function loadCharacters() {
    const res = await api('GET', '/api/characters');
    if (Array.isArray(res)) {
        state.characters = res;
    } else {
        if (res && res.error) toast(res.error, 'error');
        state.characters = state.characters || [];
    }
}

async function selectCharacter(id) {
    state.currentCharacterId = id;
    state.currentChatId = null;
    state.currentMessages = [];

    // Load chats and memory for this character in parallel
    const [chats, memory] = await Promise.all([
        api('GET', `/api/chats/${id}`),
        api('GET', `/api/memory/${id}`)
    ]);
    // The user may have already clicked a different character while this
    // GET was in flight — don't let a slower, stale response overwrite
    // whatever character they've since switched to.
    if (state.currentCharacterId !== id) return;
    state.chats = Array.isArray(chats) ? chats : [];
    if (memory && !memory.error) {
        state.memory = memory;
        applyPersonaSlotToState(state.memory.personaId);
    }
    renderChatList();

    const char = state.characters.find(c => c.id === id);
    if (!char) return;

    // Update chat header
    $('#chat-header-name').textContent = char.name;
    $('#chat-header-avatar').innerHTML = getAvatarInnerHtml(char.avatar, char.name);

    // If there are existing chats, load the most recent one
    if (state.chats.length > 0) {
        await loadChat(state.chats[0].id);
    } else {
        // Start a new chat automatically
        await startNewChat();
    }

    if (state.currentCharacterId !== id) return; // switched away during loadChat/startNewChat

    // Switch to chat view
    showView('view-chat');
    closeSidebarOnMobile();
}

// ── Character CRUD ──

function openCharacterEditor(editId = null) {
    const targetId = editId || state.currentCharacterId;
    const char = targetId ? state.characters.find(c => c.id === targetId) : null;

    $('#char-modal-title').textContent = char ? t('char_edit.title_edit') : t('char_edit.title_new');
    $('#char-edit-id').value = targetId || '';
    $('#char-name').value = char ? char.name : '';
    $('#char-gender').value = char ? (char.gender || '') : '';
    $('#char-age').value = char ? (char.age || '') : '';
    $('#char-avatar').value = char ? (char.avatar || '') : '';
    const avatarFileInput = $('#char-avatar-file');
    if (avatarFileInput) avatarFileInput.value = '';
    // Update avatar preview after modal opens
    setTimeout(() => updateAvatarPreview($('#char-avatar').value), 50);
    $('#char-personality').value = char ? (char.personality || '') : '';
    $('#char-scenario').value = char ? (char.scenario || '') : '';
    $('#char-first-message').value = char ? (char.firstMessage || '') : '';
    $('#char-example').value = char ? (char.exampleDialogue || '') : '';
    $('#char-system').value = char ? (char.systemPrompt || '') : '';
    const delBtn = $('#btn-delete-character');
    if (delBtn) delBtn.style.display = 'none';

    // Reset the Pinterest picker for this editing session
    state.pinterest = { results: [], index: 0, loading: false };
    $('#pinterest-panel').style.display = 'none';
    $('#pinterest-results').style.display = 'none';
    $('#pinterest-status').textContent = '';
    $('#pinterest-query').value = char ? (char.name || '') : '';
    $('#avatar-pinterest-toggle').classList.remove('active');

    openModal('modal-character');
    closeSidebarOnMobile();
}

async function saveCharacter() {
    const editId = $('#char-edit-id').value;
    const data = {
        name: $('#char-name').value.trim() || 'Unnamed',
        gender: $('#char-gender').value,
        age: $('#char-age').value.trim(),
        avatar: $('#char-avatar').value.trim(),
        personality: $('#char-personality').value.trim(),
        scenario: $('#char-scenario').value.trim(),
        firstMessage: $('#char-first-message').value.trim(),
        exampleDialogue: $('#char-example').value.trim(),
        systemPrompt: $('#char-system').value.trim()
    };

    if (editId) {
        const res = await api('PUT', `/api/characters/${editId}`, data);
        if (!res || res.error) {
            toast((res && res.error) || 'Failed to update character', 'error');
            return;
        }
        toast(t('toast.char_updated'), 'success');
    } else {
        const newChar = await api('POST', '/api/characters', data);
        if (!newChar || newChar.error) {
            toast((newChar && newChar.error) || 'Failed to create character', 'error');
            return;
        }
        toast(t('toast.char_created'), 'success');
        state.currentCharacterId = newChar.id;
    }

    closeModal('modal-character');
    await loadCharacters();

    if (state.currentCharacterId) {
        const updatedChar = state.characters.find(c => c.id === state.currentCharacterId);
        if (updatedChar) {
            $('#chat-header-name').textContent = updatedChar.name;
            $('#chat-header-avatar').innerHTML = getAvatarInnerHtml(updatedChar.avatar, updatedChar.name);
            renderMessages(state.currentMessages, false);
        }
    }
}

async function deleteCharacter() {
    const editId = $('#char-edit-id').value;
    if (!editId) return;
    if (!confirm(t('app.confirm_delete_char'))) return;

    const res = await api('DELETE', `/api/characters/${editId}`);
    if (!res || res.error) {
        toast((res && res.error) || 'Failed to delete character', 'error');
        return;
    }
    toast(t('toast.char_deleted'), 'success');
    closeModal('modal-character');

    state.currentCharacterId = null;
    state.currentChatId = null;
    await loadCharacters();
    await initSingleCharacter();
}

// ══════════════════════════════════════════════════════════
//  CHATS
// ══════════════════════════════════════════════════════════

function renderChatList() {
    const listTitle = $('#chat-list-title');
    const list = $('#chat-list');
    if (!list) return;

    if (listTitle) listTitle.style.display = 'block';

    if (!state.currentCharacterId || state.chats.length === 0) {
        list.innerHTML = '';
        return;
    }

    list.innerHTML = state.chats.map(c => `
        <div class="chat-item ${c.id === state.currentChatId ? 'active' : ''}"
             data-id="${c.id}" onclick="loadChat('${c.id}')">
            <span class="chat-item-icon">${UI_ICONS.chat}</span>
            <span class="chat-item-title">${escapeHtml(c.title)}</span>
            ${state.unreadChats.has(c.id) ? '<span class="chat-item-unread-dot" title="New reply"></span>' : ''}
            <div class="chat-item-actions">
                <button class="chat-item-edit" onclick="event.stopPropagation(); startRenameChat('${c.id}')" title="Rename">${UI_ICONS.edit}</button>
                <button class="chat-item-delete" onclick="event.stopPropagation(); deleteChat('${c.id}')" title="Delete">✕</button>
            </div>
        </div>
    `).join('');
}

async function startNewChat() {
    if (!state.currentCharacterId) return;

    const myToken = ++state._chatNavToken;
    const characterIdAtStart = state.currentCharacterId;

    const char = state.characters.find(c => c.id === state.currentCharacterId);
    const initialMessages = [];

    // Add first message if character has one
    if (char && char.firstMessage) {
        initialMessages.push({
            role: 'assistant',
            content: char.firstMessage,
            timestamp: new Date().toISOString()
        });
    }

    const chat = await api('POST', '/api/chats', {
        characterId: characterIdAtStart,
        title: 'New Chat',
        messages: initialMessages
    });
    if (!chat || chat.error) {
        toast((chat && chat.error) || 'Failed to create chat', 'error');
        return;
    }

    // Reload chat list for whichever character this was created for
    const chats = await api('GET', `/api/chats/${characterIdAtStart}`);

    if (myToken !== state._chatNavToken) return; // superseded by a newer navigation

    state.currentChatId = chat.id;
    state.chats = Array.isArray(chats) ? chats : [chat];
    renderChatList();
    renderMessages(chat.messages || []);
    showView('view-chat');
    closeSidebarOnMobile();
    updateChatSendingUI();
    if (window.innerWidth > 768) {
        const input = $('#chat-input');
        if (input) input.focus();
    }
}

async function loadChat(chatId, shouldScroll = true) {
    // A monotonic token shared with startNewChat/deleteChat: whichever
    // call is the most recent one wins, regardless of which of several
    // in-flight requests happens to resolve last (classic out-of-order
    // resolution when a user clicks between chats quickly).
    const myToken = ++state._chatNavToken;

    const chat = await api('GET', `/api/chat/${chatId}`);
    if (!chat || chat.error) return;
    if (myToken !== state._chatNavToken) return; // superseded by a newer navigation

    state.currentChatId = chatId;
    state.unreadChats.delete(chatId);
    renderChatList();
    renderMessages(chat.messages || [], shouldScroll);
    closeSidebarOnMobile();
    updateChatSendingUI();
}

async function deleteChat(chatId) {
    if (!confirm(t('app.confirm_delete_chat'))) return;

    // Guard against double-clicking the delete button firing two
    // overlapping DELETE requests for the same chat.
    state._deletingChats = state._deletingChats || new Set();
    if (state._deletingChats.has(chatId)) return;
    state._deletingChats.add(chatId);

    const myToken = ++state._chatNavToken;

    try {
        const res = await api('DELETE', `/api/chat/${chatId}`);
        if (!res || res.error) {
            toast((res && res.error) || 'Failed to delete chat', 'error');
            return;
        }

        if (state.currentChatId === chatId) {
            state.currentChatId = null;
            state.currentMessages = [];
        }

        const chats = await api('GET', `/api/chats/${state.currentCharacterId}`);
        if (myToken !== state._chatNavToken) return; // a newer navigation took over meanwhile
        state.chats = Array.isArray(chats) ? chats : [];
        renderChatList();

        if (state.chats.length > 0) {
            await loadChat(state.chats[0].id);
        } else {
            await startNewChat();
        }
    } finally {
        state._deletingChats.delete(chatId);
    }
}

// ══════════════════════════════════════════════════════════
//  MESSAGES
// ══════════════════════════════════════════════════════════

function renderMessages(messages, shouldScroll = true) {
    state.currentMessages = Array.isArray(messages) ? messages : [];
    const currentChat = state.chats.find(c => c.id === state.currentChatId);
    if (currentChat) {
        currentChat.messages = state.currentMessages;
    }
    const container = $('#chat-messages');
    if (!container) return;
    const prevScrollTop = container.scrollTop;

    const char = state.characters.find(c => c.id === state.currentCharacterId);
    const charAvatar = char ? getAvatarInnerHtml(char.avatar, char.name) : 'A';

    if (!messages || messages.length === 0) {
        const charName = char ? char.name : 'Assistant';
        container.innerHTML = `
            <div class="empty-chat">
                <div class="empty-chat-avatar">${charAvatar}</div>
                <h3 class="empty-chat-title">${escapeHtml(charName)}</h3>
                <p>${t('chat.empty')}</p>
            </div>`;
        updateJumpToLatestBtn();
        return;
    }

    container.innerHTML = messages.map((m, index) => {
        const time = m.timestamp ? formatTime(m.timestamp) : '';
        const userAvatar = getUserAvatarInnerHtml();
        const avatar = m.role === 'user' ? userAvatar : charAvatar;
        const isLastAssistant = m.role === 'assistant' && index === messages.length - 1;

        let contentHtml = formatMessageContent(m.content);
        let alternatesHtml = '';

        if (m.alternates && m.alternates.length > 1) {
            const total = m.alternates.length;
            const current = (m.selectedAlternate || 0) + 1;
            alternatesHtml = `
                <div class="alternate-nav">
                    <button onclick="changeAlternate(${index}, -1, '${m.id || ''}')">&lt;</button>
                    <span>${current}/${total}</span>
                    <button onclick="changeAlternate(${index}, 1, '${m.id || ''}')">&gt;</button>
                </div>
            `;
            const selIdx = m.selectedAlternate || 0;
            contentHtml = formatMessageContent(m.alternates[selIdx] || m.content);
        }

        const regenerateBtn = isLastAssistant ? `<button class="regenerate-btn" onclick="regenerateLastMessage()" title="${t('chat.action.regenerate') || 'Regenerate'}">${UI_ICONS.regen}</button>` : '';
        const touchEvents = isLastAssistant ? 'ontouchstart="handleTouchStart(event)" ontouchend="handleTouchEnd(event, this)"' : '';
        const msgId = m.id || '';

        return `
            <div class="message ${m.role}" data-index="${index}" data-id="${msgId}">
                <div class="message-avatar">${avatar}</div>
                <div>
                    <div class="message-bubble-container" ${touchEvents}>
                        <div class="message-bubble">${contentHtml}</div>
                        ${regenerateBtn}
                    </div>
                    ${alternatesHtml}
                    <div class="message-meta">
                        ${time ? `<span class="message-time">${time}</span>` : ''}
                        <button class="message-action-btn" onclick="copyMessageText(this)" title="${t('chat.action.copy') || 'Copy'}">${UI_ICONS.copy}</button>
                        <button class="message-action-btn" onclick="editMessage(${index}, '${msgId}')" title="${t('chat.action.edit') || t('btn.edit') || 'Edit'}">${UI_ICONS.edit}</button>
                        <button class="message-action-btn message-delete-btn" onclick="deleteMessage(${index}, '${msgId}')" title="${t('chat.action.delete') || 'Hapus'}">${UI_ICONS.trash}</button>
                    </div>
                </div>
            </div>`;
    }).join('');

    if (shouldScroll) {
        scrollToBottom();
    } else {
        container.scrollTop = prevScrollTop;
        updateJumpToLatestBtn();
    }
}

function appendMessage(role, content, isLastAssistant = false, messageId = null) {
    if (!Array.isArray(state.currentMessages)) {
        state.currentMessages = [];
    }
    state.currentMessages.push({
        role,
        content,
        timestamp: new Date().toISOString(),
        id: messageId || ''
    });
    const currentChat = state.chats.find(c => c.id === state.currentChatId);
    if (currentChat) {
        currentChat.messages = state.currentMessages;
    }

    const container = $('#chat-messages');
    const char = state.characters.find(c => c.id === state.currentCharacterId);
    const charAvatar = char ? getAvatarInnerHtml(char.avatar, char.name) : 'A';

    const empty = container.querySelector('.empty-chat');
    if (empty) empty.remove();

    if (isLastAssistant) {
        $$('.regenerate-btn').forEach(btn => btn.remove());
        $$('.message-bubble-container').forEach(c => {
            c.removeAttribute('ontouchstart');
            c.removeAttribute('ontouchend');
            c.classList.remove('swiped-left');
        });
    }

    const userAvatar = getUserAvatarInnerHtml();
    const avatar = role === 'user' ? userAvatar : charAvatar;
    const time = formatTime(new Date().toISOString());
    const index = document.querySelectorAll('#chat-messages .message').length;
    const regenerateBtn = isLastAssistant ? `<button class="regenerate-btn" onclick="regenerateLastMessage()" title="${t('chat.action.regenerate') || 'Regenerate'}">${UI_ICONS.regen}</button>` : '';
    const touchEvents = isLastAssistant ? 'ontouchstart="handleTouchStart(event)" ontouchend="handleTouchEnd(event, this)"' : '';
    const msgId = messageId || '';

    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.dataset.index = index;
    div.dataset.id = msgId;
    div.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div>
            <div class="message-bubble-container" ${touchEvents}>
                <div class="message-bubble">${formatMessageContent(content)}</div>
                ${regenerateBtn}
            </div>
            <div class="message-meta">
                <span class="message-time">${time}</span>
                <button class="message-action-btn" onclick="copyMessageText(this)" title="${t('chat.action.copy') || 'Copy'}">${UI_ICONS.copy}</button>
                <button class="message-action-btn" onclick="editMessage(${index}, '${msgId}')" title="${t('chat.action.edit') || t('btn.edit') || 'Edit'}">${UI_ICONS.edit}</button>
                <button class="message-action-btn message-delete-btn" onclick="deleteMessage(${index}, '${msgId}')" title="${t('chat.action.delete') || 'Hapus'}">${UI_ICONS.trash}</button>
            </div>
        </div>`;
    container.appendChild(div);
    scrollToBottom();
    return div;
}

function isNearBottom(container, threshold = 160) {
    if (!container) return true;
    return (container.scrollHeight - container.scrollTop - container.clientHeight) <= threshold;
}

function updateJumpToLatestBtn() {
    const container = $('#chat-messages');
    const jumpBtn = $('#btn-jump-latest');
    if (!container || !jumpBtn) return;
    const inputContainer = $('.chat-input-container');
    if (inputContainer && inputContainer.offsetHeight > 0) {
        jumpBtn.style.bottom = (inputContainer.offsetHeight + 12) + 'px';
    }
    if (isNearBottom(container, 160)) {
        jumpBtn.classList.remove('visible');
    } else {
        jumpBtn.classList.add('visible');
    }
}

function scrollToBottom(smooth = false) {
    const container = $('#chat-messages');
    if (!container) return;
    requestAnimationFrame(() => {
        if (smooth) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        } else {
            container.scrollTop = container.scrollHeight;
        }
        updateJumpToLatestBtn();
    });
}
window.scrollToBottom = scrollToBottom;

// ══════════════════════════════════════════════════════════
//  SEND MESSAGE
// ══════════════════════════════════════════════════════════

async function sendMessage() {
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;

    if (!state.currentCharacterId || !state.currentChatId) return;

    const requestChatId = state.currentChatId; // capture before the await
    const requestCharacterId = state.currentCharacterId;

    if (isChatSending(requestChatId)) {
        toast(t('toast.please_wait') || 'Please wait for the current reply to finish', 'info');
        return;
    }

    state.sendingChats.add(requestChatId);
    input.value = '';
    autoResizeInput();

    // Show user message immediately with a unique ID
    const userMsgId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
    const userBubble = appendMessage('user', text, false, userMsgId);
    const editCountAtStart = state._chatEditedDuringSend || 0;

    // Update typing indicator & send button for this chat
    updateChatSendingUI();

    try {
        const result = await api('POST', '/api/chat/send', {
            characterId: requestCharacterId,
            chatId: requestChatId,
            userMessage: text,
            userMessageId: userMsgId
        });

        if (result.error) {
            // The message was never saved server-side — remove the phantom
            // bubble and give the text back so the user can retry.
            if (state.currentChatId === requestChatId && !state.currentGroupId) {
                if (userBubble && userBubble.isConnected) userBubble.remove();
                if (Array.isArray(state.currentMessages)) {
                    const uIdx = state.currentMessages.findIndex(m => m.id === userMsgId);
                    if (uIdx !== -1) state.currentMessages.splice(uIdx, 1);
                }
                if ((state._chatEditedDuringSend || 0) !== editCountAtStart) {
                    await loadChat(requestChatId, false);
                }
                input.value = text;
                autoResizeInput();
            }
            toast(result.error, 'error');
            return;
        }

        if (result.chatTitle && Array.isArray(state.chats)) {
            const cItem = state.chats.find(c => c.id === requestChatId);
            if (cItem) cItem.title = result.chatTitle;
        }

        if (state.currentChatId !== requestChatId || state.currentGroupId) {
            // User switched to a different chat while this was in flight —
            // the reply was saved server-side, just don't render it here (H6).
            state.unreadChats.add(requestChatId);
            state.unreadCharacters.add(requestCharacterId);
            renderCharacterList();
            if (state.currentCharacterId === requestCharacterId && !state.currentGroupId) {
                renderChatList();
            }
            return;
        }

        // Remove any old .alternate-nav from previous messages (finalized by backend on new turn)
        $$('#chat-messages .alternate-nav').forEach(el => el.remove());

        if ((state._chatEditedDuringSend || 0) !== editCountAtStart) {
            await loadChat(requestChatId);
        } else {
            // Show assistant response
            appendMessage('assistant', result.content, true, result.messageId);
        }

        // Refresh chat list (title might have changed)
        const freshChats = await api('GET', `/api/chats/${requestCharacterId}`);
        if (Array.isArray(freshChats)) {
            state.chats = freshChats;
        }
        const currentChatInList = state.chats.find(c => c.id === state.currentChatId);
        if (currentChatInList && state.currentMessages) {
            currentChatInList.messages = state.currentMessages;
        }
        if (state.currentCharacterId === requestCharacterId && !state.currentGroupId) {
            renderChatList();
        }

    } catch (err) {
        if (state.currentChatId === requestChatId && !state.currentGroupId) {
            if (userBubble && userBubble.isConnected) userBubble.remove();
            if (Array.isArray(state.currentMessages)) {
                const uIdx = state.currentMessages.findIndex(m => m.id === userMsgId);
                if (uIdx !== -1) state.currentMessages.splice(uIdx, 1);
            }
            if ((state._chatEditedDuringSend || 0) !== editCountAtStart) {
                await loadChat(requestChatId, false);
            }
            input.value = text;
            autoResizeInput();
        }
        toast(`Error: ${err.message}`, 'error');
    } finally {
        state.sendingChats.delete(requestChatId);
        if (state.currentChatId === requestChatId && !state.currentGroupId) {
            updateChatSendingUI();
        }
    }
}

// ══════════════════════════════════════════════════════════
//  REGENERATE & ALTERNATES
// ══════════════════════════════════════════════════════════

let touchStartX = 0;
window.handleTouchStart = function (e) {
    touchStartX = e.changedTouches[0].screenX;
};
window.handleTouchEnd = function (e, element) {
    let touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 40) {
        element.classList.add('swiped-left');
    } else if (touchEndX - touchStartX > 40) {
        element.classList.remove('swiped-left');
    }
};

window.regenerateLastMessage = async function () {
    if (!state.currentCharacterId || !state.currentChatId) return;
    const requestChatId = state.currentChatId; // capture before the await
    const requestCharacterId = state.currentCharacterId;

    if (isChatSending(requestChatId)) return;

    const lastMsgEl = document.querySelector('#chat-messages .message:last-child');
    const messageId = lastMsgEl?.dataset?.id;

    state.sendingChats.add(requestChatId);
    const btn = document.querySelector('.regenerate-btn');
    if (btn) btn.innerHTML = '<span class="spinner"></span>';
    updateChatSendingUI();

    try {
        const result = await api('POST', '/api/chat/regenerate', {
            characterId: requestCharacterId,
            chatId: requestChatId,
            messageId: messageId || undefined
        });

        if (result.error) {
            toast(result.error, 'error');
            return;
        }

        if (state.currentChatId !== requestChatId || state.currentGroupId) {
            state.unreadChats.add(requestChatId);
            state.unreadCharacters.add(requestCharacterId);
            renderCharacterList();
            if (state.currentCharacterId === requestCharacterId && !state.currentGroupId) {
                renderChatList();
            }
            return; // user switched chats meanwhile
        }

        const chat = await api('GET', `/api/chat/${requestChatId}`);
        if (chat && !chat.error && state.currentChatId === requestChatId && !state.currentGroupId) {
            renderMessages(chat.messages || []);
        }
    } catch (err) {
        toast(`Error: ${err.message}`, 'error');
    } finally {
        state.sendingChats.delete(requestChatId);
        if (state.currentChatId === requestChatId && !state.currentGroupId) {
            if (btn) btn.innerHTML = UI_ICONS.regen;
            updateChatSendingUI();
        }
    }
};

window.changeAlternate = async function (msgIndex, delta, messageId) {
    state._alternateNavBusy = state._alternateNavBusy || new Set();
    if (state._alternateNavBusy.has(msgIndex)) return; // ignore rapid double-clicks mid-request
    state._alternateNavBusy.add(msgIndex);

    const requestChatId = state.currentChatId; // capture before the await

    try {
        const chat = await api('GET', `/api/chat/${requestChatId}`);
        if (!chat || chat.error) return;
        // The user may have switched to a different chat while this GET was
        // in flight — don't render a stale chat's messages into (or write
        // this alternate-selection onto) whatever chat is showing now.
        if (state.currentChatId !== requestChatId) return;

        let msg = null;
        let actualIndex = msgIndex;
        if (messageId && Array.isArray(chat.messages)) {
            const fIdx = chat.messages.findIndex(m => m.id === messageId);
            if (fIdx !== -1) {
                msg = chat.messages[fIdx];
                actualIndex = fIdx;
            }
        }
        if (!msg && chat.messages && chat.messages[msgIndex]) {
            msg = chat.messages[msgIndex];
        }
        if (!msg || !msg.alternates) return;

        let sel = msg.selectedAlternate || 0;
        sel += delta;
        if (sel < 0) sel = 0;
        if (sel >= msg.alternates.length) sel = msg.alternates.length - 1;

        msg.selectedAlternate = sel;
        msg.content = msg.alternates[sel] || msg.content;

        // Optimistic re-render (preserve scroll position)
        renderMessages(chat.messages, false);

        const res = await api('PUT', `/api/chat/${requestChatId}/alternate`, {
            messageIndex: actualIndex,
            messageId: messageId || undefined,
            selectedAlternate: sel
        });
        if (res && res.error) {
            toast(res.error, 'error');
        }
    } finally {
        state._alternateNavBusy.delete(msgIndex);
    }
};

window.editMessage = async function (index, messageId) {
    const requestChatId = state.currentChatId; // capture before the await
    const chat = await api('GET', `/api/chat/${requestChatId}`);
    if (!chat || chat.error) return;
    if (state.currentChatId !== requestChatId) return;

    let msg = null;
    let actualIndex = index;
    if (messageId && Array.isArray(chat.messages)) {
        const fIdx = chat.messages.findIndex(m => m.id === messageId);
        if (fIdx !== -1) {
            msg = chat.messages[fIdx];
            actualIndex = fIdx;
        }
    }
    if (!msg && chat.messages && chat.messages[index]) {
        msg = chat.messages[index];
    }
    if (!msg) return;

    const messageDiv = (messageId && document.querySelector(`.message[data-id="${messageId}"]`))
        || document.querySelector(`.message[data-index="${index}"]`);
    if (!messageDiv) return;

    const msgEl = messageDiv.querySelector('.message-bubble-container');
    const metaEl = messageDiv.querySelector('.message-meta');
    const alternatesEl = messageDiv.querySelector('.alternate-nav');

    const originalContent = msg.alternates ? (msg.alternates[msg.selectedAlternate || 0] || msg.content) : msg.content;

    if (msgEl) msgEl.style.display = 'none';
    if (metaEl) metaEl.style.display = 'none';
    if (alternatesEl) alternatesEl.style.display = 'none';

    const existingEdit = messageDiv.querySelector('.message-edit-container') || document.getElementById(`edit-container-${actualIndex}`);
    if (existingEdit) existingEdit.remove();

    const editContainer = document.createElement('div');
    editContainer.className = 'message-edit-container';
    editContainer.id = `edit-container-${actualIndex}`;
    editContainer.dataset.msgId = messageId || (msg.id || '');
    editContainer.innerHTML = `
        <textarea class="message-edit-textarea" id="edit-textarea-${actualIndex}">${escapeHtml(originalContent)}</textarea>
        <div class="message-edit-actions">
            <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="cancelEdit(${actualIndex}, '${messageId || ''}')">${t('btn.cancel')}</button>
            <button class="btn-primary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="saveEdit(${actualIndex}, '${messageId || ''}')">${t('btn.save')}</button>
        </div>
    `;

    msgEl.parentNode.insertBefore(editContainer, msgEl);

    messageDiv.classList.add('is-editing');

    const textarea = document.getElementById(`edit-textarea-${actualIndex}`);
    const resizeTextarea = () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px';
    };
    textarea.addEventListener('input', resizeTextarea);
    setTimeout(() => {
        resizeTextarea();
        textarea.focus();
    }, 0);
};

window.cancelEdit = function (index, messageId) {
    const messageDiv = (messageId && document.querySelector(`.message[data-id="${messageId}"]`))
        || document.querySelector(`.message[data-index="${index}"]`);

    const editContainer = document.getElementById(`edit-container-${index}`)
        || (messageDiv && messageDiv.querySelector('.message-edit-container'));
    if (editContainer) editContainer.remove();

    if (!messageDiv) return;

    const msgEl = messageDiv.querySelector('.message-bubble-container');
    const metaEl = messageDiv.querySelector('.message-meta');
    const alternatesEl = messageDiv.querySelector('.alternate-nav');

    if (msgEl) msgEl.style.display = '';
    if (metaEl) metaEl.style.display = 'flex';
    if (alternatesEl) alternatesEl.style.display = 'flex';

    messageDiv.classList.remove('is-editing');
};

window.saveEdit = async function (index, messageId) {
    const editContainer = document.getElementById(`edit-container-${index}`)
        || (messageId ? document.querySelector(`.message-edit-container[data-msg-id="${messageId}"]`) : null);
    const textarea = editContainer ? editContainer.querySelector('.message-edit-textarea') : document.getElementById(`edit-textarea-${index}`);
    if (!textarea) return;

    const newContent = textarea.value.trim();
    if (!newContent) return cancelEdit(index, messageId);

    const requestChatId = state.currentChatId; // capture before any await
    const btn = editContainer ? editContainer.querySelector('.btn-primary') : textarea.nextElementSibling.querySelector('.btn-primary');
    if (btn) {
        btn.disabled = true;
        btn.textContent = t('btn.saving');
    }

    try {
        // Snapshot existing alternates before edit so they are never lost
        const prevAlternatesMap = new Map();
        if (Array.isArray(state.currentMessages)) {
            state.currentMessages.forEach((m, idx) => {
                if (m && Array.isArray(m.alternates) && m.alternates.length > 0) {
                    const key = m.id || `idx_${idx}`;
                    prevAlternatesMap.set(key, {
                        alternates: [...m.alternates],
                        selectedAlternate: m.selectedAlternate || 0
                    });
                }
            });
        }

        const payload = {
            messageIndex: index,
            content: newContent
        };
        if (messageId) payload.messageId = messageId;

        state._chatEditedDuringSend = (state._chatEditedDuringSend || 0) + 1;
        const result = await api('PUT', `/api/chat/${requestChatId}/message`, payload);

        if (!result || result.error) {
            toast((result && result.error) || 'Request failed', 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = t('btn.save');
            }
            return;
        }

        // Only refresh the rendered messages if the user is still on the chat that was just edited.
        if (state.currentChatId === requestChatId && !state.currentGroupId) {
            const chat = await api('GET', `/api/chat/${requestChatId}`);
            if (chat && Array.isArray(chat.messages) && state.currentChatId === requestChatId && !state.currentGroupId) {
                let restoredAlternates = false;
                chat.messages.forEach((m, idx) => {
                    const key = m.id || `idx_${idx}`;
                    const savedAlt = prevAlternatesMap.get(key) || (idx === index ? prevAlternatesMap.get(`idx_${index}`) : null);
                    if (savedAlt && (!Array.isArray(m.alternates) || m.alternates.length === 0)) {
                        m.alternates = [...savedAlt.alternates];
                        m.selectedAlternate = savedAlt.selectedAlternate;
                        restoredAlternates = true;
                    }
                    const isEditedMsg = (messageId && m.id === messageId) || (!messageId && idx === index);
                    if (isEditedMsg) {
                        m.content = newContent;
                        if (Array.isArray(m.alternates)) {
                            const selIdx = m.selectedAlternate || 0;
                            m.alternates[selIdx] = newContent;
                        }
                    }
                });
                if (restoredAlternates) {
                    await api('PUT', `/api/chat/${requestChatId}`, { messages: chat.messages });
                }
                renderMessages(chat.messages, false);
            }
        }
    } catch (err) {
        toast(`Error: ${err.message}`, 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = t('btn.save');
        }
    }
};

window.deleteMessage = async function (index, messageId) {
    const confirmText = t('chat.confirm_delete_msg') || 'Hapus pesan ini dari percakapan?';
    if (!confirm(confirmText)) return;

    const requestChatId = state.currentChatId;
    const target = messageId || index;
    try {
        state._chatEditedDuringSend = (state._chatEditedDuringSend || 0) + 1;
        const result = await api('DELETE', `/api/chat/${requestChatId}/message/${target}`);
        if (!result || result.error) {
            toast((result && result.error) || 'Request failed', 'error');
            return;
        }

        if (state.currentChatId === requestChatId && !state.currentGroupId) {
            await loadChat(requestChatId, false);
            toast(t('chat.msg_deleted') || 'Pesan berhasil dihapus');
        }
    } catch (err) {
        toast(`Error: ${err.message}`, 'error');
    }
};

// ══════════════════════════════════════════════════════════
//  MEMORY (Sticky Memory per Persona)
// ══════════════════════════════════════════════════════════

function ensureClientPersonaMemories(mem) {
    if (!mem || typeof mem !== 'object') return;
    const activePid = String(mem.personaId || (state.personas && state.personas[0]?.id) || '1');
    mem.personaId = activePid;
    if (!mem.personaMemories || typeof mem.personaMemories !== 'object' || Array.isArray(mem.personaMemories)) {
        mem.personaMemories = {
            [activePid]: {
                facts: Array.isArray(mem.facts) ? [...mem.facts] : [],
                summaries: Array.isArray(mem.summaries) ? [...mem.summaries] : [],
                importantEvents: Array.isArray(mem.importantEvents) ? mem.importantEvents.map(e => ({ ...e })) : []
            }
        };
    } else if (!mem.personaMemories[activePid]) {
        mem.personaMemories[activePid] = {
            facts: [],
            summaries: [],
            importantEvents: []
        };
    }
}

function syncCurrentPersonaSlotInState(targetPersonaId = null) {
    if (!state.memory || typeof state.memory !== 'object') return;
    ensureClientPersonaMemories(state.memory);
    const pid = String(targetPersonaId || state.memoryModalDraftPersonaId || state.memory.personaId || '1');
    state.memory.personaMemories[pid] = {
        facts: Array.isArray(state.memory.facts) ? [...state.memory.facts] : [],
        summaries: Array.isArray(state.memory.summaries) ? [...state.memory.summaries] : [],
        importantEvents: Array.isArray(state.memory.importantEvents)
            ? state.memory.importantEvents.filter(e => e && typeof e === 'object').map(e => ({ ...e }))
            : [],
        lastUpdated: new Date().toISOString()
    };
}

function applyPersonaSlotToState(personaId) {
    if (!state.memory || typeof state.memory !== 'object') return;
    ensureClientPersonaMemories(state.memory);
    const pid = String(personaId || state.memory.personaId || (state.personas && state.personas[0]?.id) || '1');
    state.memory.personaId = pid;
    state.memoryModalDraftPersonaId = pid;
    if (!state.memory.personaMemories[pid]) {
        state.memory.personaMemories[pid] = {
            facts: [],
            summaries: [],
            importantEvents: []
        };
    }
    const slot = state.memory.personaMemories[pid];
    state.memory.facts = Array.isArray(slot.facts) ? [...slot.facts] : [];
    state.memory.summaries = Array.isArray(slot.summaries) ? [...slot.summaries] : [];
    state.memory.importantEvents = Array.isArray(slot.importantEvents)
        ? slot.importantEvents.filter(e => e && typeof e === 'object').map(e => ({ ...e }))
        : [];
}

async function openMemoryViewer() {
    if (!state.currentCharacterId && !state.currentGroupId) return;

    if (state.currentGroupId) {
        const requestGroupId = state.currentGroupId;
        const group = state.groups.find(g => g.id === requestGroupId);
        $('#memory-char-name').textContent = group ? group.name : 'Group';

        const [memory, personas] = await Promise.all([
            api('GET', `/api/groups/${requestGroupId}/memory`),
            api('GET', '/api/personas')
        ]);
        if (state.currentGroupId !== requestGroupId) return;

        if (Array.isArray(personas)) {
            state.personas = personas;
        }
        state.memory = (memory && !memory.error)
            ? memory
            : { facts: [], summaries: [], importantEvents: [], personaId: null, personaMemories: {} };
        if (group && group.activePersonaId) {
            state.memory.personaId = String(group.activePersonaId);
        } else if (!state.memory.personaId && state.personas.length > 0) {
            state.memory.personaId = String(state.personas[0].id);
        }
        applyPersonaSlotToState(state.memory.personaId);
        renderMemory();
        openModal('modal-memory');
        closeSidebarOnMobile();
        return;
    }

    const requestCharacterId = state.currentCharacterId; // capture before the await
    const char = state.characters.find(c => c.id === state.currentCharacterId);
    $('#memory-char-name').textContent = char ? char.name : 'Character';

    const [memory, personas] = await Promise.all([
        api('GET', `/api/memory/${requestCharacterId}`),
        api('GET', '/api/personas')
    ]);
    // Bail out if the user switched characters while this GET was in
    // flight — don't open the memory modal with the WRONG character's data.
    if (state.currentCharacterId !== requestCharacterId) return;

    if (Array.isArray(personas)) {
        state.personas = personas;
    }
    state.memory = (memory && !memory.error)
        ? memory
        : { facts: [], summaries: [], importantEvents: [], personaId: null, personaMemories: {} };
    if (!state.memory.personaId && state.personas.length > 0) {
        state.memory.personaId = String(state.personas[0].id);
    }
    applyPersonaSlotToState(state.memory.personaId);
    renderMemory();
    openModal('modal-memory');
    closeSidebarOnMobile();
}

function renderMemory() {
    const mem = state.memory;
    if (!mem) return;

    // Facts
    const factsEl = $('#memory-facts');
    factsEl.innerHTML = (mem.facts || []).map((f, i) => `
        <div class="memory-item">
            <span class="memory-item-text">${escapeHtml(f)}</span>
            <button class="memory-item-delete" onclick="removeMemoryItem('facts', ${i})">✕</button>
        </div>
    `).join('') || `<div style="color:var(--text-muted); font-size:0.8rem; padding:8px">${t('memory.empty_facts')}</div>`;

    // Persona selector
    renderPersonaSelector();

    // Events
    const eventsEl = $('#memory-events');
    eventsEl.innerHTML = (mem.importantEvents || []).map((e, i) => `
        <div class="memory-item">
            <span class="memory-item-key">${escapeHtml(e.date || '')}</span>
            <span class="memory-item-text">${escapeHtml(e.description)}</span>
            <button class="memory-item-delete" onclick="removeMemoryItem('importantEvents', ${i})">✕</button>
        </div>
    `).join('') || `<div style="color:var(--text-muted); font-size:0.8rem; padding:8px">${t('memory.empty_events')}</div>`;

    // Summaries
    const summariesEl = $('#memory-summaries');
    summariesEl.innerHTML = (mem.summaries || []).map((s, i) => `
        <div class="memory-item">
            <span class="memory-item-text">${escapeHtml(s)}</span>
            <button class="memory-item-delete" onclick="removeMemoryItem('summaries', ${i})">✕</button>
        </div>
    `).join('') || `<div style="color:var(--text-muted); font-size:0.8rem; padding:8px">${t('memory.empty_summary')}</div>`;
}

function renderPersonaSelector() {
    const container = $('#memory-persona-selector');
    const summaryEl = $('#memory-persona-summary');
    if (!container || !summaryEl) return;

    const personas = state.personas || [];
    const currentId = String(state.memoryModalDraftPersonaId || state.memory?.personaId || (personas[0]?.id || '1'));

    if (personas.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem">Belum ada persona tersimpan.</div>';
        summaryEl.innerHTML = '';
        return;
    }

    container.innerHTML = personas.map(p => {
        const isSelected = String(p.id) === currentId;
        return `
            <button type="button" class="persona-chip-btn ${isSelected ? 'active' : ''}" data-id="${escapeHtml(p.id)}">
                <span class="persona-chip-avatar">${getAvatarInnerHtml(p.avatar, p.name || 'User')}</span>
                <span class="persona-chip-index">#${escapeHtml(p.index || p.id)}</span>
                <span class="persona-chip-name">${escapeHtml(p.name || 'User')}</span>
            </button>
        `;
    }).join('');

    container.querySelectorAll('.persona-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            selectMemoryPersona(id);
        });
    });

    const activePersona = personas.find(p => String(p.id) === currentId) || personas[0];
    if (activePersona) {
        const details = [];
        if (activePersona.gender) details.push(`Gender: ${escapeHtml(activePersona.gender)}`);
        if (activePersona.age !== undefined && activePersona.age !== null && activePersona.age !== '') details.push(`Umur: ${escapeHtml(activePersona.age)} th`);
        if (activePersona.height) details.push(`TB: ${escapeHtml(activePersona.height)} cm`);
        if (activePersona.weight) details.push(`BB: ${escapeHtml(activePersona.weight)} kg`);
        if (activePersona.extra && typeof activePersona.extra === 'object') {
            for (const [k, v] of Object.entries(activePersona.extra)) {
                if (v) details.push(`${escapeHtml(k)}: ${escapeHtml(v)}`);
            }
        }
        summaryEl.innerHTML = `
            <div class="persona-active-card">
                <div class="persona-active-avatar">${getAvatarInnerHtml(activePersona.avatar, activePersona.name || 'User')}</div>
                <div class="persona-active-info">
                    <div class="persona-active-title">${escapeHtml(activePersona.name || 'User')}</div>
                    <div class="persona-active-meta">${details.length > 0 ? details.join(' • ') : 'Tidak ada detail tambahan'}</div>
                </div>
            </div>
        `;
    } else {
        summaryEl.innerHTML = '';
    }
}

async function selectMemoryPersona(personaId) {
    const nextPid = String(personaId);
    if (!state.memory) {
        state.memory = { facts: [], summaries: [], importantEvents: [], personaId: nextPid, personaMemories: {} };
    }

    // 1. Save current persona's draft items into its sticky slot before switching
    const prevPid = String(state.memoryModalDraftPersonaId || state.memory.personaId || '1');
    syncCurrentPersonaSlotInState(prevPid);

    // 2. Clear any unsubmitted text in the input boxes so it doesn't bleed visually
    const factInput = $('#memory-new-fact');
    const eventInput = $('#memory-new-event');
    if (factInput) factInput.value = '';
    if (eventInput) eventInput.value = '';

    // 3. Switch state.memory to the newly selected persona's sticky slot & refresh entire Memory UI immediately
    applyPersonaSlotToState(nextPid);
    renderMemory();

    // 4. Persist persona switch and sticky slots to backend
    if (state.currentGroupId) {
        const requestGroupId = state.currentGroupId;
        const group = state.groups.find(g => g.id === requestGroupId);
        if (group) {
            group.activePersonaId = nextPid;
        }
        const [grpRes, memRes] = await Promise.all([
            api('PUT', `/api/groups/${requestGroupId}`, { activePersonaId: nextPid }),
            api('PUT', `/api/groups/${requestGroupId}/memory`, {
                personaId: nextPid,
                switchPersonaOnly: true,
                personaMemories: state.memory.personaMemories
            })
        ]);
        if ((grpRes && grpRes.error) || (memRes && memRes.error)) {
            toast((grpRes && grpRes.error) || (memRes && memRes.error), 'error');
            return;
        }
        if (state.currentGroupId === requestGroupId && Array.isArray(state.currentGroupMessages) && state.currentGroupMessages.length > 0) {
            renderGroupMessages(state.currentGroupMessages, false);
        }
    } else if (state.currentCharacterId) {
        const requestCharacterId = state.currentCharacterId;
        const res = await api('PUT', `/api/memory/${requestCharacterId}`, {
            personaId: nextPid,
            switchPersonaOnly: true,
            personaMemories: state.memory.personaMemories
        });
        if (res && res.error) {
            toast(res.error, 'error');
            return;
        }
        if (state.currentCharacterId === requestCharacterId && Array.isArray(state.currentMessages) && state.currentMessages.length > 0) {
            renderMessages(state.currentMessages, false);
        }
    }
}
window.selectMemoryPersona = selectMemoryPersona;

function removeMemoryItem(key, index) {
    if (!state.memory || !Array.isArray(state.memory[key])) return;
    state.memory[key].splice(index, 1);
    syncCurrentPersonaSlotInState();
    renderMemory();
}

function addMemoryFact() {
    const input = $('#memory-new-fact');
    const val = input.value.trim();
    if (!val || !state.memory) return;
    state.memory.facts = state.memory.facts || [];
    state.memory.facts.push(val);
    syncCurrentPersonaSlotInState();
    input.value = '';
    renderMemory();
}

function addMemoryEvent() {
    const input = $('#memory-new-event');
    const val = input.value.trim();
    if (!val || !state.memory) return;
    state.memory.importantEvents = state.memory.importantEvents || [];
    state.memory.importantEvents.push({
        description: val,
        date: new Date().toISOString().split('T')[0]
    });
    syncCurrentPersonaSlotInState();
    input.value = '';
    renderMemory();
}

async function saveMemory() {
    if (state.currentGroupId) {
        if (!state.memory) return;
        const requestGroupId = state.currentGroupId;

        if (state.memoryModalDraftPersonaId) {
            state.memory.personaId = String(state.memoryModalDraftPersonaId);
        }
        syncCurrentPersonaSlotInState(state.memory.personaId);

        const res = await api('PUT', `/api/groups/${requestGroupId}/memory`, state.memory);
        if (!res || res.error) {
            toast((res && res.error) || 'Failed to save group memory', 'error');
            return;
        }
        if (state.currentGroupId !== requestGroupId) return;
        state.memory = res;
        const group = state.groups.find(g => g.id === requestGroupId);
        if (group && state.memory.personaId) {
            group.activePersonaId = state.memory.personaId;
            await api('PUT', `/api/groups/${requestGroupId}`, { activePersonaId: state.memory.personaId });
        }

        if (state.currentGroupChatId) {
            const freshChat = await api('GET', `/api/groups/${requestGroupId}/chat/${state.currentGroupChatId}`);
            if (freshChat && Array.isArray(freshChat.messages)) {
                renderGroupMessages(freshChat.messages, false);
            }
        }

        toast(t('toast.group_memory_saved') || 'Memori grup disimpan!', 'success');
        closeModal('modal-memory');
        return;
    }

    if (!state.currentCharacterId || !state.memory) return;
    const requestCharacterId = state.currentCharacterId; // capture before the await

    if (state.memoryModalDraftPersonaId) {
        state.memory.personaId = String(state.memoryModalDraftPersonaId);
    }
    syncCurrentPersonaSlotInState(state.memory.personaId);

    const res = await api('PUT', `/api/memory/${requestCharacterId}`, state.memory);
    if (!res || res.error) {
        toast((res && res.error) || 'Failed to save memory', 'error');
        return;
    }
    if (state.currentCharacterId !== requestCharacterId) return;
    state.memory = res;

    if (state.currentChatId) {
        const freshChat = await api('GET', `/api/chat/${state.currentChatId}`);
        if (freshChat && Array.isArray(freshChat.messages) && state.currentCharacterId === requestCharacterId) {
            state.currentMessages = freshChat.messages;
            const currentChat = state.chats.find(c => c.id === state.currentChatId);
            if (currentChat) currentChat.messages = freshChat.messages;
            renderMessages(freshChat.messages, false);
        } else if (Array.isArray(state.currentMessages) && state.currentMessages.length > 0) {
            renderMessages(state.currentMessages, false);
        }
    }

    toast(t('toast.memory_saved'), 'success');
    closeModal('modal-memory');
}

async function summarizeMemory() {
    if (!state.currentCharacterId || !state.currentChatId) {
        toast(t('toast.select_chat_first'), 'error');
        return;
    }

    const requestCharacterId = state.currentCharacterId; // capture before the (5-120s) await
    const btn = $('#btn-summarize-memory');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> ' + t('btn.saving');

    try {
        if (state.memory) {
            if (state.memoryModalDraftPersonaId) {
                state.memory.personaId = String(state.memoryModalDraftPersonaId);
            }
            syncCurrentPersonaSlotInState(state.memory.personaId);
            const saveRes = await api('PUT', `/api/memory/${requestCharacterId}`, state.memory);
            if (saveRes && saveRes.error) {
                toast(saveRes.error, 'error');
                return;
            }
        }

        const activePid = String(state.memoryModalDraftPersonaId || state.memory?.personaId || '1');
        const result = await api('POST', `/api/memory/${requestCharacterId}/summarize`, {
            chatId: state.currentChatId,
            personaId: activePid
        });

        if (state.currentCharacterId !== requestCharacterId) return;

        if (result.error) {
            toast(result.error, 'error');
        } else {
            state.memory = result.memory;
            applyPersonaSlotToState(state.memoryModalDraftPersonaId || state.memory.personaId);
            renderMemory();
            if (result.warning) {
                toast(result.warning, 'warning');
            } else {
                const statsMsg = (result.added !== undefined)
                    ? ` (+${result.added} facts, ${result.superseded || 0} updated)`
                    : '';
                toast((t('toast.memory_summarized') || 'Facts extracted!') + statsMsg, 'success');
            }
        }
    } catch (err) {
        if (state.currentCharacterId === requestCharacterId) {
            toast(`Error: ${err.message}`, 'error');
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = t('memory.btn_extract_facts') || 'Extract Facts';
    }
}

async function dumpCurrentChat() {
    if (!state.currentChatId) {
        toast(t('toast.select_chat_first') || 'Select a chat first', 'error');
        return;
    }
    const btn = $('#btn-dump-chat');
    if (btn) btn.disabled = true;
    try {
        const res = await api('POST', `/api/chat/${state.currentChatId}/dump`);
        if (!res || res.error) {
            toast((res && res.error) || 'Failed to dump chat', 'error');
            return;
        }
        toast(`Saved ${res.messageCount} turns to ${res.file}`, 'success');
    } catch (err) {
        toast(`Error: ${err.message}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ══════════════════════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════════════════════

function showView(viewId) {
    $$('.view').forEach(v => v.classList.remove('active'));
    const target = $(`#${viewId}`);
    if (target) target.classList.add('active');
}

function openModal(id) {
    $(`#${id}`).classList.add('show');
}

function closeModal(id) {
    if (id === 'modal-memory') {
        state.memoryModalDraftPersonaId = null;
    }
    $(`#${id}`).classList.remove('show');
}

function toast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);

    const duration = Math.min(7000, Math.max(3000, message.length * 60));
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.3s ease';
        setTimeout(() => el.remove(), 300);
    }, duration);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    // div.innerHTML escapes & < > for text nodes, but NOT quotes (quotes only
    // matter inside attribute values, which is exactly where several callers
    // use this output — e.g. value="${escapeHtml(x)}"). Escape them explicitly.
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatInlineMarkdown(text) {
    if (!text) return '';
    // Combined outer-to-inner tokenizer so bold, italic (*...*), and dialogue quotes ("...")
    // never produce crossed/misnested HTML tags.
    const tokenRegex = /(?<!\*)\*\*\*(?!\s|\*)((?:(?!\*\*\*)[^\n]|\n(?!\n))+?)(?<!\s|\*)\*\*\*(?!\*)|(?<!\*)\*\*(?!\s|\*)((?:(?!\*\*)[^\n]|\n(?!\n))+?)(?<!\s|\*)\*\*(?!\*)|\b__([^\n_]+)__\b|(?<!\*)\*(?!\s|\*)((?:[^\*\n]|\n(?!\n))+?)(?<!\s|\*)\*(?!\*)|(?:&quot;|“)((?:(?!(?:&quot;|”|“)).|\n(?!\n))+?)(?:&quot;|”)/g;

    return text.replace(tokenRegex, (match, boldItalic, boldStar, boldUnder, italic, dialog) => {
        if (boldItalic !== undefined) {
            return `<strong><em class="action-text">${formatInlineMarkdown(boldItalic)}</em></strong>`;
        }
        if (boldStar !== undefined) {
            return `<strong>${formatInlineMarkdown(boldStar)}</strong>`;
        }
        if (boldUnder !== undefined) {
            return `<strong>${formatInlineMarkdown(boldUnder)}</strong>`;
        }
        if (italic !== undefined) {
            return `<em class="action-text">${formatInlineMarkdown(italic)}</em>`;
        }
        if (dialog !== undefined) {
            return `<span class="dialog-text">&quot;${formatInlineMarkdown(dialog)}&quot;</span>`;
        }
        return match;
    });
}

function formatMessageContent(content) {
    if (!content) return '';
    let html = escapeHtml(content);

    // Protect fenced code blocks and inline code from markdown formatting
    const codeBlocks = [];
    html = html.replace(/```([a-zA-Z0-9_+#.-]*)[ \t]*\n?([\s\S]*?)```/g, (match, lang, code) => {
        const idx = codeBlocks.length;
        const langLabel = (lang || 'code').toLowerCase();
        codeBlocks.push(`
            <div class="code-block-wrapper">
                <div class="code-block-header">
                    <span>${escapeHtml(langLabel)}</span>
                    <button type="button" class="code-copy-btn" onclick="copyCodeBlock(this)">${t('chat.action.copy') || 'Copy'}</button>
                </div>
                <pre><code class="language-${escapeHtml(langLabel)}">${code}</code></pre>
            </div>
        `.trim());
        return `@@CODE_BLOCK_${idx}@@`;
    });
    html = html.replace(/`([^`\n]+)`/g, (match, code) => {
        const idx = codeBlocks.length;
        codeBlocks.push(`<code>${code}</code>`);
        return `@@CODE_BLOCK_${idx}@@`;
    });

    // Markdown tables: detect contiguous lines starting and ending with | and a separator row with at least one -
    html = html.replace(/(?:^|\n)(\|.+\|[ \t]*\n\|[\s:\-|]*-[\s:\-|]*\|[ \t]*(?:\n\|.+\|[ \t]*)*)/g, (match, tableBlock) => {
        const lines = tableBlock.trim().split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return match;
        if (!/^\|[\s:\-|]*-[\s:\-|]*\|$/.test(lines[1])) return match;
        const parseRow = (line) => line.replace(/^\||\|$/g, '').split('|').map(c => formatInlineMarkdown(c.trim()));
        const headers = parseRow(lines[0]);
        const bodyRows = lines.slice(2).map(parseRow);
        const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        const tbody = bodyRows.length
            ? `<tbody>${bodyRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
            : '';
        const idx = codeBlocks.length;
        codeBlocks.push(`<div class="table-wrap"><table class="message-table">${thead}${tbody}</table></div>`);
        return `\n@@CODE_BLOCK_${idx}@@`;
    });

    // Apply inline markdown formatting (bold, italic/action, dialogue quotes)
    html = formatInlineMarkdown(html);

    // Paragraphs & line breaks: split double newlines into comfortable paragraphs, single newlines into <br>
    html = html
        .split(/\n{2,}/)
        .map(para => `<p class="msg-para">${para.replace(/\n/g, '<br>')}</p>`)
        .join('');

    // Restore protected code blocks & tables (loop so nested inline code in tables is also restored)
    let guard = 0;
    while (/@@CODE_BLOCK_\d+@@/.test(html) && guard++ < 10) {
        html = html.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, idx) => codeBlocks[Number(idx)] || '');
    }

    return html;
}

async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall through to execCommand fallback
        }
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch {
        ok = false;
    }
    document.body.removeChild(ta);
    return ok;
}

window.copyCodeBlock = async function (btn) {
    if (!btn) return;
    const wrapper = btn.closest('.code-block-wrapper');
    const codeEl = wrapper ? wrapper.querySelector('pre code') : null;
    if (!codeEl) return;
    const ok = await copyToClipboard(codeEl.textContent || '');
    if (ok) {
        const original = btn.textContent;
        btn.textContent = t('chat.copied') || 'Copied';
        setTimeout(() => { btn.textContent = original; }, 1600);
    } else {
        toast('Failed to copy code', 'error');
    }
};

window.copyMessageText = async function (btn) {
    if (!btn) return;
    const msgEl = btn.closest('.message');
    const bubbleEl = msgEl ? msgEl.querySelector('.message-bubble') : null;
    if (!bubbleEl) return;
    const clone = bubbleEl.cloneNode(true);
    clone.querySelectorAll('.code-block-header').forEach(el => el.remove());
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    const paras = clone.querySelectorAll('.msg-para');
    const textToCopy = paras.length > 0
        ? Array.from(paras).map(p => p.textContent).join('\n\n')
        : (clone.innerText || clone.textContent || '');
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = UI_ICONS.check;
        setTimeout(() => { btn.innerHTML = originalHtml; }, 1400);
    } else {
        toast('Failed to copy message', 'error');
    }
};

function formatTime(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function autoResizeInput() {
    const input = $('#chat-input');
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    if (typeof updateJumpToLatestBtn === 'function') {
        updateJumpToLatestBtn();
    }
}

// ══════════════════════════════════════════════════════════
//  EVENT BINDINGS
// ══════════════════════════════════════════════════════════

function bindEvents() {
    // Settings — dedicated page (Configuration, Appearance, Notifications,
    // Data & backup all live there now), not a popup.
    $('#btn-settings').addEventListener('click', () => {
        window.location.href = 'settings.html';
    });

    // Character
    $('#btn-save-character').addEventListener('click', saveCharacter);

    // Avatar upload
    $('#avatar-preview').addEventListener('click', () => {
        $('#char-avatar-file').click();
    });
    $('#char-avatar-file').addEventListener('change', handleAvatarUpload);
    $('#avatar-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        removeAvatar();
    });

    // Pinterest avatar picker
    $('#avatar-pinterest-toggle').addEventListener('click', togglePinterestPanel);
    $('#pinterest-search-btn').addEventListener('click', searchPinterest);
    $('#pinterest-query').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); searchPinterest(); }
    });
    $('#pinterest-prev-btn').addEventListener('click', () => stepPinterestResult(-1));
    $('#pinterest-next-btn').addEventListener('click', () => stepPinterestResult(1));
    $('#pinterest-use-btn').addEventListener('click', usePinterestImage);
    $('#btn-edit-character').addEventListener('click', () => {
        if (state.currentCharacterId) {
            openCharacterEditor(state.currentCharacterId);
        }
    });

    // Chat
    const btnSidebarNewChat = $('#btn-sidebar-new-chat');
    if (btnSidebarNewChat) btnSidebarNewChat.addEventListener('click', () => startNewChat());
    $('#chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    // Auto-resize textarea
    $('#chat-input').addEventListener('input', autoResizeInput);

    // Enter to send (Shift+Enter for newline, or mobile always newline)
    $('#chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (window.innerWidth <= 768) {
                // On mobile, Enter just creates a newline, don't send
                return;
            }
            e.preventDefault();
            sendMessage();
        }
    });

    // Memory
    $('#btn-memory-view').addEventListener('click', openMemoryViewer);
    $('#btn-save-memory').addEventListener('click', saveMemory);
    $('#btn-summarize-memory').addEventListener('click', summarizeMemory);
    const btnDumpChat = $('#btn-dump-chat');
    if (btnDumpChat) btnDumpChat.addEventListener('click', dumpCurrentChat);
    $('#btn-add-fact').addEventListener('click', addMemoryFact);
    $('#btn-add-event').addEventListener('click', addMemoryEvent);

    // Enter key in memory inputs
    $('#memory-new-fact').addEventListener('keydown', (e) => { if (e.key === 'Enter') addMemoryFact(); });
    $('#memory-new-event').addEventListener('keydown', (e) => { if (e.key === 'Enter') addMemoryEvent(); });

    // Sidebar toggle
    $$('.mobile-menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                $('#sidebar').classList.toggle('open');
            } else {
                $('#sidebar').classList.toggle('closed');
            }
        });
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = $('#sidebar');
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !e.target.closest('.mobile-menu-btn')) {
            sidebar.classList.remove('open');
        }
    });

    // Close modals on overlay click
    $$('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            $$('.modal-overlay.show').forEach(m => closeModal(m.id));
        }
    });

    // Scroll preservation & Jump to latest button
    const chatMessagesEl = $('#chat-messages');
    if (chatMessagesEl) {
        chatMessagesEl.addEventListener('scroll', updateJumpToLatestBtn, { passive: true });
    }
    const jumpLatestBtn = $('#btn-jump-latest');
    if (jumpLatestBtn) {
        jumpLatestBtn.addEventListener('click', () => scrollToBottom(true));
    }

    // Multi-tab synchronization for theme & storage changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'aichat-theme-palette' && window.AIChatTheme) {
            window.AIChatTheme.apply(window.AIChatTheme.load());
        }
    });
}

function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
        $('#sidebar').classList.remove('open');
    }
}

// ══════════════════════════════════════════════════════════
//  AVATAR UPLOAD HANDLERS
// ══════════════════════════════════════════════════════════

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast('Pilih file gambar (JPG, PNG, GIF, WebP)', 'error');
        e.target.value = '';
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        toast('Ukuran file maksimal 5MB', 'error');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 256;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/webp', 0.85);
            $('#char-avatar').value = dataUrl;
            updateAvatarPreview(dataUrl);
        };
        img.onerror = function () {
            toast('Gagal memuat file gambar avatar', 'error');
        };
        img.src = event.target.result;
    };
    reader.onerror = function () {
        toast('Gagal membaca file gambar', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function removeAvatar() {
    $('#char-avatar').value = '';
    $('#char-avatar-file').value = '';
    updateAvatarPreview('');
}

// ══════════════════════════════════════════════════════════
//  PINTEREST AVATAR PICKER
//  Sequential Prev/Next browsing through search results —
//  never random, so a missed image can always be revisited.
// ══════════════════════════════════════════════════════════

function togglePinterestPanel() {
    const panel = $('#pinterest-panel');
    const btn = $('#avatar-pinterest-toggle');
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    btn.classList.toggle('active', !isOpen);
    if (!isOpen) {
        setTimeout(() => $('#pinterest-query').focus(), 50);
    }
}

async function searchPinterest() {
    const query = $('#pinterest-query').value.trim();
    const statusEl = $('#pinterest-status');
    const resultsEl = $('#pinterest-results');

    if (!query) {
        statusEl.textContent = 'Masukkan kata kunci pencarian dulu ya.';
        return;
    }
    if (state.pinterest.loading) return;

    state.pinterest.loading = true;
    resultsEl.style.display = 'none';
    statusEl.textContent = 'Mencari gambar...';

    try {
        const res = await api('GET', `/api/pinterest/search?q=${encodeURIComponent(query)}`);
        if (!res.success) {
            statusEl.textContent = res.error || 'Gagal mencari gambar.';
            state.pinterest.results = [];
            return;
        }
        if (!res.data || res.data.length === 0) {
            statusEl.textContent = `Tidak ada gambar ditemukan untuk "${query}".`;
            state.pinterest.results = [];
            return;
        }
        state.pinterest.results = res.data;
        state.pinterest.index = 0;
        statusEl.textContent = '';
        resultsEl.style.display = 'flex';
        renderPinterestResult();
    } catch (err) {
        statusEl.textContent = 'Terjadi kesalahan saat menghubungi server.';
    } finally {
        state.pinterest.loading = false;
    }
}

function renderPinterestResult() {
    const { results, index } = state.pinterest;
    if (!results.length) return;
    const item = results[index];
    $('#pinterest-thumb').src = `/api/pinterest/image?url=${encodeURIComponent(item.thumb)}`;
    $('#pinterest-counter').textContent = `${index + 1} / ${results.length}`;
}

function stepPinterestResult(direction) {
    const { results } = state.pinterest;
    if (!results.length) return;
    // Clamp instead of wrapping so Prev/Next always moves one-by-one
    // and stops cleanly at the first/last image.
    state.pinterest.index = Math.max(0, Math.min(results.length - 1, state.pinterest.index + direction));
    renderPinterestResult();
}

async function usePinterestImage() {
    const { results, index } = state.pinterest;
    if (!results.length) return;
    const item = results[index];
    const statusEl = $('#pinterest-status');
    const useBtn = $('#pinterest-use-btn');

    useBtn.disabled = true;
    statusEl.textContent = 'Mengunduh gambar...';

    try {
        const proxyUrl = `/api/pinterest/image?url=${encodeURIComponent(item.url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('download failed');
        const blob = await response.blob();
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const resizedDataUrl = await resizeImageDataUrl(dataUrl, 256);
        $('#char-avatar').value = resizedDataUrl;
        updateAvatarPreview(resizedDataUrl);
        statusEl.textContent = '✅ Avatar terpasang dari Pinterest.';
        togglePinterestPanel();
    } catch (err) {
        statusEl.textContent = 'Gagal menggunakan gambar ini, coba gambar lain.';
    } finally {
        useBtn.disabled = false;
    }
}

// Shared resize helper: mirrors the sizing/quality used by manual upload
function resizeImageDataUrl(srcDataUrl, maxSize) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxSize) { height *= maxSize / width; width = maxSize; }
            } else {
                if (height > maxSize) { width *= maxSize / height; height = maxSize; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/webp', 0.85));
        };
        img.onerror = reject;
        img.src = srcDataUrl;
    });
}

// ══════════════════════════════════════════════════════════
//  CHAT RENAME
// ══════════════════════════════════════════════════════════

window.startRenameChat = function (chatId) {
    const chatItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
    if (!chatItem) return;

    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;

    const currentTitle = chat.title || 'New Chat';

    chatItem.removeAttribute('onclick');
    chatItem.innerHTML = `
        <span class="chat-item-icon">${UI_ICONS.chat}</span>
        <div class="chat-item-rename-container">
            <input type="text" class="chat-item-rename-input" value="${escapeHtml(currentTitle)}"
                   data-chat-id="${chatId}" autocomplete="off">
            <div class="chat-item-rename-actions">
                <button class="chat-rename-save" onclick="event.stopPropagation(); saveRenameChat('${chatId}')" title="Simpan">✓</button>
                <button class="chat-rename-cancel" onclick="event.stopPropagation(); cancelRenameChat()" title="Batal">✕</button>
            </div>
        </div>
    `;

    const input = chatItem.querySelector('.chat-item-rename-input');
    input.focus();
    input.select();

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRenameChat(chatId);
        } else if (e.key === 'Escape') {
            cancelRenameChat();
        }
    });
};

window.saveRenameChat = async function (chatId) {
    const input = document.querySelector(`.chat-item-rename-input[data-chat-id="${chatId}"]`);
    if (!input) return;

    const newTitle = input.value.trim();
    if (!newTitle) return cancelRenameChat();

    const requestCharacterId = state.currentCharacterId; // capture before the await

    try {
        const res = await api('PUT', `/api/chat/${chatId}`, { title: newTitle });
        if (!res || res.error) {
            toast((res && res.error) || 'Request failed', 'error');
            if (state.currentCharacterId === requestCharacterId) renderChatList();
            return;
        }

        // If the user switched characters while this PUT was in flight,
        // state.chats now belongs to a different character and won't
        // contain this chat — the rename still succeeded server-side,
        // but there's nothing to update in the currently-visible list.
        if (state.currentCharacterId !== requestCharacterId) return;

        const chat = state.chats.find(c => c.id === chatId);
        if (chat) chat.title = newTitle;

        renderChatList();
        toast('Chat renamed!', 'success');
    } catch (err) {
        toast(`Error: ${err.message}`, 'error');
        if (state.currentCharacterId === requestCharacterId) renderChatList();
    }
};

window.cancelRenameChat = function () {
    renderChatList();
};
