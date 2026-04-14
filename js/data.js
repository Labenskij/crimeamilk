const APP_DATA = {
    stores: {
        sevastopol: {
            city: "Севастополь", shops: [
                { id: "1", address: "ул. Астана Кесаева, д.20", file: "astana_kesaeva.md", googleDocUrl: "https://docs.google.com/document/d/1u5h9A-lZt7LSHTsAuXtrziE-5SPWgK6IjQQsan4RmRY/edit" },
                { id: "2", address: "пр-т Героев Сталинграда, д.21-А", file: "stalingrad.md", googleDocUrl: "https://docs.google.com/document/d/1bKZS06vTt1SVmgyigZEdI16nAOALD8DltKQ5jpiW9H0/edit" },
                { id: "3", address: "пр-т Октябрьской Революции, д.89", file: "oktyabr.md", googleDocUrl: "https://docs.google.com/document/d/1jNxzEgIQjWRGyxiqgsBsETM5nPHG6YQx2vCYGRvrcL8/edit" },
                { id: "4", address: "ул. Тараса Шевченко, д.26", file: "shevchenko.md", googleDocUrl: "https://docs.google.com/document/d/12zi8DP81A3dGbiGMe2Fg2UR9OP_U_nJfT-S5AeFAA0A/edit" },
                { id: "5", address: "ул. Горпищенко, д.127", file: "gorpischenko_127.md", googleDocUrl: "https://docs.google.com/document/d/1x71cm1l7IvLhu7kpY43mx0MMiC5VPrYSItbLKZjSSAM/edit" },
                { id: "6", address: "ул. Горпищенко, д.139", file: "gorpischenko_139.md", googleDocUrl: "https://docs.google.com/document/d/1x71cm1l7IvLhu7kpY43mx0MMiC5VPrYSItbLKZjSSAM/edit" },
                { id: "7", address: "ул. Горпищенко, д.143", file: "gorpischenko_143.md", googleDocUrl: "https://docs.google.com/document/d/1x71cm1l7IvLhu7kpY43mx0MMiC5VPrYSItbLKZjSSAM/edit" },
                { id: "8", address: "ул. Бориса Михайлова, д.11", file: "boris_mihaylova.md", googleDocUrl: "https://docs.google.com/document/d/1x71cm1l7IvLhu7kpY43mx0MMiC5VPrYSItbLKZjSSAM/edit" }
            ]
        },
        chernomorsk: {
            city: "Черноморск", shops: [
                { id: "1", address: "ул. Почтовая, д.43 — Алкомаркет Пятница", file: "pytnica.md", googleDocUrl: "https://docs.google.com/document/d/1yf7HQpdvY2PMAueTfC-QQq5-Rhg8Eb2jcUEjlHBrJzg/edit" },
                { id: "2", address: "ул. Почтовая, д.43 — №5 Эконом", file: "econom5.md", googleDocUrl: "https://docs.google.com/document/d/1yf7HQpdvY2PMAueTfC-QQq5-Rhg8Eb2jcUEjlHBrJzg/edit" },
                { id: "3", address: "ул. Почтовая, д.43 — №8 Рыбный", file: "rybniy.md", googleDocUrl: "https://docs.google.com/document/d/1eF-T5f4CKJK486VEAjZUfK9X7CkM9rOp3KznZbUm3_Y/edit" },
                { id: "4", address: "ул. Димитрова, д.15 — №7 Эконом", file: "dimitrova.md", googleDocUrl: "https://docs.google.com/document/d/1bKZS06vTt1SVmgyigZEdI16nAOALD8DltKQ5jpiW9H0/edit" },
                { id: "5", address: "ул. Кирова, д.83 — Burger Station", file: "burger.md", googleDocUrl: "https://docs.google.com/document/d/1yf7HQpdvY2PMAueTfC-QQq5-Rhg8Eb2jcUEjlHBrJzg/edit" },
                { id: "6", address: "ул. Кирова, д.85 — №6 Эконом", file: "kirova6.md", googleDocUrl: "https://docs.google.com/document/d/1yf7HQpdvY2PMAueTfC-QQq5-Rhg8Eb2jcUEjlHBrJzg/edit" },
                { id: "7", address: "ул. Ленина, д.31 — №9 Эконом", file: "lenina9.md", googleDocUrl: "https://docs.google.com/document/d/1-NtHTK4QuMYp7v7GYzvtzDHLdXSHaLK_EAjEZOxflZs/edit" }
            ]
        }
    },
    departments: {
        accounting: { name: "📊 Бухгалтерам", files: ["accounting_1.md", "accounting_2.md", "accounting_3.md", "accounting_4.md", "accounting_5.md", "accounting_6.md", "accounting_7.md", "accounting_8.md"] },
        warehouse: { name: "📦 Склад", files: ["warehouse_1.md"] },
        sales: { name: "🚀 Торговые представители", files: ["sales_1.md", "sales_2.md", "sales_3.md", "sales_4.md", "sales_5.md"] }
    },
    corporate: { files: ["corporate_1.md", "corporate_2.md"] },
    support: { files: ["support_1.md", "support_2.md", "support_3.md"] },

    titles: {
        "astana_kesaeva.md": "Инструкция: ул. Астана Кесаева, д.20", "stalingrad.md": "Инструкция: пр-т Героев Сталинграда, д.21-А", "oktyabr.md": "Инструкция: пр-т Октябрьской Революции, д.89", "shevchenko.md": "Инструкция: ул. Тараса Шевченко, д.26", "gorpischenko_127.md": "Инструкция: ул. Горпищенко, д.127", "gorpischenko_139.md": "Инструкция: ул. Горпищенко, д.139", "gorpischenko_143.md": "Инструкция: ул. Горпищенко, д.143", "boris_mihaylova.md": "Инструкция: ул. Бориса Михайлова, д.11", "pytnica.md": "Алкомаркет Пятница", "econom5.md": "Магазин №5 Эконом", "rybniy.md": "Рыбный магазин №8", "dimitrova.md": "Магазин №7 Димитрова", "burger.md": "Кафе Burger Station", "kirova6.md": "Магазин №6 Кирова", "lenina9.md": "Магазин №9 Ленина",
        "accounting_1.md": "Альтернативный способ через сайт vetrf.ru", "accounting_2.md": "Гашение ВСД", "accounting_3.md": "Загрузка ВСД из Меркурий ХС в базу 1С", "accounting_4.md": "Загрузка площадки", "accounting_5.md": "Запрос складского журнала", "accounting_6.md": "Инвентаризация", "accounting_7.md": "Оформление ВСД", "accounting_8.md": "Приход товара на склад",
        "warehouse_1.md": "Проведение пересчета склада (ревизии) через ТСД (DataMobile)",
        "sales_1.md": "Мерчендайзинг 1С", "sales_2.md": "Требования Агент+ к оборудованию (Android)", "sales_3.md": "Мерчендайзинг Mobile", "sales_4.md": "Поступления и возврат товаров", "sales_5.md": "Процесс работы на торговых точках",
        "corporate_1.md": "Установка Element", "corporate_2.md": "Microsoft Excel (скачать apk)",
        "support_1.md": "Проблема с интернетом", "support_2.md": "Не включается компьютер/касса", "support_3.md": "Проблемы с кассовым оборудованием"
    },
    descs: {
        "astana_kesaeva.md": "Инструкция: Проблема с техникой", "stalingrad.md": "Инструкция: Проблема с техникой", "oktyabr.md": "Инструкция: Проблема с техникой", "shevchenko.md": "Инструкция: Проблема с техникой", "gorpischenko_127.md": "Инструкция: Проблема с техникой", "gorpischenko_139.md": "Инструкция: Проблема с техникой", "gorpischenko_143.md": "Инструкция: Проблема с техникой", "boris_mihaylova.md": "Инструкция: Проблема с техникой", "pytnica.md": "Инструкция: Проблема с техникой", "econom5.md": "Инструкция: Проблема с техникой", "rybniy.md": "Инструкция: Проблема с техникой", "dimitrova.md": "Инструкция: Проблема с техникой", "burger.md": "Инструкция: Проблема с техникой", "kirova6.md": "Инструкция: Проблема с техникой", "lenina9.md": "Инструкция: Проблема с техникой",
        "accounting_1.md": "Инструкция по использованию альтернативного способа через официальный сайт ВетИС", "accounting_2.md": "Инструкция по процедуре гашения ветеринарно-сопроводительных документов", "accounting_3.md": "Инструкция по загрузке данных из системы Меркурий в 1С", "accounting_4.md": "Инструкция по загрузке и настройке рабочих площадок", "accounting_5.md": "Инструкция по формированию и получению складских журналов", "accounting_6.md": "Инструкция по проведению инвентаризации на предприятии", "accounting_7.md": "Инструкция по правильному оформлению ветеринарно-сопроводительных документов", "accounting_8.md": "Инструкция по учету прихода товаров на склад предприятия",
        "warehouse_1.md": "Полный цикл работы: от подготовки в офисе до финишной выгрузки данных",
        "sales_1.md": "Сбор информации о представленном ассортименте товаров в торговых точках", "sales_2.md": "Требования к мобильным устройствам на Android", "sales_3.md": "Сбор информации о представленном ассортименте товаров через мобильное приложение", "sales_4.md": "Оформление операций закупки товаров и возвратов от клиентов", "sales_5.md": "Порядок действий при визите в торговую точку",
        "corporate_1.md": "Установка мессенджера Element на рабочие устройства", "corporate_2.md": "Софт, поддерживающий все версии и форматы Excel",
        "support_1.md": "Базовая инструкция по диагностике и решению проблем с интернет-соединением", "support_2.md": "Пошаговый алгоритм действий при отказе включения компьютерного или кассового оборудования", "support_3.md": "Инструкция по устранению типовых ошибок кассового оборудования"
    },

    instructions: {
        "accounting_1.md": { content: [{ "type": "text", "value": "# 🌐 Работа с vetrf.ru\n\n**Шаг 1:** Перейдите на сайт\n**Шаг 2:** Войдите в систему\n**Шаг 3:** Выберите раздел «Меркурий»" }, { "type": "image", "src": "img/screenshots/vetrf_login.jpg", "alt": "Авторизация", "caption": "Страница входа" }] },
        "accounting_2.md": { content: [{ "type": "text", "value": "# 📄 Гашение ВСД\n\n## Порядок действий:\n1. Откройте раздел «ВСД»\n2. Выберите документ\n3. Нажмите «Погасить»\n4. Подтвердите действие" }] },
        "sales_1.md": { content: [{ "type": "text", "value": "# 🛒 Мерчендайзинг в 1С\n\n## Функции:\n- Сбор ассортимента\n- Фотофиксация\n- Отчетность" }] },
        "astana_kesaeva.md": { content: [{ "type": "text", "value": "## 🔧 Диагностика проблемы\n\n1. Проверьте питание\n2. Перезагрузите устройство\n3. Обратитесь в техподдержку" }, { "type": "image", "src": "img/screenshots/diagnostic.jpg", "alt": "Схема", "caption": "Порядок диагностики" }] },
        "warehouse_1.md": { content: [{ "type": "text", "value": "# 📱 Ревизия через DataMobile\n\n## Этапы:\n- Подготовка в офисе\n- Синхронизация ТСД\n- Сканирование товаров\n- Выгрузка результатов" }] }
    }
};

// Заглушки для отсутствующих инструкций
const missingInstructions = ["accounting_3.md", "accounting_4.md", "accounting_5.md", "accounting_6.md", "accounting_7.md", "accounting_8.md", "stalingrad.md", "oktyabr.md", "shevchenko.md", "gorpischenko_127.md", "gorpischenko_139.md", "gorpischenko_143.md", "boris_mihaylova.md", "pytnica.md", "econom5.md", "rybniy.md", "dimitrova.md", "burger.md", "kirova6.md", "lenina9.md", "sales_2.md", "sales_3.md", "sales_4.md", "sales_5.md", "corporate_1.md", "corporate_2.md", "support_1.md", "support_2.md", "support_3.md"];
missingInstructions.forEach(file => {
    if (!APP_DATA.instructions[file]) {
        APP_DATA.instructions[file] = { content: [{ "type": "text", "value": `# ${APP_DATA.titles[file] || file}\n\n## Содержание инструкции\n\n*Инструкция находится в разработке.*\n\n### Свяжитесь с ответственным специалистом для получения полной версии.` }] };
    }
});
