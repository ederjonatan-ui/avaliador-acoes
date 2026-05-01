/* ============================================================
   CONFIGURAÇÃO
============================================================ */
const WORKER_URL = "https://throbbing-violet-ec59.ederjonatan.workers.dev";

const inputAtivo = document.getElementById("ativo");
const lista = document.getElementById("autocomplete-list");
let intervaloAuto = null;

/* ============================================================
   COFRE 2207 + BOTÃO ENTRAR
============================================================ */
const SEQUENCE = [2, 2, 0, 7];
let currentInput = [];
let canEnter = false;

function pressKey(num) {
    currentInput.push(num);
    if (currentInput.length > 4) currentInput = [num];

    const display = document.getElementById("lock-display");
    const errorDiv = document.getElementById("lock-error");
    const enterBtn = document.getElementById("enter-btn");

    display.textContent = currentInput.map(() => "•").join("");
    errorDiv.textContent = "";
    canEnter = false;
    enterBtn.classList.remove("enabled");

    if (currentInput.length === 4) {
        const ok = SEQUENCE.every((v, i) => v === currentInput[i]);

        if (ok) {
            display.textContent = "Sequência correta";
            canEnter = true;
            enterBtn.classList.add("enabled");
        } else {
            errorDiv.textContent = "Sequência incorreta";
            currentInput = [];
            display.textContent = "••••";
        }
    }
}

function unlockSite() {
    if (!canEnter) return;

    document.getElementById("lock-screen").style.display = "none";
    document.getElementById("main-app").classList.remove("hidden");
}

/* ============================================================
   AUTOCOMPLETE
============================================================ */
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

/* ============================================================
   INTERVALO YAHOO
============================================================ */
function getIntervalYahoo() {
    const v = document.getElementById("intervalo").value;

    if (v === "15m") return "15m";
    if (v === "1h") return "60m";
    if (v === "1d") return "1d";
    if (v === "1wk") return "1wk";
    if (v === "1mo") return "1mo";

    return "1d";
}

/* ============================================================
   FUNÇÃO PRINCIPAL (AVALIAR)
============================================================ */
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

/* ============================================================
   GRÁFICO PRINCIPAL
============================================================ */
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
        o: opens[i] ?? closes[i] - 0.05,
        h: highs[i] ?? closes[i] + 0.10,
        l: lows[i] ?? closes[i] - 0.10,
        c: closes[i],
        v: volumes[i] || 0
    }));

    const slider = document.getElementById("sliderDia");
    slider.max = candlesGlobais.length - 1;
    slider.value = candlesGlobais.length - 1;

    desenharGrafico(candlesGlobais);
}

function desenharGrafico(candles) {
    const canvas = document.getElementById("grafico");
    const ctx = canvas.getContext("2d");

    if (graficoAtual) graficoAtual.destroy();

    const closeLine = candles.map(c => ({ x: c.x, y: c.c }));
    const mm20Line = calcularSerieMM(candles.map(c => c.c), 20, candles.map(c => c.x));
    const mm50Line = calcularSerieMM(candles.map(c => c.c), 50, candles.map(c => c.x));
    const volumeBars = candles.map(c => ({ x: c.x, y: c.v }));

    graficoAtual = new Chart(ctx, {
        data: {
            datasets: [
                {
                    type: "candlestick",
                    label: "Candles",
                    data: candles,
                    borderColor: "#fff",
                    color: {
                        up: "#2ea043",
                        down: "#f85149",
                        unchanged: "#999"
                    }
                },
                {
                    type: "line",
                    label: "Fechamento",
                    data: closeLine,
                    borderColor: "#58a6ff",
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.2
                },
                {
                    type: "line",
                    label: "MM20",
                    data: mm20Line,
                    borderColor: "#facc15",
                    borderWidth: 1.2,
                    pointRadius: 0,
                    tension: 0.2
                },
                {
                    type: "line",
                    label: "MM50",
                    data: mm50Line,
                    borderColor: "#22d3ee",
                    borderWidth: 1.2,
                    pointRadius: 0,
                    tension: 0.2
                },
                {
                    type: "bar",
                    label: "Volume",
                    data: volumeBars,
                    backgroundColor: "rgba(148,163,184,0.5)",
                    borderWidth: 0,
                    yAxisID: "y1"
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { type: "time" },
                y: { beginAtZero: false },
                y1: {
                    beginAtZero: true,
                    position: "right",
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: {
                zoom: {
                    pan: { enabled: true, mode: "x" },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" }
                }
            }
        }
    });
}

/* ============================================================
   RSI
============================================================ */
function plotarRSI(chartData) {
    const timestamps = chartData.timestamp || [];
    const closes = chartData.indicators.quote[0].close || [];

    const rsiSerie = calcularSerieRSI(closes, 14, timestamps);

    const canvas = document.getElementById("graficoRSI");
    const ctx = canvas.getContext("2d");

    if (graficoRSI) graficoRSI.destroy();

    graficoRSI = new Chart(ctx, {
        type: "line",
        data: {
            datasets: [
                {
                    label: "RSI",
                    data: rsiSerie,
                    borderColor: "#f97316",
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { type: "time" },
                y: { min: 0, max: 100 }
            }
        }
    });
}

/* ============================================================
   MACD
============================================================ */
function plotarMACD(chartData) {
    const timestamps = chartData.timestamp || [];
    const closes = chartData.indicators.quote[0].close || [];

    const macdSerie = calcularSerieMACD(closes, timestamps);

    const canvas = document.getElementById("graficoMACD");
    const ctx = canvas.getContext("2d");

    if (graficoMACD) graficoMACD.destroy();

    graficoMACD = new Chart(ctx, {
        type: "line",
        data: {
            datasets: [
                {
                    label: "MACD",
                    data: macdSerie,
                    borderColor: "#22c55e",
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { type: "time" },
                y: { beginAtZero: false }
            }
        }
    });
}

/* ============================================================
   SLIDER
============================================================ */
function mudarDia() {
    const slider = document.getElementById("sliderDia");
    const index = parseInt(slider.value);

    const candleSelecionado = candlesGlobais[index];
    if (!candleSelecionado) return;

    desenharGrafico([candleSelecionado]);
}

/* ============================================================
   PAINEL DE TENDÊNCIA
============================================================ */
function atualizarPainelTendencia(recomendacao, probLocal, rsi, volatilidade) {
    const painel = document.getElementById("painel-tendencia");
    const texto = document.getElementById("tendencia-texto");

    painel.classList.remove("alta", "baixa", "neutro");

    let classe = "neutro";
    let desc = `Probabilidade: ${(probLocal * 100).toFixed(0)}% | RSI: ${rsi.toFixed(1)} | Vol: ${volatilidade.toFixed(2)}`;

    if (recomendacao === "COMPRA") {
        classe = "alta";
        desc = "Tendência de alta. " + desc;
    } else if (recomendacao === "VENDA") {
        classe = "baixa";
        desc = "Tendência de baixa. " + desc;
    }

    painel.classList.add(classe);
    texto.textContent = desc;
}

/* ============================================================
   FUNÇÕES AUXILIARES
============================================================ */
function media(arr, n) {
    if (arr.length < n) return arr[arr.length - 1];
    const slice = arr.slice(arr.length - n);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function desvioPadrao(arr) {
    const m = media(arr, arr.length);
    const variancia = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / arr.length;
    return Math.sqrt(variancia);
}

function calcularRSI(closes) {
    let ganhos = 0, perdas = 0;
    for (let i = 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) ganhos += diff;
        else perdas -= diff;
    }
    const rs = ganhos / (perdas || 1);
    return 100 - (100 / (1 + rs));
}

function calcularMACD(closes) {
    return media(closes, 12) - media(closes, 26);
}

function calcularProbabilidade(mm20, mm50, rsi, macd) {
    let score = 0;
    if (mm20 > mm50) score += 0.3;
    if (rsi < 70 && rsi > 30) score += 0.2;
    if (macd > 0) score += 0.3;
    return Math.min(1, score + 0.2);
}

function extrairTextoIA(dados) {
    if (Array.isArray(dados) && dados[0]?.generated_text) {
        return dados[0].generated_text;
    }
    if (dados.generated_text) {
        return dados.generated_text;
    }
    if (dados.error) {
        return "Erro da IA: " + dados.error;
    }
    return JSON.stringify(dados);
}

function calcularSerieMM(closes, n, xs) {
    const out = [];
    for (let i = 0; i < closes.length; i++) {
        if (i < n - 1) continue;
        const slice = closes.slice(i - n + 1, i + 1);
        const m = slice.reduce((a, b) => a + b, 0) / slice.length;
        out.push({ x: xs[i], y: m });
    }
    return out;
}

function calcularSerieRSI(closes, n, timestamps) {
    const out = [];
    for (let i = n; i < closes.length; i++) {
        const slice = closes.slice(i - n, i + 1);
        const rsi = calcularRSI(slice);
        out.push({ x: new Date(timestamps[i] * 1000), y: rsi });
    }
    return out;
}

function calcularSerieMACD(closes, timestamps) {
    const out = [];
    for (let i = 26; i < closes.length; i++) {
        const slice = closes.slice(0, i + 1);
        const macd = calcularMACD(slice);
        out.push({ x: new Date(timestamps[i] * 1000), y: macd });
    }
    return out;
}
