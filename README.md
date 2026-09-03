# artemsokolovdev.ru

Портфолио Артёма Соколова — AI-разработчика из Новосибирска.
Одна страница: кто я, разделы «Игры», «Сервисы» и «Разное» сеткой плиток
с обложками проектов, донат и контакты.

Статика без сборки и зависимостей: HTML + CSS + немного JS.

## Структура

```
index.html               вся страница
assets/css/style.css     стили, тёмная и светлая темы
assets/js/main.js        тема, копирование кошелька
assets/img/favicon-32.png  иконка вкладки (+ favicon-180 для iOS)
assets/img/avatar.png    аватар с прозрачным фоном
assets/img/projects/     обложки проектов, 800x500 (16:10)
.nojekyll                отключает Jekyll на GitHub Pages
```

## Публикация на GitHub Pages (бесплатно)

1. Создайте на GitHub **публичный** репозиторий с именем ровно `artemsokolov1.github.io`
   — оно должно совпадать с вашим username, тогда сайт откроется по адресу
   https://artemsokolov1.github.io/
2. В этой папке выполните:

   ```bash
   git init
   git add .
   git commit -m "Портфолио: первая версия"
   git branch -M main
   git remote add origin https://github.com/artemsokolov1/artemsokolov1.github.io.git
   git push -u origin main
   ```

3. В репозитории: **Settings → Pages**, источник — `Deploy from a branch`,
   ветка `main`, папка `/ (root)`.
4. Через 1–2 минуты сайт будет онлайн. Дальше любой `git push` в `main` обновляет его.

## Свой домен — artemsokolovdev.ru

Домен куплен на reg.ru. В корне репозитория лежит файл `CNAME` с адресом домена —
именно он говорит GitHub Pages, по какому имени отдавать сайт. Удалять его нельзя.

DNS-записи в панели reg.ru (раздел «DNS-серверы и управление зоной»):

| Тип     | Имя (subdomain) | Значение                  |
|---------|-----------------|---------------------------|
| A       | @               | 185.199.108.153           |
| A       | @               | 185.199.109.153           |
| A       | @               | 185.199.110.153           |
| A       | @               | 185.199.111.153           |
| CNAME   | www             | artemsokolov1.github.io.  |

Четыре A-записи — это все серверы GitHub Pages, нужны именно все четыре.
В записи CNAME точка в конце обязательна.

После того как DNS разойдётся, в **Settings → Pages** появится галочка `Enforce HTTPS`
— включите её, сертификат Let's Encrypt выпустится автоматически.
Адрес `artemsokolov1.github.io` продолжит работать и будет редиректить на домен.

## Как добавить проект

Каждый проект — плитка `<a class="tile">`: обложка, название, одна-две строки
описания. Вся плитка кликабельна и открывает сайт в новой вкладке, адрес
показан прямо на обложке. Готовый шаблон лежит в HTML-комментарии
в начале раздела «Игры» — скопируйте его в нужную секцию.

Проект без сайта оформляется как `<div class="tile tile--off">` с полосатой
заглушкой вместо картинки и меткой `<span class="tile__badge">`.

### Обложка

Формат — JPEG 800x500 (соотношение 16:10), в `assets/img/projects/`.
Проще всего снять скриншот сайта и привести к размеру одной командой
(нужен ImageMagick):

```bash
magick screenshot.png -resize 800x500^ -gravity center -extent 800x500 -strip -quality 80 assets/img/projects/имя.jpg
```

Скриншот можно снять и без браузера вручную:

```bash
chrome --headless=new --hide-scrollbars --window-size=1200,750 --virtual-time-budget=9000 --screenshot=screenshot.png https://домен.ru
```

## Локальный просмотр

Откройте `index.html` в браузере или поднимите сервер:

```bash
python -m http.server 8000
```

## Донаты

USDT, сеть TRON (TRC-20): `TPE7DFnV6TxAL4p9ACQAHKsMMcPRSzRXws`
