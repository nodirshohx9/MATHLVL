/* All untrusted Markdown goes through this boundary before entering the DOM. */
function safeMarkdown(text) {
  const raw = String(text || '');
  if (!window.DOMPurify || !window.marked) {
    const el = document.createElement('div');
    el.textContent = raw;
    return el.innerHTML;
  }
  return DOMPurify.sanitize(marked.parse(raw), {
    ALLOWED_TAGS: ['p','br','strong','em','b','i','code','pre','ul','ol','li','blockquote','h2','h3','h4','table','thead','tbody','tr','th','td','hr'],
    ALLOWED_ATTR: []
  });
}
