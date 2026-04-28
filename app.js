/********************************************
 *  AVALIADOR DE AÇÕES — IA HÍBRIDA
 *  app.js COMPLETO (com botões e cálculo de ganhos)
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
  if (idxOther >= 0) other.splice(idxOther, 1);

  const idx = target.findIndex((c) => c.ticker === ticker);
  const newSeconds = baseTimerForSide(side);

  const obj = {
    ticker,
    name,
    side,
    secondsRemaining: newSeconds,
    valorSugerido: extra.valorSugerido || 0,
    potencialGanho: extra.potencialGanho || 0
  };

  if (idx >= 0) {
    target[idx] = { ...target[idx], ...obj };
  } else {
    target.push(obj);
  }

  renderLists();
}

function moveCompany(company, fromList, toList) {
  const idx = fromList.indexOf(company);
  if (idx >= 0) fromList.splice(idx, 1);

  const newSide = company.side === "COMPRA" ? "VENDA" : "COMPRA";
  company.side = newSide;
  company.secondsRemaining = baseTimerForSide(newSide);

  toList.push(company);
}

function tickTimers() {
  for (let i = buyCompanies.length - 1; i >= 0; i--) {
    const c = buyCompanies[i];
    c.secondsRemaining--;
    if (c.secondsRemaining <= 0) moveCompany(c, buyCompanies, sellCompanies);
  }

  for (let i = sellCompanies.length - 1; i >= 0; i--) {
    const c = sellCompanies[i];
    c.secondsRemaining--;
    if (c.secondsRemaining <= 0) moveCompany(c, sellCompanies, buyCompanies);
  }

  renderLists();
}

setInterval(tickTimers, 1000);

/************* CÁLCULO DE RESULTADO *************/
function calcularResultado(empresa, tipo) {
  const ganho = empresa.potencialGanho;
  const valorBase = 100;
  let resultado = 0;

  if (tipo === "COMPRA") {
    resultado = (valorBase * ganho) / 100;
  } else if (tipo === "VENDA") {
    resultado = (valorBase * ganho) / 100;
  }

  totalResultado += resultado;
  atualizarResultadoUI();
}

function atualizarResultadoUI() {
  const el = document.getElementById("resultado-total");
  el.textContent =
    "Margem total acumulada: " +
    (totalResultado >= 0 ? "+" : "") +
    totalResultado.toFixed(2) +
    " R$";
  el.style.color = totalResultado >= 0 ? "#00d68f" : "#ff4b6e";
}

/************* RENDERIZAÇÃO DAS LISTAS *************/
function renderLists() {
  const buyEl = document.getElementById("buy-list");
  const sellEl = document.getElementById("sell-list");

  buyEl.innerHTML = "";
  sellEl.innerHTML = "";

  function createRow(c, tipo) {
    const row = document.createElement("div");
    row.className = "company-row";

    const main = document.createElement("div");
    main.className = "company-main";

    const name = document.createElement("div");
    name.className = "company-name";
    name.textContent = c.name;

    const ticker = document.createElement("div");
    ticker.className = "company-ticker";
    ticker.textContent = c.ticker;

    const valor = document.createElement("div");
    valor.style.fontSize = "11px";
    valor.style.color = "#7fffe0";
    valor.textContent =
      tipo === "COMPRA"
        ? `Valor ideal: R$ ${c.valorSugerido.toFixed(2)}`
        : `Valor alvo: R$ ${c.valorSugerido.toFixed(2)}`;

    const ganho = document.createElement("div");
    ganho.style.fontSize = "11px";
    ganho.style.color = c.potencialGanho >= 0 ? "#00d68f" : "#ff4b6e";
    ganho.textContent =
      tipo === "COMPRA"
        ? `Potencial: +${c.potencialGanho.toFixed(2)}%`
        : `Risco/Retorno: ${c.potencialGanho.toFixed(2)}%`;

    main.appendChild(name);
    main.appendChild(ticker);
    main.appendChild(valor);
    main.appendChild(ganho);

    const timerBox = document.createElement("div");
    const label = document.createElement("div");
    label.className = "company-timer-label";
    label.textContent =
      tipo === "COMPRA" ? "Tempo p/ virar VENDA" : "Tempo p/ virar COMPRA";

    const timer = document.createElement("div");
    timer.className = "company-timer";
    timer.textContent = formatSeconds(c.secondsRemaining);

    const botao = document.createElement("button");
    botao.textContent = tipo === "COMPRA" ? "Comprei" : "Vendi";
    botao.style.marginTop = "4px";
    botao.style.fontSize = "11px";
    botao.style.padding = "4px 6px";
    botao.style.borderRadius = "6px";
    botao.style.border = "none";
    botao.style.cursor = "pointer";
    botao.style.background =
      tipo === "COMPRA"
        ? "linear-gradient(135deg,#00d68f,#00a86b)"
        : "linear-gradient(135deg,#ff4b6e,#d63a5a)";
    botao.style.color = "white";

    botao.onclick = () => {
      calcularResultado(c, tipo);
      botao.disabled = true;
      botao.style.opacity = "0.6";
    };

    timerBox.appendChild(label);
    timerBox.appendChild(timer);
    timerBox.appendChild(botao);

    row.appendChild(main);
    row.appendChild(timerBox);

    return row;
  }

  if (buyCompanies.length === 0) {
    buyEl.innerHTML = `<div class="empty-list">Nenhuma empresa em ponto ideal de compra.</div>`;
  } else {
    buyCompanies.forEach((c) => buyEl.appendChild(createRow(c, "COMPRA")));
  }

  if (sellCompanies.length === 0) {
    sellEl.innerHTML = `<div class="empty-list">Nenhuma empresa em ponto de venda.</div>`;
  } else {
    sellCompanies.forEach((c) => sellEl.appendChild(createRow(c, "VENDA")));
  }
}

/************* GRÁFICO *************/
function renderChart(t, o, h, l, c, ticker) {
  const trace = {
    x: t.map((x) => new Date(x * 1000)),
    open: o,
    high: h,
    low: l,
    close: c,
    type: "candlestick",
    increasing: { line: { color: "#00d68f" } },
    decreasing: { line: { color: "#ff4b6e" } }
  };

  Plotly.newPlot("chart", [trace], {
    margin: { l
