(() => {
  const STORAGE_KEY = 'garbaIntelligence.control.v1';
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const FREQ = { daily: 30, weekday: 22, weekend: 8, occasional: 4 };
  const HORMIGA_CATEGORIES = [
    { key: 'coffee', label: 'Café o bebidas fuera de casa', freqId: 'hCoffeeFreq', costId: 'hCoffeeCost' },
    { key: 'food', label: 'Comida rápida o para llevar', freqId: 'hFoodFreq', costId: 'hFoodCost' },
    { key: 'apps', label: 'Apps de transporte (Uber/Didi)', freqId: 'hAppsFreq', costId: 'hAppsCost' },
    { key: 'treats', label: 'Antojos y conveniencia', freqId: 'hTreatsFreq', costId: 'hTreatsCost' },
    { key: 'smokes', label: 'Cigarros o vapeo', freqId: 'hSmokesFreq', costId: 'hSmokesCost' },
    { key: 'other', label: 'Otro gasto pequeño frecuente', freqId: 'hOtherFreq', costId: 'hOtherCost' }
  ];

  const state = {
    step: 0, scope: '', comfort: '', clarity: '',
    monthlyIncome: '', extraIncome: '',
    housingPayment: '', utilitiesPayment: '', transportFixed: '', insurancePayment: '', tuitionPayment: '', otherFixedPayment: '',
    hCoffeeFreq: '', hCoffeeCost: '', hFoodFreq: '', hFoodCost: '', hAppsFreq: '', hAppsCost: '',
    hTreatsFreq: '', hTreatsCost: '', hSmokesFreq: '', hSmokesCost: '', hOtherFreq: '', hOtherCost: '', hSubs: '',
    hasCreditCard: '', creditCardMin: '', creditCardActual: '', otherDebtPayment: '',
    currentSavings: ''
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
    updateIncomeLabel();
    // Nunca restaurar directo en el paso de Resultado (requiere recalcular vía el botón);
    // como máximo, regresar al paso de Revisión.
    showStep(Math.min(Number(state.step) || 0, steps.length - 2));
  }

  function persist() {
    state.step = currentStep();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const status = byId('saveStatus');
    if (status) { status.style.opacity = '.45'; setTimeout(() => status.style.opacity = '1', 150); }
  }

  function currentStep() { return steps.findIndex(s => s.classList.contains('is-active')); }

  const NODE_LABELS = ['Inicio', 'Perspectiva', 'Ingresos y gastos', 'Hormiga y deudas', 'Ahorro', 'Resultado'];
  const NODE_MAP = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5];
  const STEP_LABELS = ['Bienvenida', 'Perspectiva', 'Percepción', 'Ingresos', 'Gastos fijos', 'Gastos hormiga', 'Deudas', 'Ahorro', 'Revisión', 'Resultado'];

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
    if (index === 8) buildReview();
  }

  function alertFriendly(message) {
    const note = document.createElement('div');
    note.className = 'temporary-message';
    note.textContent = message;
    Object.assign(note.style, { position: 'fixed', left: '50%', bottom: '90px', transform: 'translateX(-50%)', zIndex: '200', padding: '12px 16px', borderRadius: '12px', background: 'rgba(26,13,17,.96)', border: '1px solid rgba(251,113,133,.3)', color: '#f4dbdd', fontSize: '11px', boxShadow: '0 20px 50px rgba(0,0,0,.35)' });
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 2600);
    return false;
  }

  function validateStep(index) {
    if (index === 1 && !state.scope) return alertFriendly('Elige cómo quieres revisar tu situación.');
    if (index === 2 && (!state.comfort || !state.clarity)) return alertFriendly('Elige una opción en cada pregunta para continuar.');
    if (index === 3 && !num(state.monthlyIncome)) return alertFriendly('Agrega tu ingreso mensual para continuar.');
    if (index === 6 && !state.hasCreditCard) return alertFriendly('Indica si usas tarjeta de crédito actualmente.');
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
      updateConditionals(); updateIncomeLabel(); persist();
    }
    const open = event.target.closest('[data-open-panel]'); if (open) openPanel(open.dataset.openPanel);
    if (event.target.closest('[data-close-panel]')) closePanel();
  });

  document.querySelectorAll('input,select').forEach(input => input.addEventListener('input', () => {
    state[input.id] = input.type === 'checkbox' ? input.checked : input.value;
    updateConditionals(); persist();
  }));

  function updateConditionals() {
    const ccBlock = byId('creditCardFields'); if (ccBlock) ccBlock.hidden = state.hasCreditCard !== 'yes';
  }
  function updateIncomeLabel() {
    const label = byId('incomeLabel'); if (!label) return;
    label.textContent = state.scope === 'household' ? 'Ingreso mensual de tu hogar' : state.scope === 'couple' ? 'Ingreso mensual conjunto' : 'Tu ingreso mensual';
  }

  // ---- Cálculos ----
  function hormigaBreakdown() {
    const items = HORMIGA_CATEGORIES.map(cat => {
      const freq = state[cat.freqId], cost = num(state[cat.costId]);
      const monthly = (FREQ[freq] || 0) * cost;
      return { key: cat.key, label: cat.label, monthly, annual: monthly * 12 };
    });
    const subsMonthly = num(state.hSubs);
    if (subsMonthly > 0) items.push({ key: 'subs', label: 'Suscripciones y streaming', monthly: subsMonthly, annual: subsMonthly * 12 });
    return items;
  }

  function computeResults() {
    const totalIncome = num(state.monthlyIncome) + num(state.extraIncome);
    const totalFixed = num(state.housingPayment) + num(state.utilitiesPayment) + num(state.transportFixed) + num(state.insurancePayment) + num(state.tuitionPayment) + num(state.otherFixedPayment);
    const hormigaItems = hormigaBreakdown();
    const totalHormigaMonthly = hormigaItems.reduce((s, i) => s + i.monthly, 0);
    const totalDebtMonthly = (state.hasCreditCard === 'yes' ? num(state.creditCardActual) : 0) + num(state.otherDebtPayment);
    const declaredSavings = num(state.currentSavings);
    const capacityReal = totalIncome - totalFixed - totalHormigaMonthly - totalDebtMonthly;
    const pct = v => totalIncome ? Math.round((v / totalIncome) * 100) : 0;
    return {
      totalIncome, totalFixed, totalHormigaMonthly, totalHormigaAnnual: totalHormigaMonthly * 12,
      totalDebtMonthly, declaredSavings, capacityReal, hormigaItems,
      pctFixed: pct(totalFixed), pctHormiga: pct(totalHormigaMonthly), pctDebt: pct(totalDebtMonthly), pctCapacity: pct(Math.max(0, capacityReal))
    };
  }

  function buildReview() {
    const r = computeResults();
    const items = [
      ['Perspectiva', state.scope === 'individual' ? 'Individual' : state.scope === 'couple' ? 'Pareja' : 'Hogar'],
      ['Ingreso total declarado', money.format(r.totalIncome)],
      ['Gastos fijos', money.format(r.totalFixed)],
      ['Gastos hormiga (mensual)', money.format(r.totalHormigaMonthly)],
      ['Deudas (pago mensual)', money.format(r.totalDebtMonthly)],
      ['Ahorro actual declarado', money.format(r.declaredSavings)]
    ];
    byId('reviewGrid').innerHTML = items.map(([l, v]) => `<div class="review-item"><span>${l}</span><strong>${v}</strong></div>`).join('');
    byId('reviewNote').textContent = 'Estos son montos aproximados. Todos podrán ajustarse después; esta es solo tu primera fotografía.';
  }

  function animateNumber(el, value) {
    if (!el) return;
    const duration = 900, start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / duration), e = 1 - Math.pow(1 - p, 3);
      el.textContent = money.format(value * e);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  byId('calculateButton').addEventListener('click', () => { showStep(9); persist(); runAnalysisSequence(); });

  function runAnalysisSequence() {
    byId('analysisSequence').hidden = false; byId('resultsContent').hidden = true;
    const messages = ['Organizando tus ingresos y gastos…', 'Calculando tus gastos hormiga…', 'Comparando contra una referencia sana…', 'Preparando una lectura clara y sin culpas…'];
    let i = 0; byId('analysisText').textContent = messages[0];
    const analysisSteps = [...document.querySelectorAll('.analysis-step')];
    const timer = setInterval(() => {
      i++;
      if (i < messages.length) { byId('analysisText').textContent = messages[i]; analysisSteps.forEach((el, n) => el.classList.toggle('is-active', n === i)); }
      else { clearInterval(timer); setTimeout(() => { byId('analysisSequence').hidden = true; byId('resultsContent').hidden = false; renderResults(); }, 350); }
    }, 550);
  }

  function renderResults() {
    const r = computeResults();

    animateNumber(byId('flowIncomeTotal'), r.totalIncome);
    animateNumber(byId('flowFixedTotal'), r.totalFixed);
    animateNumber(byId('flowCapacityTop'), r.capacityReal);
    animateNumber(byId('flowRingTotal'), r.totalIncome);
    animateNumber(byId('capacityHero'), Math.max(0, r.capacityReal));

    let badgeTitle, badgeText;
    if (r.capacityReal >= r.declaredSavings && r.capacityReal > 0) { badgeTitle = 'Tu flujo tiene margen disponible.'; badgeText = `Después de tus gastos fijos, hormiga y deudas, hoy podrías estar liberando ${money.format(r.capacityReal)} al mes.`; }
    else if (r.capacityReal < 0) { badgeTitle = 'Tu flujo hoy está apretado.'; badgeText = 'Tus gastos registrados superan tu ingreso. No es un juicio: es información útil para decidir qué mover primero.'; }
    else { badgeTitle = 'Tu flujo está prácticamente equilibrado.'; badgeText = 'Hay poco margen libre hoy. Explora las oportunidades para encontrar espacio adicional.'; }
    byId('flowStatusTitle').textContent = badgeTitle;
    byId('flowStatusText').textContent = badgeText;
    byId('capacityBadge').textContent = money.format(Math.max(0, r.capacityReal));

    // Anillo de distribución
    const segments = [
      { label: 'Necesidades', value: r.totalFixed, color: '#f4a261' },
      { label: 'Gastos hormiga', value: r.totalHormigaMonthly, color: '#fda4af' },
      { label: 'Deudas', value: r.totalDebtMonthly, color: '#fb7185' },
      { label: 'Disponible / ahorro', value: Math.max(0, r.capacityReal), color: '#e8c47b' }
    ];
    const totalRing = segments.reduce((s, x) => s + x.value, 0) || 1;
    let acc = 0;
    const gradientParts = segments.map(seg => { const start = acc / totalRing * 360; acc += seg.value; const end = acc / totalRing * 360; return `${seg.color} ${start}deg ${end}deg`; });
    byId('flowRing').style.background = `conic-gradient(${gradientParts.join(',')})`;
    const max = Math.max(...segments.map(s => s.value), 1);
    byId('flowBreakdown').innerHTML = segments.map(seg => `<div class="breakdown-row"><span>${seg.label}</span><div class="breakdown-track"><i data-width="${seg.value / max * 100}" style="background:${seg.color}"></i></div><strong>${money.format(seg.value)}</strong></div>`).join('');
    requestAnimationFrame(() => document.querySelectorAll('.breakdown-track i').forEach(el => el.style.width = `${el.dataset.width}%`));

    // Comparación con benchmark 50/30/20
    byId('benchFixed').textContent = `${r.pctFixed}%`;
    byId('benchHormiga').textContent = `${r.pctHormiga}%`;
    byId('benchDebtSavings').textContent = `${r.pctDebt + r.pctCapacity}%`;

    // Discovery: percepción vs realidad
    let discTitle, discText;
    const hormigaShare = r.pctHormiga;
    if (state.clarity === 'clear' && hormigaShare >= 8) { discTitle = 'Dijiste que tenías claridad, y aún así apareció un margen.'; discText = `Tus gastos hormiga representan cerca de ${hormigaShare}% de tu ingreso (${money.format(r.totalHormigaAnnual)} al año). No es un error, solo algo que probablemente no habías sumado así.`; }
    else if (state.clarity !== 'clear' && hormigaShare < 8) { discTitle = 'Tu intuición no estaba tan lejos.'; discText = 'Tus gastos pequeños representan una porción moderada de tu ingreso. El siguiente paso es decidir qué hacer con tu capacidad de ahorro.'; }
    else { discTitle = 'Ya tienes una fotografía clara de tu mes.'; discText = `Tus gastos hormiga representan ${money.format(r.totalHormigaMonthly)} al mes, esto es, ${money.format(r.totalHormigaAnnual)} al año.`; }
    byId('discoveryTitle').textContent = discTitle;
    byId('discoveryText').textContent = discText;

    // Método
    byId('methodFixedResult').textContent = money.format(r.totalFixed);
    byId('methodHormigaResult').textContent = money.format(r.totalHormigaMonthly);
    byId('methodDebtResult').textContent = money.format(r.totalDebtMonthly);
    byId('methodSavingsResult').textContent = money.format(r.declaredSavings);

    // Ranking de oportunidades (top 3 por impacto anual)
    const ranked = [...r.hormigaItems].filter(i => i.monthly > 0).sort((a, b) => b.annual - a.annual).slice(0, 3);
    byId('recommendationList').innerHTML = ranked.length
      ? ranked.map((item, i) => `<article class="recommendation-card"><div class="recommendation-card__number">0${i + 1}</div><div><span>Punto de fuga</span><strong>${item.label}</strong><small>Representa ${money.format(item.monthly)} al mes.</small></div><div class="recommendation-card__impact">${money.format(item.annual)} al año</div></article>`).join('')
      : '<div class="review-note">No identificamos gastos hormiga significativos en esta primera lectura. Puedes actualizarlo cuando quieras.</div>';

    // Simulador
    const top = ranked[0];
    const simSection = byId('simulatorSection');
    if (top) {
      simSection.hidden = false;
      byId('simulatorLabel').textContent = top.label;
      byId('scenarioReduction').value = 0;
      updateScenario(top);
    } else { simSection.hidden = true; }

    const msg = encodeURIComponent('Hola Christian, terminé mi Control Financiero Mensual en GarBa Intelligence y me gustaría revisar contigo mis resultados.');
    byId('whatsappLink').href = `https://wa.me/526623072573?text=${msg}`;

    window.__lastResults = r;
  }

  function updateScenario(topItem) {
    if (!topItem) return;
    const reduction = num(byId('scenarioReduction').value);
    const freed = topItem.monthly * (reduction / 100);
    byId('scenarioReductionLabel').textContent = `${reduction}%`;
    byId('scenarioFreedMonthly').textContent = money.format(freed);
    byId('scenarioFreedAnnual').textContent = money.format(freed * 12);
    const r = window.__lastResults || computeResults();
    byId('scenarioNewCapacity').textContent = money.format(r.capacityReal + freed);
  }
  byId('scenarioReduction').addEventListener('input', () => {
    const ranked = [...(window.__lastResults?.hormigaItems || [])].filter(i => i.monthly > 0).sort((a, b) => b.annual - a.annual);
    updateScenario(ranked[0]);
  });

  // ---- Exportables ----
  byId('downloadCsv').addEventListener('click', () => {
    const r = computeResults();
    const rows = [['Campo', 'Valor'], ...Object.entries(state).filter(([k]) => k !== 'step'),
      ['ingreso_total', r.totalIncome], ['gastos_fijos_total', r.totalFixed],
      ['gastos_hormiga_mensual', r.totalHormigaMonthly], ['gastos_hormiga_anual', r.totalHormigaAnnual],
      ['deudas_mensual', r.totalDebtMonthly], ['capacidad_real_ahorro', r.capacityReal],
      ['fecha', new Date().toLocaleDateString('es-MX')]];
    const csv = rows.map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `control-financiero-${firstName.toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(url);
  });

  byId('downloadExcel').addEventListener('click', () => {
    if (typeof XLSX === 'undefined') { alertFriendly('No se pudo cargar el motor de Excel. Intenta de nuevo en unos segundos.'); return; }
    const r = computeResults();
    const monthRows = [
      ['Control Financiero Mensual', firstName],
      ['Fecha', new Date().toLocaleDateString('es-MX')],
      [],
      ['Concepto', 'Monto mensual'],
      ['Ingreso mensual', num(state.monthlyIncome)],
      ['Ingreso extra', num(state.extraIncome)],
      ['Ingreso total', r.totalIncome],
      [],
      ['Vivienda / renta', num(state.housingPayment)],
      ['Servicios', num(state.utilitiesPayment)],
      ['Transporte fijo', num(state.transportFixed)],
      ['Seguros', num(state.insurancePayment)],
      ['Colegiaturas', num(state.tuitionPayment)],
      ['Otro gasto fijo', num(state.otherFixedPayment)],
      ['Gastos fijos totales', r.totalFixed],
      [],
      ...r.hormigaItems.map(i => [i.label, i.monthly]),
      ['Gastos hormiga totales (mensual)', r.totalHormigaMonthly],
      ['Gastos hormiga totales (anual)', r.totalHormigaAnnual],
      [],
      ['Tarjeta de crédito (pago real)', state.hasCreditCard === 'yes' ? num(state.creditCardActual) : 0],
      ['Otros créditos', num(state.otherDebtPayment)],
      ['Deudas totales', r.totalDebtMonthly],
      [],
      ['Ahorro actual declarado', r.declaredSavings],
      ['Capacidad real de ahorro (calculada)', r.capacityReal]
    ];
    const wsMonth = XLSX.utils.aoa_to_sheet(monthRows);
    wsMonth['!cols'] = [{ wch: 34 }, { wch: 18 }];

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthIndex = new Date().getMonth();
    const annualRows = [
      ['Concepto', ...months, 'Total anual', 'Promedio mensual'],
      ['Ingreso total', ...months.map(() => ''), '', ''],
      ['Gastos fijos', ...months.map(() => ''), '', ''],
      ['Gastos hormiga', ...months.map(() => ''), '', ''],
      ['Deudas', ...months.map(() => ''), '', ''],
      ['Ahorro / disponible', ...months.map(() => ''), '', '']
    ];
    annualRows[1][1 + monthIndex] = r.totalIncome;
    annualRows[2][1 + monthIndex] = r.totalFixed;
    annualRows[3][1 + monthIndex] = r.totalHormigaMonthly;
    annualRows[4][1 + monthIndex] = r.totalDebtMonthly;
    annualRows[5][1 + monthIndex] = r.capacityReal;
    const wsAnnual = XLSX.utils.aoa_to_sheet(annualRows);
    for (let row = 2; row <= 6; row++) {
      wsAnnual[`N${row}`] = { t: 'n', f: `SUM(B${row}:M${row})` };
      wsAnnual[`O${row}`] = { t: 'n', f: `AVERAGE(B${row}:M${row})` };
    }
    wsAnnual['!cols'] = [{ wch: 22 }, ...months.map(() => ({ wch: 11 })), { wch: 13 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsMonth, 'Este mes');
    XLSX.utils.book_append_sheet(wb, wsAnnual, 'Seguimiento anual');
    XLSX.writeFile(wb, `control-financiero-${firstName.toLowerCase()}.xlsx`);
  });

  byId('printReport').addEventListener('click', () => window.print());

  const panels = {
    guide: { kicker: 'Guía rápida', title: 'Cómo llenar tu Control Financiero', body: '<p>Usa cifras aproximadas; no necesitas cuentas exactas para empezar.</p><p>En los gastos pequeños, elige la frecuencia que más se parezca a tu semana típica y un costo promedio por ocasión.</p><p>Cuando veas el símbolo <strong>ⓘ</strong>, tócalo para más contexto.</p><p>Tus avances se guardan en este dispositivo y podrás actualizarlos el próximo mes.</p>' },
    privacy: { kicker: 'Privacidad', title: 'Tu información es tuya', body: '<p>Tus respuestas se almacenan únicamente en este navegador mediante almacenamiento local.</p><p>GarBa Intelligence no recibe ni almacena estos datos en una base de datos.</p>' },
    scopeHelp: { kicker: 'Perspectiva', title: 'Individual, pareja u hogar', body: '<p>Esto solo ayuda a interpretar correctamente tus cifras. Puedes cambiarlo después si tu situación cambia.</p>' },
    hormigaHelp: { kicker: 'Gastos hormiga', title: '¿Por qué preguntamos esto así?', body: '<p>En vez de pedirte que sumes de memoria, calculamos el total por ti a partir de la frecuencia y el costo aproximado por ocasión.</p><p>Esto no es una recomendación de recorte: es solo una fotografía para que decidas con información, no con culpa.</p>' },
    manageData: { kicker: 'Tu información', title: 'Administrar mi información', body: `<p class="manage-intro">Tú tienes el control. Elige qué deseas hacer con la información guardada en este dispositivo.</p><div class="manage-actions"><button type="button" class="manage-action" id="manageDownloadData"><span class="manage-action__icon">↓</span><span><strong>Descargar mis datos</strong><small>Guarda una copia en CSV compatible con Excel.</small></span><i>→</i></button><button type="button" class="manage-action" id="manageDownloadExcel"><span class="manage-action__icon">▦</span><span><strong>Descargar plantilla Excel</strong><small>Incluye seguimiento anual mes a mes.</small></span><i>→</i></button><button type="button" class="manage-action" id="manageDownloadReport"><span class="manage-action__icon">▤</span><span><strong>Descargar mi reporte</strong><small>Imprime o guarda como PDF tu lectura actual.</small></span><i>→</i></button><button type="button" class="manage-action manage-action--restart" id="clearControlData"><span class="manage-action__icon">↻</span><span><strong>Comenzar un nuevo mes</strong><small>Elimina únicamente la información de Control Financiero Mensual.</small></span><i>→</i></button><button type="button" class="manage-action manage-action--danger" id="clearAllGarbaData"><span class="manage-action__icon">⌫</span><span><strong>Eliminar toda mi información</strong><small>Borra el acceso y los datos de todas las herramientas.</small></span><i>→</i></button><button type="button" class="manage-action" id="changeGarbaUser"><span class="manage-action__icon">◎</span><span><strong>Cambiar de usuario</strong><small>Conserva los análisis, pero vuelve a la bienvenida.</small></span><i>→</i></button></div><p class="manage-footnote">Tus datos permanecen localmente en este dispositivo.</p>` }
  };
  function openPanel(key) {
    const p = panels[key] || panels.guide;
    byId('panelKicker').textContent = p.kicker; byId('panelTitle').textContent = p.title; byId('panelBody').innerHTML = p.body;
    byId('sidePanel').hidden = false; document.body.style.overflow = 'hidden';
  }
  function closePanel() { byId('sidePanel').hidden = true; document.body.style.overflow = ''; }

  document.addEventListener('click', event => {
    if (event.target.closest('#manageDownloadData')) { closePanel(); byId('downloadCsv')?.click(); return; }
    if (event.target.closest('#manageDownloadExcel')) { closePanel(); byId('downloadExcel')?.click(); return; }
    if (event.target.closest('#manageDownloadReport')) {
      closePanel();
      if (!document.querySelector('.results-step')?.classList.contains('is-active')) { alertFriendly('Primero termina tu Control Financiero para preparar el reporte.'); return; }
      byId('printReport')?.click(); return;
    }
    if (event.target.closest('#clearControlData')) { if (!window.confirm('¿Deseas comenzar un nuevo mes? Se eliminarán los datos actuales de Control Financiero Mensual.')) return; localStorage.removeItem(STORAGE_KEY); closePanel(); window.location.reload(); return; }
    if (event.target.closest('#clearAllGarbaData')) { if (!window.confirm('¿Deseas eliminar toda la información de GarBa Intelligence guardada en este navegador?')) return; Object.keys(localStorage).filter(k => k.startsWith('garbaIntelligence.')).forEach(k => localStorage.removeItem(k)); window.location.replace('../'); return; }
    if (event.target.closest('#changeGarbaUser')) { localStorage.removeItem('garbaIntelligence.session.v1'); window.location.replace('../'); }
  });

  load();
})();
