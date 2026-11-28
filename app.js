const $=s=>document.querySelector(s);
const categories=[["congelados","Congelados"],["resfriados","Resfriados"],["estoque","Estoque"],["paes","Pães"],["smart","SMART · Batata e brindes"],["hortifruti","Hortifruti"],["coca_cola","Coca-Cola"]];
const cycles={regular:["Regular · segunda 11h","Recebe quinta",["congelados","resfriados","estoque"]],smart_wed:["SMART · quarta 11h","Recebe segunda",["smart"]],smart_sat:["SMART · sábado 11h","Recebe quinta",["smart"]],hort_wed:["Hortifruti · quarta 11h","Recebe segunda",["hortifruti"]],hort_sat:["Hortifruti · sábado 11h","Recebe quinta",["hortifruti"]]};
let products=[],page="overview",countDirtyCategories=new Set(),cat="congelados",countGroup="regular",countSubcategory="congelados",breadCycle=null,otherCat="coca_cola",cycle="regular",menuOpen=false,data=JSON.parse(localStorage.getItem("pedidos-ipm")||'{"gc":{},"counts":{},"orders":[],"audit":[]}');
data.audit??=[];data.orders??=[];data.gc??={};data.counts??={};data.countSaved??={};
let cloudReady=false,cloudSaving=Promise.resolve(),cloudUpdatedAt=null;
const authToken=()=>window.IPM_AUTH?.session?.access_token||"";
const authUserId=()=>{try{return JSON.parse(atob(authToken().split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).sub||null}catch{return null}};
async function cloudRequest(path,options={}){const token=authToken();if(!token)throw new Error("Sessão não autenticada");const r=await fetch("https://pthjfsjqkhzwqibvywxv.supabase.co/rest/v1/"+path,{...options,headers:{apikey:"sb_publishable_7NzwxzFq7-KI0W1wsfPxRA_6oX5bFUg",Authorization:"Bearer "+token,"Content-Type":"application/json",...(options.headers||{})}});if(!r.ok){const msg=await r.text();throw new Error("Falha na sincronização ("+r.status+"): "+msg.slice(0,180))}return r.status===204?null:r.json().catch(()=>null)}
async function writeCloudState(){const uid=authUserId();if(!uid||!cloudReady)return;const stamp=new Date().toISOString(),payload={data,products};await cloudRequest("app_state?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:"restaurante-ipm",payload,updated_by:uid,updated_at:stamp})});cloudUpdatedAt=stamp}
async function pullCloudState(){if(!cloudReady||countDirtyCategories.size||document.activeElement?.matches("input,textarea,select"))return;try{const rows=await cloudRequest("app_state?select=payload,updated_at&id=eq.restaurante-ipm");if(!rows?.length||!rows[0].payload||rows[0].updated_at===cloudUpdatedAt)return;const remote=rows[0].payload;data={...{gc:{},counts:{},orders:[],audit:[],countSaved:{}},...(remote.data||{})};data.audit??=[];data.orders??=[];data.gc??={};data.counts??={};data.countSaved??={};const base=await fetch("./products.json",{cache:"no-store"}).then(r=>r.json());products=mergeProducts(base,remote.products);cloudUpdatedAt=rows[0].updated_at;localStorage.setItem("pedidos-ipm",JSON.stringify(data));localStorage.setItem("pedidos-ipm-products",JSON.stringify(products));render()}catch(e){console.warn("Atualização remota adiada:",e)}}
const save=()=>{localStorage.setItem("pedidos-ipm",JSON.stringify(data));if(products.length)localStorage.setItem("pedidos-ipm-products",JSON.stringify(products));if(cloudReady){cloudSaving=cloudSaving.then(writeCloudState).catch(e=>{console.error("Pedido IPM cloud sync:",e);toast("Salvo neste aparelho. Falha ao sincronizar com a nuvem.")})}};
const n=v=>Number(v||0),fmt=v=>n(v).toLocaleString("pt-BR",{maximumFractionDigits:2});
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const days=Array.from({length:11},(_,i)=>{let d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i+1);return d});
const gcPercent=()=>n(data.gcPercent),adjustedGc=d=>n(data.gc[dateKey(d)])*(1+gcPercent()/100),gcTotal=()=>days.reduce((s,d)=>s+adjustedGc(d),0),gcForProduct=p=>{if(p.category!=="paes")return gcTotal();const cycleDays=breadCycle==="segunda"?4:breadCycle==="quinta"?3:0;return days.slice(0,cycleDays).reduce((sum,d)=>sum+adjustedGc(d),0)},stock=p=>data.counts[p.id]||{stock:0,incoming:0},need=p=>gcTotal()*n(p.mtc)/1000,qty=p=>Math.max(0,Math.ceil(need(p)-n(stock(p).stock)-n(stock(p).incoming))),countNeed=p=>n(p.packageSize)>0?(gcForProduct(p)*n(p.mtc)/1000)/n(p.packageSize):null,countOrder=p=>{const v=countNeed(p);if(v===null)return null;const balance=v-n(stock(p).stock)-n(stock(p).incoming);return balance>0?Math.ceil(balance):0};
function audit(action,detail){data.audit.unshift({date:new Date().toISOString(),action,detail});data.audit=data.audit.slice(0,300)}
const nav=[["overview","Visão geral","home"],["inputs","Inputs","chart"],["count","Pedidos 1.0","clipboard"],["other_orders","Coca-Cola","layers"],["analysis","Análise","activity"],["settings","Configurações","settings"],["profile","Perfil","profile"]];
function navIcon(name){const paths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',package:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8v9l9 5 9-5V8M12 13v9"/>',chart:'<path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 6-7"/>',clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6V7H9zM8 11h8m-8 4h8"/>',layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7 7 0 0 0 0-3l2-1.5-2-3.5-2.3 1a7 7 0 0 0-2.7-1.5L13.5 2h-3L10 5a7 7 0 0 0-2.7 1.5L5 5.5 3 9l2 1.5a7 7 0 0 0 0 3L3 15l2 3.5 2.3-1A7 7 0 0 0 10 19l.5 3h3l.5-3a7 7 0 0 0 2.7-1.5l2.3 1L21 15z"/>',truck:'<path d="M3 6h12v12H3zM15 10h4l3 4v4h-7"/><circle cx="7.5" cy="19" r="2"/><circle cx="18.5" cy="19" r="2"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +(paths[name]||paths.home)+'</svg>'}

const adminModules=[["uniform","Projeção de estoque de uniforme","Uniformes"],["utensils","Projeção de utensílios","Utensílios"],["intermitentes","Projeção de intermitentes","Equipe"],["mercado_livre","Projeção de Mercado Livre","Compras"],["agua","Projeção de água","Consumo"],["luz","Projeção de gasto de luz","Energia"],["manutencao","Projeção de itens de manutenção","Manutenção"],["gastos","Controle de gastos","Financeiro"]];
function adminShell(content){
 const links=adminModules.map(([id,title])=>'<button class="admin-side-link '+(page==="admin_"+id?"active":"")+'" data-admin-module="'+id+'"><span>↗</span>'+title+'</button>').join("");
 const heading=page==="admin"?"Painel administrativo":(adminModules.find(x=>"admin_"+x[0]===page)?.[1]||"Gestão Administrativa");
 return '<div class="admin-workspace"><aside class="admin-sidebar"><div class="admin-brand"><span class="admin-brand-mark">IPM</span><div><b>Gestão Administrativa</b><small>Planejamento e controle</small></div></div><button class="admin-return" data-page="overview">‹ Voltar ao Pedido IPM</button><div class="admin-nav-label">ÁREAS ADMINISTRATIVAS</div><button class="admin-side-link '+(page==="admin"?"active":"")+'" data-page="admin"><span>⌂</span>Visão geral</button>'+links+'<div class="admin-side-bottom">Ambiente administrativo</div></aside><section class="admin-main"><header class="admin-topbar"><div><span class="eyebrow">RESTAURANTE IPM</span><h1>'+heading+'</h1></div><button class="admin-return-mobile" data-page="overview">‹ Pedido IPM</button></header><div class="admin-content">'+content+'</div></section></div>';
}
function adminPanel(){
 const cards=adminModules.map(([id,title,subtitle])=>'<button class="admin-module-card" data-admin-module="'+id+'"><span class="admin-module-icon">'+(id==="gastos"?"R$":"↗")+'</span><span class="admin-module-copy"><b>'+title+'</b><small>'+subtitle+'</small></span><span class="admin-module-arrow">›</span></button>').join("");
 return adminShell('<div class="page-intro admin-page-intro"><div><span class="eyebrow">VISÃO GERAL</span><h2>Bem-vindo à Gestão Administrativa</h2><p>Escolha uma área para planejar, acompanhar projeções e controlar os gastos da unidade.</p></div></div><div class="admin-module-grid">'+cards+'</div>');
}
function adminModulePage(){
 const item=adminModules.find(x=>x[0]===page.slice(6));
 if(!item)return adminPanel();
 return adminShell('<div class="page-intro"><div><span class="eyebrow">GESTÃO ADMINISTRATIVA</span><h2>'+item[1]+'</h2><p>Área independente de planejamento e acompanhamento.</p></div></div><section class="card admin-module-placeholder"><div class="admin-placeholder-icon">↗</div><h3>'+item[1]+'</h3><p>Esta área está criada no painel administrativo. Aqui serão desenvolvidos os cadastros, projeções, cálculos e relatórios específicos deste controle.</p><span class="pill blue">Estrutura inicial</span></section>');
}

function render(){
 const role=window.IPM_AUTH?.profile?.role||"viewer";
 const visibleNav=isGun()?nav:isGp()?nav.filter(x=>["overview","inputs","count","other_orders","analysis","settings","profile"].includes(x[0])):nav.filter(x=>["overview","count","other_orders","analysis","profile"].includes(x[0]));
 const pageTitles={admin:"Gestão Administrativa",products:"Produtos",orders:"Pedidos",history:"Histórico",users:"Gerenciar usuários",profile:"Perfil",settings:"Configurações",other_orders:"Coca-Cola"};
 const pageViews={admin:adminPanel,admin_uniform:adminModulePage,admin_utensils:adminModulePage,admin_intermitentes:adminModulePage,admin_mercado_livre:adminModulePage,admin_agua:adminModulePage,admin_luz:adminModulePage,admin_manutencao:adminModulePage,admin_gastos:adminModulePage,overview,products:productsPage,inputs,count:countPage,other_orders:otherOrders,analysis,orders,history,settings:settingsPage,profile:profilePage,users:usersSettingsPage};
 const deniedSupervisor=["inputs","settings","products","orders","history","users"].includes(page);
 const deniedGp=["history","users"].includes(page);
 if((page==="admin"||page.startsWith("admin_"))&&!isGun())page="overview";
 if(!pageViews[page]||(isSupervisor()&&deniedSupervisor)||(isGp()&&deniedGp)||(!isGun()&&!isGp()&&["products","orders"].includes(page)))page="overview";
 $("#app-shell").classList.toggle("admin-mode",page==="admin"||page.startsWith("admin_"));
 $("#page-title").textContent=pageTitles[page]||(visibleNav.find(x=>x[0]===page)?.[1]||"Visão geral");
 document.querySelectorAll(".header-shortcut").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
 $("#today-label").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
 const links=visibleNav.map(([id,title,ico])=>'<button class="nav-item '+(page===id?"active":"")+'" data-page="'+id+'"><span class="nav-icon">'+navIcon(ico)+'</span><span>'+title+'</span></button>').join("");
 $("#side-nav").innerHTML=links+(isGun()?'<div class="nav-section-label">ADMINISTRAÇÃO</div><button class="nav-item nav-admin-item '+(page==="admin"||page.startsWith("admin_")?"active":"")+'" data-page="admin"><span class="nav-icon">'+navIcon("settings")+'</span><span>Gestão Administrativa</span></button>':"");
 $("#content").innerHTML=pageViews[page]();
 wire();wireProfile();wireUsers();
 const topProfile=document.querySelector(".top-profile");
 if(topProfile)topProfile.onclick=()=>{page="profile";render()};
 updateCountExportState();applyPermissions();
}
function settingsPage(){
 const admin=isGun(),gp=isGp();
 return '<div class="page-intro"><div><h2>Configurações</h2><p>Gerencie cadastros, pedidos e informações do aplicativo.</p></div></div>'+
 '<div class="settings-grid">'+
 ((admin||gp)?'<button class="card settings-link" data-page="products"><span><b>Produtos</b><small>Editar produtos, MTC, embalagens e categorias</small></span><span>›</span></button>':'')+
 '<button class="card settings-link" data-page="orders"><span><b>Pedidos</b><small>Consultar e editar ciclos e pedidos</small></span><span>›</span></button>'+
 (admin?'<button class="card settings-link" data-page="history"><span><b>Histórico</b><small>Consultar pedidos e registros de alterações</small></span><span>›</span></button>':'')+
 (admin?'<button class="card settings-link" data-page="users"><span><b>Gerenciar usuários</b><small>Criar, editar, ativar ou excluir usuários</small></span><span>›</span></button>':'')+
 '</div>';
}

function profilePage(){
 const p=window.IPM_AUTH?.profile||{},role=p.role||"viewer";
 const names={admin:"GUN",gun:"GUN",manager:"Gerente de Plantão",gp:"Gerente de Plantão",viewer:"Supervisor",supervisor_diaria:"Supervisor Diária",supervisor_quiosque:"Supervisor Quiosque",treinador:"Treinador"};
 const permissions=isGun()?["Visão geral","Inputs","Pedidos 1.0","Coca-Cola","Análise","Configurações","Produtos","Pedidos","Histórico","Gerenciar usuários","Perfil"]:isGp()?["Visão geral","Inputs","Pedidos 1.0","Coca-Cola","Análise","Configurações","Produtos","Pedidos","Perfil"]:["Visão geral","Pedidos 1.0 (somente visualizar)","Coca-Cola (somente visualizar)","Análise (somente visualizar)","Perfil"];
 const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const avatar=p.avatar_url?'<img src="'+p.avatar_url+'" alt="Foto de perfil">':esc((p.display_name||p.username||"IP").trim().split(/\\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase());
 return '<div class="page-intro"><div><h2>Meu perfil</h2><p>Seus dados, segurança e permissões de acesso.</p></div></div>'+
 '<section class="card profile-card"><div class="profile-identity"><div class="profile-avatar">'+avatar+'</div><div><h3>'+esc(p.display_name||p.username||"Usuário")+'</h3><p>@'+esc(p.username||"")+' · '+(names[role]||"Usuário")+'</p><label class="btn secondary profile-upload">Alterar foto<input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp" hidden></label></div></div></section>'+
 '<section class="card profile-card"><h3>Segurança da conta</h3><p class="profile-help">Informe a senha atual para confirmar a alteração.</p><form id="profile-password-form" class="profile-form"><label>Senha atual<input name="current_password" type="password" autocomplete="current-password" required></label><label>Nova senha<input name="new_password" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirmar nova senha<input name="confirm_password" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn primary" type="submit">Alterar senha</button></form></section>'+
 '<section class="card profile-card"><div class="profile-role"><div><h3>Cargo e permissões</h3><p>As permissões são definidas pelo GUN e não podem ser alteradas pelo próprio usuário.</p></div><span class="pill blue">'+(names[role]||"Usuário")+'</span></div><div class="permission-list">'+permissions.map(label=>'<div class="permission-row"><span class="permission-check">✓</span><span>'+label+'</span></div>').join("")+'</div></section>';
}
async function updateOwnProfile(values){
 const send=async token=>fetch("https://pthjfsjqkhzwqibvywxv.supabase.co/rest/v1/profiles?user_id=eq."+authUserId(),{method:"PATCH",headers:{apikey:"sb_publishable_7NzwxzFq7-KI0W1wsfPxRA_6oX5bFUg",Authorization:"Bearer "+token,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({...values,updated_at:new Date().toISOString()})});
 let token=authToken(),r=await send(token);
 if(r.status===401&&window.IPM_AUTH?.refreshSession){token=await window.IPM_AUTH.refreshSession();r=await send(token)}
 if(!r.ok){const detail=await r.text().catch(()=>"");throw new Error("Não foi possível salvar os dados do perfil ("+r.status+"). "+detail.slice(0,160))}
}
function wireProfile(){
 $("#profile-name-form")?.addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,name=String(new FormData(form).get("display_name")||"").trim(),btn=form.querySelector("button");if(!name)return;btn.disabled=true;try{await updateOwnProfile({display_name:name});window.IPM_AUTH.profile.display_name=name;$("#top-profile-name").textContent=name;toast("Nome atualizado.");render()}catch(err){toast(err.message)}finally{btn.disabled=false}});
 $("#profile-photo")?.addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){toast("A foto deve ter no máximo 5 MB.");return}try{const photo=await new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const c=document.createElement("canvas"),scale=Math.min(1,320/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL("image/jpeg",.78))};img.onerror=reject;img.src=url});await updateOwnProfile({avatar_url:photo});window.IPM_AUTH.profile.avatar_url=photo;const top=$("#top-initials");if(top)top.innerHTML='<img src="'+photo+'" alt="Foto de perfil">';toast("Foto de perfil atualizada.");render()}catch(err){toast("Não foi possível atualizar a foto: "+err.message)}});
 $("#profile-password-form")?.addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),current=String(f.get("current_password")),next=String(f.get("new_password")),confirm=String(f.get("confirm_password")),btn=form.querySelector("button");if(next.length<8)return toast("A nova senha precisa ter pelo menos 8 caracteres.");if(next!==confirm)return toast("A confirmação da nova senha não confere.");btn.disabled=true;try{const login=await fetch("https://pthjfsjqkhzwqibvywxv.supabase.co/functions/v1/username-login",{method:"POST",headers:{"Content-Type":"application/json",apikey:"sb_publishable_7NzwxzFq7-KI0W1wsfPxRA_6oX5bFUg"},body:JSON.stringify({username:window.IPM_AUTH.profile.username,password:current})});const result=await login.json().catch(()=>({}));if(!login.ok||!result.session?.access_token)throw new Error("A senha atual está incorreta.");const changed=await fetch("https://pthjfsjqkhzwqibvywxv.supabase.co/auth/v1/user",{method:"PUT",headers:{apikey:"sb_publishable_7NzwxzFq7-KI0W1wsfPxRA_6oX5bFUg",Authorization:"Bearer "+result.session.access_token,"Content-Type":"application/json"},body:JSON.stringify({password:next})});if(!changed.ok)throw new Error("O serviço não aceitou a alteração da senha.");form.reset();toast("Senha alterada com sucesso.")}catch(err){toast(err.message)}finally{btn.disabled=false}});
}

const USER_ROLE_OPTIONS=[["gun","GUN"],["gp","Gerente de Plantão"],["supervisor_diaria","Supervisor Diária"],["supervisor_quiosque","Supervisor Quiosque"],["treinador","Treinador"]];
const USER_ROLE_NAMES={admin:"GUN",gun:"GUN",manager:"Gerente de Plantão",gp:"Gerente de Plantão",viewer:"Supervisor",supervisor_diaria:"Supervisor Diária",supervisor_quiosque:"Supervisor Quiosque",treinador:"Treinador"};
const isGun=()=>["admin","gun"].includes(window.IPM_AUTH?.profile?.role);
const isGp=()=>["manager","gp"].includes(window.IPM_AUTH?.profile?.role);
const isSupervisor=()=>["viewer","supervisor_diaria","supervisor_quiosque","treinador"].includes(window.IPM_AUTH?.profile?.role);
async function userAdmin(action,payload={}){
 const token=window.IPM_AUTH?.session?.access_token;
 if(!token)throw new Error("Sessão expirada. Entre novamente.");
 const response=await fetch("https://pthjfsjqkhzwqibvywxv.supabase.co/functions/v1/user-admin",{
  method:"POST",
  headers:{apikey:"sb_publishable_7NzwxzFq7-KI0W1wsfPxRA_6oX5bFUg",Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify({action,...payload})
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||"Não foi possível concluir a operação.");
 return result;
}
function usersSettingsPage(){
 if(!isGun())return '<section class="card"><h2>Acesso restrito</h2><p>Somente o GUN pode gerenciar usuários.</p></section>';
 return '<div class="page-intro"><div><h2>Gerenciar usuários</h2><p>Cadastre pessoas, defina o cargo e acompanhe quem está ativo no aplicativo.</p></div><span class="pill blue">ADMINISTRAÇÃO</span></div>'+
 '<section class="card user-admin-card"><div class="user-admin-heading"><div><span class="user-admin-kicker">CADASTRO</span><h3>Novo usuário</h3><p>Preencha os dados para criar o acesso de uma pessoa.</p></div><span class="user-admin-add">＋</span></div>'+
 '<form id="user-create-form" class="user-create-form">'+
 '<label>Nome completo<input name="display_name" maxlength="80" required placeholder="Nome da pessoa"></label>'+
 '<label>Nome de usuário<input name="username" minlength="3" maxlength="32" pattern="[A-Za-z0-9._-]+" required autocomplete="off" placeholder="ex.: maria.silva"></label>'+
 '<label>Senha inicial<input name="password" type="password" minlength="8" maxlength="128" required autocomplete="new-password" placeholder="Mínimo de 8 caracteres"></label>'+
 '<label>Cargo<select name="role" required>'+USER_ROLE_OPTIONS.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join("")+'</select></label>'+
 '<button class="btn primary" type="submit">＋ Criar usuário</button></form></section>'+
 '<section class="card user-admin-card"><div class="user-admin-heading"><div><span class="user-admin-kicker">EQUIPE</span><h3>Usuários ativos</h3><p>Contas liberadas para entrar no Pedido IPM 1.0.</p></div><span class="pill green" id="active-users-count">Carregando</span></div>'+
 '<div id="users-list" class="users-list"><div class="users-loading">Carregando usuários ativos...</div></div></section>';
}
function escapeUserText(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function loadActiveUsers(){
 const list=$("#users-list"),count=$("#active-users-count");
 if(!list)return;
 list.innerHTML='<div class="users-loading">Atualizando lista...</div>';
 try{
  const result=await userAdmin("list");
  const active=(result.users||[]).filter(user=>user.active);
  if(count)count.textContent=active.length+" ativos";
  if(!active.length){list.innerHTML='<div class="users-empty"><strong>Nenhum usuário ativo cadastrado.</strong><span>Crie o primeiro usuário no formulário acima.</span></div>';return}
  list.innerHTML='<div class="users-table-wrap"><table class="users-table"><thead><tr><th>Usuário</th><th>Cargo</th><th>Conta</th><th>Ações</th></tr></thead><tbody>'+
   active.map(user=>{
    const role=user.role==="admin"?"gun":user.role;
    const options=USER_ROLE_OPTIONS.map(([value,label])=>'<option value="'+value+'" '+(role===value?"selected":"")+'>'+label+'</option>').join("");
    const self=user.user_id===authUserId();
    return '<tr data-user-id="'+escapeUserText(user.user_id)+'"><td><div class="user-name-cell"><b>'+escapeUserText(user.display_name||user.username)+'</b><small>@'+escapeUserText(user.username)+'</small></div></td><td><select class="user-role-select" data-user-role>'+options+'</select></td><td><div class="user-account-status"><span class="user-status-active"><i></i> Ativo</span>'+(user.force_password_reset?'<small class="user-reset-pending">Reset de senha solicitado</small>':'')+'</div></td><td><div class="user-row-actions"><button type="button" class="btn secondary" data-user-save>Salvar cargo</button><button type="button" class="btn secondary user-reset-btn" data-user-reset '+(self||user.force_password_reset?'disabled title="Reset já solicitado ou conta atual"':'')+'>'+(user.force_password_reset?'Reset solicitado':'Resetar senha')+'</button><button type="button" class="btn secondary" data-user-disable '+(self?'disabled title="Não é possível desativar seu próprio acesso"':'')+'>Desativar</button><button type="button" class="btn danger" data-user-delete '+(self?'disabled title="Não é possível excluir sua própria conta"':'')+'>Excluir</button></div></td></tr>';
   }).join("")+'</tbody></table></div>';
 }catch(error){
  if(count)count.textContent="Erro";
  list.innerHTML='<div class="users-error">'+escapeUserText(error.message)+'</div>';
 }
}
function wireUsers(){
 const form=$("#user-create-form");
 if(!form)return;
 loadActiveUsers();
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const data=new FormData(form),button=form.querySelector('button[type="submit"]');
  const payload={display_name:String(data.get("display_name")||"").trim(),username:String(data.get("username")||"").trim().toLowerCase(),password:String(data.get("password")||""),role:String(data.get("role")||"")};
  if(payload.display_name.length<2)return toast("Informe o nome completo.");
  if(!/^[a-z0-9._-]{3,32}$/.test(payload.username))return toast("Use de 3 a 32 caracteres no usuário: letras, números, ponto, hífen ou sublinhado.");
  if(payload.password.length<8)return toast("A senha inicial precisa ter pelo menos 8 caracteres.");
  button.disabled=true;button.textContent="Criando usuário...";
  try{await userAdmin("create",payload);form.reset();toast("Usuário criado com sucesso.");await loadActiveUsers()}
  catch(error){toast(error.message)}
  finally{button.disabled=false;button.textContent="＋ Criar usuário"}
 });
 $("#users-list").addEventListener("click",async event=>{
  const row=event.target.closest("tr[data-user-id]");
  if(!row)return;
  const userId=row.dataset.userId;
  const button=event.target.closest("button");
  if(!button)return;
  button.disabled=true;
  try{
   if(button.matches("[data-user-save]")){
    await userAdmin("update",{user_id:userId,role:row.querySelector("[data-user-role]").value,active:true});
    toast("Cargo atualizado.");await loadActiveUsers();
   }else if(button.matches("[data-user-reset]")){
    if(!confirm("Solicitar redefinição de senha para este usuário? Na próxima vez que entrar, ele precisará cadastrar uma nova senha antes de acessar o aplicativo."))return;
    await userAdmin("request_password_reset",{user_id:userId});
    toast("Reset solicitado. A pessoa deverá criar uma nova senha no próximo login.");
    await loadActiveUsers();
   }else if(button.matches("[data-user-disable]")){
    if(!confirm("Desativar este usuário? Ele não poderá entrar no aplicativo."))return;
    await userAdmin("update",{user_id:userId,role:row.querySelector("[data-user-role]").value,active:false});
    toast("Usuário desativado.");await loadActiveUsers();
   }else if(button.matches("[data-user-delete]")){
    if(!confirm("Excluir permanentemente este usuário? Esta ação não poderá ser desfeita."))return;
    await userAdmin("delete",{user_id:userId});
    toast("Usuário excluído.");await loadActiveUsers();
   }
  }catch(error){toast(error.message)}
  finally{button.disabled=false}
 });
}

function overview(){
 const eligible=products.filter(p=>p.mtc!=null&&n(p.mtc)>0&&n(p.packageSize)>0&&p.category!=="paes").map(p=>{const projected=(gcTotal()*n(p.mtc)/1000)/n(p.packageSize),s=stock(p),available=n(s.stock)+n(s.incoming),excess=Math.max(0,available-projected),ratio=projected>0?available/projected:available>0?Infinity:1;return {...p,projected,available,excess,ratio}});
 const above=eligible.filter(p=>p.excess>0).sort((a,b)=>b.excess-a.excess),risk=eligible.filter(p=>p.available===0||p.ratio<.25),ok=eligible.filter(p=>p.ratio>=.25&&p.ratio<=1);
 const max=Math.max(1,...eligible.flatMap(p=>[p.projected,p.available])),w=1000,h=300,left=42,right=18,top=20,bottom=54,innerW=w-left-right,innerH=h-top-bottom;
 const x=i=>eligible.length<=1?left+innerW/2:left+i*innerW/(eligible.length-1),y=v=>top+innerH-(v/max)*innerH;
 const line=(key)=>eligible.map((p,i)=>(i?"L":"M")+x(i).toFixed(1)+" "+y(p[key]).toFixed(1)).join(" ");
 const points=eligible.map((p,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(p.available).toFixed(1)+'" r="3.2"><title>'+p.name+': disponível '+fmt(p.available)+'</title></circle>').join("");
 const projPoints=eligible.map((p,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(p.projected).toFixed(1)+'" r="2.5"><title>'+p.name+': projeção '+fmt(p.projected)+'</title></circle>').join("");
 const grid=[0,.25,.5,.75,1].map(v=>'<line x1="'+left+'" x2="'+(w-right)+'" y1="'+y(max*v)+'" y2="'+y(max*v)+'" stroke="#e9eef5" stroke-dasharray="4 5"/><text x="'+(left-8)+'" y="'+(y(max*v)+4)+'" text-anchor="end" fill="#8491a4" font-size="11">'+fmt(max*v)+'</text>').join("");
 const lineSvg='<div class="overview-chart-scroll"><svg class="overview-line-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Gráfico de linhas comparando estoque disponível e projeção de todos os produtos">'+grid+'<path d="'+line("projected")+'" fill="none" stroke="#22b8a7" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="'+line("available")+'" fill="none" stroke="#5269e8" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+projPoints+points+eligible.map((p,i)=>'<text x="'+x(i).toFixed(1)+'" y="'+(h-25)+'" transform="rotate(-48 '+x(i).toFixed(1)+' '+(h-25)+')" text-anchor="end" fill="#6b778b" font-size="9">'+p.name.replace(/&/g,"&amp;").replace(/</g,"&lt;")+'</text>').join("")+'</svg></div>';
 const pieItems=above.slice(0,7),other=above.slice(7).reduce((s,p)=>s+p.excess,0),pieTotal=above.reduce((s,p)=>s+p.excess,0);
 let offset=0;const colors=["#5269e8","#22b8a7","#4263a5","#7c6ee6","#36a6c9","#6b87a8","#8b9bb0","#c0cad6"];
 const slices=pieItems.map((p,i)=>{const v=pieTotal?p.excess/pieTotal*100:0,start=offset;offset+=v;return '<circle r="62" cx="90" cy="90" fill="none" stroke="'+colors[i]+'" stroke-width="26" stroke-dasharray="'+(v*3.895)+' '+(389.5-v*3.895)+'" stroke-dashoffset="'+(-start*3.895)+'" transform="rotate(-90 90 90)"><title>'+p.name+': '+fmt(p.excess)+' acima da projeção</title></circle>'}).join("")+(other>0?'<circle r="62" cx="90" cy="90" fill="none" stroke="'+colors[7]+'" stroke-width="26" stroke-dasharray="'+(other/pieTotal*389.5)+' '+(389.5-other/pieTotal*389.5)+'" stroke-dashoffset="'+(-offset*3.895)+'" transform="rotate(-90 90 90)"><title>Outros: '+fmt(other)+'</title></circle>':"");
 const legend=pieItems.map((p,i)=>'<div class="overview-pie-legend"><i style="background:'+colors[i]+'"></i><span>'+p.name+'</span><b>'+fmt(p.excess)+'</b></div>').join("")+(other>0?'<div class="overview-pie-legend"><i style="background:'+colors[7]+'"></i><span>Outros produtos</span><b>'+fmt(other)+'</b></div>':"");
 const excessTotal=above.reduce((s,p)=>s+p.excess,0),zero=eligible.filter(p=>p.available===0).length;

 const safe=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
 const categoryCharts=[["congelados","Congelados"],["resfriados","Resfriados"],["estoque","Estoque"],["paes","Pães"]].map(([id,label])=>{
  const items=products.filter(p=>p.category===id&&p.mtc!=null&&n(p.mtc)>0&&n(p.packageSize)>0).map(p=>{
   const projected=id==="paes"?countNeed(p):gcTotal()*n(p.mtc)/1000/n(p.packageSize);
   const s=stock(p),available=n(s.stock)+n(s.incoming);
   return {...p,projected,available,excess:id==="paes"?0:Math.max(0,available-projected)};
  });
  const isBread=id==="paes",over=items.filter(p=>p.excess>0).sort((a,b)=>b.excess-a.excess);
  const max=Math.max(1,...items.flatMap(p=>isBread?[p.projected,p.projected*.1]:[p.projected,p.available]));
  const width=850,height=220,L=35,R=14,T=15,B=48,iw=width-L-R,ih=height-T-B;
  const X=i=>items.length<=1?L+iw/2:L+i*iw/(items.length-1),Y=v=>T+ih-v/max*ih;
  const path=key=>items.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(p[key]).toFixed(1)).join(" ");
  const lineA=items.map((p,i)=>'<circle cx="'+X(i)+'" cy="'+Y(p.projected)+'" r="3"><title>'+p.name+': projeção '+fmt(p.projected)+'</title></circle>').join("");
  const lineB=isBread?items.map((p,i)=>'<circle cx="'+X(i)+'" cy="'+Y(p.projected*.1)+'" r="3"><title>'+p.name+': necessidade congelada 10% '+fmt(p.projected*.1)+'</title></circle>').join(""):items.map((p,i)=>'<circle cx="'+X(i)+'" cy="'+Y(p.available)+'" r="3"><title>'+p.name+': disponível '+fmt(p.available)+'</title></circle>').join("");
  const grid=[0,.5,1].map(v=>'<line x1="'+L+'" x2="'+(width-R)+'" y1="'+Y(max*v)+'" y2="'+Y(max*v)+'" stroke="#e9eef5" stroke-dasharray="4 5"/>').join("");
  const svg='<div class="overview-category-chart-scroll"><svg viewBox="0 0 '+width+' '+height+'" class="overview-category-chart" role="img" aria-label="Gráfico '+label+'">'+grid+'<path d="'+path("projected")+'" fill="none" stroke="#22b8a7" stroke-width="3" stroke-linecap="round"/>'+(isBread?'<path d="'+items.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(p.projected*.1).toFixed(1)).join(" ")+'" fill="none" stroke="#5269e8" stroke-width="3" stroke-linecap="round"/>':'<path d="'+path("available")+'" fill="none" stroke="#5269e8" stroke-width="3" stroke-linecap="round"/>')+lineA+lineB+items.map((p,i)=>'<text x="'+X(i)+'" y="'+(height-15)+'" transform="rotate(-42 '+X(i)+' '+(height-15)+')" text-anchor="end" font-size="9" fill="#6b778b">'+safe(p.name)+'</text>').join("")+'</svg></div>';
  return '<section class="card overview-analytics overview-category-card"><div class="overview-section-heading"><div><h3>'+label+'</h3><p>'+(isBread?'Necessidade por produto: pães frescos e cálculo adicional de 10% para congelados.': 'Comparação do estoque disponível com a projeção de 11 dias.')+'</p></div><span class="pill blue">'+items.length+' produtos</span></div>'+(items.length?'<div class="overview-chart-legend"><span><i class="legend-projection"></i>'+(isBread?'Pães frescos':'Projeção')+'</span><span><i class="legend-stock"></i>'+(isBread?'Pães congelados (10%)':'Estoque + a receber')+'</span></div>'+svg+(isBread?'<p class="overview-category-note">Pães não possuem controle de estoque nesta tela; por isso, o gráfico mostra a necessidade calculada, sem classificar excesso.</p>':'<div class="overview-category-over"><b>'+over.length+'</b> produtos acima da projeção'+(over.length?'<ul>'+over.slice(0,8).map(p=>'<li>'+safe(p.name)+': <strong>+'+fmt(p.excess)+'</strong></li>').join("")+'</ul>':'')+'</div>'):'<p class="overview-empty">Nenhum produto desta categoria possui MTC e fator de embalagem válidos para o gráfico.</p>')+'</section>';
 }).join("");

 return '<section class="overview-welcome"><div class="overview-welcome-copy"><span class="overview-kicker">PEDIDO IPM 1.0</span><h2>Painel de pedidos</h2><p>Planejamento de consumo, estoque e reposição em um só lugar.</p><span class="pill blue">11 DIAS DE PROJEÇÃO</span></div></section><section class="card overview-analytics"><div class="overview-section-heading"><div><h3>Estoque x projeção por produto</h3><p>Comparação de estoque contado + a receber com a necessidade projetada para 11 dias.</p></div><span class="pill blue">'+eligible.length+' produtos analisados</span></div><div class="overview-chart-legend"><span><i class="legend-stock"></i>Estoque disponível</span><span><i class="legend-projection"></i>Projeção</span></div>'+(eligible.length?lineSvg:'<p class="overview-empty">Preencha MTC, embalagem e estoque dos produtos para visualizar o gráfico.</p>')+'<div class="overview-status-row"><span class="status-risk">● '+risk.length+' em risco (abaixo de 25%)</span><span class="status-above">● '+above.length+' acima da projeção</span><span class="status-ok">● '+ok.length+' dentro do nível</span></div></section><section class="card overview-analytics"><div class="overview-section-heading"><div><h3>Excesso de estoque</h3><p>Distribuição do volume acima da projeção. Os maiores excessos aparecem primeiro.</p></div><strong class="overview-excess-total">'+fmt(excessTotal)+' <small>unidades de embalagem</small></strong></div><div class="overview-pie-layout">'+(above.length?'<svg class="overview-pie-chart" viewBox="0 0 180 180" role="img" aria-label="Gráfico de pizza do excesso por produto">'+slices+'<text x="90" y="85" text-anchor="middle" font-size="11" fill="#718096">EXCESSO</text><text x="90" y="103" text-anchor="middle" font-size="15" font-weight="800" fill="#172943">'+fmt(excessTotal)+'</text></svg><div class="overview-pie-list">'+legend+'</div>':'<p class="overview-empty">Nenhum produto acima da projeção com os estoques informados.</p>')+'</div></section>'+categoryCharts+'<section class="card overview-analytics"><div class="overview-section-heading"><div><h3>Produtos que precisam de atenção</h3><p>Itens sem estoque ou com menos de 25% da necessidade projetada.</p></div></div>'+(risk.length?'<div class="overview-risk-list">'+risk.sort((a,b)=>a.ratio-b.ratio).slice(0,12).map(p=>'<div class="overview-risk-item"><span class="risk-dot"></span><strong>'+safe(p.name)+'</strong><span>'+fmt(p.available)+' / '+fmt(p.projected)+'</span><b>'+(p.available===0?'Sem estoque':'Estoque crítico')+'</b></div>').join("")+'</div>':'<p class="overview-empty">Nenhum produto em risco com os dados atuais.</p>')+'</section><div class="grid stats"><section class="card stat-card"><div class="stat-top">Produtos cadastrados</div><div class="stat-value">'+products.length+'</div></section><section class="card stat-card"><div class="stat-top">GC projetado</div><div class="stat-value">'+fmt(gcTotal())+'</div></section><section class="card stat-card"><div class="stat-top">Acima da projeção</div><div class="stat-value">'+above.length+'</div></section><section class="card stat-card"><div class="stat-top">Sem estoque</div><div class="stat-value">'+zero+'</div></section></div>';
}
function productsPage(){
 if(!isGun()&&!isGp())return '<div class="card">Acesso restrito.</div>';
 const rows=products.slice().sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")).map(p=>'<form class="product-edit-row" data-product-form="'+p.id+'"><div class="product-main"><strong>'+p.name+'</strong><small>'+((categories.find(x=>x[0]===p.category)||[])[1]||p.category)+'</small></div><label>MTC<input name="mtc" type="number" min="0" step="0.0001" value="'+(p.mtc??"")+'" placeholder="MTC"></label><label>Unidade<input name="unit" value="'+(p.unit||"un")+'" placeholder="kg, g, L, ml, un"></label><label>Conteúdo da embalagem<input name="packageSize" type="number" min="0" step="0.001" value="'+(p.packageSize??"")+'" placeholder="Ex.: 15"></label><label>Categoria<select name="category">'+categories.map(([id,label])=>'<option value="'+id+'" '+(id===p.category?'selected':'')+'>'+label+'</option>').join("")+'</select></label><button class="btn secondary" type="submit">Salvar</button></form>').join("");
 return '<div class="page-intro"><div><h2>Produtos</h2><p>Gerencie o MTC, unidade, peso/volume da embalagem e categoria de cada item.</p></div><span class="pill blue">'+products.length+' itens</span></div><section class="card product-create-card"><div class="product-create-heading"><span class="product-section-icon">＋</span><div><h3>Adicionar produto</h3><p>Cadastre um novo item no catálogo e defina sua categoria.</p></div></div><form id="new-product-form" class="product-create-form"><label>Nome do produto<input name="name" required maxlength="80" placeholder="Ex.: Bacon"></label><label>Categoria<select name="category">'+categories.map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join("")+'</select></label><label>MTC por 1.000 GC<input name="mtc" type="number" min="0" step="0.0001" placeholder="MTC"></label><label>Unidade de consumo<input name="unit" value="kg" placeholder="kg, g, L, ml, un"></label><label>Conteúdo da embalagem<input name="packageSize" type="number" min="0" step="0.001" placeholder="Ex.: 15"></label><button class="btn primary" type="submit">Adicionar produto</button></form></section><div class="product-list-heading"><div><h3>Catálogo de produtos</h3><p>Pesquise pelo nome ou filtre os itens por categoria.</p></div><span class="pill blue">'+products.length+' itens</span></div><section class="product-filter-card"><label><span>Filtrar por categoria</span><select id="product-category-filter" class="input"><option value="all">Todas as categorias</option>'+categories.map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join("")+'</select></label><label><span>Buscar produto</span><input id="product-search" class="input" placeholder="Digite o nome do produto..."></label></section><div id="product-list" class="product-list">'+rows+'</div>';
}
function inputs(){return '<div class="page-intro"><div><span class="eyebrow">PLANEJAMENTO · DEMANDA</span><h2>Projeção de GC</h2><p>Preencha sempre os próximos 11 dias, começando amanhã.</p></div><span class="pill blue">📅 11 DIAS</span></div><section class="gc-adjust-card"><div class="gc-adjust-icon">📈</div><div class="gc-adjust-copy"><strong>Ajuste de venda</strong><small>Aplicado individualmente em cada dia da projeção.</small></div><label class="gc-percent-field"><span>Percentual de venda</span><div><input id="gc-percent" type="number" step="0.1" min="-100" max="500" value="'+(data.gcPercent??0)+'"><b>%</b></div></label></section><div class="gc-input-grid">'+days.map((d,i)=>'<section class="gc-day-card"><div class="gc-day-top"><span class="gc-day-icon">'+(i%3===0?'📊':i%3===1?'🗓️':'🎯')+'</span><label>'+d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})+'</label></div><input class="input gc-day-input" type="number" min="0" step="1" data-gc="'+dateKey(d)+'" value="'+(data.gc[dateKey(d)]??"")+'" placeholder="Informe o GC"><small>GC ajustado: <b data-gc-adjusted="'+dateKey(d)+'">'+fmt(adjustedGc(d))+'</b></small></section>').join("")+'</div><section class="gc-total-card"><div><span>GC total projetado</span><strong id="gc-total-value">'+fmt(gcTotal())+'</strong><small>Já considera o percentual de venda aplicado.</small></div><span class="gc-total-illustration">🚀</span><button class="btn primary" id="save-gc">Salvar projeção</button></section>'}
function countPage(){
 const groups=[["regular","Pedido Regular"],["hortifruti","Hortifruti"],["smart","SMART · Batata e brindes"]];
 const subcategories=countGroup==="regular"?[["congelados","Congelados"],["resfriados","Resfriados"],["estoque","Estoque"],["paes","Pães"]]:countGroup==="hortifruti"?[["hortifruti","Hortifruti"]]:[["smart","SMART · Batata e brindes"]];
 if(!subcategories.some(x=>x[0]===countSubcategory))countSubcategory=subcategories[0][0];
 const list=products.filter(p=>p.category===countSubcategory);
 const breadOptions=countSubcategory==="paes"?'<div class="bread-cycle-picker"><div class="bread-cycle-heading"><strong>Selecione o ciclo dos pães</strong><small>Escolha o recebimento para calcular a necessidade correta.</small></div><div class="bread-cycle-options"><button type="button" class="bread-cycle-option '+(breadCycle==="segunda"?"active":"")+'" data-bread-cycle="segunda"><span class="bread-cycle-day">SEG</span><span><b>Fecha segunda</b><small>Recebe quinta · 4 dias de GC</small></span></button><button type="button" class="bread-cycle-option '+(breadCycle==="quinta"?"active":"")+'" data-bread-cycle="quinta"><span class="bread-cycle-day">QUI</span><span><b>Fecha quinta</b><small>Recebe segunda · 3 dias de GC</small></span></button></div></div>':"";
 const breadBlocked=countSubcategory==="paes"&&!breadCycle;
 const header='<div class="page-intro"><div><span class="eyebrow">OPERAÇÃO · PEDIDOS</span><h2>Pedidos 1.0</h2><p>'+ (countSubcategory==="paes"?"Necessidade de pães calculada para "+(breadCycle==="segunda"?4:3)+" dias de GC.": "Informe estoque e recebimentos.")+'</p></div>'+(countSubcategory==="paes"?'<span class="pill blue">'+(breadCycle==="segunda"?4:3)+' DIAS</span>':'')+'</div>'+
 '<div class="count-selector"><label for="count-group">Categoria do pedido</label><select id="count-group" class="count-select">'+groups.map(([id,label])=>'<option value="'+id+'" '+(id===countGroup?'selected':'')+'>'+label+'</option>').join('')+'</select></div>'+
 '<div class="count-category-tiles" aria-label="Selecione a categoria">'+subcategories.map(([id,label])=>'<button type="button" class="count-category-tile '+(id===countSubcategory?'active':'')+'" data-count-category="'+id+'"><span class="count-category-symbol">'+(id==="congelados"?"❄️":id==="resfriados"?"🧊":id==="estoque"?"📦":id==="paes"?"🍞":id==="smart"?"🍟":"🥬")+'</span><span>'+label+'</span></button>').join('')+'</div>'+breadOptions;
 if(breadBlocked)return header+'<div class="bread-cycle-hint">Escolha uma das opções acima para calcular a necessidade dos pães.</div>';
 if(countSubcategory==="paes"){
  const rows=list.map(p=>{const rawFresh=countNeed(p),fresh=rawFresh===null?null:Math.ceil(rawFresh),frozen=fresh===null?null:Math.ceil(fresh*0.10);return '<div class="bread-need-row"><div class="count-product"><strong>'+p.name+'</strong><small>MTC: '+(p.mtc==null?'—':fmt(p.mtc))+'</small></div><div class="bread-need-value"><span>Necessidade pães frescos</span><strong>'+(fresh===null?'<span class="count-missing">Def. embalagem</span>':fmt(fresh))+'</strong></div><div class="bread-need-value frozen"><span>Necessidade pães congelados</span><strong>'+(frozen===null?'<span class="count-missing">—</span>':fmt(frozen))+'</strong><small>10% a mais</small></div></div>'}).join('');
  return header+'<div class="count-summary"><strong>Necessidade de pães</strong><span>'+list.length+' produtos</span></div><div class="bread-need-list"><div class="bread-need-head"><span>Produto</span><span>Pães frescos</span><span>Pães congelados (10%)</span></div>'+rows+'</div><div class="count-actions"><button class="btn primary" id="save-count" type="button">Salvar necessidade dos pães</button></div><div class="count-export-actions"><span id="count-export-hint"></span><div><button class="btn secondary" id="print-count" type="button" disabled>🖨️ Imprimir todos</button><button class="btn secondary" id="pdf-count" type="button" disabled>📄 Salvar em PDF</button><button class="btn secondary" id="share-count" type="button" disabled>↗ Compartilhar</button></div></div>';
 }
 return header+'<div class="count-summary"><strong>'+subcategories.find(x=>x[0]===countSubcategory)[1]+'</strong><span>'+list.length+' produtos</span></div>'+
 '<div class="compact-count-list"><div class="count-list-head"><span>Produto · MTC</span><span>Necessidade</span><span>Estoque</span><span>A receber</span><span>Qtd. pedir</span></div>'+
 list.map(p=>{const needValue=countNeed(p),orderValue=countOrder(p);return '<div class="count-row" data-product-row="'+p.id+'"><div class="count-product"><strong>'+p.name+'</strong><small>MTC: '+(p.mtc==null?'—':fmt(p.mtc))+'</small></div><div class="count-need">'+(needValue===null?'<span class="count-missing">Def. embalagem</span>':fmt(needValue))+'</div><label class="count-field"><span>Estoque</span><input class="number-input compact-number" type="number" inputmode="decimal" min="0" step=".01" aria-label="Estoque contado de '+p.name+'" data-count="'+p.id+'" data-field="stock" value="'+n(stock(p).stock)+'"></label><label class="count-field"><span>A receber</span><input class="number-input compact-number" type="number" inputmode="decimal" min="0" step=".01" aria-label="Quantidade a receber de '+p.name+'" data-count="'+p.id+'" data-field="incoming" value="'+n(stock(p).incoming)+'"></label><div class="count-order">'+(orderValue===null?'<span class="count-missing">—</span>':fmt(orderValue))+'</div></div>'}).join('')+
 '</div><div class="count-actions"><button class="btn secondary" id="clear-count" type="button">Limpar campos</button><button class="btn primary" id="save-count" type="button">Salvar contagem</button></div><div class="count-export-actions"><span id="count-export-hint"></span><div><button class="btn secondary" id="print-count" type="button" disabled>🖨️ Imprimir todos</button><button class="btn secondary" id="pdf-count" type="button" disabled>📄 Salvar em PDF</button><button class="btn secondary" id="share-count" type="button" disabled>↗ Compartilhar</button></div></div>';
}
function otherOrders(){
 const list=products.filter(p=>p.category==="coca_cola").slice().sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 const cocaIcon='<span class="coca-product-icon" aria-hidden="true">🥤</span>';
 return '<div class="page-intro coca-intro"><div><span class="eyebrow">OPERAÇÃO · BEBIDAS</span><h2><span class="coca-heading-icon" aria-hidden="true">🥤</span> Coca-Cola</h2><p>Projeção para 11 dias, estoque disponível e recebimentos.</p></div><span class="pill blue">11 DIAS</span></div>'+
 '<div class="count-summary"><strong>Produtos Coca-Cola</strong><span>'+list.length+' itens</span></div>'+
 '<div class="compact-count-list"><div class="count-list-head"><span>Produto · MTC</span><span>Necessidade</span><span>Estoque</span><span>A receber</span><span>Qtd. pedir</span></div>'+
 list.map(p=>{const needValue=countNeed({...p,packageSize:p.packageSize??1}),orderValue=countOrder({...p,packageSize:p.packageSize??1});return '<div class="count-row" data-product-row="'+p.id+'"><div class="count-product coca-product"><strong>'+cocaIcon+String(p.name||"").toLocaleUpperCase("pt-BR")+'</strong><small>MTC: '+(p.mtc==null?'—':fmt(p.mtc))+'</small></div><div class="count-need">'+(needValue===null?'<span class="count-missing">Conferir MTC</span>':fmt(needValue))+'</div><label class="count-field"><span>Estoque</span><input class="number-input compact-number" type="number" inputmode="decimal" min="0" step=".01" aria-label="Estoque contado de '+p.name+'" data-count="'+p.id+'" data-field="stock" value="'+n(stock(p).stock)+'"></label><label class="count-field"><span>A receber</span><input class="number-input compact-number" type="number" inputmode="decimal" min="0" step=".01" aria-label="Quantidade a receber de '+p.name+'" data-count="'+p.id+'" data-field="incoming" value="'+n(stock(p).incoming)+'"></label><div class="count-order">'+(orderValue===null?'<span class="count-missing">—</span>':fmt(orderValue))+'</div></div>'}).join('')+
 '</div><div class="count-actions"><button class="btn secondary" id="clear-count" type="button">Limpar campos</button><button class="btn primary" id="save-count" type="button">Salvar contagem</button></div>';
}
function analysis(){
 const safe=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\\'/g,"&#39;");
 const categoryOrder=new Map(categories.map((item,index)=>[item[0],index]));
 const list=products.slice().sort((a,b)=>(categoryOrder.get(a.category)??99)-(categoryOrder.get(b.category)??99)||a.name.localeCompare(b.name,"pt-BR"));
 const rows=list.map(p=>{
  const st=stock(p),current=n(st.stock),incoming=n(st.incoming),projected=need(p),delta=current+incoming-projected;
  let status="healthy";
  if(p.mtc==null||!n(p.mtc)||!gcTotal())status="pending";
  else if(projected>0){
   const variance=(current+incoming-projected)/projected*100;
   if(variance<=-3||variance>=20)status="danger";
   else if(variance<=-1||variance>10)status="warning";
  }
  return '<tr class="analysis-row analysis-'+status+'"><td class="analysis-product" data-label="Produto"><span class="analysis-product-name"><i class="analysis-dot '+status+'"></i><strong>'+safe(p.name)+'</strong></span></td><td data-label="Estoque">'+fmt(current)+'</td><td data-label="A receber">'+fmt(incoming)+'</td><td data-label="Projetado (11 dias)">'+fmt(projected)+'</td><td data-label="Saldo"><b class="analysis-balance '+status+'">'+fmt(delta)+'</b></td></tr>';
 }).join("");
 const legend='<div class="analysis-legend"><span><i class="analysis-dot healthy"></i> Saudável</span><span><i class="analysis-dot warning"></i> Atenção</span><span><i class="analysis-dot danger"></i> Crítico</span><span><i class="analysis-dot pending"></i> Pendente</span></div>';
 return '<div class="page-intro"><div><h2>Análise de estoque</h2><p>Todos os produtos cadastrados. Projetado = necessidade dos próximos 11 dias. Saldo = estoque + a receber − projetado.</p></div></div>'+legend+'<div class="table-wrap analysis-table-wrap"><table class="analysis-table"><thead><tr><th>Produto</th><th>Estoque</th><th>A receber</th><th>Projetado (11 dias)</th><th>Saldo</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function orders(){let c=cycles[cycle],list=products.filter(p=>c[2].includes(p.category));return '<div class="page-intro"><div><h2>Pedidos</h2><p>Escolha o ciclo e confira as quantidades sugeridas.</p></div></div><div class="section-tabs">'+Object.entries(cycles).map(([id,x])=>'<button class="category-tab '+(id===cycle?"active":"")+'" data-cycle="'+id+'">'+x[0]+'</button>').join("")+'</div><div class="table-wrap"><table><thead><tr><th>Produto</th><th>MTC</th><th>Necessidade</th><th>Estoque</th><th>A receber</th><th>Sugerido</th></tr></thead><tbody>'+list.map(p=>'<tr><td>'+p.name+'</td><td><button class="mtc-link" data-mtc="'+p.id+'">'+(p.mtc==null?"Definir MTC":fmt(p.mtc)+" ✎")+'</button></td><td>'+fmt(need(p))+'</td><td>'+fmt(stock(p).stock)+'</td><td>'+fmt(stock(p).incoming)+'</td><td><b>'+(p.mtc==null?"—":fmt(qty(p)))+'</b></td></tr>').join("")+'</tbody></table></div><div class="card" style="margin-top:14px"><b>'+c[0]+' · '+c[1]+'</b> <button class="btn primary" id="save-order">Registrar pedido</button></div>'}
function history(){return '<div class="page-intro"><div><h2>Histórico</h2><p>Pedidos e alterações registrados neste dispositivo.</p></div></div>'+(data.orders.length?data.orders.slice().reverse().map(o=>'<section class="card" style="margin-bottom:9px"><b>'+o.category+'</b><p>'+new Date(o.date).toLocaleString("pt-BR")+' · '+o.items+' produtos</p></section>').join(""):'<div class="card empty">Nenhum pedido registrado.</div>')+data.audit.slice(0,30).map(a=>'<section class="audit-row"><b>'+a.action+'</b><small>'+a.detail+' · '+new Date(a.date).toLocaleString("pt-BR")+'</small></section>').join("")}
function countRequiredCategories(){return countGroup==="regular"?["congelados","resfriados","estoque","paes"]:[countGroup==="hortifruti"?"hortifruti":"smart"];}
function countAllSaved(){return countRequiredCategories().every(id=>id==="paes"?(!!breadCycle&&data.countSaved["paes_"+breadCycle]===true):data.countSaved[id]===true);}
function updateCountExportState(){const ready=countAllSaved();["print-count","pdf-count","share-count"].forEach(id=>{const b=$("#"+id);if(b)b.disabled=!ready});const hint=$("#count-export-hint");if(hint)hint.textContent=countGroup==="regular"&&!breadCycle?"Selecione o ciclo dos pães para liberar o fechamento do Pedido Regular.":ready?"Todos os pedidos foram salvos. Você já pode imprimir, gerar PDF ou compartilhar.":"Para liberar a impressão, salve todos os pedidos desta categoria: "+countRequiredCategories().map(id=>({congelados:"Congelados",resfriados:"Resfriados",estoque:"Estoque",paes:"Pães",hortifruti:"Hortifruti",smart:"SMART · Batata e brindes"})[id]).join(", ")+".";
}
function countReportText(){
 const title=countGroup==="regular"?"Pedido Regular":countGroup==="hortifruti"?"Hortifruti":"SMART · Batata e brindes";
 const ids=countRequiredCategories();
 const labels={congelados:"Congelados",resfriados:"Resfriados",estoque:"Estoque",hortifruti:"Hortifruti",smart:"SMART · Batata e brindes"};
 const list=products.filter(p=>ids.includes(p.category));
 const isBread=ids.length===1&&ids[0]==="paes";const lines=list.map(p=>{if(isBread){const rawFresh=countNeed(p),fresh=rawFresh===null?null:Math.ceil(rawFresh);return [p.name,"Necessidade pães frescos: "+(fresh===null?"Pendente":fmt(fresh)),"Pães congelados (10%): "+(fresh===null?"Pendente":fmt(Math.ceil(fresh*0.10)))].join(" | ")}const st=stock(p),ord=countOrder(p);return [p.name,"Estoque: "+fmt(st.stock),"A receber: "+fmt(st.incoming),"Qtd. pedir: "+(ord===null?"Pendente":fmt(ord))].join(" | ")});
 return {title,sub:ids.map(id=>labels[id]).join(" + "),list,lines,generated:new Date().toLocaleString("pt-BR")};
}
function exportCount(mode){
 if(!countAllSaved()){toast("Salve todos os pedidos antes de continuar.");updateCountExportState();return}
 const report=countReportText();
 const hasBread=report.list.some(p=>p.category==="paes");const rows=report.list.map(p=>{if(p.category==="paes"){const rawFresh=countNeed(p),fresh=rawFresh===null?null:Math.ceil(rawFresh);return '<tr><td>'+p.name+'</td><td>'+(fresh===null?"Pendente":fmt(fresh))+'</td><td>'+(fresh===null?"Pendente":fmt(Math.ceil(fresh*0.10)))+'</td><td>—</td><td>—</td><td>—</td></tr>'}const st=stock(p),ord=countOrder(p);return '<tr><td>'+p.name+'</td><td>—</td><td>—</td><td>'+fmt(st.stock)+'</td><td>'+fmt(st.incoming)+'</td><td>'+(ord===null?"Pendente":fmt(ord))+'</td></tr>'}).join("");
 const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+report.title+' - '+report.sub+'</title><style>*{box-sizing:border-box}body{font:15px Inter,Arial,sans-serif;color:#182230;background:#f3f5f9;margin:0;padding:24px}.toolbar{max-width:1100px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;gap:12px}.toolbar button{border:1px solid #dce2eb;background:#fff;border-radius:12px;padding:11px 16px;font-weight:800;color:#27364c;cursor:pointer;box-shadow:0 3px 12px #17243b0b}.toolbar .primary{background:#c92332;color:#fff;border-color:#c92332}.sheet{max-width:1100px;margin:auto;background:#fff;border:1px solid #e7ebf1;border-radius:22px;padding:30px;box-shadow:0 14px 40px #17243b12}.brand{display:flex;align-items:center;gap:12px;margin-bottom:22px}.brand-icon{width:48px;height:48px;border-radius:15px;background:#fff0f1;display:grid;place-items:center;font-size:25px}.eyebrow{font-size:11px;letter-spacing:1.5px;font-weight:900;color:#c92332}.brand h1{font-size:25px;margin:4px 0 0;font-weight:900}.meta{display:flex;flex-wrap:wrap;gap:9px;margin:0 0 22px}.chip{padding:9px 13px;border-radius:999px;background:#f3f5f8;color:#46536a;font-size:12px;font-weight:800}.table-card{border:1px solid #e5e9f0;border-radius:16px;overflow:hidden}table{width:100%;border-collapse:collapse}th{background:#f5f7fa;color:#344256;font-size:11px;text-transform:uppercase;letter-spacing:.6px}th,td{padding:13px 12px;text-align:left;border-bottom:1px solid #edf0f4}td{font-size:13px;font-weight:650}tbody tr:last-child td{border-bottom:0}tbody tr:nth-child(even){background:#fbfcfe}footer{margin-top:22px;color:#778195;font-size:11px}.actions{display:flex;gap:9px;flex-wrap:wrap}@media(max-width:650px){body{padding:10px}.sheet{padding:17px;border-radius:17px}.brand h1{font-size:20px}.table-card{overflow-x:auto}table{min-width:520px}}@media print{body{background:#fff;padding:0}.toolbar{display:none}.sheet{border:0;box-shadow:none;border-radius:0;padding:0;max-width:none}.table-card{border-radius:10px}th,td{padding:8px}}</style></head><body><nav class="toolbar"><button type="button" onclick="window.close();setTimeout(()=>{if(!window.closed)history.back()},120)">✕ Fechar / Voltar</button><div class="actions"><button type="button" onclick="window.print()">Imprimir</button><button class="primary" type="button" onclick="window.print()">Salvar em PDF</button></div></nav><main class="sheet"><div class="brand"><div class="brand-icon">📦</div><div><div class="eyebrow">PEDIDO IPM 1.0 · RELATÓRIO</div><h1>'+report.title+'</h1></div></div><div class="meta"><span class="chip">Categoria: '+report.sub+'</span><span class="chip">Gerado em: '+report.generated+'</span><span class="chip">'+report.list.length+' produtos</span></div><div class="table-card"><table><thead><tr><th>Produto</th>'+(hasBread?'<th>Necessidade pães frescos</th><th>Necessidade pães congelados (10%)</th><th>Estoque</th><th>A receber</th><th>Qtd. pedir</th>':'<th>Estoque</th><th>A receber</th><th>Qtd. pedir</th>')+'</tr></thead><tbody>'+rows+'</tbody></table></div><footer>Documento gerado pelo Pedido IPM 1.0.</footer></main></body></html>';
 const w=window.open("","_blank");if(!w){toast("Permita pop-ups para imprimir ou salvar em PDF.");return}w.document.open();w.document.write(html);w.document.close();
}
function applyPermissions(){
 const readOnly=(isSupervisor()&&page!=="profile")||(isGp()&&page==="products");
 if(!readOnly)return;
 document.querySelectorAll("#content input,#content select,#content textarea,#content button").forEach(el=>{
  if(el.matches("[data-page],[data-cat],[data-cycle],[data-count-category],#count-group,#other-category,#print-count,#pdf-count,#share-count"))return;
  el.disabled=true;
 });
 document.querySelectorAll("#content #save-gc,#content #save-count,#content #save-order,#content #new-product-form button").forEach(el=>el.hidden=true);
 const createProduct=document.querySelector("#new-product-form")?.closest(".product-create-card");
 if(createProduct&&isGp())createProduct.hidden=true;
}
function toast(m){let t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function wire(){$("#new-product-form")?.addEventListener("submit",e=>{e.preventDefault();if(!isGun())return;const f=new FormData(e.currentTarget),name=String(f.get("name")||"").trim();if(!name)return;const id="prod-"+Date.now();products.push({id,name:name.toUpperCase(),category:String(f.get("category")),mtc:f.get("mtc")===""?null:n(f.get("mtc")),unit:String(f.get("unit")||"un").trim(),packageSize:f.get("packageSize")===""?null:n(f.get("packageSize"))});localStorage.setItem("pedidos-ipm-products",JSON.stringify(products));audit("Produto cadastrado",name);save();toast("Produto adicionado ao catálogo deste aparelho.");render()});document.querySelectorAll("[data-product-form]").forEach(form=>form.addEventListener("submit",e=>{e.preventDefault();if(!isGun())return;const p=products.find(x=>x.id===form.dataset.productForm);if(!p)return;const f=new FormData(form),old={mtc:p.mtc,category:p.category,unit:p.unit,packageSize:p.packageSize};p.mtc=f.get("mtc")===""?null:n(f.get("mtc"));p.category=String(f.get("category"));p.unit=String(f.get("unit")||"un").trim();p.packageSize=f.get("packageSize")===""?null:n(f.get("packageSize"));localStorage.setItem("pedidos-ipm-products",JSON.stringify(products));audit("Produto atualizado",p.name+" · MTC "+old.mtc+" → "+p.mtc+" · categoria "+old.category+" → "+p.category);save();toast("Produto atualizado.");render() }));const filterProducts=()=>{const q=($("#product-search")?.value||"").trim().toLocaleLowerCase("pt-BR"),cat=$("#product-category-filter")?.value||"all";document.querySelectorAll(".product-edit-row").forEach(row=>{const text=row.textContent.toLocaleLowerCase("pt-BR"),category=row.querySelector('select[name="category"]')?.value||"";row.hidden=!(text.includes(q)&&(cat==="all"||category===cat))})};$("#product-search")?.addEventListener("input",filterProducts);$("#product-category-filter")?.addEventListener("change",filterProducts);document.querySelectorAll("[data-admin-module]").forEach(b=>b.onclick=()=>{page="admin_"+b.dataset.adminModule;closeMenu();render()});document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{const next=b.dataset.page;if(page==="count"&&next!=="count"&&countDirtyCategories.size&&!confirm("Tem certeza que deseja sair de Pedidos 1.0?\n\nVocê fez alterações na contagem que ainda não foram salvas como pedido. Se sair agora, poderá perder essa contagem.\n\nDeseja sair mesmo assim?"))return;page=next;closeMenu();render()});document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{cat=b.dataset.cat;render()});$("#count-group")?.addEventListener("change",e=>{countGroup=e.target.value;countSubcategory=countGroup==="regular"?"congelados":countGroup==="hortifruti"?"hortifruti":"smart";render()});document.querySelectorAll("[data-count-category]").forEach(b=>b.onclick=()=>{countSubcategory=b.dataset.countCategory;render()});document.querySelectorAll("[data-bread-cycle]").forEach(b=>b.onclick=()=>{const next=b.dataset.breadCycle;if(breadCycle===next)return;if(countDirtyCategories.has("paes")&&!confirm("Você alterou a contagem atual dos pães. Deseja trocar de ciclo e descartar essas alterações não salvas?"))return;countDirtyCategories.delete("paes");breadCycle=next;render()});$("#other-category")?.addEventListener("change",e=>{otherCat=e.target.value;render()});document.querySelectorAll("[data-cycle]").forEach(b=>b.onclick=()=>{cycle=b.dataset.cycle;render()});$("#gc-percent")?.addEventListener("input",e=>{data.gcPercent=n(e.target.value);document.querySelectorAll("[data-gc-adjusted]").forEach(el=>{const d=days.find(x=>dateKey(x)===el.dataset.gcAdjusted);if(d)el.textContent=fmt(adjustedGc(d))});const total=$("#gc-total-value");if(total)total.textContent=fmt(gcTotal())});document.querySelectorAll("[data-gc]").forEach(i=>i.addEventListener("input",()=>{const el=document.querySelector('[data-gc-adjusted="'+i.dataset.gc+'"]');if(el){const d=days.find(x=>dateKey(x)===i.dataset.gc);if(d)el.textContent=fmt(adjustedGc(d))}const total=$("#gc-total-value");if(total)total.textContent=fmt(gcTotal())}));$("#save-gc")?.addEventListener("click",()=>{data.gcPercent=n($("#gc-percent")?.value);document.querySelectorAll("[data-gc]").forEach(i=>data.gc[i.dataset.gc]=n(i.value));audit("Projeção GC salva","Próximos 11 dias, a partir de amanhã · ajuste de venda "+data.gcPercent+"%");save();toast("Projeção salva.");render()});$("#clear-count")?.addEventListener("click",()=>{document.querySelectorAll("[data-count]").forEach(i=>i.value="0");data.countSaved[countSubcategory==="paes"?"paes_"+breadCycle:countSubcategory]=false;countDirtyCategories.add(countSubcategory);save();updateCountExportState()});document.querySelectorAll("[data-count]").forEach(i=>i.addEventListener("input",()=>{data.countSaved[countSubcategory==="paes"?"paes_"+breadCycle:countSubcategory]=false;countDirtyCategories.add(countSubcategory);save();updateCountExportState()}));$("#print-count")?.addEventListener("click",()=>exportCount("print"));$("#pdf-count")?.addEventListener("click",()=>exportCount("pdf"));$("#share-count")?.addEventListener("click",async()=>{if(!countAllSaved()){toast("Salve todos os pedidos antes de compartilhar.");return}const r=countReportText(),textShare="Pedido IPM 1.0 · "+r.title+"\nCategoria: "+r.sub+"\n"+r.lines.join("\n");try{if(navigator.share)await navigator.share({title:"Pedido IPM 1.0 · "+r.title,text:textShare});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(textShare);toast("Resumo copiado para compartilhar.")}else toast("Compartilhamento não disponível neste navegador.")}catch(e){if(e.name!=="AbortError")toast("Não foi possível compartilhar.")}});$("#save-count")?.addEventListener("click",()=>{if(countSubcategory!=="paes")document.querySelectorAll("[data-count]").forEach(i=>{data.counts[i.dataset.count]??={stock:0,incoming:0};data.counts[i.dataset.count][i.dataset.field]=n(i.value)});data.countSaved[countSubcategory==="paes"?"paes_"+breadCycle:countSubcategory]=true;countDirtyCategories.delete(countSubcategory);audit(countSubcategory==="paes"?"Necessidade dos pães salva":"Contagem salva",countSubcategory==="paes"?"Pães frescos e congelados (+10%)":countSubcategory);save();toast(countSubcategory==="paes"?"Necessidade dos pães salva.":"Pedido salvo: "+countSubcategory+".");render()});$("#save-order")?.addEventListener("click",()=>{let c=cycles[cycle],list=products.filter(p=>c[2].includes(p.category));data.orders.push({category:c[0],cycle:c[1],date:new Date().toISOString(),items:list.length});audit("Pedido registrado",c[0]);save();toast("Pedido registrado.");render()});document.querySelectorAll("[data-mtc]").forEach(b=>b.onclick=()=>{if(!isGun()){toast("Somente o GUN pode alterar o MTC.");return}let p=products.find(x=>x.id===b.dataset.mtc);if(!confirm("Tem certeza que deseja editar o MTC de "+p.name+"? Essa alteração modifica os cálculos."))return;let raw=prompt("Informe o novo MTC:",p.mtc??"");if(raw===null)return;let v=Number(raw.replace(",","."));if(!Number.isFinite(v)||v<0){toast("MTC inválido.");return}let old=p.mtc;p.mtc=v;audit("MTC alterado",p.name+": "+old+" → "+v);save();toast("MTC atualizado.");render()})}
function mergeProducts(base,saved){if(!Array.isArray(saved))return base;const byId=new Map(saved.filter(x=>x.id!=="hortifruti-3").map(x=>[x.id,x]));return base.map(item=>{const old=byId.get(item.id);if(!old)return item;byId.delete(item.id);return {...item,...old,name:item.id==="smart-3"?"BRINQUEDOS":old.name,packageSize:old.packageSize??item.packageSize}}).concat([...byId.values()].filter(x=>x.id!=="hortifruti-3"))}
async function startApp(){
 try{
  const response=await fetch("./products.json?refresh="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw new Error("Catálogo indisponível (HTTP "+response.status+").");
  const base=await response.json();
  if(!Array.isArray(base))throw new Error("O arquivo products.json não retornou uma lista de produtos válida.");
  const readLocal=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(error){console.warn("Dados locais inválidos em "+key+"; usando cópia da nuvem.",error);return fallback}};
  const localData=readLocal("pedidos-ipm",{gc:{},counts:{},orders:[],audit:[]});
  const localProducts=readLocal("pedidos-ipm-products",null);
  products=mergeProducts(base,localProducts);
  const rows=await cloudRequest("app_state?select=payload,updated_at&id=eq.restaurante-ipm");
  if(rows&&rows.length&&rows[0].payload){
   const remote=rows[0].payload;
   data={...{gc:{},counts:{},orders:[],audit:[],countSaved:{}},...(remote.data&&typeof remote.data==="object"?remote.data:{})};
   data.audit??=[];data.orders??=[];data.gc??={};data.counts??={};data.countSaved??={};
   products=mergeProducts(base,remote.products);
   cloudUpdatedAt=rows[0].updated_at;
   localStorage.setItem("pedidos-ipm",JSON.stringify(data));
   localStorage.setItem("pedidos-ipm-products",JSON.stringify(products));
  }else{
   data={...{gc:{},counts:{},orders:[],audit:[],countSaved:{}},...(localData||{})};
   data.audit??=[];data.orders??=[];data.gc??={};data.counts??={};data.countSaved??={};
   localStorage.setItem("pedidos-ipm",JSON.stringify(data));
   localStorage.setItem("pedidos-ipm-products",JSON.stringify(products));
   cloudReady=true;await writeCloudState();cloudUpdatedAt=new Date().toISOString();
  }
  cloudReady=true;render();window.dispatchEvent(new CustomEvent("ipm:cloud-ready"));
 }catch(error){
  console.error("Falha ao iniciar Pedido IPM:",error);cloudReady=false;
  const message=String(error?.message||"Falha inesperada ao carregar o aplicativo.").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  document.querySelector("#content").innerHTML='<div class="card app-start-error"><div class="app-start-error-icon">!</div><h3>Não foi possível carregar os dados</h3><p>Os dados já salvos na nuvem e neste aparelho foram preservados. Confira o detalhe abaixo e tente novamente.</p><code>'+message+'</code><button id="retry-app-start" class="btn primary" type="button">Tentar novamente</button></div>';
  document.querySelector("#retry-app-start")?.addEventListener("click",()=>{const b=document.querySelector("#retry-app-start");if(b){b.disabled=true;b.textContent="Conectando..."}startApp()});
 }
}
function openMenu(){menuOpen=true;$("#app-sidebar").classList.add("is-open");$("#mobile-backdrop").hidden=false;document.body.classList.add("menu-open");$("#menu-toggle").setAttribute("aria-expanded","true");$("#menu-toggle").setAttribute("aria-label","Fechar menu");}
function closeMenu(){menuOpen=false;$("#app-sidebar").classList.remove("is-open");$("#mobile-backdrop").hidden=true;document.body.classList.remove("menu-open");$("#menu-toggle").setAttribute("aria-expanded","false");$("#menu-toggle").setAttribute("aria-label","Abrir menu");}
$("#menu-toggle").addEventListener("click",()=>menuOpen?closeMenu():openMenu());
$("#mobile-backdrop").addEventListener("click",closeMenu);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&menuOpen)closeMenu()});
window.addEventListener("beforeunload",e=>{if(page==="count"&&countDirtyCategories.size){e.preventDefault();e.returnValue="Você tem alterações na contagem que ainda não foram salvas."}});
window.addEventListener("resize",()=>{if(window.innerWidth>700&&menuOpen)closeMenu()});
document.addEventListener("ipm:authenticated",startApp);
window.addEventListener("focus",pullCloudState);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pullCloudState()});
setInterval(pullCloudState,20000);
if(window.IPM_AUTH?.session?.access_token) startApp();
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js");
let deferred;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#install-btn").hidden=false});$("#install-btn").onclick=async()=>{if(deferred){deferred.prompt();deferred=null}};
