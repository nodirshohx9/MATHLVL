export function validateChat(body) {
  if (!body || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 20) return 'Suhbat 1–20 ta xabardan iborat bo‘lishi kerak.';
  if (body.system != null && (typeof body.system !== 'string' || body.system.length > 16000)) return 'Kontekst juda uzun.';
  let total = 0, images = 0;
  for (const m of body.messages) {
    if (!m || !['user','assistant'].includes(m.role)) return 'Xabar turi noto‘g‘ri.';
    const blocks = typeof m.content === 'string' ? [{type:'text', text:m.content}] : m.content;
    if (!Array.isArray(blocks) || !blocks.length || blocks.length > 4) return 'Xabar noto‘g‘ri.';
    for (const b of blocks) {
      if (b?.type === 'text') {
        if (typeof b.text !== 'string' || b.text.length > 12000) return 'Bitta xabar 12 000 belgidan oshmasin.';
        total += b.text.length;
      } else if (b?.type === 'image') {
        const src = b.source;
        if (++images > 2 || !src || !['image/jpeg','image/png','image/webp'].includes(src.media_type) || typeof src.data !== 'string' || src.data.length > 2800000 || !/^[A-Za-z0-9+/=]+$/.test(src.data)) return 'Rasm hajmi yoki formati mos emas.';
      } else return 'Xabar tarkibi noto‘g‘ri.';
    }
  }
  if (total > 60000) return 'Suhbat juda uzun. Yangi suhbat boshlang.';
  return null;
}
export function outputLimit(value, solve = false) {
  const parsed = Number(value);
  const fallback = solve ? 6000 : 1500;
  return Math.max(solve ? 4000 : 256, Math.min(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback, solve ? 8000 : 2500));
}
