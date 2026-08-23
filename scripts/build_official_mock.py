from pathlib import Path
import runpy

patch = Path('scripts/replace_mock_official.py')
text = patch.read_text(encoding='utf-8')
old = "new_text, count = pattern.subn(replacement, text, count=1)"
new = "new_text, count = pattern.subn(lambda _m: replacement, text, count=1)"
if old in text:
    patch.write_text(text.replace(old, new, 1), encoding='utf-8')

runpy.run_path(str(patch), run_name='__main__')

# Remove any leftover legacy mock tail, but keep the FULL official mock block.
# The official block has several renderMockTestList() calls, so anchor on the
# results handler near the end and keep the first render call after that marker.
index = Path('index.html')
s = index.read_text(encoding='utf-8')
marker = '// ================= MILLIY SERTIFIKAT MOCK TEST ================='
start = s.find(marker)
if start < 0:
    raise SystemExit('Official mock marker not found')

results_marker = "const mockResultsBtn = document.getElementById('mocktest-results-btn');"
results_pos = s.find(results_marker, start)
if results_pos < 0:
    raise SystemExit('Official mock results handler not found')

end_token = 'renderMockTestList();'
good_end = s.find(end_token, results_pos)
if good_end < 0:
    raise SystemExit('Final official render call not found')
good_end += len(end_token)

script_end = s.find('</script>', good_end)
if script_end < 0:
    raise SystemExit('Main script closing tag not found')

# Verify the complete official block is present BEFORE trimming anything.
official_block = s[start:good_end]
required = [
    'function finishMockTest(autoFinish)',
    results_marker,
    '35 ta yopiq + 10 ta ochiq',
    '55 ta javob elementi',
    'minutes:150',
]
for token in required:
    if token not in official_block:
        raise SystemExit(f'Official mock block incomplete: {token}')

s = s[:good_end] + '\n\n' + s[script_end:]

# Build-time safety checks: the old simple 10-question implementation must be gone.
post_marker = s[start:s.find('</script>', start)]
legacy_tokens = [
    'activeMock.questions',
    'mockAnswers.filter',
    "id:'ms1'",
    "minutes:90",
]
for token in legacy_tokens:
    if token in post_marker:
        raise SystemExit(f'Legacy mock code still present: {token}')

index.write_text(s, encoding='utf-8')
