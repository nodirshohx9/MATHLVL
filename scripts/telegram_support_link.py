from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Normalize older Help contact copy to the current Telegram support card.
s = s.replace(
    '<b>Muammo bormi?</b>\n          <span>Bizga xabar bering, tez orada yordam beramiz.</span>',
    '<b>Biz bilan bog‘lanish</b>\n          <span>Savol yoki muammo bo‘lsa, Telegram administratorimizga yozing: <strong>@mathlvl_admin</strong></span>'
)
s = s.replace(
    '<button type="button" id="help-report-btn">Xabar berish</button>',
    '<button type="button" id="help-report-btn">Telegram admin</button>'
)
s = s.replace(
    '<button type="button" id="help-report-btn">Telegramda yozish</button>',
    '<button type="button" id="help-report-btn">Telegram admin</button>'
)
s = s.replace(
    "if(typeof window.openMathlvlSupport === 'function') window.openMathlvlSupport();",
    "window.open('https://t.me/mathlvl_admin','_blank','noopener,noreferrer');"
)
s = s.replace(
    'alert("Muammo haqida xabar berish formasi keyingi bosqichda Telegram/email yoki support API bilan ulanadi.");',
    "window.open('https://t.me/mathlvl_admin', '_blank', 'noopener,noreferrer');"
)

required = (
    'Biz bilan bog‘lanish',
    '@mathlvl_admin',
    'Telegram admin',
    'https://t.me/mathlvl_admin',
)
for token in required:
    if token not in s:
        raise SystemExit(f'Telegram support link missing: {token}')

p.write_text(s, encoding='utf-8')
