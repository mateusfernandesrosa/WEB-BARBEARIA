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
const LS_KEY = "boava_agendamentos_v4";
const AUTH_KEY = "boava_admin_session_v4";
const ADMIN = { user: "admin", pass: "1234" };

// ========================================
// ============ HELPERS ===================
// ========================================
const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];

function hojeISO() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
}

// ========================================
// ============ STORAGE ===================
// ========================================
const storage = {
  load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } 
    catch { return []; }
  },
  save(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }
};

// ========================================
// ============ AUTH ======================
// ========================================
const auth = {
  get isAdmin() { return sessionStorage.getItem(AUTH_KEY) === "1"; },
  login(u, p) {
    const ok = u === ADMIN.user && p === ADMIN.pass;
    if(ok) sessionStorage.setItem(AUTH_KEY,"1");
    return ok;
  },
  logout() { sessionStorage.removeItem(AUTH_KEY); }
};

// ========================================
// ============ TOAST =====================
// ========================================
function toast(msg, type="info") {
  let box = $("#toastBox");
  if(!box){
    box = document.createElement("div");
    box.id="toastBox";
    box.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; gap:8px; z-index:1000";
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `background:${type==="error"?"#dc2626":"#3a6bff"}; color:white; padding:10px 16px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,.4)`;
  box.appendChild(t);
  setTimeout(()=>{ t.style.opacity="0"; t.style.transition="opacity .4s"; setTimeout(()=>t.remove(),400); },3000);
}

// ========================================
// ============ RENDER SERVIÇOS ==========
// ========================================
function renderServicos() {
  const wrap = $("#listaServicos");
  if(!wrap) return;
  wrap.innerHTML = "";

  SERVICOS.forEach(sv => {
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

  wrap.addEventListener("click", e => {
    const btn = e.target.closest("button[data-id]");
    if(!btn) return;
    const sv = SERVICOS.find(s => s.id === btn.dataset.id);
    if(!sv) return;
    $("#servico").value = sv.id;
    popularProfissionais();
    $("#profissional").value = sv.profs[0] || "";
    location.hash="#agendar";
    $("#nome").focus();
  });
}

function popularServicos() {
  const sel = $("#servico");
  if(!sel) return;
  sel.innerHTML = `<option value="">Selecione…</option>` + SERVICOS.map(s => `<option value="${s.id}">${s.nome}</option>`).join("");
}

function popularProfissionais() {
  const sv = SERVICOS.find(s => s.id === $("#servico").value);
  const sel = $("#profissional");
  if(!sel) return;
  sel.innerHTML = `<option value="">Selecione…</option>` + (sv ? sv.profs.map(p=>`<option value="${p}">${p}</option>`).join("") : "");
  if(sv?.profs[0]) sel.value = sv.profs[0]; // seleciona primeiro profissional
}

// Atualiza profissionais quando muda o select
$("#servico")?.addEventListener("change", popularProfissionais);

// ========================================
// ============ FORMULÁRIO AGENDAR =========
// ========================================
$("#form-agenda")?.addEventListener("submit", e => {
  e.preventDefault();
  const cliente = $("#nome").value.trim();
  const telefone = $("#telefone").value.trim();
  const servico = $("#servico").value;
  const profissional = $("#profissional").value;
  const data = $("#data").value;
  const hora = $("#hora").value;
  const obs = $("#obs").value.trim();

  if(!cliente || !telefone || !servico || !profissional || !data || !hora){
    toast("Preencha todos os campos obrigatórios","error");
    return;
  }

  const ag = {
    id: uuid(),
    cliente, telefone, servico, profissional, data, hora,
    obs, status:"pendente"
  };

  const agendamentos = storage.load();
  agendamentos.push(ag);
  storage.save(agendamentos);
  toast("Agendamento criado! Aguardando aprovação.");
  renderLista();
  e.target.reset();
  $("#servico").value = "";
  popularProfissionais();
});

// ========================================
// ============ RENDER LISTA ==============
// ========================================
function renderLista() {
  const wrap = $("#listaAgendamentos");
  const tpl = $("#tpl-agendamento");
  const vazio = $("#vazio");
  if(!wrap || !tpl || !vazio) return;

  const agendamentos = storage.load();
  wrap.innerHTML = "";
  vazio.style.display = agendamentos.length===0 ? "block" : "none";

  agendamentos.forEach(a => {
    const item = tpl.content.cloneNode(true);
    item.querySelector(".item-titulo").textContent = `${a.cliente} - ${a.servico}`;
    item.querySelector(".item-meta").textContent = `Data: ${a.data} às ${a.hora} | Status: ${a.status}`;
    item.querySelector(".status-badge").dataset.status = a.status;
    item.querySelector(".item-obs").textContent = a.obs || "";

    const btnAprovar = item.querySelector(".btn-aprovar");
    const btnRecusar = item.querySelector(".btn-recusar");
    const btnExcluir = item.querySelector(".btn-excluir");

    if(auth.isAdmin && a.status==="pendente") {
      btnAprovar.style.display="inline-block";
      btnRecusar.style.display="inline-block";
    }

    btnAprovar.addEventListener("click", ()=> atualizarStatus(a.id,"aceito"));
    btnRecusar.addEventListener("click", ()=> atualizarStatus(a.id,"recusado"));
    btnExcluir.addEventListener("click", ()=> excluirAgendamento(a.id));

    wrap.appendChild(item);
  });
}

// ========================================
// ============ ATUALIZAR STATUS =========
// ========================================
function atualizarStatus(id,status){
  const agendamentos = storage.load();
  const ag = agendamentos.find(a=>a.id===id);
  if(!ag){ toast("Agendamento não encontrado","error"); return; }
  ag.status = status;
  storage.save(agendamentos);
  renderLista();
  toast(`Agendamento ${status}!`);
}

// ========================================
// ============ EXCLUIR AGENDAMENTO ========
// ========================================
function excluirAgendamento(id){
  let agendamentos = storage.load();
  agendamentos = agendamentos.filter(a=>a.id!==id);
  storage.save(agendamentos);
  renderLista();
  toast("Agendamento excluído!");
}

// ========================================
// ============ ADMIN MODAL ===============
// ========================================
function initAdmin(){
  const modal = $("#modalAdmin");
  if(!modal) return;

  $("#btnAbrirAdmin")?.addEventListener("click", e=>{ e.preventDefault(); modal.showModal(); });
  $("#btnFecharAdmin")?.addEventListener("click", ()=> modal.close());

  $("#btnLogin")?.addEventListener("click", e=>{
    e.preventDefault();
    const u = $("#adminUser").value.trim();
    const p = $("#adminPass").value.trim();
    if(auth.login(u,p)){
      modal.close();
      renderLista();
      toast("Admin autenticado!");
    } else toast("Credenciais inválidas!","error");
  });
}

// ========================================
// ============ INIT ======================
// ========================================
document.addEventListener("DOMContentLoaded", ()=>{
  renderServicos();
  popularServicos();
  popularProfissionais();
  initAdmin();
  renderLista();
});
