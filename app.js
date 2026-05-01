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
        const diferenca = alvo - atual;
        valor = atual - diferenca * 0.25;
    } else if (recomendacao === "Vender") {
        const variacao = atual - fechamento;
        valor = atual + variacao * 0.30;
    }

    return Number(valor.toFixed(2));
}

// =========================
// AVALIAÇÃO DO ATIVO
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

        const nome = price.longName || ticker;
        const atual = price.regularMarketPrice.raw;
        const fechamento = price.regularMarketPreviousClose.raw;
        const alvo = financial.targetMeanPrice.raw;

        let recomendacao = "Neutro";
        if (alvo > atual * 1.10) recomendacao = "Comprar";
        if (alvo < atual * 0.90) recomendacao = "Vender";

        const valorSugerido = calcularValorSugerido(recomendacao, atual, alvo, fechamento);
        const tipoSugestao = recomendacao === "Comprar" ? "Compra" :
                             recomendacao === "Vender" ? "Venda" : "Neutro";

        document.getElementById("resultado").innerHTML = `
            <div class="card">
                <h2>${nome} (${ticker})</h2>
                <p>Último fechamento: R$ ${fechamento.toFixed(2)}</p>
                <p>Preço atual: R$ ${atual.toFixed(2)}</p>
                <p>Preço alvo: R$ ${alvo.toFixed(2)}</p>
                <p><strong>Recomendação: ${recomendacao}</strong></p>
                <p><strong>Valor sugerido de ${tipoSugestao}: R$ ${valorSugerido.toFixed(2)}</strong></p>
            </div>
        `;

        atualizarListas(ticker, nome, recomendacao, valorSugerido, tipoSugestao, atual, alvo, fechamento);

        carregarGraficos(ticker, intervalo);

    } catch (e) {
        console.error("Erro ao avaliar ativo:", e);
        alert("Erro ao buscar dados.");
    }
}

// =========================
// LISTAS + TIMERS
// =========================
let timers = {};

function formatarTempo(segundos) {
    const m = String(Math.floor(segundos / 60)).padStart(2, "0");
    const s = String(segundos % 60).padStart(2, "0");
    return `${m}:${s}`;
}

function iniciarTimer(ticker) {
    const dados = timers[ticker];
    if (!dados) return;

    let tempo = 30;
    if (dados.recomendacao === "Comprar") tempo = 45;
    if (dados.recomendacao === "Vender") tempo = 20;

    if (dados.interval) clearInterval(dados.interval);

    const elemento = document.getElementById(`timer-${ticker}`);
    dados.tempo = tempo;

    dados.interval = setInterval(() => {
        dados.tempo--;

        if (elemento) {
            elemento.textContent = formatarTempo(dados.tempo);
        }

        if (dados.tempo <= 0) {
            clearInterval(dados.interval);
            moverParaListaOposta(ticker);
        }
    }, 1000);
}

function atualizarListas(ticker, nome, recomendacao, valorSugerido, tipoSugestao, atual, alvo, fechamento) {
    const listaComprar = document.getElementById("lista-comprar");
    const listaVender = document.getElementById("lista-vender");

    if (!listaComprar || !listaVender) return;

    const existente = document.querySelector(`li[data-ticker="${ticker}"]`);
    if (existente) existente.remove();

    const item = document.createElement("li");
    item.setAttribute("data-ticker", ticker);
    item.setAttribute("data-nome", nome);

    item.innerHTML = `
        <span>
            ${nome} (${ticker})<br>
            <small>Valor sugerido de ${tipoSugestao}: R$ ${valorSugerido.toFixed(2)}</small>
        </span>
        <span id="timer-${ticker}" class="timer-tag"></span>
    `;

    if (recomendacao === "Comprar") {
        listaComprar.appendChild(item);
    } else if (recomendacao === "Vender") {
        listaVender.appendChild(item);
    }

    timers[ticker] = {
        recomendacao,
        valorSugerido,
        tipoSugestao,
        atual,
        alvo,
        fechamento,
        elementoId: `timer-${ticker}`,
        interval: null,
        tempo: 0
    };

    iniciarTimer(ticker);
}

function moverParaListaOposta(ticker) {
    const dados = timers[ticker];
    if (!dados) return;

    const item = document.querySelector(`li[data-ticker="${ticker}"]`);
    if (!item) return;

    const nome = item.getAttribute("data-nome");
    const recomendacaoAtual = dados.recomendacao;

    item.remove();

    const novaRecomendacao = recomendacaoAtual === "Comprar" ? "Vender" : "Comprar";
    const novoValorSugerido = calcularValorSugerido(
        novaRecomendacao,
        dados.atual,
        dados.alvo,
        dados.fechamento
    );
    const novoTipo = novaRecomendacao === "Comprar" ? "Compra" : "Venda";

    atualizarListas(
        ticker,
        nome,
        novaRecomendacao,
        novoValorSugerido,
        novoTipo,
        dados.atual,
        dados.alvo,
        dados.fechamento
    );
}

// =========================
// COFRE
// =========================
let senha = "2207";
let entrada = "";

function pressKey(num) {
    if (entrada.length < senha.length) {
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

function mudarDia() {
    // placeholder
}
