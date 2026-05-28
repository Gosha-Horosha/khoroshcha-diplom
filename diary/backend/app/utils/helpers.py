import re
from typing import Optional


def validate_email(email: str) -> bool:
    """Проверяет валидность email адреса"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password: str) -> tuple[bool, Optional[str]]:
    """Проверяет сложность пароля"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, None


def sanitize_input(text: str) -> str:
    """Очищает входные данные от потенциально опасных символов"""
    # Удаляем потенциально опасные символы
    sanitized = re.sub(r'[<>\"\']', '', text)
    return sanitized.strip()


def format_datetime(dt) -> str:
    """Форматирует datetime в читаемый формат"""
    if dt:
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    return ""


def truncate_text(text: str, max_length: int = 100) -> str:
    """Обрезает текст до указанной длины"""
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."