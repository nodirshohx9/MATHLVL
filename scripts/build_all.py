import subprocess
import sys

STEPS = [
    'scripts/build_official_mock.py',
    'scripts/inject_auth_gate.py',
    'scripts/remove_apple_auth.py',
    'scripts/fix_solver_auth.py',
    'scripts/product_hardening.py',
    'scripts/final_cleanup.py',
    'scripts/finish_sync.py',
    'scripts/final_polish.py',
    'scripts/mock_history_sync.py',
    'scripts/telegram_support_link.py',
    'scripts/remove_support_inbox.py',
    'scripts/mobile_reader_ai_fix.py',
]

for step in STEPS:
    print(f'==> {step}', flush=True)
    subprocess.run([sys.executable, step], check=True)

print('MATHLVL production build tayyor.', flush=True)
