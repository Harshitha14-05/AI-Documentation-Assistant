import os
import json
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import PyPDF2
from docx import Document
import pandas as pd
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import ollama

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this'
CORS(app)

UPLOAD_FOLDER = 'uploads'
PROFILE_PICS_FOLDER = 'static/profile_pics'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt', 'csv'}
ALLOWED_IMAGES = {'png', 'jpg', 'jpeg', 'gif'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROFILE_PICS_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

model = SentenceTransformer('all-MiniLM-L6-v2')

USERS_FILE = 'data/users.json'
DOCUMENTS_FILE = 'data/documents.json'
EMBEDDINGS_FILE = 'data/embeddings.json'
CHAT_HISTORY_FILE = 'data/chat_history.json'

def init_data_files():
    for file_path in [USERS_FILE, DOCUMENTS_FILE, EMBEDDINGS_FILE, CHAT_HISTORY_FILE]:
        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                json.dump({}, f)

init_data_files()

def load_data(file_path):
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_data(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def extract_text_from_file(file_path, filename):
    text = ""
    file_ext = filename.rsplit('.', 1)[1].lower()
    try:
        if file_ext == 'pdf':
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + '\n'
        elif file_ext == 'docx':
            doc = Document(file_path)
            for paragraph in doc.paragraphs:
                text += paragraph.text + '\n'
        elif file_ext == 'txt':
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
        elif file_ext == 'csv':
            df = pd.read_csv(file_path)
            text = df.to_string()
    except Exception as e:
        print(f"Error extracting text: {str(e)}")
    return text

def create_embeddings(text_chunks):
    embeddings = model.encode(text_chunks)
    return embeddings.tolist()

def search_documents(query, top_k=3):
    documents = load_data(DOCUMENTS_FILE)
    embeddings_data = load_data(EMBEDDINGS_FILE)

    if not documents or not embeddings_data:
        return []

    query_embedding = model.encode([query])
    all_embeddings = []
    all_texts = []
    all_sources = []

    for doc_id, doc_data in embeddings_data.items():
        if doc_id in documents:
            for chunk_data in doc_data['chunks']:
                all_embeddings.append(chunk_data['embedding'])
                all_texts.append(chunk_data['text'])
                all_sources.append(documents[doc_id]['filename'])

    if not all_embeddings:
        return []

    embeddings_array = np.array(all_embeddings).astype('float32')
    index = faiss.IndexFlatIP(embeddings_array.shape[1])
    index.add(embeddings_array)

    scores, indices = index.search(query_embedding.astype('float32'), min(top_k, len(all_embeddings)))
    results = []
    for i, idx in enumerate(indices[0]):
        if scores[0][i] > 0.3:
            results.append({
                'text': all_texts[idx],
                'source': all_sources[idx],
                'score': float(scores[0][i])
            })
    return results

def query_ollama(context, question):
    try:
        prompt = f"""Based on the following context, answer the question concisely. If there isn't enough information, say so.

Context:
{context}

Question: {question}

Answer:"""
        response = ollama.generate(model='llama2', prompt=prompt)
        return response['response'].strip()
    except Exception as e:
        return f"Error: {str(e)}"

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET'])
def show_register():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('register.html')

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'})
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid JSON'})

    if not all(key in data for key in ['email', 'name', 'password']):
        return jsonify({'success': False, 'message': 'Missing fields'})

    users = load_data(USERS_FILE)
    if any(u['email'] == data['email'] for u in users.values()):
        return jsonify({'success': False, 'message': 'Email already registered'})

    user_id = str(uuid.uuid4())
    users[user_id] = {
        'email': data['email'],
        'name': data['name'],
        'password': generate_password_hash(data['password']),
        'profile_pic': 'default-avatar.png',
        'created_at': datetime.now().isoformat()
    }
    save_data(USERS_FILE, users)
    
    # Initialize chat history for new user
    chat_history = load_data(CHAT_HISTORY_FILE)
    chat_history[user_id] = []
    save_data(CHAT_HISTORY_FILE, chat_history)
    
    return jsonify({'success': True, 'message': 'Registered successfully'})

@app.route('/login', methods=['GET'])
def show_login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'})
    except:
        return jsonify({'success': False, 'message': 'Invalid JSON'})

    if not all(key in data for key in ['email', 'password']):
        return jsonify({'success': False, 'message': 'Missing fields'})

    users = load_data(USERS_FILE)
    for user_id, user in users.items():
        if user['email'] == data['email'] and check_password_hash(user['password'], data['password']):
            session['user_id'] = user_id
            session['user_name'] = user['name']
            return jsonify({'success': True, 'message': 'Login successful'})
    return jsonify({'success': False, 'message': 'Invalid credentials'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('show_login'))
    return render_template('dashboard.html')

@app.route('/test')
def test():
    return "Server is running"

@app.route('/api/user_info')
def get_user_info():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    users = load_data(USERS_FILE)
    user = users.get(session['user_id'])
    if user:
        return jsonify({'success': True, 'user': {
            'name': user['name'],
            'email': user['email'],
            'profile_pic': user.get('profile_pic', 'default-avatar.png')
        }})
    return jsonify({'success': False, 'message': 'User not found'})

@app.route('/upload_document', methods=['POST'])
def upload_document():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file uploaded'})

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'})

    if file and allowed_file(file.filename, ALLOWED_EXTENSIONS):
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        text = extract_text_from_file(file_path, filename)
        if not text.strip():
            os.remove(file_path)
            return jsonify({'success': False, 'message': 'Could not extract text from file'})

        chunks = [text[i:i + 1000] for i in range(0, len(text), 800)]
        embeddings = create_embeddings(chunks)
        documents = load_data(DOCUMENTS_FILE)
        embeddings_data = load_data(EMBEDDINGS_FILE)
        doc_id = str(uuid.uuid4())
        documents[doc_id] = {
            'filename': filename,
            'user_id': session['user_id'],
            'upload_date': datetime.now().isoformat(),
            'file_path': file_path
        }
        embeddings_data[doc_id] = {
            'chunks': [{'text': chunk, 'embedding': emb} for chunk, emb in zip(chunks, embeddings)]
        }
        save_data(DOCUMENTS_FILE, documents)
        save_data(EMBEDDINGS_FILE, embeddings_data)
        return jsonify({'success': True, 'message': 'Document uploaded successfully'})
    return jsonify({'success': False, 'message': 'Invalid file type'})

@app.route('/get_documents')
def get_documents():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    documents = load_data(DOCUMENTS_FILE)
    user_documents = [{
        'id': doc_id,
        'filename': doc_data['filename'],
        'upload_date': doc_data['upload_date']
    } for doc_id, doc_data in documents.items() if doc_data['user_id'] == session['user_id']]
    return jsonify({'documents': user_documents})

@app.route('/delete_document/<doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    documents = load_data(DOCUMENTS_FILE)
    embeddings_data = load_data(EMBEDDINGS_FILE)
    if doc_id in documents and documents[doc_id]['user_id'] == session['user_id']:
        try:
            os.remove(documents[doc_id]['file_path'])
        except:
            pass
        del documents[doc_id]
        embeddings_data.pop(doc_id, None)
        save_data(DOCUMENTS_FILE, documents)
        save_data(EMBEDDINGS_FILE, embeddings_data)
        return jsonify({'success': True, 'message': 'Document deleted successfully'})
    return jsonify({'success': False, 'message': 'Document not found'})

@app.route('/ask_question', methods=['POST'])
def ask_question():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    data = request.get_json()
    question = data.get('question', '')
    if not question:
        return jsonify({'success': False, 'message': 'Please provide a question'})
    results = search_documents(question)
    if not results:
        return jsonify({'success': True, 'answer': "No relevant information found.", 'sources': []})
    context = '\n\n'.join([f"From {r['source']}:\n{r['text']}" for r in results])
    answer = query_ollama(context, question)
    
    # Save chat history
    chat_history = load_data(CHAT_HISTORY_FILE)
    if session['user_id'] not in chat_history:
        chat_history[session['user_id']] = []
    chat_history[session['user_id']].append({
        'question': question,
        'answer': answer,
        'sources': [r['source'] for r in results],
        'timestamp': datetime.now().isoformat()
    })
    save_data(CHAT_HISTORY_FILE, chat_history)
    
    return jsonify({'success': True, 'answer': answer, 'sources': [r['source'] for r in results]})

@app.route('/get_chat_history', methods=['GET'])
def get_chat_history():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    chat_history = load_data(CHAT_HISTORY_FILE)
    user_history = chat_history.get(session['user_id'], [])
    return jsonify({'success': True, 'history': user_history})

@app.route('/upload_profile_pic', methods=['POST'])
def upload_profile_pic():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file uploaded'})
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'})
    if file and allowed_file(file.filename, ALLOWED_IMAGES):
        filename = secure_filename(f"{session['user_id']}_{file.filename}")
        file_path = os.path.join(PROFILE_PICS_FOLDER, filename)
        file.save(file_path)
        users = load_data(USERS_FILE)
        if session['user_id'] in users:
            old_pic = users[session['user_id']].get('profile_pic')
            if old_pic and old_pic != 'default-avatar.png':
                try:
                    os.remove(os.path.join(PROFILE_PICS_FOLDER, old_pic))
                except:
                    pass
            users[session['user_id']]['profile_pic'] = filename
            save_data(USERS_FILE, users)
            return jsonify({'success': True, 'message': 'Profile picture updated', 'profile_pic': filename})
        return jsonify({'success': False, 'message': 'User not found'})
    return jsonify({'success': False, 'message': 'Invalid file type'})

@app.route('/update_profile', methods=['POST'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    data = request.get_json()
    users = load_data(USERS_FILE)
    if session['user_id'] in users:
        users[session['user_id']]['name'] = data.get('name', users[session['user_id']]['name'])
        if data.get('password'):
            users[session['user_id']]['password'] = generate_password_hash(data['password'])
        session['user_name'] = users[session['user_id']]['name']
        save_data(USERS_FILE, users)
        return jsonify({'success': True, 'message': 'Profile updated'})
    return jsonify({'success': False, 'message': 'User not found'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)