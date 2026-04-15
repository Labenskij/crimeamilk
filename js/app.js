/**
 * app.js - Центр инструкций Черноморского молокозавода
 * 
 * Логика:
 * 1. Загрузка data.json (справочники: магазины, отделы, названия)
 * 2. Загрузка инструкций из JSON-файлов по категориям
 * 3. Рендер карточек и таблиц
 * 4. Модальные окна с поддержкой Markdown + изображений
 * 5. Тёмная тема
 */

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let appData = null;
let instructionsCache = {};
let currentOpenSection = null;

// Категории для загрузки инструкций (файлы: accounting.json, sales.json и т.д.)
const CATEGORIES = {
    accounting: ['accounting_1', 'accounting_2', 'accounting_3', 'accounting_4', 'accounting_5', 'accounting_6', 'accounting_7', 'accounting_8'],
    sales: ['sales_1', 'sales_2', 'sales_3', 'sales_4', 'sales_5'],
    warehouse: ['warehouse_1'],
    corporate: ['corporate_1', 'corporate_2'],
    support: ['support_1', 'support_2', 'support_3'],
    stores: ['astana_kesaeva', 'stalingrad', 'oktyabr', 'shevchenko', 'gorpischenko_127', 'gorpischenko_139', 'gorpischenko_143', 'boris_mihaylova', 'pytnica', 'econom5', 'rybniy', 'dimitrova', 'burger', 'kirova6', 'lenina9']
};

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadAppData() {
    const res = await fetch('js/data.json');
    appData = await res.json();
}

// Загружаем JSON-файл категории (accounting.json, sales.json и т.д.)
async function loadCategoryData(category) {
    if (instructionsCache[category]) return instructionsCache[category];
    try {
        const res = await fetch(`js/${category}.json`);
        if (!res.ok) return {};
        const data = await res.json();
        instructionsCache[category] = data;
        return data;
    } catch (error) {
        console.error(`Ошибка загрузки ${category}.json:`, error);
        return {};
    }
}

async function getInstruction(fileName) {
    let category = null;
    for (const [cat, files] of Object.entries(CATEGORIES)) {
        if (files.includes(fileName)) { 
            category = cat; 
            break; 
        }
    }
    if (!category) return null;

    const categoryData = await loadCategoryData(category);
    return categoryData[fileName] || null;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function getTitle(fileName) {
    return appData?.titles[fileName] || fileName;
}

function getDesc(fileName) {
    return appData?.descs[fileName] || 'Инструкция';
}

function getGoogleUrl(fileName, instructionData) {
    if (instructionData?.googleDocUrl) return instructionData.googleDocUrl;
    // Поиск в магазинах
    if (appData?.stores) {
        for (const city of Object.values(appData.stores)) {
            const shop = city.shops.find(s => s.file === fileName);
            if (shop?.googleDocUrl) return shop.googleDocUrl;
        }
    }
    return null;
}

/**
 * Преобразует блок контента инструкции в HTML
 * Поддерживает:
 * - type: "text" -> Markdown (заголовки, списки, таблицы, жирный, курсив)
 * - type: "image" -> изображение с подписью, клик для fullscreen
 * - type: "note" -> цветной блок с важной информацией
 * - type: "step" -> нумерованный шаг с иконкой
 */
function renderContentBlock(block, index) {
    switch (block.type) {
        case 'text':
            return `<div class="instruction-text">${marked.parse(block.value)}</div>`;
        
        case 'image':
            return `
                <div class="instruction-image">
                    <img src="${block.src}" alt="${block.alt || 'Изображение инструкции'}" loading="lazy" onclick="this.requestFullscreen?.()">
                    ${block.caption ? `<div class="image-caption">📸 ${escapeHtml(block.caption)}</div>` : ''}
                </div>
            `;
        
        case 'note':
            return `
                <div class="instruction-note">
                    <div class="instruction-note-icon">💡</div>
                    <div class="instruction-note-text">${marked.parse(block.value)}</div>
                </div>
            `;
        
        case 'step':
            return `
                <div class="instruction-step">
                    <div class="step-number">${block.number || index + 1}</div>
                    <div class="step-content">${marked.parse(block.value)}</div>
                </div>
            `;
        
        case 'warning':
            return `
                <div class="instruction-warning">
                    <div class="warning-icon">⚠️</div>
                    <div class="warning-text">${marked.parse(block.value)}</div>
                </div>
            `;
        
        default:
            return `<div class="instruction-text">${marked.parse(block.value || '')}</div>`;
    }
}

// ==================== РЕНДЕР КОМПОНЕНТОВ ====================
function renderCards(containerId, files) {
    const container = document.getElementById(containerId);
    if (!container) return;
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
            await showModal(link.dataset.file);
        });
    });
}

function renderStores() {
    const container = document.getElementById('stores-content');
    if (!container || !appData) return;
    container.innerHTML = '';
    for (const [key, city] of Object.entries(appData.stores)) {
        container.innerHTML += `
            <div class="city-title">📍 ${escapeHtml(city.city)}</div>
            <table class="store-table"><thead><tr><th>ID</th><th>Адрес</th><th>Инструкция</th></tr></thead><tbody>
                ${city.shops.map(shop => `
                    <tr>
                        <td><span class="badge-id">${escapeHtml(shop.id)}</span></td>
                        <td>${escapeHtml(shop.address)}</td>
                        <td><a class="store-link" href="#" data-file="${shop.file}">📄 Открыть</a></td>
                    </tr>
                `).join('')}
            </tbody></table>
        `;
    }

    document.querySelectorAll('.store-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await showModal(link.dataset.file);
        });
    });
}

function renderDepartments() {
    const container = document.getElementById('departments-content');
    if (!container || !appData) return;
    container.innerHTML = '';
    const deptKeys = Object.keys(appData.departments);
    deptKeys.forEach((key, idx) => {
        const dept = appData.departments[key];
        container.innerHTML += `<h3 style="margin:0 0 12px;">${dept.name}</h3><div class="grid-cards" id="dept-${key}-cards"></div>`;
        if (idx < deptKeys.length - 1) container.innerHTML += '<hr class="dept-divider">';
        renderCards(`dept-${key}-cards`, dept.files);
    });
}

function renderCorpAndSupport() {
    if (!appData) return;
    renderCards('corp-cards', appData.corporate.files);
    renderCards('support-cards', appData.support.files);
}

// ==================== МОДАЛЬНОЕ ОКНО ====================
async function showModal(fileName) {
    const modal = document.getElementById('instructionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const googleBtn = document.getElementById('modalGoogleBtn');

    modalTitle.innerText = getTitle(fileName);
    modalBody.innerHTML = '<div style="text-align:center;padding:40px;">📥 Загрузка...</div>';
    modal.style.display = 'flex';

    const instruction = await getInstruction(fileName);
    const googleUrl = getGoogleUrl(fileName, instruction);

    googleBtn.style.display = googleUrl ? 'inline-flex' : 'none';
    googleBtn.onclick = () => googleUrl && window.open(googleUrl, '_blank');

    if (instruction?.content && Array.isArray(instruction.content) && instruction.content.length > 0) {
        // Рендерим все блоки контента по порядку
        modalBody.innerHTML = instruction.content.map((block, idx) => renderContentBlock(block, idx)).join('');
    } else if (instruction?.content && typeof instruction.content === 'string') {
        // Если content строка (старый формат)
        modalBody.innerHTML = `<div class="instruction-text">${marked.parse(instruction.content)}</div>`;
    } else {
        modalBody.innerHTML = `<div class="instruction-text">${marked.parse('# Инструкция в разработке\n\nПожалуйста, обратитесь к ответственному специалисту.')}</div>`;
    }
    
    ensureModalStyles();
}

function closeModal() { 
    document.getElementById('instructionModal').style.display = 'none'; 
}

// стили для новых типов блоков
function ensureModalStyles() {
    if (document.getElementById('modal-dynamic-styles')) return;
    const style = document.createElement('style');
    style.id = 'modal-dynamic-styles';
    style.textContent = `
        /* Блоки инструкций */
        .instruction-text {
            margin-bottom: 24px;
        }
        .instruction-text h1 { font-size: 1.8rem; margin: 0 0 16px 0; color: #1f5e3a; }
        .instruction-text h2 { font-size: 1.4rem; margin: 24px 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid #e2edf7; }
        .instruction-text h3 { font-size: 1.2rem; margin: 20px 0 10px 0; }
        .instruction-text p { margin: 0 0 16px 0; line-height: 1.6; }
        .instruction-text ul, .instruction-text ol { margin: 0 0 16px 0; padding-left: 24px; }
        .instruction-text li { margin: 6px 0; }
        .instruction-text table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .instruction-text th, .instruction-text td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
        .instruction-text th { background: #f5f7f9; font-weight: 600; }
        .instruction-text code { background: #f0f2f5; padding: 2px 6px; border-radius: 6px; font-family: monospace; }
        .instruction-text pre { background: #f0f2f5; padding: 16px; border-radius: 12px; overflow-x: auto; margin: 16px 0; }
        
        body[data-theme="dark"] .instruction-text h1 { color: #7bc47f; }
        body[data-theme="dark"] .instruction-text h2 { border-bottom-color: #2d3e4f; }
        body[data-theme="dark"] .instruction-text th { background: #1e2a3a; }
        body[data-theme="dark"] .instruction-text code,
        body[data-theme="dark"] .instruction-text pre { background: #1a2533; color: #e0e0e0; }
        
        /* Изображения */
        .instruction-image {
            margin: 24px 0;
            text-align: center;
            background: #f8fafc;
            border-radius: 20px;
            padding: 16px;
        }
        .instruction-image img {
            max-width: 100%;
            max-height: 60vh;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            cursor: zoom-in;
            transition: transform 0.2s;
        }
        .instruction-image img:hover { transform: scale(1.01); }
        .image-caption {
            font-size: 0.85rem;
            color: #6c7a8a;
            margin-top: 12px;
        }
        body[data-theme="dark"] .instruction-image { background: #1a2533; }
        body[data-theme="dark"] .image-caption { color: #9aa8b8; }
        
        /* Блоки заметок */
        .instruction-note {
            background: #e8f4e8;
            border-left: 5px solid #2b7a4b;
            border-radius: 16px;
            padding: 16px 20px;
            margin: 20px 0;
            display: flex;
            gap: 14px;
            align-items: flex-start;
        }
        .instruction-note-icon {
            font-size: 1.6rem;
        }
        .instruction-note-text {
            flex: 1;
        }
        .instruction-note-text p { margin: 0 0 8px 0; }
        .instruction-note-text p:last-child { margin: 0; }
        body[data-theme="dark"] .instruction-note {
            background: #1e2f2a;
            border-left-color: #7bc47f;
        }
        
        /* Блоки предупреждений */
        .instruction-warning {
            background: #fef4e8;
            border-left: 5px solid #e67e22;
            border-radius: 16px;
            padding: 16px 20px;
            margin: 20px 0;
            display: flex;
            gap: 14px;
            align-items: flex-start;
        }
        .warning-icon {
            font-size: 1.6rem;
        }
        .warning-text {
            flex: 1;
        }
        .warning-text p { margin: 0 0 8px 0; }
        .warning-text p:last-child { margin: 0; }
        body[data-theme="dark"] .instruction-warning {
            background: #2a241e;
            border-left-color: #e67e22;
        }
        
        /* Пошаговые инструкции */
        .instruction-step {
            display: flex;
            gap: 16px;
            margin: 16px 0;
            align-items: flex-start;
        }
        .step-number {
            min-width: 32px;
            height: 32px;
            background: #2b7a4b;
            color: white;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.9rem;
        }
        .step-content {
            flex: 1;
        }
        .step-content p { margin: 0 0 8px 0; }
        body[data-theme="dark"] .step-number {
            background: #7bc47f;
            color: #1a2533;
        }
    `;
    document.head.appendChild(style);
}

// ==================== ПРИЛОЖЕНИЯ ====================
function showAppsModal() {
    const modal = document.getElementById('appsModal');
    const modalBody = document.getElementById('appsModalBody');
    if (!modal || !appData) return;
    modalBody.innerHTML = Object.values(appData.apps).map(app => `
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

// ==================== ТЁМНАЯ ТЕМА ====================
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
    if (currentOpenSection && currentOpenSection !== section && currentOpenSection.classList.contains('open')) {
        currentOpenSection.classList.remove('open');
    }
    section.classList.toggle('open');
    currentOpenSection = section.classList.contains('open') ? section : null;
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadAppData();
    renderStores();
    renderDepartments();
    renderCorpAndSupport();
    initTheme();

    // Обработка якоря в URL
    if (location.hash) {
        const target = document.getElementById(location.hash.substring(1));
        if (target?.classList.contains('section')) {
            if (currentOpenSection) currentOpenSection.classList.remove('open');
            target.classList.add('open');
            currentOpenSection = target;
            setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }

    // Быстрая навигация
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

    document.getElementById('appsDownloadBtn')?.addEventListener('click', (e) => { e.preventDefault(); showAppsModal(); });
});

// Закрытие модальных окон по Escape и клику на оверлей
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeAppsModal(); } });

setTimeout(() => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => { closeModal(); closeAppsModal(); });
    });
}, 100);
