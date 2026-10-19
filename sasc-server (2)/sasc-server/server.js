'use strict';
// Sasc - servidor sem dependências (só Node.js 18+).
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const ROOT=__dirname,DATA=path.join(ROOT,'data'),VID=path.join(DATA,'videos'),DBF=path.join(DATA,'db.json'),PUB=path.join(ROOT,'public');
fs.mkdirSync(VID,{recursive:true});
const LIVE=path.join(DATA,'live'),STAGE=path.join(DATA,'stage'),BAK=path.join(DATA,'backup'),APKF=path.join(DATA,'app.apk'),vm=require('vm');for(const d of[LIVE,STAGE,BAK])fs.mkdirSync(d,{recursive:true});
const UPD_FILES=['logo.png','icon-maskable-512.png','index.html','app.js','app.css','sw.js','manifest.json','icon-192.png','icon-512.png','app.apk'];
let CFG={port:3000,adminPassword:'',maxVideoMB:60,embedGoogleSites:false,maxTotalGB:20,backupEveryMin:60,keepBackups:48,sessionDays:30,embedOrigins:[],blockedWords:['se mata','vou te matar','merece morrer','morra','vou te pegar']};
try{Object.assign(CFG,JSON.parse(fs.readFileSync(path.join(ROOT,'config.json'),'utf8')))}catch(e){}
const PORT=+process.env.PORT||CFG.port,ADMPW=String(process.env.SASC_ADMIN_PASSWORD||CFG.adminPassword||'');
const nz=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const BAD=CFG.blockedWords.length?new RegExp('(^|[^a-z0-9])('+CFG.blockedWords.map(w=>nz(w).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')([^a-z0-9]|$)'):null;
/* ---- dados ---- */
let D={users:{},sess:{},reels:{},follow:{},fr:{},chats:{},notes:{},likes:{},stars:{},bk:{},cm:{},rep:{},prf:{},vw:{},keep:{},mods:[],dreq:[],v:1,seq:1,sessT:{},upd:{on:false,msg:'',ver:1,apk:false}};
try{D=Object.assign(D,JSON.parse(fs.readFileSync(DBF,'utf8')))}catch(e){}
const SVG='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1d9bf0"/><text x="32" y="44" font-size="34" text-anchor="middle">🛡️</text></svg>');
D.sessT=D.sessT||{};D.users.sasc=Object.assign(D.users.sasc||{},{uid:'sasc',sys:true,handle:'sasc.protecao',name:'Sasc Proteção',photo:SVG});
let dirty=true;const touch=()=>{D.v++;dirty=true};
const flush=()=>{if(!dirty)return;dirty=false;fs.writeFileSync(DBF+'.tmp',JSON.stringify(D));fs.renameSync(DBF+'.tmp',DBF)};
setInterval(flush,2000);process.on('SIGINT',()=>{flush();process.exit()});process.on('SIGTERM',()=>{flush();process.exit()});
const LOG=path.join(DATA,'server.log'),BKD=path.join(DATA,'backups');fs.mkdirSync(BKD,{recursive:true});
const log=(...a)=>{try{if(fs.existsSync(LOG)&&fs.statSync(LOG).size>5e6)fs.renameSync(LOG,LOG+'.old');fs.appendFileSync(LOG,new Date().toISOString()+' '+a.join(' ')+'\n')}catch(e){}};
process.on('uncaughtException',e=>log('ERRO',e&&e.stack||e));process.on('unhandledRejection',e=>log('ERRO',e&&e.stack||e));
function backup(){try{flush();if(!fs.existsSync(DBF))return;fs.copyFileSync(DBF,path.join(BKD,'db-'+new Date().toISOString().slice(0,16).replace(/[-T:]/g,'')+'.json'));const fl=fs.readdirSync(BKD).sort();while(fl.length>CFG.keepBackups)fs.unlinkSync(path.join(BKD,fl.shift()))}catch(e){log('backup',e.message)}}
setInterval(backup,CFG.backupEveryMin*6e4);setTimeout(backup,8000);
/* ---- utilidades ---- */
const has=(a,x)=>!!a&&a.includes(x),ck=(a,b)=>[a,b].sort().join('|');
const tog=(m,id,x)=>{const a=m[id]=m[id]||[],i=a.indexOf(x);if(i>=0){a.splice(i,1);return false}a.push(x);return true};
const byH=h=>Object.values(D.users).find(u=>u.handle===h);
const adm=u=>!!(u&&u.owner&&u.admin),isMod=u=>has(D.mods,u.uid);
const mutual=(a,b)=>has(D.follow[a],b)&&has(D.follow[b],a),friends=(a,b)=>mutual(a,b)&&has(D.fr[a],b)&&has(D.fr[b],a);
const flagged=id=>{if(D.keep[id])return false;const v=(D.vw[id]||[]).length,n=(D.rep[id]||[]).length;return v>=2&&n/v>=.3};
const hashPw=(pw,salt)=>crypto.scryptSync(pw,salt,32).toString('hex');
const eq=(a,b)=>{a=Buffer.from(String(a));b=Buffer.from(String(b));return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const isAdmPw=pw=>!!ADMPW&&eq(pw||'',ADMPW);
const note=(to,type,txt,ref)=>{if(!D.users[to])return;const a=D.notes[to]=D.notes[to]||[];a.unshift({type,txt,ref,ts:Date.now(),r:0});if(a.length>60)a.length=60};
function prot(to,x){if(!D.users[to]||D.users[to].sys)return;const k=ck('sasc',to),c=D.chats[k]=D.chats[k]||{from:'sasc',to,acc:true,m:[]};c.m.push({f:'sasc',x,t:Date.now()});note(to,'sys',x.slice(0,70),k)}
const pref=(u,r,v)=>{u.prefs=u.prefs||{};u.prefs[r.theme]=(u.prefs[r.theme]||0)+v};
const tries={},limited=k=>{const n=Date.now(),a=tries[k]=(tries[k]||[]).filter(t=>n-t<6e5);return a.length>=10},fail=k=>(tries[k]=tries[k]||[]).push(Date.now());
const RL={},rate=(k,n,ms)=>{const t=Date.now(),a=RL[k]=(RL[k]||[]).filter(x=>t-x<ms);if(a.length>=n)return true;a.push(t);return false};
setInterval(()=>{for(const k in RL)if(!RL[k].length||Date.now()-RL[k][RL[k].length-1]>6e5)delete RL[k]},6e5);
const AUD=new Set(['delReel','delUser','modAdd','modDel','adm','updPublish','updNotice','updDiscard','keep']);
const dirSize=d=>{let n=0;try{for(const f of fs.readdirSync(d))n+=fs.statSync(path.join(d,f)).size}catch(e){}return n};
const GZC=new Map();
const ip=req=>String(req.headers['cf-connecting-ip']||req.socket.remoteAddress);
const EMB=!!CFG.embedGoogleSites,FA=EMB?["'self'","https://sites.google.com","https://*.google.com","https://*.googleusercontent.com",...(CFG.embedOrigins||[])].join(' '):"'none'";
const SEC={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors "+FA};
if(!EMB)SEC['X-Frame-Options']='DENY';
const CK=EMB?'; HttpOnly; SameSite=None; Secure; Partitioned; Path=/':'; HttpOnly; SameSite=Lax; Path=/';
const send=(res,code,obj,h={})=>{let b=Buffer.from(JSON.stringify(obj));const hd={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...SEC,...h};if(b.length>1024&&/gzip/.test(String(res.req&&res.req.headers['accept-encoding']||''))){b=zlib.gzipSync(b);hd['Content-Encoding']='gzip';hd['Vary']='Accept-Encoding'}hd['Content-Length']=b.length;res.writeHead(code,hd);res.end(b)};
const readJSON=(req,max=3e6)=>new Promise((ok,no)=>{let n=0;const c=[],to=setTimeout(()=>{no(new Error('timeout'));req.destroy()},15000);req.on('data',d=>{n+=d.length;if(n>max){clearTimeout(to);no(new Error('big'));req.destroy()}else c.push(d)});req.on('end',()=>{clearTimeout(to);try{ok(JSON.parse(Buffer.concat(c).toString()||'{}'))}catch(e){no(e)}});req.on('error',e=>{clearTimeout(to);no(e)})});
const who=req=>{const t=(req.headers.cookie||'').match(/(?:^|;\s*)sasc=([a-f0-9]+)/);if(!t)return null;const id=D.sess[t[1]];if(!id)return null;if(!D.sessT[t[1]])D.sessT[t[1]]=Date.now();if(Date.now()-D.sessT[t[1]]>CFG.sessionDays*864e5){delete D.sess[t[1]];delete D.sessT[t[1]];dirty=true;return null}return D.users[id]||null};
const mkSess=uid=>{const tok=crypto.randomBytes(24).toString('hex');D.sess[tok]=uid;D.sessT[tok]=Date.now();const mine=Object.keys(D.sess).filter(k=>D.sess[k]===uid).sort((a,b)=>(D.sessT[a]||0)-(D.sessT[b]||0));while(mine.length>10){const o=mine.shift();delete D.sess[o];delete D.sessT[o]}return tok};
const cookieAttr=req=>CK+(!EMB&&/https/.test(String(req.headers['x-forwarded-proto']||''))?'; Secure':'');
const PHC=new Map(),phash=x=>{let k=PHC.get(x.uid);if(!k||k.p!==x.photo)PHC.set(x.uid,k={p:x.photo,h:crypto.createHash('md5').update(String(x.photo)).digest('hex').slice(0,8)});return k.h},phurl=x=>'/photo/'+x.uid+'?h='+phash(x);
function photoBuf(x){const m=/^data:(image\/[a-z+]+)(;base64)?,([\s\S]*)$/.exec(x.photo||'');if(!m)return null;try{return{t:m[1],b:m[2]?Buffer.from(m[3],'base64'):Buffer.from(decodeURIComponent(m[3]))}}catch(e){return null}}
const cleanPhoto=p=>typeof p==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p)&&p.length<120000?p:'';
const AVA='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#888"/><circle cx="32" cy="24" r="12" fill="#ccc"/><rect x="12" y="42" width="40" height="30" rx="14" fill="#ccc"/></svg>');
const RESERVED=['callebe','sasc'];
/* ---- estado enviado ao app ---- */
function state(u){const A=adm(u);
 if(u.blockedUntil&&u.blockedUntil>Date.now())return{blocked:u.blockedUntil};
 if(u.blockedUntil){u.blockedUntil=0;u.usage=0;u.rested=false;dirty=true}
 const users={};for(const x of Object.values(D.users))users[x.uid]={uid:x.uid,handle:x.handle,name:x.name,photo:phurl(x),owner:!!x.owner,official:!!x.official,sys:!!x.sys};
 const reels=Object.values(D.reels).map(r=>({id:r.id,by:r.by,name:r.name,theme:r.theme,ai:r.ai,t:r.t,likes:(D.likes[r.id]||[]).length,stars:(D.stars[r.id]||[]).length,bk:(r.by===u.uid||A)?(D.bk[r.id]||[]).length:null,myl:has(D.likes[r.id],u.uid),mys:has(D.stars[r.id],u.uid),myb:has(D.bk[r.id],u.uid),nc:(D.cm[r.id]||[]).length,flag:flagged(r.id)}));
 const chats={};for(const[k,c]of Object.entries(D.chats))if(c.from===u.uid||c.to===u.uid)chats[k]=c;
 const me={uid:u.uid,handle:u.handle,name:u.name,photo:phurl(u),owner:!!u.owner,official:!!u.official,admin:adm(u),usage:u.usage||0,prefs:u.prefs||{},isMod:isMod(u)};
 const out={v:D.v,me,users,reels,cm:D.cm,fol:D.follow,myfr:D.fr[u.uid]||[],friends:Object.keys(D.users).filter(o=>friends(u.uid,o)),chats,notes:D.notes[u.uid]||[],appVer:D.upd.ver,upd:{on:D.upd.on,msg:D.upd.msg,ver:D.upd.ver,apk:!!D.upd.apk&&fs.existsSync(APKF)}};
 if(A){const rep={};for(const[k,a]of Object.entries(D.rep))if(D.reels[k])rep[k]=a;out.adm={rep,keep:D.keep,prf:D.prf,dreq:D.dreq,mods:D.mods,upd:{staged:fs.readdirSync(STAGE).map(f=>({name:f,size:fs.statSync(path.join(STAGE,f)).size}))}}}
 return out}
/* ---- ações ---- */
function rdel(r,why,base){try{fs.unlinkSync(path.join(VID,r.file))}catch(e){}delete D.reels[r.id];for(const m of [D.likes,D.stars,D.bk,D.cm,D.rep,D.vw,D.keep])delete m[r.id];
 if(why)prot(r.by,'Seu reel "'+r.name+'" ('+base+'/#reel='+r.id+') foi deletado '+(why==='rep'?'por denúncias':'por um administrador')+'.')}
function delUser(t){for(const r of Object.values(D.reels))if(r.by===t.uid)rdel(r);
 delete D.users[t.uid];delete D.follow[t.uid];delete D.fr[t.uid];delete D.notes[t.uid];delete D.prf[t.uid];
 for(const k in D.follow)D.follow[k]=D.follow[k].filter(x=>x!==t.uid);for(const k in D.fr)D.fr[k]=D.fr[k].filter(x=>x!==t.uid);
 for(const k in D.chats)if(D.chats[k].from===t.uid||D.chats[k].to===t.uid)delete D.chats[k];
 for(const k in D.cm)D.cm[k]=D.cm[k].filter(c=>c.u!==t.uid);for(const k in D.likes)D.likes[k]=D.likes[k].filter(x=>x!==t.uid);
 for(const s in D.sess)if(D.sess[s]===t.uid)delete D.sess[s];
 D.mods=D.mods.filter(x=>x!==t.uid);D.dreq=D.dreq.filter(q=>q.by!==t.uid&&q.pid!==t.uid)}
const owners=()=>Object.values(D.users).filter(x=>x.owner);
const A={
 view(u,b){const r=D.reels[b.id];if(r){const a=D.vw[r.id]=D.vw[r.id]||[];if(!a.includes(u.uid))a.push(u.uid)}},
 pref(u,b){const r=D.reels[b.id];if(r)pref(u,r,b.v>0?2:-2)},
 like(u,b){const r=D.reels[b.id];if(r&&tog(D.likes,r.id,u.uid)){pref(u,r,2);if(r.by!==u.uid)note(r.by,'lk','@'+u.handle+' curtiu seu reel: '+r.name,r.id)}},
 star(u,b){const r=D.reels[b.id];if(!r)return;const k=D.bk[r.id]||[],i=k.indexOf(u.uid);if(tog(D.stars,r.id,u.uid)){if(i>=0)k.splice(i,1);pref(u,r,4);if(r.by!==u.uid)note(r.by,'lk','@'+u.handle+' adorou seu reel: '+r.name,r.id)}},
 bk(u,b){const r=D.reels[b.id];if(!r)return;const s=D.stars[r.id]||[],i=s.indexOf(u.uid);if(tog(D.bk,r.id,u.uid)){if(i>=0)s.splice(i,1);pref(u,r,-3)}},
 comment(u,b){const r=D.reels[b.id],x=String(b.x||'').trim().slice(0,300);if(!r||!x)return;if(BAD&&BAD.test(nz(x)))return{err:'Seu comentário parece desrespeitoso e não foi publicado. Tente reescrever com respeito.'};
  (D.cm[r.id]=D.cm[r.id]||[]).push({u:u.uid,x,t:Date.now()});if(r.by!==u.uid)note(r.by,'cm','@'+u.handle+' comentou: '+x.slice(0,40),r.id)},
 delcomment(u,b){const r=D.reels[b.id],a=D.cm[b.id]||[],i=a.findIndex(c=>c.t===b.t);if(!r||i<0)return;if(r.by===u.uid||a[i].u===u.uid||adm(u))a.splice(i,1)},
 follow(u,b){const t=D.users[b.uid];if(!t||t.sys||t.uid===u.uid)return;if(tog(D.follow,u.uid,t.uid))note(t.uid,'fol','@'+u.handle+' começou a seguir você',u.uid);else for(const[x,y]of[[u.uid,t.uid],[t.uid,u.uid]]){const f=D.fr[x];if(f&&f.includes(y))f.splice(f.indexOf(y),1)}},
 friend(u,b){const t=D.users[b.uid];if(!t||!mutual(u.uid,t.uid))return;const a=D.fr[u.uid]=D.fr[u.uid]||[],i=a.indexOf(t.uid);if(b.on&&i<0)a.push(t.uid);if(!b.on&&i>=0)a.splice(i,1)},
 msg(u,b){const t=D.users[b.to],x=String(b.x||'').trim().slice(0,500);if(!t||t.sys||t.uid===u.uid||!x)return{err:'Não foi possível enviar.'};
  const k=ck(u.uid,t.uid);let c=D.chats[k];if(!c)c=D.chats[k]={from:u.uid,to:t.uid,acc:friends(u.uid,t.uid),m:[]};if(friends(u.uid,t.uid))c.acc=true;
  if(!c.acc&&c.to===u.uid)return{err:'Aceite o pedido para responder.'};if(!c.acc&&c.m.length>=1)return{err:'Aguarde a pessoa aceitar sua mensagem.'};
  c.m.push({f:u.uid,x,t:Date.now()});if(!c.acc)note(t.uid,'req','@'+u.handle+' quer enviar uma mensagem',k)},
 accept(u,b){const c=D.chats[b.key];if(c&&c.to===u.uid)c.acc=true},
 ignore(u,b){const c=D.chats[b.key];if(c&&c.to===u.uid&&!c.acc)delete D.chats[b.key]},
 msgOff(u,b){if(!adm(u))return;const off=Object.values(D.users).find(x=>x.official),t=byH(String(b.handle||'').replace(/^@/,'').toLowerCase()),x=String(b.x||'').trim().slice(0,500);
  if(!off)return{err:'Crie primeiro a conta @sasc (com a senha de administrador).'};if(!t||t.sys||t.official)return{err:'@ não encontrado'};if(!x)return{err:'Escreva a mensagem'};
  const k=ck(off.uid,t.uid),c=D.chats[k]=D.chats[k]||{from:off.uid,to:t.uid,acc:true,m:[]};c.acc=true;c.m.push({f:off.uid,x,t:Date.now()});note(t.uid,'sys','Mensagem do Sasc: '+x.slice(0,50),k)},
 report(u,b){const r=D.reels[b.id];if(!r||r.by===u.uid)return;const a=D.rep[r.id]=D.rep[r.id]||[];if(a.some(x=>x.u===u.uid))return{err:'Você já denunciou este reel'};
  a.push({u:u.uid,w:String(b.w||'Outro').slice(0,40),x:String(b.x||'').slice(0,300),t:Date.now()});const v=D.vw[r.id]=D.vw[r.id]||[];if(!v.includes(u.uid))v.push(u.uid);
  owners().forEach(o=>note(o.uid,'rp',(flagged(r.id)?'Reel muito denunciado: ':'Nova denúncia: ')+r.name,r.id))},
 preport(u,b){const t=D.users[b.uid];if(!t||t.sys||t.uid===u.uid)return;const a=D.prf[t.uid]=D.prf[t.uid]||[];if(a.some(x=>x.u===u.uid))return{err:'Você já denunciou este perfil'};
  a.push({u:u.uid,w:String(b.w||'Outro').slice(0,40),x:String(b.x||'').slice(0,300),t:Date.now()});owners().forEach(o=>note(o.uid,'rp','Perfil denunciado: @'+t.handle,t.uid))},
 dreq(u,b){if(!isMod(u))return;const x=String(b.x||'').slice(0,300);
  if(b.rid){const r=D.reels[b.rid];if(!r)return;D.dreq.push({id:Date.now(),rid:r.id,rn:r.name,by:u.uid,x,t:Date.now()});owners().forEach(o=>note(o.uid,'dq','@'+u.handle+' pediu para excluir: '+r.name,r.id))}
  else{const t=D.users[b.pid];if(!t||t.sys||t.owner)return;D.dreq.push({id:Date.now(),pid:t.uid,rn:'Perfil @'+t.handle,by:u.uid,x,t:Date.now()});owners().forEach(o=>note(o.uid,'dq','@'+u.handle+' pediu para remover o perfil @'+t.handle,t.uid))}},
 modAdd(u,b){if(!adm(u))return;const t=byH(String(b.handle||'').replace(/^@/,'').toLowerCase());if(!t||t.sys)return{err:'@ não encontrado'};if(t.owner)return{err:'Você já é o dono'};
  if(!D.mods.includes(t.uid)){D.mods.push(t.uid);prot(t.uid,'O administrador deu a você permissão para pedir a exclusão de vídeos. Use ⋯ > Pedir exclusão.')}},
 modDel(u,b){if(!adm(u))return;D.mods=D.mods.filter(x=>x!==b.uid);prot(b.uid,'Sua permissão de moderador foi removida.')},
 keep(u,b,base){if(!adm(u))return;const r=D.reels[b.id];if(!r)return;if(b.ctx==='rep')D.keep[r.id]=Date.now();
  D.dreq.filter(q=>q.rid===r.id).forEach(q=>prot(q.by,'Seu pedido sobre "'+r.name+'" foi analisado: o reel continua no ar.'));D.dreq=D.dreq.filter(q=>q.rid!==r.id)},
 delReel(u,b,base){const r=D.reels[b.id];if(!r)return;if(r.by===u.uid){rdel(r);return}if(!adm(u))return;
  D.dreq.filter(q=>q.rid===r.id).forEach(q=>prot(q.by,'Seu pedido foi aprovado: o reel "'+r.name+'" foi deletado.'));D.dreq=D.dreq.filter(q=>q.rid!==r.id);rdel(r,b.why==='rep'?'rep':'adm',base)},
 editReel(u,b){const r=D.reels[b.id];if(!r||r.by!==u.uid)return;const n=String(b.name||'').trim().slice(0,80),t=String(b.theme||'').trim().slice(0,40);if(!n||!t)return{err:'Preencha nome e tema'};Object.assign(r,{name:n,theme:t,ai:!!b.ai})},
 delUser(u,b){if(!adm(u))return;const t=D.users[b.uid];if(!t||t.sys||t.owner)return;D.dreq.filter(q=>q.pid===t.uid).forEach(q=>prot(q.by,'Seu pedido foi aprovado: o perfil @'+t.handle+' foi removido.'));delUser(t)},
 profile(u,b){const n=String(b.name||'').trim().slice(0,40),h=String(b.handle||'').trim().replace(/^@/,'').toLowerCase();
  if(!n)return{err:'Digite um nome'};if(!/^[a-z0-9_.]{3,20}$/.test(h))return{err:'@ inválido (3 a 20 letras, números, _ ou .)'};
  if(RESERVED.includes(h)&&!u.owner)return{err:'Não foi possível alterar o @.'};const o=byH(h);if(o&&o.uid!==u.uid)return{err:'Esse @ já existe'};
  if(b.pw&&String(b.pw).length<4)return{err:'Senha com 4+ caracteres'};
  u.name=n;u.handle=h;if(b.pw){u.salt=crypto.randomBytes(16).toString('hex');u.hash=hashPw(String(b.pw),u.salt)}const p=cleanPhoto(b.photo);if(p)u.photo=p},
 adm(u,b){if(!u.owner)return;if(b.on){if(!isAdmPw(b.password))return{err:'Senha incorreta'};u.admin=true}else u.admin=false},
 notesRead(u){(D.notes[u.uid]||[]).forEach(n=>n.r=1)},
 tick(u,b){const m=adm(u)&&b.m===60?60:1;u.usage=(u.usage||0)+30*m;let rest=false;
  if(u.usage>=10800){u.blockedUntil=Date.now()+432e5;return{blocked:u.blockedUntil}}
  if(u.usage>=3600&&!u.rested){u.rested=true;rest=true}return{usage:u.usage,rest}},
 rest(u){u.blockedUntil=Date.now()+3e5},
 updNotice(u,b){if(!adm(u))return;D.upd.on=!!b.on;D.upd.msg=String(b.msg||'').trim().slice(0,200)},
 updDiscard(u){if(!adm(u))return;for(const n of fs.readdirSync(STAGE))fs.unlinkSync(path.join(STAGE,n))},
 updPublish(u){if(!adm(u))return;const names=fs.readdirSync(STAGE);if(!names.length)return{err:'Envie os arquivos da nova versão primeiro.'};
  for(const n of names)if(n.endsWith('.js')){try{new vm.Script(fs.readFileSync(path.join(STAGE,n),'utf8'),{filename:n})}catch(e){return{err:'Erro de sintaxe em '+n+': '+String(e.message).slice(0,120)+'. Nada foi publicado.'}}}
  const bk=path.join(BAK,'v'+D.upd.ver);fs.mkdirSync(bk,{recursive:true});
  for(const n of names){if(n==='app.apk'){fs.renameSync(path.join(STAGE,n),APKF);D.upd.apk=true;continue}const cur=fs.existsSync(path.join(LIVE,n))?path.join(LIVE,n):path.join(PUB,n);if(fs.existsSync(cur))fs.copyFileSync(cur,path.join(bk,n));fs.renameSync(path.join(STAGE,n),path.join(LIVE,n))}
  D.upd.ver++}
};
function saveFile(req,res,fp,mb){let n=0,bad=false;const ws=fs.createWriteStream(fp),max=mb*1048576;
 req.on('data',d=>{n+=d.length;if(n>max&&!bad){bad=true;req.unpipe(ws);ws.destroy();fs.unlink(fp,()=>{});send(res,413,{err:'Arquivo grande demais (máx. '+mb+' MB).'});req.resume()}});req.pipe(ws);
 ws.on('finish',()=>{if(!bad){touch();send(res,200,{ok:true})}});ws.on('error',()=>{if(!bad)send(res,500,{err:'Erro ao salvar'})})}
/* ---- vídeos ---- */
function serveVideo(req,res,r){const f=path.join(VID,r.file);let st;try{st=fs.statSync(f)}catch(e){res.writeHead(404);return res.end()}
 let s=0,e=st.size-1;const m=String(req.headers.range||'').match(/bytes=(\d*)-(\d*)/);
 if(m){if(m[1]!=='')s=+m[1];if(m[2]!=='')e=Math.min(+m[2],st.size-1);else e=Math.min(st.size-1,s+2e6);if(s>e||s>=st.size){res.writeHead(416,{'Content-Range':'bytes */'+st.size});return res.end()}}
 const h={'Content-Type':r.mime,'Accept-Ranges':'bytes','Content-Length':e-s+1,'Content-Disposition':'inline','Cache-Control':'private, no-store',...SEC};
 if(m)h['Content-Range']='bytes '+s+'-'+e+'/'+st.size;res.writeHead(m?206:200,h);if(req.method==='HEAD')return res.end();fs.createReadStream(f,{start:s,end:e}).pipe(res)}
function upload(req,res,u,q){if(rate('u'+u.uid,6,6e5))return send(res,429,{err:'Muitos envios seguidos. Aguarde alguns minutos.'});if(dirSize(VID)+(+req.headers['content-length']||0)>CFG.maxTotalGB*1073741824)return send(res,507,{err:'O servidor está sem espaço para novos vídeos.'});
 const ct=String(req.headers['content-type']||'').toLowerCase(),ok=/^video\/(mp4|webm|quicktime|x-m4v|ogg)/.exec(ct);
 if(!ok)return send(res,415,{err:'Envie um arquivo de vídeo (mp4, webm ou mov).'});
 const name=String(q.get('name')||'').trim().slice(0,80),theme=String(q.get('theme')||'').trim().slice(0,40);if(!name||!theme)return send(res,400,{err:'Preencha nome e tema'});
 const id=D.seq++,ext=ct.includes('webm')?'webm':ct.includes('ogg')?'ogv':ct.includes('quicktime')?'mov':'mp4',file=id+'.'+ext,fp=path.join(VID,file),max=CFG.maxVideoMB*1048576;
 let n=0,bad=false;const ws=fs.createWriteStream(fp);
 req.on('data',d=>{n+=d.length;if(n>max&&!bad){bad=true;req.unpipe(ws);ws.destroy();fs.unlink(fp,()=>{});send(res,413,{err:'Vídeo grande demais (máx. '+CFG.maxVideoMB+' MB).'});req.resume()}});
 req.pipe(ws);
 ws.on('finish',()=>{if(bad)return;const hb=Buffer.alloc(12);try{const fd=fs.openSync(fp,'r');fs.readSync(fd,hb,0,12,0);fs.closeSync(fd)}catch(e){}
  const okM=hb.slice(4,8).toString()==='ftyp'||hb.slice(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))||hb.slice(0,4).toString()==='OggS';
  if(!okM){fs.unlink(fp,()=>{});log('UPLOAD inválido',u.handle);return send(res,415,{err:'O arquivo não parece ser um vídeo válido.'})}
  D.reels[id]={id,by:u.uid,name,theme,ai:q.get('ai')==='1',t:Date.now(),file,mime:ct.split(';')[0]};
  for(const k of Object.keys(D.users))if(k!==u.uid&&has(D.follow[k],u.uid))note(k,'reel','@'+u.handle+' postou um novo reel: '+name,id);touch();send(res,200,{ok:true,id})});
 ws.on('error',()=>{if(!bad)send(res,500,{err:'Erro ao salvar o vídeo'})})}
/* ---- servidor ---- */
const STATIC={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/app.css':['app.css','text/css; charset=utf-8'],'/manifest.json':['manifest.json','application/manifest+json'],'/sw.js':['sw.js','text/javascript; charset=utf-8'],'/icon-192.png':['icon-192.png','image/png'],'/icon-512.png':['icon-512.png','image/png'],'/icon-maskable-512.png':['icon-maskable-512.png','image/png'],'/logo.png':['logo.png','image/png']};
const srv=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://x'),p=url.pathname,POST=req.method==='POST'||req.method==='PUT',u=who(req);
 if(req.method==='GET'&&STATIC[p]){const[f,t]=STATIC[p],fl=path.join(LIVE,f),pf=fs.existsSync(fl)?fl:path.join(PUB,f),b=fs.readFileSync(pf),h={'Content-Type':t,'Cache-Control':'no-cache',...SEC};let body=b;if(/gzip/.test(String(req.headers['accept-encoding']||''))&&!/image/.test(t)){const k=pf+':'+b.length+':'+fs.statSync(pf).mtimeMs;if(!GZC.has(k))GZC.set(k,zlib.gzipSync(b));body=GZC.get(k);h['Content-Encoding']='gzip';h['Vary']='Accept-Encoding'}h['Content-Length']=body.length;res.writeHead(200,h);return res.end(body)}
 if(POST&&req.headers['x-sasc']!=='1')return send(res,403,{err:'Pedido inválido'});
 const sfs=req.headers['sec-fetch-site'];if(sfs&&sfs!=='same-origin'&&sfs!=='none')return send(res,403,{err:'Pedido inválido'});
 const base=(String(req.headers['x-forwarded-proto']||'http').split(',')[0])+'://'+req.headers.host;
 if(p==='/api/signup'&&POST){const b=await readJSON(req),h=String(b.handle||'').trim().replace(/^@/,'').toLowerCase(),pw=String(b.password||''),key=ip(req)+'s';
  if(limited(key))return send(res,429,{err:'Muitas tentativas. Aguarde alguns minutos.'});fail(key);
  if(RESERVED.includes(h)&&(!isAdmPw(pw)||byH(h)))return send(res,400,{err:'Não foi possível criar a conta.'});
  if(!/^[a-z0-9_.]{3,20}$/.test(h))return send(res,400,{err:'O @ deve ter 3 a 20 letras, números, _ ou .'});
  if(pw.length<4)return send(res,400,{err:'A senha precisa de 4+ caracteres'});if(byH(h))return send(res,400,{err:'Esse @ já existe'});
  const photo=cleanPhoto(b.photo);if(!photo&&h!=='sasc')return send(res,400,{err:'Coloque uma foto de perfil'});
  const uid='u'+Date.now().toString(36)+crypto.randomBytes(3).toString('hex'),salt=crypto.randomBytes(16).toString('hex'),ow=RESERVED.includes(h);
  D.users[uid]={uid,handle:h,name:h==='sasc'?'Sasc':h,salt,hash:hashPw(pw,salt),photo:photo||AVA,usage:0,prefs:{},owner:ow,admin:ow,official:h==='sasc'};
  Object.keys(D.users).forEach(k=>k!==uid&&k!=='sasc'&&note(k,'acc','@'+h+' criou uma conta no Sasc',uid));
  const tok=mkSess(uid);touch();log('CADASTRO',h);return send(res,200,{ok:true},{'Set-Cookie':'sasc='+tok+cookieAttr(req)+'; Max-Age=31536000'})}
 if(p==='/api/login'&&POST){const b=await readJSON(req),h=String(b.handle||'').trim().replace(/^@/,'').toLowerCase(),key=ip(req)+'|'+h;
  if(limited(key))return send(res,429,{err:'Muitas tentativas. Aguarde alguns minutos.'});const t=byH(h);
  if(!t||t.sys||!t.hash||!eq(hashPw(String(b.password||''),t.salt),t.hash)){fail(key);log('LOGIN falhou',h,ip(req));return send(res,401,{err:'@ ou senha incorretos'})}
  const tok=mkSess(t.uid);touch();return send(res,200,{ok:true},{'Set-Cookie':'sasc='+tok+cookieAttr(req)+'; Max-Age=31536000'})}
 if(p==='/api/logout'&&POST){const t=(req.headers.cookie||'').match(/sasc=([a-f0-9]+)/);if(t){delete D.sess[t[1]];dirty=true}return send(res,200,{ok:true},{'Set-Cookie':'sasc='+CK+'; Max-Age=0'})}
 if(p==='/health')return send(res,200,{ok:true,up:Math.round(process.uptime()),users:Object.keys(D.users).length-1,reels:Object.keys(D.reels).length});
 if(!u)return send(res,401,{err:'login'});
 const pm=p.match(/^\/photo\/([a-z0-9]+)$/);if(pm&&req.method==='GET'){const x=D.users[pm[1]],f=x&&photoBuf(x);if(!f){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':f.t,'Content-Length':f.b.length,'Cache-Control':'private, max-age=31536000, immutable',...SEC});return res.end(f.b)}
 if(p==='/api/state'&&req.method==='GET'){if(!u.blockedUntil&&+url.searchParams.get('v')===D.v)return send(res,200,{same:true});return send(res,200,state(u))}
 if(p==='/api/act'&&POST){const b=await readJSON(req),f=A[b.a];if(!f)return send(res,400,{err:'Ação inválida'});if(rate('a'+u.uid,200,6e4))return send(res,429,{err:'Muitas ações seguidas. Aguarde um instante.'});
  if(u.blockedUntil&&u.blockedUntil>Date.now())return send(res,403,{blocked:u.blockedUntil});
  const r=f(u,b,base)||{};if(AUD.has(b.a))log('ADMIN',u.handle,b.a,JSON.stringify({...b,password:undefined,x:undefined}).slice(0,160));if(b.a!=='tick')touch();else dirty=true;return send(res,200,{ok:!r.err,...r})}
 if(p==='/api/upload'&&POST){if(u.blockedUntil&&u.blockedUntil>Date.now())return send(res,403,{blocked:1});return upload(req,res,u,url.searchParams)}
 if(p==='/api/updfile'&&POST){if(!adm(u))return send(res,403,{err:'Sem permissão'});const n=url.searchParams.get('name')||'';if(!UPD_FILES.includes(n))return send(res,400,{err:'Arquivo não permitido: '+n+'. Use: '+UPD_FILES.join(', ')});return saveFile(req,res,path.join(STAGE,n),n==='app.apk'?250:8)}
 if(p==='/download/sasc.apk'&&req.method==='GET'){if(!D.upd.apk||!fs.existsSync(APKF)){res.writeHead(404);return res.end()}const st=fs.statSync(APKF);res.writeHead(200,{'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename="Sasc.apk"','Content-Length':st.size,'Cache-Control':'no-store',...SEC});return fs.createReadStream(APKF).pipe(res)}
 const m=p.match(/^\/video\/(\d+)$/);if(m&&(req.method==='GET'||req.method==='HEAD')){const r=D.reels[m[1]];if(!r){res.writeHead(404);return res.end()}return serveVideo(req,res,r)}
 res.writeHead(404,SEC);res.end('Não encontrado');
}catch(e){log('ERRO',e&&e.stack||e);try{send(res,500,{err:'Erro no servidor'})}catch(x){}}});srv.headersTimeout=20000;srv.requestTimeout=0;srv.keepAliveTimeout=5000;srv.setTimeout(120000);srv.listen(PORT,()=>console.log('\nSasc rodando em http://localhost:'+PORT+(ADMPW?'':'\n(!) Defina adminPassword no config.json para poder criar @callebe e @sasc.')+'\n'));
