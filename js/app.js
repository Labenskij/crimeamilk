/**
 * Центр инструкций Черноморского молокозавода
 * @version 2.1
 */

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let appData = null;
const instructionsCache = {};
let currentOpenSection = null;
let itUnlocked = false;
let currentItFilter = 'all';
let itSearchQuery = '';
let itInstructionsData = [];

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
const escapeHtml = (str) => str ? str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])) : '';
const markedParse = (text) => text ? marked.parse(text) : '';

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error(`❌ Ошибка ${path}:`, error);
        return null;
    }
}

async function loadAppData() {
    appData = await loadJSON('js/data.json');
    if (appData) console.log('✅ data.json загружен');
}

async function loadCategoryData(category) {
    if (instructionsCache[category]) return instructionsCache[category];
    const data = await loadJSON(`js/${category}.json`);
    if (data && Object.keys(data).length) {
        instructionsCache[category] = data;
        console.log(`✅ ${category}.json загружен`);
    }
    return data || {};
}

function getCategoryForFile(fileName) {
    if (!appData || !fileName) return null;
    for (const [key, dept] of Object.entries(appData.departments || {}))
        if (dept.files?.includes(fileName)) return key;
    if (appData.corporate?.files?.includes(fileName)) return 'corporate';
    if (appData.support?.files?.includes(fileName)) return 'support';
    for (const city of Object.values(appData.stores || {}))
        if (city.shops?.some(shop => shop.file === fileName)) return 'stores';
    return null;
}

async function getInstruction(fileName) {
    const category = getCategoryForFile(fileName);
    if (!category) return null;
    const data = await loadCategoryData(category);
    return data[fileName] || null;
}

const getTitle = (file) => appData?.titles?.[file] || file || 'Инструкция';
const getDesc = (file) => appData?.descs?.[file] || 'Инструкция';
const getGoogleUrl = (fileName, instructionData) => {
    if (instructionData?.googleDocUrl) return instructionData.googleDocUrl;
    for (const city of Object.values(appData?.stores || {}))
        for (const shop of city.shops || [])
            if (shop.file === fileName && shop.googleDocUrl) return shop.googleDocUrl;
    return null;
};

// ==================== МОДАЛЬНОЕ ОКНО ПАРОЛЯ ====================
function showPasswordModal(callback, file) {
    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('passwordInput');
    const errorDiv = document.getElementById('passwordError');
    if (!modal) return;

    input.value = '';
    errorDiv.style.display = 'none';
    modal.style.display = 'flex';

    const closeModal = () => {
        modal.style.display = 'none';
        input.value = '';
        errorDiv.style.display = 'none';
    };

    const handleConfirm = () => {
        if (input.value === 'Hesoyam1607') {
            itUnlocked = true;
            closeModal();
            if (callback) callback(file);
            renderDepartments();
        } else {
            errorDiv.textContent = '❌ Неверный пароль! Доступ запрещен.';
            errorDiv.style.display = 'block';
            input.value = '';
            input.focus();
        }
    };

    const handleKeydown = (e) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') closeModal();
    };

    document.getElementById('passwordConfirmBtn').onclick = handleConfirm;
    document.getElementById('passwordCancelBtn').onclick = closeModal;
    modal.querySelector('.modal-close').onclick = closeModal;
    modal.querySelector('.modal-overlay').onclick = closeModal;
    input.onkeydown = handleKeydown;
    setTimeout(() => input.focus(), 50);
}

// ==================== РЕНДЕР КОМПОНЕНТОВ ====================
function renderCards(containerId, files, isProtected = false) {
    const container = document.getElementById(containerId);
    if (!container || !files?.length) return;

    container.innerHTML = files.map(file => `
        <div class="card">
            <div class="card-title">${escapeHtml(getTitle(file))}</div>
            <div class="card-desc">${escapeHtml(getDesc(file))}</div>
            <a class="card-link" href="#" data-file="${file}" data-protected="${isProtected}">📖 Открыть инструкцию →</a>
        </div>
    `).join('');

    container.querySelectorAll('.card-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const file = link.dataset.file;
            const isProtectedLink = link.dataset.protected === 'true';
            if (isProtectedLink && !itUnlocked) {
                showPasswordModal((unlockedFile) => { if (unlockedFile === file) showModal(file); }, file);
            } else {
                await showModal(file);
            }
        });
    });
}

function renderStores() {
    const container = document.getElementById('stores-content');
    if (!container || !appData) return;

    container.innerHTML = Object.entries(appData.stores || {}).map(([_, city]) => `
        <div class="city-title">📍 ${escapeHtml(city.city)}</div>
        <table class="store-table"><thead><tr><th>ID</th><th>Адрес</th><th>Инструкция</th></tr></thead>
        <tbody>${city.shops.map(shop => `<tr><td><span class="badge-id">${escapeHtml(shop.id)}</span></td><td>${escapeHtml(shop.address)}</td><td><a class="store-link" href="#" data-file="${shop.file}">📄 Открыть</a></td></tr>`).join('')}</tbody></table>
    `).join('');

    document.querySelectorAll('.store-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const file = link.dataset.file;
            if (file) await showModal(file);
        });
    });
}

function renderDepartments() {
    const container = document.getElementById('departments-content');
    if (!container || !appData) return;

    container.innerHTML = '';
    const deptKeys = Object.keys(appData.departments || {});

    deptKeys.forEach((key, idx) => {
        const dept = appData.departments[key];
        if (!dept?.files) return;

        const isProtected = dept.protected === true;
        const isSpecialWindow = dept.isSpecialWindow === true;
        const deptId = `dept-${key}-cards`;

        container.innerHTML += `
            <div class="dept-section" data-dept-key="${key}">
                <div class="dept-header">
                    <h3 class="dept-name">${escapeHtml(dept.name)} ${isProtected ? '<span class="protected-badge">🔒 Защищено</span>' : ''} ${isSpecialWindow ? '<span class="special-window-badge">🪟 Дашборд</span>' : ''}</h3>
                    ${isProtected && !itUnlocked && !isSpecialWindow ? `<button class="unlock-dept-btn" data-dept-key="${key}">🔓 Разблокировать отдел</button>` : ''}
                </div>
                <div class="grid-cards" id="${deptId}"></div>
            </div>
        `;
        if (idx < deptKeys.length - 1) container.innerHTML += '<hr class="dept-divider">';

        if (isSpecialWindow) {
            setTimeout(() => {
                const cardsContainer = document.getElementById(deptId);
                if (cardsContainer) {
                    cardsContainer.innerHTML = `<div class="special-window-card"><div style="font-size:3rem;margin-bottom:12px;">🪟</div><h4>Отдельный дашборд IT-отдела</h4><p>С фильтрацией, поиском и категориями инструкций</p><button class="open-it-dashboard-btn">🚀 Открыть IT-дашборд</button></div>`;
                    cardsContainer.querySelector('.open-it-dashboard-btn').addEventListener('click', async () => {
                        if (isProtected && !itUnlocked) {
                            showPasswordModal(async () => {
                                itUnlocked = true;
                                renderDepartments();
                                await loadItInstructions();
                                showItDashboard();
                            });
                        } else {
                            await loadItInstructions();
                            showItDashboard();
                        }
                    });
                }
            }, 0);
        } else if (isProtected && !itUnlocked) {
            setTimeout(() => {
                const btn = document.querySelector(`.unlock-dept-btn[data-dept-key="${key}"]`);
                if (btn) btn.addEventListener('click', () => showPasswordModal(() => { itUnlocked = true; renderDepartments(); }));
            }, 0);
            setTimeout(() => renderCards(deptId, [], true), 0);
        } else {
            setTimeout(() => renderCards(deptId, dept.files, isProtected && !itUnlocked), 0);
        }
    });
}

function renderCorpAndSupport() {
    if (!appData) return;
    renderCards('corp-cards', appData.corporate?.files || [], false);
    renderCards('support-cards', appData.support?.files || [], false);
}

// ==================== РЕНДЕР КОНТЕНТА МОДАЛКИ ====================
const contentRenderers = {
    text: (block) => `<div class="instruction-text">${markedParse(block.value)}</div>`,
    image: (block) => `<div class="instruction-image"><img src="${block.src}" alt="${block.alt || 'Изображение'}" loading="lazy" onclick="this.requestFullscreen?.()" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect width=%22200%22 height=%22200%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22%3E%D0%9D%D0%B5%D1%82%20%D1%84%D0%BE%D1%82%D0%BE%3C/text%3E%3C/svg%3E'">${block.caption ? `<div class="image-caption">📸 ${escapeHtml(block.caption)}</div>` : ''}</div>`,
    note: (block) => `<div class="instruction-note" style="display:flex;gap:14px;padding:16px 20px;margin:20px 0;border-radius:16px;background:#e8f4e8;border-left:5px solid #2b7a4b"><div>💡</div><div>${markedParse(block.value)}</div></div>`,
    step: (block, idx) => `<div style="display:flex;gap:16px;margin:16px 0"><div style="min-width:32px;height:32px;background:#2b7a4b;color:white;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold">${block.number || idx + 1}</div><div>${markedParse(block.value)}</div></div>`,
    warning: (block) => `<div class="instruction-warning" style="display:flex;gap:14px;padding:16px 20px;margin:20px 0;border-radius:16px;background:#fef4e8;border-left:5px solid #e67e22"><div>⚠️</div><div>${markedParse(block.value)}</div></div>`
};

function renderContentBlock(block, idx) {
    const renderer = contentRenderers[block.type];
    return renderer ? renderer(block, idx) : `<div class="instruction-text">${markedParse(block.value || '')}</div>`;
}

// ==================== МОДАЛЬНОЕ ОКНО ====================
async function showModal(fileName) {
    if (!fileName) return;
    const modal = document.getElementById('instructionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const googleBtn = document.getElementById('modalGoogleBtn');
    if (!modal) return;

    document.getElementById('modalBreadcrumb').style.display = 'none';
    modalTitle.innerText = getTitle(fileName);
    modalBody.innerHTML = '<div style="text-align:center;padding:40px;">📥 Загрузка...</div>';
    modal.style.display = 'flex';

    try {
        const instruction = await getInstruction(fileName);
        const googleUrl = getGoogleUrl(fileName, instruction);
        googleBtn.style.display = googleUrl ? 'inline-flex' : 'none';
        if (googleUrl) googleBtn.onclick = () => window.open(googleUrl, '_blank');
        modalBody.innerHTML = instruction?.content?.length ? instruction.content.map(renderContentBlock).join('') : markedParse('# Инструкция в разработке\n\nПерейдите по ссылке через кнопку "Открыть в Google Docs" ↓');
        modal.querySelector('.modal-container')?.scrollTo(0, 0);
    } catch (error) {
        modalBody.innerHTML = '<div style="color:red;">⚠️ Ошибка загрузки инструкции</div>';
        googleBtn.style.display = 'none';
    }
}

function closeModal() { document.getElementById('instructionModal').style.display = 'none'; }

// ==================== ПРИЛОЖЕНИЯ ====================
function showAppsModal() {
    const modal = document.getElementById('appsModal');
    if (!modal || !appData) return;
    document.getElementById('appsModalBody').innerHTML = Object.values(appData.apps || {}).map(app => `
        <div class="app-card"><h4>📱 ${escapeHtml(app.name)}</h4><p>${escapeHtml(app.description)}</p>${app.instructions ? `<p><strong>📌 Настройки:</strong> ${escapeHtml(app.instructions)}</p>` : ''}<a href="${app.downloadUrl}" target="_blank" class="download-link">⬇️ Скачать</a></div>
    `).join('');
    modal.style.display = 'flex';
}
function closeAppsModal() { document.getElementById('appsModal').style.display = 'none'; }

// ==================== ТЕМА ====================
function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', saved);
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = saved === 'light' ? '🌙' : '☀️';
        btn.onclick = () => {
            const next = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            btn.textContent = next === 'light' ? '🌙' : '☀️';
        };
    }
}

function toggleSection(header) {
    const section = header.closest('.section');
    if (!section) return;
    if (currentOpenSection && currentOpenSection !== section) currentOpenSection.classList.remove('open');
    section.classList.toggle('open');
    currentOpenSection = section.classList.contains('open') ? section : null;
}

// ==================== IT-ДАШБОРД ====================
async function loadItInstructions() {
    const itData = await loadCategoryData('it');
    itInstructionsData = [];
    for (const [id, instruction] of Object.entries(itData)) {
        itInstructionsData.push({ id, title: getTitle(id), desc: getDesc(id), category: instruction.category || 'local_settings' });
    }
    return itInstructionsData;
}

function renderItCard(item) {
    const categoryNames = { stores: '🏪 Магазины', sales_agents: '🚀 Торговые агенты', pos: '🖨️ Кассы / ККТ', servers: '🖥️ Серверы', local_settings: '⚙️ Локальные настройки' };
    return `<div class="it-card" data-file="${item.id}"><div class="it-card-category">${categoryNames[item.category] || '📄 Документация'}</div><div class="it-card-title">📄 ${escapeHtml(item.title)}</div><div class="it-card-desc">${escapeHtml(item.desc)}</div><span class="it-card-link">Открыть инструкцию →</span></div>`;
}

function renderItDashboard(filter = 'all', search = '') {
    const container = document.getElementById('itCardsContainer');
    if (!container) return;

    let filtered = itInstructionsData.filter(i => (filter === 'all' || i.category === filter) && (!search.trim() || i.title.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase())));

    if (!filtered.length) {
        container.innerHTML = `<div class="it-empty-state"><div style="font-size:3rem;margin-bottom:16px;">📭</div><h4>Ничего не найдено</h4><p>Попробуйте изменить фильтр или поисковый запрос</p></div>`;
        return;
    }

    if (filter === 'all' && !search.trim()) {
        const cats = { stores: '🏪 Магазины', sales_agents: '🚀 Торговые агенты', pos: '🖨️ Кассы / ККТ', servers: '🖥️ Серверы', local_settings: '⚙️ Локальные настройки' };
        let html = '';
        for (const [key, name] of Object.entries(cats)) {
            const items = filtered.filter(i => i.category === key);
            if (items.length) html += `<div class="it-category-group"><div class="it-category-title">${name} <span class="it-category-count">${items.length}</span></div><div class="it-cards-grid">${items.map(renderItCard).join('')}</div></div>`;
        }
        container.innerHTML = html;
    } else {
        container.innerHTML = `<div class="it-cards-grid">${filtered.map(renderItCard).join('')}</div>`;
    }

    document.querySelectorAll('.it-card').forEach(card => card.addEventListener('click', () => showItInstruction(card.dataset.file)));
}

function resetItBreadcrumb() {
    const bc = document.getElementById('itBreadcrumb');
    if (bc) bc.innerHTML = '<span class="breadcrumb-item active">📁 IT-библиотека</span>';
}

function updateFilterButtons() {
    document.querySelectorAll('.it-filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentItFilter));
}

async function showItDashboard() {
    const modal = document.getElementById('itDashboardModal');
    if (!modal) return;
    if (!itInstructionsData.length) await loadItInstructions();
    currentItFilter = 'all';
    itSearchQuery = '';
    const searchInput = document.getElementById('itSearchInput');
    if (searchInput) searchInput.value = '';
    document.getElementById('itClearSearch').style.display = 'none';
    resetItBreadcrumb();
    renderItDashboard('all', '');
    updateFilterButtons();
    modal.style.display = 'flex';
}

function closeItDashboard() { document.getElementById('itDashboardModal').style.display = 'none'; }

async function showItInstruction(fileId) {
    const instruction = itInstructionsData.find(i => i.id === fileId);
    if (!instruction) return;
    const modal = document.getElementById('instructionModal');
    document.getElementById('modalBreadcrumb').style.display = 'flex';
    document.getElementById('modalTitle').innerText = instruction.title;
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;padding:40px;">📥 Загрузка...</div>';
    modal.style.display = 'flex';

    try {
        const full = await getInstruction(fileId);
        const googleUrl = getGoogleUrl(fileId, full);
        const googleBtn = document.getElementById('modalGoogleBtn');
        googleBtn.style.display = googleUrl ? 'inline-flex' : 'none';
        if (googleUrl) googleBtn.onclick = () => window.open(googleUrl, '_blank');
        document.getElementById('modalBody').innerHTML = full?.content?.length ? full.content.map(renderContentBlock).join('') : markedParse('# Инструкция в разработке');
    } catch (error) {
        document.getElementById('modalBody').innerHTML = '<div style="color:red;">⚠️ Ошибка загрузки</div>';
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadAppData();
    if (appData) {
        renderStores();
        renderDepartments();
        renderCorpAndSupport();
    } else {
        const dept = document.getElementById('departments-content');
        if (dept) dept.innerHTML = '<div class="note">⚠️ Ошибка загрузки данных</div>';
    }
    initTheme();

    document.querySelectorAll('.quick-nav a:not(#appsDownloadBtn)').forEach(anchor => {
        const href = anchor.getAttribute('href');
        if (href?.startsWith('#')) {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(href.substring(1));
                if (target?.classList.contains('section')) {
                    if (currentOpenSection && currentOpenSection !== target) currentOpenSection.classList.remove('open');
                    target.classList.add('open');
                    currentOpenSection = target;
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    });

    document.getElementById('appsDownloadBtn')?.addEventListener('click', (e) => { e.preventDefault(); showAppsModal(); });

    // IT-дашборд события
    const searchInput = document.getElementById('itSearchInput');
    const clearBtn = document.getElementById('itClearSearch');
    if (searchInput) searchInput.addEventListener('input', (e) => {
        itSearchQuery = e.target.value;
        if (clearBtn) clearBtn.style.display = itSearchQuery ? 'block' : 'none';
        renderItDashboard(currentItFilter, itSearchQuery);
    });
    if (clearBtn) clearBtn.addEventListener('click', () => {
        itSearchQuery = '';
        if (searchInput) searchInput.value = '';
        clearBtn.style.display = 'none';
        renderItDashboard(currentItFilter, '');
    });
    document.querySelectorAll('.it-filter-btn').forEach(btn => btn.addEventListener('click', () => {
        currentItFilter = btn.dataset.filter;
        itSearchQuery = '';
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        renderItDashboard(currentItFilter, '');
        updateFilterButtons();
        resetItBreadcrumb();
    }));

    // Закрытие модалок
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal();
            closeAppsModal();
            closeItDashboard();
            const pass = document.getElementById('passwordModal');
            if (pass) pass.style.display = 'none';
        }
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.addEventListener('click', () => {
        closeModal();
        closeAppsModal();
        closeItDashboard();
        const pass = document.getElementById('passwordModal');
        if (pass) pass.style.display = 'none';
    }));
});
