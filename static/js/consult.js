document.addEventListener('DOMContentLoaded', () => {
    // --- BANCO DE DADOS DAS DEFINIÇÕES (Extraído do script de treino) ---
    const definitions = {
        terapeuta: [
            { name: "Solicitação de Relato (SRE)", definition: "Contempla verbalizações do terapeuta nas quais ele solicita ao cliente descrições de ações, eventos, sentimentos ou pensamentos. Ocorre tipicamente em situações relacionadas à coleta de dados e ao levantamento de informações ao longo de qualquer etapa do processo terapêutico." },
            { name: "Facilitação (FAC)", definition: "É caracterizada por verbalizações curtas ou expressões paralinguísticas que ocorrem durante a fala do cliente. Tipicamente, estas verbalizações indicam atenção ao relato do cliente e sugerem a sua continuidade." },
            { name: "Empatia (EMP)", definition: "Contempla ações ou verbalizações do terapeuta que sugerem acolhimento, aceitação, cuidado, entendimento, validação da experiência ou sentimento do cliente." },
            { name: "Informação (INF)", definition: "Contempla verbalizações nas quais o terapeuta relata eventos ou informa o cliente sobre eventos (que não o comportamento do cliente ou de terceiros), estabelecendo ou não relações causais ou explicativas entre eles." },
            { name: "Solicitação de Reflexão (SRF)", definition: "Contempla verbalizações nas quais o terapeuta solicita ao cliente qualificações, explicações, interpretações, análises ou previsões a respeito de qualquer tipo de evento." },
            { name: "Recomendação (REC)", definition: "Contempla verbalizações nas quais o terapeuta sugere alternativas de ação ao cliente ou solicita o seu engajamento em ações ou tarefas. Deve ser utilizada quando o terapeuta especifica a resposta a ser (ou não) emitida pelo cliente. A literatura refere-se a essa categoria também como aconselhamento, orientação, comando, ordem." },
            { name: "Interpretação (INT)", definition: "Contempla verbalizações nas quais o terapeuta descreve, supõe ou infere relações causais e/ou explicativas (funcionais, correlacionais, ou de continuidade) a respeito do comportamento do cliente ou de terceiros, ou identifica padrões de interação do cliente e/ou de terceiros." },
            { name: "Aprovação (APR)", definition: "Contempla verbalizações do terapeuta que sugerem avaliação ou julgamento favoráveis a respeito de ações, pensamentos, características ou avaliações do cliente." },
            { name: "Reprovação (REP)", definition: "Contempla verbalizações do terapeuta que sugerem avaliação ou julgamento desfavoráveis a respeito de ações, pensamentos, características ou avaliações do cliente." },
            { name: "Outras verbalizações do terapeuta (TOU)", definition: "Contempla verbalizações do terapeuta não classificáveis nas categorias anteriores, como comentários ocasionais alheios ao tema em discussão, cumprimentos ou acertos de horário." }
        ],
        cliente: [
            { name: "Relato (REL)", definition: "Contempla verbalizações nas quais o cliente descreve ou informa ao terapeuta a ocorrência de eventos, ou aspectos relativos a eventos, respostas emocionais suas ou de terceiros, seus estados motivacionais e/ou tendências a ações, sem estabelecer relações causais ou funcionais entre eles." },
            { name: "Relações (CER)", definition: "Contempla verbalizações nas quais o cliente estabelece relações causais e/ou explicativas (funcionais, correlacionais ou de contiguidade) entre eventos, descrevendo-as de forma explícita ou sugerindo-as por meio de metáforas ou analogias." },
            { name: "Concordância (CON)", definition: "Contempla verbalizações nas quais o cliente expressa julgamento ou avaliação favoráveis a respeito de afirmações, sugestões, análises ou outros comportamentos emitidos pelo terapeuta ou relata satisfação, esperança ou confiança no terapeuta e/ou no processo terapêutico. Inclui também verbalizações nas quais o cliente complementa ou resume a fala do terapeuta ou episódios nos quais o cliente sorri em concordância com o terapeuta." },
            { name: "Oposição (OPO)", definition: "Contempla verbalizações nas quais o cliente expressa discordância, julgamento ou avaliação desfavoráveis a respeito de afirmações, sugestões, análises ou outros comportamentos emitidos pelo terapeuta." },
            { name: "Melhora (MEL)", definition: "Contempla verbalizações nas quais o cliente relata mudanças satisfatórias com relação à sua queixa clínica, problemas médicos, comportamentos relacionados à sua queixa, ou comportamentos considerados, pelo cliente ou pelo terapeuta, como indesejáveis ou inadequados (independentemente da concordância de ambos quanto à melhora)." },
            { name: "Meta (MET)", definition: "Contempla verbalizações do cliente nas quais ele descreve seus projetos, planos ou estratégias para a solução de problemas trazidos como queixas para a terapia." },
            { name: "Solicitação (SOL)", definition: "Contempla verbalizações nas quais o cliente apresenta pedidos ou questões ao terapeuta." },
            { name: "Outras Vocal Cliente (COU)", definition: "Esta categoria contempla verbalizações do cliente não classificáveis nas categorias anteriores. Inclui também verbalizações do cliente ao cumprimentar o terapeuta em sua chegada ou partida, anúncios de interrupções ou comentários ocasionais alheios ao tema em discussão." }
        ]
    };

    function createGuideModal() {
        // Cria o botão flutuante
        const fab = document.createElement('button');
        fab.className = 'guide-fab hidden';
        fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> Categorias`;
        
        // Adiciona o botão ao painel de controle (cabeçalho)
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            controlPanel.appendChild(fab);
        }

        // Cria o overlay do modal
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'guide-modal-overlay hidden';
        
        // Cria o conteúdo do modal
        modalOverlay.innerHTML = `
            <div class="guide-container">
                <button class="guide-close-btn">&times;</button>
                <div class="guide-tabs">
                    <button class="guide-tab-btn active" data-tab="terapeuta">Terapeuta</button>
                    <button class="guide-tab-btn" data-tab="cliente">Cliente</button>
                </div>
                <div id="guide-content-terapeuta"></div>
                <div id="guide-content-cliente" class="hidden"></div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        const guideContainer = modalOverlay.querySelector('.guide-container');
        const contentTerapeuta = modalOverlay.querySelector('#guide-content-terapeuta');
        const contentCliente = modalOverlay.querySelector('#guide-content-cliente');

        // Popula as abas com as definições
        definitions.terapeuta.forEach(cat => {
            contentTerapeuta.innerHTML += `
                <div class="guide-category">
                    <h3>${cat.name}</h3>
                    <p>${cat.definition}</p>
                </div>
            `;
        });
        definitions.cliente.forEach(cat => {
            contentCliente.innerHTML += `
                <div class="guide-category">
                    <h3>${cat.name}</h3>
                    <p>${cat.definition}</p>
                </div>
            `;
        });

        // --- LÓGICA DE EVENTOS ---
        // Mostra o botão quando a sessão principal iniciar
        window.addEventListener('session-started', () => {
            fab.classList.remove('hidden');
        });

        fab.addEventListener('click', () => modalOverlay.classList.remove('hidden'));
        modalOverlay.querySelector('.guide-close-btn').addEventListener('click', () => modalOverlay.classList.add('hidden'));
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.add('hidden');
            }
        });

        const tabs = modalOverlay.querySelectorAll('.guide-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (tab.dataset.tab === 'terapeuta') {
                    contentTerapeuta.classList.remove('hidden');
                    contentCliente.classList.add('hidden');
                } else {
                    contentCliente.classList.remove('hidden');
                    contentTerapeuta.classList.add('hidden');
                }
            });
        });
    }

    // Inicia a criação do modal assim que o DOM estiver pronto
    createGuideModal();
});
