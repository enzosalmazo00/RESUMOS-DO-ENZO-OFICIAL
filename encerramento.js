/* Comunicado informativo: não altera acessos, pagamentos ou autenticação. */
(() => {
  'use strict';
  if (window.rdeEncerramentoLoaded) return;
  window.rdeEncerramentoLoaded = true;
  const deadline = Date.parse('2026-12-31T00:00:00-03:00');
  const message = `<p>Sentimos informar que a plataforma <strong>Resumos do Enzo encerrará suas atividades a partir de 31 de dezembro de 2026.</strong></p>
    <p>Essa decisão foi tomada pela nossa equipe diante da baixa adesão às vendas e do grande trabalho necessário para produzir materiais de qualidade. Sempre buscamos manter um preço justo e acessível, com possibilidade de parcelamento, para atender ao maior número possível de estudantes.</p>
    <p>Infelizmente, as vendas não atingiram os valores mínimos necessários para cobrir a manutenção da plataforma e das ferramentas utilizadas na produção dos resumos e das aulas interativas, tornando inviável a continuidade do projeto.</p>
    <p>Agradecemos imensamente a todos que confiaram em nosso trabalho e fizeram parte dessa jornada. Cada pessoa que estudou conosco fez parte da nossa história.</p>
    <p><strong>Continuem firmes no processo! Desejamos muito sucesso nos estudos e na trajetória de cada um de vocês.</strong></p>
    <p>Um grande abraço,<br><strong>Equipe Resumos do Enzo</strong></p>`;
  function init() {
    const style = document.createElement('style');
    style.textContent = `
      .rde-notice{box-sizing:border-box;color:#f8fafc;background:linear-gradient(140deg,#102235,#08121f);border:1px solid #76869a;border-radius:20px;padding:26px;font-family:inherit;text-align:left;min-width:0}
      .rde-notice *{box-sizing:border-box}
      .rde-notice .rde-kicker{color:#f6d99a;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px}
      .rde-notice h2{font-size:clamp(23px,3vw,32px);line-height:1.2;letter-spacing:-.5px;margin:0 0 14px;color:#fff}
      .rde-notice p{font-size:13px;line-height:1.75;margin:0 0 13px;color:#d4deea}
      .rde-notice strong{color:#fff}
      .rde-countdown{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0 10px}
      .rde-countdown div{background:#07121e;border:1px solid #395066;border-radius:10px;padding:10px 3px;text-align:center}
      .rde-countdown b{display:block;font-size:27px;font-variant-numeric:tabular-nums;color:#f6d99a;line-height:1.2}
      .rde-countdown span{font-size:10px;color:#d4deea}
      .rde-notice .rde-date{font-size:11px;color:#bccbda;margin-bottom:18px}
      .rde-notice button,.rde-reopen{font-family:inherit;font-weight:600;font-size:13px;cursor:pointer;border:1px solid #7dd3fc;border-radius:10px;padding:12px 18px;background:#133c51;color:#fff;min-height:44px}
      .rde-notice button:focus-visible,.rde-reopen:focus-visible{outline:3px solid #f6d99a;outline-offset:3px}
      #rde-notice-dialog{position:fixed;inset:0;margin:auto;width:min(640px,calc(100% - 24px));max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;padding:26px}
      #rde-notice-dialog::backdrop{background:rgba(0,7,17,.8)}
      .rde-dialog-head{display:flex;align-items:flex-start;gap:16px;justify-content:space-between}
      .rde-notice .rde-close{flex:0 0 44px;padding:4px;font-size:24px;background:transparent;border-color:#597083}
      .rde-reopen{display:block;margin:16px auto;position:relative;z-index:10;max-width:calc(100% - 24px)}
      .rde-login-notice{margin-bottom:0}.hero:has(.rde-login-notice){align-items:start}
      @media(max-width:600px){.rde-notice{padding:20px}.rde-countdown b{font-size:24px}#rde-notice-dialog{padding:20px}}
    `;
    document.head.append(style);
    const timer = () => `<div class="rde-countdown" role="timer" aria-live="off" aria-label="Tempo até o encerramento">${['dias','horas','minutos','segundos'].map(label => `<div><b>00</b><span>${label}</span></div>`).join('')}</div><p class="rde-date">31/12/2026, às 00h • Horário de Brasília (UTC−3)</p>`;
    const dialog = document.createElement('dialog');
    dialog.id = 'rde-notice-dialog';
    dialog.className = 'rde-notice';
    dialog.setAttribute('aria-labelledby','rde-notice-title');
    dialog.innerHTML = `<div class="rde-dialog-head"><div><p class="rde-kicker">Comunicado importante</p><h2 id="rde-notice-title">Encerramento das atividades</h2></div><button type="button" class="rde-close" aria-label="Fechar comunicado" autofocus>×</button></div>${timer()}${message}<button type="button" class="rde-continue">Fechar e continuar</button>`;
    document.body.append(dialog);
    const open = () => { if (!dialog.open) dialog.showModal(); };
    dialog.querySelectorAll('button').forEach(button => button.addEventListener('click',() => dialog.close()));
    dialog.addEventListener('click', event => { if(event.target === dialog) { const rect=dialog.getBoundingClientRect(); if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) dialog.close(); }});
    const hero = document.querySelector('.hero-content');
    if (hero) {
      const card = document.createElement('section');
      card.className = 'rde-notice rde-login-notice';
      card.setAttribute('aria-label','Comunicado de encerramento');
      card.innerHTML = `<p class="rde-kicker">Comunicado importante</p><h2>Uma jornada de aprendizado e gratidão</h2>${timer()}${message}<button type="button">Reler comunicado</button>`;
      // Place the notice alongside the existing login form; retain promotional copy below it.
      hero.before(card);
      hero.style.gridColumn="1 / -1";
      hero.parentElement.append(hero);
      card.querySelector('button').addEventListener('click',open);
    } else {
      const reopen = document.createElement('button');
      reopen.type='button'; reopen.className='rde-reopen';
      reopen.textContent='Comunicado: encerramento em 31/12/2026';
      reopen.addEventListener('click',open);
      document.body.prepend(reopen);
    }
    const clocks = document.querySelectorAll('.rde-countdown');
    function tick() {
      const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
      const values=[Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
      clocks.forEach(clock => {clock.querySelectorAll('b').forEach((el,i)=>{el.textContent=String(values[i]).padStart(2,'0');});});
      if (!seconds) document.querySelectorAll('.rde-date').forEach(el=>{el.textContent='Data de encerramento: 31/12/2026 • Prazo encerrado';});
      return seconds;
    }
    tick();
    const interval=setInterval(()=>{if(!tick())clearInterval(interval);},1000);
    document.addEventListener('visibilitychange',tick);
    // One automatic notice per tab session; navigation remains uninterrupted after dismissal.
    let seen=false;
    try {seen=sessionStorage.getItem('rde-encerramento-20261231')==='1';} catch (_) {}
    if(!seen) {open();try {sessionStorage.setItem('rde-encerramento-20261231','1');} catch (_) {}}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
