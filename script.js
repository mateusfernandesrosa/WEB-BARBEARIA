// ========================================
// ============ CONFIGURAÇÕES =============
// ========================================
// ================== CONFIG ===================
const SERVICOS = [
  { id: "corte", nome: "Corte", duracaoMin: 30, preco: 35, profs: ["MATEUS"] },
  { id: "barba", nome: "Barba", duracaoMin: 30, preco: 35, profs: ["MATEUS"] },
  { id: "corte_barba", nome: "Corte + Barba", duracaoMin: 60, preco: 65, profs: ["MATEUS"] },
  { id: "acabamento", nome: "Acabamento", duracaoMin: 30, preco: 15, profs: ["MATEUS"] },
];

const HORARIO = { inicio: 9, fim: 22, stepMin: 30 };
const LS_KEY = "boava_agendamentos_v4";
const AUTH_KEY = "boava_admin_session_v4";
const ADMIN = { user: "admin", pass: "1234" };

// ================== HELPERS ==================
const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const fmt = (dataISO, hora) => {
  try {
    const [yy, mm, dd] = dataISO.split("-").map(Number);
    const [H, M] = hora.split(":").map(Number);
    const dt = new Date(yy, mm-1, dd, H, M);
    return {
      dt,
      dataBR: dt.toLocaleDateString("pt-BR",{weekday:"short", day:"2-digit", month:"2-digit", year:"numeric"}),
      horaBR: dt.toLocaleTimeString("pt-BR",{hour:"2-digit", minute:"2-digit"})
    };
  } catch { return { dt:null, dataBR:dataISO, horaBR:hora }; }
};

const stepOk = hora => {
  const [_,M] = hora.split(":").map(Number);
  return M % HORARIO.stepMin === 0;
};

const dentroExpediente = hora => {
  const [H] = hora.split(":").map(Number);
  return stepOk(hora) && H >= HORARIO.inicio && H <= HORARIO.fim;
};

const storage = {
  load(){ try{ return JSON.parse(localStorage.getItem(LS_KEY))||[] }catch{ return [] } },
  save(list){ localStorage.setItem(LS_KEY, JSON.stringify(list)) }
};

const auth = {
  get isAdmin(){ return sessionStorage.getItem(AUTH_KEY)==="1"; },
  login(u,p){ const ok = u===ADMIN.user && p===ADMIN.pass; if(ok) sessionStorage.setItem(AUTH_KEY,"1"); return ok; },
  logout(){ sessionStorage.removeItem(AUTH_KEY); }
};

const uuid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random().toString(36).slice(2);

// ================== TOAST ==================
function toast(msg, type="info"){
  let box = $("#toastBox");
  if(!box){
    box = document.createElement("div");
    box.id = "toastBox";
    box.style.cssText = `
      position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
      display:flex; flex-direction:column; gap:8px; z-index:1000;
    `;
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `
    background:${type==="error"?"#dc2626":"#3a6bff"};
    color:white; padding:10px 16px; border-radius:8px;
    box-shadow:0 4px 10px rgba(0,0,0,.4); animation:fadein .3s ease;
  `;
  box.appendChild(t);
  setTimeout(()=>{ t.style.opacity="0"; t.style.transition="opacity .4s"; setTimeout(()=>t.remove(),400); },3000);
}

// ================== RENDER SERVIÇOS ==================
function renderServicos(){
  const wrap = $("#listaServicos");
  if (!wrap) return;
  wrap.innerHTML = "";
  SERVICOS.forEach(sv=>{
    const art = document.createElement("article");
    art.className = "servico";
    art.innerHTML = `
      <h4>${sv.nome}</h4>
      <div class="meta">Duração: ${sv.duracaoMin} min</div>
      <div class="price">R$ ${sv.preco.toFixed(2).replace(".",",")}</div>
      <div class="profs">${sv.profs.map(p=>`<span class="chip">${p}</span>`).join("")}</div>
      <div class="actions"><button class="btn" data-id="${sv.id}">Selecionar</button></div>
    `;
    wrap.appendChild(art);
  });

  wrap.addEventListener("click", e=>{
    const btn = e.target.closest("button[data-id]");
    if(!btn) return;
    const sv = SERVICOS.find(s=>s.id===btn.dataset.id);
    if(!sv) return;
    $("#servico").value = sv.id;
    popularProfissionais();
    $("#profissional").value = sv.profs[0]||"";
    location.hash = "#agendar";
    $("#nome").focus();
  });
}

// ================== SELECTS ==================
function popularServicos(){
  const sel = $("#servico");
  if(!sel) return;
  sel.innerHTML = `<option value="">Selecione…</option>` + SERVICOS.map(s=>`<option value="${s.id}">${s.nome}</option>`).join("");
}

function popularProfissionais(){
  const sv = SERVICOS.find(s=>s.id===$("#servico").value);
  const sel = $("#profissional");
  if(!sel) return;
  sel.innerHTML = `<option value="">Selecione…</option>` + (sv? sv.profs.map(p=>`<option>${p}</option>`).join("") : "");
}

// ================== REGRAS ==================
function conflitoMesmoHorario(lista, {profissional,data,hora}, ignorarId=null){
  return lista.some(a=>a.id!==ignorarId && a.profissional===profissional && a.data===data && a.hora===hora && a.status!=="recusado");
}

function clienteJaTemAtivo(lista, {nome,telefone}){
  const agora = Date.now();
  const igualCliente = a => telefone ? a.telefone===telefone : a.nome.toLowerCase()===nome.toLowerCase();
  return lista.some(a=>{
    if(!igualCliente(a)) return false;
    if(!["pendente","aprovado"].includes(a.status)) return false;
    const {dt} = fmt(a.data,a.hora);
    return dt && dt.getTime() >= agora;
  });
}

// ================== LISTA AGENDAMENTOS ==================
const statusCss = s => ({pendente:"status-pendente",aprovado:"status-aprovado",recusado:"status-recusado"}[s]||"");

function renderLista(){
  const lista = storage.load();
  const fStatus = $("#filtroStatus")?.value.trim();
  const fProf = $("#filtroProf")?.value.trim();
  const fData = $("#filtroData")?.value.trim();

  const filtrados = lista
    .filter(a => fStatus? a.status===fStatus : true)
    .filter(a => fProf? a.profissional===fProf : true)
    .filter(a => fData? a.data===fData : true)
    .sort((a,b)=>{
      const da = new Date(`${a.data}T${a.hora}`);
      const db = new Date(`${b.data}T${b.hora}`);
      if(da-db!==0) return da-db;
      return (a.criadoEm||"").localeCompare(b.criadoEm||"");
    });

  const cont = $("#listaAgendamentos");
  if(!cont) return;
  cont.innerHTML = "";
  $("#vazio").style.display = filtrados.length?"none":"block";
  const tpl = $("#tpl-agendamento");
  if(!tpl) return;

  filtrados.forEach(a=>{
    const node = tpl.content.cloneNode(true);
    $(".item-titulo", node).textContent = `${a.nome} — ${SERVICOS.find(s=>s.id===a.servico)?.nome||a.servico}`;
    const {dataBR,horaBR} = fmt(a.data,a.hora);
    $(".item-meta", node).textContent = `${a.profissional} • ${dataBR} às ${horaBR} • ${a.telefone}`;
    $(".item-obs", node).textContent = a.obs? `Obs: ${a.obs}`:"";
    const badge = $(".status-badge", node);
    badge.textContent = a.status.toUpperCase();
    badge.classList.add(statusCss(a.status));

    const btnA = $(".btn-aprovar", node);
    const btnR = $(".btn-recusar", node);
    const btnE = $(".btn-excluir", node);

    if(auth.isAdmin){
      if(a.status==="pendente"){
        btnA.style.display = "inline-block";
        btnR.style.display = "inline-block";
      } else {
        btnA.style.display = "none";
        btnR.style.display = "none";
      }
    } else {
      btnA.style.display = "none";
      btnR.style.display = "none";
    }

    btnA?.addEventListener("click", ()=> aprovar(a.id));
    btnR?.addEventListener("click", ()=> recusar(a.id));
    btnE?.addEventListener("click", ()=> excluir(a.id));

    cont.appendChild(node);
  });

  const profSel = $("#filtroProf");
  if(profSel){
    const allProfs = [...new Set(SERVICOS.flatMap(s=>s.profs))];
    profSel.innerHTML = `<option value="">Todos os profissionais</option>` + allProfs.map(p=>`<option>${p}</option>`).join("");
  }
}

// ================== AÇÕES ADMIN ==================
function aprovar(id){
  if(!auth.isAdmin){ toast("Ação restrita ao admin.","error"); return; }
  const lista = storage.load();
  const i = lista.findIndex(a=>a.id===id);
  if(i<0) return;
  if(conflitoMesmoHorario(lista.filter(a=>a.id!==id), lista[i])){
    toast("Conflito de horário com outro agendamento.","error"); return;
  }
  lista[i].status = "aprovado"; storage.save(lista); renderLista();
  toast(`Agendamento de ${lista[i].nome} aprovado.`,"info");
}

function recusar(id){
  if(!auth.isAdmin){ toast("Ação restrita ao admin.","error"); return; }
  const lista = storage.load();
  const i = lista.findIndex(a=>a.id===id);
  if(i<0) return;
  if(!confirm(`Deseja realmente cancelar o agendamento de "${lista[i].nome}"?`)) return;
  lista[i].status = "recusado"; storage.save(lista); renderLista();
  toast(`Agendamento de ${lista[i].nome} cancelado.`,"info");
}

function excluir(id){
  const lista = storage.load(); 
  const ag = lista.find(a=>a.id===id); 
  if(!ag) return;
  if(!confirm(`Excluir agendamento de "${ag.nome}"?`)) return;
  storage.save(lista.filter(a=>a.id!==id)); renderLista();
  toast("Agendamento excluído.","info");
}

// ================== FORMULÁRIO ==================
function initForm(){
  $("#data").min = hojeISO();
  popularServicos(); popularProfissionais();

  $("#servico")?.addEventListener("change", popularProfissionais);

  $("#form-agenda")?.addEventListener("submit", e=>{
    e.preventDefault();
    const nome = $("#nome").value.trim();
    const telefone = $("#telefone").value.trim();
    const servico = $("#servico").value;
    const profissional = $("#profissional").value;
    const data = $("#data").value;
    const hora = $("#hora").value;
    const obs = $("#obs").value.trim();

    if(!nome||!telefone||!servico||!profissional||!data||!hora){ toast("Preencha todos os campos obrigatórios.","error"); return; }
    if(!/^\d{9,11}$/.test(telefone)){ toast("Digite um telefone válido (somente números).","error"); return; }
    if(!dentroExpediente(hora)){ toast("Escolha um horário válido dentro do expediente.","error"); return; }
    const {dt} = fmt(data,hora);
    if(!dt||dt.getTime()<Date.now()){ toast("Não é possível agendar no passado.","error"); return; }

    const lista = storage.load();
    if(clienteJaTemAtivo(lista,{nome,telefone})){ toast("Você já possui agendamento ativo.","error"); return; }
    if(conflitoMesmoHorario(lista,{profissional,data,hora})){ toast(`${profissional} já possui agendamento nesse horário.`,"error"); return; }

    const novo = { id:uuid(), nome, telefone, servico, profissional, data, hora, obs, status:"pendente", criadoEm:new Date().toISOString() };
    lista.push(novo); storage.save(lista);
    $("#form-agenda").reset(); $("#data").min = hojeISO(); renderLista();
    toast("Agendamento criado! Aguarde aprovação.","info");
  });

  $("#filtroStatus")?.addEventListener("change", renderLista);
  $("#filtroProf")?.addEventListener("change", renderLista);
  $("#filtroData")?.addEventListener("change", renderLista);
  $("#btnLimparFiltros")?.addEventListener("click", ()=>{
    $("#filtroStatus").value=""; $("#filtroProf").value=""; $("#filtroData").value=""; renderLista();
  });
}

// ================== ADMIN MODAL ==================
function initAdmin(){
  const modal = $("#modalAdmin");
  $("#btnAbrirAdmin")?.addEventListener("click", ()=> modal.showModal());
  $("#btnFecharAdmin")?.addEventListener("click", ()=> modal.close());
  $("#btnLogin")?.addEventListener("click", e=>{
    e.preventDefault();
    const u = $("#adminUser").value.trim();
    const p = $("#adminPass").value.trim();
    if(auth.login(u,p)){ modal.close(); renderLista(); toast("Admin autenticado.","info"); }
    else toast("Credenciais inválidas.","error");
  });
  $("#btnLogout")?.addEventListener("click", ()=>{
    auth.logout(); renderLista(); toast("Sessão encerrada.","info");
  });
  modal?.addEventListener("click", e=> { if(e.target===modal) modal.close(); });
}

// ================== BOOT ==================
document.addEventListener("DOMContentLoaded", ()=>{
  renderServicos();
  initForm();
  initAdmin();
  renderLista();
});
