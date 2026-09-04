function renderToday(){
  const day=ensureToday();
  $('todayDateLabel').textContent='Checklist de '+new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
  const root=$('todayMeals');root.innerHTML='';
  if(!day.meals.length){
    root.innerHTML='<div class="card empty">Cadastre primeiro as refeições no Plano atual.</div>';
  }
  day.meals.forEach(meal=>{
    const m=normalizeMeal(meal);
    const selected=day.selectedOptions[m.id];
    const done=!!day.mealChecks[m.id];

    const wrap=document.createElement('div');
    wrap.className='card';
    wrap.style.padding='14px 15px';
    const optionsHtml=m.options.length>1 ? m.options.map((op,i)=>`
      <button class="option-choice ${selected===op.id?'selected':''}" data-meal="${m.id}" data-option="${op.id}">
        <div class="radio-dot"></div>
        <div class="option-copy">
          <strong>${esc(op.label||`Opção ${i+1}`)}</strong>
          <span>${esc(op.dish)||'Sem descrição'}</span>
        </div>
      </button>`).join('') : `
      <div class="check-sub" style="margin:3px 0 11px 0">${esc(m.options[0]?.dish||'Sem descrição')}</div>`;

    wrap.innerHTML=`
      <div class="check-title">${esc(m.name)}</div>
      ${optionsHtml}
      <button class="check-card ${done?'done':''} ${m.options.length>1&&!selected?'disabled':''}" data-check-meal="${m.id}" style="width:100%;text-align:left;margin-top:10px">
        <div class="checkbox">${done?'✓':''}</div>
        <div>
          <div class="check-title">${done?'Refeição concluída':'Marcar como concluída'}</div>
          ${m.options.length>1&&!selected?'<div class="check-sub">Escolha primeiro qual opção você comeu.</div>':''}
        </div>
      </button>`;
    root.appendChild(wrap);
  });

  document.querySelectorAll('.option-choice').forEach(b=>b.onclick=()=>{
    const mealId=b.dataset.meal;
    day.selectedOptions[mealId]=b.dataset.option;
    day.mealChecks[mealId]=false;
    save();renderToday();renderGoalsGrid();
  });
  document.querySelectorAll('[data-check-meal]').forEach(b=>b.onclick=()=>{
    const mealId=b.dataset.checkMeal;
    const meal=day.meals.find(m=>m.id===mealId);
    if(meal.options.length>1&&!day.selectedOptions[mealId])return;
    day.mealChecks[mealId]=!day.mealChecks[mealId];
    save();renderToday();renderGoalsGrid();
  });
  renderProgress(day);
}
function renderProgress(day){
  const total=day.meals.length;
  const done=day.meals.filter(m=>day.mealChecks[m.id]).length;
  const p=total?Math.round(done/total*100):0;
  $('progressPct').textContent=p+'%';
  $('progressRing').style.background=`conic-gradient(var(--green) 0 ${p}%, #E9E1D6 ${p}% 100%)`;
  $('mealProgress').textContent=`${done}/${total}`;
  $('dayStatus').textContent=p===100?'Concluído':p>0?'Em andamento':'Não iniciado';
}
function resetToday(){
  const d=ensureToday();
  d.mealChecks={};
  d.selectedOptions={};
  d.meals.forEach(m=>{if(m.options.length===1)d.selectedOptions[m.id]=m.options[0].id});
  save();renderToday();renderGoalsGrid();
}
function renderHistory(){
  const root=$('historyList');root.innerHTML='';
  if(!state.history.length){root.innerHTML='<div class="card empty">Nenhum plano arquivado ainda.</div>';return}
  state.history.forEach((p,i)=>{
    const meals=(p.meals||[]).map(normalizeMeal);
    const c=document.createElement('div');c.className='card history-card';
    c.innerHTML=`
      <div class="history-top">
        <div><div class="history-name">Plano anterior ${state.history.length-i}</div><div class="history-date">Arquivado em ${fmtDate(p.archivedAt)}</div></div>
        <div class="history-count">${meals.length} ${meals.length===1?'refeição':'refeições'}</div>
      </div>
      <div class="history-preview">${meals.map(m=>`<strong>${esc(m.name)}</strong>: ${m.options.map(o=>esc(o.dish||'—')).join(' / ')}`).join('<br>')}</div>`;
    root.appendChild(c);
  });
}
function renderGoalEditor(){
  $('mealTargetInput').value=state.goals.mealTarget;
}
function saveGoals(){
  state.goals.mealTarget=Math.max(1,Math.min(100,Number($('mealTargetInput').value)||100));
  save();renderAll();
}
function statusForDay(day){
  if(!day)return {pct:0,hit:false,partial:false};
  const total=day.meals?.length||0;
  const done=(day.meals||[]).filter(m=>day.mealChecks?.[m.id]).length;
  const mealPct=total?done/total*100:0;
  return {pct:mealPct,hit:mealPct>=state.goals.mealTarget,partial:done>0};
}
function renderGoalsGrid(){
  const root=$('daysGrid');root.innerHTML='';
  const today=new Date();
  for(let offset=27;offset>=0;offset--){
    const d=new Date(today);d.setDate(today.getDate()-offset);
    const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    const st=statusForDay(state.days[key]);
    const cell=document.createElement('div');
    cell.className='day-cell'+(st.hit?' hit':st.partial?' partial':'');
    cell.innerHTML=`<div class="n">${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}</div><div class="s">${st.hit?'Meta atingida':st.partial?Math.round(st.pct)+'% das refeições':'Sem registro'}</div>`;
    root.appendChild(cell);
  }
}

function shoppingNormalizeName(name){
  return String(name||'').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
}
function shoppingPrettyName(name){
  const s=String(name||'').trim();
  return s ? s.charAt(0).toLocaleUpperCase('pt-BR')+s.slice(1) : 'Ingrediente';
}
function shoppingUnitAlias(unit){
  const u=String(unit||'').trim().toLocaleLowerCase('pt-BR').replace(/\./g,'');
  const aliases={
    'grama':'g','gramas':'g','gr':'g','g':'g',
    'quilo':'kg','quilos':'kg','quilo(s)':'kg','kg':'kg',
    'mililitro':'ml','mililitros':'ml','ml':'ml',
    'litro':'l','litros':'l','lt':'l','l':'l',
    'un':'un','und':'un','unid':'un','unidade':'un','unidades':'un','unids':'un',
    'colher':'colher','colheres':'colher',
    'xicara':'xícara','xicaras':'xícara','xícara':'xícara','xícaras':'xícara',
    'fatia':'fatia','fatias':'fatia',
    'scoop':'scoop','scoops':'scoop'
  };
  return aliases[u]||u;
}
function shoppingParseNumber(value){
  const s=String(value||'').trim().replace(',', '.');
  if(/^\d+\/\d+$/.test(s)){
    const [a,b]=s.split('/').map(Number);return b? a/b : null;
  }
  const n=Number(s);return Number.isFinite(n)?n:null;
}
function shoppingParseQuantity(raw){
  raw=String(raw||'').trim();
  if(!raw)return {numeric:false,raw:''};
  const m=raw.match(/^([0-9]+(?:[.,][0-9]+)?|[0-9]+\/[0-9]+)\s*(.*)$/i);
  if(!m)return {numeric:false,raw};
  const amount=shoppingParseNumber(m[1]);
  if(amount===null)return {numeric:false,raw};
  let unit=shoppingUnitAlias(m[2]);
  if(unit==='kg')return {numeric:true,amount:amount*1000,unit:'g',sourceUnit:'kg'};
  if(unit==='l')return {numeric:true,amount:amount*1000,unit:'ml',sourceUnit:'l'};
  return {numeric:true,amount,unit:unit||'un',sourceUnit:unit||'un'};
}
function shoppingIngredientFromLine(line){
  line=String(line||'').trim().replace(/^[-•*]\s*/,'');
  if(!line)return null;

  // Nome - 150 g / Nome: 150 g
  let m=line.match(/^(.+?)\s*(?:[-–—:·])\s*([0-9]+(?:[.,][0-9]+)?|[0-9]+\/[0-9]+)\s*([^\d]*)$/i);
  if(m)return {name:m[1].trim(),quantity:(m[2]+' '+m[3]).trim()};

  // 150 g - Nome / 150 g Nome
  m=line.match(/^([0-9]+(?:[.,][0-9]+)?|[0-9]+\/[0-9]+)\s*([a-zA-ZÀ-ÿ\.]+)?\s*(?:[-–—:·]\s*)?(.+)$/i);
  if(m){
    const possibleUnit=(m[2]||'').trim();
    const name=(m[3]||'').trim();
    return {name,quantity:(m[1]+' '+possibleUnit).trim()};
  }
  return {name:line,quantity:''};
}
function shoppingIngredientsFromOption(option){
  const value=option?.ingredients;
  if(Array.isArray(value)){
    return value.map(item=>({
      name:String(item?.name||item?.ingredient||'').trim(),
      quantity:[String(item?.quantity??'').trim(),String(item?.unit??item?.measure??'').trim()].filter(Boolean).join(' ')
    })).filter(x=>x.name);
  }
  return String(value||'').split(/\n+/).map(shoppingIngredientFromLine).filter(Boolean);
}
function shoppingAddPart(item,parsed,raw,days){
  if(parsed.numeric){
    const key=parsed.unit||'un';
    item.numeric[key]=(item.numeric[key]||0)+(parsed.amount*days);
  }else if(raw){
    const key=String(raw).trim();
    item.text[key]=(item.text[key]||0)+days;
  }else{
    item.text['sem quantidade']=(item.text['sem quantidade']||0)+1;
  }
}
function shoppingFormatNumber(n){
  const rounded=Math.round(n*100)/100;
  return rounded.toLocaleString('pt-BR',{maximumFractionDigits:2});
}
function shoppingFormatQuantity(item){
  const parts=[];
  Object.entries(item.numeric).forEach(([unit,amount])=>{
    if(unit==='g' && amount>=1000 && amount%100===0) parts.push(shoppingFormatNumber(amount/1000)+' kg');
    else if(unit==='ml' && amount>=1000 && amount%100===0) parts.push(shoppingFormatNumber(amount/1000)+' L');
    else parts.push(shoppingFormatNumber(amount)+(unit==='un'?' un':' '+unit));
  });
  Object.entries(item.text).forEach(([raw,count])=>{
    if(raw==='sem quantidade')parts.push('quantidade não informada');
    else if(count>1)parts.push(count+'× '+raw);
    else parts.push(raw);
  });
  return parts.join(' + ')||'—';
}
function buildShoppingList(){
  const days=Math.max(1,Math.min(60,Number(state.shopping?.days)||7));
  const grouped=new Map();
  (state.currentPlan.meals||[]).map(normalizeMeal).forEach(meal=>{
    (meal.options||[]).forEach(option=>{
      shoppingIngredientsFromOption(option).forEach(ing=>{
        const key=shoppingNormalizeName(ing.name);
        if(!key)return;
        if(!grouped.has(key))grouped.set(key,{key,name:shoppingPrettyName(ing.name),numeric:{},text:{},occurrences:0});
        const item=grouped.get(key);
        item.occurrences+=1;
        shoppingAddPart(item,shoppingParseQuantity(ing.quantity),ing.quantity,days);
      });
    });
  });
  return [...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(item=>({...item,quantity:shoppingFormatQuantity(item)}));
}
function renderShopping(){
  state.shopping=state.shopping||clone(defaults.shopping);
  state.shopping.checks=state.shopping.checks||{};
  const days=Math.max(1,Math.min(60,Number(state.shopping.days)||7));
  const input=$('shoppingDaysInput');if(input)input.value=days;
  const title=$('shoppingSummaryTitle');if(title)title.textContent=`Compra para ${days} ${days===1?'dia':'dias'}`;
  const list=buildShoppingList();
  const root=$('shoppingList');if(!root)return;
  const checked=list.filter(item=>state.shopping.checks[item.key]).length;
  $('shoppingSummaryText').textContent=list.length?`${checked} de ${list.length} itens marcados`:'Cadastre ingredientes no Plano atual para gerar a lista.';
  $('shoppingSummaryCount').textContent=`${list.length} ${list.length===1?'item':'itens'}`;
  root.innerHTML='';
  if(!list.length){
    root.innerHTML='<div class="card empty" style="grid-column:1/-1">Nenhum ingrediente encontrado no plano atual.</div>';
    return;
  }
  list.forEach(item=>{
    const checked=!!state.shopping.checks[item.key];
    const btn=document.createElement('button');
    btn.className='shopping-item'+(checked?' checked':'');
    btn.innerHTML=`
      <div class="shopping-check">${checked?'✓':''}</div>
      <div class="shopping-copy">
        <div class="shopping-name">${esc(item.name)}</div>
        <div class="shopping-source">${item.occurrences>1?`Aparece ${item.occurrences} vezes no plano`:'1 ocorrência no plano'}</div>
      </div>
      <div class="shopping-qty">${esc(item.quantity)}</div>`;
    btn.onclick=()=>{
      state.shopping.checks[item.key]=!checked;
      save();renderShopping();
    };
    root.appendChild(btn);
  });
}
function setShoppingDays(value){
  state.shopping=state.shopping||clone(defaults.shopping);
  const days=Math.max(1,Math.min(60,Math.round(Number(value)||1)));
  state.shopping.days=days;
  save();renderShopping();
}
function clearShoppingChecks(){
  state.shopping=state.shopping||clone(defaults.shopping);
  state.shopping.checks={};
  save();renderShopping();
}

function renderAll(){
  renderCurrent();renderToday();renderShopping();renderHistory();renderGoalEditor();renderGoalsGrid();
}
function showView(viewId){
  const target=$(viewId)||$('current');
  document.querySelectorAll('.nav button').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===target.id));
  document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view===target));
}
document.querySelectorAll('.nav button').forEach(btn=>btn.onclick=()=>showView(btn.dataset.view));
$('addMealBtn').onclick=()=>openMealModal();
$('archiveBtn').onclick=archivePlan;
$('closeMealModal').onclick=closeMealModal;
$('cancelMealModal').onclick=closeMealModal;
$('saveMealModal').onclick=saveMeal;
$('addMealOptionBtn').onclick=()=>{syncDraftOptions();draftOptions.push({id:uid(),label:`Opção ${draftOptions.length+1}`,dish:'',ingredients:'',prep:''});renderOptionsEditor()};
$('resetTodayBtn').onclick=resetToday;
$('saveGoalsBtn').onclick=saveGoals;
$('shoppingDaysInput').onchange=e=>setShoppingDays(e.target.value);
$('shoppingDaysInput').oninput=e=>{const v=Number(e.target.value);if(v>=1&&v<=60){state.shopping.days=Math.round(v);renderShopping();}};
$('clearShoppingChecksBtn').onclick=clearShoppingChecks;
$('syncBtn').onclick=()=>syncNow(true);
$('mealModal').onclick=e=>{if(e.target===$('mealModal'))closeMealModal()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMealModal()});

showView('current');
renderAll();
startSync();
