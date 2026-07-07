# Chrome Web Store — материалы листинга (v0.2.0)

Всё, что нужно вставить в дашборд CWS. Тексты — EN (аудитория глобальная).
Загружаемый файл: `shainbox-clipper-0.2.0.zip`.

---

## Название и короткое описание — ЖИВУТ В МАНИФЕСТЕ

CWS берёт Title и Summary из manifest.json внутри zip — в дашборде они
не редактируются. Уже прошито в 0.2.0-zip:

- name: **ShainBox Clipper — Save Design References**
- description: **Hover any image, GIF or video and save it straight to your
  local ShainBox library. One click, no cloud, no accounts.**

Менять текст → менять manifest.json → пересобирать zip → загружать новый пакет.

## Полное описание

```
Collect design references without breaking your flow.

ShainBox Clipper adds a small save button that appears when you hover any
image on any website — Dribbble, Behance, Pinterest, X, anywhere. One click
sends the file straight into ShainBox, a local-first library for design
references on your Mac or Windows machine.

WHAT IT DOES
• Hover any image → click → saved. No downloads folder, no drag & drop.
• Pick the exact board: the dropdown lists your boards right in the browser.
• Videos & GIFs too (beta): grab short mp4/webm clips — perfect for Dribbble
  shots and motion references.
• Works offline-first: if the app is closed, clips queue up and land in your
  library the next time it runs.
• Per-site switch: turn the clipper off on sites where you don't need it.

PRIVATE BY DESIGN
Your files never touch our servers — the extension talks only to the ShainBox
app running on YOUR computer (via a local pairing token). No accounts, no
cloud, no tracking, no analytics inside the extension.

NEEDS THE FREE SHAINBOX APP
This extension is a companion to ShainBox for macOS and Windows.
Download it at https://shain.one/shainbox — free 14-day trial, then a $29
one-time purchase (no subscription, free updates).

WHY SHAINBOX
• Boards are just folders on your disk — your library outlives any app.
• AI search: find "that dark dashboard with the green chart" by describing it.
• OCR: text inside your screenshots is searchable too.
• Tags, notes, favorites, source URLs — everything a reference deserves.

Questions or ideas? → https://shain.one/shainbox
```

## Категория и язык

- Category: **Workflow & Planning** (или Tools; Workflow ближе)
- Language: English

---

## Графика (спеки Google)

| Ассет | Размер | Обязательно | Что показать |
|---|---|---|---|
| Иконка | 128×128 | да | уже в zip (icon128.png) |
| Скриншоты, 1–5 шт | **1280×800** (или 640×400), PNG/JPG, без прозрачности | да, минимум 1 | см. раскадровку |
| Small promo tile | 440×280 | нет, но очень желательно (карточки в подборках) | логотип + «Save design references in one hover» |
| Marquee promo | 1400×560 | нет | на будущее, если попадём в подборки |

### Раскадровка скриншотов (5 шт, порядок = приоритет)

1. **Hover-кнопка над шотом на Dribbble** — главный кадр: курсор на картинке,
   тёмная пилюля видна. Подпись: «Save any image in one hover».
2. **Открытый пикер бордов** — дропдаун со списком бордов. «Send it to the right
   board — right from the browser».
3. **Видео на Dribbble с кнопкой** — «Videos & GIFs too (beta)».
4. **Приложение: сетка с сохранёнными референсами** — «…straight into your local
   library». Продаёт само приложение.
5. **Попап расширения (Connected)** — «Pairs with the app in seconds. No accounts».

Стиль: реальные тёмные/светлые сайты, крупный курсор, минимум текста на самом
скриншоте (Google режет мелкий текст при масштабировании карточек).

---

## Вкладка Privacy (ответы для ревью)

- **Single purpose**: Save images and videos from web pages into the user's
  local ShainBox desktop application.
- **Permission justifications**:
  - `host_permissions <all_urls>` + content script: the save button must appear
    on images on any website the user browses; the extension cannot know in
    advance which sites the user collects references from.
  - `storage`: stores the local pairing token, last-used board and per-site
    on/off preferences.
  - `alarms`: periodically retries delivering queued clips when the desktop
    app was offline.
  - `http://127.0.0.1/*`, `http://localhost/*`: the extension sends saved files
    ONLY to the ShainBox desktop app listening on the user's own machine.
- **Data usage**: не собирает ничего. Отметить «Does not collect user data»
  во всех пунктах — расширение не имеет аналитики и не шлёт данные никуда,
  кроме localhost.
- **Privacy policy URL**: https://shain.one/shainbox/privacy.html

## Прочее в дашборде

- Official URL / Homepage: https://shain.one/shainbox
- Support email: тот, с которого отвечаешь пользователям
- Регионы: все
- Декларация EEA: non-trader (уже выбрано)

## Замечания к ревью

- Ревью 1–3 дня; `<all_urls>` иногда триггерит доп. проверку — обоснование выше
  написано именно под это.
- После публикации: поменять ссылку «browser extension» в настройках приложения
  (SettingsContent.tsx) с лендинга на страницу стора + добавить бейдж
  «Available in Chrome Web Store» на лендинг.
