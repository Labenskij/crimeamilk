/**
 * app.js - Центр инструкций Черноморского молокозавода
 * 
 * Логика:
 * 1. Загрузка data.json (справочники: магазины, отделы, названия)
 * 2. Загрузка инструкций из JSON-файлов по категориям (accounting, sales, stores, warehouse, corporate, support)
 * 3. Рендер карточек и таблиц
 * 4. Модальные окна с контентом
 * 5. Тёмная тема
 */

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let appData = null;           // Данные из data.json
let instructionsCache = {};   // Кэш загруженных инструкций { "accounting_1": {...}, ... }
let currentOpenSection = null;

// Категории для загрузки инструкций (имя файла JSON → массив ключей инструкций)
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

async function loadInstructionsFromJSON(category) {
    if (instructionsCache[category]) return instructionsCache[category];
    try {
        const res = await fetch(`js/instructions/${category}.json`);
        if (!res.ok) return {};
        const data = await res.json();
        instructionsCache[category] = data;
        return data;
    } catch {
        return {};
    }
}

async function getInstruction(fileName) {
    // Определяем категорию по имени файла
    let category = null;
    for (const [cat, files] of Object.entries(CATEGORIES)) {
        if (files.includes(fileName)) { category = cat; break; }
    }
    if (!category) return null;

    const instructions = await loadInstructionsFromJSON(category);
    return instructions[fileName] || null;
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
    for (const city of Object.values(appData?.stores || {})) {
        const shop = city.shops.find(s => s.file === fileName);
        if (shop?.googleDocUrl) return shop.googleDocUrl;
    }
    return null;
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
    container.innerHTML = Object.values(appData.stores).map(city => `
        <div class="city-title">📍 ${escapeHtml(city.city)}</div>
        <table class="store-table"><thead><tr><th>ID</th><th>Адрес</th><th>Инструкция</th></tr></thead><tbody>
            ${city.shops.map(shop => `
                <tr><td><span class="badge-id">${escapeHtml(shop.id)}</span></td>
                <td>${escapeHtml(shop.address)}</td>
                <td><a class="store-link" href="#" data-file="${shop.file}">📄 Открыть</a></td></tr>
            `).join('')}
        </tbody></table>
    `).join('');

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

    if (instruction?.content) {
        modalBody.innerHTML = instruction.content.map(block => {
            if (block.type === 'text') return `<div class="instruction-text">${marked.parse(block.value)}</div>`;
            if (block.type === 'image') return `<div class="instruction-image"><img src="${block.src}" alt="${block.alt || ''}" loading="lazy" onclick="this.requestFullscreen?.()">${block.caption ? `<div class="image-caption">${escapeHtml(block.caption)}</div>` : ''}</div>`;
            return '';
        }).join('');
    } else {
        modalBody.innerHTML = `<div class="instruction-text">${marked.parse('# Инструкция в разработке\n\nПожалуйста, обратитесь к ответственному специалисту.')}</div>`;
    }
}

function closeModal() { document.getElementById('instructionModal').style.display = 'none'; }

// ==================== ПРИЛОЖЕНИЯ ====================
function showAppsModal() {
    const modal = document.getElementById('appsModal');
    const modalBody = document.getElementById('appsModalBody');
    if (!modal || !appData) return;
    modalBody.innerHTML = Object.values(appData.apps).map(app => `
        <div class="app-card"><h4>📱 ${escapeHtml(app.name)}</h4>
        <p>${escapeHtml(app.description)}</p>
        ${app.instructions ? `<p><strong>📌 Инструкция:</strong> ${escapeHtml(app.instructions)}</p>` : ''}
        <a href="${app.downloadUrl}" target="_blank" class="download-link">⬇️ Скачать</a></div>
    `).join('');
    modal.style.display = 'flex';
}
function closeAppsModal() { document.getElementById('appsModal').style.display = 'none'; }

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

    // Обработка якоря
    if (location.hash) {
        const target = document.getElementById(location.hash.substring(1));
        if (target?.classList.contains('section')) {
            if (currentOpenSection) currentOpenSection.classList.remove('open');
            target.classList.add('open');
            currentOpenSection = target;
            setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }

    // Быстрые ссылки
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

// Закрытие по Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeAppsModal(); } });
setTimeout(() => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => { closeModal(); closeAppsModal(); });
    });
}, 100);
