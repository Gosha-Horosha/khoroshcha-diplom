# Diary App

Full-stack веб-приложение для ведения личного дневника.

Пользователь может зарегистрироваться, авторизоваться и управлять личными записями дневника: создавать, просматривать, редактировать и удалять их. Серверная часть реализует REST API, а клиентская — интерфейс для работы с данными.

Проект разработан в рамках дипломной работы.

## Возможности

- Регистрация и аутентификация пользователей
- Авторизация и разграничение прав доступа
- Создание записей дневника
- Просмотр списка личных записей
- Просмотр отдельной записи
- Редактирование и удаление записей
- Валидация входных данных
- Миграции базы данных через Alembic
- Автоматические тесты backend-части
- Локальный и production-запуск в Docker Compose

## Стек


| Область | Технологии |
|---|---|
| Backend | Python, FastAPI, Pydantic |
| Работа с БД | SQLAlchemy, Alembic |
| База данных | PostgreSQL |
| Аутентификация | JWT / механизм авторизации FastAPI |
| Frontend | Vue.js, Vite |
| Клиентское состояние | Store-модули для auth и diary |
| Web server / reverse proxy | Nginx |
| Контейнеризация | Docker, Docker Compose |
| Тестирование | pytest |
| Качество кода frontend | ESLint, Prettier |

## Архитектура

Приложение построено как разделённая клиент-серверная система:

```text
Browser
   │
   ▼
Nginx
   │
   ├── Frontend: Vue + Vite
   │
   └── Backend: FastAPI REST API
                    │
                    ▼
             SQLAlchemy ORM
                    │
                    ▼
               PostgreSQL
```

Backend организован по слоям:

```text
API endpoints → services → database models / session
                     │
                     └── Pydantic schemas
```

Такое разделение отделяет HTTP-слой от бизнес-логики и работы с базой данных, упрощает тестирование и дальнейшее развитие приложения.


## Структура проекта

```text
khoroshcha-diplom/
├── diary/
│   ├── backend/                 # FastAPI-приложение
│   │   ├── app/
│   │   │   ├── api/endpoints/   # HTTP-эндпоинты: auth, diary, permissions
│   │   │   ├── core/            # Конфигурация и безопасность
│   │   │   ├── db/              # Модели SQLAlchemy и сессии БД
│   │   │   ├── schemas/         # Pydantic-схемы запросов и ответов
│   │   │   ├── services/        # Бизнес-логика приложения
│   │   │   └── main.py          # Точка входа FastAPI
│   │   ├── alembic/             # Миграции базы данных
│   │   ├── tests/               # Тесты backend-части
│   │   ├── Dockerfile
│   │   ├── alembic.ini
│   │   └── requirements.txt
│   │
│   ├── frontend/                # Vue.js-клиент
│   │   ├── src/
│   │   │   ├── components/      # Формы и компоненты дневника/авторизации
│   │   │   ├── router/          # Маршрутизация
│   │   │   ├── services/        # API-клиент
│   │   │   ├── store/           # Состояние auth и diary
│   │   │   └── views/           # Страницы приложения
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   └── package.json
│   │
│   ├── infra/
│   │   ├── docker-compose.yml       # Локальный запуск
│   │   ├── docker-compose.prod.yml  # Production-конфигурация
│   │   ├── init.sql
│   │   └── nginx/
│   │
│   ├── scripts/                 # Скрипты запуска и миграций
│   ├── DEPLOYMENT.md            # Инструкция по развёртыванию
│   └── README.md                # Документация приложения
│
├── docs/                        # Документация дипломного проекта
├── src/                         # Служебный код верхнего уровня
└── tests/                       # Служебные тесты верхнего уровня
```

## Быстрый запуск

### Требования

- Docker
- Docker Compose

### 1. Клонирование

```bash
git clone https://github.com/Gosha-Horosha/khoroshcha-diplom.git
cd khoroshcha-diplom
```

### 2. Настройка переменных окружения

Создай файл окружения для backend на основе примера:

```bash
cp backend/.env.example backend/.env
```

Заполни значения переменных в `backend/.env`.

Не добавляй `.env` в Git: в нём могут находиться пароли к БД и секреты для авторизации.


### 3. Запуск в Docker

```bash
docker compose -f infra/docker-compose.yml up --build
```

Или через скрипт:

```bash
bash scripts/start-dev.sh
```

После запуска:

- Frontend: `http://localhost:[PORT]`
- Backend API: `http://localhost:[API_PORT]`
- Swagger / OpenAPI: `http://localhost:[API_PORT]/docs`

> Замени `[PORT]` и `[API_PORT]` на фактические порты из `infra/docker-compose.yml`.

### Остановка

```bash
docker compose -f infra/docker-compose.yml down
```

или:

```bash
bash scripts/stop-dev.sh
```

## Миграции

Для применения миграций используй:

```bash
bash scripts/run-migrations.sh
```

Либо запусти Alembic из директории backend:

```bash
cd backend
alembic upgrade head
```

Начальная миграция находится в:

```text
backend/alembic/versions/001_initial_migration.py
```

## Локальная разработка без Docker

### Backend

```bash
cd diary/backend

python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd diary/frontend
npm install
npm run dev
```

## Тестирование

Backend-тесты:

```bash
cd diary/backend
pytest
```

В проекте есть тесты, в частности, для модулей авторизации и операций с записями дневника:

```text
backend/tests/
├── test_auth.py
└── test_diary.py
```

## API

Основные группы эндпоинтов:

| Группа | Назначение |
|---|---|
| `auth` | Регистрация, вход и работа с авторизацией |
| `diary` | CRUD-операции над записями дневника |
| `permissions` | Проверка прав доступа |

Полная интерактивная спецификация доступна в Swagger UI после запуска backend:

```text
/api/docs
```

> Здесь стоит указать фактический путь, если он отличается от `/docs`.

## Deployment

Для production-развёртывания предусмотрены:

- отдельная Docker Compose-конфигурация `infra/docker-compose.prod.yml`;
- Nginx-конфигурация для reverse proxy;
- отдельный файл `DEPLOYMENT.md`.

## Что можно улучшить

План дальнейшего развития проекта:

- Добавить скриншоты пользовательского интерфейса в README
- Добавить CI через GitHub Actions: линтеры, тесты, сборка Docker-образов
- Настроить централизованное логирование и мониторинг ошибок
- Добавить пагинацию и поиск по записям
- Добавить теги, категории и фильтрацию записей
- Развернуть публичную demo-версию

## Автор

Георгий Хороща
GitHub: [Gosha-Horosha](https://github.com/Gosha-Horosha)
