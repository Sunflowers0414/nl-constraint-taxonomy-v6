/* Interactive taxonomy. All counts are fixed V6 counts, independent of the current view. */
(() => {
  'use strict';
  const data = window.TAXONOMY_DATA;
  if (!data || !data.tree) { document.getElementById('tree-canvas').textContent = '分类数据加载失败，请刷新页面。'; return; }
  const $ = (id) => document.getElementById(id);
  const palette = {recognition:'#315ba3',extraction:'#217d80',completion:'#7a63aa',root:'#294a78'};
  const kindNames = {root:'研究范围',task:'子任务',primary:'一级技术路线',secondary:'二级技术路线'};
  const index = new Map(), parents = new Map();
  function collect(node,parent=null) {index.set(node.id,node);if(parent)parents.set(node.id,parent.id);node.children.forEach(n=>collect(n,node));}
  collect(data.tree);
  const expanded = new Set(['root','recognition']);
  let filter = 'all', query = '', selected = data.tree, zoom = 1, visible = [], positions = new Map(), geometry = {width:1100,height:650}, firstRender = true;
  let beforeDrawerFocus = null, hoverId = null, mobileLayout = window.innerWidth < 700;
  const xs = [30,330,670,1150], widths = [220,250,395,340], heights = [104,82,76,72];
  const viewport=$('tree-viewport'), canvas=$('tree-canvas'), tooltip=$('node-tooltip');
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const color = n => palette[n.task] || palette.root;
  function matches(n) {const alias=n.name.includes('LLM')?' 大语言模型 大模型 提示':'';return (n.name+' '+n.id+alias).toLocaleLowerCase().includes(query);}
  function prune(node) {
    if(node.kind==='task' && filter!=='all' && node.id!==filter)return null;
    const children=node.children.map(prune).filter(Boolean);
    if(query && node.id!=='root' && !matches(node) && !children.length)return null;
    // A matching parent reveals its complete children, with counts still taken from V6.
    return {...node,children:query && matches(node)?node.children:children};
  }
  function model() {
    const root=prune(data.tree);
    if(query && !root.children.length && !matches(root))return null;
    return root;
  }
  function layout(root) {
    visible=[];positions=new Map();let leaf=0,maxDepth=0;
    mobileLayout=window.innerWidth<700;
    if(mobileLayout){
      let cursor=62;const available=Math.max(245,viewport.clientWidth);
      function stack(node,depth){
        const children=(expanded.has(node.id)||query)?node.children:[],x=16+depth*15,w=available-x-18,font=depth===0?16:depth===1?15:14;
        const units=[...node.name].reduce((n,c)=>n+(/[^\x00-\xff]/.test(c)?font:font*.58),0),lines=Math.max(1,Math.ceil(units/Math.max(70,w-112)));
        const height=Math.max(depth===0?94:74,Math.ceil(lines*font*1.6+28));
        visible.push(node);maxDepth=Math.max(depth,maxDepth);
        positions.set(node.id,{x,y:cursor,width:w,height,center:cursor+height/2,depth,shownChildren:children});
        cursor+=height+18;children.forEach(n=>stack(n,depth+1));
      }
      stack(root,0);geometry={width:available,height:Math.max(410,cursor+22),maxDepth};return;
    }
    function place(node,depth) {
      const children=(expanded.has(node.id)||query)?node.children:[];
      const start=visible.length;visible.push(node);maxDepth=Math.max(depth,maxDepth);
      let y;
      if(children.length){const ys=children.map(n=>place(n,depth+1));y=(ys[0]+ys[ys.length-1])/2;}
      else{y=83+leaf*96;leaf++;}
      positions.set(node.id,{x:xs[depth],y:y-heights[depth]/2,width:widths[depth],height:heights[depth],center:y,depth,shownChildren:children});
      return y;
    }
    place(root,0);
    geometry={width:xs[maxDepth]+widths[maxDepth]+34,height:Math.max(410,leaf*96+84),maxDepth};
  }
  function render(focusId) {
    const prior=document.activeElement?.dataset?.nodeId;
    hideTooltip();canvas.replaceChildren();
    const root=model();$('empty-state').hidden=!!root;
    if(!root){$('tree-sizer').style.width='100%';$('tree-sizer').style.height='480px';canvas.style.width='100%';canvas.style.height='480px';visible=[];updateHeading();return;}
    layout(root);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('tree-links');svg.setAttribute('width',geometry.width);svg.setAttribute('height',geometry.height);svg.setAttribute('aria-hidden','true');
    for(const node of visible){const p=positions.get(node.id);for(const child of p.shownChildren){const q=positions.get(child.id),x1=p.x+p.width,x2=q.x,middle=(x1+x2)/2;
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',mobileLayout?`M ${p.x+7} ${p.y+p.height} V ${q.center-9} Q ${p.x+7} ${q.center} ${q.x} ${q.center}`:`M ${x1} ${p.center} C ${middle} ${p.center}, ${middle} ${q.center}, ${x2} ${q.center}`);path.setAttribute('stroke',color(child));path.classList.add('tree-link');path.dataset.child=child.id;svg.append(path);
    }}
    canvas.append(svg);
    for(const node of visible){
      const p=positions.get(node.id),button=document.createElement('button');
      button.type='button';button.className=`tree-node level-${p.depth}${selected.id===node.id?' selected':''}${query&&matches(node)?' search-match':''}`;
      button.dataset.nodeId=node.id;button.setAttribute('role','treeitem');button.setAttribute('aria-level',p.depth+1);button.setAttribute('aria-label',`${node.name}，${node.count}篇文献`);
      if(node.children.length)button.setAttribute('aria-expanded',String(expanded.has(node.id)||!!query));
      button.style.cssText=`left:${p.x}px;top:${p.y}px;width:${p.width}px;height:${p.height}px;--branch:${color(node)}`;
      const title=document.createElement('span');title.className='node-name';title.textContent=node.name;
      const count=document.createElement('span');count.className='node-count';count.textContent=`${node.count}篇`;
      button.append(title,count);
      if(node.children.length){const toggle=document.createElement('span');toggle.className='node-toggle';toggle.setAttribute('aria-hidden','true');toggle.textContent=expanded.has(node.id)||query?'−':'+';button.append(toggle);}
      button.addEventListener('click',()=>activate(node));
      button.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')showTooltip(node,e.clientX,e.clientY);});
      button.addEventListener('pointermove',e=>{if(hoverId===node.id)positionTooltip(e.clientX,e.clientY);});
      button.addEventListener('pointerleave',hideTooltip);
      button.addEventListener('focus',()=>{if(button.matches(':focus-visible')){const r=button.getBoundingClientRect();showTooltip(node,r.right,r.top);}});
      button.addEventListener('blur',hideTooltip);
      canvas.append(button);
    }
    canvas.style.width=`${geometry.width}px`;canvas.style.height=`${geometry.height}px`;
    if(firstRender){fitView();firstRender=false;}else applyZoom();
    const id=focusId||prior;if(id){const next=[...canvas.querySelectorAll('[data-node-id]')].find(n=>n.dataset.nodeId===id);next?.focus({preventScroll:true});}
    $('live-announcement').textContent=`当前显示${visible.length}个分类节点。`;
    updateHeading();
  }
  function select(node) {
    selected=index.get(node.id)||node;
    $('selected-name').textContent=selected.name;$('selected-count').textContent=`${selected.count}篇`;
    canvas.querySelectorAll('.selected').forEach(n=>n.classList.remove('selected'));
    const el=[...canvas.querySelectorAll('.tree-node')].find(n=>n.dataset.nodeId===selected.id);el?.classList.add('selected');
  }
  function activate(node) {
    select(node);
    if(node.children.length){if(query){query='';$('search-input').value='';}expanded.has(node.id)?expanded.delete(node.id):expanded.add(node.id);render(node.id);fitView();}
    else openDetails(selected);
  }
  function applyZoom() {
    canvas.style.transform=`scale(${zoom})`;
    $('tree-sizer').style.width=`${Math.ceil(geometry.width*zoom)}px`;$('tree-sizer').style.height=`${Math.ceil(geometry.height*zoom)}px`;
    $('zoom-value').value=`${Math.round(zoom*100)}%`;$('zoom-out').disabled=zoom<=0.55;$('zoom-in').disabled=zoom>=1.4;updateHeading();
  }
  function fitView() {zoom=Math.min(1,Math.max(window.innerWidth<700?1:0.8,(viewport.clientWidth-34)/geometry.width));applyZoom();viewport.scrollLeft=0;}
  function changeZoom(delta) {
    const old=zoom;zoom=Math.min(1.4,Math.max(.55,Math.round((zoom+delta)*100)/100));
    const cx=(viewport.scrollLeft+viewport.clientWidth/2)/old,cy=(viewport.scrollTop+viewport.clientHeight/2)/old;
    applyZoom();viewport.scrollLeft=cx*zoom-viewport.clientWidth/2;viewport.scrollTop=cy*zoom-viewport.clientHeight/2;hideTooltip();
  }
  function updateHeading() {
    const offset=Math.max(0,(viewport.clientWidth-geometry.width*zoom)/2)-viewport.scrollLeft;
    document.querySelectorAll('.diagram-heading span').forEach((el,i)=>{el.style.position='absolute';el.style.left=mobileLayout?'16px':`${xs[i]*zoom+offset+2}px`;el.textContent=mobileLayout?'任务与技术路线':['研究范围','子任务','一级技术路线','二级技术路线'][i];el.hidden=!visible.length||(mobileLayout?i!==0:i>geometry.maxDepth);});
  }
  function positionTooltip(x,y) {
    const rect=tooltip.getBoundingClientRect(),margin=14;
    let left=x+18,top=y+18;
    if(left+rect.width>window.innerWidth-margin)left=x-rect.width-18;
    if(top+rect.height>window.innerHeight-margin)top=y-rect.height-15;
    tooltip.style.left=`${Math.max(margin,Math.min(left,window.innerWidth-rect.width-margin))}px`;
    tooltip.style.top=`${Math.max(margin,Math.min(top,window.innerHeight-rect.height-margin))}px`;
  }
  function showTooltip(node,x,y) {
    hoverId=node.id;tooltip.hidden=false;tooltip.style.setProperty('--tip-color',color(node));
    const task=index.get(node.task),kicker=node.kind==='root'?'V6 · 分类体系':`${kindNames[node.kind]}${task&&node.kind!=='task'?' / '+task.name:''}`;
    tooltip.innerHTML=`<div class="tooltip-kicker">${escapeHTML(kicker)}</div><h3>${escapeHTML(node.name)}</h3><p>${escapeHTML(node.core)}</p><div class="tooltip-footer"><span>${node.count}篇文献支撑</span><span>${node.children.length?(expanded.has(node.id)?'点击收起':'点击展开'):'点击查看文献'}</span></div>`;
    positionTooltip(x,y);
    canvas.querySelectorAll('.tree-link').forEach(p=>{p.classList.toggle('highlight',p.dataset.child===node.id);});
  }
  function hideTooltip(){tooltip.hidden=true;hoverId=null;canvas.querySelectorAll('.tree-link.highlight').forEach(n=>n.classList.remove('highlight'));}
  function openDrawer(title,kicker){
    beforeDrawerFocus=document.activeElement;hideTooltip();$('drawer-title').textContent=title;$('drawer-kicker').textContent=kicker;
    $('drawer-backdrop').hidden=false;$('detail-drawer').hidden=false;document.body.style.overflow='hidden';$('close-drawer').focus();
  }
  function openDetails(node) {
    const content=$('drawer-content');content.replaceChildren();
    const count=document.createElement('span');count.className='drawer-count';count.textContent=`${node.count}篇文献`;
    const core=document.createElement('p');core.className='drawer-core';core.textContent=node.core;content.append(count,core);
    if(node.basis){const basis=document.createElement('p');basis.className='drawer-core';basis.textContent='分类依据：'+node.basis;content.append(basis);}
    const heading=document.createElement('h3');heading.className='drawer-subtitle';heading.textContent='文献清单 · 按原始编号排列';content.append(heading);
    const list=document.createElement('ol');list.className='paper-list';
    node.papers.forEach(p=>{const li=document.createElement('li'),id=document.createElement('span'),title=document.createElement('div'),year=document.createElement('span');id.className='paper-id';id.textContent=`[${String(p.id).padStart(3,'0')}]`;title.className='paper-title';title.textContent=p.title;year.className='paper-year';year.textContent=p.year||'年份未记录';title.append(year);li.append(id,title);list.append(li);});
    content.append(list);openDrawer(node.name,kindNames[node.kind]);
  }
  function closeDrawer(){if($('detail-drawer').hidden)return;$('drawer-backdrop').hidden=true;$('detail-drawer').hidden=true;document.body.style.overflow='';beforeDrawerFocus?.focus({preventScroll:true});}
  function openAbout(){
    $('drawer-content').innerHTML=`<div class="about-content"><p>本页面展示“自然语言程序约束提取”综述前三个子任务的分类体系。任务文献名单沿用V4，技术路线采用V6。</p><div class="about-counts"><span>103篇综述文献</span><span>77篇涉及当前任务</span><span>132条文献—任务记录</span></div><h3>任务与分类依据</h3><dl>${data.tree.children.map(n=>`<dt>${escapeHTML(n.name)} · ${n.count}篇</dt><dd>${escapeHTML(n.core)} ${escapeHTML(n.basis)}</dd>`).join('')}</dl><h3>统计口径</h3><p>同一篇文献可以涉及多个任务。识别与定位、要素与关系抽取中，每篇文献只归入一条主路线；有二级路线时只计入一个主二级。辅助机制不另行重复计数。</p><p>条件推导与补全按信息来源分类，允许同篇支持多个来源。四条路线分别为19、13、10、12篇，共54次支持记录，任务内按文献编号去重为38篇。其中13篇文献使用了多个来源。</p><h3>如何使用</h3><p>点击带“+ / −”的节点展开或收起，悬停查看核心思想。搜索可定位任务和路线。点击末级节点，或使用画布下方的“查看文献清单”，可以查看文献编号、题目及年份。</p><p>键盘操作：Tab聚焦节点，方向键浏览、展开或收起，Enter选择；Esc关闭详情或清除搜索。手机上可滑动浏览，点击节点查看内容。</p><h3>版本范围</h3><p>V6只对V4既有任务文献重新分类，本轮没有重新判定任务纳入范围。节点篇数保持原始统计，不随搜索或展开状态改变。本页暂不包含“规约转换与生成”任务。</p><p>交互形式参考<a href="https://echarts.apache.org/examples/zh/editor.html?c=tree-basic" target="_blank" rel="noopener noreferrer">Apache ECharts树图示例</a>。更新日期：2026年11月26日。</p></div>`;
    openDrawer('关于分类体系','分类说明 · V6');
  }
  function searchChanged(){query=$('search-input').value.trim().toLocaleLowerCase();expanded.add('root');render();viewport.scrollTop=0;}
  $('search-input').addEventListener('input',searchChanged);
  $('clear-search').addEventListener('click',()=>{$('search-input').value='';query='';render();$('search-input').focus();});
  document.querySelectorAll('.task-tab').forEach(button=>button.addEventListener('click',()=>{
    filter=button.dataset.task;query='';$('search-input').value='';expanded.add('root');if(filter!=='all')expanded.add(filter);
    document.querySelectorAll('.task-tab').forEach(t=>{const on=t===button;t.classList.toggle('active',on);t.setAttribute('aria-pressed',String(on));});
    render();fitView();viewport.scrollTop=0;
  }));
  $('expand-all').addEventListener('click',()=>{index.forEach(n=>{if(n.children.length)expanded.add(n.id);});render();fitView();viewport.scrollTop=0;});
  $('collapse-all').addEventListener('click',()=>{expanded.clear();expanded.add('root');query='';$('search-input').value='';render();fitView();viewport.scrollTop=0;});
  $('zoom-in').addEventListener('click',()=>changeZoom(.1));$('zoom-out').addEventListener('click',()=>changeZoom(-.1));$('fit-view').addEventListener('click',()=>{fitView();viewport.scrollTop=0;});
  $('show-papers').addEventListener('click',()=>openDetails(selected));$('about-button').addEventListener('click',openAbout);
  $('close-drawer').addEventListener('click',closeDrawer);$('drawer-backdrop').addEventListener('click',closeDrawer);
  canvas.addEventListener('keydown',e=>{
    const id=e.target.dataset.nodeId;if(!id)return;const node=index.get(id),at=visible.findIndex(n=>n.id===id);let focus;
    if(e.key==='ArrowDown')focus=visible[Math.min(at+1,visible.length-1)]?.id;
    if(e.key==='ArrowUp')focus=visible[Math.max(0,at-1)]?.id;
    if(e.key==='Home')focus=visible[0]?.id;
    if(e.key==='End')focus=visible[visible.length-1]?.id;
    if(e.key==='ArrowRight'){if(node.children.length&&!expanded.has(id)){expanded.add(id);render(id);}else focus=positions.get(id)?.shownChildren[0]?.id;}
    if(e.key==='ArrowLeft'){if(node.children.length&&expanded.has(id)){expanded.delete(id);render(id);}else focus=parents.get(id);}
    if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();if(focus){const el=[...canvas.querySelectorAll('.tree-node')].find(n=>n.dataset.nodeId===focus);el?.focus();el?.scrollIntoView({block:'nearest',inline:'nearest'});}}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(!$('detail-drawer').hidden)closeDrawer();else if(query){$('search-input').value='';query='';render();}hideTooltip();}
    if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&$('detail-drawer').hidden){e.preventDefault();$('search-input').focus();}
    if(e.key==='Tab'&&!$('detail-drawer').hidden){const items=[...$('detail-drawer').querySelectorAll('button,a[href]')],first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  let drag=null;
  viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.target.closest('button')||e.button!==0)return;drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,id:e.pointerId};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');hideTooltip();});
  viewport.addEventListener('pointermove',e=>{if(drag){viewport.scrollLeft=drag.left-(e.clientX-drag.x);viewport.scrollTop=drag.top-(e.clientY-drag.y);}});
  const endDrag=()=>{drag=null;viewport.classList.remove('dragging');};viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
  viewport.addEventListener('scroll',()=>{hideTooltip();updateHeading();},{passive:true});
  window.addEventListener('resize',()=>{hideTooltip();if((window.innerWidth<700)!==mobileLayout||mobileLayout){render();fitView();}else updateHeading();});window.addEventListener('scroll',hideTooltip,{passive:true});
  function wrapSVG(text,maxWidth,fontSize){const lines=[];let line='',width=0;for(const char of text){const w=/[^\x00-\xff]/.test(char)?fontSize:fontSize*.58;if(width+w>maxWidth&&line){lines.push(line);line='';width=0;}line+=char;width+=w;}if(line)lines.push(line);return lines;}
  $('download-svg').addEventListener('click',()=>{
    if(!visible.length)return;
    const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${geometry.width+40}" height="${geometry.height+80}" viewBox="0 0 ${geometry.width+40} ${geometry.height+80}"><rect width="100%" height="100%" fill="#fbfcfe"/><text x="30" y="28" font-family="Arial,Microsoft YaHei,sans-serif" font-size="17" font-weight="bold" fill="#203f71">自然语言程序约束提取 · V6</text><g transform="translate(0,40)">`];
    visible.forEach(n=>{const p=positions.get(n.id);p.shownChildren.forEach(c=>{const q=positions.get(c.id),x1=p.x+p.width,m=(x1+q.x)/2;parts.push(`<path d="M${x1} ${p.center} C${m} ${p.center},${m} ${q.center},${q.x} ${q.center}" fill="none" stroke="${color(c)}" stroke-width="1.5" opacity=".55"/>`);});});
    visible.forEach(n=>{const p=positions.get(n.id),dark=n.kind==='root',fontSize=14,lines=wrapSVG(n.name,p.width-88,fontSize),firstY=p.y+p.height/2-(lines.length-1)*11+5;parts.push(`<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="8" fill="${dark?'#233f69':'white'}" stroke="${color(n)}" stroke-opacity="${dark?1:.4}"/><text font-family="Arial,Microsoft YaHei,sans-serif" font-size="${fontSize}" fill="${dark?'white':'#253e60'}">${lines.map((s,i)=>`<tspan x="${p.x+16}" y="${firstY+i*22}">${escapeHTML(s)}</tspan>`).join('')}</text><text x="${p.x+p.width-16}" y="${p.center+5}" text-anchor="end" font-family="Arial,Microsoft YaHei,sans-serif" font-size="13" fill="${dark?'#dce8fa':color(n)}">${n.count}篇</text>`);});
    parts.push('</g><text x="30" y="'+(geometry.height+65)+'" font-family="Arial,Microsoft YaHei,sans-serif" font-size="12" fill="#78889d">V4文献范围 · V6技术路线。推导与补全允许同篇多来源；路线篇数不直接相加为去重篇数。</text></svg>');
    const url=URL.createObjectURL(new Blob(parts,{type:'image/svg+xml;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='程序约束提取_分类体系_V6.svg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
  });
  render();
})();
