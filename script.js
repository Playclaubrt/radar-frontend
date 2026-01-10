const API = "https://SEU-BACKEND.onrender.com/inmet";

function carregar(modo) {
    fetch(`${API}?modo=${modo}`)
        .then(r => r.json())
        .then(d => render(d))
        .catch(() => {
            document.getElementById("lista").innerText =
                "Erro ao carregar alertas";
        });
}

function render(dados) {
    const div = document.getElementById("lista");
    div.innerHTML = "";

    dados.alertas.forEach(a => {
        div.innerHTML += `
            <div class="alerta">
                <h3>${a.titulo}</h3>
                <p>${a.descricao}</p>
                <a href="${a.link}" target="_blank">Ver no INMET</a>
            </div>
        `;
    });
}