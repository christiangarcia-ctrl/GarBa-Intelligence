(() => {
  const STORAGE_KEY = 'garbaIntelligence.retirement.v1';
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const state = {
    step: 0, scope: '', hasPpr: '', age: '', retirementAge: '', partnerAge: '', pprMonthly: '', pprBalance: '', pprEstimated: false,
    aforeBalance: '', otherSavings: '', homeValue: '', mortgageBalance: '', monthlyIncome: '', monthlyExpenses: '', retirementIncomeGoal: '', possibleIncrease: ''
  };
  const steps = [...document.querySelectorAll('.step')];
  const byId = (id) => document.getElementById(id);
  const num = (value) => Math.max(0, Number(value) || 0);
  const getSession = () => { try { return JSON.parse(localStorage.getItem('garbaIntelligence.session.v1')) || {}; } catch { return {}; } };
  const session = getSession();
  const firstName = (session.fullName || 'Usuario').trim().split(/\s+/)[0];

  function load() {
    try { Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); } catch {}
    Object.keys(state).forEach((key) => {
      const el = byId(key);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = Boolean(state[key]);
      else el.value = state[key] ?? '';
    });
    document.querySelectorAll('[data-choice-group]').forEach(group => {
      const key = group.dataset.choiceGroup;
      group.querySelectorAll('[data-value]').forEach(btn => btn.classList.toggle('is-selected', btn.dataset.value === state[key]));
    });
    updateConditionals(); updateAgePreview(); updateGoalLabel();
    showStep(Math.min(Number(state.step) || 0, 6));
  }

  function persist() {
    state.step = currentStep();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const status = byId('saveStatus');
    if (status) { status.style.opacity = '.45'; setTimeout(() => status.style.opacity = '1', 150); }
  }

  function currentStep() { return steps.findIndex(step => step.classList.contains('is-active')); }
  function showStep(index) {
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    const pct = index >= 7 ? 100 : Math.round((index / 7) * 100);
    byId('progressBar').style.width = `${pct}%`; byId('progressText').textContent = `${pct}%`;
    const labels = ['Bienvenida','Perspectiva','Horizonte','Tu plan','Lo construido','Tu meta','Revisión','Resultado'];
    byId('stepLabel').textContent = labels[index] || 'Resultado';
    const routeIndex = Math.min(5, index === 0 ? 0 : index === 1 ? 1 : index <= 3 ? 2 : index === 4 ? 3 : index <= 6 ? 4 : 5);
    document.querySelectorAll('[data-route-node]').forEach((node, i) => { node.classList.toggle('is-active', i === routeIndex); node.classList.toggle('is-complete', i < routeIndex); });
    byId('routeLine').style.height = `${(routeIndex / 5) * 100}%`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (index === 6) buildReview();
  }

  function validateStep(index) {
    if (index === 1 && !state.scope) return alertFriendly('Elige cómo quieres revisar tu situación.');
    if (index === 2 && (!num(state.age) || !num(state.retirementAge))) return alertFriendly('Agrega tu edad actual y la edad objetivo de retiro.');
    if (index === 2 && num(state.retirementAge) <= num(state.age)) return alertFriendly('La edad de retiro debe ser mayor que tu edad actual.');
    if (index === 3 && !state.hasPpr) return alertFriendly('Indica si ya cuentas con un Plan Personal de Retiro.');
    if (index === 5 && !num(state.retirementIncomeGoal)) return alertFriendly('Agrega un ingreso mensual deseado o usa la estimación sugerida.');
    return true;
  }

  function alertFriendly(message) {
    const note = document.createElement('div'); note.className = 'temporary-message'; note.textContent = message;
    Object.assign(note.style,{position:'fixed',left:'50%',bottom:'90px',transform:'translateX(-50%)',zIndex:'200',padding:'12px 16px',borderRadius:'12px',background:'rgba(8,22,36,.96)',border:'1px solid rgba(114,200,255,.3)',color:'#dcebf5',fontSize:'11px',boxShadow:'0 20px 50px rgba(0,0,0,.35)'});
    document.body.appendChild(note); setTimeout(()=>note.remove(),2600); return false;
  }

  document.addEventListener('click', (event) => {
    const next = event.target.closest('[data-next]'); const prev = event.target.closest('[data-prev]');
    if (next) { const i=currentStep(); if(validateStep(i)){ showStep(Math.min(i+1,6)); persist(); } }
    if (prev) { showStep(Math.max(currentStep()-1,0)); persist(); }
    const choice = event.target.closest('[data-choice-group] [data-value]');
    if (choice) { const group=choice.closest('[data-choice-group]'); state[group.dataset.choiceGroup]=choice.dataset.value; group.querySelectorAll('[data-value]').forEach(btn=>btn.classList.toggle('is-selected',btn===choice)); updateConditionals(); updateGoalLabel(); persist(); }
    const open = event.target.closest('[data-open-panel]'); if (open) openPanel(open.dataset.openPanel);
    if (event.target.closest('[data-close-panel]')) closePanel();
  });

  document.querySelectorAll('input').forEach(input => input.addEventListener('input', () => { state[input.id] = input.type === 'checkbox' ? input.checked : input.value; updateAgePreview(); persist(); }));

  function updateConditionals() {
    byId('partnerAgeBlock').hidden = !(state.scope === 'couple');
    byId('pprFields').hidden = !['yes','multiple'].includes(state.hasPpr);
  }
  function updateGoalLabel() {
    byId('incomeLabel').textContent = state.scope === 'household' ? 'Ingreso mensual de tu hogar' : state.scope === 'couple' ? 'Ingreso mensual conjunto' : 'Tu ingreso mensual';
  }
  function updateAgePreview() {
    const years = num(byId('retirementAge')?.value) - num(byId('age')?.value);
    byId('yearsPreview').textContent = years > 0 ? `Tienes aproximadamente ${years} años para seguir construyendo tu Ruta.` : 'Completa ambas edades para conocer tu horizonte.';
  }

  byId('suggestGoal').addEventListener('click', () => {
    const expenses = num(byId('monthlyExpenses').value); const income = num(byId('monthlyIncome').value);
    const suggestion = Math.round((expenses || income * .7 || 30000) / 500) * 500;
    byId('retirementIncomeGoal').value = suggestion; state.retirementIncomeGoal = suggestion; persist();
    byId('goalHelper').querySelector('span').textContent = `Usamos ${money.format(suggestion)} como una primera referencia. Puedes cambiarla.`;
  });

  function buildReview() {
    const items = [
      ['Perspectiva', state.scope === 'individual' ? 'Individual' : state.scope === 'couple' ? 'Pareja' : 'Hogar'],
      ['Horizonte', `${num(state.retirementAge)-num(state.age)} años`],
      ['PPR actual', ['yes','multiple'].includes(state.hasPpr) ? money.format(num(state.pprBalance)) : 'No incluido'],
      ['AFORE', num(state.aforeBalance) ? money.format(num(state.aforeBalance)) : 'Pendiente'],
      ['Otros recursos', money.format(num(state.otherSavings))],
      ['Meta mensual', money.format(num(state.retirementIncomeGoal))]
    ];
    byId('reviewGrid').innerHTML = items.map(([label,value]) => `<div class="review-item"><span>${label}</span><strong>${value}</strong></div>`).join('');
    const approximate = state.pprEstimated ? 1 : 0; const pending = num(state.aforeBalance) ? 0 : 1;
    byId('reviewNote').textContent = `Utilizaremos ${approximate ? '1 dato aproximado' : 'los datos proporcionados'}${pending ? ' y el saldo de AFORE quedará fuera de esta primera lectura' : ''}. Podrás actualizar todo después.`;
  }

  function projection(extraMonthly = 0, extraYears = 0) {
    const years = Math.max(1, num(state.retirementAge) - num(state.age) + num(extraYears)); const months = years * 12;
    const annualReturn = .065; const monthlyReturn = Math.pow(1+annualReturn,1/12)-1;
    const startingLiquid = num(state.pprBalance)+num(state.aforeBalance)+num(state.otherSavings);
    const monthly = (['yes','multiple'].includes(state.hasPpr) ? num(state.pprMonthly) : 0) + extraMonthly;
    const futureStarting = startingLiquid * Math.pow(1+monthlyReturn,months);
    const futureContrib = monthlyReturn ? monthly * ((Math.pow(1+monthlyReturn,months)-1)/monthlyReturn) : monthly*months;
    const futureNominal = futureStarting + futureContrib;
    const inflation = .04; const futureReal = futureNominal / Math.pow(1+inflation,years);
    const annualWithdrawal = futureReal * .045; const monthlyIncome = annualWithdrawal / 12;
    const homeEquity = Math.max(0,num(state.homeValue)-num(state.mortgageBalance));
    return { years, startingLiquid, monthly, futureReal, monthlyIncome, homeEquity, totalPatrimony: startingLiquid+homeEquity };
  }

  byId('calculateButton').addEventListener('click', () => { showStep(7); persist(); runAnalysis(); });

  function runAnalysis() {
    byId('analysisSequence').hidden=false; byId('resultsContent').hidden=true;
    const phrases=['Organizando lo que ya has construido…','Proyectando distintos escenarios…','Identificando decisiones que podrían acercarte…','Preparando tu lectura personalizada…'];
    const visualSteps=[...document.querySelectorAll('.analysis-step')];
    let i=0;
    byId('analysisText').textContent=phrases[0];
    visualSteps.forEach((step,index)=>{step.classList.toggle('is-active',index===0);step.classList.remove('is-complete');});
    const timer=setInterval(()=>{
      visualSteps[i]?.classList.remove('is-active');
      visualSteps[i]?.classList.add('is-complete');
      i++;
      if(i<phrases.length){
        byId('analysisText').textContent=phrases[i];
        visualSteps[i]?.classList.add('is-active');
      } else {
        clearInterval(timer);
        setTimeout(renderResults,420);
      }
    },720);
  }

  function animateNumber(el, target, formatter=money.format, duration=1000) {
    const start=performance.now(); function tick(now){const p=Math.min(1,(now-start)/duration);const eased=1-Math.pow(1-p,3);el.textContent=formatter(target*eased);if(p<1)requestAnimationFrame(tick);} requestAnimationFrame(tick);
  }

  function renderResults() {
    const r=projection(0); const goal=num(state.retirementIncomeGoal); const coverage=goal ? Math.min(999,Math.round(r.monthlyIncome/goal*100)) : 0;
    byId('analysisSequence').hidden=true; byId('resultsContent').hidden=false;
    const gap=Math.max(0,goal-r.monthlyIncome);
    animateNumber(byId('totalPatrimony'),r.totalPatrimony); animateNumber(byId('totalPatrimonyTop'),r.totalPatrimony);
    animateNumber(byId('retirementResources'),r.startingLiquid); animateNumber(byId('monthlyGap'),gap);
    animateNumber(byId('estimatedIncome'),r.monthlyIncome); animateNumber(byId('goalResult'),goal);
    animateNumber(byId('coverageResult'),coverage,v=>`${Math.round(v)}%`,850); byId('yearsResult').textContent=`${r.years} años`;
    const coverageLabel=coverage>=100?'Meta cubierta':coverage>=75?'Buen avance':coverage>=50?'En construcción':'Conviene fortalecerla'; byId('coverageLabel').textContent=coverageLabel;
    const fifths=Math.max(0,Math.min(5,Math.round(coverage/20)));
    byId('coveragePlain').textContent=`${fifths} de cada 5`;
    let statusTitle,statusText;
    if(coverage>=100){statusTitle='Tu Ruta podría cubrir la meta que elegiste.';statusText='Con la información actual, tu escenario estimado alcanza el ingreso mensual que deseas. Ahora conviene revisar la calidad, disponibilidad y duración de esos recursos.';}
    else if(coverage>=75){statusTitle='Vas cerca de tu objetivo.';statusText=`Tu escenario actual podría cubrir aproximadamente ${coverage}% de tu meta. La diferencia estimada es de ${money.format(gap)} mensuales y podría reducirse con ajustes graduales.`;}
    else if(coverage>=50){statusTitle='Tu Ruta está avanzando, pero todavía necesita fortalecerse.';statusText=`Hoy podrías cubrir aproximadamente ${coverage}% del ingreso que deseas. Ya existe una base; el siguiente paso es identificar qué combinación de decisiones puede reducir la diferencia de ${money.format(gap)} mensuales.`;}
    else{statusTitle='Tu Ruta está en una etapa inicial de construcción.';statusText=`Con los datos actuales, tu estrategia podría cubrir aproximadamente ${coverage}% de tu meta. Esto no significa que estés mal: significa que todavía hay tiempo y decisiones que vale la pena explorar.`;}
    byId('routeStatusTitle').textContent=statusTitle; byId('routeStatusText').textContent=statusText;
    byId('incomeNarrative').textContent=`Los recursos destinados al retiro podrían representar alrededor de ${money.format(r.monthlyIncome)} mensuales en dinero de hoy. La vivienda se muestra como patrimonio, pero no se utilizó como ingreso mientras decidas conservarla.`;
    const components=[['PPR',num(state.pprBalance)],['AFORE',num(state.aforeBalance)],['Otros recursos',num(state.otherSavings)],['Vivienda neta',r.homeEquity]]; const max=Math.max(...components.map(x=>x[1]),1);
    byId('patrimonyBreakdown').innerHTML=components.map(([label,value])=>`<div class="breakdown-row"><span>${label}</span><div class="breakdown-track"><i data-width="${value/max*100}"></i></div><strong>${money.format(value)}</strong></div>`).join('');
    requestAnimationFrame(()=>document.querySelectorAll('.breakdown-track i').forEach(el=>el.style.width=`${el.dataset.width}%`));
    let title,text;
    if(coverage>=100){title='Tu estrategia podría cubrir la meta que elegiste.';text='La prioridad ya no sería únicamente acumular más, sino revisar la calidad de los recursos, su disponibilidad y la forma en que deseas utilizarlos.';}
    else if(coverage>=70){title='Tu Ruta ya tiene una base importante.';text=`Hoy podrías cubrir aproximadamente ${coverage}% de tu meta. Un ajuste gradual y sostenido puede reducir la diferencia sin exigir un cambio drástico.`;}
    else{title='Tienes claridad sobre la distancia que falta recorrer.';text=`La proyección actual cubriría aproximadamente ${coverage}% de tu meta. Esto no es una calificación: es un punto de partida para explorar decisiones realistas.`;}
    byId('discoveryTitle').textContent=title;byId('discoveryText').textContent=text;
    buildRecommendations(r,goal,coverage);
    byId('baseIncomeComparison').textContent=money.format(r.monthlyIncome); byId('scenarioContribution').value=num(state.possibleIncrease); byId('scenarioYears').value=0; updateScenario();
    const actions=[]; if(!num(state.aforeBalance))actions.push(['Esta semana','Consulta tu saldo actualizado de AFORE para completar la lectura.']); if(num(state.possibleIncrease)>0)actions.push(['Próximos meses',`Prueba un incremento de ${money.format(num(state.possibleIncrease))} y confirma que sea cómodo para tu flujo.`]); else actions.push(['Próximos meses','Explora un incremento pequeño que puedas mantener sin presión.']); actions.push(['Próxima revisión','Actualiza tu Ruta cuando cambie tu ingreso, aportación o situación familiar.']);
    byId('actionList').innerHTML=actions.slice(0,3).map(([when,action])=>`<div class="action-item"><span>${when}</span><strong>${action}</strong></div>`).join('');
    const msg=encodeURIComponent(`Hola Christian, terminé mi Ruta de Retiro en GarBa Intelligence y me gustaría revisar contigo mis resultados.`); byId('whatsappLink').href=`https://wa.me/526623072573?text=${msg}`;
  }

  function buildRecommendations(base, goal, coverage) {
    const options=[];
    const currentIncrease=num(state.possibleIncrease)||1000;
    const increaseScenario=projection(currentIncrease,0);
    const increaseImpact=Math.max(0,increaseScenario.monthlyIncome-base.monthlyIncome);
    if(currentIncrease>0) options.push({title:'Probar un aumento gradual',text:`Explora una aportación adicional de ${money.format(currentIncrease)} mensuales y confirma que sea sostenible.`,impact:`+${money.format(increaseImpact)} al mes estimados`});
    const twoYears=projection(0,2); const yearsImpact=Math.max(0,twoYears.monthlyIncome-base.monthlyIncome);
    options.push({title:'Comparar dos años adicionales',text:'Dar más tiempo a la estrategia puede sumar aportaciones y crecimiento sin exigir todo el esfuerzo hoy.',impact:`+${money.format(yearsImpact)} al mes estimados`});
    if(!num(state.aforeBalance)) options.unshift({title:'Incorporar tu saldo de AFORE',text:'Hoy no se incluyó. Agregar el dato real puede cambiar de manera importante la lectura.',impact:'Mejora la precisión'});
    else if(num(state.homeValue)>0) options.push({title:'Definir el papel de tu vivienda',text:'Tu vivienda fortalece tu patrimonio, pero solo generaría ingreso si decides utilizarla de alguna forma en el retiro.',impact:'Escenario opcional'});
    if(coverage<70 && goal>0) options.push({title:'Comparar una meta ideal y una cómoda',text:'No para renunciar a tu objetivo, sino para entender qué nivel de ingreso cubre cada escenario.',impact:'Más perspectiva'});
    byId('recommendationList').innerHTML=options.slice(0,3).map((item,i)=>`<article class="recommendation-card"><div class="recommendation-card__number">0${i+1}</div><div><span>Posibilidad para explorar</span><strong>${item.title}</strong><small>${item.text}</small></div><div class="recommendation-card__impact">${item.impact}</div></article>`).join('');
  }

  function updateScenario() {
    const extra=num(byId('scenarioContribution').value); const extraYears=num(byId('scenarioYears').value); const base=projection(0,0); const scenario=projection(extra,extraYears);
    byId('scenarioContributionLabel').textContent=money.format(extra); byId('scenarioYearsLabel').textContent=`${extraYears} ${extraYears===1?'año':'años'}`; byId('scenarioIncomeComparison').textContent=money.format(scenario.monthlyIncome);
    const diff=scenario.monthlyIncome-base.monthlyIncome; byId('scenarioImpact').textContent=diff>0?`La combinación podría representar ${money.format(diff)} adicionales al mes.`:'Sin cambios todavía';
  }
  byId('scenarioContribution').addEventListener('input',updateScenario); byId('scenarioYears').addEventListener('input',updateScenario); byId('resetScenario').addEventListener('click',()=>{byId('scenarioContribution').value=0;byId('scenarioYears').value=0;updateScenario();});

  byId('downloadCsv').addEventListener('click',()=>{
    const r=projection(0); const rows=[['Campo','Valor'],...Object.entries(state).filter(([k])=>k!=='step').map(([k,v])=>[k,v]),['patrimonio_considerado',r.totalPatrimony],['ingreso_mensual_estimado',r.monthlyIncome],['fecha',new Date().toLocaleDateString('es-MX')]];
    const csv=rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`ruta-de-retiro-${firstName.toLowerCase()}.csv`;a.click();URL.revokeObjectURL(url);
  });
  byId('printReport').addEventListener('click',()=>window.print());

  const panels={
    guide:{kicker:'Guía rápida',title:'La ayuda siempre estará cerca',body:'<p>Cuando veas el símbolo <strong>ⓘ</strong>, tócalo para encontrar ejemplos o entender cómo estimar una respuesta.</p><p>No necesitas terminar hoy. Tus avances permanecen en este dispositivo.</p><p>Al finalizar podrás descargar tus datos y guardar el reporte como PDF.</p>'},
    privacy:{kicker:'Privacidad',title:'Tu información es tuya',body:'<p>En esta etapa, tus respuestas se almacenan únicamente en este navegador mediante almacenamiento local.</p><p>GarBa Intelligence no recibe ni almacena estos datos en una base de datos.</p><p>Al borrar los datos del navegador o cerrar la sesión eliminando la información local, el avance puede perderse.</p>'},
    scopeHelp:{kicker:'Perspectiva',title:'Individual, pareja u hogar',body:'<p>Los ingresos y gastos pueden revisarse de manera conjunta. Sin embargo, productos como PPR y AFORE pertenecen a una persona y deben conservar su titularidad.</p><p>Estar casado no te obliga a elegir una lectura familiar.</p>'},
    homeHelp:{kicker:'Vivienda',title:'Patrimonio no siempre significa ingreso',body:'<p>Tu vivienda puede fortalecer mucho tu patrimonio, pero no genera automáticamente dinero mensual durante el retiro.</p><p>Por eso mostramos por separado el valor neto de la vivienda y los recursos que podrían producir ingresos.</p>'},
    manageData:{kicker:'Tu información',title:'Administrar mi información',body:`
      <p class="manage-intro">Tú tienes el control. Elige qué deseas hacer con la información guardada en este dispositivo.</p>
      <div class="manage-actions">
        <button type="button" class="manage-action" id="manageDownloadData"><span class="manage-action__icon">↓</span><span><strong>Descargar mis datos</strong><small>Guarda una copia en CSV compatible con Excel.</small></span><i>→</i></button>
        <button type="button" class="manage-action" id="manageDownloadReport"><span class="manage-action__icon">▤</span><span><strong>Descargar mi reporte</strong><small>Imprime o guarda como PDF tu lectura actual.</small></span><i>→</i></button>
        <button type="button" class="manage-action manage-action--restart" id="clearRetirementData"><span class="manage-action__icon">↻</span><span><strong>Comenzar un nuevo análisis</strong><small>Elimina únicamente la información de Mi Ruta de Retiro.</small></span><i>→</i></button>
        <button type="button" class="manage-action manage-action--danger" id="clearAllGarbaData"><span class="manage-action__icon">⌫</span><span><strong>Eliminar toda mi información</strong><small>Borra el acceso y los datos de todas las herramientas en este navegador.</small></span><i>→</i></button>
        <button type="button" class="manage-action" id="changeGarbaUser"><span class="manage-action__icon">◎</span><span><strong>Cambiar de usuario</strong><small>Conserva los análisis, pero vuelve a la pantalla de bienvenida.</small></span><i>→</i></button>
      </div>
      <p class="manage-footnote">Tus datos no se envían a GarBa Intelligence; permanecen localmente en este dispositivo.</p>`}
  };
  function openPanel(key){const p=panels[key]||panels.guide;byId('panelKicker').textContent=p.kicker;byId('panelTitle').textContent=p.title;byId('panelBody').innerHTML=p.body;byId('sidePanel').hidden=false;document.body.style.overflow='hidden';}
  function closePanel(){byId('sidePanel').hidden=true;document.body.style.overflow='';}

  document.addEventListener('click',(event)=>{
    if(event.target.closest('#manageDownloadData')){
      closePanel();
      byId('downloadCsv')?.click();
      return;
    }
    if(event.target.closest('#manageDownloadReport')){
      closePanel();
      const resultStep=document.querySelector('.results-step');
      if(!resultStep?.classList.contains('is-active')){
        window.alert('Primero termina tu Ruta para preparar el reporte.');
        return;
      }
      byId('printReport')?.click();
      return;
    }
    if(event.target.closest('#clearRetirementData')){
      const ok=window.confirm('¿Deseas comenzar un nuevo análisis? Se eliminarán únicamente los datos de Mi Ruta de Retiro.');
      if(!ok)return;
      localStorage.removeItem(STORAGE_KEY);
      closePanel();
      window.location.reload();
      return;
    }
    if(event.target.closest('#clearAllGarbaData')){
      const ok=window.confirm('¿Deseas eliminar toda la información de GarBa Intelligence guardada en este navegador? Esta acción no puede deshacerse.');
      if(!ok)return;
      Object.keys(localStorage).filter(k=>k.startsWith('garbaIntelligence.')).forEach(k=>localStorage.removeItem(k));
      window.location.replace('../');
      return;
    }
    if(event.target.closest('#changeGarbaUser')){
      localStorage.removeItem('garbaIntelligence.session.v1');
      window.location.replace('../');
    }
  });


  load();
})();
