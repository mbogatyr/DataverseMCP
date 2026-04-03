# dataverse-mcp-server

MCP (Model Context Protocol) сервер для чтения данных и схемы из Microsoft Dataverse через Web API.

## Инструменты

### `dataverse_get_schema` — чтение схемы

Возвращает метаданные таблиц Dataverse.

**Режим 1: список всех таблиц** — не указывайте `entity_name`:

```
Какие таблицы есть в Dataverse?
```

**Режим 2: схема конкретной таблицы** — укажите `entity_name`:

```
Покажи схему таблицы account с колонками и связями
```

| Параметр | Тип | По умолчанию | Описание |
|---|---|---|---|
| `entity_name` | string | — | Logical name таблицы (`account`, `contact`, `opportunity`). Без него — список всех таблиц |
| `include_columns` | boolean | `true` | Включить метаданные колонок (тип, обязательность, флаги чтения/записи). Виртуальные и неqueryable companion/display-атрибуты исключаются |
| `include_relationships` | boolean | `false` | Включить связи 1:N, N:1, N:N |
| `response_format` | `markdown` \| `json` | `markdown` | Формат ответа |

---

### `dataverse_query_data` — чтение данных

Запрашивает записи из любой таблицы с поддержкой OData-фильтрации.

```
Покажи 10 активных аккаунтов, отсортированных по имени
```

| Параметр | Тип | По умолчанию | Описание |
|---|---|---|---|
| `entity_set_name` | string | **обязателен** | EntitySet name таблицы (`accounts`, `contacts`, `leads`) |
| `select` | string[] | — | Список колонок для возврата (`$select`) |
| `filter` | string | — | OData-фильтр (`$filter`) |
| `order_by` | string | — | Сортировка (`$orderby`) |
| `top` | number | `50` | Количество записей (максимум 5000) |
| `skip_token` | string | — | Токен для следующей страницы (из поля `skip_token` предыдущего ответа) |
| `count` | boolean | `false` | Включить общее количество записей (`$count`) |
| `response_format` | `json` \| `markdown` | `json` | Формат ответа |

**Примеры фильтров:**

```
statecode eq 0
name eq 'Contoso Ltd'
revenue gt 100000
createdon ge 2024-01-01T00:00:00Z
contains(name, 'corp')
statecode eq 0 and revenue gt 50000
```

---

## Установка и запуск

### 1. Зависимости

```bash
npm install
npm run build
```

### 2. Переменные окружения

| Переменная | Описание |
|---|---|
| `DATAVERSE_URL` | URL вашей Dataverse-среды, например `https://yourorg.crm.dynamics.com` |
| `AZURE_TENANT_ID` | ID тенанта Microsoft Entra ID |
| `AZURE_CLIENT_ID` | Client ID зарегистрированного приложения |
| `AZURE_CLIENT_SECRET` | Client Secret зарегистрированного приложения |

### 3. Подключение к Claude Desktop

Добавьте в файл конфигурации Claude Desktop:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dataverse": {
      "command": "node",
      "args": ["/absolute/path/to/DataverseMCP/dist/index.js"],
      "env": {
        "DATAVERSE_URL": "https://yourorg.crm.dynamics.com",
        "AZURE_TENANT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "AZURE_CLIENT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "AZURE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### 4. Проверка через MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## Настройка Dataverse

### Шаг 1: Регистрация приложения в Microsoft Entra ID

1. Перейдите в [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Укажите имя (например, `DataverseMCPServer`) и нажмите **Register**
3. Скопируйте **Application (client) ID** и **Directory (tenant) ID**
4. Перейдите в **Certificates & secrets** → **New client secret**, скопируйте значение

### Шаг 2: Создание Application User в Dataverse

1. Откройте [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. Выберите вашу среду → **Settings** → **Users + permissions** → **Application users**
3. Нажмите **New app user** → выберите приложение из Шага 1
4. Нажмите **Create**

### Шаг 3: Назначение Security Role

1. В списке Application Users найдите созданного пользователя
2. Нажмите **Edit security roles**
3. Назначьте роль с правами на чтение нужных таблиц (например, **Basic User** или кастомную роль)

---

## Структура проекта

```
dataverse-mcp-server/
├── src/
│   ├── index.ts                # Точка входа: McpServer + StdioTransport
│   ├── constants.ts            # Константы: версия API, лимиты
│   ├── types.ts                # TypeScript-интерфейсы для Dataverse API
│   ├── schemas/
│   │   └── index.ts            # Zod-схемы входных параметров инструментов
│   ├── services/
│   │   └── dataverse.ts        # DataverseClient: MSAL-аутентификация и HTTP
│   └── tools/
│       ├── get-schema.ts       # Инструмент dataverse_get_schema
│       └── query-data.ts       # Инструмент dataverse_query_data
├── dist/                       # Скомпилированный JavaScript
├── package.json
└── tsconfig.json
```

## Команды разработки

```bash
npm run dev      # Запуск с авторестартом (tsx watch)
npm run build    # Компиляция TypeScript → dist/
npm run clean    # Очистка dist/
npm start        # Запуск скомпилированного сервера
```
