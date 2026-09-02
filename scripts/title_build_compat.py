from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# product_hardening.py historically expects this exact title only when SEO
# metadata has not been injected yet. Normalize just for that build step.
if '<meta name="description"' not in s:
    s, count = re.subn(
        r'<title>[^<]*</title>',
        '<title>MATHLVL — matematika koinoti</title>',
        s,
        count=1,
        flags=re.IGNORECASE,
    )
    if count != 1:
        raise SystemExit('HTML title not found')
    p.write_text(s, encoding='utf-8')

print('Title normalized for legacy SEO build step.')
