# "`python
# Основной модуль приложения.
# "`python

import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()


def main():

    print('Привет, мир!')
    print('Проект успешно настроен!')
    
    # Пример использования переменных окружения
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    if debug:
        print('Режим отладки включен')


if __name__ == '__main__':
    main()