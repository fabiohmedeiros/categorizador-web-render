import os
import pandas as pd
import numpy as np
from flask import Flask, request, render_template, jsonify, send_from_directory, abort, Response

# --- CONFIGURAÇÃO DA APLICAÇÃO FLASK ---
# Obtém o caminho absoluto para o diretório do arquivo app.py
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__,
            static_folder=os.path.join(basedir, 'static'),
            template_folder=os.path.join(basedir, 'templates'))
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- FUNÇÕES DE PROCESSAMENTO DE DADOS (do script original) ---
def convert_to_seconds(ts_str):
    if pd.isna(ts_str) or str(ts_str).strip() == '':
        return np.nan
    ts_str = str(ts_str).strip()
    try:
        if '.' in ts_str:
            return float(ts_str)
        else:
            # Assuming the timestamp is in milliseconds if no decimal point
            return float(ts_str) / 1000.0
    except (ValueError, TypeError):
        return np.nan

def _interpolate_and_clean_df(df):
    df = df.copy()
    df['start'] = df['start'].apply(convert_to_seconds)
    df['end'] = df['end'].apply(convert_to_seconds)
    df['word'] = df['word'].astype(str).apply(lambda x: x.strip('"'))

    missing_indices = df[df['start'].isna() | df['end'].isna()].index
    if not missing_indices.empty:
        i = 0
        while i < len(df):
            if i in missing_indices:
                start_missing_idx = i
                j = i
                while j < len(df) and j in missing_indices:
                    j += 1
                end_missing_idx = j - 1

                if start_missing_idx == 0 or j >= len(df):
                    i = j
                    continue

                prev_end_time = df.loc[start_missing_idx - 1, 'end']
                next_start_time = df.loc[j, 'start']

                if pd.notna(prev_end_time) and pd.notna(next_start_time) and next_start_time >= prev_end_time:
                    num_missing = end_missing_idx - start_missing_idx + 1
                    points = np.linspace(prev_end_time, next_start_time, num_missing + 2)
                    
                    for k in range(num_missing):
                        row_idx = start_missing_idx + k
                        df.loc[row_idx, 'start'] = points[k+1]
                        df.loc[row_idx, 'end'] = points[k+2]
                i = j
            else:
                i += 1
    
    df['start'] = pd.to_numeric(df['start'], errors='coerce').round(3)
    df['end'] = pd.to_numeric(df['end'], errors='coerce').round(3)
    df.dropna(subset=['start', 'end'], inplace=True)
    
    if 'categoria' not in df.columns:
        df['categoria'] = ''
    df['categoria'] = df['categoria'].astype(str).fillna('')
    
    return df

# --- ROTAS DA API ---

@app.route('/')
def index():
    """Serve a página principal da aplicação."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    """Recebe os arquivos de vídeo e CSV e os salva na pasta 'uploads'."""
    if 'video' not in request.files or 'csv' not in request.files:
        return jsonify({"error": "Faltando arquivo de vídeo ou CSV"}), 400
    
    video_file = request.files['video']
    csv_file = request.files['csv']

    if video_file.filename == '' or csv_file.filename == '':
        return jsonify({"error": "Nenhum arquivo selecionado"}), 400

    # Salva os arquivos com nomes fixos para facilitar o acesso
    video_path = os.path.join(app.config['UPLOAD_FOLDER'], 'video.mp4') # Assumindo mp4, mas pode ser outro
    csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'transcription.csv')
    
    video_file.save(video_path)
    csv_file.save(csv_path)
    
    return jsonify({
        "message": "Arquivos enviados com sucesso!",
        "video_url": "/video/video.mp4",
        "data_url": "/data"
    })

@app.route('/video/<filename>')
def serve_video(filename):
    """Serve o arquivo de vídeo para o player HTML."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/data')
def get_data():
    """Lê, processa e retorna os dados da transcrição como JSON."""
    csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'transcription.csv')
    if not os.path.exists(csv_path):
        return jsonify({"error": "Arquivo CSV não encontrado. Por favor, faça o upload primeiro."}), 404
    
    try:
        df = pd.read_csv(csv_path, dtype=object)
        processed_df = _interpolate_and_clean_df(df)
        # Convertendo o DataFrame para uma lista de dicionários (JSON)
        return jsonify(processed_df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": f"Erro ao processar o arquivo CSV: {e}"}), 500

@app.route('/save', methods=['POST'])
def save_results():
    """
    Recebe os dados categorizados e retorna o arquivo CSV para download no navegador.
    """
    data = request.get_json()
    if not data or 'filename' not in data or 'records' not in data:
        return jsonify({"error": "Dados inválidos"}), 400

    try:
        df = pd.DataFrame(data['records'])
        
        # Define e reordena as colunas para o formato final
        colunas_ordenadas = ['speaker', 'word', 'start', 'end', 'categoria']
        # Garante que todas as colunas existam, preenchendo com '' se faltar
        for col in colunas_ordenadas:
            if col not in df.columns:
                df[col] = ''
        df = df[colunas_ordenadas]

        # Sanitiza o nome do arquivo
        safe_name = "".join(c for c in data['filename'] if c.isalnum() or c in (' ', '_', '-')).rstrip()
        if not safe_name:
            safe_name = "resultado_padrao"
        
        # Adiciona a extensão .csv se não estiver presente
        if not safe_name.lower().endswith('.csv'):
            safe_name += '_categorizado.csv'

        # Gera o CSV em memória
        csv_data = df.to_csv(index=False, encoding='utf-8')

        # Retorna a resposta para forçar o download
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment;filename={safe_name}"}
        )
    except Exception as e:
        # Retorna um erro em formato JSON para o frontend tratar
        return jsonify({"error": f"Erro ao gerar o arquivo: {e}"}), 500

# --- EXECUÇÃO DA APLICAÇÃO ---
if __name__ == '__main__':
    # ATENÇÃO: Executar com host='0.0.0.0' torna a aplicação acessível na sua rede local.
    # Não use este modo em produção com o servidor de desenvolvimento do Flask.
    app.run(debug=True, host='0.0.0.0', port=5001)
