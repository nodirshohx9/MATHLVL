// Legacy endpoint intentionally disabled. Never expose BLOB_READ_WRITE_TOKEN to browsers.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    error: "Bu eski endpoint o'chirilgan. Xavfsiz /api/upload ishlatiladi."
  });
}
