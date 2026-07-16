(() => {
  const STORAGE_KEY = 'garbaIntelligence.retirement.v1';
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const ASSUMPTIONS = {
    inflation: 0.04,
    pprReturn: 0.10,
    aforeReturn: 0.0347,
    otherReturn: 0.06,
    retirementReturn: 0.07,
    retirementYears: 20,
    homeAppreciation: 0.07,
    mortgageReference: 0.11
  };
  const state = {
    step: 0, scope: '', hasPpr: '', age: '', retirementAge: '', partnerAge: '',
    pprMonthly: '', pprBalance: '', pprEstimated: false, pprRegime: 'none', pprReturn: '10', isrRate: '30', reinvestTax: true,
    aforeBalance: '', otherSavings: '', homeValue: '', mortgageBalance: '',
    monthlyIncome: '', monthlyExpenses: '', retirementIncomeGoal: '', possibleIncrease: '',
    mortgageEnds: false, mortgagePayment: '', mortgageYearsLeft: '', tuitionEnds: false, tuitionPayment: '', tuitionYearsLeft: '',
    carLoanEnds: false, carLoanPayment: '', carLoanYearsLeft: '', otherExpenseEnds: false, otherExpensePayment: '', otherExpenseYearsLeft: '',
    futurePension: '', futureOtherIncome: ''
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
    updateConditionals(); updateAgePreview(); updateGoalLabel(); updateFutureFlowPreview();
    showStep(Math.min(Number(state.step) || 0, 7));
  }
  function persist() {
    state.step = currentStep(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const status = byId('saveStatus'); if (status) { status.style.opacity = '.45'; setTimeout(() => status.style.opacity = '1', 150); }
  }
  function currentStep(){ return steps.findIndex(s => s.classList.contains('is-active')); }
  function showStep(index){
    steps.forEach((step,i)=>step.classList.toggle('is-active',i===index));
    const pct=index>=8?100:Math.round(index/8*100);
    byId('progressBar').style.width=`${pct}%`; byId('progressText').textContent=`${pct}%`;
    const labels=['Bienvenida','Perspectiva','Horizonte','Tu plan','Lo construido','Tu meta','Tu vida cambia','Revisión','Resultado'];
    byId('stepLabel').textContent=labels[index]||'Resultado';
    const routeIndex=Math.min(5,index===0?0:index===1?1:index<=3?2:index===4?3:index<=7?4:5);
    document.querySelectorAll('[data-route-node]').forEach((node,i)=>{node.classList.toggle('is-active',i===routeIndex);node.classList.toggle('is-complete',i<routeIndex);});
    byId('routeLine').style.height=`${routeIndex/5*100}%`;
    window.scrollTo({top:0,behavior:'smooth'});
    if(index===7) buildReview(); if(index===6) updateFutureFlowPreview();
  }
  function alertFriendly(message){
    const note=document.createElement('div'); note.className='temporary-message'; note.textContent=message;
    Object.assign(note.style,{position:'fixed',left:'50%',bottom:'90px',transform:'translateX(-50%)',zIndex:'200',padding:'12px 16px',borderRadius:'12px',background:'rgba(8,22,36,.96)',border:'1px solid rgba(114,200,255,.3)',color:'#dcebf5',fontSize:'11px',boxShadow:'0 20px 50px rgba(0,0,0,.35)'});
    document.body.appendChild(note); setTimeout(()=>note.remove(),2600); return false;
  }
  function validateStep(index){
    if(index===1&&!state.scope)return alertFriendly('Elige cómo quieres revisar tu situación.');
    if(index===2&&(!num(state.age)||!num(state.retirementAge)))return alertFriendly('Agrega tu edad actual y la edad objetivo de retiro.');
    if(index===2&&num(state.retirementAge)<=num(state.age))return alertFriendly('La edad de retiro debe ser mayor que tu edad actual.');
    if(index===3&&!state.hasPpr)return alertFriendly('Indica si ya cuentas con un Plan Personal de Retiro.');
    if(index===5&&!num(state.retirementIncomeGoal))return alertFriendly('Agrega un ingreso mensual deseado o usa la estimación sugerida.');
    return true;
  }

  document.addEventListener('click',event=>{
    const next=event.target.closest('[data-next]'),prev=event.target.closest('[data-prev]');
    if(next){const i=currentStep();if(validateStep(i)){showStep(Math.min(i+1,7));persist();}}
    if(prev){showStep(Math.max(currentStep()-1,0));persist();}
    const choice=event.target.closest('[data-choice-group] [data-value]');
    if(choice){const group=choice.closest('[data-choice-group]');state[group.dataset.choiceGroup]=choice.dataset.value;group.querySelectorAll('[data-value]').forEach(btn=>btn.classList.toggle('is-selected',btn===choice));updateConditionals();updateGoalLabel();persist();}
    const open=event.target.closest('[data-open-panel]');if(open)openPanel(open.dataset.openPanel);
    if(event.target.closest('[data-close-panel]'))closePanel();
  });
  document.querySelectorAll('input,select').forEach(input=>input.addEventListener('input',()=>{state[input.id]=input.type==='checkbox'?input.checked:input.value;updateAgePreview();updateConditionals();updateFutureFlowPreview();persist();}));

  function updateConditionals(){
    byId('partnerAgeBlock').hidden=state.scope!=='couple';
    byId('pprFields').hidden=!['yes','multiple'].includes(state.hasPpr);
    if(byId('taxFields'))byId('taxFields').hidden=state.pprRegime!=='151';
    document.querySelectorAll('[data-detail-for]').forEach(block=>block.hidden=!Boolean(state[block.dataset.detailFor]));
  }
  function updateGoalLabel(){byId('incomeLabel').textContent=state.scope==='household'?'Ingreso mensual de tu hogar':state.scope==='couple'?'Ingreso mensual conjunto':'Tu ingreso mensual';}
  function updateAgePreview(){const years=num(byId('retirementAge')?.value)-num(byId('age')?.value);byId('yearsPreview').textContent=years>0?`Tienes aproximadamente ${years} años para seguir construyendo tu Ruta.`:'Completa ambas edades para conocer tu horizonte.';}

  function temporaryExpenseItems(){
    const yearsToRetirement=Math.max(0,num(state.retirementAge)-num(state.age));
    const defs=[['mortgageEnds','Hipoteca','mortgagePayment','mortgageYearsLeft'],['tuitionEnds','Colegiaturas','tuitionPayment','tuitionYearsLeft'],['carLoanEnds','Crédito automotriz','carLoanPayment','carLoanYearsLeft'],['otherExpenseEnds','Otro compromiso','otherExpensePayment','otherExpenseYearsLeft']];
    return defs.map(([flag,label,payment,years])=>({label,active:Boolean(state[flag]),payment:num(state[payment]),years:num(state[years])})).filter(i=>i.active&&i.payment>0&&(i.years===0||i.years<=yearsToRetirement));
  }
  const futureExpenseRelief=()=>temporaryExpenseItems().reduce((s,i)=>s+i.payment,0);
  const futureIncomeTotal=()=>num(state.futurePension)+num(state.futureOtherIncome);
  const estimatedFutureExpenses=()=>Math.max(0,num(state.monthlyExpenses)-futureExpenseRelief());
  function updateFutureFlowPreview(){
    const el=byId('futureFlowPreview');if(!el)return;
    const relief=futureExpenseRelief(),current=num(state.monthlyExpenses),future=Math.max(0,current-relief),income=futureIncomeTotal();
    if(!relief&&!income){el.textContent='Selecciona los gastos que cambiarán o agrega ingresos futuros para construir una referencia más realista.';return;}
    el.innerHTML=`Tu base de gasto podría pasar de <strong>${money.format(current)}</strong> a cerca de <strong>${money.format(future)}</strong>. Además registraste <strong>${money.format(income)}</strong> mensuales de ingresos futuros. Son referencias editables, no promesas.`;
  }

  byId('suggestGoal').addEventListener('click',()=>{
    const expenses=num(byId('monthlyExpenses').value),income=num(byId('monthlyIncome').value);
    const adjusted=Math.max(0,expenses-futureExpenseRelief());
    const suggestion=Math.round((adjusted||expenses||income*.7||30000)/500)*500;
    byId('retirementIncomeGoal').value=suggestion;state.retirementIncomeGoal=suggestion;persist();
    byId('goalHelper').querySelector('span').textContent=`Usamos ${money.format(suggestion)} como referencia después de considerar los gastos temporales. Puedes cambiarla.`;
  });

  function buildReview(){
    const items=[['Perspectiva',state.scope==='individual'?'Individual':state.scope==='couple'?'Pareja':'Hogar'],['Horizonte',`${num(state.retirementAge)-num(state.age)} años`],['PPR actual',['yes','multiple'].includes(state.hasPpr)?money.format(num(state.pprBalance)):'No incluido'],['AFORE',num(state.aforeBalance)?money.format(num(state.aforeBalance)):'Pendiente'],['Otros recursos',money.format(num(state.otherSavings))],['Meta mensual',money.format(num(state.retirementIncomeGoal))],['Gastos que podrían terminar',money.format(futureExpenseRelief())],['Ingresos futuros',money.format(futureIncomeTotal())]];
    byId('reviewGrid').innerHTML=items.map(([l,v])=>`<div class="review-item"><span>${l}</span><strong>${v}</strong></div>`).join('');
    const approximate=state.pprEstimated?1:0,pending=num(state.aforeBalance)?0:1;
    byId('reviewNote').textContent=`Utilizaremos ${approximate?'1 dato aproximado':'los datos proporcionados'}${pending?' y el saldo de AFORE quedará fuera de esta primera lectura':''}. Todos los supuestos podrán revisarse después.`;
  }

  function futureValueLump(pv,annualRate,years){return num(pv)*Math.pow(1+annualRate/12,Math.max(0,years)*12);}
  function futureValueGrowingMonthly(pmt,annualRate,inflation,years){
    const months=Math.max(0,Math.round(years*12));let balance=0,monthly=num(pmt),rate=annualRate/12;
    for(let m=0;m<months;m++){balance*=1+rate;balance+=monthly;if((m+1)%12===0)monthly*=1+inflation;}
    return balance;
  }
  function projectPpr(years,extraMonthly=0){
    if(!['yes','multiple'].includes(state.hasPpr))return {future:0,taxAdded:0};
    const rate=Math.max(0,num(state.pprReturn)||10)/100;
    let balance=num(state.pprBalance),monthly=num(state.pprMonthly)+num(extraMonthly),taxAdded=0;
    const months=Math.round(years*12),monthlyRate=rate/12,is151=state.pprRegime==='151'&&state.reinvestTax,isr=num(state.isrRate)/100;
    for(let m=0;m<months;m++){
      balance*=1+monthlyRate;balance+=monthly;
      if((m+1)%12===0){
        if(is151&&isr>0){const refund=monthly*12*isr;balance+=refund;taxAdded+=refund;}
        monthly*=1+ASSUMPTIONS.inflation;
      }
    }
    return {future:balance,taxAdded};
  }
  function projectHome(years){
    const futureValue=futureValueLump(state.homeValue,ASSUMPTIONS.homeAppreciation,years);
    const mortgageEndsBefore=state.mortgageEnds&&num(state.mortgageYearsLeft)<=years;
    const futureDebt=mortgageEndsBefore?0:num(state.mortgageBalance);
    return {futureValue,equity:Math.max(0,futureValue-futureDebt),futureDebt};
  }
  function convertToMonthlyIncome(capital){
    const r=ASSUMPTIONS.retirementReturn/12,n=ASSUMPTIONS.retirementYears*12;
    return capital<=0?0:capital*(r/(1-Math.pow(1+r,-n)));
  }
  function projection(extraMonthly=0,extraYears=0){
    const years=Math.max(1,num(state.retirementAge)-num(state.age)+num(extraYears));
    const ppr=projectPpr(years,extraMonthly);
    const aforeFuture=futureValueLump(state.aforeBalance,ASSUMPTIONS.aforeReturn,years);
    const otherFuture=futureValueLump(state.otherSavings,ASSUMPTIONS.otherReturn,years);
    const nominalCapital=ppr.future+aforeFuture+otherFuture;
    const realCapital=nominalCapital/Math.pow(1+ASSUMPTIONS.inflation,years);
    const investmentIncome=convertToMonthlyIncome(realCapital);
    const futureIncome=futureIncomeTotal();
    const home=projectHome(years);
    return {years,pprFuture:ppr.future,pprTaxAdded:ppr.taxAdded,aforeFuture,otherFuture,nominalCapital,realCapital,investmentIncome,futureIncome,monthlyIncome:investmentIncome+futureIncome,homeFuture:home.futureValue,homeEquityFuture:home.equity,totalPatrimonyReal:realCapital+home.equity/Math.pow(1+ASSUMPTIONS.inflation,years)};
  }

  function animateNumber(el,value){const duration=900,start=performance.now();function frame(now){const p=Math.min(1,(now-start)/duration),e=1-Math.pow(1-p,3);el.textContent=money.format(value*e);if(p<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);}
  byId('calculateButton').addEventListener('click',()=>{showStep(8);persist();runAnalysisSequence();});
  function runAnalysisSequence(){
    byId('analysisSequence').hidden=false;byId('resultsContent').hidden=true;
    const messages=['Organizando lo que ya has construido…','Proyectando PPR, AFORE y otros recursos…','Considerando los cambios de tu vida…','Preparando una lectura clara y personalizada…'];
    let i=0;byId('analysisText').textContent=messages[0];
    const analysisSteps=[...document.querySelectorAll('.analysis-step')];
    const timer=setInterval(()=>{i++;if(i<messages.length){byId('analysisText').textContent=messages[i];analysisSteps.forEach((el,n)=>el.classList.toggle('is-active',n===i));}else{clearInterval(timer);setTimeout(()=>{byId('analysisSequence').hidden=true;byId('resultsContent').hidden=false;renderResults();},350);}},550);
  }

  function renderResults(){
    const r=projection(0,0),goal=num(state.retirementIncomeGoal),coverage=goal?Math.min(999,Math.round(r.monthlyIncome/goal*100)):0,gap=Math.max(0,goal-r.monthlyIncome);
    animateNumber(byId('totalPatrimonyTop'),r.totalPatrimonyReal);animateNumber(byId('retirementResources'),r.realCapital);animateNumber(byId('monthlyGap'),gap);animateNumber(byId('totalPatrimony'),r.totalPatrimonyReal);animateNumber(byId('estimatedIncome'),r.monthlyIncome);
    animateNumber(byId('pprProjectedResult'),r.pprFuture/Math.pow(1+ASSUMPTIONS.inflation,r.years));animateNumber(byId('aforeProjectedResult'),r.aforeFuture/Math.pow(1+ASSUMPTIONS.inflation,r.years));animateNumber(byId('homeProjectedResult'),r.homeEquityFuture/Math.pow(1+ASSUMPTIONS.inflation,r.years));animateNumber(byId('futureIncomeResult'),r.futureIncome);
    byId('pprMethodLabel').textContent=state.pprRegime==='151'&&state.reinvestTax?`Incluye reinversión fiscal estimada al ${num(state.isrRate)}%.`:`Aportación creciente con inflación y rendimiento de ${num(state.pprReturn)||10}%.`;
    byId('goalResult').textContent=money.format(goal);byId('coverageResult').textContent=`${coverage}%`;byId('yearsResult').textContent=`${r.years} años`;
    const five=Math.max(0,Math.min(5,Math.round(coverage/20)));byId('coveragePlain').textContent=`${five} de cada 5`;byId('coveragePlainLabel').textContent='de tu meta mensual';
    byId('coverageLabel').textContent=coverage>=100?'Meta potencialmente cubierta':coverage>=70?'Buen avance':coverage>=40?'En construcción':'Conviene fortalecerla';
    let statusTitle,statusText;
    if(coverage>=100){statusTitle='Tu Ruta podría cubrir la meta que elegiste.';statusText='El siguiente paso es revisar la calidad, disponibilidad y diversificación de esos recursos.';}
    else if(coverage>=70){statusTitle='Tu Ruta muestra un avance importante.';statusText=`La proyección cubriría cerca de ${coverage}% de tu meta. Hay una base sólida y todavía existen decisiones que podrían reducir la diferencia.`;}
    else if(coverage>=40){statusTitle='Tu Ruta está en una etapa de construcción.';statusText=`La proyección cubriría aproximadamente ${coverage}% de tu meta. No es una calificación; es una referencia para decidir qué ajustar.`;}
    else{statusTitle='Tu Ruta necesita fortalecerse para acercarse a la meta.';statusText=`Hoy cubriría aproximadamente ${coverage}% del ingreso que deseas. La ventaja es que ya sabemos dónde está la diferencia y qué opciones explorar.`;}
    byId('routeStatusTitle').textContent=statusTitle;byId('routeStatusText').textContent=statusText;
    byId('incomeNarrative').textContent=`Tus inversiones podrían representar alrededor de ${money.format(r.investmentIncome)} mensuales en dinero de hoy. Al sumar los ingresos futuros que registraste, la referencia total sería ${money.format(r.monthlyIncome)}.`;
    const currentHomeEquity=Math.max(0,num(state.homeValue)-num(state.mortgageBalance));
    const components=[['PPR actual',num(state.pprBalance)],['AFORE actual',num(state.aforeBalance)],['Otros recursos',num(state.otherSavings)],['Vivienda neta hoy',currentHomeEquity]],max=Math.max(...components.map(x=>x[1]),1);
    byId('patrimonyBreakdown').innerHTML=components.map(([label,value])=>`<div class="breakdown-row"><span>${label}</span><div class="breakdown-track"><i data-width="${value/max*100}"></i></div><strong>${money.format(value)}</strong></div>`).join('');
    requestAnimationFrame(()=>document.querySelectorAll('.breakdown-track i').forEach(el=>el.style.width=`${el.dataset.width}%`));
    let title,text;
    if(coverage>=100){title='Tu estrategia podría sostener el objetivo que elegiste.';text='Ahora conviene revisar la diversificación de tus recursos y mantener actualizada la información.';}
    else if(futureExpenseRelief()>0){title='Tu retiro no tendrá exactamente la misma estructura de gastos que hoy.';text=`Identificaste ${money.format(futureExpenseRelief())} mensuales de compromisos que podrían terminar antes del retiro. Eso cambia de forma importante la lectura de tu meta.`;}
    else{title='Ya tienes una referencia clara para tomar decisiones.';text=`La proyección actual cubriría aproximadamente ${coverage}% de tu meta. Puedes probar ajustes y decidir cuáles se adaptan a tu vida.`;}
    byId('discoveryTitle').textContent=title;byId('discoveryText').textContent=text;
    const relief=futureExpenseRelief(),lifeItems=temporaryExpenseItems();animateNumber(byId('futureExpenseRelief'),relief);
    byId('futureLifeList').innerHTML=lifeItems.length?lifeItems.map(item=>`<div><span>${item.label}</span><strong>${money.format(item.payment)} al mes</strong><small>${item.years?`Terminaría aproximadamente en ${item.years} años`:'Se considera temporal'}</small></div>`).join(''):'<div><span>Sin cambios registrados</span><strong>Puedes actualizar esta parte después</strong><small>No asumiremos que tus gastos desaparecerán sin que tú lo indiques.</small></div>';
    byId('futureLifeNarrative').textContent=relief?`Tu base de gasto podría disminuir de ${money.format(num(state.monthlyExpenses))} a cerca de ${money.format(estimatedFutureExpenses())} antes de considerar nuevos deseos o gastos.`:'No identificamos compromisos temporales. La meta se conserva como la definiste.';
    buildRecommendations(r,goal,coverage);
    byId('baseIncomeComparison').textContent=money.format(r.monthlyIncome);byId('scenarioContribution').value=num(state.possibleIncrease);byId('scenarioYears').value=0;updateScenario();
    const actions=[];if(!num(state.aforeBalance))actions.push(['Esta semana','Consulta tu saldo de AFORE para completar la lectura.']);if(relief>0)actions.push(['Cuando se libere flujo',`Define qué parte de esos ${money.format(relief)} mensuales podría redirigirse a tu estrategia.`]);else actions.push(['Próximos meses','Explora un incremento pequeño que puedas mantener sin presión.']);actions.push(['Próxima revisión','Actualiza tu Ruta cuando cambien tus ingresos, gastos, objetivos o patrimonio.']);
    byId('actionList').innerHTML=actions.slice(0,3).map(([when,action])=>`<div class="action-item"><span>${when}</span><strong>${action}</strong></div>`).join('');
    const msg=encodeURIComponent('Hola Christian, terminé mi Ruta de Retiro en GarBa Intelligence y me gustaría revisar contigo mis resultados.');byId('whatsappLink').href=`https://wa.me/526623072573?text=${msg}`;
  }

  function buildRecommendations(base,goal,coverage){
    const options=[],relief=futureExpenseRelief();
    if(relief>0)options.push({title:'Aprovechar el flujo que se liberará',text:`Cuando terminen tus compromisos temporales, podrías destinar una parte de esos ${money.format(relief)} mensuales al retiro u otros objetivos.`,impact:'Cambio de flujo'});
    if(state.pprRegime==='151'&&!state.reinvestTax)options.push({title:'Explorar la reinversión fiscal',text:'En un PPR deducible, reinvertir cada año una devolución estimada puede fortalecer el capital futuro. La devolución real depende de tu situación fiscal.',impact:'Escenario fiscal'});
    const inc=num(state.possibleIncrease)||1000,incScenario=projection(inc,0),incImpact=Math.max(0,incScenario.monthlyIncome-base.monthlyIncome);
    options.push({title:'Probar un aumento gradual',text:`Explora una aportación adicional de ${money.format(inc)} y confirma que sea sostenible.`,impact:`+${money.format(incImpact)} al mes`});
    const two=projection(0,2),yearsImpact=Math.max(0,two.monthlyIncome-base.monthlyIncome);
    options.push({title:'Comparar dos años adicionales',text:'Más tiempo permite sumar aportaciones y crecimiento sin concentrar todo el esfuerzo hoy.',impact:`+${money.format(yearsImpact)} al mes`});
    if(!num(state.aforeBalance))options.unshift({title:'Incorporar tu saldo de AFORE',text:'Agregar el dato real puede cambiar de manera importante la lectura.',impact:'Mejora la precisión'});
    else if(num(state.homeValue)>0)options.push({title:'Definir el papel de tu vivienda',text:'Fortalece tu patrimonio, pero solo produciría flujo si decides vender, rentar o utilizar parte de su valor.',impact:'Escenario opcional'});
    byId('recommendationList').innerHTML=options.slice(0,3).map((item,i)=>`<article class="recommendation-card"><div class="recommendation-card__number">0${i+1}</div><div><span>Posibilidad para explorar</span><strong>${item.title}</strong><small>${item.text}</small></div><div class="recommendation-card__impact">${item.impact}</div></article>`).join('');
  }
  function updateScenario(){const extra=num(byId('scenarioContribution').value),extraYears=num(byId('scenarioYears').value),base=projection(0,0),scenario=projection(extra,extraYears);byId('scenarioContributionLabel').textContent=money.format(extra);byId('scenarioYearsLabel').textContent=`${extraYears} ${extraYears===1?'año':'años'}`;byId('scenarioIncomeComparison').textContent=money.format(scenario.monthlyIncome);const diff=scenario.monthlyIncome-base.monthlyIncome;byId('scenarioImpact').textContent=diff>0?`La combinación podría representar ${money.format(diff)} adicionales al mes.`:'Sin cambios todavía';}
  byId('scenarioContribution').addEventListener('input',updateScenario);byId('scenarioYears').addEventListener('input',updateScenario);byId('resetScenario').addEventListener('click',()=>{byId('scenarioContribution').value=0;byId('scenarioYears').value=0;updateScenario();});

  byId('downloadCsv').addEventListener('click',()=>{const r=projection(0);const rows=[['Campo','Valor'],...Object.entries(state).filter(([k])=>k!=='step').map(([k,v])=>[k,v]),['ppr_proyectado_real',r.pprFuture/Math.pow(1+ASSUMPTIONS.inflation,r.years)],['afore_proyectado_real',r.aforeFuture/Math.pow(1+ASSUMPTIONS.inflation,r.years)],['vivienda_proyectada_real',r.homeEquityFuture/Math.pow(1+ASSUMPTIONS.inflation,r.years)],['ingreso_mensual_estimado',r.monthlyIncome],['gastos_temporales_que_terminan',futureExpenseRelief()],['ingresos_futuros',futureIncomeTotal()],['fecha',new Date().toLocaleDateString('es-MX')]];const csv=rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ruta-de-retiro-${firstName.toLowerCase()}.csv`;a.click();URL.revokeObjectURL(url);});
  byId('printReport').addEventListener('click',()=>window.print());

  const panels={
    guide:{kicker:'Guía rápida',title:'La ayuda siempre estará cerca',body:'<p>Cuando veas el símbolo <strong>ⓘ</strong>, tócalo para encontrar ejemplos o entender cómo estimar una respuesta.</p><p>No necesitas terminar hoy. Tus avances permanecen en este dispositivo.</p><p>Al finalizar podrás descargar tus datos y guardar el reporte como PDF.</p>'},
    privacy:{kicker:'Privacidad',title:'Tu información es tuya',body:'<p>Tus respuestas se almacenan únicamente en este navegador mediante almacenamiento local.</p><p>GarBa Intelligence no recibe ni almacena estos datos en una base de datos.</p>'},
    scopeHelp:{kicker:'Perspectiva',title:'Individual, pareja u hogar',body:'<p>Los ingresos y gastos pueden revisarse de manera conjunta. Los productos personales, como PPR y AFORE, conservan su titularidad.</p>'},
    homeHelp:{kicker:'Vivienda',title:'Patrimonio no siempre significa ingreso',body:`<p>La vivienda se proyecta con una referencia nacional histórica de apreciación y se separa del flujo mensual.</p><p>Cuando faltan datos técnicos de la hipoteca, la metodología usa una referencia de 11% anual solo para contextualizar el crédito. En esta V1 se prioriza la fecha estimada de liquidación que indiques.</p>`},
    lifeChangesHelp:{kicker:'Tu vida cambia',title:'La fotografía de hoy no es permanente',body:'<p>Una hipoteca, colegiaturas o ciertos créditos pueden terminar antes de tu retiro. Identificarlos evita asumir que necesitarás el mismo gasto durante toda tu vida.</p><p>Los ingresos futuros también son estimaciones editables.</p>'},
    manageData:{kicker:'Tu información',title:'Administrar mi información',body:`<p class="manage-intro">Tú tienes el control. Elige qué deseas hacer con la información guardada en este dispositivo.</p><div class="manage-actions"><button type="button" class="manage-action" id="manageDownloadData"><span class="manage-action__icon">↓</span><span><strong>Descargar mis datos</strong><small>Guarda una copia en CSV compatible con Excel.</small></span><i>→</i></button><button type="button" class="manage-action" id="manageDownloadReport"><span class="manage-action__icon">▤</span><span><strong>Descargar mi reporte</strong><small>Imprime o guarda como PDF tu lectura actual.</small></span><i>→</i></button><button type="button" class="manage-action manage-action--restart" id="clearRetirementData"><span class="manage-action__icon">↻</span><span><strong>Comenzar un nuevo análisis</strong><small>Elimina únicamente la información de Mi Ruta de Retiro.</small></span><i>→</i></button><button type="button" class="manage-action manage-action--danger" id="clearAllGarbaData"><span class="manage-action__icon">⌫</span><span><strong>Eliminar toda mi información</strong><small>Borra el acceso y los datos de todas las herramientas.</small></span><i>→</i></button><button type="button" class="manage-action" id="changeGarbaUser"><span class="manage-action__icon">◎</span><span><strong>Cambiar de usuario</strong><small>Conserva los análisis, pero vuelve a la bienvenida.</small></span><i>→</i></button></div><p class="manage-footnote">Tus datos permanecen localmente en este dispositivo.</p>`}
  };
  function openPanel(key){const p=panels[key]||panels.guide;byId('panelKicker').textContent=p.kicker;byId('panelTitle').textContent=p.title;byId('panelBody').innerHTML=p.body;byId('sidePanel').hidden=false;document.body.style.overflow='hidden';}
  function closePanel(){byId('sidePanel').hidden=true;document.body.style.overflow='';}
  document.addEventListener('click',event=>{
    if(event.target.closest('#manageDownloadData')){closePanel();byId('downloadCsv')?.click();return;}
    if(event.target.closest('#manageDownloadReport')){closePanel();if(!document.querySelector('.results-step')?.classList.contains('is-active')){alertFriendly('Primero termina tu Ruta para preparar el reporte.');return;}byId('printReport')?.click();return;}
    if(event.target.closest('#clearRetirementData')){if(!window.confirm('¿Deseas comenzar un nuevo análisis? Se eliminarán únicamente los datos de Mi Ruta de Retiro.'))return;localStorage.removeItem(STORAGE_KEY);closePanel();window.location.reload();return;}
    if(event.target.closest('#clearAllGarbaData')){if(!window.confirm('¿Deseas eliminar toda la información de GarBa Intelligence guardada en este navegador?'))return;Object.keys(localStorage).filter(k=>k.startsWith('garbaIntelligence.')).forEach(k=>localStorage.removeItem(k));window.location.replace('../');return;}
    if(event.target.closest('#changeGarbaUser')){localStorage.removeItem('garbaIntelligence.session.v1');window.location.replace('../');}
  });
  load();
})();
