import subprocess
import sys
from pathlib import Path
from html.parser import HTMLParser
from tempfile import TemporaryDirectory

STEPS = [
    'scripts/build_official_mock.py',
    'scripts/inject_auth_gate.py',
    'scripts/remove_apple_auth.py',
    'scripts/fix_solver_auth.py',
    'scripts/title_build_compat.py',
    'scripts/product_hardening.py',
    'scripts/final_cleanup.py',
    'scripts/finish_sync.py',
    'scripts/final_polish.py',
    'scripts/mock_history_sync.py',
    'scripts/telegram_support_link.py',
    'scripts/remove_support_inbox.py',
    'scripts/mobile_reader_ai_fix.py',
    'scripts/mock_modern_ui.py',
    'scripts/mobile_sidebar_nav.py',
    'scripts/mobile_sidebar_nav_polish.py',
    'scripts/mobile_sidebar_label_cleanup.py',
    'scripts/gift_qr_cleanup.py',
    'scripts/mock_pdf_admin.py',
    'scripts/title_finalize.py',
    'scripts/light_mode_contrast_fix.py',
    'scripts/mock_mobile_redesign.py',
    'scripts/mock_pdf_media_fix.py',
    'scripts/mock_pdf_formula_fidelity.py',
    'scripts/mock_pdf_resilience.py',
    'scripts/mock_answer_key_grid_fix.py',
    'scripts/mock_learning_review.py',
    'scripts/mock_selection_visibility.py',
    'scripts/mock_math_keyboard_toggle_fix.py',
    'scripts/mobile_reader_scroll_fix.py',
    'scripts/mobile_reader_scroll_performance.py',
    'scripts/library_restore_and_admin_upload.py',
    'scripts/fix_reader_observer_runtime.py',
]

for step in STEPS:
    print(f'==> {step}', flush=True)
    subprocess.run([sys.executable, step], check=True)

html = Path('index.html').read_text(encoding='utf-8')
required_reader_functions = (
    'function setupPageObserver()',
    'function updateCurrentVisiblePage()',
    'function getPageRenderState(',
    'function renderPageInto(',
)
missing = [name for name in required_reader_functions if name not in html]
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
