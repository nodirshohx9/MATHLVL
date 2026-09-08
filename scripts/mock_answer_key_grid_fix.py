from pathlib import Path

p = Path('api/mocks.js')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOCK_ANSWER_KEY_GRID_V1'
if MARKER in s:
    raise SystemExit(0)

old = '''3) To‘g‘ri javob PDFdagi JAVOBLAR KALITI yoki aniq ko‘rsatilgan javobdan topilsa kiriting. Javob kaliti yo‘q yoki ishonchsiz bo‘lsa HECH QACHON o‘zingiz yechib/taxmin qilib to‘ldirmang: a=null yoki ans="" qoldiring, needsReview=true qiling va warningsga yozing.\n'''
new = '''3) To‘g‘ri javob PDFdagi JAVOBLAR KALITI yoki aniq ko‘rsatilgan javobdan topilsa kiriting. Javob kaliti yo‘q yoki ishonchsiz bo‘lsa HECH QACHON o‘zingiz yechib/taxmin qilib to‘ldirmang: a=null yoki ans="" qoldiring, needsReview=true qiling va warningsga yozing.\n3a) JAVOBLAR KALITI ixcham jadval bo‘lishi mumkin. Ayniqsa yuqorida 0,1,2,...,9 ustunlari va chapda 0,1,2,3 qatorlari bo‘lsa, savol raqamini o‘nlik qator + birlik ustun orqali map qiling: qator 0 / ustun 6 = 6-savol; qator 1 / ustun 0 = 10-savol; qator 3 / ustun 5 = 35-savol. 0-savol mavjud emas, uning katagini e’tiborsiz qoldiring.\n3b) Kalit jadvali topilganda 1 dan 35 gacha HAR BIR yopiq savolni ketma-ket tekshirib chiqing. Katakda A/B/C/D aniq ko‘rinsa mos ravishda a=0/1/2/3 yozing. Bitta katakni tasodifan tashlab ketmang. Jadvaldagi harf noaniq bo‘lsagina a=null qoldiring va aynan qaysi savol noaniq ekanini warningsga yozing.\n3c) Ochiq savollar kaliti alohida T/R, a, b jadvalida bo‘lishi mumkin. 36–45 savollar uchun a va b ustunlarini mos ravishda A/B qismlarining ans qiymatiga ko‘chiring; formulalarni LaTeXga sodiq o‘giring.\n// MATHLVL_MOCK_ANSWER_KEY_GRID_V1\n'''

if old not in s:
    raise SystemExit('answer key prompt anchor not found')

s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('Mock answer-key grid parsing prompt strengthened.')
