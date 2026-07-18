(() => {
  const STORAGE_KEY = 'garbaIntelligence.protection.v1';
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  const state = {
    step: 0, scope: '',
    monthlyExpenses: '', liquidSavings: '',
    hasLifeInsurance: '', lifeInsuranceAmount: '', hasGMM: '', hasDisability: '',
    monthlyIncome: '', dependents: '', incomeProtection: '',
    hasHomeInsurance: '', mortgageBalance: '', mortgageProtected: '',
    hasChildren: '', estimatedEducationCost: '', hasEducationFund: '',
    totalDebts: '', debtsProtected: '',
    hasWill: '', beneficiariesUpdated: '', someoneKnowsDocs: ''
  };

  const steps = [...document.querySelectorAll('.step')];
  const byId = id => document.getElementById(id);
  const num = value => Math.max(0, Number(value) || 0);
  const getSession = () => { try { return JSON.parse(localStorage.getItem('garbaIntelligence.session.v1')) || {}; } catch { return {}; } };
  const session = getSession();
  const firstName = (session.fullName || 'Usuario').trim().split(/\s+/)[0];

  document.querySelectorAll('[data-user-first-name]').forEach(el => el.textContent = firstName);
  document.querySelectorAll('[data-user-initial]').forEach(el => el.textContent = firstName.charAt(0).toUpperCase());

  function load() {
    try { Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); } catch {}
    Object.keys(state).forEach(key => {
      const el = byId(key); if (!el) return;
      if (el.type === 'checkbox') el.checked = Boolean(state[key]); else el.value = state[key] ?? '';
    });
    document.querySelectorAll('[data-choice-group]').forEach(group => {
      const key = group.dataset.choiceGroup;
      group.querySelectorAll('[data-value]').forEach(btn => btn.classList.toggle('is-selected', btn.dataset.value === state[key]));
    });
    updateConditionals();
    showStep(Math.min(Number(state.step) || 0, steps.length - 2));
  }

  function persist() {
    state.step = currentStep();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const status = byId('saveStatus');
    if (status) { status.style.opacity = '.45'; setTimeout(() => status.style.opacity = '1', 150); }
  }

  function currentStep() { return steps.findIndex(s => s.classList.contains('is-active')); }

  const NODE_LABELS = ['Inicio', 'Perspectiva', 'Protección financiera', 'Familia y vivienda', 'Organización', 'Resultado'];
  const NODE_MAP = [0, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5];
  const STEP_LABELS = ['Bienvenida', 'Perspectiva', 'Fondo de emergencia', 'Seguros', 'Ingresos', 'Vivienda', 'Educación', 'Deudas', 'Organización patrimonial', 'Revisión', 'Resultado'];

  function showStep(index) {
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    const lastIndex = steps.length - 1;
    const pct = index >= lastIndex ? 100 : Math.round((index / lastIndex) * 100);
    byId('progressBar').style.width = `${pct}%`;
    byId('progressText').textContent = `${pct}%`;
    byId('stepLabel').textContent = STEP_LABELS[index] || 'Resultado';
    const routeIndex = NODE_MAP[index] ?? 5;
    document.querySelectorAll('[data-route-node]').forEach((node, i) => {
      node.classList.toggle('is-active', i === routeIndex);
      node.classList.toggle('is-complete', i < routeIndex);
    });
    byId('routeLine').style.height = `${(routeIndex / 5) * 100}%`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (index === 9) buildReview();
  }

  function alertFriendly(message) {
    const note = document.createElement('div');
    note.className = 'temporary-message';
    note.textContent = message;
    Object.assign(note.style, { position: 'fixed', left: '50%', bottom: '90px', transform: 'translateX(-50%)', zIndex: '200', padding: '12px 16px', borderRadius: '12px', background: 'rgba(21,13,36,.96)', border: '1px solid rgba(157,140,255,.3)', color: '#ece6fb', fontSize: '11px', boxShadow: '0 20px 50px rgba(0,0,0,.35)' });
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 2600);
    return false;
  }

  function validateStep(index) {
    if (index === 1 && !state.scope) return alertFriendly('Elige cómo quieres revisar tu situación.');
    if (index === 3 && !state.hasLifeInsurance) return alertFriendly('Indica si cuentas con seguro de vida hoy.');
    if (index === 4 && !state.incomeProtection) return alertFriendly('Elige la opción que mejor describa tu situación.');
    if (index === 5 && !state.hasHomeInsurance) return alertFriendly('Indica si tu vivienda cuenta con seguro hoy.');
    if (index === 6 && !state.hasChildren) return alertFriendly('Indica si tienes hijos o dependientes en edad escolar.');
    if (index === 8 && !state.hasWill) return alertFriendly('Indica si cuentas con un testamento hoy.');
    return true;
  }

  document.addEventListener('click', event => {
    const next = event.target.closest('[data-next]'), prev = event.target.closest('[data-prev]');
    if (next) { const i = currentStep(); if (validateStep(i)) { showStep(Math.min(i + 1, steps.length - 1)); persist(); } }
    if (prev) { showStep(Math.max(currentStep() - 1, 0)); persist(); }
    const choice = event.target.closest('[data-choice-group] [data-value]');
    if (choice) {
      const group = choice.closest('[data-choice-group]');
      state[group.dataset.choiceGroup] = choice.dataset.value;
      group.querySelectorAll('[data-value]').forEach(btn => btn.classList.toggle('is-selected', btn === choice));
      updateConditionals(); persist();
    }
    const open = event.target.closest('[data-open-panel]'); if (open) openPanel(open.dataset.openPanel);
    if (event.target.closest('[data-close-panel]')) closePanel();
  });

  document.querySelectorAll('input,select').forEach(input => input.addEventListener('input', () => {
    state[input.id] = input.type === 'checkbox' ? input.checked : input.value;
    updateConditionals(); persist();
  }));

  function updateConditionals() {
    const eduBlock = byId('educationFields'); if (eduBlock) eduBlock.hidden = state.hasChildren !== 'yes';
    const mortgageBlock = byId('mortgageProtectedField'); if (mortgageBlock) mortgageBlock.hidden = !num(state.mortgageBalance);
  }

  // ---- Cálculo de puntajes (0-100 por categoría) ----
  function scoreEmergency() {
    const expenses = num(state.monthlyExpenses), savings = num(state.liquidSavings);
    const months = expenses > 0 ? savings / expenses : (savings > 0 ? 6 : 0);
    return { score: Math.max(0, Math.min(100, Math.round((months / 6) * 100))), months };
  }
  function dimeTarget() {
    const income = num(state.monthlyIncome), years = 5;
    return num(state.totalDebts) + income * 12 * years + num(state.mortgageBalance) + num(state.estimatedEducationCost);
  }
  function scoreInsurance() {
    const target = dimeTarget(), current = num(state.lifeInsuranceAmount);
    const coverageRatio = target > 0 ? Math.min(1, current / target) : 1;
    const score = coverageRatio * 60 + (state.hasGMM === 'yes' ? 20 : 0) + (state.hasDisability === 'yes' ? 20 : 0);
    return { score: Math.round(score), target, current, coverageRatio };
  }
  function scoreIncome() {
    const map = { covered: 100, partial: 50, no: 0 };
    return { score: map[state.incomeProtection] ?? 0 };
  }
  function scoreHousing() {
    let score = state.hasHomeInsurance === 'yes' ? 50 : 0;
    const mortgage = num(state.mortgageBalance);
    score += mortgage <= 0 ? 50 : (state.mortgageProtected === 'yes' ? 50 : 0);
    return { score };
  }
  function scoreEducation() {
    if (state.hasChildren !== 'yes') return { score: 100 };
    return { score: state.hasEducationFund === 'yes' ? 100 : 0 };
  }
  function scoreDebt() {
    const debt = num(state.totalDebts);
    if (debt <= 0) return { score: 100 };
    return { score: state.debtsProtected === 'yes' ? 100 : 40 };
  }
  function scoreEstate() {
    let score = state.hasWill === 'yes' ? 34 : 0;
    score += state.beneficiariesUpdated === 'yes' ? 33 : (state.beneficiariesUpdated === 'notsure' ? 15 : 0);
    score += state.someoneKnowsDocs === 'yes' ? 33 : 0;
    return { score: Math.min(100, Math.round(score)) };
  }

  const CONTEXT_NOTES = {
    emergency: d => `Cubres aproximadamente ${d.months.toFixed(1)} meses de gastos con ahorro líquido. La referencia común en México es de 3 a 6 meses.`,
    insurance: () => 'México tiene la penetración de seguros más baja de América Latina (2.7% del PIB, frente a 6-8% regional) y solo 9.7% de la población tiene gastos médicos mayores.',
    income: () => 'Bajo el Seguro Social, una incapacidad parcial (25%-50% de pérdida) se paga como un pago único, no como pensión mensual. Solo una incapacidad total (100%) genera una pensión vitalicia del 70% del salario.',
    housing: () => 'La vivienda suele ser el patrimonio más grande de una familia; protegerla evita que un solo imprevisto comprometa todo lo demás.',
    education: () => 'Un fondo de educación separado evita que, ante un imprevisto, el plan de estudios de tus hijos dependa de vender otros activos o endeudarte.',
    debt: () => 'Una deuda no es un problema en sí misma; el riesgo aparece cuando nadie más podría cubrirla si tú faltaras.',
    estate: () => 'Solo 4.7% de los adultos en México tiene testamento. La razón más común no es el costo, sino no haberlo hecho un momento prioritario.'
  };

  function computeAllScores() {
    const emergency = scoreEmergency(), insurance = scoreInsurance(), income = scoreIncome(), housing = scoreHousing(), education = scoreEducation(), debt = scoreDebt(), estate = scoreEstate();
    const list = [
      { key: 'emergency', label: 'Fondo de emergencia', ...emergency },
      { key: 'insurance', label: 'Seguros', ...insurance },
      { key: 'income', label: 'Ingresos', ...income },
      { key: 'housing', label: 'Vivienda', ...housing },
      { key: 'education', label: 'Educación', ...education },
      { key: 'debt', label: 'Deudas', ...debt },
      { key: 'estate', label: 'Organización patrimonial', ...estate }
    ];
    const overall = Math.round(list.reduce((s, c) => s + c.score, 0) / list.length);
    return { list, overall };
  }

  function buildReview() {
    const items = [
      ['Perspectiva', state.scope === 'individual' ? 'Individual' : state.scope === 'couple' ? 'Pareja' : 'Hogar'],
      ['Fondo de emergencia', money.format(num(state.liquidSavings))],
      ['Seguro de vida actual', state.hasLifeInsurance === 'yes' ? money.format(num(state.lifeInsuranceAmount)) : 'No cuenta con uno'],
      ['Protección de ingreso', state.incomeProtection === 'covered' ? 'Cubierta' : state.incomeProtection === 'partial' ? 'Parcial' : 'Sin cobertura'],
      ['Seguro de hogar', state.hasHomeInsurance === 'yes' ? 'Sí' : 'No'],
      ['Fondo de educación', state.hasChildren === 'yes' ? (state.hasEducationFund === 'yes' ? 'Sí' : 'No') : 'No aplica'],
      ['Deudas totales', money.format(num(state.totalDebts))],
      ['Testamento', state.hasWill === 'yes' ? 'Sí' : 'No']
    ];
    byId('reviewGrid').innerHTML = items.map(([l, v]) => `<div class="review-item"><span>${l}</span><strong>${v}</strong></div>`).join('');
    byId('reviewNote').textContent = 'Estos son montos aproximados. Todos podrán ajustarse después; esta es solo tu primera fotografía.';
  }

  function animateNumber(el, value, formatter) {
    if (!el) return;
    const duration = 900, start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / duration), e = 1 - Math.pow(1 - p, 3);
      el.textContent = formatter(value * e);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  byId('calculateButton').addEventListener('click', () => { showStep(10); persist(); runAnalysisSequence(); });

  function runAnalysisSequence() {
    byId('analysisSequence').hidden = false; byId('resultsContent').hidden = true;
    const messages = ['Organizando tus 7 áreas de protección…', 'Calculando tu fondo de emergencia y seguros…', 'Comparando contra referencias de México…', 'Preparando tu radar personal…'];
    let i = 0; byId('analysisText').textContent = messages[0];
    const analysisSteps = [...document.querySelectorAll('.analysis-step')];
    const timer = setInterval(() => {
      i++;
      if (i < messages.length) { byId('analysisText').textContent = messages[i]; analysisSteps.forEach((el, n) => el.classList.toggle('is-active', n === i)); }
      else { clearInterval(timer); setTimeout(() => { byId('analysisSequence').hidden = true; byId('resultsContent').hidden = false; renderResults(); }, 350); }
    }, 550);
  }

  function buildRadarSVG(list) {
    const cx = 170, cy = 170, maxR = 128, n = list.length;
    const pointAt = (i, frac) => {
      const angle = (-90 + i * (360 / n)) * Math.PI / 180;
      const r = maxR * frac;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    };
    const gridPolys = [0.25, 0.5, 0.75, 1].map(level =>
      `<polygon points="${list.map((c, i) => pointAt(i, level).join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="1"/>`
    ).join('');
    const axisLines = list.map((c, i) => {
      const [x, y] = pointAt(i, 1);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.09)" stroke-width="1"/>`;
    }).join('');
    const dataPts = list.map((c, i) => pointAt(i, Math.max(0.04, c.score / 100)));
    const dataPoly = `<polygon points="${dataPts.map(p => p.join(',')).join(' ')}" fill="rgba(157,140,255,.28)" stroke="#9d8cff" stroke-width="2.5"/>`;
    const dots = dataPts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#e3dcff" stroke="#1b1130" stroke-width="1.5"/>`).join('');
    const labels = list.map((c, i) => {
      const angle = (-90 + i * (360 / n)) * Math.PI / 180;
      const lx = cx + (maxR + 42) * Math.cos(angle), ly = cy + (maxR + 42) * Math.sin(angle);
      const cos = Math.cos(angle);
      const anchor = cos > 0.2 ? 'start' : cos < -0.2 ? 'end' : 'middle';
      const words = c.label.split(' ');
      const lines = words.length > 1 && words.join(' ').length > 12 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [c.label];
      return lines.map((line, li) => `<text x="${lx}" y="${ly + li * 12 - (lines.length - 1) * 6}" fill="#cdc4e8" font-size="10.5" font-family="Manrope,sans-serif" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle">${line}</text>`).join('');
    }).join('');
    return `<svg viewBox="0 0 340 340" xmlns="http://www.w3.org/2000/svg">${gridPolys}${axisLines}${dataPoly}${dots}${labels}</svg>`;
  }

  function renderResults() {
    const { list, overall } = computeAllScores();
    window.__lastResults = { list, overall };

    byId('radarChart').innerHTML = buildRadarSVG(list);

    byId('radarLegend').innerHTML = list.map(c =>
      `<div class="radar-legend-row"><span>${c.label}</span><div class="radar-legend-track"><i data-width="${c.score}"></i></div><strong>${c.score}</strong></div>`
    ).join('');
    requestAnimationFrame(() => document.querySelectorAll('.radar-legend-track i').forEach(el => el.style.width = `${el.dataset.width}%`));

    animateNumber(byId('overallScoreBadge'), overall, v => `${Math.round(v)}`);
    animateNumber(byId('overallScoreHero'), overall, v => `${Math.round(v)}`);

    let title, text;
    if (overall >= 80) { title = 'Tu protección familiar está sólida en la mayoría de frentes.'; text = 'No es momento de bajar la guardia, pero sí de mantener lo que ya construiste actualizado.'; }
    else if (overall >= 50) { title = 'Tu protección familiar tiene una base, con áreas claras por fortalecer.'; text = 'No es una calificación; es una fotografía para decidir qué revisar primero.'; }
    else { title = 'Hoy hay varios frentes de tu protección familiar sin cubrir.'; text = 'Es información, no un juicio — y ya sabes exactamente por dónde empezar.'; }
    byId('radarStatusTitle').textContent = title;
    byId('radarStatusText').textContent = text;

    const sorted = [...list].sort((a, b) => a.score - b.score);
    const weakest = sorted[0];
    byId('discoveryTitle').textContent = `Tu mayor punto ciego hoy: ${weakest.label}.`;
    byId('discoveryText').textContent = CONTEXT_NOTES[weakest.key] ? CONTEXT_NOTES[weakest.key](weakest) : '';

    const ranked = sorted.slice(0, 3);
    byId('recommendationList').innerHTML = ranked.map((item, i) =>
      `<article class="recommendation-card"><div class="recommendation-card__number">0${i + 1}</div><div><span>Punto ciego</span><strong>${item.label}</strong><small>${CONTEXT_NOTES[item.key] ? CONTEXT_NOTES[item.key](item) : ''}</small></div><div class="recommendation-card__impact">${item.score}/100</div></article>`
    ).join('');

    const ins = list.find(c => c.key === 'insurance');
    byId('dimeTargetResult').textContent = money.format(ins.target);
    byId('dimeCurrentResult').textContent = money.format(ins.current);
    byId('dimeGapResult').textContent = money.format(Math.max(0, ins.target - ins.current));
    byId('dimeGmmResult').textContent = state.hasGMM === 'yes' ? 'Sí cuentas' : 'No cuentas';

    const msg = encodeURIComponent(`Hola Christian, terminé mi Radar de Protección Familiar en GarBa Intelligence (puntaje ${overall}/100) y me gustaría revisar contigo mis resultados.`);
    byId('whatsappLink').href = `https://wa.me/526623072573?text=${msg}`;
  }

  // ---- Exportables ----
  byId('downloadCsv').addEventListener('click', () => {
    const { list, overall } = window.__lastResults || computeAllScores();
    const rows = [['Campo', 'Valor'], ...Object.entries(state).filter(([k]) => k !== 'step'),
      ...list.map(c => [`score_${c.key}`, c.score]),
      ['puntaje_general', overall],
      ['fecha', new Date().toLocaleDateString('es-MX')]];
    const csv = rows.map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `radar-proteccion-${firstName.toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(url);
  });
  byId('printReport').addEventListener('click', () => window.print());

  const panels = {
    guide: { kicker: 'Guía rápida', title: 'Cómo llenar tu Radar', body: '<p>Usa cifras aproximadas; no necesitas cuentas exactas para empezar.</p><p>Si algo no aplica a tu situación (por ejemplo, no tienes hijos), solo sigue adelante — el radar lo interpreta correctamente.</p><p>Tus avances se guardan en este dispositivo.</p>' },
    privacy: { kicker: 'Privacidad', title: 'Tu información es tuya', body: '<p>Tus respuestas se almacenan únicamente en este navegador mediante almacenamiento local.</p><p>GarBa Intelligence no recibe ni almacena estos datos en una base de datos.</p>' },
    scopeHelp: { kicker: 'Perspectiva', title: 'Individual, pareja u hogar', body: '<p>Esto solo ayuda a interpretar correctamente tus cifras. Puedes cambiarlo después si tu situación cambia.</p>' },
    manageData: { kicker: 'Tu información', title: 'Administrar mi información', body: `<p class="manage-intro">Tú tienes el control. Elige qué deseas hacer con la información guardada en este dispositivo.</p><div class="manage-actions"><button type="button" class="manage-action" id="manageDownloadData"><span class="manage-action__icon">↓</span><span><strong>Descargar mis datos</strong><small>Guarda una copia en CSV compatible con Excel.</small></span><i>→</i></button><button type="button" class="manage-action" id="manageDownloadReport"><span class="manage-action__icon">▤</span><span><strong>Descargar mi reporte</strong><small>Imprime o guarda como PDF tu lectura actual.</small></span><i>→</i></button><button type="button" class="manage-action manage-action--restart" id="clearProtectionData"><span class="manage-action__icon">↻</span><span><strong>Comenzar un nuevo análisis</strong><small>Elimina únicamente la información del Radar de Protección Familiar.</small></span><i>→</i></button><button type="button" class="manage-action manage-action--danger" id="clearAllGarbaData"><span class="manage-action__icon">⌫</span><span><strong>Eliminar toda mi información</strong><small>Borra el acceso y los datos de todas las herramientas.</small></span><i>→</i></button><button type="button" class="manage-action" id="changeGarbaUser"><span class="manage-action__icon">◎</span><span><strong>Cambiar de usuario</strong><small>Conserva los análisis, pero vuelve a la bienvenida.</small></span><i>→</i></button></div><p class="manage-footnote">Tus datos permanecen localmente en este dispositivo.</p>` }
  };
  function openPanel(key) {
    const p = panels[key] || panels.guide;
    byId('panelKicker').textContent = p.kicker; byId('panelTitle').textContent = p.title; byId('panelBody').innerHTML = p.body;
    byId('sidePanel').hidden = false; document.body.style.overflow = 'hidden';
  }
  function closePanel() { byId('sidePanel').hidden = true; document.body.style.overflow = ''; }

  document.addEventListener('click', event => {
    if (event.target.closest('#manageDownloadData')) { closePanel(); byId('downloadCsv')?.click(); return; }
    if (event.target.closest('#manageDownloadReport')) {
      closePanel();
      if (!document.querySelector('.results-step')?.classList.contains('is-active')) { alertFriendly('Primero termina tu Radar para preparar el reporte.'); return; }
      byId('printReport')?.click(); return;
    }
    if (event.target.closest('#clearProtectionData')) { if (!window.confirm('¿Deseas comenzar un nuevo análisis? Se eliminarán los datos actuales del Radar de Protección Familiar.')) return; localStorage.removeItem(STORAGE_KEY); closePanel(); window.location.reload(); return; }
    if (event.target.closest('#clearAllGarbaData')) { if (!window.confirm('¿Deseas eliminar toda la información de GarBa Intelligence guardada en este navegador?')) return; Object.keys(localStorage).filter(k => k.startsWith('garbaIntelligence.')).forEach(k => localStorage.removeItem(k)); window.location.replace('../'); return; }
    if (event.target.closest('#changeGarbaUser')) { localStorage.removeItem('garbaIntelligence.session.v1'); window.location.replace('../'); }
  });

  load();
})();
