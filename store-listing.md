# Chrome Web Store — материалы листинга (v0.2.0)

Всё, что нужно вставить в дашборд CWS. Тексты — EN (аудитория глобальная).
Загружаемый файл: `shainbox-clipper-0.2.0.zip`.

---

## Название и короткое описание — ЖИВУТ В МАНИФЕСТЕ

CWS берёт Title и Summary из manifest.json внутри zip — в дашборде они
не редактируются. Уже прошито в 0.2.0-zip:

- name: **Diivo Clipper — Save Design References**
- description: **Hover any image, GIF or video and save it straight to your
  local Diivo library. One click, no cloud, no accounts.**

Менять текст → менять manifest.json → пересобирать zip → загружать новый пакет.

## Полное описание

```
Collect design references without breaking your flow.

Diivo Clipper adds a small save button that appears when you hover any
image on any website — Dribbble, Behance, Pinterest, X, anywhere. One click
sends the file straight into Diivo, a local-first library for design
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
Your files never touch our servers — the extension talks only to the Diivo
app running on YOUR computer (via a local pairing token). No accounts, no
cloud, no tracking, no analytics inside the extension.

NEEDS THE FREE SHAINBOX APP
This extension is a companion to Diivo for macOS and Windows.
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

## Вкладка Privacy — ПО ПОЛЯМ ФОРМЫ (как в дашборде)

**Single purpose description:**
```
Save images and videos from web pages into the user's local Diivo desktop application.
```

**storage justification:**
```
Stores the extension's local settings only: the pairing token that links the extension to the user's own Diivo desktop app, the last-used board, per-site on/off preferences, and a temporary queue of clips waiting to be delivered while the desktop app is offline. Nothing is transmitted anywhere beyond the user's own machine.
```

**alarms justification:**
```
A periodic alarm retries delivery of queued clips to the Diivo desktop app on the user's own machine (127.0.0.1). If the app was closed when the user saved an image, the queue is flushed automatically once the app is running again.
```

**Host permission justification:**
```
The extension's single purpose is saving images and videos the user hovers over on any website into their local Diivo library, so the content script must run on all sites (<all_urls>) — we cannot know in advance where a designer collects references. The 127.0.0.1 / localhost permissions are used solely to deliver saved files to the Diivo desktop application running on the user's own computer. No page content is read or transmitted anywhere else; the extension contains no analytics and communicates with no remote servers.
```

**Are you using remote code?** → **No, I am not using remote code**
(весь JS внутри пакета, нет eval и внешних скриптов — «Yes» было бы неправдой
и утащило бы в углублённое ревью).

**Data usage:** НЕ отмечать ни один тип данных (мы ничего не собираем).
Сертификационные чекбоксы в конце секции — отметить.

**Privacy policy URL:** https://shain.one/shainbox/privacy.html

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
