from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

TITLE = 'MATHLVL — MATEMATIKA PLATFORMASI'

s, n = re.subn(r'<title>[^<]*</title>', f'<title>{TITLE}</title>', s, count=1, flags=re.IGNORECASE)
if n != 1:
    raise SystemExit('HTML title not found')

s = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{TITLE}">', s, count=1, flags=re.IGNORECASE)
s = re.sub(r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{TITLE}">', s, count=1, flags=re.IGNORECASE)

p.write_text(s, encoding='utf-8')
print('Public title finalized: MATHLVL — MATEMATIKA PLATFORMASI')
