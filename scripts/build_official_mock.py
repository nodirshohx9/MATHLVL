from pathlib import Path
import runpy

patch = Path('scripts/replace_mock_official.py')
text = patch.read_text(encoding='utf-8')
old = "new_text, count = pattern.subn(replacement, text, count=1)"
new = "new_text, count = pattern.subn(lambda _m: replacement, text, count=1)"
if old in text:
    patch.write_text(text.replace(old, new, 1), encoding='utf-8')

runpy.run_path(str(patch), run_name='__main__')

# The legacy mock block used to leave a duplicate tail after the new official block.
# Keep only the official block up to its first renderMockTestList() call, then close
# the current script. Separate scripts later in index.html remain untouched.
index = Path('index.html')
s = index.read_text(encoding='utf-8')
marker = '// ================= MILLIY SERTIFIKAT MOCK TEST ================='
start = s.find(marker)
if start < 0:
    raise SystemExit('Official mock marker not found')
end_token = 'renderMockTestList();'
good_end = s.find(end_token, start)
if good_end < 0:
    raise SystemExit('Official mock end token not found')
good_end += len(end_token)
script_end = s.find('</script>', good_end)
if script_end < 0:
    raise SystemExit('Main script closing tag not found')

s = s[:good_end] + '\n\n' + s[script_end:]

# Build-time safety checks: legacy simple-mock state must be gone.
legacy_tokens = [
    'activeMock.questions',
    'mockAnswers.filter',
]
for token in legacy_tokens:
    if token in s[good_end:script_end]:
        raise SystemExit(f'Legacy mock code still present: {token}')

index.write_text(s, encoding='utf-8')
