from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOCK_MOBILE_REDESIGN_V2'
if MARKER in s:
    print('Mock mobile redesign already applied.')
    raise SystemExit(0)

addon = r'''
<style id="mathlvl-mock-mobile-redesign-v2">
/* MATHLVL_MOCK_MOBILE_REDESIGN_V2 */
@media (max-width:600px){
  #panel-mocktest{margin-top:0!important;padding-bottom:20px}

  /* Mobile should feel like an app screen, not a compressed desktop landing page. */
  #panel-mocktest .mock-modern-hero{
    display:block!important;
    padding:14px 14px 13px!important;
    margin:0 0 12px!important;
    border-radius:15px!important;
    background:linear-gradient(145deg,rgba(14,25,53,.96),rgba(9,17,37,.96))!important;
    box-shadow:none!important;
    border:1px solid rgba(112,136,255,.14)!important;
  }
  #panel-mocktest .mock-modern-hero:before,
  #panel-mocktest .mock-modern-hero:after{display:none!important}
  #panel-mocktest .mock-modern-eyebrow{font-size:9px!important;margin-bottom:7px!important;letter-spacing:.11em!important}
  #panel-mocktest .mock-modern-title{
    font-size:21px!important;
    line-height:1.13!important;
    letter-spacing:-.035em!important;
    margin:0 0 7px!important;
  }
  #panel-mocktest .mock-modern-sub{
    font-size:11.5px!important;
    line-height:1.5!important;
    margin:0!important;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden;
  }
  #panel-mocktest .mock-modern-pills{display:none!important}
  #panel-mocktest .mock-modern-actions{margin-top:10px!important}
  #panel-mocktest #mocktest-results-btn{
    width:100%!important;
    min-height:38px!important;
    padding:8px 11px!important;
    border-radius:10px!important;
    font-size:11.5px!important;
  }

  /* Compact stats: one row, no tall cards. */
  #panel-mocktest .mock-modern-stats{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:7px!important;
    margin-top:11px!important;
  }
  #panel-mocktest .mock-modern-stat,
  #panel-mocktest .mock-modern-stat.primary{
    grid-column:auto!important;
    display:block!important;
    min-height:0!important;
    padding:9px 8px!important;
    border-radius:11px!important;
    background:rgba(255,255,255,.025)!important;
    border:1px solid rgba(118,140,255,.10)!important;
  }
  #panel-mocktest .mock-modern-stat-label{
    font-size:7.5px!important;
    letter-spacing:.045em!important;
    margin:0 0 4px!important;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  #panel-mocktest .mock-modern-stat-value{
    font-size:15px!important;
    line-height:1.08!important;
    letter-spacing:-.025em!important;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  #panel-mocktest .mock-modern-stat-sub{font-size:7.5px!important;margin-top:3px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #panel-mocktest .mock-modern-ring{display:none!important}

  /* Small segmented filter. */
  #panel-mocktest .mocktest-filter-row{
    display:flex!important;
    gap:6px!important;
    margin:8px 0 10px!important;
    overflow-x:auto;
    scrollbar-width:none;
    padding-bottom:1px;
  }
  #panel-mocktest .mocktest-filter-row::-webkit-scrollbar{display:none}
  #panel-mocktest .mt-filter-btn{
    flex:none!important;
    padding:7px 11px!important;
    min-height:34px!important;
    border-radius:9px!important;
    font-size:10.5px!important;
    white-space:nowrap!important;
  }

  /* Mock cards: compact app-list cards. */
  #panel-mocktest .mocktest-list{gap:9px!important}
  #panel-mocktest .mt-card{
    display:grid!important;
    grid-template-columns:40px minmax(0,1fr)!important;
    gap:10px!important;
    padding:12px!important;
    border-radius:14px!important;
    box-shadow:none!important;
    align-items:start!important;
  }
  #panel-mocktest .mt-card:hover{transform:none!important;box-shadow:none!important}
  #panel-mocktest .mt-card:before{width:2px!important}
  #panel-mocktest .mt-card-icon{
    width:40px!important;
    height:40px!important;
    border-radius:11px!important;
    font-size:18px!important;
  }
  #panel-mocktest .mt-card-body{min-width:0!important;padding:0!important}
  #panel-mocktest .mock-status-row{gap:5px!important;margin:0 0 5px!important}
  #panel-mocktest .mock-status-badge{padding:4px 6px!important;font-size:7.5px!important;letter-spacing:.045em!important}
  #panel-mocktest .mock-best-score{font-size:8.5px!important}
  #panel-mocktest .mt-card-title{
    font-size:13px!important;
    line-height:1.28!important;
    margin-bottom:4px!important;
  }
  #panel-mocktest .mt-card-meta{
    font-size:9.5px!important;
    line-height:1.35!important;
    margin-bottom:3px!important;
  }
  #panel-mocktest .mt-card-result{
    font-size:9.5px!important;
    line-height:1.35!important;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden;
  }
  #panel-mocktest .mock-modern-progress{grid-column:1/-1!important;margin:8px 0 0!important;max-width:none!important}
  #panel-mocktest .mock-modern-progress-head{font-size:8.5px!important;margin-bottom:4px!important}
  #panel-mocktest .mock-modern-progress-track{height:4px!important}
  #panel-mocktest .mt-card-start{
    grid-column:1/-1!important;
    width:100%!important;
    min-width:0!important;
    margin-top:2px!important;
    padding:9px 11px!important;
    min-height:38px!important;
    border-radius:10px!important;
    font-size:11px!important;
  }

  /* In-test screen also stays compact on phones. */
  #panel-mocktest .mock-modern-run{padding:14px!important;border-radius:15px!important;box-shadow:none!important}
  #panel-mocktest #mock-question-text{font-size:15px!important;line-height:1.55!important;padding:9px 0 4px!important}
  #panel-mocktest #mock-clock{font-size:10.5px!important;padding:7px 8px!important}
  #panel-mocktest #mock-answer-area .ghost-btn{padding:10px 11px!important;border-radius:10px!important;font-size:12px!important}
  #panel-mocktest #mock-nav-grid{padding:9px!important;border-radius:11px!important}
  #panel-mocktest #mock-nav-grid .ghost-btn{width:31px!important;min-width:31px!important;height:31px!important;border-radius:8px!important;font-size:10px!important}

  #panel-mocktest .mock-modern-result,
  #panel-mocktest .mock-history-modern{padding:15px!important;border-radius:15px!important;box-shadow:none!important}
}

@media (max-width:390px){
  #panel-mocktest .mock-modern-title{font-size:20px!important}
  #panel-mocktest .mock-modern-stat{padding:8px 6px!important}
  #panel-mocktest .mock-modern-stat-value{font-size:14px!important}
}

@media (max-width:600px){
  html[data-theme="light"] #panel-mocktest .mock-modern-hero{
    background:#fff!important;
    border-color:rgba(45,73,132,.10)!important;
  }
  html[data-theme="light"] #panel-mocktest .mock-modern-stat{
    background:#f7f9fd!important;
    border-color:rgba(45,73,132,.08)!important;
  }
}
</style>
'''

if '</body>' not in s:
    raise SystemExit('closing body not found')
s = s.replace('</body>', addon + '\n</body>', 1)

for token in [MARKER, 'grid-template-columns:repeat(3,minmax(0,1fr))', 'grid-template-columns:40px minmax(0,1fr)', '#panel-mocktest .mock-modern-pills{display:none!important}']:
    if token not in s:
        raise SystemExit(f'mock mobile redesign token missing: {token}')

p.write_text(s, encoding='utf-8')
print('Mock mobile layout redesigned: compact app-style UI.')
