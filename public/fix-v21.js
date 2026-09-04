function ingredientPartsV21(value){
  if(!Array.isArray(value))return null;
  return value.map(item=>({
    name:String(item?.name||item?.ingredient||'').trim(),
    quantity:[String(item?.quantity??'').trim(),String(item?.unit??item?.measure??'').trim()].filter(Boolean).join(' ').trim()
  })).filter(item=>item.name||item.quantity);
}
function ingredientDisplayV21(value){
  const items=ingredientPartsV21(value);
  if(items){
    if(!items.length)return '';
    return `<div class="ingredient-display-list">${items.map(item=>`<div class="ingredient-display-row"><span>${esc(item.name)||'—'}</span>${item.quantity?`<strong>${esc(item.quantity)}</strong>`:''}</div>`).join('')}</div>`;
  }
  const text=String(value||'').trim();
  return text?esc(text).replace(/\n/g,'<br>'):'';
}
function hasIngredientsV21(value){
  if(Array.isArray(value))return value.some(item=>String(item?.name||item?.ingredient||item?.quantity||'').trim());
  return Boolean(String(value||'').trim());
}

renderCurrent=function(){
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
        ${hasIngredientsV21(op.ingredients)?`<div class="block-content" style="margin-top:9px"><span style="color:var(--muted)">Ingredientes</span>${ingredientDisplayV21(op.ingredients)}</div>`:''}
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
};

renderOptionsEditor=function(){
  const root=$('optionsEditor');
  root.innerHTML='';
  draftOptions.forEach((op,i)=>{
    const box=document.createElement('div');
    box.className='option-editor';
    const structured=Array.isArray(op.ingredients);
    box.innerHTML=`
      <div class="option-editor-head">
        <div class="option-editor-title">Opção ${i+1}</div>
        ${draftOptions.length>1?`<button class="icon-btn remove-option" data-i="${i}" title="Remover">×</button>`:''}
      </div>
      <div class="field"><label>Nome da opção</label><input class="op-label" data-i="${i}" value="${esc(op.label||`Opção ${i+1}`)}" placeholder="Ex.: Opção ${i+1}"></div>
      <div class="field"><label>Prato / refeição</label><input class="op-dish" data-i="${i}" value="${esc(op.dish||'')}" placeholder="Ex.: Iogurte com fruta"></div>
      <div class="field"><label>Ingredientes</label>
        ${structured?`
          <div class="ingredient-editor" data-i="${i}">
            ${(op.ingredients.length?op.ingredients:[{name:'',quantity:''}]).map((ing,j)=>`<div class="ingredient-editor-row">
              <input class="ingredient-name" value="${esc(ing?.name||ing?.ingredient||'')}" placeholder="Ingrediente">
              <input class="ingredient-qty" value="${esc([String(ing?.quantity??'').trim(),String(ing?.unit??ing?.measure??'').trim()].filter(Boolean).join(' '))}" placeholder="Quantidade (ex.: 150 g)">
              <button type="button" class="icon-btn remove-ingredient" data-i="${i}" data-j="${j}" title="Remover ingrediente">×</button>
            </div>`).join('')}
            <button type="button" class="ingredient-add add-ingredient" data-i="${i}">+ Ingrediente</button>
          </div>`:
          `<textarea class="op-ingredients" data-i="${i}" rows="4" placeholder="Liste os ingredientes">${esc(op.ingredients||'')}</textarea>`}
      </div>
      <div class="field"><label>Modo de preparo / observações</label><textarea class="op-prep" data-i="${i}" rows="4" placeholder="Descreva o preparo, se necessário">${esc(op.prep||'')}</textarea></div>`;
    root.appendChild(box);
  });
  document.querySelectorAll('.remove-option').forEach(b=>b.onclick=()=>{
    syncDraftOptions();
    draftOptions.splice(Number(b.dataset.i),1);
    renderOptionsEditor();
  });
  document.querySelectorAll('.add-ingredient').forEach(b=>b.onclick=()=>{
    syncDraftOptions();
    const i=Number(b.dataset.i);
    if(!Array.isArray(draftOptions[i].ingredients))draftOptions[i].ingredients=[];
    draftOptions[i].ingredients.push({name:'',quantity:''});
    renderOptionsEditor();
  });
  document.querySelectorAll('.remove-ingredient').forEach(b=>b.onclick=()=>{
    syncDraftOptions();
    const i=Number(b.dataset.i),j=Number(b.dataset.j);
    if(Array.isArray(draftOptions[i].ingredients))draftOptions[i].ingredients.splice(j,1);
    renderOptionsEditor();
  });
};

syncDraftOptions=function(){
  document.querySelectorAll('.op-label').forEach(el=>draftOptions[Number(el.dataset.i)].label=el.value.trim());
  document.querySelectorAll('.op-dish').forEach(el=>draftOptions[Number(el.dataset.i)].dish=el.value.trim());
  document.querySelectorAll('.op-ingredients').forEach(el=>draftOptions[Number(el.dataset.i)].ingredients=el.value.trim());
  document.querySelectorAll('.ingredient-editor').forEach(editor=>{
    const i=Number(editor.dataset.i);
    const rows=[...editor.querySelectorAll('.ingredient-editor-row')].map(row=>({
      name:(row.querySelector('.ingredient-name')?.value||'').trim(),
      quantity:(row.querySelector('.ingredient-qty')?.value||'').trim()
    })).filter(item=>item.name||item.quantity);
    draftOptions[i].ingredients=rows;
  });
  document.querySelectorAll('.op-prep').forEach(el=>draftOptions[Number(el.dataset.i)].prep=el.value.trim());
};

fetch('./icon.svg?v=21',{cache:'no-store'})
  .then(r=>r.text())
  .then(svg=>{
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    document.querySelectorAll('.logo img').forEach(img=>img.src=url);
    const favicon=document.querySelector('link[rel="icon"]');
    if(favicon)favicon.href=url;
  })
  .catch(()=>{});

renderCurrent();
