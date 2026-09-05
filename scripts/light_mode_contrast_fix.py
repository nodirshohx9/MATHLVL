from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_LIGHT_MODE_CONTRAST_V1'
if MARKER in s:
    raise SystemExit(0)

addon = r'''
<style id="mathlvl-light-mode-contrast-v1">
/* MATHLVL_LIGHT_MODE_CONTRAST_V1 */
html[data-theme="light"]{
  --space-1:#f5f7fb;
  --space-2:#eef3f9;
  --space-3:#ffffff;
  --panel:rgba(255,255,255,.92);
  --panel-solid:#ffffff;
  --border:rgba(32,55,92,.14);
  --border-soft:rgba(32,55,92,.09);
  --text:#14213d;
  --text-dim:#5f6d85;
  --blue:#315fe8;
  --blue-soft:rgba(49,95,232,.11);
  --gold:#b97900;
  --gold-soft:rgba(185,121,0,.10);
}
html[data-theme="light"] body{
  color:var(--text)!important;
  background:
    radial-gradient(ellipse at 15% 0%,rgba(49,95,232,.08),transparent 42%),
    radial-gradient(ellipse at 85% 15%,rgba(245,180,54,.07),transparent 38%),
    linear-gradient(180deg,#f8faff 0%,#eef3f9 45%,#f8faff 100%)!important;
}
html[data-theme="light"] .stars span{background:#7890ba!important;opacity:.22!important}
html[data-theme="light"] .floater{opacity:.08!important}

/* Main surfaces */
html[data-theme="light"] .glass-card,
html[data-theme="light"] .dash-quick-card,
html[data-theme="light"] .mt-card,
html[data-theme="light"] .book-card,
html[data-theme="light"] .profile-section-card,
html[data-theme="light"] .mock-modern-card,
html[data-theme="light"] .mock-question-card,
html[data-theme="light"] .result-card,
html[data-theme="light"] .plan-card{
  background:rgba(255,255,255,.94)!important;
  border-color:rgba(32,55,92,.13)!important;
  color:#14213d!important;
  box-shadow:0 10px 32px rgba(42,66,108,.07)!important;
}
html[data-theme="light"] .glass-card:hover,
html[data-theme="light"] .dash-quick-card:hover,
html[data-theme="light"] .mt-card:hover,
html[data-theme="light"] .book-card:hover{
  border-color:rgba(49,95,232,.34)!important;
}

/* Primary/secondary typography */
html[data-theme="light"] .dash-title,
html[data-theme="light"] .dash-continue-title,
html[data-theme="light"] .dash-quick-title,
html[data-theme="light"] .dqc-title,
html[data-theme="light"] .mt-card-title,
html[data-theme="light"] .sec-title,
html[data-theme="light"] .profile-name,
html[data-theme="light"] .book-title,
html[data-theme="light"] h1,
html[data-theme="light"] h2,
html[data-theme="light"] h3,
html[data-theme="light"] h4{
  color:#14213d!important;
}
html[data-theme="light"] .dash-sub,
html[data-theme="light"] .dqc-sub,
html[data-theme="light"] .mt-card-meta,
html[data-theme="light"] .mt-card-result,
html[data-theme="light"] .sec-sub,
html[data-theme="light"] .book-meta,
html[data-theme="light"] .sidebar-footer-text .sft-plan,
html[data-theme="light"] .status,
html[data-theme="light"] small,
html[data-theme="light"] .muted{
  color:#5d6b83!important;
}

/* Forms */
html[data-theme="light"] textarea,
html[data-theme="light"] input[type="text"],
html[data-theme="light"] input[type="number"],
html[data-theme="light"] input[type="email"],
html[data-theme="light"] input[type="search"],
html[data-theme="light"] select{
  background:#ffffff!important;
  color:#15233f!important;
  border-color:rgba(32,55,92,.18)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.8)!important;
}
html[data-theme="light"] textarea::placeholder,
html[data-theme="light"] input::placeholder{color:#8995a9!important;opacity:1!important}
html[data-theme="light"] label{color:#586780!important}

/* Neutral buttons: keep colored CTA buttons untouched */
html[data-theme="light"] .ghost-btn,
html[data-theme="light"] .mt-filter-btn,
html[data-theme="light"] .back-link,
html[data-theme="light"] .settings-row{
  color:#253754!important;
  border-color:rgba(32,55,92,.16)!important;
}
html[data-theme="light"] .ghost-btn,
html[data-theme="light"] .mt-filter-btn{
  background:#ffffff!important;
}
html[data-theme="light"] .ghost-btn:hover,
html[data-theme="light"] .mt-filter-btn:hover{
  background:#f0f4ff!important;
  border-color:rgba(49,95,232,.34)!important;
  color:#244fcf!important;
}
html[data-theme="light"] .mt-filter-btn.active{
  background:#315fe8!important;
  border-color:#315fe8!important;
  color:#ffffff!important;
}
html[data-theme="light"] .glow-btn{color:#ffffff!important}

/* Desktop/mobile navigation */
html[data-theme="light"] .app-sidebar{
  background:#ffffff!important;
  border-right-color:rgba(32,55,92,.11)!important;
}
html[data-theme="light"] .app-sidebar .sidebar-logo span{color:#14213d!important}
html[data-theme="light"] .sidebar-nav-item{color:#65728a!important}
html[data-theme="light"] .sidebar-nav-item:hover{background:#f4f6fb!important;color:#1d2e4b!important}
html[data-theme="light"] .sidebar-nav-item.active{
  background:rgba(49,95,232,.11)!important;
  color:#244fcf!important;
}
html[data-theme="light"] .sidebar-profile-trigger{
  background:#f8faff!important;
  color:#14213d!important;
  border-color:rgba(32,55,92,.12)!important;
}
html[data-theme="light"] .sidebar-footer-text .sft-name{color:#14213d!important}
html[data-theme="light"] .sidebar-profile-menu{
  background:#ffffff!important;
  border-color:rgba(32,55,92,.13)!important;
  box-shadow:0 20px 55px rgba(42,66,108,.17)!important;
}
html[data-theme="light"] .sidebar-profile-action{color:#4d5e78!important}
html[data-theme="light"] .sidebar-profile-action:hover{background:#f1f5ff!important;color:#244fcf!important}
html[data-theme="light"] .mathlvl-mobile-topbar{
  background:rgba(255,255,255,.95)!important;
  border-bottom-color:rgba(32,55,92,.10)!important;
  box-shadow:0 8px 24px rgba(42,66,108,.08)!important;
}
html[data-theme="light"] .mathlvl-mobile-menu-btn{
  background:#f7f9fd!important;
  color:#243653!important;
  border-color:rgba(32,55,92,.13)!important;
}
html[data-theme="light"] .mathlvl-mobile-brand span{color:#14213d!important}

/* Mock/result readable states */
html[data-theme="light"] .mock-modern-hero,
html[data-theme="light"] .mock-hub-hero{
  color:#14213d!important;
  border-color:rgba(49,95,232,.15)!important;
}
html[data-theme="light"] .mock-question-number,
html[data-theme="light"] .mock-question-text,
html[data-theme="light"] .mock-result-title,
html[data-theme="light"] .mock-history-title{color:#14213d!important}
html[data-theme="light"] .mock-option{
  background:#ffffff!important;
  color:#263957!important;
  border-color:rgba(32,55,92,.15)!important;
}
html[data-theme="light"] .mock-option:hover{background:#f3f6ff!important;border-color:rgba(49,95,232,.32)!important}
html[data-theme="light"] .mock-option.selected{background:rgba(49,95,232,.10)!important;color:#244fcf!important;border-color:#315fe8!important}

/* Reader / AI surfaces */
html[data-theme="light"] .teacher-chat,
html[data-theme="light"] .ai-drawer,
html[data-theme="light"] .reader-ai-panel,
html[data-theme="light"] .chat-input-wrap{
  background:#ffffff!important;
  color:#14213d!important;
  border-color:rgba(32,55,92,.13)!important;
}
html[data-theme="light"] .msg.ai,
html[data-theme="light"] .chat-bubble.ai{background:#f2f5fa!important;color:#20314e!important}
html[data-theme="light"] .msg.user,
html[data-theme="light"] .chat-bubble.user{color:#ffffff!important}

/* Full-screen Plus/gift/payment overlays */
html[data-theme="light"] .fullscreen-overlay{background:#f5f7fb!important;color:#14213d!important}
html[data-theme="light"] .fullscreen-overlay-inner{color:#14213d!important}
html[data-theme="light"] #qr-scanner-view{background:#ffffff!important;border:1px solid rgba(32,55,92,.13)!important}

/* Inline dim text often uses var(--text-dim); strengthening the variable handles most cases. */
html[data-theme="light"] .footer-note{color:#68768d!important}

@media (max-width:899px){
  html[data-theme="light"] .app-sidebar{
    background:linear-gradient(180deg,#ffffff,#f7f9fd)!important;
    box-shadow:24px 0 70px rgba(42,66,108,.20)!important;
  }
}
</style>
'''

if '</body>' not in s:
    raise SystemExit('closing body not found')
s = s.replace('</body>', addon + '\n</body>', 1)

for token in [MARKER, '--text:#14213d', 'textarea::placeholder', '.mathlvl-mobile-topbar', '.mock-option.selected']:
    if token not in s:
        raise SystemExit(f'light mode token missing: {token}')

p.write_text(s, encoding='utf-8')
print('Light mode contrast and readability improved across MATHLVL.')
