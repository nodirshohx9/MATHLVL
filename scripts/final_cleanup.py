from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Dead legacy overlay: the real Milliy sertifikat mock is already available.
start_marker = '  <!-- ===== TEST TEZ ORADA'
profile_marker = '  <section class="panel" id="panel-profile">'
start = s.find(start_marker)
if start >= 0:
    end = s.find(profile_marker, start)
    if end < 0:
        raise SystemExit('Profile marker not found after stale mock overlay')
    s = s[:start] + s[end:]

replacements = {
    'Test davomida javoblar avtomatik saqlanishi kerak.':
        'Natija test yakunida ushbu qurilmada saqlanadi.',
    'Yakunlangandan keyin natija va xatolar tahlili ko‘rsatiladi.':
        'MATHLVL Plus bilan testdan keyin Ustoz AI xatolaringizni tahlil qiladi.',
    'Ustoz AI uchun yuqoriroq limit':
        'Mock testdan keyingi Ustoz AI tahlili',
    'Barcha mavjud Milliy sertifikat mock testlari':
        'Plus talab qiladigan premium materiallar',
    '✓ Kitob ichidagi Ustoz AI':
        '✓ Plus kitoblarni o‘qish',
    '✓ Kengaytirilgan AI imkoniyatlari':
        '✓ Mock testdan keyingi Ustoz AI tahlili',
}
for old, new in replacements.items():
    s = s.replace(old, new)

for forbidden in (
    'mocktest-soon-overlay',
    'Test davomida javoblar avtomatik saqlanishi kerak.',
    'Ustoz AI uchun yuqoriroq limit',
    'Barcha mavjud Milliy sertifikat mock testlari',
):
    if forbidden in s:
        raise SystemExit(f'Stale production copy remains: {forbidden}')

required = (
    'Natija test yakunida ushbu qurilmada saqlanadi.',
    'MATHLVL Plus bilan testdan keyin Ustoz AI xatolaringizni tahlil qiladi.',
    'Mock testdan keyingi Ustoz AI tahlili',
)
for token in required:
    if token not in s:
        raise SystemExit(f'Expected production copy missing: {token}')

p.write_text(s, encoding='utf-8')
print('Cleaned stale mock overlay and aligned Help/Plus copy with production behavior')
