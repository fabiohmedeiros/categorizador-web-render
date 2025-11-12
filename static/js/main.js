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

    // --- VERIFICAÇÃO INICIAL DE ELEMENTOS ---
    const requiredElements = {
        videoUpload, csvUpload, startButton, finishButton, resultFilenameInput,
        videoPlayer, dialogueContainer, contextMenu, loadingOverlay, uploadSection,
        finishSection, mainContent
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
        
        // Eventos do menu de contexto
        dialogueContainer.addEventListener('contextmenu', showContextMenu);
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });
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
                
                // NOVO: Verifica se a palavra está visível antes de rolar
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
                // Força o scroll para a palavra clicada
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
        contextMenu.style.left = `${event.pageX}px`;
        contextMenu.style.top = `${event.pageY}px`;
        contextMenu.style.display = 'block';
    }

    function applyCategory(abbr) {
        selectedWordIndices.forEach(index => {
            const wordSpan = dialogueContainer.querySelector(`[data-index='${index}']`);
            if (wordSpan) {
                // Remove a classe de aviso de não categorizado ao aplicar uma nova
                wordSpan.classList.remove('nao-categorizado');

                // Remove todas as classes de categoria existentes
                Object.values(CATEGORIAS).forEach(speakerCats => {
                    Object.values(speakerCats).forEach(cat => {
                        wordSpan.classList.remove(cat.abbr);
                    });
                });

                // Adiciona a nova classe de categoria, se houver
                if (abbr) {
                    wordSpan.classList.add(abbr);
                }
            }
            // Atualiza o dado no estado da aplicação
            dialogueData[index].categoria = abbr;
        });
        contextMenu.style.display = 'none';
        selectedWordIndices = [];
    }

    function handleFinish() {
        // Primeiro, remove todos os avisos existentes para não acumular
        document.querySelectorAll('.nao-categorizado').forEach(el => el.classList.remove('nao-categorizado'));

        const uncategorizedIndices = dialogueData.reduce((acc, item, index) => {
            if (!item.categoria || item.categoria.trim() === '') {
                acc.push(index);
            }
            return acc;
        }, []);

        if (uncategorizedIndices.length > 0) {
            // Adiciona a classe de aviso aos itens não categorizados
            uncategorizedIndices.forEach(index => {
                const wordSpan = dialogueContainer.querySelector(`[data-index='${index}']`);
                if (wordSpan) {
                    wordSpan.classList.add('nao-categorizado');
                }
            });

            // Rola para o primeiro aviso
            const firstWarning = dialogueContainer.querySelector('.nao-categorizado');
            if (firstWarning) {
                firstWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            const confirmation = confirm(
                `Existem ${uncategorizedIndices.length} trechos de texto pendentes de categorização. Eles foram sublinhados em vermelho para sua conveniência.\n\nDeseja realmente salvar o arquivo mesmo assim?`
            );
            if (confirmation) {
                executeSave();
            }
        } else {
            // Se tudo estiver categorizado, apenas salva
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

            // Se a resposta não for OK, o corpo provavelmente contém um erro JSON
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao gerar o arquivo no servidor.');
            }

            // Se a resposta for OK, o corpo é o arquivo CSV (blob)
            const blob = await response.blob();
            
            // Extrai o nome do arquivo do cabeçalho Content-Disposition, se disponível
            const disposition = response.headers.get('Content-Disposition');
            let downloadFilename = `${filename}_categorizado.csv`; // Fallback
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    downloadFilename = matches[1].replace(/['"]/g, '');
                }
            }

            // Cria um link temporário para iniciar o download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = downloadFilename;
            
            document.body.appendChild(a);
            a.click();
            
            // Limpa o link e o URL do objeto
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

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