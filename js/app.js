/**
 * Центр инструкций Черноморского молокозавода
 * 
 * @description Приложение для отображения инструкций по отделам, магазинам и поддержке
 * @version 2.0
 */

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let appData = null;
const instructionsCache = {};
let currentOpenSection = null;

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
const escapeHtml = (str) => str ? str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>' : '&gt;' }[m])) : '';
const markedParse = (text) => text ? marked.parse(text) : '';

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error(`❌ Ошибка загрузки ${path}:`, error);
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
    
    // Поиск в отделах
    for (const [key, dept] of Object.entries(appData.departments || {})) {
        if (dept.files?.includes(fileName)) return key;
    }
    // Поиск в корпоративных и поддержке
    if (appData.corporate?.files?.includes(fileName)) return 'corporate';
    if (appData.support?.files?.includes(fileName)) return 'support';
    // Поиск в магазинах
    for (const city of Object.values(appData.stores || {})) {
        if (city.shops?.some(shop => shop.file === fileName)) return 'stores';
    }
    return null;
}

async function getInstruction(fileName) {
    const category = getCategoryForFile(fileName);
    if (!category) return null;
    const categoryData = await loadCategoryData(category);
    return categoryData[fileName] || null;
}

// ==================== GETTERS ====================
const getTitle = (file) => appData?.titles?.[file] || file || 'Инструкция';
const getDesc = (file) => appData?.descs?.[file] || 'Инструкция';
const getGoogleUrl = (fileName, instructionData) => {
    if (instructionData?.googleDocUrl) return instructionData.googleDocUrl;
    for (const city of Object.values(appData?.stores || {})) {
        const shop = city.shops?.find(s => s.file === fileName);
        if (shop?.googleDocUrl) return shop.googleDocUrl;
    }
    return null;
};

// ==================== РЕНДЕР КОМПОНЕНТОВ ====================
function renderCards(containerId, files) {
    const container = document.getElementById(containerId);
    if (!container || !files?.length) return;
    
    container.innerHTML = files.map(file => `
        <div class="card">
            <div class="card-title">${escapeHtml(getTitle(file))}</div>
            <div class="card-desc">${escapeHtml(getDesc(file))}</div>
            <a class="card-link" href="#" data-file="${file}">📖 Открыть инструкцию →</a>
        </div>
    `).join('');

    container.querySelectorAll('.card-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const file = link.dataset.file;
            if (file) await showModal(file);
        });
    });
}

function renderStores() {
    const container = document.getElementById('stores-content');
    if (!container || !appData) return;
    
    container.innerHTML = Object.entries(appData.stores || {}).map(([_, city]) => `
        <div class="city-title">📍 ${escapeHtml(city.city)}</div>
        <table class="store-table">
            <thead><tr><th>ID</th><th>Адрес</th><th>Инструкция</th></tr></thead>
            <tbody>${city.shops.map(shop => `
                <tr>
                    <td><span class="badge-id">${escapeHtml(shop.id)}</span></td>
                    <td>${escapeHtml(shop.address)}</td>
                    <td><a class="store-link" href="#" data-file="${shop.file}">📄 Открыть</a></td>
                </tr>
            `).join('')}</tbody>
        </table>
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
        
        const deptId = `dept-${key}-cards`;
        container.innerHTML += `<h3 style="margin:0 0 12px;">${escapeHtml(dept.name)}</h3><div class="grid-cards" id="${deptId}"></div>`;
        if (idx < deptKeys.length - 1) container.innerHTML += '<hr class="dept-divider">';
        
        setTimeout(() => renderCards(deptId, dept.files), 0);
    });
}

function renderCorpAndSupport() {
    if (!appData) return;
    renderCards('corp-cards', appData.corporate?.files || []);
    renderCards('support-cards', appData.support?.files || []);
}

// ==================== РЕНДЕР КОНТЕНТА МОДАЛКИ ====================
const contentRenderers = {
    text: (block) => `<div class="instruction-text">${markedParse(block.value)}</div>`,
    image: (block) => `
        <div class="instruction-image">
            <img src="${block.src}" alt="${block.alt || 'Изображение'}" loading="lazy" 
                 onclick="this.requestFullscreen?.()" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect width=%22200%22 height=%22200%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22%3E%D0%9D%D0%B5%D1%82%20%D1%84%D0%BE%D1%82%D0%BE%3C/text%3E%3C/svg%3E'">
            ${block.caption ? `<div class="image-caption">📸 ${escapeHtml(block.caption)}</div>` : ''}
        </div>
    `,
    note: (block) => `<div class="instruction-note"><div class="instruction-note-icon">💡</div><div class="instruction-note-text">${markedParse(block.value)}</div></div>`,
    step: (block, idx) => `<div class="instruction-step"><div class="step-number">${block.number || idx + 1}</div><div class="step-content">${markedParse(block.value)}</div></div>`,
    warning: (block) => `<div class="instruction-warning"><div class="warning-icon">⚠️</div><div class="warning-text">${markedParse(block.value)}</div></div>`
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
    
    modalTitle.innerText = getTitle(fileName);
    modalBody.innerHTML = '<div style="text-align:center;padding:40px;">📥 Загрузка инструкции...</div>';
    modal.style.display = 'flex';
    
    try {
        const instruction = await getInstruction(fileName);
        const googleUrl = getGoogleUrl(fileName, instruction);
        
        googleBtn.style.display = googleUrl ? 'inline-flex' : 'none';
        if (googleUrl) googleBtn.onclick = () => window.open(googleUrl, '_blank');
        
        if (instruction?.content?.length) {
            modalBody.innerHTML = instruction.content.map(renderContentBlock).join('');
        } else {
            modalBody.innerHTML = markedParse('# Инструкция в разработке\n\nперейдите по сыллке, через кнопку "Открыть в Google Docs" ↓');
        }
        
        modal.querySelector('.modal-container')?.scrollTo(0, 0);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        modalBody.innerHTML = '<div class="instruction-text" style="color:red;">⚠️ Ошибка загрузки инструкции</div>';
        googleBtn.style.display = 'none';
    }
    
    ensureModalStyles();
}

function closeModal() { 
    document.getElementById('instructionModal').style.display = 'none'; 
}

function ensureModalStyles() {
    if (document.getElementById('modal-dynamic-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'modal-dynamic-styles';
    style.textContent = `
        .instruction-text { margin-bottom: 24px; }
        .instruction-text h1 { font-size: 1.8rem; margin: 0 0 16px 0; color: #1f5e3a; }
        .instruction-text h2 { font-size: 1.4rem; margin: 24px 0 12px 0; border-bottom: 2px solid #e2edf7; }
        .instruction-text table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .instruction-text th, .instruction-text td { border: 1px solid #ddd; padding: 10px; }
        .instruction-image { margin: 24px 0; text-align: center; background: #f8fafc; border-radius: 20px; padding: 16px; }
        .instruction-image img { max-width: 100%; max-height: 60vh; border-radius: 16px; cursor: zoom-in; }
        .instruction-note, .instruction-warning { display: flex; gap: 14px; padding: 16px 20px; margin: 20px 0; border-radius: 16px; }
        .instruction-note { background: #e8f4e8; border-left: 5px solid #2b7a4b; }
        .instruction-warning { background: #fef4e8; border-left: 5px solid #e67e22; }
        .instruction-step { display: flex; gap: 16px; margin: 16px 0; }
        .step-number { min-width: 32px; height: 32px; background: #2b7a4b; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; }
        body[data-theme="dark"] .instruction-text h1 { color: #7bc47f; }
        body[data-theme="dark"] .instruction-note { background: #1e2f2a; border-left-color: #7bc47f; }
        body[data-theme="dark"] .step-number { background: #7bc47f; color: #1a2533; }
    `;
    document.head.appendChild(style);
}

// ==================== ПРИЛОЖЕНИЯ ====================
function showAppsModal() {
    const modal = document.getElementById('appsModal');
    if (!modal || !appData) return;
    
    document.getElementById('appsModalBody').innerHTML = Object.values(appData.apps || {}).map(app => `
        <div class="app-card">
            <h4>📱 ${escapeHtml(app.name)}</h4>
            <p>${escapeHtml(app.description)}</p>
            ${app.instructions ? `<p><strong>📌 Настройки:</strong> ${escapeHtml(app.instructions)}</p>` : ''}
            <a href="${app.downloadUrl}" target="_blank" class="download-link">⬇️ Скачать</a>
        </div>
    `).join('');
    modal.style.display = 'flex';
}

function closeAppsModal() { 
    document.getElementById('appsModal').style.display = 'none'; 
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

// ==================== АККОРДЕОН ====================
function toggleSection(header) {
    const section = header.closest('.section');
    if (!section) return;
    if (currentOpenSection && currentOpenSection !== section) currentOpenSection.classList.remove('open');
    section.classList.toggle('open');
    currentOpenSection = section.classList.contains('open') ? section : null;
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadAppData();
    
    if (appData) {
        renderStores();
        renderDepartments();
        renderCorpAndSupport();
    } else {
        const deptContent = document.getElementById('departments-content');
        if (deptContent) deptContent.innerHTML = '<div class="note">⚠️ Ошибка загрузки данных</div>';
    }
    
    initTheme();

    // Обработка якорных ссылок
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
                    location.hash = href.substring(1);
                }
            });
        }
    });

    document.getElementById('appsDownloadBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAppsModal();
    });
    
    // Закрытие модалок по Escape и клику на overlay
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal();
            closeAppsModal();
        }
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            closeModal();
            closeAppsModal();
        });
    });
});
