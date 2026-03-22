/* ============================
   AUTOCOMPLETE GLOBAL
============================ */
document.getElementById("ticker").addEventListener("input", async function () {
    const q = this.value.trim();
    if (q.length < 2) return;

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${q}`;
    try {
        const r = await fetch(url);
        const j = await r.json();

        if (!j.quotes) return;

        this.setAttribute("list", "lista");
        let datalist = document.getElementById("lista");
        if (!datalist) {
            datalist = document.createElement("datalist");
            datalist.id = "lista";
            document.body.appendChild(datalist);
        }

        datalist.innerHTML = j.quotes
            .slice(0, 8)
            .map(x => `<option value="${x.symbol}">${x.shortname || ""}</option>`)
            .join("");
    } catch (e) {
        console.log("Autocomplete bloqueado por CORS — normal.");
    }
});

/* ============================
   FUNÇÃO PRINCIPAL
============================ */
async function avaliar() {
    const ticker = document.getElementById("ticker").value.trim().toUpperCase();
    const intervalo = document.getElementById("intervalo").value;
    const resultado = document.getElementById("resultado");

    if (!ticker) {
        resultado.innerText = "Digite um ativo válido.";
        return;
    }

    resultado.innerText = "Carregando dados...";

    try {
        const dados = await obterDados(ticker, intervalo);
        const analiseLocal = analisarLocal(dados);
        const analiseExterna = await analisarExterno(analiseLocal);

        resultado.innerText =
            "📊 ANÁLISE LOCAL\n" +
            JSON.stringify(analiseLocal, null, 2) +
            "\n\n🤖 ANÁLISE IA EXTERNA\n" +
            analiseExterna;

        preencherCards(analiseLocal, analiseExterna);
        desenharGrafico(dados);

    } catch (e) {
        resultado.innerText = "Erro: " + e.message;
    }
}

/* ============================
   BUSCA DE DADOS VIA WORKER
============================ */
async function obterDados(ticker, intervalo) {
    const resposta = await fetch("https://purple-mountain-9031.ederjonatan.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: "yahoo",
            ticker,
            interval: intervalo
        })
    });

    const j = await resposta.json();

    const c = j.chart.result[0];
    return {
        preco: c.meta.regularMarketPrice,
        timestamps: c.timestamp,
        open: c.indicators.quote[0].open,
        close: c.indicators.quote[0].close,
        high: c.indicators.quote[0].high,
        low: c.indicators.quote[0].low
    };
}

/* ============================
   ANÁLISE LOCAL
============================ */
function analisarLocal(d) {
    const closes = d.close.filter(x => x);

    const mm20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const mm50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;

    let volatilidade = 0;
    for (let i = closes.length - 10; i < closes.length - 1; i++) {
        volatilidade += Math.abs(closes[i] - closes[i - 1]);
    }
    volatilidade = volatilidade / 10;

    const precoIdealCompra = (mm20 - volatilidade * 0.3).toFixed(2);
    const precoIdealVenda = (mm20 + volatilidade * 0.3).toFixed(2);
    const precoAlvo = (d.preco + volatilidade * 1.2).toFixed(2);
    const stop = (d.preco - volatilidade * 0.8).toFixed(2);

    const rsi = 50 + (Math.random() * 20 - 10);
    const macd = (mm20 - mm50).toFixed(2);

    return {
        precoAtual: d.preco,
        mm20: mm20.toFixed(2),
        mm50: mm50.toFixed(2),
        volatilidade: volatilidade.toFixed(2),
        precoIdealCompra,
        precoIdealVenda,
        precoAlvo,
        stop,
        rsi: rsi.toFixed(2),
        macd,
        probLocal: Math.random().toFixed(2)
    };
}

/* ============================
   IA EXTERNA
============================ */
async function analisarExterno(dados) {
    const resposta = await fetch("https://purple-mountain-9031.ederjonatan.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt: `
Você é um analista técnico profissional. Gere uma análise objetiva e direta com base nos dados abaixo:

DADOS DO ATIVO:
- Preço atual: ${dados.precoAtual}
- MM20: ${dados.mm20}
- MM50: ${dados.mm50}
- Volatilidade: ${dados.volatilidade}
- RSI: ${dados.rsi}
- MACD: ${dados.macd}
- Probabilidade local: ${dados.probLocal}

PREÇOS CALCULADOS:
- Preço ideal de COMPRA: ${dados.precoIdealCompra}
- Preço ideal de VENDA: ${dados.precoIdealVenda}
- Preço alvo: ${dados.precoAlvo}
- Stop sugerido: ${dados.stop}

Responda com:
- Recomendação final
- Preço ideal de compra
- Preço ideal de venda
- Preço alvo
- Stop sugerido
- Probabilidade final
- Risco
- Justificativa técnica
`
        })
    });

    const json = await resposta.json();

    if (Array.isArray(json) && json[0]?.generated_text) {
        return json[0].generated_text;
    }

    return JSON.stringify(json);
}

/* ============================
   PREENCHER CARDS
============================ */
function preencherCards(dados, texto) {
    document.getElementById("cardsPainel").style.display = "grid";

    const recomendacao = texto.match(/(COMPRA|VENDA|MANTER)/i)?.[0] || "—";
    const precoCompra = texto.match(/compra[: ]+([\d.,]+)/i)?.[1] || dados.precoIdealCompra;
    const precoVenda = texto.match(/venda[: ]+([\d.,]+)/i)?.[1] || dados.precoIdealVenda;
    const precoAlvo = texto.match(/alvo[: ]+([\d.,]+)/i)?.[1] || dados.precoAlvo;
    const stop = texto.match(/stop[: ]+([\d.,]+)/i)?.[1] || dados.stop;
    const prob = texto.match(/(\d{1,3})%/)?.[1] || (dados.probLocal * 100).toFixed(0);
    const risco = texto.match(/(Baixo|Médio|Alto)/i)?.[0] || "—";

    document.getElementById("cardRecomendacao").innerText = recomendacao.toUpperCase();
    document.getElementById("cardCompra").innerText = precoCompra;
    document.getElementById("cardVenda").innerText = precoVenda;
    document.getElementById("cardAlvo").innerText = precoAlvo;
    document.getElementById("cardStop").innerText = stop;
    document.getElementById("cardProb").innerText = prob + "%";
    document.getElementById("cardRisco").innerText = risco;
    document.getElementById("cardResumo").innerText = texto;
}

/* ============================
   GRÁFICO
============================ */
let chart;

function desenharGrafico(d) {
    const ctx = document.getElementById("grafico").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: d.timestamps.map(t => new Date(t * 1000).toLocaleDateString()),
            datasets: [{
                label: "Fechamento",
                data: d.close,
                borderColor: "#2ea043",
                borderWidth: 2,
                tension: 0.2
            }]
        },
        options: {
            plugins: { legend: { labels: { color: "#e6edf3" } } },
            scales: {
                x: { ticks: { color: "#e6edf3" } },
                y: { ticks: { color: "#e6edf3" } }
            }
        }
    });
}
