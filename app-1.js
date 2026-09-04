const KEY='prato-v3';
const LOCAL_UPDATED_KEY='prato-v3-local-updated';
const SUPABASE_URL='https://kstclxmssqbfzumsomvk.supabase.co';
const SUPABASE_KEY='sb_publishable__uApyZqLN6rJ7bs2FkDe7w_ys0y5G-E';
const SUPABASE_TABLE='prato_sync';
const WORKSPACE_ID='prato-9d69b174-5f0d-4a93-ae61-6a20b806f5bd';
const defaults={
  currentPlan:{id:null,name:'Plano atual',createdAt:null,meals:[]},
  history:[],
  goals:{mealTarget:100},
  days:{},
  shopping:{days:7,checks:{}}
};
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){
  try{
    const r=localStorage.getItem(KEY);
    if(!r)return clone(defaults);
    const p=JSON.parse(r);
    return {...clone(defaults),...p,goals:{...defaults.goals,...(p.goals||{})},shopping:{...defaults.shopping,...(p.shopping||{}),checks:{...(defaults.shopping.checks||{}),...(p.shopping?.checks||{})}}}
  }catch(e){return clone(defaults)}
}
let state=load();
if(!state.currentPlan.id){state.currentPlan.id=uid();state.currentPlan.createdAt=new Date().toISOString()}
const $=id=>document.getElementById(id);
let syncTimer=null, syncInFlight=false, syncDirty=false, syncReady=false;
function setSyncStatus(text,type=''){
  const status=$('syncStatus'),dot=$('syncDot');
  if(!status||!dot)return;
  status.textContent=text;dot.className='sync-dot '+type;
}
function localUpdatedAt(){return localStorage.getItem(LOCAL_UPDATED_KEY)||''}
function save(){
  localStorage.setItem(KEY,JSON.stringify(state));
  localStorage.setItem(LOCAL_UPDATED_KEY,new Date().toISOString());
  if(syncReady)scheduleSync();
}
function apiHeaders(extra={}){return {'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',...extra}}
async function fetchRemote(){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?workspace_id=eq.${encodeURIComponent(WORKSPACE_ID)}&select=payload,updated_at`,{headers:apiHeaders()});
  if(!response.ok)throw new Error('Não foi possível acessar a nuvem.');
  const rows=await response.json();return rows[0]||null;
}
async function pushRemote(){
  const now=new Date().toISOString();
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?on_conflict=workspace_id`,{
    method:'POST',headers:apiHeaders({'Prefer':'resolution=merge-duplicates,return=representation'}),
    body:JSON.stringify({workspace_id:WORKSPACE_ID,payload:state,updated_at:now})
  });
  if(!response.ok)throw new Error('Não foi possível enviar as alterações.');
  localStorage.setItem(LOCAL_UPDATED_KEY,now);
}
async function syncNow(manual=false){
  if(syncInFlight){syncDirty=true;return}
  if(!navigator.onLine){setSyncStatus('Sem internet — salvo neste dispositivo.','error');return}
  syncInFlight=true;setSyncStatus(manual?'Sincronizando agora…':'Sincronizando…','busy');
  try{
    await pushRemote();
    setSyncStatus('Sincronizado agora.','ok');
  }catch(error){
    setSyncStatus('Alterações salvas neste dispositivo.','error');
    if(manual)alert('Não foi possível sincronizar agora. Seus dados continuam salvos neste dispositivo.');
  }finally{
    syncInFlight=false;
    if(syncDirty){syncDirty=false;scheduleSync(250)}
  }
}
function scheduleSync(delay=1200){
  clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow(false),delay);
}
async function startSync(){
  setSyncStatus('Verificando dados salvos…','busy');
  try{
    const remote=await fetchRemote();
    const remoteNewer=remote&&remote.updated_at&&remote.updated_at>localUpdatedAt();
    if(remoteNewer&&remote.payload&&Object.keys(remote.payload).length){
      state={...clone(defaults),...remote.payload,goals:{...defaults.goals,...(remote.payload.goals||{})},shopping:{...defaults.shopping,...(remote.payload.shopping||{}),checks:{...(defaults.shopping.checks||{}),...(remote.payload.shopping?.checks||{})}}};
      state.currentPlan.meals=(state.currentPlan.meals||[]).map(normalizeMeal);
      localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(LOCAL_UPDATED_KEY,remote.updated_at);
      renderAll();setSyncStatus('Dados atualizados da nuvem.','ok');
    }else{
      syncReady=true;await syncNow(false);
    }
  }catch(error){setSyncStatus('Modo offline — salvo neste dispositivo.','error')}
  finally{syncReady=true}
}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function fmtDate(d){return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}
function todayKey(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
let editingMealId=null;

function normalizeMeal(meal){
  if(Array.isArray(meal.options) && meal.options.length)return meal;
  return {
    ...meal,
    options:[{
      id:uid(),
      label:'Opção 1',
      dish:meal.dish||'',
      ingredients:meal.ingredients||'',
      prep:meal.prep||''
    }]
  };
}
state.currentPlan.meals=(state.currentPlan.meals||[]).map(normalizeMeal);

function renderCurrent(){
  const root=$('currentPlanList');
  root.innerHTML='';
  const meals=state.currentPlan.meals;
  if(!meals.length){
    root.innerHTML='<div class="card empty">Seu plano ainda está vazio. Crie a primeira refeição para começar.</div>';
    return;
  }
  meals.forEach((meal,i)=>{
    const m=normalizeMeal(meal);
    const optionHtml=m.options.map((op,idx)=>`
      <div class="block ${m.options.length===1?'full':''}">
        <div class="block-label">${m.options.length>1?esc(op.label||`Opção ${idx+1}`):'Prato'}</div>
        <div class="block-content"><strong>${esc(op.dish)||'—'}</strong></div>
        ${op.ingredients?`<div class="block-content" style="margin-top:9px"><span style="color:var(--muted)">Ingredientes</span><br>${esc(op.ingredients)}</div>`:''}
        ${op.prep?`<div class="block-content" style="margin-top:9px"><span style="color:var(--muted)">Preparo</span><br>${esc(op.prep)}</div>`:''}
      </div>`).join('');
    const c=document.createElement('article');c.className='card meal-card';
    c.innerHTML=`
      <div class="meal-head">
        <div class="meal-left"><div class="dot"></div><div>
          <div class="meal-name">${esc(m.name)}</div>
          <div class="meal-meta">${m.options.length} ${m.options.length===1?'opção':'opções'}</div>
        </div></div>
        <div class="small-actions">
          <button class="icon-btn edit-meal" data-id="${m.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg>
          </button>
          <button class="icon-btn delete-meal" data-id="${m.id}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3M8 10v8M12 10v8M16 10v8M6 7l1 14h10l1-14"/></svg>
          </button>
        </div>
      </div>
      <div class="meal-body">${optionHtml}</div>`;
    root.appendChild(c);
  });
  document.querySelectorAll('.edit-meal').forEach(b=>b.onclick=()=>openMealModal(b.dataset.id));
  document.querySelectorAll('.delete-meal').forEach(b=>b.onclick=()=>deleteMeal(b.dataset.id));
}

let draftOptions=[];

function renderOptionsEditor(){
  const root=$('optionsEditor');
  root.innerHTML='';
  draftOptions.forEach((op,i)=>{
    const box=document.createElement('div');
    box.className='option-editor';
    box.innerHTML=`
      <div class="option-editor-head">
        <div class="option-editor-title">Opção ${i+1}</div>
        ${draftOptions.length>1?`<button class="icon-btn remove-option" data-i="${i}" title="Remover">×</button>`:''}
      </div>
      <div class="field"><label>Nome da opção</label><input class="op-label" data-i="${i}" value="${esc(op.label||`Opção ${i+1}`)}" placeholder="Ex.: Opção ${i+1}"></div>
      <div class="field"><label>Prato / refeição</label><input class="op-dish" data-i="${i}" value="${esc(op.dish||'')}" placeholder="Ex.: Iogurte com fruta"></div>
      <div class="field"><label>Ingredientes</label><textarea class="op-ingredients" data-i="${i}" rows="4" placeholder="Liste os ingredientes">${esc(op.ingredients||'')}</textarea></div>
      <div class="field"><label>Modo de preparo / observações</label><textarea class="op-prep" data-i="${i}" rows="4" placeholder="Descreva o preparo, se necessário">${esc(op.prep||'')}</textarea></div>`;
    root.appendChild(box);
  });
  document.querySelectorAll('.remove-option').forEach(b=>b.onclick=()=>{
    syncDraftOptions();
    draftOptions.splice(Number(b.dataset.i),1);
    renderOptionsEditor();
  });
}
function syncDraftOptions(){
  document.querySelectorAll('.op-label').forEach(el=>draftOptions[Number(el.dataset.i)].label=el.value.trim());
  document.querySelectorAll('.op-dish').forEach(el=>draftOptions[Number(el.dataset.i)].dish=el.value.trim());
  document.querySelectorAll('.op-ingredients').forEach(el=>draftOptions[Number(el.dataset.i)].ingredients=el.value.trim());
  document.querySelectorAll('.op-prep').forEach(el=>draftOptions[Number(el.dataset.i)].prep=el.value.trim());
}
function openMealModal(id=null){
  editingMealId=id;
  const meal=id?normalizeMeal(state.currentPlan.meals.find(m=>m.id===id)):null;
  $('mealModalTitle').textContent=meal?'Editar refeição':'Nova refeição';
  $('mealName').value=meal?.name||'';
  draftOptions=meal?clone(meal.options):[{id:uid(),label:'Opção 1',dish:'',ingredients:'',prep:''}];
  renderOptionsEditor();
  $('mealModal').classList.add('open');
}
function closeMealModal(){ $('mealModal').classList.remove('open');editingMealId=null;draftOptions=[] }
function saveMeal(){
  const name=$('mealName').value.trim();
  if(!name)return;
  syncDraftOptions();
  draftOptions=draftOptions.map((o,i)=>({...o,id:o.id||uid(),label:o.label||`Opção ${i+1}`}));
  const data={name,options:clone(draftOptions)};
  if(editingMealId){
    const i=state.currentPlan.meals.findIndex(m=>m.id===editingMealId);
    if(i>=0)state.currentPlan.meals[i]={...state.currentPlan.meals[i],...data};
  }else{
    state.currentPlan.meals.push({id:uid(),...data});
  }
  save();closeMealModal();renderAll();
}
function deleteMeal(id){
  state.currentPlan.meals=state.currentPlan.meals.filter(m=>m.id!==id);
  save();renderAll();
}
function archivePlan(){
  if(!state.currentPlan.meals.length)return alert('O plano atual está vazio.');
  state.history.unshift({...clone(state.currentPlan),archivedAt:new Date().toISOString()});
  state.currentPlan={id:uid(),name:'Plano atual',createdAt:new Date().toISOString(),meals:[]};
  save();renderAll();
}
function ensureToday(){
  const key=todayKey();
  if(!state.days[key] || state.days[key].sourcePlanId!==state.currentPlan.id){
    state.days[key]={
      sourcePlanId:state.currentPlan.id,
      meals:clone(state.currentPlan.meals.map(normalizeMeal)),
      mealChecks:{},
      selectedOptions:{},
      createdAt:new Date().toISOString()
    };
    state.days[key].meals.forEach(m=>{
      if(m.options.length===1)state.days[key].selectedOptions[m.id]=m.options[0].id;
    });
  }
  return state.days[key];
}
