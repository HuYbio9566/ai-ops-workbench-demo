/* Pending and synced records belong to the current bot, not the page session. */
const reflowState = {};
let reflowEditing = null;
function currentReflow(){
  return reflowState[activeBot] ||= {pending:[], synced:[], selected:new Set(), nextId:1};
}
function reflowEscape(value){
  return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function reflowSourceMarkup(record){
  return `<span class="tag ${record.a?'blue':'warn'}">${record.a?'互联网':'缺口'}${record.src!=='缺口'?' · '+reflowEscape(record.src):''}</span><span>${reflowEscape(record.group)}</span>`;
}
function reflowSources(){
  const internet = REFLOWS[activeBot] || [];
  const gaps = (MISS_QA[activeBot] || []).map(q=>typeof q==='string'
    ? {q, a:'', src:'缺口', group:'未标注来源'} : {...q, a:'', src:q.src || '缺口'});
  // The older demo lists a question in both gaps and internet answers.
  return [...gaps.filter(g=>!internet.some(r=>r.q===g.q)), ...internet];
}
function reflowTime(){
  return new Date().toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
}
function renderReflow(){
  $('reflowStatus').textContent = '';
  renderMissQa();
  renderPending();
  renderReflowed();
}
function renderMissQa(){
  const state = currentReflow();
  const sources = reflowSources();
  const select = $('missSrcSel');
  const previous = select.value;
  select.innerHTML = '<option value="">全部来源</option>' +
    ['群聊','频道','未标注来源'].map(type=>{
      const groups = [...new Set(sources.filter(r=>type==='未标注来源'
        ? r.group==='未标注来源' : r.src===type).map(r=>r.group))];
      return groups.length ? `<optgroup label="${type}">${groups.map(group=>`<option value="${reflowEscape(group)}">${reflowEscape(group)}</option>`).join('')}</optgroup>` : '';
    }).join('');
  if([...select.options].some(o=>o.value===previous)) select.value = previous;
  const rows = sources.map((r,i)=>({...r,index:i})).filter(r=>
    ![...state.pending,...state.synced].some(p=>p.sourceQ===r.q) &&
    (!select.value || r.group===select.value));
  $('missQa').innerHTML = rows.map(r=>`
    <article class="rf-record">
      <div class="rf-question">${reflowEscape(r.q)}</div>
      ${r.a?`<div class="rf-answer rf-preview">${reflowEscape(r.a)}</div>`:''}
      <div class="rf-record-header">
        <div class="rf-meta">${reflowSourceMarkup(r)}</div>
        <button class="btn primary sm" onclick="handleReflowSource(${r.index})">处理</button>
      </div>
    </article>`).join('') || '<div class="rf-empty">暂无未命中问题</div>';
}
function handleReflowSource(index){
  const record = reflowSources()[index];
  if(record) openReflowEditor(record);
}
function addQAtoReflow(index){
  const record = (QA_RECORDS[activeBot] || [])[index];
  if(record) openReflowEditor({q:record.q, a:record.a || '', src:'历史问答', group:'历史问答检索'});
}
function openReflowEditor(record){
  reflowEditing = {bot:activeBot, record};
  $('hmTitle').textContent = record.src==='历史问答' ? '处理历史问答' : '处理未命中问题';
  $('hmSource').innerHTML = reflowSourceMarkup(record);
  $('hmQ').value = record.q;
  $('hmA').value = record.a || '';
  const libs = BOT_LIBS[activeBot] || [];
  $('hmLib').innerHTML = libs.length
    ? libs.map(l=>`<option value="${reflowEscape(l.name)}">${reflowEscape(l.name)}${l.type==='faq'?'（FAQ）':'（文档）'}</option>`).join('')
    : '<option value="">暂未对接知识库</option>';
  $('hmError').textContent = libs.length ? '' : '暂无可用知识库，请先在对接知识库中添加';
  $('hmSubmit').disabled = !libs.length;
  openModal('handleMissModal');
}
function cancelHandleMiss(){
  reflowEditing = null;
  closeModal('handleMissModal');
}
function confirmHandleMiss(){
  if(!reflowEditing || reflowEditing.bot!==activeBot) return;
  const state = currentReflow();
  const q = reflowEditing.record.q.trim(), a = $('hmA').value.trim();
  const lib = (BOT_LIBS[activeBot] || []).find(l=>l.name===$('hmLib').value);
  if(!q || !a || !lib){
    $('hmError').textContent = !q || !a ? '请填写完整的问题和答案' : '请选择目标知识库';
    return;
  }
  if([...state.pending,...state.synced].some(p=>p.q===q || p.sourceQ===q)){
    $('hmError').textContent = '该问题已在待同步表或已回流知识中';
    return;
  }
  const item = {id:state.nextId++,sourceQ:reflowEditing.record.q,
    src:reflowEditing.record.src, group:reflowEditing.record.group};
  Object.assign(item,{q,a,lib:lib.name,libType:lib.type,t:reflowTime(),who:USERS[currentUser].name});
  state.pending.push(item);
  cancelHandleMiss();
  renderReflow();
  renderQA();
  $('reflowStatus').textContent = '已加入待同步表，尚未写入知识库';
}
function renderPending(){
  const state = currentReflow();
  $('pendingList').innerHTML = state.pending.map(p=>`
    <article class="rf-record">
      <div class="rf-meta">
        <label class="rf-select"><input type="checkbox" class="pc-chk" data-id="${p.id}" aria-label="选择 ${reflowEscape(p.q)}" ${state.selected.has(p.id)?'checked':''} onchange="selectPending(${p.id},this.checked)"><span class="tag">${reflowEscape(p.src)}</span></label>
        <span>${reflowEscape(p.group)}</span><span class="tag">${reflowEscape(p.lib)}</span>
      </div>
      <div id="pBody${p.id}"><div class="rf-question">${reflowEscape(p.q)}</div>
      <div class="rf-answer">${reflowEscape(p.a)}</div></div>
      <div class="rf-record-footer"><span class="rf-meta">${reflowEscape(p.t)} · ${reflowEscape(p.who)}</span>
        <div class="rf-actions" id="pOps${p.id}"><button class="btn sm" onclick="editPending(${p.id})">编辑</button><button class="btn sm" onclick="removePending(${p.id})">移除</button></div>
      </div>
    </article>`).join('') || '<div class="rf-empty">暂无待同步记录</div>';
  updatePendingSel();
}
function selectPending(id,checked){
  const selected = currentReflow().selected;
  if(checked) selected.add(id); else selected.delete(id);
  updatePendingSel();
}
function updatePendingSel(){
  const {pending,selected} = currentReflow();
  $('reflowSelCount').textContent = selected.size;
  $('reflowSelAll').checked = pending.length>0 && selected.size===pending.length;
  $('reflowSelAll').indeterminate = selected.size>0 && selected.size<pending.length;
  $('reflowSelAll').disabled = !pending.length;
  $('syncPendingButton').disabled = !selected.size;
}
function togglePendingAll(el){
  const state = currentReflow();
  state.selected = new Set(el.checked ? state.pending.map(p=>p.id) : []);
  renderPending();
}
function editPending(id){
  const record = currentReflow().pending.find(p=>p.id===id);
  if(!record) return;
  const libs = BOT_LIBS[activeBot] || [];
  $('pBody'+id).innerHTML = `<label class="rf-field">问题<input type="text" id="pq${id}" value="${reflowEscape(record.q)}" required></label>
    <label class="rf-field">答案<textarea id="pa${id}" required>${reflowEscape(record.a)}</textarea></label>
    <label class="rf-field">目标知识库<select id="pl${id}" required>
      <option value="" ${libs.some(l=>l.name===record.lib)?'':'selected'}>请选择目标知识库</option>
      ${libs.map(l=>`<option value="${reflowEscape(l.name)}" ${l.name===record.lib?'selected':''}>${reflowEscape(l.name)}${l.type==='faq'?'（FAQ）':'（文档）'}</option>`).join('')}
    </select></label><div id="pError${id}" class="rf-error" role="alert"></div>`;
  $('pOps'+id).innerHTML = `<button class="btn primary sm" onclick="savePending(${id})">保存</button><button class="btn sm" onclick="renderPending()">取消</button>`;
}
function savePending(id){
  const state = currentReflow(), record = state.pending.find(p=>p.id===id);
  if(!record) return;
  const q = $('pq'+id).value.trim(), a = $('pa'+id).value.trim();
  const lib = (BOT_LIBS[activeBot] || []).find(l=>l.name===$('pl'+id).value);
  if(!q || !a || !lib){
    $('pError'+id).textContent = !q || !a ? '问题和答案不能为空' : '请选择目标知识库';
    return;
  }
  if([...state.pending,...state.synced].some(p=>p.id!==id && (p.q===q || p.sourceQ===q))){
    $('pError'+id).textContent = '该问题已在待同步表或已回流知识中';
    return;
  }
  Object.assign(record,{q,a,lib:lib.name,libType:lib.type,t:reflowTime(),who:USERS[currentUser].name});
  renderPending();
  renderQA();
  $('reflowStatus').textContent = '待同步记录已保存，尚未写入知识库';
}
function removePending(id){
  const state = currentReflow();
  state.pending = state.pending.filter(p=>p.id!==id);
  state.selected.delete(id);
  renderReflow();
  renderQA();
  $('reflowStatus').textContent = '已移除待同步记录，原问题可重新处理';
}
function writeReflowToKb(record){
  const lib = (BOT_LIBS[activeBot] || []).find(l=>l.name===record.lib);
  if(!lib) return false;
  // Keep stable identity when an already-synced question is renamed.
  const key = `${activeBot}:${record.id}`;
  if(lib.type==='faq'){
    lib.items ||= [];
    let item = lib.items.find(x=>x.reflowId===key || x.q===(record.syncedQ || record.q));
    if(!item){ item = {}; lib.items.unshift(item); }
    Object.assign(item,{reflowId:key,q:record.q,a:record.a,src:'人工回流',st:'已上线'});
  } else {
    lib.files ||= [];
    let file = lib.files.find(f=>f.n.includes('高频问题FAQ'));
    if(!file){
      file = {n:'高频问题FAQ.docx',s:'0.3MB',items:[]};
      lib.files.unshift(file); lib.docs = (lib.docs || 0)+1;
    }
    file.items ||= [];
    let item = file.items.find(x=>x.reflowId===key);
    if(!item){ item = {}; file.items.push(item); }
    Object.assign(item,{reflowId:key,q:record.q,a:record.a});
    Object.assign(file,{t:'刚刚',st:'解析中'});
  }
  lib.updated = '刚刚';
  record.syncedQ = record.q;
  return true;
}
function syncPending(){
  const state = currentReflow();
  if(!state.selected.size){
    $('reflowStatus').textContent = '请先勾选要同步的记录';
    return;
  }
  let count = 0, failed = 0;
  state.pending = state.pending.filter(record=>{
    if(!state.selected.has(record.id)) return true;
    if(!writeReflowToKb(record)){ failed++; return true; }
    state.synced.unshift({...record,dirty:false,t:reflowTime()});
    state.selected.delete(record.id); count++;
    return false;
  });
  renderKb(); renderQA();
  $('reflowStatus').textContent = `${count} 条已同步${failed ? `，${failed} 条目标知识库不可用，已保留在待同步表` : ''}`;
}
function openReflowed(){
  $('reflowedSearch').value = '';
  $('reflowedLibSel').value = '';
  $('reflowedStatus').textContent = '';
  renderReflowed();
  openModal('reflowedModal');
}
function renderReflowed(){
  const state = currentReflow();
  const select = $('reflowedLibSel'), previous = select.value;
  select.innerHTML = '<option value="">全部知识库</option>' +
    [...new Set([...(BOT_LIBS[activeBot] || []).map(l=>l.name),...state.synced.map(r=>r.lib)])].map(lib=>`<option value="${reflowEscape(lib)}">${reflowEscape(lib)}</option>`).join('');
  if([...select.options].some(o=>o.value===previous)) select.value = previous;
  const kw = $('reflowedSearch').value.trim().toLowerCase();
  const rows = state.synced.filter(r=>(!select.value || select.value===r.lib) &&
    (!kw || `${r.q} ${r.a}`.toLowerCase().includes(kw)));
  $('reflowedBotName').textContent = BOTS[activeBot].name;
  $('reflowedCount').textContent = state.synced.length;
  $('reflowedFilterCount').textContent = `${rows.length} 条`;
  $('reflowedPanel').innerHTML = rows.map(r=>`
    <article class="rf-record">
      <div class="rf-meta"><span class="tag ${r.dirty?'warn':'green'}">${r.dirty?'已修改 · 待同步':'已同步'}</span><span>${reflowEscape(r.lib)} · ${reflowEscape(r.t)} · ${reflowEscape(r.who)}</span></div>
      <div id="rfBody${r.id}"><div class="rf-question">${reflowEscape(r.q)}</div><div class="rf-answer">${reflowEscape(r.a)}</div></div>
      <div class="rf-actions" id="rfOps${r.id}"><button class="btn sm" onclick="editReflowed(${r.id})">修改</button><button class="btn primary sm" onclick="syncReflowedNow(${r.id})" ${r.dirty?'':'disabled'}>同步到知识库</button></div>
    </article>`).join('') || '<div class="rf-empty">暂无匹配的已回流知识</div>';
}
function editReflowed(id){
  const record = currentReflow().synced.find(r=>r.id===id);
  if(!record) return;
  $('rfBody'+id).innerHTML = `<label class="rf-field">问题<input type="text" id="rfq${id}" value="${reflowEscape(record.q)}"></label>
    <label class="rf-field">答案<textarea id="rfa${id}">${reflowEscape(record.a)}</textarea></label>
    <div id="rfError${id}" class="rf-error" role="alert"></div>`;
  $('rfOps'+id).innerHTML = `<button class="btn primary sm" onclick="saveReflowedEdit(${id})">保存修改</button><button class="btn sm" onclick="renderReflowed()">取消</button>`;
}
function saveReflowedEdit(id){
  const state = currentReflow(), record = state.synced.find(r=>r.id===id);
  if(!record) return;
  const q = $('rfq'+id).value.trim(), a = $('rfa'+id).value.trim();
  if(!q || !a){ $('rfError'+id).textContent = '问题和答案不能为空'; return; }
  if([...state.pending,...state.synced].some(r=>r.id!==id && r.q===q)){
    $('rfError'+id).textContent = '该问题已存在'; return;
  }
  if(record.q!==q || record.a!==a) Object.assign(record,{q,a,dirty:true});
  renderReflowed();
  $('reflowedStatus').textContent = record.dirty ? '修改已保存，尚未同步到知识库' : '内容未变化，无需再次同步';
}
function syncReflowedNow(id){
  const record = currentReflow().synced.find(r=>r.id===id);
  if(!record || !record.dirty) return;
  if(!writeReflowToKb(record)){ $('reflowedStatus').textContent = '目标知识库不可用，修改已保留'; return; }
  Object.assign(record,{dirty:false,t:reflowTime()});
  renderKb(); renderQA();
  $('reflowedStatus').textContent = `已同步到「${record.lib}」`;
}
let qaPage = 1;
let qaPageSize = 10;
let qaPageCount = 1;
let qaFilterKey = '';
function changeQAPageSize(value){
  $('qaCustomPageSize').hidden = value !== 'custom';
  if(value === 'custom'){
    $('qaCustomPageSize').value = qaPageSize;
    $('qaCustomPageSize').focus();
    $('qaCustomPageSize').select();
  } else setQAPageSize(value);
}
function setQAPageSize(value){
  const size = Number(value);
  if(!Number.isSafeInteger(size) || size < 1){
    $('qaCustomPageSize').value = qaPageSize;
    return;
  }
  qaPageSize = size;
  qaPage = 1;
  $('qaCustomPageSize').value = size;
  renderQA();
}
function goQAPage(value){
  const page = Number(value);
  if(!Number.isSafeInteger(page)){
    $('qaPageNumber').value = qaPage;
    return;
  }
  qaPage = Math.max(1, Math.min(qaPageCount, page));
  renderQA();
}
function renderQA(){
  const records = QA_RECORDS[activeBot] || [];
  const kw = $('qaSearch').value.trim().toLowerCase(), status = $('qaStatus').value;
  const filterKey = JSON.stringify([activeBot, kw, status]);
  if(filterKey !== qaFilterKey){
    qaPage = 1;
    qaFilterKey = filterKey;
  }
  const state = currentReflow();
  const rows = records.map((r,index)=>({...r,index})).filter(r=>
    (!kw || `${r.q} ${r.u}`.toLowerCase().includes(kw)) && (!status || r.hit===status));
  qaPageCount = Math.max(1, Math.ceil(rows.length / qaPageSize));
  qaPage = Math.min(qaPage, qaPageCount);
  const start = (qaPage - 1) * qaPageSize;
  const pageRows = rows.slice(start, start + qaPageSize);
  $('qaPageNumber').value = qaPage;
  $('qaPageTotal').textContent = `/ ${qaPageCount} 页`;
  $('qaPrevPage').disabled = qaPage === 1;
  $('qaNextPage').disabled = qaPage === qaPageCount;
  $('qaTable').innerHTML = pageRows.map(r=>{
    const pending = state.pending.some(p=>p.sourceQ===r.q || p.q===r.q);
    const synced = state.synced.some(p=>p.sourceQ===r.q || p.q===r.q);
    return `<tr><td class="mono">${reflowEscape(r.t)}</td><td>${reflowEscape(r.u)}</td><td>${reflowEscape(r.q)}</td><td><span class="tag ${r.hit==='已命中'?'green':'warn'}">${r.hit}</span></td>
      <td><div class="rf-table-actions"><button class="btn sm" onclick="viewReflowQA(${r.index})">查看</button>${pending?'<span class="tag">已在待同步表</span>':synced?'<button class="btn sm" onclick="openReflowed()">已回流知识</button>':`<button class="btn primary sm" onclick="addQAtoReflow(${r.index})">处理</button>`}</div></td></tr>`;
  }).join('') || '<tr><td colspan="5" class="rf-empty">无匹配记录</td></tr>';
  $('qaCount').textContent = `${BOTS[activeBot].name} · 共 ${rows.length} 条 · ${rows.length ? start + 1 : 0}–${start + pageRows.length} 条`;
}
function viewReflowQA(index){
  const record = (QA_RECORDS[activeBot] || [])[index];
  if(record) drillQADetail(record.q);
}
