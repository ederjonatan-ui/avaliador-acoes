const WORKER_URL = "https://throbbing-violet-ec59.ederjonatan.workers.dev";

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
        // ============================
        // 1) BUSCAR DADOS DO YAHOO
        // ============================
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

        // Extrair último preço
        const chart = dadosYahoo.chart?.result?.[0];
        if (!chart) {
            resultadoDiv.innerHTML = "<p style='color:red'>Ativo não encontrado.</p>";
            return;
        }

        const timestamps = chart.timestamp;
        const closes = chart.indicators.quote[0].close;
        const ultimoPreco = closes[closes.length - 1];

        resultadoDiv.innerHTML = `
            <p><strong>Ativo:</strong> ${ativo}</p>
            <p><strong>Último preço:</strong> R$ ${ultimoPreco.toFixed(2)}</p>
            <p>Gerando análise da IA...</p>
        `;

        // ============================
        // 2) GERAR ANÁLISE VIA IA
        // ============================
        const prompt = `Analise o ativo ${ativo} com base no preço atual de ${ultimoPreco}.`;

        const respostaIA = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        });

        const dadosIA = await respostaIA.json();

        let textoIA = "";

        if (Array.isArray(dadosIA) && dadosIA[0]?.generated_text) {
            textoIA = dadosIA[0].generated_text;
        } else {
            textoIA = JSON.stringify(dadosIA);
        }

        resultadoDiv.innerHTML = `
            <h3>Resultado</h3>
            <p><strong>Ativo:</strong> ${ativo}</p>
            <p><strong>Último preço:</strong> R$ ${ultimoPreco.toFixed(2)}</p>
            <h4>Análise da IA:</h4>
            <pre>${textoIA}</pre>
        `;

    } catch (erro) {
        resultadoDiv.innerHTML = `<p style='color:red'>Erro inesperado: ${erro.message}</p>`;
    }
}
