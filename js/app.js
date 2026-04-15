let currentOpenSection = null;

function toggleSection(header) {
    const section = header.closest('.section');
    if (!section) return;
    if (currentOpenSection && currentOpenSection !== section && currentOpenSection.classList.contains('open'))
        currentOpenSection.classList.remove('open');
    section.classList.toggle('open');
    currentOpenSection = section.classList.contains('open') ? section : null;
}

function escapeHtml(str) { return str ? str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;') : ''; }

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
    container.querySelectorAll('.card-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await showModalContent(link.dataset.title, link.dataset.file);
        });
    });
}

function renderStores() {
    const container = document.getElementById('stores-content');
    if (!container) return;
    container.innerHTML = Object.values(APP_DATA.stores).map(city => `
        <div class="city-title">📍 ${escapeHtml(city.city)}</div>
        <table class="store-table"><thead><tr><th>ID</th><th>Адрес</th><th>Инструкция</th></tr></thead><tbody>
        ${city.shops.map(shop => `
            <tr><td><span class="badge-id">${escapeHtml(shop.id)}</span></td>
            <td>${escapeHtml(shop.address)}</td>
            <td><a class="store-link" href="#" data-file="${shop.file}" data-title="${escapeHtml(APP_DATA.titles[shop.file] || shop.file)}">📄 Открыть</a></td>
        </tr>`).join('')}</tbody>
        </table>
    `).join('');
    document.querySelectorAll('.store-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await showModalContent(link.dataset.title, link.dataset.file);
        });
    });
}

function renderDepartments() {
    const container = document.getElementById('departments-content');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(APP_DATA.departments).forEach(([key, dept], idx) => {
        container.innerHTML += `<h3 style="margin:0 0 12px;">${dept.name}</h3><div class="grid-cards" id="dept-${key}-cards"></div>`;
        if (idx < Object.keys(APP_DATA.departments).length - 1) container.innerHTML += '<hr class="dept-divider">';
        renderCards(`dept-${key}-cards`, dept.files);
    });
}

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

function getGoogleUrl(filePath) {
    for (const city of Object.values(APP_DATA.stores)) {
        const shop = city.shops.find(s => s.file === filePath);
        if (shop?.googleDocUrl) return shop.googleDocUrl;
    }
    return null;
}

function renderMarkdownContent(instruction) {
    if (!instruction?.content) return '<div style="color:red;text-align:center;padding:40px;">❌ Инструкция не найдена</div>';
    return instruction.content.map(block => {
        if (block.type === 'text') return `<div class="instruction-text">${marked.parse(block.value)}</div>`;
        if (block.type === 'image') return `<div class="instruction-image"><img src="${block.src}" alt="${block.alt || ''}" loading="lazy" onclick="this.requestFullscreen?.()">${block.caption ? `<div class="image-caption">${block.caption}</div>` : ''}</div>`;
        return '';
    }).join('');
}

async function showModalContent(title, filePath) {
    const modal = document.getElementById('instructionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const googleBtn = document.getElementById('modalGoogleBtn');

    modalTitle.innerText = title;
    modalBody.innerHTML = '<div style="text-align:center;padding:40px;">📥 Загрузка...</div>';
    modal.style.display = 'flex';

    const googleUrl = getGoogleUrl(filePath);
    if (googleBtn) {
        googleBtn.style.display = googleUrl ? 'inline-flex' : 'none';
        googleBtn.onclick = () => googleUrl && window.open(googleUrl, '_blank');
    }

    const instruction = APP_DATA.instructions[filePath] || { content: [{ "type": "text", "value": "# Инструкция не найдена\n\nДокумент находится в разработке." }] };
    modalBody.innerHTML = renderMarkdownContent(instruction);
}

function closeModal() {
    document.getElementById('instructionModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    renderStores();
    renderDepartments();
    renderCards('corp-cards', APP_DATA.corporate.files);
    renderCards('support-cards', APP_DATA.support.files);
    initTheme();

    const storesSection = document.getElementById('stores-block');
    if (storesSection && !storesSection.classList.contains('open')) {
        storesSection.classList.add('open');
        currentOpenSection = storesSection;
    }

    if (window.location.hash) {
        const target = document.getElementById(window.location.hash.substring(1));
        if (target?.classList.contains('section')) {
            if (currentOpenSection && currentOpenSection !== target) currentOpenSection.classList.remove('open');
            target.classList.add('open');
            currentOpenSection = target;
            setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }

    document.querySelectorAll('.quick-nav a').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const hash = anchor.getAttribute('href');
            if (hash?.startsWith('#')) {
                e.preventDefault();
                const target = document.getElementById(hash.substring(1));
                if (target?.classList.contains('section')) {
                    if (currentOpenSection && currentOpenSection !== target) currentOpenSection.classList.remove('open');
                    target.classList.add('open');
                    currentOpenSection = target;
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    window.location.hash = hash.substring(1);
                }
            }
        });
    });
});

document.addEventListener('keydown', e => e.key === 'Escape' && closeModal());
document.querySelector('.modal-overlay')?.addEventListener('click', closeModal);