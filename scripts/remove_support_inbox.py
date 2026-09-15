from pathlib import Path

INDEX = Path('index.html')
ADMIN = Path('admin.html')

s = INDEX.read_text(encoding='utf-8')
a = ADMIN.read_text(encoding='utf-8')

# Public sahifadagi eski ichki support modalini olib tashlaymiz.
# Yordam markazi saqlanadi; bevosita aloqa Telegram @mathlvl_admin orqali ishlaydi.
start = s.find('<style>\n#mathlvl-support-overlay[hidden]')
if start != -1:
    marker = 'window.openMathlvlSupport = open;'
    marker_pos = s.find(marker, start)
    if marker_pos == -1:
        raise SystemExit('support modal script marker not found')
    end = s.find('</script>', marker_pos)
    if end == -1:
        raise SystemExit('support modal script end not found')
    s = s[:start] + s[end + len('</script>'):]

# Admin yon menyusidan eski "Xabarlar" tugmasini olib tashlaymiz.
a = a.replace('      <button class="nav-item" data-page="support"><span class="ic">💬</span>Xabarlar</button>\n', '')

support_start = a.find('      <!-- ============ SUPPORT ============ -->')
if support_start != -1:
    settings_start = a.find('      <!-- ============ SOZLAMALAR ============ -->', support_start)
    if settings_start == -1:
        raise SystemExit('settings section after support not found')
    a = a[:support_start] + a[settings_start:]

a = a.replace('      refreshSupportList();\n', '')

script_start = a.find('<script>\nasync function refreshSupportList(){')
if script_start != -1:
    script_end = a.find('</script>', script_start)
    if script_end == -1:
        raise SystemExit('admin support script end not found')
    a = a[:script_start] + a[script_end + len('</script>'):]

for required in ('@mathlvl_admin', 'Telegram admin', 'https://t.me/mathlvl_admin', 'nova-help-overlay'):
    if required not in s:
        raise SystemExit(f'Help/Telegram support missing after cleanup: {required}')

for forbidden in ('mathlvl-support-overlay', '/api/support', 'openMathlvlSupport'):
    if forbidden in s:
        raise SystemExit(f'public legacy support remains: {forbidden}')

for forbidden in ('data-page="support"', 'id="page-support"', '/api/support', 'refreshSupportList'):
    if forbidden in a:
        raise SystemExit(f'admin support remains: {forbidden}')

INDEX.write_text(s, encoding='utf-8')
ADMIN.write_text(a, encoding='utf-8')
