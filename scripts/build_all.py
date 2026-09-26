import subprocess
import sys
from pathlib import Path
from html.parser import HTMLParser
from tempfile import TemporaryDirectory

# Source assets are canonical. Historical migration scripts are never run at build time.
for path in sorted(Path('assets').rglob('*.js')) + sorted(Path('api').glob('*.js')) + sorted(Path('lib').glob('*.js')):
    subprocess.run(['node', '--check', str(path)], check=True)

html = Path('index.html').read_text(encoding='utf-8')
reader_source = html + '\n'.join(p.read_text() for p in Path('assets/app').glob('*.js'))
required_reader_functions = (
    'function setupPageObserver()',
    'function updateCurrentVisiblePage()',
    'function getPageRenderState(',
    'function renderPageInto(',
)
missing = [name for name in required_reader_functions if name not in reader_source]
if missing:
    raise SystemExit(f'PDF reader build is incomplete: {missing}')

class InlineScripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.in_script = False

    def handle_starttag(self, tag, attrs):
        if tag == 'script' and not dict(attrs).get('src'):
            self.in_script = True
            self.scripts.append('')

    def handle_endtag(self, tag):
        if tag == 'script':
            self.in_script = False

    def handle_data(self, data):
        if self.in_script:
            self.scripts[-1] += data

parser = InlineScripts()
parser.feed(html)
with TemporaryDirectory() as directory:
    script_file = Path(directory) / 'inline.js'
    for number, script in enumerate(parser.scripts):
        script_file.write_text(script, encoding='utf-8')
        result = subprocess.run(['node', '--check', str(script_file)], capture_output=True, text=True)
        if result.returncode:
            raise SystemExit(f'Inline script {number} syntax error:\n{result.stderr}')

print('MATHLVL production build tayyor.', flush=True)


# Referenced local assets must exist before deployment.
import re
for page in ['index.html','admin.html']:
    source = Path(page).read_text()
    for asset in re.findall(r'(?:src|href)=["\'](/assets/[^"\']+)', source):
        if not Path(asset.split('?')[0].lstrip('/')).is_file():
            raise SystemExit(f'Missing asset: {asset}')
subprocess.run(['node', '--test', 'tests/chat.test.mjs'], check=True)

# Branding assets are referenced outside /assets/ as well.
logo = Path('mathlvl-logo.png')
if not logo.is_file() or logo.read_bytes()[:8] != b'\x89PNG\r\n\x1a\n':
    raise SystemExit('Missing or invalid mathlvl-logo.png')
