// ========================================
// ============ CONFIGURAÇÕES =============
// ========================================
const SERVICOS = [
  { id: "corte", nome: "Corte", duracaoMin: 30, preco: 35, profs: ["MATEUS"] },
  { id: "barba", nome: "Barba", duracaoMin: 30, preco: 35, profs: ["MATEUS"] },
  { id: "corte_barba", nome: "Corte + Barba", duracaoMin: 60, preco: 65, profs: ["MATEUS"] },
  { id: "acabamento", nome: "Acabamento", duracaoMin: 30, preco: 15, profs: ["MATEUS"] },
];

const HORARIO = { inicio: 9, fim: 22, stepMin: 30 };
const LS_KEY = "boava_agendamentos_v3";
const AUTH_KEY = "boava_admin_session_v3";
const ADMIN = { user: "admin", pass: "1234" };

// ========================================
// ============ HELPERS ===================
// ========================================
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

// ========================================
// ============ RENDER SERVIÇOS =========
// ========================================
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

// ========================================
// ============ SELECTS ===================
// ========================================
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

// ========================================
// ============ REGRAS ===================
// ========================================
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

// ========================================
// ============ LISTA AGENDAMENTOS =======
// ========================================
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
    .sort((a,b)=> new Date(`${a.data}T${a.hora}`)-new Date(`${b.data}T${b.hora}`));

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

    // Só mostra botões aprovar/recusar se for admin e status pendente
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

  // Popular filtro de profissionais
  const profSel = $("#filtroProf");
  if(profSel){
    const allProfs = [...new Set(SERVICOS.flatMap(s=>s.profs))];
    profSel.innerHTML = `<option value="">Todos os profissionais</option>` + allProfs.map(p=>`<option>${p}</option>`).join("");
  }
}

// ========================================
// ============ AÇÕES ADMIN ===============
// ========================================
function aprovar(id){
  if(!auth.isAdmin){ alert("Ação restrita ao admin."); return; }
  const lista = storage.load();
  const i = lista.findIndex(a=>a.id===id);
  if(i<0) return;
  if(conflitoMesmoHorario(lista.filter(a=>a.id!==id), lista[i])){
    alert("Conflito de horário com outro agendamento."); return;
  }
  lista[i].status = "aprovado"; storage.save(lista); renderLista();
  alert(`Agendamento de ${lista[i].nome} aprovado.`);
}

function recusar(id){
  if(!auth.isAdmin){ alert("Ação restrita ao admin."); return; }
  const lista = storage.load();
  const i = lista.findIndex(a=>a.id===id);
  if(i<0) return;
  if(!confirm(`Deseja realmente cancelar o agendamento de "${lista[i].nome}"?`)) return;
  lista[i].status = "recusado"; storage.save(lista); renderLista();
  alert(`Agendamento de ${lista[i].nome} cancelado.`);
}

function excluir(id){
  const lista = storage.load(); 
  const ag = lista.find(a=>a.id===id); 
  if(!ag) return;
  if(!confirm(`Excluir agendamento de "${ag.nome}"?`)) return;
  storage.save(lista.filter(a=>a.id!==id)); renderLista();
}

// ========================================
// ============ FORMULÁRIO ================
// ========================================
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

    if(!nome||!telefone||!servico||!profissional||!data||!hora){ alert("Preencha todos os campos obrigatórios."); return; }
    if(!dentroExpediente(hora)){ alert("Escolha um horário válido dentro do expediente."); return; }
    const {dt} = fmt(data,hora);
    if(!dt||dt.getTime()<Date.now()){ alert("Não é possível agendar no passado."); return; }

    const lista = storage.load();
    if(clienteJaTemAtivo(lista,{nome,telefone})){ alert("Você já possui agendamento ativo."); return; }
    if(conflitoMesmoHorario(lista,{profissional,data,hora})){ alert(`${profissional} já possui agendamento nesse horário.`); return; }

    const novo = { id:uuid(), nome, telefone, servico, profissional, data, hora, obs, status:"pendente", criadoEm:new Date().toISOString() };
    lista.push(novo); storage.save(lista);
    $("#form-agenda").reset(); $("#data").min = hojeISO(); renderLista();
    alert("Agendamento criado! Aguarde aprovação.");
  });

  $("#filtroStatus")?.addEventListener("change", renderLista);
  $("#filtroProf")?.addEventListener("change", renderLista);
  $("#filtroData")?.addEventListener("change", renderLista);
  $("#btnLimparFiltros")?.addEventListener("click", ()=>{
    $("#filtroStatus").value=""; $("#filtroProf").value=""; $("#filtroData").value=""; renderLista();
  });
}

// ========================================
// ============ ADMIN MODAL ===============
// ========================================
function initAdmin(){
  const modal = $("#modalAdmin");
  $("#btnAbrirAdmin")?.addEventListener("click", ()=> modal.showModal());
  $("#btnFecharAdmin")?.addEventListener("click", ()=> modal.close());
  $("#btnLogin")?.addEventListener("click", e=>{
    e.preventDefault();
    const u = $("#adminUser").value.trim();
    const p = $("#adminPass").value.trim();
    if(auth.login(u,p)){ modal.close(); renderLista(); alert("Admin autenticado."); }
    else alert("Credenciais inválidas.");
  });
  modal?.addEventListener("click", e=> { if(e.target===modal) modal.close(); });
}

// ========================================
// ============ BOOT ======================
// ========================================
document.addEventListener("DOMContentLoaded", ()=>{
  renderServicos();
  initForm();
  initAdmin();
  renderLista();
});
