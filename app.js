const WORKER_URL = "https://throbbing-violet-ec59.ederjonatan.workers.dev";

const inputAtivo = document.getElementById("ativo");
const lista = document.getElementById("autocomplete-list");
let intervaloAuto = null;

// =======================
// COFRE 2207
// =======================
const SEQUENCE = [2, 2, 0, 7];
let currentInput = [];

function pressKey(num) {
    currentInput.push(num);
    if (currentInput.length > 4) currentInput = [num];

    const display = document.getElementById("lock-display");
    const errorDiv = document.getElementById("lock-error");
    const enterBtn = document.getElementById("enter-btn");

    display.textContent = currentInput.map(() => "•").join("");
    errorDiv.textContent = "";
    enterBtn.classList.remove("active");
    enterBtn.disabled = true;

    if (currentInput.length === 4) {
        const ok = SEQUENCE.every((v, i) => v === currentInput[i]);

        if (ok) {
            display.textContent = "✔ Sequência correta";
            enterBtn.classList.add("active");
            enterBtn.disabled = false;
        } else {
            errorDiv.textContent = "Sequência incorreta";
            currentInput = [];
            display.textContent = "••••";
        }
    }
}

function unlockSite() {
    document.getElementById("lock-screen").style.display = "none";
    document.getElementById("main-app").classList.remove("hidden");
}

// ======================================================
// AUTOCOMPLETE
// ======================================================
inputAtivo.addEventListener("input", async () => {
    const texto = inputAtivo.value.trim();

    if (texto.length < 2) {
        lista.innerHTML = "";
        return;
    }

    const r = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "searchTicker", query: texto })
    });

    const tickers = await r.json();

    lista.innerHTML = "";

    tickers.slice(0, 10).forEach(t => {
        const item = document.createElement("div");
        item.textContent = t;
        item.onclick = () => {
            inputAtivo.value = t;
            lista.innerHTML = "";
            avaliar();
        };
        lista.appendChild(item);
    });
});

// ======================================================
// INTERVALO YAHOO
// ======================================================
function getIntervalYahoo() {
    const v = document.getElementById("intervalo").value;

    if (v === "15m") return "15m";
    if (v === "1h") return "60m";
    if (v === "1d") return "1d";
    if (v === "1wk") return "1wk";
    if (v === "1mo") return "1mo";

    return "1d";
}

// ======================================================
// FUNÇÃO PRINCIPAL
// ======================================================
async function avaliar(interno = false) {
    const ativo = inputAtivo.value.trim();
    const intervalo = getIntervalYahoo();
    const resultadoDiv = document.getElementById("resultado");

    if (!ativo) {
        resultadoDiv.innerHTML = "<p style='color:red'>Escolha um ativo válido.</p>";
        return;
    }

    if (!interno) {
        if (intervaloAuto) clearInterval(intervaloAuto);
        intervaloAuto = setInterval(() => avaliar(true), 60000);
    }

    resultadoDiv.innerHTML = "<p>Carregando dados...</p>";

    try {
        const respostaYahoo = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "yahoo",
                ticker: ativo,
                interval: intervalo
            })
        });

        const dadosYahoo = await respostaYahoo.json();

        if (dadosYahoo.error) {
            resultadoDiv.innerHTML = `<p style='color:red'>Erro: ${dadosYahoo.error}</p>`;
            return;
        }

        const chart = dadosYahoo.chart?.result?.[0];
        if (!chart) {
            resultadoDiv.innerHTML = "<p style='color:red'>Ativo não encontrado.</p>";
            return;
        }

        const closes = chart.indicators.quote[0].close;
        const volumes = chart.indicators.quote[0].volume || [];

        plotarGrafico(chart, volumes);
        plotarRSI(chart);
        plotarMACD(chart);

        const precoAtual = closes[closes.length - 1];
        const mm20 = media(closes, 20);
        const mm50 = media(closes, 50);
        const volatilidade = desvioPadrao(closes);
        const rsi = calcularRSI(closes);
        const macd = calcularMACD(closes);

        const precoIdealCompra = precoAtual * 0.985;
        const precoIdealVenda = precoAtual * 1.012;
        const precoAlvo = precoAtual * 1.022;
        const stop = precoAtual * 0.99;

        const probLocal = calcularProbabilidade(mm20, mm50, rsi, macd);

        const prompt = `
Analise o ativo ${ativo}.
Preço atual: ${precoAtual.toFixed(2)}.
MM20: ${mm20.toFixed(2)}.
MM50: ${mm50.toFixed(2)}.
RSI: ${rsi.toFixed(2)}.
MACD: ${macd.toFixed(2)}.
Volatilidade: ${volatilidade.toFixed(2)}.
Probabilidade local: ${(probLocal * 100).toFixed(0)}%.
        `;

        const respostaIA = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        });

        const dadosIA = await respostaIA.json();
        const textoIA = extrairTextoIA(dadosIA);

        const recomendacao = probLocal > 0.65 ? "COMPRA" :
                             probLocal < 0.45 ? "VENDA" : "NEUTRO";

        atualizarPainelTendencia(recomendacao, probLocal, rsi, volatilidade);

        resultadoDiv.innerHTML = `
<div class="card">
<h3>Análise Local</h3>
<pre>${JSON.stringify({
precoAtual: precoAtual.toFixed(2),
mm20: mm20.toFixed(2),
mm50: mm50.toFixed(2),
volatilidade: volatilidade.toFixed(2),
precoIdealCompra: precoIdealCompra.toFixed(2),
precoIdealVenda: precoIdealVenda.toFixed(2),
precoAlvo: precoAlvo.toFixed(2),
stop: stop.toFixed(2),
rsi: rsi.toFixed(2),
macd: macd.toFixed(2),
probLocal: (probLocal * 100).toFixed(0) + "%"
}, null, 2)}</pre>
</div>

<div class="card">
<h3>Análise IA Externa</h3>
<p>${textoIA}</p>
</div>

<div class="card highlight ${recomendacao === "COMPRA" ? "compra" : recomendacao === "VENDA" ? "venda" : ""}">
Recomendação: ${recomendacao}
</div>
`;
    } catch (erro) {
        resultadoDiv.innerHTML = `<p style='color:red'>Erro inesperado: ${erro.message}</p>`;
    }
}

/* ======= PARTE 2 ABAIXO ======= */

// ======================================================
// GRÁFICO PRINCIPAL
// ======================================================
let graficoAtual = null;
let graficoRSI = null;
let graficoMACD = null;
let candlesGlobais = [];

function plotarGrafico(chartData, volumes) {
    const timestamps = chartData.timestamp || [];
    const quote = chartData.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];

    candlesGlobais = timestamps.map((t, i) => ({
        x: new Date(t * 1000),
        o: opens[i]
