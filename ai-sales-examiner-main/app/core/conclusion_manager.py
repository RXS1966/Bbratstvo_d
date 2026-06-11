# app/core/conclusion_manager.py

import os
import json
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path

from openai import AsyncOpenAI
from app.core.config import settings


class ConclusionManager:
    """Менеджер для создания и сохранения заключений психолога"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.conclusions_dir = Path("conclusions")
        self.conclusions_dir.mkdir(exist_ok=True)
        
        # Загружаем промпт для заключения
        self.conclusion_prompt = self._load_conclusion_prompt()
        
        # Отслеживаем сессии, для которых уже созданы заключения
        self.completed_sessions = set()
    
    def _load_conclusion_prompt(self) -> str:
        """Загружает промпт для формирования заключения"""
        prompt_path = Path("prompts/conclusion_prompt.md")
        if prompt_path.exists():
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            # Fallback промпт
            return """
            Проанализируйте диалог и создайте профессиональное заключение для психолога.
            Включите: общую информацию, презентацию проблемы, проведенную работу, 
            психологическую оценку, рекомендации и заключение.
            """
    
    async def create_conclusion(self, chat_history: List[Dict[str, str]], 
                              user_session_id: str) -> str:
        """
        Создает заключение на основе истории диалога
        
        Args:
            chat_history: История диалога в формате [{"role": "user/assistant", "content": "..."}]
            user_session_id: ID сессии пользователя
            
        Returns:
            Сформированное заключение
        """
        # Формируем контекст диалога
        dialog_text = self._format_dialog_history(chat_history)
        
        # Создаем сообщения для GPT
        messages = [
            {"role": "system", "content": self.conclusion_prompt},
            {"role": "user", "content": f"Проанализируйте следующий диалог и создайте заключение:\n\n{dialog_text}"}
        ]
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.3
            )
            
            conclusion = response.choices[0].message.content
            return conclusion
            
        except Exception as e:
            print(f"Ошибка при создании заключения: {e}")
            return self._create_fallback_conclusion(chat_history)
    
    def _format_dialog_history(self, chat_history: List[Dict[str, str]]) -> str:
        """Форматирует историю диалога для анализа"""
        formatted_dialog = []
        for i, message in enumerate(chat_history, 1):
            role = "Клиент" if message["role"] == "user" else "Психолог"
            formatted_dialog.append(f"{i}. {role}: {message['content']}")
        
        return "\n".join(formatted_dialog)
    
    def _create_fallback_conclusion(self, chat_history: List[Dict[str, str]]) -> str:
        """Создает базовое заключение в случае ошибки"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        return f"""
ЗАКЛЮЧЕНИЕ ПСИХОЛОГА
Дата: {timestamp}
Консультант: Пётр Павел Сурков

1. ОБЩАЯ ИНФОРМАЦИЯ
- Дата консультации: {timestamp}
- Формат: Онлайн консультация
- Количество сообщений: {len(chat_history)}

2. ПРЕЗЕНТАЦИЯ ПРОБЛЕМЫ
- Требует дополнительного анализа диалога

3. ПРОВЕДЕННАЯ РАБОТА
- Проведена консультация по методике двух шагов
- Требует ручного анализа для детализации

4. ПСИХОЛОГИЧЕСКАЯ ОЦЕНКА
- Требует дополнительного анализа

5. РЕКОМЕНДАЦИИ
- Рекомендуется ручной анализ диалога

6. ЗАКЛЮЧЕНИЕ
- Консультация проведена
- Требуется дополнительный анализ для полного заключения
"""
    
    def save_conclusion(self, conclusion: str, user_session_id: str) -> str:
        """
        Сохраняет заключение в файл
        
        Args:
            conclusion: Текст заключения
            user_session_id: ID сессии пользователя
            
        Returns:
            Путь к сохраненному файлу
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"conclusion_{user_session_id}_{timestamp}.md"
        filepath = self.conclusions_dir / filename
        
        # Добавляем метаданные в начало файла
        metadata = f"""---
session_id: {user_session_id}
created_at: {datetime.now().isoformat()}
consultant: Пётр Павел Сурков
---

"""
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(metadata + conclusion)
        
        print(f"Заключение сохранено: {filepath}")
        return str(filepath)
    
    def is_dialog_completed(self, chat_history: List[Dict[str, str]], user_session_id: str = None) -> bool:
        """
        Проверяет, завершен ли диалог (выполнены оба шага)
        
        Args:
            chat_history: История диалога
            user_session_id: ID сессии пользователя (для проверки дублирования)
            
        Returns:
            True если диалог завершен, False иначе
        """
        if not chat_history:
            return False
        
        # Если для этой сессии уже создано заключение, не создаем повторно
        if user_session_id and user_session_id in self.completed_sessions:
            return False
        
        # Получаем последнее сообщение психолога
        last_assistant_message = None
        for message in reversed(chat_history):
            if message["role"] == "assistant":
                last_assistant_message = message["content"].lower()
                break
        
        if not last_assistant_message:
            return False
        
        # Ключевые фразы, указывающие на завершение диалога
        completion_phrases = [
            "спасибо за нашу беседу",
            "берегите себя и до свидания",
            "уверен, что у вас все получится",
            "до свидания",
            "успехов в реализации",
            "завершаем нашу консультацию"
        ]
        
        # Проверяем наличие фраз завершения
        for phrase in completion_phrases:
            if phrase in last_assistant_message:
                # Помечаем сессию как завершенную
                if user_session_id:
                    self.completed_sessions.add(user_session_id)
                return True
        
        return False
    
    def get_dialog_summary(self, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Создает краткую сводку диалога для анализа
        
        Args:
            chat_history: История диалога
            
        Returns:
            Словарь с метриками диалога
        """
        user_messages = [msg for msg in chat_history if msg["role"] == "user"]
        assistant_messages = [msg for msg in chat_history if msg["role"] == "assistant"]
        
        return {
            "total_messages": len(chat_history),
            "user_messages": len(user_messages),
            "assistant_messages": len(assistant_messages),
            "dialog_duration_estimate": len(chat_history) * 2,  # Примерно 2 минуты на сообщение
            # "is_completed": self.is_dialog_completed(chat_history, user_session_id)
        }
    
    def clear_session(self, user_session_id: str):
        """
        Очищает сессию из списка завершенных (при очистке истории)
        
        Args:
            user_session_id: ID сессии пользователя
        """
        if user_session_id in self.completed_sessions:
            self.completed_sessions.remove(user_session_id)
            print(f"[DEBUG] Cleared completed session: {user_session_id}")
