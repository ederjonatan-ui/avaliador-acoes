/********************************************
 *  AVALIADOR DE AÇÕES — IA HÍBRIDA
 *  app.js COMPLETO (com barra neon e atualização automática)
 ********************************************/

const ACCESS_PASSWORD = "2207";

function unlockSite() {
  const input = document.getElementById("lock-input").value.trim();
  if (input === ACCESS_PASSWORD) {
    document.getElementById("lock-screen").style.display = "none";
    document.getElementById("app-root").style.display = "block";
  } else {
    alert("Senha incorreta.");
  }
}

document.getElementById("lock-button").onclick = unlockSite;
document.getElementById("lock-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") unlockSite();
});

/************* ESTADO GLOBAL *************/
let buyCompanies = [];
let sellCompanies = [];
let totalResultado = 0;

/************* BARRA DE PROGRESSO *************/
function mostrarBarraAtualizacao() {
  const barra = document.getElementById("update-bar");
  barra.style.width = "0%";
  barra.style.opacity = "1";
  barra.style.transition = "width 3s linear";
  barra.style.background = "linear-gradient(90deg,#00aaff,#00d68f)";
  barra.style.height = "4px";
  barra.style.position = "fixed";
  barra.style.top = "0";
  barra.style.left = "0";
  barra.style.zIndex = "9999";

  setTimeout(() => {
    barra.style.width = "100%";
  }, 50);

  setTimeout(() => {
    barra.style.opacity = "0";
  }, 3000);
}

/************* FUNÇÕES AUXILIARES *************/
function formatSeconds(sec) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function baseTimerForSide(side) {
  const minBase = side === "COMPRA" ? 30 : 20;
  const maxBase = side === "COMPRA" ? 120 : 90;
  return minBase + Math.round(Math.random() * (maxBase - minBase));
}

/************* LISTAS *************/
function addOrUpdateCompany(ticker, side, name, extra = {}) {
  const target = side === "COMPRA" ? buyCompanies : sellCompanies;
  const other = side === "COMPRA" ? sellCompanies : buyCompanies;

  const idxOther = other.findIndex((c) => c.ticker === ticker);
  if
