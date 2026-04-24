// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let DB = null, itUnlocked = false, currSection = 'departments', itFilter = 'all', itSearch = '', itData = [], modalStack = [];
const esc = s => s?.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])) || '';
const md = t => t ? marked.parse(t) : '';

// ==================== ЗАГРУЗКА ====================
async function loadJSON(p) { try { const r = await fetch(p); return r.ok ? await r.json() : null; } catch(e) { return null; } }
async function loadDB() { DB = await loadJSON('js/data.json'); if(DB) renderCurrSection(); }

function getCategory(f) {
    for(let [k,d] of Object.entries(DB?.departments||{})) if(d.files?.includes(f)) return k;
    if(DB?.corporate?.files?.includes(f)) return 'corporate';
    if(DB?.support?.files?.includes(f)) return 'support';
    return null;
}
async function getInstruction(f) {
    let cat = getCategory(f);
    if(!cat) return null;
    let data = await loadJSON(`js/${cat}.json`);
    return data?.[f] || null;
}
const getTitle = f => DB?.titles?.[f] || f || 'Инструкция';
const getDesc = f => DB?.descs?.[f] || 'Инструкция';

// ==================== РЕНДЕР СЕКЦИЙ ====================
const sections = {
    departments: () => {
        let html = '';
        for(let [k, dept] of Object.entries(DB.departments)) {
            let isProtected = dept.protected && !itUnlocked;
            html += `<div class="dept-section"><div class="dept-header"><h3 class="dept-name">${dept.name}${dept.protected ? '<span class="protected-badge">🔒 Защищено</span>' : ''}${dept.isSpecialWindow ? '<span class="special-window-badge">🪟 Дашборд</span>' : ''}</h3>${isProtected && !dept.isSpecialWindow ? `<button class="unlock-dept-btn" data-dept="${k}">🔓 Разблокировать</button>` : ''}</div><div class="cards-grid" data-dept="${k}"></div></div>`;
        }
        $('#dynamicContent').innerHTML = html;
        for(let [k, dept] of Object.entries(DB.departments)) {
            let container = $(`.cards-grid[data-dept="${k}"]`);
            if(!container) continue;
            if(dept.isSpecialWindow) {
                container.innerHTML = `<div class="special-window-card"><div style="font-size:3rem">🪟</div><h4>IT-дашборд</h4><button class="unlock-dept-btn" data-it-dash>🚀 Открыть</button></div>`;
                container.querySelector('[data-it-dash]')?.addEventListener('click', async () => { if(dept.protected && !itUnlocked) showPasswordModal(() => { itUnlocked=true; renderCurrSection(); loadItData(); showItDash(); }); else { await loadItData(); showItDash(); } });
            } else if(dept.protected && !itUnlocked) {
                container.innerHTML = `<div class="card"><p>🔒 Доступ защищён паролем</p></div>`;
                $(`.unlock-dept-btn[data-dept="${k}"]`)?.addEventListener('click', () => showPasswordModal(() => { itUnlocked=true; renderCurrSection(); }));
            } else {
                container.innerHTML = dept.files.map(f => `<div class="card"><div class="card__title">📄 ${esc(getTitle(f))}</div><div class="card__desc">${esc(getDesc(f))}</div><a class="card__link" data-file="${f}">Открыть →</a></div>`).join('');
                container.querySelectorAll('.card__link').forEach(l => l.addEventListener('click', () => showModal(l.dataset.file)));
            }
        }
    },
    corporate: () => {
        $('#dynamicContent').innerHTML = `<div class="cards-grid">${DB.corporate.files.map(f => `<div class="card"><div class="card__title">📄 ${esc(getTitle(f))}</div><div class="card__desc">${esc(getDesc(f))}</div><a class="card__link" data-file="${f}">Открыть →</a></div>`).join('')}</div>`;
        $$('.card__link').forEach(l => l.addEventListener('click', () => showModal(l.dataset.file)));
    },
    stores: () => {
        let html = '';
        for(let city of Object.values(DB.stores)) {
            html += `<div class="city-title">📍 ${esc(city.city)}</div><table class="store-table"><thead><tr><th>ID</th><th>Адрес</th><th></th></tr></thead><tbody>`;
            city.shops.forEach(s => html += `<tr><td><span class="badge-id">${esc(s.id)}</span></td><td>${esc(s.address)}</td><td><button class="btn btn-secondary store-open" data-file="${s.file}">📄 Открыть</button></td></tr>`);
            html += `</tbody></table>`;
        }
        $('#dynamicContent').innerHTML = html;
        $$('.store-open').forEach(b => b.addEventListener('click', () => showModal(b.dataset.file)));
    },
    support: () => {
        $('#dynamicContent').innerHTML = `<div class="cards-grid">${DB.support.files.map(f => `<div class="card"><div class="card__title">📄 ${esc(getTitle(f))}</div><div class="card__desc">${esc(getDesc(f))}</div><a class="card__link" data-file="${f}">Открыть →</a></div>`).join('')}</div>`;
        $$('.card__link').forEach(l => l.addEventListener('click', () => showModal(l.dataset.file)));
    }
};

function renderCurrSection() { if(DB) sections[currSection](); $$('.wiki__nav a').forEach(a => a.classList.toggle('active', a.dataset.section === currSection)); }

// ==================== МОДАЛЬНЫЙ СТЕК ====================
function pushModal(modal, data) { modalStack.push({modal,data}); updateStack(); }
function popModal() { let m = modalStack.pop(); if(m) m.modal.style.display = 'none'; updateStack(); return m; }
function closeTopModal() { if(modalStack.length) popModal(); }
function closeAllModals() { while(modalStack.length) popModal(); }
function updateStack() { modalStack.forEach((m,i) => { m.modal.style.display = 'flex'; m.modal.style.zIndex = 1000 + i*100; let ov = m.modal.querySelector('.modal__overlay'); if(ov) ov.style.backgroundColor = `rgba(0,0,0,${Math.min(0.75+i*0.08,0.95)})`; }); }

// ==================== ОСНОВНАЯ МОДАЛКА ====================
async function showModal(file, addTitle=null) {
    let modal = $('#instructionModal');
    let title = addTitle || getTitle(file);
    $('#modalTitle').innerText = title;
    $('#modalBody').innerHTML = `<div class="loading-indicator"><div class="spinner"></div><div>📥 Загрузка...</div></div>`;
    pushModal(modal, {file, title});
    updateBreadcrumb(modal);
    $('#modalBackBtn').onclick = closeTopModal;
    modal.querySelector('.modal__close').onclick = closeTopModal;
    modal.querySelector('.modal__overlay').onclick = closeTopModal;
    $('#modalCloseBtn').onclick = closeTopModal;
    try {
        let instr = await getInstruction(file);
        let gUrl = instr?.googleDocUrl;
        let gBtn = $('#modalGoogleBtn');
        gBtn.style.display = gUrl ? 'inline-flex' : 'none';
        if(gUrl) gBtn.onclick = () => window.open(gUrl, '_blank');
        $('#modalBody').innerHTML = instr?.content?.length ? renderContent(instr.content) : md('# Инструкция в разработке');
    } catch(e) { $('#modalBody').innerHTML = '<div style="color:red">⚠️ Ошибка</div>'; }
}

function renderContent(c) {
    if(!c) return '<p>Нет содержимого</p>';
    return c.map((b,i) => {
        switch(b.type) {
            case 'text': return `<div class="markdown-body">${md(b.value)}</div>`;
            case 'step': return `<div class="step-block"><div class="step-num">${b.number||i+1}</div><div>${md(b.value)}</div></div>`;
            case 'image': return `<div style="margin:16px 0"><img src="${b.src}" alt="${b.alt||''}" style="max-width:100%;border-radius:12px" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect width=%22200%22 height=%22200%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%23999%22%3E%D0%9D%D0%B5%D1%82%20%D1%84%D0%BE%D1%82%D0%BE%3C/text%3E%3C/svg%3E'">${b.caption ? `<div style="font-size:.75rem;color:#888">📸 ${esc(b.caption)}</div>` : ''}</div>`;
            case 'warning': return `<div class="warning-block">⚠️ ${md(b.value)}</div>`;
            case 'note': return `<div class="note-block">💡 ${md(b.value)}</div>`;
            default: return `<div class="markdown-body">${md(b.value||'')}</div>`;
        }
    }).join('');
}

function updateBreadcrumb(modal) {
    let bc = modal.querySelector('.breadcrumb');
    if(!bc) return;
    let stack = modalStack.filter(i => i.modal.id === 'instructionModal' || i.modal.id === 'itDashboardModal');
    if(stack.length <= 1) { bc.style.display = 'none'; return; }
    bc.style.display = 'flex';
    bc.innerHTML = stack.map((item,i) => `<span class="breadcrumb__item ${i===stack.length-1?'active':''}" data-idx="${i}">${esc((item.data?.title||(item.modal.id==='itDashboardModal'?'IT-библиотека':'Инструкция')).slice(0,30))}</span>${i<stack.length-1?'<span class="breadcrumb__sep">→</span>':''}`).join('');
    bc.querySelectorAll('.breadcrumb__item:not(.active)').forEach(el => el.addEventListener('click', () => { let idx = parseInt(el.dataset.idx); while(modalStack.length > idx+1) popModal(); }));
}

// ==================== ПАРОЛЬ ====================
function showPasswordModal(cb) {
    let modal = $('#passwordModal');
    $('#passwordInput').value = '';
    $('#passwordError').style.display = 'none';
    pushModal(modal, {type:'password'});
    let confirm = () => {
        if($('#passwordInput').value === 'Hesoyam1607') {
            closeTopModal();
            if(cb) cb();
        } else {
            $('#passwordError').innerText = '❌ Неверный пароль!';
            $('#passwordError').style.display = 'block';
            $('#passwordInput').value = '';
        }
    };
    $('#passwordConfirmBtn').onclick = confirm;
    $('#passwordCancelBtn').onclick = closeTopModal;
    modal.querySelector('.modal__close').onclick = closeTopModal;
    modal.querySelector('.modal__overlay').onclick = closeTopModal;
    $('#passwordInput').onkeydown = e => { if(e.key === 'Enter') confirm(); if(e.key === 'Escape') closeTopModal(); };
    setTimeout(() => $('#passwordInput').focus(), 50);
}

// ==================== ПРИЛОЖЕНИЯ ====================
function showAppsModal() {
    let modal = $('#appsModal');
    $('#appsModalBody').innerHTML = Object.values(DB.apps).map(a => `<div class="card" style="margin-bottom:12px"><h4>📱 ${esc(a.name)}</h4><p>${esc(a.description)}</p>${a.instructions ? `<p style="font-size:.8rem">⚙️ ${esc(a.instructions)}</p>` : ''}<a href="${a.downloadUrl}" target="_blank" class="btn btn-primary" style="display:inline-block;margin-top:12px">Скачать</a></div>`).join('');
    pushModal(modal, {type:'apps', title:'Приложения'});
    modal.querySelector('.modal__close').onclick = closeTopModal;
    modal.querySelector('.modal__overlay').onclick = closeTopModal;
}

// ==================== IT ДАШБОРД ====================
async function loadItData() {
    let data = await loadJSON('js/it.json');
    itData = Object.entries(data || {}).map(([id, ins]) => ({id, title: getTitle(id), desc: getDesc(id), category: ins.category || 'local_settings'}));
}
function renderItDash() {
    let container = $('#itCardsContainer');
    let filtered = itData.filter(i => (itFilter === 'all' || i.category === itFilter) && (!itSearch || i.title.toLowerCase().includes(itSearch.toLowerCase()) || i.desc.toLowerCase().includes(itSearch.toLowerCase())));
    if(!filtered.length) { container.innerHTML = `<div class="it-empty-state"><div style="font-size:3rem">📭</div><h4>Ничего не найдено</h4></div>`; return; }
    let cats = {stores:'🏪 Магазины', sales_agents:'🚀 Торговые агенты', pos:'🖨️ Кассы', servers:'🖥️ Серверы', local_settings:'⚙️ Локальные настройки'};
    if(itFilter === 'all' && !itSearch) {
        let html = '';
        for(let [k,name] of Object.entries(cats)) {
            let items = filtered.filter(i => i.category === k);
            if(items.length) html += `<div class="it-category-group"><div class="it-category-title">${name}<span class="it-category-count">${items.length}</span></div><div class="it-cards-grid">${items.map(i => `<div class="it-card" data-file="${i.id}"><div class="it-card-category">${name}</div><div class="it-card-title">📄 ${esc(i.title)}</div><div class="it-card-desc">${esc(i.desc)}</div><span class="card__link">Открыть →</span></div>`).join('')}</div></div>`;
        }
        container.innerHTML = html;
    } else {
        container.innerHTML = `<div class="it-cards-grid">${filtered.map(i => `<div class="it-card" data-file="${i.id}"><div class="it-card-category">${cats[i.category]||'📄'}</div><div class="it-card-title">📄 ${esc(i.title)}</div><div class="it-card-desc">${esc(i.desc)}</div><span class="card__link">Открыть →</span></div>`).join('')}</div>`;
    }
    $$('.it-card').forEach(c => c.addEventListener('click', () => showModal(c.dataset.file, c.querySelector('.it-card-title')?.innerText?.replace('📄 ',''))));
}
function showItDash() {
    let modal = $('#itDashboardModal');
    if(!itData.length) loadItData().then(() => { renderItDash(); setupItFilters(); });
    else renderItDash();
    setupItFilters();
    pushModal(modal, {type:'it-dash', title:'IT-библиотека'});
    modal.querySelector('.modal__close').onclick = closeTopModal;
    modal.querySelector('.modal__overlay').onclick = closeTopModal;
    $('#itDashboardCloseBtn').onclick = closeTopModal;
    $('#itDashboardBackBtn').onclick = closeTopModal;
}
function setupItFilters() {
    let filters = ['all','stores','sales_agents','pos','servers','local_settings'];
    let names = {all:'📋 Все', stores:'🏪 Магазины', sales_agents:'🚀 Торговые', pos:'🖨️ Кассы', servers:'🖥️ Серверы', local_settings:'⚙️ Локальные'};
    $('#itFilters').innerHTML = filters.map(f => `<button class="filter-btn ${itFilter===f?'active':''}" data-filter="${f}">${names[f]}</button>`).join('');
    $$('.filter-btn').forEach(b => b.addEventListener('click', () => { itFilter = b.dataset.filter; itSearch = ''; $('#itSearchInput').value = ''; $('#itClearSearch').style.display = 'none'; renderItDash(); $$('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === itFilter)); }));
    let search = $('#itSearchInput');
    if(search) search.addEventListener('input', e => { itSearch = e.target.value; $('#itClearSearch').style.display = itSearch ? 'block' : 'none'; renderItDash(); });
    $('#itClearSearch')?.addEventListener('click', () => { itSearch = ''; $('#itSearchInput').value = ''; $('#itClearSearch').style.display = 'none'; renderItDash(); });
}

// ==================== ТЕМА И НАВИГАЦИЯ ====================
function initTheme() {
    let saved = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', saved);
    let btn = $('#themeToggle');
    btn.textContent = saved === 'light' ? '🌙' : '☀️';
    btn.onclick = () => { let next = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.body.setAttribute('data-theme', next); localStorage.setItem('theme', next); btn.textContent = next === 'light' ? '🌙' : '☀️'; };
}
function initNav() {
    $$('.wiki__nav a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); currSection = a.dataset.section; renderCurrSection(); }));
    $('#appsDownloadBtn')?.addEventListener('click', showAppsModal);
    document.addEventListener('keydown', e => { if(e.key === 'Escape') closeTopModal(); });
}

// ==================== ХЕЛПЕРЫ ====================
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ==================== СТАРТ ====================
document.addEventListener('DOMContentLoaded', () => { initTheme(); initNav(); loadDB(); });
