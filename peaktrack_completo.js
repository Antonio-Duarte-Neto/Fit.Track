const STORAGE_KEY = "peaktrack_db";

const db = JSON.parse(
    localStorage.getItem(STORAGE_KEY)
) || {
    treinos: [],
    historico: []
};

// Compatibilidade com versões antigas

if (!db.historico) {
    db.historico = [];
}

let treinoAtual = null;
let treinoEmExecucao = false;
let inicioTreino = null;
let cronometroInterval = null;
let tempoAcumulado = 0;
let treinoPausado = false;

function saveDB() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(db)
    );
}

/* =====================
NAVEGAÇÃO
===================== */

const navButtons =
    document.querySelectorAll(".nav-item");

const screens =
    document.querySelectorAll(".screen");

navButtons.forEach(btn => {

    btn.addEventListener("click", () => {

        navButtons.forEach(item =>
            item.classList.remove("active")
        );

        btn.classList.add("active");

        const target =
            btn.dataset.screen;

        screens.forEach(screen =>
            screen.classList.remove("active")
        );

        document
            .getElementById(target)
            .classList.add("active");

        document
            .getElementById("screen-title")
            .textContent =
            btn.textContent.trim();

    });

});

/* =====================
TREINOS
===================== */

document
    .getElementById("btnNewWorkout")
    .addEventListener("click", createWorkout);



function createWorkout() {// Criar novo treino

    const nome =
        prompt("Digite o nome do treino:");

    if (!nome) return;

    const treino = {
        id: Date.now(),
        nome: nome.trim(),
        exercicios: [],
        criadoEm: new Date().toISOString()
    };

    db.treinos.push(treino);

    saveDB();

    renderWorkouts();

}

function deleteWorkout(id) { // Excluir treino

    const confirmar =
        confirm(
            "Deseja excluir este treino?"
        );

    if (!confirmar) return;

    db.treinos =
        db.treinos.filter(
            treino => treino.id !== id
        );

    saveDB();

    renderWorkouts();

}

function openWorkout(id) { // Abrir treino

    treinoAtual = db.treinos.find( // Encontrar treino pelo ID
        treino => treino.id === id
    );

    if (!treinoAtual) { // Se não encontrar treino, exibir alerta
        alert("Treino não encontrado");
        return;
    }

    if (!treinoAtual.exercicios) { // Se não houver exercícios, inicializar array vazio
        treinoAtual.exercicios = [];
    }

    treinoAtual.exercicios.forEach(exercicio => { // Garantir que cada exercício tenha a propriedade "expanded" definida

        if (exercicio.expanded === undefined) { // Se não estiver definido, inicializar como false
            exercicio.expanded = false;
        }

    });

    renderExercises();

    screens.forEach(s => s.classList.remove("active"));

    document.getElementById("treinoAberto").classList.add("active");

    document.getElementById("screen-title").textContent =
        treinoAtual.nome;
}

function addExercise() { // Adicionar exercício

    if (!treinoAtual) return;

    const nome = prompt("Nome do exercício:");

    if (!nome) return;

    treinoAtual.exercicios.push({
        id: Date.now(),
        nome: nome.trim(),
        expanded: false,
        anotacoes: "",
        series: []
    });
    saveDB();
    renderExercises();
}

function deleteExercise(id) { // Excluir exercício

    const confirmar =
        confirm(
            "Deseja excluir este exercício?"
        );

    if (!confirmar) return;

    treinoAtual.exercicios =
        treinoAtual.exercicios.filter(
            exercicio => exercicio.id !== id
        );

    saveDB();

    renderExercises();

}

function addSerie(exercicioId) { // Adicionar série ap exercicio

    const exercicio = treinoAtual.exercicios.find(
        e => e.id === exercicioId
    );

    if (!exercicio) return;

    const carga = prompt("Carga (kg):");
    const reps = prompt("Repetições:");

    if (!carga || !reps) return;

    const novaSerie = {
        id: Date.now(),

        carga: parseFloat(carga),
        reps: parseInt(reps),

        cargaExecutada: null,
        repsExecutadas: null,

        anotacoes: "",

        concluida: false
    };

    if (!exercicio.series) {
        exercicio.series = [];
    }

    exercicio.series.push(novaSerie);

    // 🔥 ESSENCIAL: garantir sync com DB principal
    const treinoIndex = db.treinos.findIndex(
        t => t.id === treinoAtual.id
    );

    if (treinoIndex !== -1) {
        db.treinos[treinoIndex] = treinoAtual;
    }

    saveDB();
    renderExercises();
}

function atualizarAnotacoesExercicio(exercicioId, anotacoes) {   // Atualizar anotações da série
    const exercicio = treinoAtual.exercicios.find(
        e => e.id === exercicioId
    );

    if (!exercicio) return;

    exercicio.anotacoes = anotacoes;

    saveDB();
}

function deleteSerie(exercicioId, serieId) {   // Excluir série do exercicio


    const confirmar =
        window.confirm( // Confirmar exclusão
            "Deseja excluir esta série?"
        );

    if (!confirmar) {
        return;
    }

    const exercicio = treinoAtual.exercicios.find(
        e => e.id === exercicioId // Encontrar exercício pelo ID
    );

    if (!exercicio) {
        return;
    }

    exercicio.series = exercicio.series.filter(
        s => s.id !== serieId
    );

    saveDB();
    renderExercises();
}


function startWorkout() {

    if (treinoEmExecucao) return;

    treinoEmExecucao = true;
    treinoPausado = false;

    inicioTreino = Date.now();

    clearInterval(cronometroInterval);
    cronometroInterval = setInterval(updateTimer, 1000);

    updateTimer();
    renderExercises();
}

function updateTimer() { // Atualizar cronômetro

    if (!inicioTreino) return;

    const elapsed = /* Tempo total em segundos */
        Math.floor(
            (Date.now() - inicioTreino) / 1000
        ) + tempoAcumulado;

    const h = /* Horas */
        String(Math.floor(elapsed / 3600))
            .padStart(2, "0");

    const m = /* Minutos */
        String(Math.floor((elapsed % 3600) / 60))
            .padStart(2, "0");

    const s =/* Segundos */
        String(elapsed % 60)
            .padStart(2, "0");

    document.getElementById("timer")
        .textContent = `${h}:${m}:${s}`;
}

function pauseWorkout() {

    if (!treinoEmExecucao || treinoPausado) return;

    clearInterval(cronometroInterval);

    tempoAcumulado += Math.floor(
        (Date.now() - inicioTreino) / 1000
    );

    treinoPausado = true;
}

function resumeWorkout() {

    if (!treinoEmExecucao || !treinoPausado) return;

    inicioTreino = Date.now();

    clearInterval(cronometroInterval);
    cronometroInterval = setInterval(updateTimer, 1000);

    treinoPausado = false;

    updateTimer();
}

function finishWorkout() { // Finalizar treino

    console.log("ENTROU NO FINISH");

    let todasConcluidas = true;

    let volumeTotal = 0;

    treinoAtual.exercicios.forEach(exercicio => {

        exercicio.series.forEach(serie => {

            if (!serie.concluida) {
                todasConcluidas = false;
            }

            const cargaReal =
                Number.isFinite(serie.cargaExecutada)
                    ? serie.cargaExecutada
                    : serie.carga;

            const repsReal =
                Number.isFinite(serie.repsExecutadas)
                    ? serie.repsExecutadas
                    : serie.reps;

            if (serie.concluida) { // Somar ao volume total apenas se a série foi concluída

                volumeTotal +=
                    cargaReal * repsReal;

            }

        });

    });

    if (!todasConcluidas) {

        alert(
            "Finalize todas as séries antes de encerrar o treino."
        );

        return;
    }

    clearInterval(cronometroInterval);

    const duracao = /* Se o treino estiver pausado, usar o tempo acumulado; caso contrário, calcular o tempo atual */
        treinoPausado
            ? tempoAcumulado
            : getTempoAtual();

    /* EVOLUÇÃO AUTOMÁTICA */

    treinoAtual.exercicios.forEach(exercicio => {

        exercicio.series.forEach(serie => {

            if (
                serie.cargaExecutada &&
                serie.cargaExecutada > serie.carga
            ) {

                serie.carga =
                    serie.cargaExecutada;

            }

            serie.cargaExecutada = null;
            serie.repsExecutadas = null;

            serie.concluida = false;

        });

    });

    const exerciciosHistorico =
        JSON.parse(
            JSON.stringify(treinoAtual.exercicios)
        );

    exerciciosHistorico.forEach(exercicio => {
        exercicio.expanded = false;
    });

    db.historico.push({

        id: Date.now(),

        treinoId: treinoAtual.id,

        treinoNome: treinoAtual.nome,

        data: new Date().toISOString(),

        volume: volumeTotal,

        duracao: duracao,

        expanded: false,

        exercicios: exerciciosHistorico

    });

    console.log("Treino salvo no histórico");
    console.log(db.historico);

    saveDB();

    renderHistory();
    renderStats();

    treinoEmExecucao = false;
    treinoPausado = false;
    tempoAcumulado = 0;
    inicioTreino = null;

    renderExercises();

    alert(
        `Treino concluído!\n\n` +
        `Volume: ${volumeTotal} kg\n` +
        `Tempo: ${Math.floor(duracao / 60)} min`
    );

}

function toggleHistory(historicoId) {
    const treino = db.historico.find(
        h => h.id === historicoId
    );

    if (!treino) return;

    treino.expanded = !treino.expanded;
    saveDB();
    renderHistory();
}

function toggleHistoryExercise(
    historicoId,
    exercicioId
) {
    const treino = db.historico.find(
        h => h.id === historicoId
    );

    if (!treino) return;

    const exercicio = treino.exercicios.find(
        e => e.id === exercicioId
    );

    if (!exercicio) return;

    exercicio.expanded = !exercicio.expanded;
    saveDB();
    renderHistory();
}

function toggleExercise(exercicioId) { // Expandir ou recolher a aba do exercício

    const exercicio =
        treinoAtual.exercicios.find(
            e => e.id === exercicioId
        );

    if (!exercicio) return;

    exercicio.expanded =
        !exercicio.expanded;

    saveDB();

    renderExercises();
}

function toggleSerie(exercicioId, serieId) { // Marcar ou desmarcar série como concluída

    const exercicio =
        treinoAtual.exercicios.find(
            e => e.id === exercicioId
        );

    if (!exercicio) return;

    const serie =
        exercicio.series.find(
            s => s.id === serieId
        );

    if (!serie) return;

    serie.concluida =
        !serie.concluida;

    saveDB();

    renderExercises();

    verificarFimTreino();
}
function verificarFimTreino() { // Verificar se todas as séries foram concluídas

    let todasConcluidas = true;

    treinoAtual.exercicios.forEach(exercicio => {

        exercicio.series.forEach(serie => {

            if (!serie.concluida) {
                todasConcluidas = false;
            }

        });

    });

    if (todasConcluidas && treinoEmExecucao) {

        const finalizar = confirm(
            "Todas as séries foram concluídas.\n\nDeseja finalizar o treino?"
        );

        if (finalizar) {
            finishWorkout();
        }

    }
}

function atualizarCarga( // Atualizar carga executada da série
    exercicioId,
    serieId,
    valor
) {

    const exercicio =
        treinoAtual.exercicios.find(
            e => e.id === exercicioId
        );

    if (!exercicio) return;

    const serie =
        exercicio.series.find(
            s => s.id === serieId
        );

    if (!serie) return;

    const carga = parseFloat(valor);
    serie.cargaExecutada = isNaN(carga) ? null : carga;

    saveDB();
}

function atualizarReps(
    exercicioId,
    serieId,
    valor
) {

    const exercicio =
        treinoAtual.exercicios.find(
            e => e.id === exercicioId
        );

    if (!exercicio) return;

    const serie =
        exercicio.series.find(
            s => s.id === serieId
        );

    if (!serie) return;

    const reps = parseInt(valor);
    serie.repsExecutadas = isNaN(reps) ? null : reps;

    saveDB();
}

function renderHistory() { // Renderizar histórico de treinos

    const container =
        document.getElementById("historyList");

    if (!container) return;

    container.innerHTML = "";

    if (db.historico.length === 0) {

        container.innerHTML =
            "<p>Nenhum treino executado ainda.</p>";

        return;
    }

    const historicoOrdenado =
        [...db.historico].reverse();

    historicoOrdenado.forEach(item => {

        const card =
            document.createElement("div");

        card.className =
            "history-card";

        const data =
            new Date(item.data)
                .toLocaleDateString("pt-BR");

        const minutos =
            Math.floor(item.duracao / 60);

        card.innerHTML = `

        <div class="history-header"
            onclick="toggleHistory(${item.id})"
            style="cursor:pointer;"
        >
        
           <div>

                 <div class="history-date">
                     ${data}
                  </div>

                     <h3>

                         ${item.expanded ? "▼" : "►"}

                         ${item.treinoNome}

                      </h3>
    
              </div>

         </div>

    <div class="history-volume">
        <strong>Volume:</strong> 
        ${item.volume.toLocaleString()} kg
    </div>

    <div class="history-volume">
        <strong>Tempo:</strong>
         ${minutos} min
    </div>

    <hr style="margin:15px 0; opacity:.2;">

    ${item.expanded && item.exercicios
                ? item.exercicios.map(exercicio => `

                <div class="history-exercise">

                    <h4
                    
                        onclick="toggleHistoryExercise(${item.id}, ${exercicio.id})"
                        style="cursor:pointer;"
                    >
                        ${exercicio.expanded ? "▼" : "►"}
                        ${exercicio.nome}
                    </h4>

                    ${exercicio.expanded
                        ? `
         ${(exercicio.series || []).map((serie, index) => `
            <div class="history-serie">

                <strong>Série ${index + 1}</strong><br>

                Planejado:
                ${serie.carga} kg × ${serie.reps} reps
                <br>

                Executado:
                ${serie.cargaExecutada ?? serie.carga} kg ×
                ${serie.repsExecutadas ?? serie.reps} reps

            </div>
        `).join("")}

         ${
            exercicio.anotacoes &&
             exercicio.anotacoes.trim() !== ""
                 ? `
                    <div class="history-notes">
                        <strong>Anotações:</strong><br>
                        ${exercicio.anotacoes}
                    </div>
                `
                 : ""
    }
    `
                        : ""
                    }
</div>

`).join("")

: "<p>Treino antigo (sem detalhes).</p>"

                }
                `;

        container.appendChild(card);

    });

}

function renderStats() { // Renderizar estatísticas gerais

    let maiorVolume = 0;
    let maiorCarga = 0;
    let tempoTotal = 0;

    db.historico.forEach(treino => {

        maiorVolume =
            Math.max(maiorVolume, treino.volume);

        tempoTotal += treino.duracao;

    });

    db.treinos.forEach(treino => {

        treino.exercicios?.forEach(exercicio => {

            exercicio.series?.forEach(serie => {

                maiorCarga =
                    Math.max(
                        maiorCarga,
                        serie.carga || 0
                    );

            });

        });

    });

    const bestVolume =
        document.getElementById("bestVolume");

    const bestCarga =
        document.getElementById("bestCarga");

    const bestWorkout =
        document.getElementById("bestWorkout");

    const totalTime =
        document.getElementById("totalTime");

    if (bestVolume)
        bestVolume.textContent =
            maiorVolume.toLocaleString();

    if (bestCarga)
        bestCarga.textContent =
            maiorCarga;

    if (bestWorkout)
        bestWorkout.textContent =
            db.historico.length;

    if (totalTime)
        totalTime.textContent =
            Math.floor(tempoTotal / 60) + " min";
}
function getTempoAtual() { // Obter tempo atual do treino em execução

    if (!inicioTreino) return 0;

    return tempoAcumulado +
        Math.floor(
            (Date.now() - inicioTreino) / 1000
        );
}

function updateTimer() { // Atualizar cronômetro na tela

    const elapsed = getTempoAtual();

    const h =
        String(Math.floor(elapsed / 3600))
            .padStart(2, "0");

    const m =
        String(Math.floor((elapsed % 3600) / 60))
            .padStart(2, "0");

    const s =
        String(elapsed % 60)
            .padStart(2, "0");

    const timer =
        document.getElementById("timer");

    if (timer) {

        timer.textContent =
            `${h}:${m}:${s}`;

    }
}

/* =====================
RENDERIZAÇÃO
===================== */

function renderWorkouts() { // Renderizar lista de treinos

    const container =
        document.getElementById(
            "workoutList"
        );

    container.innerHTML = "";

    if (db.treinos.length === 0) {

        container.innerHTML =
            "<p>Nenhum treino cadastrado.</p>";

        return;
    }

    db.treinos.forEach(treino => {

        const card =
            document.createElement("div");

        card.className =
            "workout-card";

        card.onclick = () => openWorkout(treino.id);

        card.innerHTML = `
    <div class="workout-header">

        <div class="workout-title">
            ${treino.nome}
        </div>

        <div class="workout-actions">

            <button
                class="btn-action"
                onclick="event.stopPropagation(); deleteWorkout(${treino.id})">
                Excluir
            </button>

        </div>

    </div>
`;

        container.appendChild(card);

    });

}
function renderExercises() { // Renderizar lista de exercícios do treino atual
    const container =
        document.getElementById("treinoAberto");

    container.innerHTML = `
        <div class="section-top">

            <h2>${treinoAtual.nome}</h2>

            <button
                class="btn-primary"
                onclick="addExercise()">

                + Exercício

            </button>

        </div>

        <div class="execution-bar">

           <span id="timer"></span>

            <button
                class="btn-primary"
                onclick="startWorkout()">

                Iniciar

            </button>

            <button
                class="btn-action"
                onclick="pauseWorkout()">

                Pausar

            </button>

            <button
                class="btn-action"
                onclick="resumeWorkout()">

                Retomar

            </button>

            <button
                class="btn-primary"
                onclick="finishWorkout()">

                Finalizar

            </button>

        </div>

        <div id="exerciseList"></div>
    `;

    if (treinoEmExecucao) {
        updateTimer();
    }

    const exerciseList =
        document.getElementById("exerciseList");

    treinoAtual.exercicios.forEach(exercicio => {

        const card =
            document.createElement("div");

        card.className =
            "workout-card";

        card.innerHTML = `

            <div class="workout-header"> 

                <div
                    class="workout-title"
                    onclick="toggleExercise(${exercicio.id})"
                    style="cursor:pointer;">

                    ${exercicio.expanded ? "▼" : "►"}
                    ${exercicio.nome}

                </div>

                <div class="workout-actions">

                    <button
                        class="btn-action"
                        onclick="event.stopPropagation(); addSerie(${exercicio.id})">

                        + Série

                    </button>

                    <button
                        class="btn-action"
                        onclick="event.stopPropagation(); deleteExercise(${exercicio.id})">

                        Excluir

                    </button>

                </div>

            </div>

            ${exercicio.expanded ? `

            <div class="series-table">

                ${exercicio.series.map(serie => `

                    <div class="series-row">

                        <!-- PLANEJADO -->

                        <input
                            type="text"
                            disabled
                            value="${serie.carga} kg"
                        />

                        <input
                            type="text"
                            disabled
                            value="${serie.reps} reps"
                        />

                        <!-- EXECUTADO -->

                        <input
                            type="number"
                            placeholder="Carga feita"
                            value="${serie.cargaExecutada ?? ''}"
                            ${!treinoEmExecucao ? "disabled" : ""}
                            onchange="
                                atualizarCarga(
                                    ${exercicio.id},
                                    ${serie.id},
                                    this.value
                                )
                            "
                        >

                        <input
                            type="number"
                            placeholder="Reps feitas"
                            value="${serie.repsExecutadas ?? ''}"
                            ${!treinoEmExecucao ? "disabled" : ""}
                            onchange="
                                atualizarReps(
                                    ${exercicio.id},
                                    ${serie.id},
                                    this.value
                                )
                            "
                        >


                        <button
                            class="${serie.concluida ? 'btn-finished' : 'btn-complete'}"
                            onclick="toggleSerie(${exercicio.id}, ${serie.id})">

                            ${serie.concluida ? '✓ Concluído' : 'Concluir'}

                        </button>

                        <!-- EXCLUIR -->

                        <button
                            class="btn-delete-series"
                            onclick="deleteSerie(${exercicio.id}, ${serie.id})">

                            X

                        </button>

                    </div>

                `).join("")}

            </div>

            <textarea
                class="exercise-notes"
                placeholder="Anotações..."
                ${!treinoEmExecucao ? "disabled" : ""}
                onchange="

                    atualizarAnotacoesExercicio(${exercicio.id}, this.value)

                "
            >${exercicio.anotacoes ?? ""}</textarea>

            ` : ""}

        `;

        exerciseList.appendChild(card);

    });

}


/* =====================
INICIALIZAÇÃO
===================== */

renderWorkouts();
renderHistory();
renderStats();