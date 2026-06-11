

распаковать, открыть Variant_3\docs\VNESHNIY-ZAPUSK.md и идти по шагам

Требования: Docker Desktop, Python 3.11+, Node.js 20+, npm
Порты: PostgreSQL 5433, API 8000, web 5173
Демо-логины: demo/demo, manager/manager, admin/admin
LLM (по желанию): Ollama + ollama pull llama3.2; настройки в apps/api/.env.example
Проверка после установки: http://localhost:8000/api/health → db_ok: true