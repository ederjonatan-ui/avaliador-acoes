/* ==========================
   SISTEMA DE COFRE
========================== */

let senha = "2174";
let entrada = "";

function pressKey(num) {
    if (entrada.length < 4) {
        entrada += num;
        document.getElementById("lock-display").textContent = "••••".substring(0, entrada.length);
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

/* ==========================
   LISTAS AUTOMÁTICAS
========================== */

const listaComprar = document.getElementById("listaComprar");
const listaVender = document.getElementById("listaVender");

function atualizarListas(ticker, nomeEmpresa, recomendacao) {
    const li = document.createElement("li");
    li.textContent = `${nomeEmpresa} (${ticker})`;

    if (recomendacao.includes("Comprar") || recomendacao.includes("Buy")) {
        listaComprar.appendChild(li);
    }

    if (recomendacao.includes("Vender") || recomendacao.includes("Sell")) {
        listaVender.appendChild(li);
    }
}

/* ==========================
   AVALIAÇÃO DO ATIVO
========================== */

async function avaliar() {
    const ticker = document.getElementById("ativo").value.trim().toUpperCase();
    if (!ticker) return;

    document.getElementById("resultado").innerHTML = "Carregando...";

    try {
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=financialData,price,summaryDetail`;
        const resposta = await fetch(url);
        const json = await resposta.json();

        const price = json.quoteSummary.result[0].price;
        const financial = json.quoteSummary.result[0].financialData;

        const nome = price.longName || ticker;
        const atual = price.regularMarketPrice.raw;
        const alvo = financial.targetMeanPrice.raw;

        let recomendacao = "Neutro";
        if (alvo > atual * 1.10) recomendacao = "Comprar";
        if (alvo < atual * 0.90) recomendacao = "Vender";

        document.getElementById("resultado").innerHTML = `
            <h2>${nome} (${ticker})</h2>
            <p>Preço atual: R$ ${atual}</p>
            <p>Preço alvo: R$ ${alvo}</p>
            <p><strong>Recomendação: ${recomendacao}</strong></p>
        `;

        atualizarListas(ticker, nome, recomendacao);

    } catch (e) {
        document.getElementById("resultado").innerHTML = "Erro ao buscar dados.";
    }
}
