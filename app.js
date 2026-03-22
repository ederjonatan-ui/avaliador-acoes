const WORKER_URL = "https://throbbing-violet-ec59.ederjonatan.workers.dev";

// ===============================
// FUNÇÃO PRINCIPAL
// ===============================
async function avaliar() {
    const ativo = document.getElementById("ativo").value.trim().toUpperCase();
    const intervalo = document.getElementById("intervalo").value;
    const resultadoDiv = document.getElementById("resultado");

    if (!ativo) {
        resultadoDiv.innerHTML = "<p style='color:red'>Digite um ativo válido.</p>";
        return;
    }

    resultadoDiv.innerHTML = "<p>Carregando dados...</p>";

    try {
        // ===============================
        // 1) BUSCAR DADOS DO YAHOO
        // ===============================
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
        const timestamps = chart.timestamp;
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
Preço atual: ${precoAtual}.
MM20: ${mm20}.
MM50: ${mm50}.
RSI: ${rsi}.
MACD: ${macd}.
Volatilidade: ${volatilidade}.
Probabilidade local: ${probLocal}.
        `;

        const respostaIA = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        });

        const dadosIA = await respostaIA.json();
        const textoIA = extrairTextoIA(dadosIA);

        // ===============================
        // 4) RECOMENDAÇÃO FINAL
        // ===============================
        const recomendacao = probLocal > 0.65 ? "COMPRA" :
                             probLocal < 0.45 ? "VENDA" : "NEUTRO";

        const risco = volatilidade > 2 ? "Alto" :
                      volatilidade > 1 ? "Médio" : "Baixo";

        // ===============================
        // 5) MONTAR O LAYOUT
        // ===============================
        resultadoDiv.innerHTML = `
            <div class="card">
                <h3>Análise Local</h3>
                <pre>${JSON.stringify({
                    precoAtual,
                    mm20,
                    mm50,
                    volatilidade,
                    precoIdealCompra,
                    precoIdealVenda,
                    precoAlvo,
                    stop,
                    rsi,
                    macd,
                    probLocal
                }, null, 2)}</pre>
            </div>

            <div class="card">
                <h3>Análise IA Externa</h3>
                <p>${textoIA}</p>
            </div>

            <div class="card highlight ${recomendacao === "COMPRA" ? "compra" : recomendacao === "VENDA" ? "venda" : ""}">
                Recomendação: ${recomendacao}
            </div>

            <div class="card">Preço ideal de compra: ${precoIdealCompra.toFixed(2)}</div>
            <div class="card">Preço ideal de venda: ${precoIdealVenda.toFixed(2)}</div>
            <div class="card">Preço alvo: ${precoAlvo.toFixed(2)}</div>
            <div class="card">Stop sugerido: ${stop.toFixed(2)}</div>
            <div class="card">Probabilidade final: ${(probLocal * 100).toFixed(0)}%</div>

            <div class="card">
                <h3>Risco</h3>
                <p>${risco}</p>
                <p>MM20 ${mm20 > mm50 ? "acima" : "abaixo"} da MM50.</p>
                <p>RSI: ${rsi.toFixed(2)}</p>
                <p>Volatilidade: ${volatilidade.toFixed(2)}</p>
            </div>
        `;
    } catch (erro) {
        resultadoDiv.innerHTML = `<p style='color:red'>Erro inesperado: ${erro.message}</p>`;
    }
}

// ===============================
// FUNÇÕES AUXILIARES
// ===============================
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
    return JSON.stringify(dados);
}
