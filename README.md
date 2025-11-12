# Categorizador de Transcrições de Vídeo

Esta é uma aplicação web desenvolvida em Flask que permite a usuários fazer o upload de um vídeo e um arquivo de transcrição (CSV) para categorizar manualmente os segmentos de fala.

## Funcionalidades

- Upload de arquivo de vídeo e CSV com a transcrição.
- Interface para visualizar o vídeo e a transcrição lado a lado.
- Permite atribuir categorias a cada linha da transcrição.
- Download do arquivo CSV final com as categorias preenchidas.

## Como Executar Localmente

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd categorizador-web_render
    ```

2.  **Crie e ative um ambiente virtual:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Instale as dependências:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Execute a aplicação:**
    ```bash
    flask run --host=0.0.0.0 --port=5001
    ```
    Ou, para desenvolvimento com debug:
    ```bash
    python app.py
    ```

5.  Abra seu navegador e acesse `http://127.0.0.1:5001`.

## Deploy

A aplicação está configurada para deploy na plataforma [Render](https://render.com/). O servidor de produção utilizado é o Gunicorn.
