from pathlib import Path

index = Path('index.html')
s = index.read_text(encoding='utf-8')

# Add a solver-specific message to the injected auth gate.
message_anchor = "    book: ['O‘qishni boshlash uchun kiring', 'Oxirgi o‘qilgan sahifa va kitob progressi saqlanishi uchun kiring yoki ro‘yxatdan o‘ting.'],\n    plus:"
message_replacement = "    book: ['O‘qishni boshlash uchun kiring', 'Oxirgi o‘qilgan sahifa va kitob progressi saqlanishi uchun kiring yoki ro‘yxatdan o‘ting.'],\n    solve: ['Masalani yechish uchun kiring', 'Yechimni olish va progressni saqlash uchun Google orqali kiring yoki ro‘yxatdan o‘ting.'],\n    plus:"
if message_anchor not in s:
    raise SystemExit('Auth message anchor not found')
s = s.replace(message_anchor, message_replacement, 1)

# Intercept the homepage solver before its normal click handler can call the AI API.
click_anchor = "    const teacherNav = target.matches('[data-sidebar-tab=\"teacher\"],[data-tab=\"teacher\"],#dash-quick-teacher') || !!target.closest('#dash-quick-teacher');"
click_replacement = """    const solveAction = target.id === 'solve-btn' || !!target.closest('#solve-btn');
    if(solveAction){
      event.preventDefault(); event.stopImmediatePropagation();
      openGate('solve','home');
      return;
    }

    const teacherNav = target.matches('[data-sidebar-tab=\"teacher\"],[data-tab=\"teacher\"],#dash-quick-teacher') || !!target.closest('#dash-quick-teacher');"""
if click_anchor not in s:
    raise SystemExit('Auth click anchor not found')
s = s.replace(click_anchor, click_replacement, 1)

index.write_text(s, encoding='utf-8')
print('Protected homepage solver with MATHLVL auth gate')
