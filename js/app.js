/**
 * app.js - Основная логика приложения
 * 
 * Функционал:
 * - Рендер магазинов, отделов, инструкций
 * - Тёмная/светлая тема
 * - Модальные окна (инструкции + приложения)
 * - Сворачивание/разворачивание секций
 * - Обработка ссылок и якорей
 */

let currentOpenSection = null;

/**
 * Переключение видимости секции (аккордеон)
 * @param {HTMLElement} header - заголовок секции, по которому кликнули
 */
function toggleSection(header) {
    const section = header.closest('.section');
    if (!section) return;
    
    // Закрываем предыдущую открытую секцию, если она существует и не равна текущей
    if (currentOpenSection && currentOpenSection !== section && currentOpenSection.classList.contains('open')) {
        currentOpenSection.classList.remove('open');
    }
    
    // Переключаем текущую секцию
    section.classList.toggle('open');
    currentOpenSection = section.classList.contains('open') ? section : null;
}

/**
 * Экранирование HTML-символов для безопасности (защита от XSS)
 * @param {string} str - входная строка
 * @returns {string} - экранированная строка
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

/**
 * Рендер карточек инструкций в указанный контейнер
 * @param {string} containerId - ID контейнера
 * @param {string[]} files - массив имён файлов инструкций
 */
function renderCards(containerId, files) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = files.map(file => `
        <div class="card">
            <div class="card-title">${escapeHtml(APP_DATA.titles[file] || file.replace('.md', ''))}</div>
            <div class="card-desc">${escapeHtml(APP_DATA.descs[file] || 'Инструкция')}</div>
            <a class="card-link" href="#" data-file="${file}" data-title="${escapeHtml(APP_DATA.titles[file] || file)}">📖 Открыть инструкцию →</a>
        </div>
    `).join('');
    
    // Навешиваем обработчики на все ссылки в карточках
    container.querySelectorAll('.card-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await showModalContent(link.dataset.title, link.dataset.file);
        });
    });
}

/**
 * Рендер таблиц магазинов
 */
function renderStores() {
    const container = document.getElementById('stores-content');
    if (!container) return;
    
    container.innerHTML = Object.values(APP_DATA.stores).map(city => `
        <div class="city-title">📍 ${escapeHtml(city.city)}</div>
        <table class="store-table">
            <thead>
                <tr><th>ID</th><th>Адрес</th><th>Инструкция</th></tr>
            </thead>
            <tbody>
                ${city.shops.map(shop => `
                    <tr>
                        <td><span class="badge-id">${escapeHtml(shop.id)}</span></td>
                        <td>${escapeHtml(shop.address)}</td>
                        <td><a class="store-link" href="#" data-file="${shop.file}" data-title="${escapeHtml(APP_DATA.titles[shop.file] || shop.file)}">📄 Открыть</a></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `).join('');
    
    // Навешиваем обработчики на ссылки магазинов
    document.querySelectorAll('.store-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await showModalContent(link.dataset.title, link.dataset.file);
        });
    });
}

/**
 * Рендер секции с отделами
 */
function renderDepartments() {
    const container = document.getElementById('departments-content');
    if (!container) return;
    
    container.innerHTML = '';
    const deptKeys = Object.keys(APP_DATA.departments);
    
    deptKeys.forEach((key, idx) => {
        const dept = APP_DATA.departments[key];
        container.innerHTML += `<h3 style="margin:0 0 12px;">${dept.name}</h3><div class="grid-cards" id="dept-${key}-cards"></div>`;
        if (idx < deptKeys.length - 1) {
            container.innerHTML += '<hr class="dept-divider">';
        }
        renderCards(`dept-${key}-cards`, dept.files);
    });
}

/**
 * Инициализация тёмной темы (сохранение в localStorage)
 */
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

/**
 * Поиск Google Docs URL по имени файла
 * @param {string} filePath - имя файла инструкции
 * @returns {string|null} - URL или null
 */
function getGoogleUrl(filePath) {
    for (const city of Object.values(APP_DATA.stores)) {
        const shop = city.shops.find(s => s.file === filePath);
        if (shop?.googleDocUrl) return shop.googleDocUrl;
    }
    return null;
}

/**
 * Рендер контента инструкции из структуры (text/image)
 * @param {Object} instruction - объект инструкции с полем content
 * @returns {string} - HTML-строка
 */
function renderMarkdownContent(instruction) {
    if (!instruction?.content) {
        return '<div style="color:red;text-align:center;padding:40px;">❌ Инструкция не найдена</div>';
    }
    
    return instruction.content.map(block => {
        if (block.type === 'text') {
            return `<div class="instruction-text">${marked.parse(block.value)}</div>`;
        }
        if (block.type === 'image') {
            return `<div class="instruction-image">
                        <img src="${block.src}" alt="${block.alt || ''}" loading="lazy" onclick="this.requestFullscreen?.()">
                        ${block.caption ? `<div class="image-caption">${escapeHtml(block.caption)}</div>` : ''}
                    </div>`;
        }
        return '';
    }).join('');
}

/**
 * Отображение модального окна с инструкцией
 * @param {string} title - заголовок инструкции
 * @param {string} filePath - имя файла инструкции
 */
async function showModalContent(title, filePath) {
    const modal = document.getElementById('instructionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const googleBtn = document.getElementById('modalGoogleBtn');

    modalTitle.innerText = title;
    modalBody.innerHTML = '<div style="text-align:center;padding:40px;">📥 Загрузка...</div>';
    modal.style.display = 'flex';

    // Показываем/скрываем кнопку Google Docs
    const googleUrl = getGoogleUrl(filePath);
    if (googleBtn) {
        googleBtn.style.display = googleUrl ? 'inline-flex' : 'none';
        googleBtn.onclick = () => googleUrl && window.open(googleUrl, '_blank');
    }

    // Получаем инструкцию из данных (все файлы уже имеют контент благодаря заглушкам)
    const instruction = APP_DATA.instructions[filePath] || {
        content: [{ "type": "text", "value": "# Инструкция не найдена\n\nДокумент находится в разработке." }]
    };
    
    modalBody.innerHTML = renderMarkdownContent(instruction);
}

/**
 * Закрытие модального окна инструкций
 */
function closeModal() {
    document.getElementById('instructionModal').style.display = 'none';
}

/**
 * Отображение модального окна со списком приложений для скачивания
 */
function showAppsModal() {
    const modal = document.getElementById('appsModal');
    const modalBody = document.getElementById('appsModalBody');
    
    if (!modal || !modalBody) return;
    
    // Генерируем HTML для каждого приложения
    const appsHtml = Object.values(APP_DATA.apps).map(app => `
        <div class="app-card">
            <h4>📱 ${escapeHtml(app.name)}</h4>
            <p>${escapeHtml(app.description)}</p>
            <p><strong>📌 Инструкция по установке:</strong> ${escapeHtml(app.instructions)}</p>
            <a href="${app.downloadUrl}" target="_blank" class="download-link">⬇️ Скачать ${escapeHtml(app.name)}</a>
        </div>
    `).join('');
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px; padding: 16px; background: #e8f5e9; border-radius: 16px;">
            <p>⚠️ <strong>Внимание:</strong> Часто устанавливаемые приложения. Для удобного доступа.</p>
        </div>
        ${appsHtml}
        <div class="note" style="margin-top: 20px;">
            💡 Если ссылка не работает или возникли проблемы с установкой, обратитесь в техническую поддержку.
        </div>
    `;
    
    modal.style.display = 'flex';
}

/**
 * Закрытие модального окна приложений
 */
function closeAppsModal() {
    const modal = document.getElementById('appsModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Инициализация приложения после загрузки DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    // Рендер всех разделов
    renderStores();
    renderDepartments();
    renderCards('corp-cards', APP_DATA.corporate.files);
    renderCards('support-cards', APP_DATA.support.files);
    
    // Инициализация темы
    initTheme();
    
    // Все секции по умолчанию закрыты (ничего не открываем)
    currentOpenSection = null;
    
    // Обработка якоря в URL (если есть)
    if (window.location.hash) {
        const target = document.getElementById(window.location.hash.substring(1));
        if (target?.classList.contains('section')) {
            if (currentOpenSection && currentOpenSection !== target) {
                currentOpenSection.classList.remove('open');
            }
            target.classList.add('open');
            currentOpenSection = target;
            setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }
    
    // Обработка кликов по быстрым ссылкам в шапке
    document.querySelectorAll('.quick-nav a:not(#appsDownloadBtn)').forEach(anchor => {
        const href = anchor.getAttribute('href');
        if (href?.startsWith('#')) {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(href.substring(1));
                if (target?.classList.contains('section')) {
                    if (currentOpenSection && currentOpenSection !== target) {
                        currentOpenSection.classList.remove('open');
                    }
                    target.classList.add('open');
                    currentOpenSection = target;
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    window.location.hash = href.substring(1);
                }
            });
        }
    });
    
    // Обработчик кнопки "Скачать приложения"
    const appsBtn = document.getElementById('appsDownloadBtn');
    if (appsBtn) {
        appsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAppsModal();
        });
    }
});

// Глобальные обработчики для закрытия модальных окон по Escape и клику на overlay
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModal();
        closeAppsModal();
    }
});

// Обработчики для overlay (добавляем через делегирование, так как элементы могут быть не найдены в момент загрузки)
setTimeout(() => {
    const modalOverlays = document.querySelectorAll('.modal-overlay');
    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', () => {
            closeModal();
            closeAppsModal();
        });
    });
}, 100);
