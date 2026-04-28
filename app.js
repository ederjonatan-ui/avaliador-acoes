/********************************************
 *  SISTEMA DE AVALIAÇÃO — IA HÍBRIDA
 *  app.js COMPLETO E ATUALIZADO
 ********************************************/

/************* SENHA *************/
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

let worldContext = {
  riskLevel: "Moderado",
  politicalTension: "Estável",
  score: 0.5
};

/************* CONTEXTO GLOBAL SIMULADO *************/
function updateWorldContext() {
  const now = new Date();
  const base = (now.getUTCMinutes() % 10) / 10;

  let risk, tension;
  if (base < 0.3) {
    risk = "Baixo";
    tension = "Estável";
  } else if (base < 0.7) {
    risk = "Moderado";
    tension = "Neutro";
  } else {
    risk = "Elevado";
    tension = "Tenso";
  }

  worldContext = {
    riskLevel: risk,
    politicalTension: tension,
    score: base
  };

  document.getElementById("world-text").textContent =
    `Risco: ${risk} · Cenário político: ${tension}`;
}

updateWorldContext();
setInterval(updateWorldContext, 60000);

/************* TIMER *************/
function formatSeconds(sec) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function baseTimerForSide(side) {
  const risk = worldContext.score;
  const minBase = side === "COMPRA" ? 30 : 20;
  const maxBase = side === "COMPRA" ? 120 : 90;
  return minBase + Math.round((1 - risk) * (maxBase - minBase));
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
    if (c.secondsRemaining <= 0) {
      moveCompany(c, buyCompanies, sellCompanies);
    }
  }

  for (let i = sellCompanies.length - 1; i >= 0; i--) {
    const c = sellCompanies[i];
    c.secondsRemaining--;
    if (c.secondsRemaining <= 0) {
      moveCompany(c, sellCompanies, buyCompanies);
    }
  }

  renderLists();
}

setInterval(tickTimers, 1000);

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

    timerBox.appendChild(label);
    timerBox.appendChild(timer);

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

/************* AVALIAÇÃO DO TICKER *************/
async function avaliarTicker() {
  const input = document.getElementById("ticker-input").value.trim();
  if (!input) return alert("Digite um ticker, ex: PETR4");

  let ticker = input.toUpperCase();
  if (!ticker.includes(".")) ticker += ".SA";

  document.getElementById("chart-subtitle").textContent =
    "Carregando dados de " + ticker + "…";

  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      encodeURIComponent(ticker) +
      "?interval=30m&range=5d";

    const resp = await fetch(url);
    const data = await resp.json();

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const q = result.indicators.quote[0];

    const closes = q.close;
    const opens = q.open;
    const highs = q.high;
    const lows = q.low;

    const ultimo = closes[closes.length - 1];

    function mm(arr, p) {
      if (arr.length < p) return null;
      const slice = arr.slice(-p);
      return slice.reduce((a, b) => a + b, 0) / p;
    }

    const mm20 = mm(closes, 20);
    const mm50 = mm(closes, 50);

    let rec = "MANTER";

    if (ultimo > mm20 && mm20 > mm50) rec = "COMPRA";
    if (ultimo < mm20 && mm20 < mm50) rec = "VENDA";

    if (worldContext.riskLevel === "Elevado" && rec === "COMPRA") rec = "MANTER";
    if (worldContext.riskLevel === "Baixo" && rec === "MANTER") rec = "COMPRA";

    const nomeEmpresa = ticker.split(".")[0];

    if (rec === "COMPRA") {
      addOrUpdateCompany(ticker, "COMPRA", nomeEmpresa, {
        valorSugerido: ultimo * 0.97,
        potencialGanho: ((mm20 - ultimo) / ultimo) * 100
      });
    } else if (rec === "VENDA") {
      addOrUpdateCompany(ticker, "VENDA", nomeEmpresa, {
        valorSugerido: ultimo * 1.03,
        potencialGanho: ((ultimo - mm20) / ultimo) * 100
      });
    }

    renderChart(timestamps, opens, highs, lows, closes, ticker);
  } catch (e) {
    console.error(e);
    alert("Erro ao carregar dados do ticker.");
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
    margin: { l: 40, r: 10, t: 10, b: 20 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)"
  });

  document.getElementById("chart-subtitle").textContent =
    "Últimos candles de " + ticker;
}

/************* EVENTOS *************/
document.getElementById("btnAvaliar").onclick = avaliarTicker;
document.getElementById("ticker-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") avaliarTicker();
});

/************* LISTA INICIAL *************/
buyCompanies = [
  {
    ticker: "VALE3.SA",
    name: "Vale S.A.",
    side: "COMPRA",
    secondsRemaining: baseTimerForSide("COMPRA"),
    valorSugerido: 62.50,
    potencialGanho: 4.2
  }
];

sellCompanies = [
  {
    ticker: "IRBR3.SA",
    name: "IRB Brasil",
    side: "VENDA",
    secondsRemaining: baseTimerForSide("VENDA"),
    valorSugerido: 1.95,
    potencialGanho: -3.1
  }
];

renderLists();
