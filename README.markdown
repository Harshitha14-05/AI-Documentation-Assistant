# AI Documentation Assistant

## Overview
The AI Documentation Assistant is a web application built with Flask and JavaScript, designed to help users upload, manage, and query internal company documents (e.g., rules, regulations, and policies) using natural language. Powered by the `llama2` model from Ollama, it enables semantic search and AI-driven question answering. Key features include user authentication, document management, profile customization with picture uploads, and persistent chat history.

## Features
- **User Authentication**: Register, log in, and manage user profiles with secure password hashing.
- **Document Upload**: Supports PDF, DOCX, TXT, and CSV files, with automatic text extraction and embedding generation.
- **AI-Powered Search**: Uses Sentence Transformers and FAISS for semantic search to find relevant document content.
- **Natural Language Q&A**: Query documents using natural language, powered by Ollama's `llama2` model running locally.
- **Chat History**: Stores user-specific chat history for reference.
- **Profile Management**: Update user details and upload profile pictures (PNG, JPG, JPEG, GIF).
- **Secure Storage**: Documents and user data are stored locally, ensuring privacy.

## Prerequisites
- **System Requirements**:
  - 8 GB RAM minimum (16 GB recommended for better performance).
  - Linux, MacOS, or Windows (Windows support for Ollama is in preview).
- **Software**:
  - Python 3.8+ and `pip`.
  - Ollama (for local AI model execution).
  - Optional: Docker for containerized deployment.

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-documentation-assistant
```

### 2. Set Up Python Environment
Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install required Python packages:
```bash
pip install flask flask-cors werkzeug PyPDF2 python-docx pandas numpy faiss-cpu sentence-transformers ollama
```

### 3. Install Ollama
Download and install Ollama:
- **Linux**:
  ```bash
  curl -fsSL https://ollama.ai/install.sh | sh
  ```
- **MacOS**: Download from [Ollama website](https://ollama.ai/) and follow prompts.
- **Windows**: Download the preview installer from the website.

Verify installation:
```bash
ollama --version
```

### 4. Pull the Llama2 Model
Pull the `llama2` model for local AI processing:
```bash
ollama pull llama2
```

### 5. Set Up Directory Structure
Create required directories:
```bash
mkdir -p uploads static/profile_pics data
```

Ensure the following files are in place:
- `app.py`: Main Flask application.
- `static/js/dashboard.js`: Frontend JavaScript for dashboard functionality.
- `static/js/main.js`: Utility functions for animations and validations.
- `static/js/auth.js`: Authentication handling (optional, as login/register scripts are in HTML).
- `templates/`: Contains `index.html`, `login.html`, `register.html`, `dashboard.html`.
- `static/css/style.css`: Stylesheet for the application.

### 6. Optional: Create a `requirements.txt`
Create a `requirements.txt` file with:
```
flask
flask-cors
werkzeug
PyPDF2
python-docx
pandas
numpy
faiss-cpu
sentence-transformers
ollama
```
Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

### 1. Start the Ollama Server
Run the Ollama server in the background:
```bash
ollama serve &
```
Verify it's running:
```bash
curl http://localhost:11434/api/tags
```
You should see `llama2` listed in the response.

### 2. Start the Flask Application
Run the Flask app:
```bash
python app.py
```
The app will be available at `http://127.0.0.1:5000`.

### 3. Access the Application
- Open a browser and navigate to `http://127.0.0.1:5000`.
- Register a new account or log in.
- Use the dashboard to:
  - Upload documents (e.g., `Company_Policies.md` or its PDF version).
  - Ask questions about uploaded documents (e.g., "What is the company's travel policy?").
  - Manage your profile, including uploading a profile picture.

## Docker Setup (Optional)
1. Create a `Dockerfile`:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

2. Create a `docker-compose.yml`:
```yaml
version: '3.8'
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    command: sh -c "ollama serve & sleep 5 && ollama pull llama2"
  flask-app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    depends_on:
      - ollama
    environment:
      - OLLAMA_HOST=http://ollama:11434
```

3. Run with Docker Compose:
```bash
docker-compose up --build
```

## Usage
- **Register/Login**: Create an account or sign in to access the dashboard.
- **Upload Documents**: In the "Upload" section, add files (PDF, DOCX, TXT, CSV) containing company policies or other information.
- **Ask Questions**: Use the "Chat" section to query documents (e.g., "How many days of annual leave do I get?"). Responses are generated by the `llama2` model, and chat history is saved per user.
- **Manage Documents**: View and delete uploaded documents in the "Documents" section.
- **Update Profile**: Change your name, password, or profile picture in the "Profile" section.

## Example Document
An example policy document (`Company_Policies.md`) is provided below for testing:
```markdown
# V&H Technologies: Rules, Regulations, and Policies
## 1. Introduction
This document outlines the rules, regulations, and policies of V&H Technologies...

## 2. Employee Conduct
- Employees must maintain professionalism...
- Dress code: Business casual attire...

## 3. Leave Policies
- Annual Leave: 20 days per year...
- Sick Leave: 10 days per year...

## 4. IT Security Guidelines
- Passwords must be 12 characters long...
- Use VPN for remote access...

## 5. Travel Policy
- Economy class flights are standard...
- Per diem: $50/day domestic...
```
Save this as `Company_Policies.md` or convert to PDF and upload to test the Q&A functionality.

## Troubleshooting
- **Ollama Server Issues**:
  - Ensure the server is running (`curl http://localhost:11434/api/tags`).
  - Restart with `ollama serve &`.
  - Check for port conflicts (default: 11434).
- **Model Not Found**:
  - Verify `llama2` is pulled (`ollama list`).
  - Re-run `ollama pull llama2` if missing.
- **Flask App Errors**:
  - Ensure all dependencies are installed.
  - Verify directories (`uploads`, `static/profile_pics`, `data`) exist.
  - Check logs in the terminal where `app.py` is running.
- **Profile Picture Issues**:
  - Ensure `static/profile_pics` is writable.
  - Clear browser cache if the picture doesn't update.
- **Performance**:
  - Minimum 8 GB RAM required; 16 GB recommended.
  - Use a GPU for faster Ollama processing (Linux only).

## Development Notes
- **Frontend**: Uses HTML templates with JavaScript (`dashboard.js`, `main.js`) for dynamic functionality.
- **Backend**: Flask handles API routes, document processing, and Ollama integration.
- **AI Model**: `llama2` runs locally via Ollama, requiring no external API keys.
- **Storage**: Documents, embeddings, user data, and chat history are stored in JSON files in the `data` directory.

## Contributing
- Fork the repository and submit pull requests for enhancements.
- Report issues or suggest features via the repository's issue tracker.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

## Contact
For support or inquiries, contact:
- Email: support@vhtech.com
- Project Repository: <repository-url>

*Last updated: July 23, 2025*