const WORKER_URL = "https://throbbing-violet-ec59.ederjonatan.workers.dev";

// ======================================================
// 1) RESOLVER TICKER AUTOMATICAMENTE
// ======================================================
async function resolverTicker(entrada) {
    const termo = entrada.trim().toUpperCase();

    if (termo.endsWith(".SA")) return termo;

    if (/^[A-Z]{4}[0-9]$/.test(termo)) {
        return termo + ".SA";
    }

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(termo)}`;

    try {
        const r = await fetch(url);
        const json = await r.json();

        if (!json.quotes || json.quotes.length === 0) {
            return null;
        }

        const br = json.quotes.filter(q => q.symbol.endsWith(".SA"));

        if (br.length > 0) {
            return br[0].symbol;
        }

        return json.quotes[0].symbol;

    } catch (e) {
        return null;
    }
}

// ======================================================
// 2) FUNÇÃO PRINCIPAL
// ======================================================
async function avaliar() {
    const entrada = document.getElementById("ativo").value.trim();
    const intervalo = document.getElementById("intervalo").value;
    const resultadoDiv = document.getElementById("resultado");

    resultadoDiv.innerHTML = "<p>Carregando dados...</p>";

    const ativo = await resolverTicker(entrada);

    if (!ativo) {
        resultadoDiv.innerHTML = "<p style='color:red'>Ativo não encontrado.</p>";
        return;
    }

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
            resultadoDiv.innerHTML = `<p style='color:red'>Erro ao buscar dados: ${dadosYahoo.error}</p>`;
            return;
        }

        const chart = dadosYahoo.chart?.result?.[0];
        if (!chart) {
            resultadoDiv.innerHTML = "<p style='color:red'>Ativo não encontrado.</p>";
            return;
        }

        const closes = chart.indicators.quote[0].close;
        const precoAtual = closes[closes.length - 1];

        // ===============================
        // 2) CÁLCULOS TÉCNICOS
        // ===============================
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

        // ===============================
        // 3) ANÁLISE VIA IA
        // ===============================
        const prompt = `
Analise o ativo ${ativo}.
Preço atual: ${precoAtual.toFixed(2)}.
MM20: ${mm20.toFixed(2)}.
MM50: ${mm50
