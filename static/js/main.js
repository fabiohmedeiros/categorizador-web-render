document.addEventListener('DOMContentLoaded', () => {
    // --- DEFINIÇÃO DE CATEGORIAS (do script original) ---
    const CATEGORIAS = {
        "TERAPEUTA": {
            "Solicitação de relato": { "abbr": "SRE" },
            "Facilitação": { "abbr": "FAC" },
            "Empatia": { "abbr": "EMP" },
            "Informação": { "abbr": "INF" },
            "Solicitação de Reflexão": { "abbr": "SRF" },
            "Recomendação": { "abbr": "REC" },
            "Interpretação": { "abbr": "INT" },
            "Aprovação": { "abbr": "APR" },
            "Reprovação": { "abbr": "REP" },
            "Outras verbalizações do terapeuta": { "abbr": "TOU" }
        },
        "CLIENTE": {
            "Solicitação": { "abbr": "SOL" },
            "Relato": { "abbr": "REL" },
            "Melhora": { "abbr": "MEL" },
            "Metas": { "abbr": "MET" },
            "Relações": { "abbr": "CER" },
            "Concordância": { "abbr": "CON" },
            "Oposição": { "abbr": "OPO" },
            "Outras verbalizações do cliente": { "abbr": "COU" }
        }
    };

    // --- ESTADO DA APLICAÇÃO ---
    let dialogueData = [];
    let currentWordIndex = -1;
    let selectedWordIndices = [];
    let sessionStartTime; // <-- NOVO: Para o cronômetro

    // --- ELEMENTOS DO DOM ---
    const videoUpload = document.getElementById('video-upload');
    const csvUpload = document.getElementById('csv-upload');
    const startButton = document.getElementById('start-button');
    const finishButton = document.getElementById('finish-button');
    const resultFilenameInput = document.getElementById('result-filename');
    const videoPlayer = document.getElementById('video-player');
    const dialogueContainer = document.getElementById('dialogue-container');
    const contextMenu = document.getElementById('context-menu');
    const loadingOverlay = document.getElementById('loading-overlay');
    const uploadSection = document.getElementById('upload-section');
    const finishSection = document.getElementById('finish-section');
    const mainContent = document.getElementById('main-content');
    // --- NOVOS ELEMENTOS ---
    const sessionCompleteScreen = document.getElementById('session-complete-screen');
    const totalTimeSpan = document.getElementById('total-time');
    const restartSessionButton = document.getElementById('restart-session-button');


    // --- VERIFICAÇÃO INICIAL DE ELEMENTOS ---
    const requiredElements = {
        videoUpload, csvUpload, startButton, finishButton, resultFilenameInput,
        videoPlayer, dialogueContainer, contextMenu, loadingOverlay, uploadSection,
        finishSection, mainContent, sessionCompleteScreen, totalTimeSpan, restartSessionButton
    };

    for (const [name, el] of Object.entries(requiredElements)) {
        if (!el) {
            console.error(`[Erro Crítico] Elemento do DOM não encontrado: #${name}. A aplicação não pode iniciar.`);
            alert(`Erro de inicialização: O elemento #${name} não foi encontrado. Verifique o HTML.`);
            return; // Impede a execução do resto do script
        }
    }

    // --- INICIALIZAÇÃO ---
    function setupEventListeners() {
        startButton.addEventListener('click', handleStartSession);
        finishButton.addEventListener('click', handleFinish);
        videoPlayer.addEventListener('timeupdate', syncTextToVideo);
        dialogueContainer.addEventListener('click', handleWordClick);
        document.addEventListener('keyup', handleKeyup);
        restartSessionButton.addEventListener('click', () => location.reload()); // <-- NOVO
        
        // Eventos do menu de contexto
        dialogueContainer.addEventListener('contextmenu', showContextMenu);
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });
    }

    // --- FUNÇÃO HELPER PARA FORMATAR TEMPO ---
    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    // --- Manipulador de Teclado ---
    function handleKeyup(event) {
        if (document.activeElement.tagName === 'INPUT') {
            return;
        }
        if (event.code === 'Space') {
            event.preventDefault();
            if (videoPlayer.paused) {
                videoPlayer.play();
            } else {
                videoPlayer.pause();
            }
        }
    }

    // --- FUNÇÕES PRINCIPAIS ---
    async function handleStartSession() {
        const videoFile = videoUpload.files[0];
        const csvFile = csvUpload.files[0];
        if (!videoFile || !csvFile) {
            alert('Por favor, selecione um arquivo de vídeo e um arquivo CSV.');
            return;
        }
        loadingOverlay.classList.remove('hidden');
        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('csv', csvFile);
        try {
            const uploadResponse = await fetch('/upload', { method: 'POST', body: formData });
            if (!uploadResponse.ok) throw new Error('Falha no upload dos arquivos.');
            const uploadResult = await uploadResponse.json();
            const dataResponse = await fetch(uploadResult.data_url);
            if (!dataResponse.ok) throw new Error('Falha ao buscar dados da transcrição.');
            dialogueData = await dataResponse.json();
            renderDialogue();
            videoPlayer.src = uploadResult.video_url;
            uploadSection.classList.add('hidden');
            mainContent.classList.remove('hidden');
            finishSection.classList.remove('hidden');

            sessionStartTime = Date.now(); // <-- NOVO: Inicia o cronômetro
        } catch (error) {
            console.error('Erro ao iniciar sessão:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    function renderDialogue() {
        dialogueContainer.innerHTML = '';
        let currentSpeaker = null;
        let speakerBlock;
        dialogueData.forEach((wordData, index) => {
            if (wordData.speaker !== currentSpeaker) {
                currentSpeaker = wordData.speaker;
                speakerBlock = document.createElement('div');
                speakerBlock.className = 'speaker-block';
                const speakerName = document.createElement('div');
                speakerName.className = 'speaker-name';
                speakerName.textContent = currentSpeaker;
                speakerBlock.appendChild(speakerName);
                dialogueContainer.appendChild(speakerBlock);
            }
            const wordSpan = document.createElement('span');
            wordSpan.className = 'word';
            wordSpan.textContent = wordData.word + ' ';
            wordSpan.dataset.index = index;
            wordSpan.dataset.start = wordData.start;
            if (wordData.categoria) {
                wordSpan.classList.add(wordData.categoria);
            }
            speakerBlock.appendChild(wordSpan);
        });
    }

    function syncTextToVideo() {
        const currentTime = videoPlayer.currentTime;
        let foundIndex = -1;
        const startSearch = Math.max(0, currentWordIndex - 5);
        for (let i = startSearch; i < dialogueData.length; i++) {
            const item = dialogueData[i];
            if (currentTime >= item.start && currentTime < item.end) {
                foundIndex = i;
                break;
            }
        }

        if (foundIndex !== -1 && foundIndex !== currentWordIndex) {
            if (currentWordIndex !== -1) {
                const oldWord = dialogueContainer.querySelector(`[data-index='${currentWordIndex}']`);
                if (oldWord) oldWord.classList.remove('highlight');
            }
            
            const newWord = dialogueContainer.querySelector(`[data-index='${foundIndex}']`);
            if (newWord) {
                newWord.classList.add('highlight');
                
                const containerRect = dialogueContainer.getBoundingClientRect();
                const wordRect = newWord.getBoundingClientRect();

                if (wordRect.top < containerRect.top || wordRect.bottom > containerRect.bottom) {
                    newWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            currentWordIndex = foundIndex;
        }
    }

    function handleWordClick(event) {
        if (event.target.classList.contains('word')) {
            const startTime = parseFloat(event.target.dataset.start);
            if (!isNaN(startTime)) {
                videoPlayer.currentTime = startTime;
                event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function showContextMenu(event) {
        event.preventDefault();
        const selection = window.getSelection();
        if (selection.isCollapsed) return;
        const allWords = Array.from(dialogueContainer.querySelectorAll('.word'));
        selectedWordIndices = allWords
            .filter(wordSpan => selection.containsNode(wordSpan, true))
            .map(wordSpan => parseInt(wordSpan.dataset.index, 10));
        if (selectedWordIndices.length === 0) return;
        selectedWordIndices = [...new Set(selectedWordIndices)].sort((a, b) => a - b);
        const firstWordData = dialogueData[selectedWordIndices[0]];
        const speaker = firstWordData.speaker.toUpperCase();
        const allSameSpeaker = selectedWordIndices.every(index => dialogueData[index].speaker.toUpperCase() === speaker);
        if (!allSameSpeaker) {
            alert("Por favor, selecione a fala de apenas um participante por vez.");
            return;
        }
        const speakerCategories = CATEGORIAS[speaker];
        if (!speakerCategories) return;
        contextMenu.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'context-menu-header';
        header.textContent = `Categorizar fala de ${firstWordData.speaker}`;
        contextMenu.appendChild(header);
        for (const [displayName, catData] of Object.entries(speakerCategories)) {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.textContent = `${displayName} (${catData.abbr})`;
            item.dataset.abbr = catData.abbr;
            item.addEventListener('click', () => applyCategory(catData.abbr));
            contextMenu.appendChild(item);
        }
        const removeOption = document.createElement('div');
        removeOption.className = 'context-menu-item remove';
        removeOption.textContent = 'Remover Categoria';
        removeOption.addEventListener('click', () => applyCategory(''));
        contextMenu.appendChild(removeOption);

        contextMenu.style.visibility = 'hidden';
        contextMenu.style.display = 'block';

        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let left = event.pageX;
        let top = event.pageY;

        if (left + menuWidth > windowWidth) {
            left = event.pageX - menuWidth;
            if (left < 0) {
                left = 5;
            }
        }

        if (top + menuHeight > windowHeight) {
            top = event.pageY - menuHeight;
            if (top < 0) {
                top = 5;
            }
        }

        contextMenu.style.left = `${left}px`;
        contextMenu.style.top = `${top}px`;
        contextMenu.style.visibility = 'visible';
    }

    function applyCategory(abbr) {
        selectedWordIndices.forEach(index => {
            const wordSpan = dialogueContainer.querySelector(`[data-index='${index}']`);
            if (wordSpan) {
                wordSpan.classList.remove('nao-categorizado');
                Object.values(CATEGORIAS).forEach(speakerCats => {
                    Object.values(speakerCats).forEach(cat => {
                        wordSpan.classList.remove(cat.abbr);
                    });
                });
                if (abbr) {
                    wordSpan.classList.add(abbr);
                }
            }
            dialogueData[index].categoria = abbr;
        });
        contextMenu.style.display = 'none';
        selectedWordIndices = [];
    }

    function handleFinish() {
        document.querySelectorAll('.nao-categorizado').forEach(el => el.classList.remove('nao-categorizado'));

        const uncategorizedIndices = dialogueData.reduce((acc, item, index) => {
            if (!item.categoria || item.categoria.trim() === '') {
                acc.push(index);
            }
            return acc;
        }, []);

        if (uncategorizedIndices.length > 0) {
            uncategorizedIndices.forEach(index => {
                const wordSpan = dialogueContainer.querySelector(`[data-index='${index}']`);
                if (wordSpan) {
                    wordSpan.classList.add('nao-categorizado');
                }
            });

            const firstWarning = dialogueContainer.querySelector('.nao-categorizado');
            if (firstWarning) {
                firstWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            const confirmation = confirm(
                `Existem trechos de texto pendentes de categorização. Eles foram sublinhados em vermelho para sua conveniência.\n\nDeseja realmente salvar o arquivo mesmo assim?`
            );
            if (confirmation) {
                executeSave();
            }
        } else {
            executeSave();
        }
    }

    async function executeSave() {
        const filename = resultFilenameInput.value.trim();
        if (!filename) {
            alert('Por favor, insira um nome para o arquivo CSV a ser gerado.');
            resultFilenameInput.focus();
            return;
        }

        loadingOverlay.classList.remove('hidden');

        try {
            const response = await fetch('/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: filename,
                    records: dialogueData
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao gerar o arquivo no servidor.');
            }

            const blob = await response.blob();
            
            const disposition = response.headers.get('Content-Disposition');
            let downloadFilename = `${filename}_categorizado.csv`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    downloadFilename = matches[1].replace(/['"]/g, '');
                }
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = downloadFilename;
            
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // --- LÓGICA DO CRONÔMETRO (FINAL) ---
            const elapsedTime = Date.now() - sessionStartTime;
            totalTimeSpan.textContent = formatTime(elapsedTime);
            mainContent.classList.add('hidden');
            document.getElementById('control-panel').classList.add('hidden'); // Esconde painel superior
            sessionCompleteScreen.classList.remove('hidden');


        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    // --- INICIAR APLICAÇÃO ---
    setupEventListeners();
});