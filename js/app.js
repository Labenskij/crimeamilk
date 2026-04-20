/**
 * Центр инструкций Черноморского молокозавода
 * @version 3.0 - с системой вложенных модальных окон
 */

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let appData = null;
const instructionsCache = {};
let currentOpenSection = null;
let itUnlocked = false;
let currentItFilter = 'all';
let itSearchQuery = '';
let itInstructionsData = [];

// ==================== СИСТЕМА СТЕКА МОДАЛЬНЫХ ОКОН ====================
const modalStack = [];

// Базовые z-index для уровней вложенности
const BASE_Z_INDEX = 1000;
const Z_INDEX_STEP = 100;

// Функция получения z-index для уровня
function getZIndexForLevel(level) {
    return BASE_Z_INDEX + (level * Z_INDEX_STEP);
}

// Функция получения opacity overlay для уровня
function getOverlayOpacityForLevel(level) {
    return Math.min(0.75 + (level * 0.08), 0.95);
}

// Функция получения blur для уровня
function getBlurForLevel(level) {
    return Math.min(6 + (level * 2), 16);
}

// Обновление видимости всех модалок в стеке
function updateModalStack() {
    modalStack.forEach((item, index) => {
        const modal = item.modal;
        const level = index;
        const zIndex = getZIndexForLevel(level);
        const overlayOpacity = getOverlayOpacityForLevel(level);
        const blurAmount = getBlurForLevel(level);
        
        modal.style.display = 'flex';
        modal.style.zIndex = zIndex;
        
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.style.backgroundColor = `rgba(0, 0, 0, ${overlayOpacity})`;
            overlay.style.backdropFilter = `blur(${blurAmount}px)`;
        }
    });
}

// Добавление модалки в стек
function pushToStack(modal, data) {
    modalStack.push({ modal, data });
    updateModalStack();
}

// Удаление последней модалки из стека (без закрытия)
function popFromStack() {
    const removed = modalStack.pop();
    if (removed) {
        removed.modal.style.display = 'none';
    }
    updateModalStack();
    return removed;
}

// Закрытие текущей (верхней) модалки
function closeCurrentModal() {
    if (modalStack.length === 0) return;
    popFromStack();
}

// Закрытие всех модалок
function closeAllModals() {
    while (modalStack.length > 0) {
        const item = modalStack.pop();
        item.modal.style.display = 'none';
    }
    updateModalStack();
}

// Возврат к предыдущей модалке (закрыть текущую)
function goBackToPreviousModal() {
    if (modalStack.length <= 1) {
        // Если это последняя модалка - просто закрываем
        closeCurrentModal();
    } else {
        // Закрываем только верхнюю
        popFromStack();
    }
}

// Построение хлебных крошек
function buildBreadcrumb(stackData) {
    if (!stackData || stackData.length === 0) return '';
    
    const items = stackData.map((item, index) => {
        const isLast = index === stackData.length - 1;
        const title = item.data?.title || 'Инструкция';
        return `
            <span class="modal-breadcrumb-item ${isLast ? 'active' : ''}" data-breadcrumb-index="${index}">
                ${escapeHtml(title)}
            </span>
            ${!isLast ? '<span class="modal-breadcrumb-sep">→</span>' : ''}
        `;
    }).join('');
    
    return `<div class="modal-breadcrumb">${items}</div>`;
}

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
    
    // Добавляем в стек
    pushToStack(modal, { type: 'password', file: file });
    
    // Настраиваем кнопки
    const handleConfirm = () => {
        if (input.value === 'Hesoyam1607') {
            itUnlocked = true;
            closeCurrentModal();
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
        if (e.key === 'Escape') closeCurrentModal();
    };

    const closeHandler = () => {
        if (modalStack[modalStack.length - 1]?.modal === modal) {
            closeCurrentModal();
        }
    };

    document.getElementById('passwordConfirmBtn').onclick = handleConfirm;
    document.getElementById('passwordCancelBtn').onclick = closeHandler;
    modal.querySelector('.modal-close').onclick = closeHandler;
    modal.querySelector('.modal-overlay').onclick = closeHandler;
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
        <tbody>${city.shops.map(shop => `<tr><td><span class="badge-id">${escapeHtml(shop.id)}</span></td><td>${escapeHtml(shop.address)}</td><tr><a class="store-link" href="#" data-file="${shop.file}">📄 Открыть</a></td></tr>`).join('')}</tbody></table>
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

// ==================== ОСНОВНОЕ МОДАЛЬНОЕ ОКНО ДЛЯ ИНСТРУКЦИЙ ====================
async function showModal(fileName, additionalTitle = null) {
    if (!fileName) return;
    
    // Получаем или создаём модальное окно
    let modal = document.getElementById('instructionModal');
    if (!modal) {
        // Создаём модальное окно, если его нет
        modal = createModalElement();
    }
    
    const modalTitle = modal.querySelector('#modalTitle');
    const modalBody = modal.querySelector('#modalBody');
    const googleBtn = modal.querySelector('#modalGoogleBtn');
    const backBtn = modal.querySelector('#modalBackBtn');
    const breadcrumbContainer = modal.querySelector('#modalBreadcrumb');
    
    const title = additionalTitle || getTitle(fileName);
    modalTitle.innerText = title;
    
    // Показываем индикатор загрузки
    modalBody.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <div>📥 Загрузка инструкции...</div>
        </div>
    `;
    
    // Добавляем в стек
    const stackData = {
        fileName: fileName,
        title: title,
        type: 'instruction'
    };
    pushToStack(modal, stackData);
    
    // Обновляем хлебные крошки
    updateModalBreadcrumb(modal);
    
    // Настраиваем кнопку "Назад"
    if (backBtn) {
        backBtn.onclick = () => {
            goBackToPreviousModal();
        };
    }
    
    // Настраиваем закрытие
    const closeHandler = () => {
        if (modalStack[modalStack.length - 1]?.modal === modal) {
            goBackToPreviousModal();
        }
    };
    
    modal.querySelector('.modal-close').onclick = closeHandler;
    modal.querySelector('.modal-overlay').onclick = closeHandler;
    
    try {
        const instruction = await getInstruction(fileName);
        const googleUrl = getGoogleUrl(fileName, instruction);
        googleBtn.style.display = googleUrl ? 'inline-flex' : 'none';
        if (googleUrl) googleBtn.onclick = () => window.open(googleUrl, '_blank');
        modalBody.innerHTML = instruction?.content?.length ? instruction.content.map(renderContentBlock).join('') : markedParse('# Инструкция в разработке\n\nПерейдите по ссылке через кнопку "Открыть в Google Docs" ↓');
        modal.querySelector('.modal-container')?.scrollTo(0, 0);
    } catch (error) {
        console.error('Ошибка загрузки инструкции:', error);
        modalBody.innerHTML = '<div style="color:red;">⚠️ Ошибка загрузки инструкции</div>';
        googleBtn.style.display = 'none';
    }
}

// Создание элемента модального окна (если не существует)
function createModalElement() {
    const modalHTML = `
        <div id="instructionModal" class="fullscreen-modal">
            <div class="modal-overlay"></div>
            <div class="modal-container fullscreen">
                <div class="modal-depth-indicator"></div>
                <button class="modal-close">&times;</button>
                <div id="modalBreadcrumb" class="modal-breadcrumb"></div>
                <h3 id="modalTitle">📄 Инструкция</h3>
                <div id="modalBody" class="modal-body-markdown"></div>
                <div class="modal-footer">
                    <div class="modal-footer-left">
                        <button id="modalBackBtn" class="modal-back-btn">← Назад</button>
                    </div>
                    <div class="modal-footer-right">
                        <button id="modalGoogleBtn" class="google-docs-btn">🔗 Открыть в Google Docs</button>
                        <button id="modalCloseBtn">Закрыть окно</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('instructionModal');
    
    // Настройка кнопки закрытия
    const closeBtn = modal.querySelector('#modalCloseBtn');
    if (closeBtn) {
        closeBtn.onclick = () => goBackToPreviousModal();
    }
    
    return modal;
}

// Обновление хлебных крошек для конкретной модалки
function updateModalBreadcrumb(modal) {
    const breadcrumbContainer = modal.querySelector('#modalBreadcrumb');
    if (!breadcrumbContainer) return;
    
    // Находим все элементы в стеке, которые относятся к этому типу модалки
    const stackItems = [];
    for (let i = 0; i < modalStack.length; i++) {
        const item = modalStack[i];
        if (item.modal.id === 'instructionModal' || item.modal.id === 'itDashboardModal') {
            stackItems.push(item);
        }
    }
    
    if (stackItems.length <= 1) {
        breadcrumbContainer.style.display = 'none';
        return;
    }
    
    breadcrumbContainer.style.display = 'flex';
    
    const items = stackItems.map((item, index) => {
        const isLast = index === stackItems.length - 1;
        const title = item.data?.title || (item.modal.id === 'itDashboardModal' ? 'IT-библиотека' : 'Инструкция');
        return `
            <span class="modal-breadcrumb-item ${isLast ? 'active' : ''}" data-breadcrumb-index="${index}">
                ${escapeHtml(title.length > 30 ? title.substring(0, 27) + '...' : title)}
            </span>
            ${!isLast ? '<span class="modal-breadcrumb-sep">→</span>' : ''}
        `;
    }).join('');
    
    breadcrumbContainer.innerHTML = items;
    
    // Добавляем обработчики для кликов по хлебным крошкам
    breadcrumbContainer.querySelectorAll('.modal-breadcrumb-item:not(.active)').forEach(el => {
        el.addEventListener('click', () => {
            const targetIndex = parseInt(el.dataset.breadcrumbIndex);
            if (!isNaN(targetIndex) && targetIndex < stackItems.length - 1) {
                // Закрываем все модалки после targetIndex
                while (modalStack.length > targetIndex + 1) {
                    popFromStack();
                }
            }
        });
    });
    
    // Обновляем индикатор глубины
    const depthIndicator = modal.querySelector('.modal-depth-indicator');
    if (depthIndicator) {
        const depth = stackItems.length;
        if (depth > 1) {
            depthIndicator.textContent = `📁 Уровень ${depth}`;
            depthIndicator.style.display = 'block';
        } else {
            depthIndicator.style.display = 'none';
        }
    }
}

// ==================== ПРИЛОЖЕНИЯ ====================
function showAppsModal() {
    let modal = document.getElementById('appsModal');
    if (!modal) {
        const modalHTML = `
            <div id="appsModal" class="fullscreen-modal">
                <div class="modal-overlay"></div>
                <div class="modal-container fullscreen">
                    <button class="modal-close">&times;</button>
                    <h3>📱 Скачивание корпоративных приложений</h3>
                    <div id="appsModalBody" class="modal-body-markdown"></div>
                    <div class="modal-footer">
                        <div class="modal-footer-left">
                            <button id="appsModalBackBtn" class="modal-back-btn">← Назад</button>
                        </div>
                        <div class="modal-footer-right">
                            <button id="appsModalCloseBtn">Закрыть окно</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('appsModal');
        
        const closeHandler = () => goBackToPreviousModal();
        modal.querySelector('.modal-close').onclick = closeHandler;
        modal.querySelector('.modal-overlay').onclick = closeHandler;
        modal.querySelector('#appsModalCloseBtn').onclick = closeHandler;
        modal.querySelector('#appsModalBackBtn').onclick = () => goBackToPreviousModal();
    }
    
    if (!appData) return;
    
    document.getElementById('appsModalBody').innerHTML = Object.values(appData.apps || {}).map(app => `
        <div class="app-card"><h4>📱 ${escapeHtml(app.name)}</h4><p>${escapeHtml(app.description)}</p>${app.instructions ? `<p><strong>📌 Настройки:</strong> ${escapeHtml(app.instructions)}</p>` : ''}<a href="${app.downloadUrl}" target="_blank" class="download-link">⬇️ Скачать</a></div>
    `).join('');
    
    pushToStack(modal, { type: 'apps', title: 'Приложения' });
}

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
    let modal = document.getElementById('itDashboardModal');
    if (!modal) {
        // Создаём модалку IT-дашборда, если её нет
        const modalHTML = `
            <div id="itDashboardModal" class="fullscreen-modal it-dashboard-modal">
                <div class="modal-overlay"></div>
                <div class="modal-container it-dashboard-container">
                    <button class="modal-close">&times;</button>
                    <div class="it-breadcrumb" id="itBreadcrumb">
                        <span class="breadcrumb-item active">📁 IT-библиотека</span>
                    </div>
                    <div class="it-dashboard-header">
                        <h3>🖥️ IT-отдел <span class="it-badge">Защищенный раздел</span></h3>
                        <div class="it-search-bar">
                            <input type="text" id="itSearchInput" placeholder="🔍 Поиск инструкций..." class="it-search-input">
                            <button id="itClearSearch" class="it-clear-search" style="display: none;">✖</button>
                        </div>
                    </div>
                    <div class="it-filters">
                        <button class="it-filter-btn active" data-filter="all">📋 Все</button>
                        <button class="it-filter-btn" data-filter="stores">🏪 Магазины</button>
                        <button class="it-filter-btn" data-filter="sales_agents">🚀 Торговые агенты</button>
                        <button class="it-filter-btn" data-filter="pos">🖨️ Кассы / ККТ</button>
                        <button class="it-filter-btn" data-filter="servers">🖥️ Серверы</button>
                        <button class="it-filter-btn" data-filter="local_settings">⚙️ Локальные настройки</button>
                    </div>
                    <div id="itCardsContainer" class="it-cards-container"></div>
                    <div class="modal-footer">
                        <div class="modal-footer-left">
                            <button id="itDashboardBackBtn" class="modal-back-btn">← Назад</button>
                        </div>
                        <div class="modal-footer-right">
                            <button id="itDashboardCloseBtn">Закрыть окно</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('itDashboardModal');
        
        const closeHandler = () => goBackToPreviousModal();
        modal.querySelector('.modal-close').onclick = closeHandler;
        modal.querySelector('.modal-overlay').onclick = closeHandler;
        modal.querySelector('#itDashboardCloseBtn').onclick = closeHandler;
        modal.querySelector('#itDashboardBackBtn').onclick = () => goBackToPreviousModal();
        
        // Настройка поиска и фильтров
        const searchInput = modal.querySelector('#itSearchInput');
        const clearBtn = modal.querySelector('#itClearSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                itSearchQuery = e.target.value;
                if (clearBtn) clearBtn.style.display = itSearchQuery ? 'block' : 'none';
                renderItDashboard(currentItFilter, itSearchQuery);
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                itSearchQuery = '';
                if (searchInput) searchInput.value = '';
                clearBtn.style.display = 'none';
                renderItDashboard(currentItFilter, '');
            });
        }
        modal.querySelectorAll('.it-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentItFilter = btn.dataset.filter;
                itSearchQuery = '';
                if (searchInput) searchInput.value = '';
                if (clearBtn) clearBtn.style.display = 'none';
                renderItDashboard(currentItFilter, '');
                updateFilterButtons();
                resetItBreadcrumb();
            });
        });
    }
    
    if (!itInstructionsData.length) await loadItInstructions();
    currentItFilter = 'all';
    itSearchQuery = '';
    const searchInput = modal.querySelector('#itSearchInput');
    if (searchInput) searchInput.value = '';
    const clearBtn = modal.querySelector('#itClearSearch');
    if (clearBtn) clearBtn.style.display = 'none';
    resetItBreadcrumb();
    renderItDashboard('all', '');
    updateFilterButtons();
    
    pushToStack(modal, { type: 'it-dashboard', title: 'IT-библиотека' });
}

async function showItInstruction(fileId) {
    const instruction = itInstructionsData.find(i => i.id === fileId);
    if (!instruction) return;
    await showModal(fileId, instruction.title);
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

    document.getElementById('appsDownloadBtn')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showAppsModal(); 
    });

    // Глобальная обработка Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            goBackToPreviousModal();
        }
    });
});
