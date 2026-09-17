from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOCK_MATH_KEYBOARD_TOGGLE_FIX_V1'
if MARKER in s:
    print('Mock math keyboard toggle fix already applied.')
    raise SystemExit(0)

addon = r'''
<style id="mathlvl-mock-math-keyboard-toggle-fix">
/* MATHLVL_MOCK_MATH_KEYBOARD_TOGGLE_FIX_V1 */
.mathlvl-math-keyboard-panel[hidden]{
  display:none!important;
}
.mathlvl-math-keyboard-note{
  display:none!important;
}
.mathlvl-math-keyboard-toggle{
  position:relative;
  padding-right:42px!important;
  transition:background .16s ease,border-color .16s ease,color .16s ease;
}
.mathlvl-math-keyboard-toggle::after{
  content:'⌄';
  position:absolute;
  right:15px;
  top:50%;
  transform:translateY(-56%) rotate(0deg);
  color:currentColor;
  opacity:.62;
  font-size:15px;
  line-height:1;
  transition:transform .16s ease,opacity .16s ease;
}
.mathlvl-math-keyboard-toggle[aria-expanded="true"]{
  color:var(--text)!important;
  border-color:rgba(112,135,255,.32)!important;
  background:rgba(96,116,255,.055)!important;
}
.mathlvl-math-keyboard-toggle[aria-expanded="true"]::after{
  transform:translateY(-42%) rotate(180deg);
  opacity:.9;
}
html[data-theme="light"] .mathlvl-math-keyboard-toggle[aria-expanded="true"]{
  color:#33446d!important;
  border-color:rgba(84,101,219,.24)!important;
  background:rgba(91,110,230,.055)!important;
}
</style>

<script id="mathlvl-mock-math-keyboard-toggle-fix-runtime">
(function(){
  const root = document.getElementById('mocktest-list');
  if(!root) return;

  root.addEventListener('click', e=>{
    const toggle = e.target.closest('.mathlvl-math-keyboard-toggle');
    if(!toggle || !root.contains(toggle)) return;

    root.querySelectorAll('.mathlvl-math-keyboard').forEach(keyboard=>{
      if(keyboard.contains(toggle)) return;
      const otherPanel = keyboard.querySelector('.mathlvl-math-keyboard-panel');
      const otherToggle = keyboard.querySelector('.mathlvl-math-keyboard-toggle');
      if(otherPanel) otherPanel.hidden = true;
      if(otherToggle) otherToggle.setAttribute('aria-expanded','false');
    });
  }, true);
})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('Closing body tag not found')

s = s.replace('</body>', addon + '\n</body>', 1)
p.write_text(s, encoding='utf-8')
print('Mock math symbols now stay collapsed until requested.')
