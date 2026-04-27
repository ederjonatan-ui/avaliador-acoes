// =========================
//  AUTOCOMPLETE
// =========================
async function buscarSugestoes(query) {
    if (!query) return [];

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=5&newsCount=0`;

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
//  GRÁFICOS
// =========================
let grafico, graficoRSI, graficoMACD;

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

// =========================
//  AVALIAÇÃO DO ATIVO
// =========================
async function avaliar() {
    const ticker = document.getElementById("ativo").value.trim().toUpperCase();
    const intervalo = document.getElementById("intervalo").value;

    if (!ticker) {
        alert("Digite um ativo válido.");
        return;
    }

    try {
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,financialData`;
        const resposta = await fetch(url);
        const dados = await resposta.json();

        if (!dados.quoteSummary || !dados.quoteSummary.result) {
            alert("Ativo não encontrado.");
            return;
        }

        const price = dados.quoteSummary.result[0].price;
        const financial = dados.quoteSummary.result[0].financialData;

        // =========================
        //  RESTAURADO: NOME + FECHAMENTO
        // =========================
        const nome = price.longName || ticker;
        const atual = price.regularMarketPrice.raw;
        const fechamento = price.regularMarketPreviousClose.raw;
        const alvo = financial.targetMeanPrice.raw;

        // =========================
        //  LÓGICA DE RECOMENDAÇÃO
        // =========================
        let recomendacao = "Neutro";
        if (alvo > atual * 1.10) recomendacao = "Comprar";
        if (alvo < atual * 0.90) recomendacao = "Vender";

        // =========================
        //  RESULTADO COMPLETO (RESTAURADO)
        // =========================
        document.getElementById("resultado").innerHTML = `
            <div class="card">
                <h2>${nome} (${ticker})</h2>
                <p>Último fechamento: R$ ${fechamento}</p>
                <p>Preço atual: R$ ${atual}</p>
                <p>Preço alvo: R$ ${alvo}</p>
                <p><strong>Recomendação: ${recomendacao}</strong></p>
            </div>
        `;

        // Atualiza listas
        atualizarListas(ticker, nome, recomendacao);

        // =========================
        //  GRÁFICOS (mantidos)
        // =========================
        carregarGraficos(ticker, intervalo);

    } catch (e) {
        console.error("Erro ao avaliar ativo:", e);
        alert("Erro ao buscar dados.");
    }
}

// =========================
//  LISTAS DE COMPRA / VENDA
// =========================
function atualizarListas(ticker, nome, recomendacao) {
    const listaComprar = document.getElementById("lista-comprar");
    const listaVender = document.getElementById("lista-vender");

    if (!listaComprar || !listaVender) return;

    const item = document.createElement("li");
    item.textContent = `${nome} (${ticker})`;

    if (recomendacao === "Comprar") {
        listaComprar.appendChild(item);
    } else if (recomendacao === "Vender") {
        listaVender.appendChild(item);
    }
}

// =========================
//  GRÁFICOS (mantidos)
// =========================
async function carregarGraficos(ticker, intervalo) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${intervalo}&range=6mo`;

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
//  COFRE
// =========================
let senha = "2207";
let entrada = "";

function pressKey(num) {
    if (entrada.length < 9) {
        entrada += num;
        document.getElementById("lock-display").textContent = "•".repeat(entrada.length);
    }
}

function unlockSite() {
    if (entrada === senha) {
        document.getElementById("lock-screen").style.display = "none";
        document.getElementById("main-app").classList.remove("hidden");
    } else {
        document.getElementById("lock-error").textContent = "Senha incorreta!";
        entrada = "";
        document.getElementById("lock-display").textContent = "••••";
    }
}
