'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nz=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const on=(s,f,r)=>(r||document).querySelectorAll(s).forEach(e=>e.onclick=ev=>f(e,ev));
const G=['linear-gradient(135deg,#f09433,#dc2743)','linear-gradient(135deg,#4facfe,#00f2fe)','linear-gradient(135deg,#43e97b,#38f9d7)','linear-gradient(135deg,#a18cd1,#fbc2eb)','linear-gradient(135deg,#fa709a,#fee140)','linear-gradient(135deg,#667eea,#764ba2)'];
let APPV=null,S=null,tab='home',vw=null,thr=null,setTab='c',first=null,sq='',sk='c',views=0,lastAsk=0,mult=1,booted=false,seenIds=new Set();
const M=()=>S.me.uid,adm=()=>!!(S&&S.me.admin),isMod=()=>!!(S&&S.me.isMod),hd=id=>S.users[id]?S.users[id].handle:'?',R=id=>S.reels.find(r=>r.id==id);
const ofc=id=>S.users[id]&&S.users[id].owner?' <span class="ofc">✔ Oficial</span>':'';
const has=(a,x)=>!!a&&a.includes(x),mutual=(a,b)=>has(S.fol[a],b)&&has(S.fol[b],a);
const ago=t=>{const m=Math.floor((Date.now()-t)/6e4);return m<1?'agora':m<60?m+' min atrás':m<1440?Math.floor(m/60)+' h atrás':Math.floor(m/1440)+' d atrás'};
const link=id=>location.origin+'/#reel='+id;
const stL=r=>(r.mys?'⭐':'☆')+' '+r.stars,bkL=r=>(r.myb?'💔':'🖤')+(r.bk!=null?' '+r.bk:''),lkL=r=>(r.myl?'❤️':'🤍')+' '+r.likes;
/* ---- rede ---- */
async function api(p,o={}){let r;try{r=await fetch(p,{credentials:'same-origin',...o,headers:{'X-Sasc':'1',...(o.headers||{})}})}catch(e){return{status:0,err:'Sem conexão com o servidor.'}}let j={};try{j=await r.json()}catch(e){}return{...j,status:r.status}}
const post=(p,b)=>api(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
async function act(a,b={}){const r=await post('/api/act',{a,...b});if(r.blocked){blockView(r.blocked);return r}await refresh(true);return r}
async function refresh(force){const r=await api('/api/state?v='+(force||!S?0:S.v));if(r.status===401){S=null;booted=false;authView(false);return}if(r.blocked){blockView(r.blocked);return}if(r.same||r.err)return;S=r;if(APPV==null&&r.upd)APPV=r.upd.ver;if(booted)onState()}
function onState(){hdr();if(tab==='home'||tab==='reels')counts();
 const a=document.activeElement,typing=a&&a.matches&&a.matches('input,select,textarea')&&$('#main').contains(a)&&a.id!=='tx';if(typing||$('#modal').innerHTML)return;
 const t=$('#tx'),tv=t?t.value:null,fc=a&&a.id==='tx';
 if(tab==='chat')chat();else if(tab==='thread'){if(S.chats[thr])thread()}else if(tab==='notes')notesV();else if(tab==='user'||tab==='prof')prof(tab==='prof'?M():vw);else if(tab==='set'&&setTab==='a'&&!$('#bk2'))sets();
 if(tv!==null&&$('#tx')){$('#tx').value=tv;if(fc)$('#tx').focus()}}
function counts(){document.querySelectorAll('.reel[data-id]').forEach(el=>{const r=R(el.dataset.id),q=s=>el.querySelector(s);if(!r||!q('[data-st]'))return;q('[data-st]').textContent=stL(r);q('[data-bk]').textContent=bkL(r);q('[data-lk]').textContent=lkL(r);q('[data-cm]').textContent='💬 '+r.nc})}
function toast(m){const t=$('#toast');t.style.display='block';t.textContent=m;clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',2800)}
function modal(h){$('#modal').innerHTML=h?`<div class="ov"><div class="box">${h}</div></div>`:''}
async function copy(t){try{await navigator.clipboard.writeText(t);toast('Link copiado!')}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Link copiado!')}catch(x){toast(t)}a.remove()}}
function resize(f,cb){if(!f)return;const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=128;const m=Math.min(i.width,i.height);c.getContext('2d').drawImage(i,(i.width-m)/2,(i.height-m)/2,m,m,0,0,128,128);cb(c.toDataURL('image/jpeg',.8))};i.src=r.result};r.readAsDataURL(f)}
/* ---- entrada ---- */
function authView(su){$('#auth').style.display='block';$('#app').style.display='none';
 $('#auth').innerHTML=`<img class="logo" src="/logo.png" alt="Sasc"><p class="mut">${su?'Crie sua conta':'Entre na sua conta'}</p>
 ${su?`<div style="margin:10px 0"><img id="pv" class="av" style="width:84px;height:84px;margin:0" alt=""><br><label class="btn s m" style="display:inline-block;margin-top:8px">Escolher foto de perfil<input id="ph" type="file" accept="image/*" hidden></label></div>`:''}
 <input id="h" type="text" placeholder="@ localizador" autocapitalize="none"><input id="p" type="password" placeholder="Senha">
 <div class="err" id="er"></div><button class="btn" id="go">${su?'Cadastrar':'Entrar'}</button>
 <p>${su?'Já tem conta? <a id="sw">Entrar</a>':'Você não tem uma conta? <a id="sw">Clique aqui!</a>'}</p>`;
 let photo='';$('#sw').onclick=()=>authView(!su);if(su)$('#ph').onchange=e=>resize(e.target.files[0],d=>{photo=d;$('#pv').src=d});
 const go=async()=>{$('#go').disabled=true;const r=await post(su?'/api/signup':'/api/login',{handle:$('#h').value,password:$('#p').value,photo});$('#go').disabled=false;if(r.err)return $('#er').textContent=r.err;boot()};
 $('#go').onclick=go;$('#p').onkeydown=e=>{if(e.key==='Enter')go()}}
async function boot(){await refresh(true);if(!S)return;enter()}
function enter(){if(booted)return;booted=true;$('#auth').innerHTML='';$('#auth').style.display='none';$('#app').style.display='flex';
 const m=location.hash.match(/reel=(\d+)/);if(m&&R(m[1]))show('reels',m[1]);else show('home');
 const n=S.notes.filter(x=>!x.r).length;if(n)toast('Você tem '+n+' notificação(ões) nova(s) 🔔')}
function blockView(t){booted=false;const l=Math.max(0,t-Date.now());$('#app').style.display='none';$('#auth').style.display='block';
 $('#auth').innerHTML=`<h1>Pausa</h1><p>Você está no limite de uso. Volte em <b>${Math.floor(l/36e5)}h ${Math.ceil(l%36e5/6e4)}min</b>.</p><button class="btn s" id="lo">Sair</button>`;$('#lo').onclick=logout}
async function logout(){await post('/api/logout',{});S=null;booted=false;authView(false)}
setInterval(()=>{if(S&&booted)refresh(false)},2500);
setInterval(async()=>{if(!S||!booted||document.hidden)return;const r=await post('/api/act',{a:'tick',m:mult});if(r.blocked)return blockView(r.blocked);if(r.usage!=null){S.me.usage=r.usage;clk();degr()}if(r.rest)rest()},30000);
function clk(){const c=$('#clock');if(c&&S)c.textContent='Hoje: '+Math.floor(S.me.usage/60)+' de 180 min'}
function degr(){const u=S.me.usage,f=u>9000?Math.min(1,(u-9000)/1800):0;document.querySelectorAll('.reel video').forEach(e=>e.style.filter=f?`blur(${(f*6).toFixed(1)}px) grayscale(${f}) contrast(${1-f*.4})`:'')}
function rest(){modal(`<h3>Hora de dar um tempo 🌿</h3><p>Você já está há 1 hora no app. Que tal descansar os olhos?</p><button class="btn" id="br">Pausa de 5 minutos</button><button class="btn s" id="ct">Continuar</button>`);
 $('#br').onclick=async()=>{await post('/api/act',{a:'rest'});modal('');blockView(Date.now()+3e5)};$('#ct').onclick=()=>modal('')}
/* ---- atualização do app ---- */
function updBar(){const u=S.upd,b=$('#upd');if(!b)return;if(!u||!u.on||APPV==null||u.ver===APPV){b.innerHTML='';return}
 b.innerHTML=`<span>🔄 ${esc(u.msg||'Nova versão do Sasc disponível!')}</span><button id="ub">Atualizar agora</button>${u.apk?'<button id="ua">Baixar o app (APK)</button>':''}`;
 $('#ub').onclick=()=>doUpdate(false);if($('#ua'))$('#ua').onclick=()=>doUpdate(true)}
async function doUpdate(apk){const ov=document.createElement('div');ov.id='updov';ov.innerHTML='<div class="ubox"><h2>Atualizando…</h2><p id="up">0%</p><div class="bar"><i id="ub2"></i></div><p class="mut">Não feche o app. Se houver muita coisa para carregar, pode levar mais alguns segundos.</p></div>';document.body.appendChild(ov);
 const t0=Date.now(),files=apk?['/download/sasc.apk']:['/','/app.js','/app.css','/sw.js','/manifest.json'],fr=files.map(()=>0),blobs=[];let fin=0;
 Promise.all(files.map(async(f,i)=>{const r=await fetch(f,{cache:'reload',credentials:'same-origin'});if(!r.ok)throw 0;const tot=+r.headers.get('content-length')||0,rd=r.body.getReader(),ch=[];let n=0;for(;;){const{done,value}=await rd.read();if(done)break;ch.push(value);n+=value.length;if(tot)fr[i]=Math.min(.99,n/tot)}fr[i]=1;blobs[i]=new Blob(ch,{type:r.headers.get('content-type')||''})})).then(()=>fin=1).catch(()=>fin=-1);
 await new Promise(ok=>{const iv=setInterval(()=>{const real=fin===1?1:fr.reduce((x,y)=>x+y,0)/fr.length*.99,p=Math.min(real,Math.min(1,(Date.now()-t0)/3000));$('#up').textContent=Math.floor(p*100)+'%';$('#ub2').style.width=p*100+'%';if(fin===-1||(fin===1&&p>=1)){clearInterval(iv);ok()}},100)});
 if(fin===-1){$('#up').textContent='Falha ao atualizar. Tente de novo.';setTimeout(()=>ov.remove(),2500);return}
 if(apk){const x=document.createElement('a');x.href=URL.createObjectURL(blobs[0]);x.download='Sasc.apk';document.body.appendChild(x);x.click();$('#up').textContent='100% - download iniciado';setTimeout(()=>ov.remove(),2500);return}
 $('#up').textContent='100% - abrindo a nova versão…';try{const g=await navigator.serviceWorker.getRegistration();if(g)await g.update()}catch(e){}setTimeout(()=>location.reload(),400)}
/* ---- cabeçalho e navegação ---- */
function hdr(){const u=S.notes.filter(n=>!n.r).length,pn=Object.values(S.chats).filter(c=>!c.acc&&c.to===M()).length,
 g='<button class="ib" id="gb">⚙️</button>',sb='<button class="ib" id="sb">🔍</button>',nb=`<button class="ib" id="nb">🔔${u?`<i class="bd">${u}</i>`:''}</button>`,c=`<button class="ib" id="cb">💬${pn?`<i class="bd">${pn}</i>`:''}</button>`,back=['set','thread','user','search','notes'].includes(tab);
 $('#top').innerHTML=`${back?'<button class="ib" id="bk">←</button>':tab==='prof'?'<img src="/logo.png" class="hl" alt="">':g}<span>${tab==='prof'?'<b>Conta</b>':'<img src="/logo.png" class="hl" alt=""><b>Sasc</b>'}<span id="clock"></span></span>${back?'<span style="min-width:40px"></span>':'<span>'+sb+nb+(tab==='prof'?g:c)+'</span>'}`;
 const q=s=>$(s);if(q('#sb'))q('#sb').onclick=()=>show('search');if(q('#nb'))q('#nb').onclick=()=>show('notes');if(q('#gb'))q('#gb').onclick=()=>show('set');if(q('#cb'))q('#cb').onclick=()=>show('chat');if(q('#bk'))q('#bk').onclick=()=>show(tab==='thread'?'chat':'home');clk();updBar()}
function show(t,a){tab=t;if(t==='user')vw=a;if(t==='thread')thr=a;if(t==='reels')first=a;
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));$('#fab').style.display=['home','reels','prof'].includes(t)?'':'none';
 const m=$('#main');m.className=t==='reels'?'':'feed';m.scrollTop=0;hdr();({home:feed,reels:feed,prof:()=>prof(M()),user:()=>prof(vw),chat,thread,set:sets,search:srch,notes:notesV})[t]()}
const redo=()=>show(tab,tab==='user'?vw:tab==='thread'?thr:undefined);
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.t));$('#fab').onclick=()=>postForm();
/* ---- feed e reels ---- */
function feed(){const p=S.me.prefs||{},sc=r=>(p[r.theme]||0)-(r.flag?100:0),l=S.reels.slice().sort((a,b)=>sc(b)-sc(a)||b.t-a.t);
 if(tab==='reels'&&first){const i=l.findIndex(r=>r.id==first);if(i>0)l.unshift(l.splice(i,1)[0])}
 $('#main').innerHTML=l.map(card).join('')||'<p class="mut pad">Ainda não há reels. Toque no + para postar.</p>';
 on('.dots',(b,e)=>{e.stopPropagation();menu(b)});on('.who',w=>S.users[w.dataset.by]&&show('user',w.dataset.by));
 on('[data-st]',b=>act('star',{id:b.dataset.st}));on('[data-bk]',b=>act('bk',{id:b.dataset.bk}));on('[data-lk]',b=>act('like',{id:b.dataset.lk}));
 on('[data-cm]',b=>cmView(b.dataset.cm));on('[data-cp]',b=>copy(link(b.dataset.cp)));
 const io=new IntersectionObserver(es=>es.forEach(en=>{const v=en.target.querySelector('video'),id=+en.target.dataset.id;
  if(en.isIntersecting&&en.intersectionRatio>.6){if(v&&tab==='reels')v.play().catch(()=>{});seen(id)}else if(v&&tab==='reels')v.pause()}),{threshold:[.6]});
 document.querySelectorAll('.reel').forEach(r=>{io.observe(r);r.onclick=e=>{if(e.target.closest('button,a,.menu,input,select,.who'))return;const v=r.querySelector('video');if(v)v.paused?v.play().catch(()=>{}):v.pause()}});degr()}
function card(r){const u=S.users[r.by];return `<div class="reel" data-id="${r.id}" style="background:${G[r.id%6]}"><video src="/video/${r.id}" loop playsinline preload="metadata"></video><button class="dots" data-id="${r.id}">⋯</button><div class="info">${u?`<img class="av" src="${u.photo}" alt="">`:''}<span class="who" data-by="${r.by}">@${esc(hd(r.by))}</span>${ofc(r.by)}<br><b>${esc(r.name)}</b><br><span class="tag">#${esc(r.theme)}${r.ai?'<span class="ia">Feito com IA</span>':''}</span><div class="acts"><button data-st="${r.id}">${stL(r)}</button><button data-bk="${r.id}">${bkL(r)}</button><button data-lk="${r.id}">${lkL(r)}</button><button data-cm="${r.id}">💬 ${r.nc}</button><button data-cp="${r.id}">🔗</button></div></div></div>`}
function seen(id){if(!seenIds.has(id)){seenIds.add(id);post('/api/act',{a:'view',id})}
 if(++views%12!==0||Date.now()-lastAsk<3e5)return;const r=R(id);if(!r)return;lastAsk=Date.now();const t=$('#toast');t.style.display='block';
 t.innerHTML=`Você gosta de conteúdo de <b>${esc(r.theme)}</b>?<div><button class="btn" id="y">Sim</button><button class="btn s" id="n">Não</button></div>`;
 $('#y').onclick=()=>{post('/api/act',{a:'pref',id,v:1});t.style.display='none'};$('#n').onclick=()=>{post('/api/act',{a:'pref',id,v:-1});t.style.display='none'}}
function menu(b){document.querySelectorAll('.menu').forEach(m=>m.remove());const r=R(b.dataset.id),own=r.by===M(),m=document.createElement('div');m.className='menu';
 m.innerHTML=`<button data-a="l">👍 Gostei deste reel</button><button data-a="d">👎 Não gostei deste reel</button>${own?'':'<button data-a="r">🚩 Denunciar</button>'}${isMod()&&!adm()?'<button data-a="q">🗑️ Pedir exclusão</button>':''}<button data-a="c">🔗 Copiar link</button>${adm()?'<button data-a="x">🗑️ Apagar (admin)</button>':''}${own?'<button data-a="e">✏️ Editar vídeo</button>':''}`;
 b.parentNode.appendChild(m);
 m.onclick=async e=>{const a=e.target.dataset.a;if(!a)return;m.remove();
  if(a==='l'||a==='d'){await post('/api/act',{a:'pref',id:r.id,v:a==='l'?1:-1});return toast(a==='l'?'Que bom! Vamos mostrar mais assim.':'Ok, vamos mostrar menos assim.')}
  if(a==='r')return reportF(r);if(a==='q')return dreqF({rid:r.id});if(a==='c')return copy(link(r.id));if(a==='e')return postForm(r);
  if(a==='x'){await act('delReel',{id:r.id,why:'adm'});toast('Vídeo apagado pelo administrador');redo()}};
 setTimeout(()=>document.addEventListener('click',()=>m.remove(),{once:true}),0)}
/* ---- reel aberto, comentários, denúncias ---- */
function viewReel(id){const r=R(id);if(!r)return toast('Esse reel não existe mais');post('/api/act',{a:'view',id:r.id});const own=r.by===M();
 modal(`<div class="reel" style="height:46vh;border-radius:12px;background:${G[r.id%6]}"><video src="/video/${r.id}" loop playsinline autoplay></video></div>
 <p style="margin:8px 0"><b>${esc(r.name)}</b><br><span class="mut">@${esc(hd(r.by))}</span>${ofc(r.by)} <span class="mut">· #${esc(r.theme)}${r.ai?' · Feito com IA':''}</span></p>
 <div class="acts" style="margin-bottom:6px"><button id="vs">${stL(r)}</button><button id="vb">${bkL(r)}</button><button id="vl">${lkL(r)}</button><button id="vc">🔗 Copiar link</button>${own?'':'<button id="vr">🚩 Denunciar</button>'}${isMod()&&!adm()?'<button id="vq">🗑️ Pedir exclusão</button>':''}${own?'<button id="ve">Editar</button>':''}${adm()?'<button id="vd">🗑️ Apagar (admin)</button>':''}</div>
 <button class="btn s" id="vm">💬 Comentários (${r.nc})</button><button class="btn s" id="cc">Fechar</button>`);
 const v=$('.box video');if(v)v.onclick=()=>v.paused?v.play():v.pause();
 const lb=async a=>{await act(a,{id:r.id});const x=R(id);$('#vs').textContent=stL(x);$('#vb').textContent=bkL(x);$('#vl').textContent=lkL(x)};
 $('#cc').onclick=()=>modal('');$('#vm').onclick=()=>cmView(r.id);$('#vs').onclick=()=>lb('star');$('#vb').onclick=()=>lb('bk');$('#vl').onclick=()=>lb('like');$('#vc').onclick=()=>copy(link(r.id));
 if($('#vr'))$('#vr').onclick=()=>reportF(r);if($('#vq'))$('#vq').onclick=()=>dreqF({rid:r.id});if($('#ve'))$('#ve').onclick=()=>postForm(r);
 if($('#vd'))$('#vd').onclick=async()=>{await act('delReel',{id:r.id,why:'adm'});modal('');redo();toast('Vídeo apagado pelo administrador')}}
function cmView(id){const r=R(id);if(!r)return toast('Esse reel não existe mais');document.querySelectorAll('video').forEach(v=>v.pause());const cm=S.cm[r.id]||[];
 modal(`<h3>Comentários</h3><p class="mut" style="margin-top:-8px">${esc(r.name)}</p><div>${cm.map(c=>`<div style="margin:8px 0"><b>@${esc(hd(c.u))}</b>${ofc(c.u)} <span class="mut">${ago(c.t)}</span>${(r.by===M()||c.u===M()||adm())?` <a data-dc="${c.t}">apagar</a>`:''}<br>${esc(c.x)}</div>`).join('')||'<p class="mut">Seja o primeiro a comentar.</p>'}</div><div class="err" id="er"></div><input id="ci" type="text" placeholder="Escreva um comentário..." maxlength="300"><button class="btn" id="cs">Comentar</button><button class="btn s" id="cc">Fechar</button>`);
 $('#cc').onclick=()=>modal('');on('[data-dc]',a=>act('delcomment',{id:r.id,t:+a.dataset.dc}).then(()=>cmView(id)));
 const sc=async()=>{const x=$('#ci').value.trim();if(!x)return;$('#cs').disabled=true;const res=await act('comment',{id:r.id,x});if(res.err){$('#er').textContent=res.err;$('#cs').disabled=false;return}cmView(id)};
 $('#cs').onclick=sc;$('#ci').onkeydown=e=>{if(e.key==='Enter')sc()}}
const REASONS=o=>o.map(x=>`<option>${x}</option>`).join('');
function reportF(r){modal(`<h3>Denunciar reel</h3><label class="l">Motivo</label><select id="rs">${REASONS(['Conteúdo sexual','Conteúdo envolvendo menores','Violência','Assédio ou ódio','Spam ou golpe','Outro'])}</select><label class="l">Mensagem (opcional)</label><input id="rx" type="text"><div class="err" id="er"></div><button class="btn" id="ok">Enviar denúncia</button><button class="btn s" id="cc">Cancelar</button>`);
 $('#cc').onclick=()=>modal('');$('#ok').onclick=async()=>{const x=await act('report',{id:r.id,w:$('#rs').value,x:$('#rx').value});if(x.err)return $('#er').textContent=x.err;modal('');toast('Denúncia enviada. Obrigado por ajudar o Sasc a ser seguro.')}}
function pRep(u){modal(`<h3>Denunciar perfil</h3><label class="l">Motivo</label><select id="rs">${REASONS(['Conta falsa','Assédio ou ódio','Conteúdo impróprio','Spam ou golpe','Outro'])}</select><label class="l">Mensagem (opcional)</label><input id="rx" type="text"><div class="err" id="er"></div><button class="btn" id="ok">Enviar denúncia</button><button class="btn s" id="cc">Cancelar</button>`);
 $('#cc').onclick=()=>modal('');$('#ok').onclick=async()=>{const x=await act('preport',{uid:u.uid,w:$('#rs').value,x:$('#rx').value});if(x.err)return $('#er').textContent=x.err;modal('');toast('Denúncia enviada.')}}
function dreqF(t){modal(`<h3>Pedir ${t.rid?'exclusão':'remoção do perfil'}</h3><p>Deseja enviar uma mensagem ao administrador?</p><div id="qa"><button class="btn" id="y1">Sim, escrever</button><button class="btn s" id="n1">Não, só pedir</button></div><div id="qb" style="display:none"><input id="qx" type="text" placeholder="Mensagem ao administrador"><button class="btn" id="go2">Enviar pedido</button></div><button class="btn s" id="cc">Cancelar</button>`);
 const send=async x=>{await act('dreq',{...t,x});modal('');toast('Pedido enviado ao administrador')};
 $('#cc').onclick=()=>modal('');$('#y1').onclick=()=>{$('#qa').style.display='none';$('#qb').style.display=''};$('#n1').onclick=()=>send('');$('#go2').onclick=()=>send($('#qx').value.trim())}
/* ---- postar e editar ---- */
function postForm(r){const ed=!!r;
 modal(`<h3>${ed?'Editar vídeo':'Novo reel'}</h3>${ed?'':`<label class="l">Vídeo (celular ou computador)</label><input id="f" type="file" accept="video/*">`}
 <label class="l">Nome do vídeo</label><input id="nm" type="text" value="${ed?esc(r.name):''}"><label class="l">Tema</label><input id="th" type="text" placeholder="Ex.: Humor, Música..." value="${ed?esc(r.theme):''}">
 <label class="l">Foi feito com IA?</label><select id="ai"><option value="n">Não</option><option value="s" ${ed&&r.ai?'selected':''}>Sim</option></select><div class="err" id="er"></div>
 <button class="btn" id="ok">${ed?'Salvar':'Publicar'}</button>${ed?'<button class="btn r" id="dl">🗑️ Excluir vídeo</button>':''}<button class="btn s" id="cc">Cancelar</button>`);
 $('#cc').onclick=()=>modal('');
 if(ed)$('#dl').onclick=async()=>{if($('#dl').dataset.c){await act('delReel',{id:r.id});modal('');redo();return toast('Vídeo excluído')}$('#dl').dataset.c=1;$('#dl').textContent='Toque de novo para confirmar a exclusão'};
 $('#ok').onclick=async()=>{const nm=$('#nm').value.trim(),th=$('#th').value.trim(),ai=$('#ai').value==='s',f=ed?null:$('#f').files[0];
  if(!ed&&!f)return $('#er').textContent='Escolha um vídeo';if(!nm||!th)return $('#er').textContent='Preencha nome e tema';$('#ok').disabled=true;
  if(ed){const x=await act('editReel',{id:r.id,name:nm,theme:th,ai});if(x.err){$('#ok').disabled=false;return $('#er').textContent=x.err}modal('');redo();return toast('Alterações salvas')}
  const x=await new Promise(ok=>{const q=new XMLHttpRequest();q.open('PUT','/api/upload?name='+encodeURIComponent(nm)+'&theme='+encodeURIComponent(th)+'&ai='+(ai?1:0));q.setRequestHeader('X-Sasc','1');q.setRequestHeader('Content-Type',f.type||'video/mp4');
   q.upload.onprogress=e=>{if(e.lengthComputable)$('#ok').textContent='Enviando '+Math.round(e.loaded/e.total*100)+'%'};q.onload=()=>{let j={};try{j=JSON.parse(q.responseText)}catch(e){}ok(j)};q.onerror=()=>ok({err:'Falha no envio'});q.send(f)});
  if(x.err){$('#ok').disabled=false;$('#ok').textContent='Publicar';return $('#er').textContent=x.err}await refresh(true);modal('');redo();toast('Reel publicado!')}}
/* ---- perfil ---- */
function prof(id){const u=S.users[id];if(!u){show('home');return}const own=id===M(),l=S.reels.filter(r=>r.by===id),fc=Object.values(S.fol).filter(a=>a.includes(id)).length,fg=(S.fol[id]||[]).length,fr=!own&&S.friends.includes(id);let a='';
 if(!own){a=`<button class="btn m" id="fl">${has(S.fol[M()],id)?'Seguindo ✓':'Seguir'}</button> <button class="btn s m" id="ms">Mensagem</button>`;
  if(mutual(M(),id)){const mk=S.myfr.includes(id);a+=`<br><select id="fs" style="width:auto"><option value="s">Seguidor</option><option value="a" ${mk?'selected':''}>Amigo</option></select>${mk&&!fr?'<div class="mut">Aguardando a outra pessoa marcar você como amigo</div>':''}`}}
 const rp=adm()&&S.adm.prf[id]&&S.adm.prf[id].length?`<h4>Denúncias deste perfil</h4>${S.adm.prf[id].map(x=>`<div class="mut" style="text-align:left;margin:4px 0"><b>@${esc(hd(x.u))}</b> · ${esc(x.w)}: ${esc(x.x||'(sem mensagem)')}</div>`).join('')}`:'';
 $('#main').innerHTML=`<div class="pad c prof" style="position:relative">${own?'':'<button class="dots" id="pm" style="top:6px;color:var(--fg);background:var(--card)">⋯</button>'}<img class="av" src="${u.photo}" alt=""><h2 style="margin:8px 0 0">${esc(u.name)}${ofc(id)}</h2><div class="mut">@${esc(u.handle)}${u.owner?(u.official?' · Conta oficial':' · Dono do App'):''}</div>
 <div class="mut">${l.length} reels · ${fc} seguidores · ${fg} seguindo</div>${fr?'<div class="mut">👫 Amigos</div>':''}<div style="margin-top:10px">${a}</div>${rp}
 ${own?`<label class="mut" style="display:block;margin:12px 0"><input type="checkbox" id="sp" ${mult>1?'checked':''} ${adm()?'':'hidden'}>${adm()?' Modo teste (tempo 60× mais rápido)':''}</label><button class="btn s" id="lo">Sair</button>`:''}</div>
 <div class="grid">${l.map(r=>`<div data-id="${r.id}" style="background:${G[r.id%6]}">🎬<span>${esc(r.name)}</span></div>`).join('')}</div>`;
 on('.grid div',d=>viewReel(d.dataset.id));
 if(own){$('#sp').onchange=e=>mult=e.target.checked?60:1;$('#lo').onclick=logout;return}
 $('#fl').onclick=()=>act('follow',{uid:id});$('#ms').onclick=()=>show('thread',openChat(id));$('#pm').onclick=e=>{e.stopPropagation();pmenu(u)};
 if($('#fs'))$('#fs').onchange=e=>act('friend',{uid:id,on:e.target.value==='a'})}
function pmenu(u){modal(`<h3>@${esc(u.handle)}</h3><button class="btn s" id="p1">🚩 Denunciar perfil</button>${isMod()&&!adm()?'<button class="btn s" id="p2">🗑️ Pedir remoção do perfil</button>':''}${adm()&&!u.owner?'<button class="btn r" id="p3">🗑️ Remover conta</button>':''}<button class="btn s" id="cc">Fechar</button>`);
 $('#cc').onclick=()=>modal('');$('#p1').onclick=()=>pRep(u);if($('#p2'))$('#p2').onclick=()=>dreqF({pid:u.uid});
 if($('#p3'))$('#p3').onclick=()=>{modal(`<h3>Remover a conta @${esc(u.handle)}?</h3><p>A conta e os reels dela serão apagados. Isso não pode ser desfeito.</p><button class="btn r" id="y3">Sim, remover</button><button class="btn s" id="cc">Cancelar</button>`);$('#cc').onclick=()=>modal('');$('#y3').onclick=async()=>{await act('delUser',{uid:u.uid});modal('');toast('Conta removida');show('home')}}}
/* ---- pesquisa e notificações ---- */
function srch(){$('#main').innerHTML=`<div class="pad"><input id="q" type="text" placeholder="Pesquisar contas e reels..." value="${esc(sq)}"><div class="tabs"><button class="btn ${sk==='c'?'':'s'}" id="k1">Conta</button><button class="btn ${sk==='r'?'':'s'}" id="k2">Reel</button></div><div id="res"></div></div>`;
 const run=()=>{const m=sq.match(/https?:\/\/\S*reel=(\d+)/);if(m&&R(m[1]))return show('reels',m[1]);const q=nz(sq.replace(/^@/,'').trim()),X=$('#res');if(!q){X.innerHTML='<p class="mut">Digite um nome ou cole o link de um reel.</p>';return}
  if(sk==='c'){const l=Object.values(S.users).filter(u=>!u.sys&&(nz(u.handle).includes(q)||nz(u.name).includes(q)));
   X.innerHTML=l.map(u=>`<div class="row" data-u="${u.uid}"><img class="av" src="${u.photo}" alt=""><div><b>${esc(u.name)}</b><div class="mut">@${esc(u.handle)}</div></div></div>`).join('')||'<p class="mut">Nenhuma conta encontrada.</p>';on('[data-u]',r=>show('user',r.dataset.u),X)}
  else{const l=S.reels.filter(r=>nz(r.name).includes(q)||nz(r.theme).includes(q)||nz(hd(r.by)).includes(q));
   X.innerHTML=l.map(r=>`<div class="row" data-r="${r.id}"><span class="av" style="width:44px;height:60px;border-radius:8px;background:${G[r.id%6]};text-align:center;line-height:60px">🎬</span><div><b>${esc(r.name)}</b><div class="mut">#${esc(r.theme)} · @${esc(hd(r.by))}</div></div></div>`).join('')||'<p class="mut">Nenhum reel encontrado.</p>';on('[data-r]',r=>viewReel(r.dataset.r),X)}};
 $('#q').oninput=e=>{sq=e.target.value;run()};$('#k1').onclick=()=>{sk='c';srch()};$('#k2').onclick=()=>{sk='r';srch()};run()}
function notesV(){const l=S.notes,ic={sys:'🛡️',rp:'🚩',dq:'🛡️',req:'💬',lk:'❤️',cm:'💬',fol:'👤',reel:'🎬',acc:'🆕'};
 $('#main').innerHTML=`<div class="pad"><h3 style="margin-top:0">Notificações</h3>${l.map((n,i)=>`<div class="row" data-i="${i}" style="${n.r?'opacity:.6':''}"><span style="font-size:22px">${ic[n.type]||'🔔'}</span><div><b>${esc(n.txt)}</b><div class="mut">${ago(n.ts)}</div></div></div>`).join('')||'<p class="mut">Nenhuma notificação.</p>'}</div>`;
 on('.row[data-i]',r=>{const n=l[r.dataset.i];if(n.type==='sys')show('thread',n.ref);else if(n.type==='req')show('chat');else if(n.type==='dq'||n.type==='rp'){setTab='a';show('set')}else if(n.type==='cm')cmView(n.ref);else if(n.type==='reel'||n.type==='lk')viewReel(n.ref);else if(S.users[n.ref])show('user',n.ref)});
 if(l.some(n=>!n.r))act('notesRead')}
/* ---- chat ---- */
function openChat(id){return [M(),id].sort().join('|')}
function chat(){const cs=Object.entries(S.chats),row=([k,c])=>{const o=c.from===M()?c.to:c.from,u=S.users[o];if(!u)return'';const x=c.m[c.m.length-1];return `<div class="row" data-k="${k}"><img class="av" src="${u.photo}" alt=""><div><b>${esc(u.name)}</b> ${S.friends.includes(o)?'👫':''}<div class="mut">${x?esc(x.x).slice(0,40):'Sem mensagens'}</div></div></div>`};
 const rq=cs.filter(([k,c])=>!c.acc&&c.to===M()),ok=cs.filter(([k,c])=>c.acc||c.from===M());
 $('#main').innerHTML=`<div class="pad"><input id="sq" type="text" placeholder="Enviar mensagem para @..." autocapitalize="none"><div class="err" id="er"></div>
 ${adm()?`<h4>📣 Enviar como Sasc oficial</h4><input id="oh" type="text" placeholder="@ da pessoa" autocapitalize="none"><input id="ox" type="text" placeholder="Mensagem"><button class="btn" id="ob">Enviar pelo Sasc oficial</button>`:''}
 ${rq.length?`<h4>Pedidos de mensagem</h4>${rq.map(([k,c])=>{const u=S.users[c.from];return `<div class="row"><img class="av" src="${u.photo}" alt=""><div><b>@${esc(u.handle)}</b><div class="mut">${esc(c.m[0]?.x||'').slice(0,50)}</div></div><button class="btn m" data-a="${k}">Aceitar</button><button class="btn s m" data-i="${k}">Ignorar</button></div>`}).join('')}`:''}
 <h4>Conversas</h4>${ok.map(row).join('')||'<p class="mut">Nenhuma conversa ainda. Procure um @ acima ou fale com amigos.</p>'}</div>`;
 if($('#ob'))$('#ob').onclick=async()=>{const r=await act('msgOff',{handle:$('#oh').value,x:$('#ox').value});if(r.err)return $('#er').textContent=r.err;$('#ox').value='';$('#er').textContent='';toast('Mensagem enviada pelo Sasc oficial')};
 $('#sq').onkeydown=e=>{if(e.key!=='Enter')return;const h=e.target.value.trim().replace(/^@/,'').toLowerCase(),u=Object.values(S.users).find(x=>x.handle===h);if(!u||u.sys||u.uid===M())return $('#er').textContent='@ não encontrado';show('thread',openChat(u.uid))};
 on('.row[data-k]',r=>show('thread',r.dataset.k));on('[data-a]',b=>act('accept',{key:b.dataset.a}));on('[data-i]',b=>act('ignore',{key:b.dataset.i}))}
function thread(){const k=thr,c=S.chats[k]||{from:M(),to:k.split('|').find(x=>x!==M()),acc:false,m:[]},o=c.from===M()?c.to:c.from,u=S.users[o];if(!u)return show('chat');
 const wait=!c.acc&&c.from===M()&&c.m.length>0,mk=m=>esc(m.x).replace(/https?:\/\/\S*?reel=(\d+)/g,(z,i)=>`<a data-rl="${i}">abrir reel</a>`);
 $('#main').innerHTML=`<div class="pad"><div class="row" style="cursor:default"><img class="av" src="${u.photo}" alt=""><div><b>${esc(u.name)}</b><div class="mut">@${esc(u.handle)}</div></div></div><div>${c.m.map(m=>`<div class="msg ${m.f===M()?'me':''}">${mk(m)}</div>`).join('')}</div>
 ${o==='sasc'?'<p class="mut">Mensagem automática do Sasc Proteção. Não é possível responder.</p>':!c.acc&&c.to===M()?'<p class="mut">Aceite o pedido na tela de chat para responder.</p>':wait?'<p class="mut">Aguardando a pessoa aceitar sua mensagem.</p>':`<div class="err" id="er"></div><input id="tx" type="text" placeholder="Mensagem..." maxlength="500"><button class="btn" id="sd">Enviar</button>`}</div>`;
 on('[data-rl]',a=>{const id=a.dataset.rl;if(R(id))show('reels',id);else toast('Esse reel não existe mais')});
 if($('#sd')){const s=async()=>{const x=$('#tx').value.trim();if(!x)return;const r=await act('msg',{to:o,x});if(r.err)return $('#er').textContent=r.err;thread()};$('#sd').onclick=s;$('#tx').onkeydown=e=>{if(e.key==='Enter')s()}}}
/* ---- configurações e admin ---- */
function tabsH(){return `<div class="tabs"><button class="btn ${setTab==='c'?'':'s'}" id="t1">Conta</button>${S.me.owner?`<button class="btn ${setTab==='a'?'':'s'}" id="t3">Admin</button>`:''}</div>`}
function tabsB(){$('#t1').onclick=()=>{setTab='c';sets()};if($('#t3'))$('#t3').onclick=()=>{setTab='a';sets()}}
function sets(){if(setTab==='a'&&S.me.owner)return adminV();const u=S.me;
 $('#main').innerHTML=`<div class="pad">${tabsH()}<div class="c"><img class="av" id="pp" src="${u.photo}" style="width:84px;height:84px;margin:0" alt=""><br><label class="btn s m" style="display:inline-block;margin-top:6px">Mudar foto<input id="ph" type="file" accept="image/*" hidden></label></div>
 <label class="l">Nome</label><input id="nm" type="text" value="${esc(u.name)}"><label class="l">Localizador (@)</label><input id="hh" type="text" value="${esc(u.handle)}" autocapitalize="none">
 <label class="l">Nova senha (deixe vazio para manter)</label><input id="pw" type="password"><div class="err" id="er"></div><button class="btn" id="sv">Salvar</button></div>`;
 tabsB();let photo='';$('#ph').onchange=e=>resize(e.target.files[0],d=>{photo=d;$('#pp').src=d});
 $('#sv').onclick=async()=>{const r=await act('profile',{name:$('#nm').value,handle:$('#hh').value,pw:$('#pw').value,photo});if(r.err)return $('#er').textContent=r.err;$('#pw').value='';toast('Conta atualizada')}}
function adetail(rid,ctx){const r=R(rid);if(!r){toast('Esse reel não existe mais');return adminV()}const rp=S.adm.rep[rid]||[],rq=S.adm.dreq.filter(q=>q.rid===rid);
 $('#main').innerHTML=`<div class="pad"><button class="btn s m" id="bk2">← Voltar</button><div class="reel" style="height:46vh;border-radius:12px;margin:10px 0;background:${G[rid%6]}"><video src="/video/${rid}" playsinline controls></video></div>
 <b>${esc(r.name)}</b><div class="mut">@${esc(hd(r.by))} · #${esc(r.theme)}${r.ai?' · Feito com IA':''}</div>
 <h4>Mensagens das denúncias (${rp.length})</h4>${rp.map(x=>`<div style="margin:6px 0"><b>@${esc(hd(x.u))}</b> <span class="mut">${esc(x.w)} · ${ago(x.t)}</span><br>${esc(x.x||'(sem mensagem)')}</div>`).join('')||'<p class="mut">Nenhuma denúncia.</p>'}
 ${rq.length?`<h4>Pedidos de exclusão</h4>${rq.map(q=>`<div style="margin:6px 0"><b>@${esc(hd(q.by))}</b> <span class="mut">${ago(q.t)}</span><br>${esc(q.x||'(sem mensagem)')}</div>`).join('')}`:''}</div>
 <div style="position:sticky;bottom:0;display:flex;justify-content:space-between;gap:10px;padding:10px 16px;background:var(--bg)"><button class="btn s" id="kp" style="width:48%">✔ Deixar no ar</button><button class="btn r" id="dd" style="width:48%">🗑️ Deletar</button></div>`;
 $('#bk2').onclick=()=>sets();$('#kp').onclick=async()=>{await act('keep',{id:rid,ctx});toast('Reel mantido no ar');adminV()};
 $('#dd').onclick=async()=>{await act('delReel',{id:rid,why:ctx==='rep'?'rep':'adm'});toast('Reel deletado');adminV()}}
function adminV(){const u=S.me,yr=new Date().getFullYear(),Ad=S.adm,em=t=>`<p class="mut">${t}</p>`;
 let body='';
 if(u.admin){const cnt=(id,y)=>(Ad.rep[id]||[]).filter(x=>!y||new Date(x.t).getFullYear()===yr).length,top=y=>S.reels.filter(r=>cnt(r.id,y)).sort((a,b)=>cnt(b.id,y)-cnt(a.id,y)).slice(0,10),
  li=(r,y)=>`<div class="row" data-r="${r.id}" data-c="rep"><div><b>${esc(r.name)}</b>${Ad.keep[r.id]?' ✔ mantido':''}<div class="mut">@${esc(hd(r.by))} · ${cnt(r.id,y)} denúncia(s)${r.flag?' · menos recomendado':''}</div></div></div>`;
  body=`<h4>🔄 Atualização do app</h4><p class="mut">Versão atual: ${S.upd.ver} · Aviso para todos: <b>${S.upd.on?'ATIVO':'desativado'}</b>${S.upd.apk?' · APK disponível':''}</p><input id="um" type="text" placeholder="Mensagem do aviso (opcional)" value="${esc(S.upd.msg)}"><button class="btn ${S.upd.on?'r':''}" id="un">${S.upd.on?'Desativar aviso de atualização':'Ativar aviso de atualização'}</button>
  <label class="l">Nova versão: escolha os arquivos (index.html, app.js, app.css, sw.js, manifest.json, ícones e/ou app.apk)</label><input id="uf" type="file" multiple><div class="mut" id="ul">Enviados: ${(Ad.upd.staged||[]).map(f=>esc(f.name)+' ('+Math.round(f.size/1024)+' KB)').join(', ')||'nenhum'}</div><button class="btn" id="up1">Publicar nova versão</button><button class="btn s" id="up2">Descartar enviados</button>
  <h4>Pedidos de exclusão</h4>${Ad.dreq.map(q=>`<div class="row" ${q.pid?`data-p="${q.pid}"`:`data-r="${q.rid}" data-c="req"`}><div><b>${esc(q.rn)}</b><div class="mut">@${esc(hd(q.by))}: ${esc(q.x||'(sem mensagem)')}</div></div></div>`).join('')||em('Nenhum pedido.')}
  <h4>Mais denunciados em ${yr}</h4>${top(1).map(r=>li(r,1)).join('')||em('Nenhuma denúncia neste ano.')}
  <h4>Mais denunciados de todos os tempos</h4>${top(0).map(r=>li(r,0)).join('')||em('Nenhuma denúncia ainda.')}
  <h4>Perfis denunciados</h4>${Object.keys(Ad.prf).filter(k=>S.users[k]&&Ad.prf[k].length).map(k=>`<div class="row" data-p="${k}"><div><b>@${esc(hd(k))}</b><div class="mut">${Ad.prf[k].length} denúncia(s)</div></div></div>`).join('')||em('Nenhum perfil denunciado.')}
  <h4>Moderadores (podem pedir exclusão)</h4><input id="mh" type="text" placeholder="@ da pessoa" autocapitalize="none"><button class="btn" id="mg">Dar permissão</button>${Ad.mods.map(id=>`<div class="row" style="cursor:default"><div>@${esc(hd(id))}</div><button class="btn r m" data-rm="${id}">Remover permissão</button></div>`).join('')}`}
 $('#main').innerHTML=`<div class="pad">${tabsH()}<p><span class="ofc">✔ Oficial</span> <b>${u.official?'Conta oficial':'Dono do App'}</b><br><span class="mut">Seu selo fica mesmo se você mudar o @. Modo administrador: <b>${u.admin?'ATIVO':'desativado'}</b></span></p>
 ${u.admin?'<button class="btn r" id="ad">Desativar modo administrador</button>':'<input id="ap" type="password" placeholder="Senha de administrador"><button class="btn" id="aa">Ativar modo administrador</button>'}<div class="err" id="er"></div>${body}</div>`;
 tabsB();
 if($('#ad'))$('#ad').onclick=async()=>{await act('adm',{on:false});toast('Modo administrador desativado')};
 if($('#aa'))$('#aa').onclick=async()=>{const r=await act('adm',{on:true,password:$('#ap').value});if(r.err)return $('#er').textContent=r.err;toast('Modo administrador ativado')};
 on('[data-r]',e=>adetail(+e.dataset.r,e.dataset.c));on('[data-p]',e=>show('user',e.dataset.p));
 if($('#un'))$('#un').onclick=async()=>{await act('updNotice',{on:!S.upd.on,msg:$('#um').value});toast(S.upd.on?'Aviso de atualização ativado para todos':'Aviso de atualização desativado')};
 if($('#up2'))$('#up2').onclick=()=>act('updDiscard').then(()=>toast('Arquivos descartados'));
 if($('#up1'))$('#up1').onclick=async()=>{const r=await act('updPublish');if(r.err)return $('#er').textContent=r.err;toast('Nova versão publicada. Ative o aviso para todos atualizarem.')};
 if($('#uf'))$('#uf').onchange=async e=>{const L=$('#ul');for(const f of e.target.files){const r=await new Promise(ok=>{const q=new XMLHttpRequest();q.open('PUT','/api/updfile?name='+encodeURIComponent(f.name));q.setRequestHeader('X-Sasc','1');q.upload.onprogress=ev=>{if(ev.lengthComputable&&$('#ul'))$('#ul').textContent='Enviando '+f.name+' '+Math.round(ev.loaded/ev.total*100)+'%'};q.onload=()=>{let j={};try{j=JSON.parse(q.responseText)}catch(x){}ok(j)};q.onerror=()=>ok({err:'Falha no envio'});q.send(f)});if(r.err){if($('#er'))$('#er').textContent=r.err;break}}await refresh(true);if(tab==='set')adminV()};
 if($('#mg'))$('#mg').onclick=async()=>{const r=await act('modAdd',{handle:$('#mh').value});if(r.err)return $('#er').textContent=r.err;toast('Permissão concedida')};
 on('[data-rm]',b=>act('modDel',{uid:b.dataset.rm}).then(()=>toast('Permissão removida')))}
/* ---- bloqueio de vídeo ---- */
document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('video,.reel,.grid'))e.preventDefault()});
document.addEventListener('dragstart',e=>{if(e.target.tagName==='VIDEO')e.preventDefault()});
new MutationObserver(()=>document.querySelectorAll('video:not([data-nd])').forEach(v=>{v.setAttribute('controlsList','nodownload noremoteplayback');v.setAttribute('data-nd','1');v.disablePictureInPicture=true})).observe(document.body,{childList:true,subtree:true});
addEventListener('hashchange',()=>{const m=location.hash.match(/reel=(\d+)/);if(m&&S&&booted&&R(m[1]))show('reels',m[1])});
boot().then(()=>{if(!S)authView(false)});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
