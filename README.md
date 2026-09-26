# Imaginarium Companion

Веб-компаньон для партии с физическими картами: скрытый выбор, голосование, подсчёт очков, бесконечное поле, восстановление после F5 и обрыва связи.

## Возможности

- комнаты до 7 игроков, старт любым составом и анонимный вход через Firebase Auth;
- выбор свободного цвета уже после создания или входа в комнату;
- отдельные роли технического хоста и ведущего текущего кона;
- приватные submissions в отдельной ветке Realtime Database;
- специальный режим на троих: пять карт, по две карты от неведущих;
- восстановление draft после F5, presence/reconnect и автоматическая передача host;
- защита host от ложной передачи при кратком reconnect и автоматический запуск следующего кона;
- поле из 39 облаков и векторные фишки-слоники;
- голосование за завершение партии строгим большинством;
- исключение отключившегося игрока с перезапуском незавершённого кона;
- GitHub Pages deployment через Actions.

## Настройка Firebase

1. Создайте Firebase Web App, включите Anonymous Authentication и Realtime Database.
2. Вставьте web config в `js/services/firebase-config.js`.
3. Опубликуйте `database.rules.json` в Realtime Database Rules.
4. Добавьте `localhost` и `alarongh.github.io` в Authentication → Authorized domains.

## Проверка

```text
npm test
```

После push в `main` workflow тестирует движок и публикует только production-файлы сайта.

Векторные иконки облака и слона взяты из Material Design Icons; атрибуция находится в `assets/ICONS-LICENSE.md`.
