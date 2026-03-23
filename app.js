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
    if (v
