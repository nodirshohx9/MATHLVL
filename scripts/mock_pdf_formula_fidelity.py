from pathlib import Path

p = Path('api/mocks.js')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOCK_FORMULA_FIDELITY_V1'
if MARKER in s:
    raise SystemExit(0)

prompt_start = "  const prompt = `\nSiz MATHLVL admin import tizimisiz."
if prompt_start not in s:
    raise SystemExit('mock import prompt not found')
s = s.replace(
    prompt_start,
    "  // " + MARKER + "\n  const prompt = `\nSiz MATHLVL admin import tizimisiz.",
    1,
)

old_rule = "1) PDFdagi savol matnini va formulalarni mazmunini o‘zgartirmang. Matematik formulalarni LaTeX ($...$) ko‘rinishida yozing. Oddiy matnni LaTeX ichiga tiqmang."
new_rule = """1) PDFdagi savol matnini va formulalarni HECH NARSASINI o‘zgartirmang. Matematik formulalarni LaTeX ($...$) ko‘rinishida yozing. Oddiy matnni LaTeX ichiga tiqmang. FORMULA ANIQLIGI ENG MUHIM: kasr, daraja, indeks, modul, integral, logarifm va ayniqsa ILDIZ DARAJASINI PDFdagi ko‘rinish bilan aynan saqlang.\n1a) Oddiy kvadrat ildiz: √x → \\sqrt{x}. Kub ildiz: ∛x yoki ildiz belgisining chap yuqorisida kichik 3 bo‘lsa → \\sqrt[3]{x}. n-darajali ildiz → \\sqrt[n]{x}. HECH QACHON \\sqrt[3]{x} ni \\sqrt{x} ga aylantirmang. Masalan PDFdagi ∛7, ∛3, ∛49 lar mos ravishda $\\sqrt[3]{7}$, $\\sqrt[3]{3}$, $\\sqrt[3]{49}$ bo‘lishi shart.\n1b) Ildiz indekslari ko‘pincha juda kichik yoziladi. Har bir ildiz belgisining chap yuqori qismini alohida tekshiring. Formula JSONga yozilishidan oldin uni PDF bilan ikkinchi marta vizual solishtiring. Agar ildiz darajasi yoki boshqa kichik indeks noaniq bo‘lsa, taxmin qilmang: needsReview=true qiling va warningsga qaysi savolda formula tekshirilishi kerakligini yozing."""
if old_rule not in s:
    raise SystemExit('formula rule not found')
s = s.replace(old_rule, new_rule, 1)

old_config = """      maxOutputTokens: 24000,\n      responseMimeType: 'application/json',\n      thinkingConfig: { thinkingBudget: 0 }"""
new_config = """      maxOutputTokens: 24000,\n      responseMimeType: 'application/json',\n      temperature: 0.1,\n      thinkingConfig: { thinkingBudget: 1024 }"""
if old_config not in s:
    raise SystemExit('Gemini generation config not found')
s = s.replace(old_config, new_config, 1)

p.write_text(s, encoding='utf-8')
print('Mock PDF formula fidelity improved: indexed/cube roots preserved.')
