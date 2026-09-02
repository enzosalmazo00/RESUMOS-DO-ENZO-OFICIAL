(function () {
  'use strict';

  const PAGE_KEY = String(window.PAGE_KEY || '').trim();
  if (!PAGE_KEY || window.__ENZO_STUDY_PROGRESS__) return;
  window.__ENZO_STUDY_PROGRESS__ = true;

  const DB_PROGRESS = 'resumo_progresso';
  const DB_ATTEMPTS = 'resumo_tentativas';
  const PASSIVE_TABS = /^(intro|inicio|introducao|flashcards?|quiz|questoes|simulado)$/i;
  const state = {
    completed: [],
    lastTab: '',
    lastScroll: 0,
    percent: 0,
    celebrated: false,
    errorsByTheme: {},
    updatedAt: '',
    attempts: []
  };
  let tabs = [];
  let studyTabs = [];
  let currentUser = null;
  let saveTimer = 0;
  let restoring = false;
  let initialized = false;

  const TOPIC_MAPS = {
    fisiologia_2_p1: {
      '38': 'cap38', 'cap 38': 'cap38', '39': 'cap39', 'cap 39': 'cap39',
      '40': 'cap40', 'cap 40': 'cap40', '41': 'cap41', 'cap 41': 'cap41',
      '42': 'cap42', 'cap 42': 'cap42', '46': 'cap46', 'cap 46': 'cap46'
    },
    micro_pratica_2_p1: {
      adenovirus: 'adeno', rotavirus: 'rota', astrovirus: 'astro', dengue: 'dengue',
      zika: 'zika', chikungunya: 'chik', arbovirus: 'dengue', gastroenterites: 'rota',
      'roteiro pratico': 'casos', 'hepatite a': 'hava', 'hepatite b': 'hvb',
      'hepatite c': 'hvc', rubeola: 'rubeola', sarampo: 'sarampo', parvovirus: 'parvo',
      'parvovirus b19': 'parvo', 'hsv-1': 'hsv1', 'hsv 1': 'hsv1', 'hsv-2': 'hsv2',
      'hsv 2': 'hsv2', hsv: 'hsv1', 'hsv/vzv': 'varicela', vzv: 'varicela',
      varicela: 'varicela', zoster: 'zoster', 'herpes-zoster': 'zoster',
      herpesvirus: 'hsv1', hepatites: 'hava', ebv: 'ebv', 'epstein–barr': 'ebv', herpes: 'hsv1'
    },
    microbiologia_2_p1: {
      fundamentos: 'geral', geral: 'geral', 'virologia geral': 'geral', parvovirus: 'parvo',
      rubeola: 'rubeola', influenza: 'influenza', gastroenterites: 'gastro', rotavirus: 'gastro',
      astrovirus: 'gastro', adenovirus: 'adeno', coronavirus: 'corona', arbovirus: 'arbovirus',
      dengue: 'arbovirus', zika: 'arbovirus', chikungunya: 'arbovirus', 'febre amarela': 'arbovirus',
      raiva: 'raiva', herpes: 'herpes', hsv: 'herpes', 'hsv/vzv': 'herpes', vzv: 'herpes',
      ebv: 'herpes', cmv: 'herpes', 'hhv-6/7': 'herpes', 'hhv-8': 'herpes',
      picornavirus: 'picorna', poliovirus: 'picorna', coxsackie: 'picorna', rinovirus: 'picorna',
      poxvirus: 'pox', variola: 'pox', mpox: 'pox', 'molusco contagioso': 'pox',
      hpv: 'hpv', hepatites: 'hepatites', 'hepatite a': 'hepatites', 'hepatite b': 'hepatites',
      'hepatite c': 'hepatites', 'hepatite d': 'hepatites', 'hepatite e': 'hepatites'
    },
    nutricao_p1: {
      fundamentos: 'fundamentals', conceitos: 'fundamentals', 'prova direta': 'fundamentals',
      celular: 'cellular', 'celula e tipos': 'cellular', 'nutricao celular': 'cellular',
      'processos celulares': 'cellular', tipos: 'tipos', alimento: 'alimento',
      classes: 'classes', 'alimentos protetores': 'classes', alimentacao: 'alimentacao',
      dieta: 'dieta', requerimentos: 'requerimentos', edulcorantes: 'carboidratos',
      nutrimentos: 'nutrimentos', objetivos: 'objetivos', 'dieta correta': 'dieta-correta',
      carboidratos: 'carboidratos', vitaminas: 'vitaminas'
    },
    eletrocardiograma_p1: {
      fundamentos: 'fundamentos', fisiologia: 'fisiologia', aparelho: 'aparelho', calibracao: 'aparelho',
      derivacoes: 'derivacoes', normal: 'normal', metodo: 'metodo', interpretacao: 'metodo',
      frequencia: 'frequencia', 'frequencia e ritmo': 'frequencia', eixo: 'eixo', atriais: 'atriais',
      ventriculares: 'ventriculares', bloqueios: 'bloqueios', sobrecargas: 'sobrecargas',
      isquemia: 'isquemia', outros: 'outros', tracados: 'tracados', pistas: 'pistas'
    },
    epidemiologia_p1: {
      fundamentos: 'fundamentos', programa: 'programa', servico: 'servico', planejamento: 'planejamento',
      ciclo: 'ciclo', aps: 'aps', assistencia: 'assistencia', componentes: 'componentes',
      paraguai: 'paraguai', regulacao: 'regulacao', participacao: 'participacao', medico: 'medico',
      habilidades: 'habilidades', indicadores: 'indicadores', equidade: 'equidade',
      introducao: 'epi_conceito', epidemiologia: 'epi_conceito', conceito: 'epi_conceito',
      classificacao: 'epi_classificacao', principios: 'epi_principios', 'principios e usos': 'epi_principios',
      metodo: 'epi_metodo', desenho: 'desenho_geral', descritivo: 'desenho_descritivo',
      analitico: 'desenho_analitico', experimental: 'desenho_experimental', ciencias: 'relacao_ciencias'
    },
    bioquimica_2_p1: {
      carboidratos: 'carboidratos', glicolise: 'carboidratos', glicogenio: 'carboidratos',
      gliconeogenese: 'carboidratos', piruvato: 'carboidratos', pentoses: 'pentoses',
      cori: 'cori', insulina: 'insulina', glucagon: 'glucagon', antibioticos: 'antibioticos',
      aminoglicosideos: 'antibioticos', bacteria: 'antibioticos'
    }
  };

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function buttonTabId(button) {
    if (!button) return '';
    if (button.dataset.section) return button.dataset.section;
    const match = String(button.getAttribute('onclick') || '').match(/showSection\(\s*['"]([^'"]+)/);
    return match ? match[1] : '';
  }

  function tabLabel(tab) {
    const button = tabs.find(function (item) { return item.id === tab; });
    return button ? button.label : tab;
  }

  function findTabSections(id) {
    const direct = document.getElementById(id);
    const grouped = Array.from(document.querySelectorAll('.section[data-group]')).filter(function (section) {
      return section.dataset.group === id;
    });
    if (grouped.length) return grouped;
    return direct ? [direct] : [];
  }

  function discoverTabs() {
    const navButtons = Array.from(document.querySelectorAll('nav.tabs button, .tabs button')).filter(buttonTabId);
    tabs = navButtons.map(function (button) {
      const id = buttonTabId(button);
      if (!button.dataset.section) button.dataset.section = id;
      const label = String(button.textContent || id).replace(/\s+/g, ' ').trim();
      return { id: id, label: label, button: button, sections: findTabSections(id) };
    }).filter(function (item, index, list) {
      return item.id && index === list.findIndex(function (other) { return other.id === item.id; });
    });
    studyTabs = tabs.filter(function (item, index) {
      return index > 0 && !PASSIVE_TABS.test(item.id) && item.sections.length;
    });
    if (!state.lastTab) state.lastTab = tabs[0] ? tabs[0].id : '';
  }

  function localKey() {
    const owner = currentUser && currentUser.id ? currentUser.id : 'local';
    return 'enzo-study-progress:v2:' + owner + ':' + PAGE_KEY;
  }

  function readLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(localKey()) || 'null');
      return saved && typeof saved === 'object' ? saved : null;
    } catch (_) {
      return null;
    }
  }

  function writeLocal() {
    try { localStorage.setItem(localKey(), JSON.stringify(state)); } catch (_) {}
  }

  function mergeState(saved) {
    if (!saved) return;
    state.completed = Array.isArray(saved.completed || saved.abas_concluidas)
      ? (saved.completed || saved.abas_concluidas).filter(function (id) { return studyTabs.some(function (tab) { return tab.id === id; }); })
      : [];
    state.lastTab = saved.lastTab || saved.ultima_aba || state.lastTab;
    state.lastScroll = Math.max(0, Number(saved.lastScroll != null ? saved.lastScroll : saved.ultimo_scroll) || 0);
    state.percent = Number(saved.percent != null ? saved.percent : saved.percentual) || 0;
    state.celebrated = Boolean(saved.celebrated != null ? saved.celebrated : saved.conclusao_celebrada);
    state.errorsByTheme = saved.errorsByTheme || saved.erros_por_tema || {};
    state.updatedAt = saved.updatedAt || saved.updated_at || '';
    if (Array.isArray(saved.attempts)) state.attempts = saved.attempts.slice(0, 10);
  }

  function calculatePercent() {
    state.percent = studyTabs.length ? Math.round((state.completed.length / studyTabs.length) * 100) : 0;
    return state.percent;
  }

  function setUpdated() {
    state.updatedAt = new Date().toISOString();
  }

  function dbClient() {
    return window.authClient && typeof window.authClient.from === 'function' ? window.authClient : null;
  }

  function getUser() {
    return window.authSession && window.authSession.user ? window.authSession.user : null;
  }

  async function saveRemote() {
    const client = dbClient();
    if (!client || !currentUser) return;
    const payload = {
      user_id: currentUser.id,
      resumo_key: PAGE_KEY,
      abas_concluidas: state.completed,
      ultima_aba: state.lastTab || null,
      ultimo_scroll: Math.round(state.lastScroll || 0),
      percentual: calculatePercent(),
      conclusao_celebrada: state.celebrated,
      erros_por_tema: state.errorsByTheme || {},
      updated_at: state.updatedAt || new Date().toISOString()
    };
    const result = await client.from(DB_PROGRESS).upsert(payload, { onConflict: 'user_id,resumo_key' });
    if (result && result.error) console.warn('Não foi possível sincronizar o progresso.', result.error.message);
  }

  function scheduleSave(remote) {
    setUpdated();
    writeLocal();
    clearTimeout(saveTimer);
    if (remote !== false) saveTimer = window.setTimeout(saveRemote, 900);
  }

  async function loadPersisted() {
    currentUser = getUser();
    const local = readLocal();
    let remote = null;
    const client = dbClient();
    if (client && currentUser) {
      const result = await client.from(DB_PROGRESS).select('*')
        .eq('user_id', currentUser.id).eq('resumo_key', PAGE_KEY).maybeSingle();
      if (result && !result.error) remote = result.data;
    }
    const localTime = local && Date.parse(local.updatedAt || local.updated_at || '') || 0;
    const remoteTime = remote && Date.parse(remote.updated_at || '') || 0;
    mergeState(remoteTime >= localTime ? remote : local);
    calculatePercent();
    writeLocal();
    renderAll();
    await loadAttempts();
    if (local && localTime > remoteTime) await saveRemote();
  }

  function injectStyles() {
    if (document.getElementById('ezsp-styles')) return;
    const style = document.createElement('style');
    style.id = 'ezsp-styles';
    style.textContent = `
      .ezsp-card{position:relative;overflow:hidden;margin:1.2rem 0 1.8rem;padding:1.25rem;border:1px solid rgba(56,189,248,.38);border-radius:18px;background:linear-gradient(135deg,rgba(14,165,233,.14),rgba(139,92,246,.11));box-shadow:0 14px 38px rgba(2,8,23,.18)}
      .ezsp-card h3{margin:0 0 .35rem;font-size:1.08rem;color:inherit}.ezsp-card p{margin:.35rem 0;color:inherit;opacity:.88}.ezsp-progress-row{display:flex;align-items:center;gap:.8rem;margin:.9rem 0}.ezsp-track{height:12px;flex:1;border-radius:999px;background:rgba(148,163,184,.2);overflow:hidden}.ezsp-fill{height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#22c55e,#38bdf8);transition:width .35s ease}.ezsp-percent{font-weight:900;min-width:3.4rem;text-align:right}.ezsp-btn{appearance:none;border:0;border-radius:12px;padding:.72rem 1rem;background:linear-gradient(135deg,#0ea5e9,#7c3aed);color:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 7px 18px rgba(14,165,233,.22)}.ezsp-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}.ezsp-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}.ezsp-muted{font-size:.82rem;opacity:.72}
      .ezsp-check{display:flex;align-items:flex-start;gap:.8rem;margin:2rem auto 1rem;padding:1rem 1.1rem;border:1px solid rgba(34,197,94,.34);border-radius:15px;background:rgba(34,197,94,.08);cursor:pointer;max-width:1100px}.ezsp-check input{width:1.25rem;height:1.25rem;margin:.13rem 0 0;accent-color:#22c55e}.ezsp-check strong{display:block}.ezsp-check span{display:block;margin-top:.18rem;font-size:.85rem;opacity:.76}.ezsp-check.ezsp-done{background:rgba(34,197,94,.15);border-color:rgba(34,197,94,.65)}
      .ezsp-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem;margin:.9rem 0}.ezsp-stat{padding:.8rem;text-align:center;border:1px solid rgba(148,163,184,.24);border-radius:12px;background:rgba(15,23,42,.14)}.ezsp-stat b{display:block;font-size:1.25rem}.ezsp-actions{display:flex;gap:.7rem;align-items:center;flex-wrap:wrap}.ezsp-history{margin-top:1rem;display:grid;gap:.5rem}.ezsp-attempt{display:flex;justify-content:space-between;gap:.8rem;padding:.65rem .75rem;border-radius:10px;background:rgba(148,163,184,.09);font-size:.88rem}.ezsp-guidance{margin-top:.9rem;padding:.85rem;border-left:4px solid #f59e0b;border-radius:8px;background:rgba(245,158,11,.1)}
      .ezsp-celebration{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,.76);backdrop-filter:blur(6px)}.ezsp-celebration[hidden]{display:none}.ezsp-fireworks{position:absolute;inset:0;width:100%;height:100%}.ezsp-modal{position:relative;z-index:2;width:min(92vw,540px);padding:2rem;text-align:center;border:1px solid rgba(250,204,21,.7);border-radius:22px;background:linear-gradient(145deg,#10213e,#31135f);color:#fff;box-shadow:0 24px 80px rgba(0,0,0,.45)}.ezsp-modal .ezsp-trophy{font-size:4rem}.ezsp-modal h2{margin:.4rem 0 .7rem;font-size:clamp(1.5rem,4vw,2.25rem)}
      @media(max-width:620px){.ezsp-stats{grid-template-columns:1fr}.ezsp-actions .ezsp-btn{width:100%}.ezsp-attempt{align-items:flex-start;flex-direction:column}}
      @media(prefers-reduced-motion:reduce){.ezsp-fill,.ezsp-btn{transition:none!important}.ezsp-btn:hover{transform:none}}
    `;
    document.head.appendChild(style);
  }

  function injectProgressCard() {
    if (document.getElementById('ezsp-home-card')) return;
    const home = tabs[0] && tabs[0].sections[0];
    if (!home) return;
    const host = home.querySelector('.container') || home;
    const card = document.createElement('aside');
    card.id = 'ezsp-home-card';
    card.className = 'ezsp-card';
    card.innerHTML = `
      <h3>📍 Seu progresso neste resumo</h3>
      <p id="ezsp-home-message">Marque cada aba ao terminar o estudo.</p>
      <div class="ezsp-progress-row"><div class="ezsp-track" role="progressbar" aria-label="Progresso do resumo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="ezsp-fill"></div></div><span class="ezsp-percent">0%</span></div>
      <button type="button" class="ezsp-btn" id="ezsp-resume">Continuar de onde parou</button>
      <div class="ezsp-muted" id="ezsp-last-place"></div>`;
    host.insertBefore(card, host.firstChild);
    card.querySelector('#ezsp-resume').addEventListener('click', resumeStudy);
  }

  function injectChecklists() {
    studyTabs.forEach(function (tab) {
      const target = tab.sections[tab.sections.length - 1];
      if (!target || target.querySelector('.ezsp-check[data-ez-tab="' + tab.id + '"]')) return;
      const host = target.querySelector('.container') || target;
      const label = document.createElement('label');
      label.className = 'ezsp-check';
      label.dataset.ezTab = tab.id;
      label.innerHTML = '<input type="checkbox"><span><strong>Concluir esta aba</strong><span>Marcar “' + escapeHtml(tab.label) + '” como estudada.</span></span>';
      label.querySelector('input').addEventListener('change', function (event) {
        setCompleted(tab.id, event.target.checked);
      });
      host.appendChild(label);
    });
  }

  function quizSection() {
    const quizTab = tabs.find(function (item) { return /^(quiz|questoes|simulado)$/i.test(item.id); });
    return quizTab && quizTab.sections[0];
  }

  function injectQuizPanel() {
    if (document.getElementById('ezsp-quiz-panel')) return;
    const section = quizSection();
    if (!section) return;
    const host = section.querySelector('.container') || section.querySelector('.wrap') || section;
    const panel = document.createElement('aside');
    panel.id = 'ezsp-quiz-panel';
    panel.className = 'ezsp-card';
    panel.innerHTML = `
      <h3>📈 Evolução no simulado</h3>
      <p>O resultado de cada tentativa fica salvo para você acompanhar sua evolução.</p>
      <div class="ezsp-stats"><div class="ezsp-stat"><b id="ezsp-correct">0</b>acertos</div><div class="ezsp-stat"><b id="ezsp-wrong">0</b>erros</div><div class="ezsp-stat"><b id="ezsp-answered">0/0</b>respondidas</div></div>
      <div class="ezsp-actions"><button type="button" class="ezsp-btn" id="ezsp-finish-attempt">Finalizar e salvar tentativa</button><span class="ezsp-muted" id="ezsp-attempt-note">Responda às questões de múltipla escolha e verdadeiro ou falso.</span></div>
      <div class="ezsp-guidance" id="ezsp-guidance" hidden></div>
      <div class="ezsp-history" id="ezsp-history"></div>`;
    const anchor = host.querySelector('#quizContainer, #quiz');
    host.insertBefore(panel, anchor || host.firstChild);
    panel.querySelector('#ezsp-finish-attempt').addEventListener('click', finishAttempt);
    updateQuizStats();
  }

  function injectCelebration() {
    if (document.getElementById('ezsp-celebration')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ezsp-celebration';
    overlay.className = 'ezsp-celebration';
    overlay.hidden = true;
    overlay.innerHTML = '<canvas class="ezsp-fireworks" aria-hidden="true"></canvas><div class="ezsp-modal" role="dialog" aria-modal="true" aria-labelledby="ezsp-congrats"><div class="ezsp-trophy">🏆</div><h2 id="ezsp-congrats">Parabéns! Você completou todos os pontos do resumo!</h2><p>Seu progresso chegou a 100%.</p><button type="button" class="ezsp-btn">Continuar estudando</button></div>';
    overlay.querySelector('button').addEventListener('click', function () { overlay.hidden = true; });
    overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.hidden = true; });
    document.body.appendChild(overlay);
  }

  function renderAll() {
    calculatePercent();
    document.querySelectorAll('.ezsp-check').forEach(function (label) {
      const checked = state.completed.includes(label.dataset.ezTab);
      label.classList.toggle('ezsp-done', checked);
      const input = label.querySelector('input');
      if (input) input.checked = checked;
    });
    const card = document.getElementById('ezsp-home-card');
    if (card) {
      const fill = card.querySelector('.ezsp-fill');
      const track = card.querySelector('.ezsp-track');
      fill.style.width = state.percent + '%';
      track.setAttribute('aria-valuenow', String(state.percent));
      card.querySelector('.ezsp-percent').textContent = state.percent + '%';
      const completedText = state.completed.length + ' de ' + studyTabs.length + ' abas concluídas.';
      card.querySelector('#ezsp-home-message').textContent = completedText;
      const last = tabs.some(function (item) { return item.id === state.lastTab; }) ? state.lastTab : (tabs[0] && tabs[0].id);
      card.querySelector('#ezsp-last-place').textContent = last ? 'Último ponto: ' + tabLabel(last) + '.' : '';
      const resume = card.querySelector('#ezsp-resume');
      resume.disabled = !last;
      resume.textContent = state.percent === 100 ? 'Revisar de onde parei' : 'Continuar de onde parou';
    }
  }

  function setCompleted(tab, checked) {
    const set = new Set(state.completed);
    if (checked) set.add(tab); else set.delete(tab);
    state.completed = studyTabs.map(function (item) { return item.id; }).filter(function (id) { return set.has(id); });
    const previous = state.percent;
    calculatePercent();
    if (state.percent < 100) state.celebrated = false;
    renderAll();
    scheduleSave(true);
    if (state.percent === 100 && previous < 100 && !state.celebrated) celebrate();
  }

  function activateTab(id) {
    const tab = tabs.find(function (item) { return item.id === id; });
    if (!tab) return false;
    tab.button.click();
    return true;
  }

  function resumeStudy() {
    const id = tabs.some(function (item) { return item.id === state.lastTab; }) ? state.lastTab : (tabs[0] && tabs[0].id);
    const y = Math.max(0, state.lastScroll || 0);
    if (!id || !activateTab(id)) return;
    restoring = true;
    state.lastTab = id;
    state.lastScroll = y;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.scrollTo({ top: y, behavior: 'auto' });
        window.setTimeout(function () { restoring = false; }, 250);
      });
    });
  }

  function trackNavigation(event) {
    const button = event.target.closest && event.target.closest('nav.tabs button, .tabs button');
    const id = buttonTabId(button);
    if (!id) {
      window.setTimeout(syncActiveTab, 0);
      return;
    }
    state.lastTab = id;
    state.lastScroll = 0;
    scheduleSave(true);
    renderAll();
  }

  function syncActiveTab() {
    const active = tabs.find(function (item) { return item.button.classList.contains('active'); });
    if (!active || active.id === state.lastTab) return;
    state.lastTab = active.id;
    state.lastScroll = 0;
    scheduleSave(true);
    renderAll();
  }

  function objectiveCards() {
    const section = quizSection();
    if (!section) return [];
    return Array.from(section.querySelectorAll('.q-card, .quiz-card')).filter(function (card) {
      return /^(mc|tf)$/i.test(card.dataset.type || '');
    });
  }

  function cardOutcome(card) {
    if (card.classList.contains('cq') || card.querySelector('.result.ok')) return 'correct';
    if (card.classList.contains('wq') || card.querySelector('.result.bad')) return 'wrong';
    return '';
  }

  function scoreSnapshot() {
    const cards = objectiveCards();
    let correct = 0;
    let wrong = 0;
    const errors = {};
    cards.forEach(function (card) {
      const outcome = cardOutcome(card);
      if (outcome === 'correct') correct += 1;
      if (outcome === 'wrong') {
        wrong += 1;
        const category = String(card.dataset.category || card.dataset.cat || 'Revisão geral').trim();
        errors[category] = (errors[category] || 0) + 1;
      }
    });
    return { correct: correct, wrong: wrong, answered: correct + wrong, total: cards.length, errors: errors };
  }

  function updateQuizStats() {
    const panel = document.getElementById('ezsp-quiz-panel');
    if (!panel) return;
    const score = scoreSnapshot();
    panel.querySelector('#ezsp-correct').textContent = score.correct;
    panel.querySelector('#ezsp-wrong').textContent = score.wrong;
    panel.querySelector('#ezsp-answered').textContent = score.answered + '/' + score.total;
    const button = panel.querySelector('#ezsp-finish-attempt');
    button.disabled = score.answered === 0;
  }

  function detectQuizClick(event) {
    if (!event.target.closest) return;
    if (event.target.closest('.opt-btn,.tf-btn,.opt')) {
      window.setTimeout(updateQuizStats, 0);
    }
  }

  function aggregateErrors(current) {
    const total = {};
    state.attempts.slice(0, 10).forEach(function (attempt) {
      const errors = attempt.erros_por_tema || {};
      Object.keys(errors).forEach(function (key) { total[key] = (total[key] || 0) + Number(errors[key] || 0); });
    });
    Object.keys(current || {}).forEach(function (key) { total[key] = (total[key] || 0) + Number(current[key] || 0); });
    return total;
  }

  function categoryToTab(category) {
    const key = normalize(category);
    const map = TOPIC_MAPS[PAGE_KEY] || {};
    if (map[key]) return map[key];
    const partial = Object.keys(map).find(function (candidate) { return key.includes(candidate) || candidate.includes(key); });
    if (partial) return map[partial];
    const matchingTab = studyTabs.find(function (tab) {
      return normalize(tab.label).includes(key) || key.includes(normalize(tab.id));
    });
    return matchingTab ? matchingTab.id : (studyTabs[0] && studyTabs[0].id);
  }

  function weakTopics(errors) {
    return Object.entries(errors || {}).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).map(function (entry) {
      const tab = categoryToTab(entry[0]);
      return { category: entry[0], errors: entry[1], tab: tab, label: tabLabel(tab) };
    });
  }

  function fallbackGuidance(errors) {
    const weak = weakTopics(errors);
    if (!weak.length) return 'Ótimo resultado: mantenha uma revisão breve das abas concluídas antes da próxima tentativa.';
    const tabsToReview = Array.from(new Set(weak.map(function (item) { return item.label; }).filter(Boolean)));
    const points = weak.map(function (item) { return item.category; });
    return 'Retome ' + tabsToReview.join(', ') + '. Dê atenção a: ' + points.join(', ') + '.';
  }

  async function aiGuidance(errors, score) {
    const fallback = fallbackGuidance(errors);
    const client = dbClient();
    if (!client || !currentUser || !Object.keys(errors).length || !client.functions) return fallback;
    const weak = weakTopics(errors);
    const prompt = [
      'Você é a Enzo IA dentro de um resumo médico. Gere orientação de estudo em português, no máximo 2 frases e 55 palavras.',
      'Use somente os dados seguintes; não ensine conteúdo novo, não diagnostique e não acrescente assunto externo.',
      'Resultado: ' + score.correct + ' acertos e ' + score.wrong + ' erros.',
      'Pontos recorrentes: ' + weak.map(function (item) { return item.category + ' (' + item.errors + ' erros)'; }).join('; ') + '.',
      'Abas indicadas: ' + weak.map(function (item) { return item.label; }).filter(Boolean).join('; ') + '.',
      'Diga quais abas retomar e os pontos de atenção.'
    ].join('\n');
    try {
      const result = await client.functions.invoke('enzo-chat', { body: { messages: [{ role: 'user', content: prompt }] } });
      const reply = result && result.data && String(result.data.reply || '').trim();
      return reply || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function attemptFingerprint(score) {
    return [score.correct, score.wrong, score.answered, JSON.stringify(score.errors)].join('|');
  }

  async function finishAttempt() {
    const panel = document.getElementById('ezsp-quiz-panel');
    const note = panel && panel.querySelector('#ezsp-attempt-note');
    const button = panel && panel.querySelector('#ezsp-finish-attempt');
    const score = scoreSnapshot();
    if (!score.answered) return;
    const fingerprint = attemptFingerprint(score);
    if (panel && panel.dataset.lastFingerprint === fingerprint) {
      note.textContent = 'Esta tentativa já foi salva. Responda novamente após reiniciar o simulado.';
      return;
    }
    if (button) { button.disabled = true; button.textContent = 'Salvando tentativa…'; }
    const aggregate = aggregateErrors(score.errors);
    const guidance = await aiGuidance(aggregate, score);
    const percentage = score.answered ? Math.round((score.correct / score.answered) * 10000) / 100 : 0;
    const attempt = {
      user_id: currentUser && currentUser.id,
      resumo_key: PAGE_KEY,
      acertos: score.correct,
      erros: score.wrong,
      respondidas: score.answered,
      total_questoes: score.total,
      percentual: percentage,
      erros_por_tema: score.errors,
      orientacao: guidance,
      created_at: new Date().toISOString()
    };
    const client = dbClient();
    let savedAttempt = attempt;
    if (client && currentUser) {
      const result = await client.from(DB_ATTEMPTS).insert(attempt).select('*').single();
      if (result && !result.error && result.data) savedAttempt = result.data;
      else if (result && result.error) console.warn('Não foi possível salvar a tentativa.', result.error.message);
    }
    state.attempts.unshift(savedAttempt);
    state.attempts = state.attempts.slice(0, 10);
    state.errorsByTheme = aggregate;
    scheduleSave(true);
    if (panel) panel.dataset.lastFingerprint = fingerprint;
    showGuidance(guidance, aggregate);
    renderHistory();
    window.ENZO_STUDY_CONTEXT = { resumo: PAGE_KEY, resultado: score, errosRecorrentes: aggregate, orientacao: guidance };
    window.dispatchEvent(new CustomEvent('enzoStudyRecommendation', { detail: window.ENZO_STUDY_CONTEXT }));
    if (note) note.textContent = 'Tentativa salva: ' + score.correct + ' de ' + score.answered + ' acertos (' + Math.round(percentage) + '%).';
    if (button) { button.disabled = false; button.textContent = 'Finalizar e salvar tentativa'; }
  }

  function showGuidance(text, errors) {
    const box = document.getElementById('ezsp-guidance');
    if (!box || !text) return;
    box.hidden = false;
    box.innerHTML = '<strong>Orientação da Enzo IA</strong><div>' + escapeHtml(text) + '</div>';
    const weak = weakTopics(errors || {});
    if (weak.length) {
      const links = document.createElement('div');
      links.className = 'ezsp-actions';
      links.style.marginTop = '.65rem';
      Array.from(new Set(weak.map(function (item) { return item.tab; }).filter(Boolean))).forEach(function (tab) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ezsp-btn';
        button.textContent = 'Revisar: ' + tabLabel(tab);
        button.addEventListener('click', function () { activateTab(tab); });
        links.appendChild(button);
      });
      box.appendChild(links);
    }
  }

  function renderHistory() {
    const host = document.getElementById('ezsp-history');
    if (!host) return;
    if (!state.attempts.length) {
      host.innerHTML = '<div class="ezsp-muted">Nenhuma tentativa salva ainda.</div>';
      return;
    }
    const chronological = state.attempts.slice().reverse();
    host.innerHTML = '<strong>Últimas tentativas</strong>' + chronological.map(function (attempt, index) {
      const previous = index ? Number(chronological[index - 1].percentual || 0) : null;
      const current = Number(attempt.percentual || 0);
      const delta = previous == null ? '' : (current > previous ? ' ↗ +' : current < previous ? ' ↘ ' : ' → ') + Math.round(current - previous) + ' p.p.';
      return '<div class="ezsp-attempt"><span>Tentativa ' + (index + 1) + ' · ' + new Date(attempt.created_at).toLocaleDateString('pt-BR') + '</span><strong>' + attempt.acertos + '/' + attempt.respondidas + ' (' + Math.round(current) + '%)' + delta + '</strong></div>';
    }).join('');
    const latest = state.attempts[0];
    if (latest && latest.orientacao) showGuidance(latest.orientacao, aggregateErrors({}));
  }

  async function loadAttempts() {
    const client = dbClient();
    if (client && currentUser) {
      const result = await client.from(DB_ATTEMPTS).select('*').eq('user_id', currentUser.id)
        .eq('resumo_key', PAGE_KEY).order('created_at', { ascending: false }).limit(10);
      if (result && !result.error && Array.isArray(result.data)) state.attempts = result.data;
    }
    renderHistory();
  }

  function celebrate() {
    const overlay = document.getElementById('ezsp-celebration');
    if (!overlay) return;
    state.celebrated = true;
    scheduleSave(true);
    overlay.hidden = false;
    const canvas = overlay.querySelector('canvas');
    if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    const colors = ['#facc15', '#38bdf8', '#f472b6', '#4ade80', '#fb7185', '#a78bfa'];
    let particles = [];
    let frame = 0;
    function size() { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
    function burst(x, y) {
      for (let i = 0; i < 54; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 70 + Math.random() * 40, color: colors[i % colors.length] });
      }
    }
    size();
    burst(innerWidth * .24, innerHeight * .32); burst(innerWidth * .76, innerHeight * .27); burst(innerWidth * .5, innerHeight * .18);
    function draw() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      particles.forEach(function (p) { p.vy += .055; p.x += p.vx; p.y += p.vy; p.life -= 1; ctx.globalAlpha = Math.max(0, p.life / 105); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); });
      particles = particles.filter(function (p) { return p.life > 0; });
      ctx.globalAlpha = 1;
      frame += 1;
      if (particles.length && frame < 150 && !overlay.hidden) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  function onScroll() {
    if (restoring) return;
    state.lastScroll = Math.max(0, Math.round(window.scrollY || 0));
    scheduleSave(true);
  }

  function bindEvents() {
    document.addEventListener('click', trackNavigation);
    document.addEventListener('click', detectQuizClick);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', function () {
      state.lastScroll = Math.max(0, Math.round(window.scrollY || 0));
      setUpdated();
      writeLocal();
    });
    window.addEventListener('authReady', function () {
      const user = getUser();
      if (user && (!currentUser || currentUser.id !== user.id)) loadPersisted();
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    discoverTabs();
    injectStyles();
    injectProgressCard();
    injectChecklists();
    injectQuizPanel();
    injectCelebration();
    bindEvents();
    mergeState(readLocal());
    renderAll();
    loadPersisted();
  }

  window.EnzoStudyProgress = {
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    resume: resumeStudy,
    saveAttempt: finishAttempt
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
