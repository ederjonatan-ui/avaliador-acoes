// =========================
// AUTOCOMPLETE
// =========================
async function buscarSugestoes(query) {
    if (!query) return [];

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`;

    try {
        const resposta = await fetch(url);
        const dados = await resposta.json();
        return dados.quotes || [];
    } catch (e) {
        console.error("Erro no autocomplete:", e);
        return [];
    }
}

document.getElementById("ativo").addEventListener("input", async function () {
    const texto = this.value.trim();
    const lista = document.getElementById("autocomplete-list");
    lista.innerHTML = "";

    if (!texto) return;

    const sugestoes = await buscarSugestoes(texto);

    sugestoes.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("autocomplete-item");
        div.innerHTML = `${item.shortname || item.longname || item.symbol} (${item.symbol})`;
        div.onclick = () => {
            document.getElementById("ativo").value = item.symbol;
            lista.innerHTML = "";
        };
        lista.appendChild(div);
    });
});

// =========================
// RANGE DINÂMICO (CORREÇÃO DO GRÁFICO)
// =========================
function obterRange(intervalo) {
    if (["1m", "2m", "5m", "15m"].includes(intervalo)) return "5d";
    if (intervalo === "30m" || intervalo === "1h") return "1mo";
    return "6mo";
}

// =========================
// GRÁFICOS
// =========================
let grafico;

function criarGrafico(ctx, tipo, dados, opcoes) {
    if (tipo === "candlestick") {
        return new Chart(ctx, {
            type: "candlestick",
            data: { datasets: [{ label: "Preço", data: dados }] },
            options: opcoes
        });
    } else {
        return new Chart(ctx, {
            type: "line",
            data: { labels: dados.labels, datasets: dados.datasets },
            options: opcoes
        });
    }
}

async function carregarGraficos(ticker, intervalo) {
    const range = obterRange(intervalo);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${intervalo}&range=${range}`;

    try {
        const resposta = await fetch(url);
        const dados = await resposta.json();

        const result = dados.chart.result[0];
        const timestamps = result.timestamp;
        const candles = result.indicators.quote[0];

        const dadosCandle = timestamps.map((t, i) => ({
            x: t * 1000,
            o: candles.open[i],
            h: candles.high[i],
            l: candles.low[i],
            c: candles.close[i]
        }));

        if (grafico) grafico.destroy();

        grafico = criarGrafico(
            document.getElementById("grafico"),
            "candlestick",
            dadosCandle,
            { responsive: true }
        );

    } catch (e) {
        console.error("Erro ao carregar gráficos:", e);
    }
}

// =========================
// LÓGICA DE VALOR SUGERIDO
// =========================
function calcularValorSugerido(recomendacao, atual, alvo, fechamento) {
    let valor = atual;

    if (recomendacao === "Comprar") {
        const diferenca
