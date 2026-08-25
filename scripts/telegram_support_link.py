from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

s = s.replace(
    '<b>Muammo bormi?</b>\n          <span>Bizga xabar bering, tez orada yordam beramiz.</span>',
    '<b>Biz bilan bog‘lanish</b>\n          <span>Telegram orqali @mathlvl_admin ga yozing.</span>'
)
s = s.replace(
    '<button type="button" id="help-report-btn">Xabar berish</button>',
    '<button type="button" id="help-report-btn">Telegramda yozish</button>'
)
s = s.replace(
    "if(typeof window.openMathlvlSupport === 'function') window.openMathlvlSupport();",
    "window.open('https://t.me/mathlvl_admin','_blank','noopener,noreferrer');"
)

required = (
    'Biz bilan bog‘lanish',
    '@mathlvl_admin',
    'Telegramda yozish',
    'https://t.me/mathlvl_admin',
)
for token in required:
    if token not in s:
        raise SystemExit(f'Telegram support link missing: {token}')

p.write_text(s, encoding='utf-8')
