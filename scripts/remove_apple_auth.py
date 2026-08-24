from pathlib import Path
import re

index = Path('index.html')
s = index.read_text(encoding='utf-8')

# Remove Apple buttons from both the original Profile UI and the injected auth gate.
button_patterns = [
    r'\s*<button\b(?=[^>]*\bid=["\']apple-btn["\'])[^>]*>.*?</button>\s*',
    r'\s*<button\b(?=[^>]*\bid=["\']mathlvl-auth-apple["\'])[^>]*>.*?</button>\s*',
]
for pattern in button_patterns:
    s = re.sub(pattern, '\n', s, flags=re.IGNORECASE | re.DOTALL)

# Remove Apple-only styles from the injected gate.
s = re.sub(r'\n\s*\.mathlvl-auth-apple\s*\{.*?\}\s*', '\n', s, flags=re.DOTALL)
s = re.sub(r'\n\s*\.mathlvl-auth-apple\s+svg\s*\{.*?\}\s*', '\n', s, flags=re.DOTALL)

# Remove Apple click handlers / helper function, whether placeholder or OAuth-enabled.
s = re.sub(
    r"\s*document\.getElementById\(['\"]apple-btn['\"]\)\.addEventListener\(['\"]click['\"],\s*\(\)\s*=>\s*\{.*?\}\);\s*",
    '\n',
    s,
    flags=re.DOTALL,
)
s = re.sub(
    r"\s*document\.getElementById\(['\"]mathlvl-auth-apple['\"]\)\.addEventListener\(['\"]click['\"],\s*goApple\);\s*",
    '\n',
    s,
)
s = re.sub(r'\n\s*function\s+goApple\s*\(\)\s*\{.*?\}\s*', '\n', s, flags=re.DOTALL)

# Google is the only enabled provider for now.
replacements = {
    'Google yoki Apple orqali kiring': 'Google orqali kiring',
    'Google yoki Apple orqali davom eting': 'Google orqali davom eting',
    'Google yoki Apple orqali birinchi kirishda': 'Google orqali birinchi kirishda',
    'Google yoki Apple': 'Google',
    'Google va Apple': 'Google',
}
for old, new in replacements.items():
    s = s.replace(old, new)

# Guard against accidentally shipping a dead Apple OAuth entry point.
for forbidden in ('/api/auth-apple-start', 'mathlvl-auth-apple', "id=\"apple-btn\""):
    if forbidden in s:
        raise SystemExit(f'Apple auth cleanup failed: {forbidden} still present')

index.write_text(s, encoding='utf-8')
print('Removed Apple sign-in from MATHLVL production output')
