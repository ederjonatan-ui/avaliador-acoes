/********************************************
 *  AVALIADOR DE AÇÕES — IA HÍBRIDA
 *  app.js COMPLETO (PARTE 1)
 ********************************************/

let buyCompanies = [];
let sellCompanies = [];
let totalResultado = 0;

/************* BARRA DE PROGRESSO *************/
function mostrarBarraAtualizacao() {
  const barra = document.getElementById("update-bar");
  barra.style.width = "0%";
  barra.style.opacity = "1";
  barra.style.transition = "width 3s linear";

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
      else {
        empresa.valorSugerido = ultimo * 1.03;
        empresa.potencialGanho = ((ultimo - ultimo * 0.97) / ultimo) * -100;
      }
    } catch (e) {
      console.warn("Falha ao atualizar", empresa.ticker, e);
    }
  }

  renderLists();
}

/************* ATUALIZAÇÃO AUTOMÁTICA A CADA 1 MINUTO *************/
setInterval(() => {
  atualizarEmpresasAutomaticamente();
}, 60000);

/************* GRÁFICO *************/
async function carregarGrafico(ticker) {
  try {
    mostrarBarraAtualizacao();

    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      encodeURIComponent(ticker) +
      "?interval=30m&range=5d";

    const resp = await fetch(url);
    const data = await resp.json();

    const result = data.chart.result[0];
    const t = result.timestamp;
    const o = result.indicators.quote[0].open;
    const h = result.indicators.quote[0].high;
    const l = result.indicators.quote[0].low;
    const c = result.indicators.quote[0].close;

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
      margin: { l: 40, r: 20, t: 20, b: 40 },
      paper_bgcolor: "#0b1221",
      plot_bgcolor: "#0b1221",
      font: { color: "white" }
    });

    document.getElementById("chart-subtitle").textContent =
      ticker + " — Últimos candles
