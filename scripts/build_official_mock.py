from pathlib import Path
import runpy

patch = Path('scripts/replace_mock_official.py')
text = patch.read_text(encoding='utf-8')
old = "new_text, count = pattern.subn(replacement, text, count=1)"
new = "new_text, count = pattern.subn(lambda _m: replacement, text, count=1)"
if old in text:
    patch.write_text(text.replace(old, new, 1), encoding='utf-8')
runpy.run_path(str(patch), run_name='__main__')
