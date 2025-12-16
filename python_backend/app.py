from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pathlib import Path
from index_manager import IndexManager, normalize_index_name


os.environ["TOKENIZERS_PARALLELISM"] = "false"
# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize indexes on startup
print("\n Starting AI Teacher Backend...")
index_manager = IndexManager()
pdf_info, rag_chain = index_manager.initialize_all_indexes()

# ===================== API ROUTES =====================
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"




@app.route("/api/pdfs", methods=["GET"])
def list_pdfs():
    pdfs = []
    for pdf in DATA_DIR.glob("*.pdf"):
        pdfs.append({
            "index_name": normalize_index_name(pdf.name),
            "display_name": pdf.name
        })
    return jsonify({"pdfs": pdfs})

from index_manager import normalize_index_name

@app.route('/api/ask', methods=['POST'])
def ask_question():
    """
    Ask a question about a selected PDF.

    Request JSON:
        - question: string
        - index_name: normalized index name (from /api/pdfs)

    Response JSON:
        - answer: string
    """
    try:
        data = request.json or {}

        question = data.get('question', '').strip()
        raw_index_name = data.get('index_name', '').strip()

        if not question:
            return jsonify({'answer': 'Please ask a question.'}), 400

        if not raw_index_name:
            return jsonify({'answer': 'Please select a PDF first.'}), 400

        #  NORMALIZE INDEX NAME (CRITICAL FIX)
        index_name = normalize_index_name(raw_index_name)

        #  Ask RAG strictly from indexed material
        answer = rag_chain.answer_question(question, index_name)

        return jsonify({'answer': answer}), 200

    except Exception as e:
        return jsonify({
            'answer': f' Error while answering the question: {str(e)}'
        }), 500

@app.route('/api/pdfs', methods=['GET'])
def get_available_pdfs():
    """
    Get list of all loaded PDFs
    
    Response:
        - pdfs: List of PDF info objects with filename and index_name
    """
    try:
        pdfs_list = []
        for index_name, info in pdf_info.items():
            pdfs_list.append({
                'filename': info['filename'],
                'index_name': index_name,
                'display_name': info['filename'].replace('.pdf', '')
            })
        
        return jsonify({
            'pdfs': pdfs_list,
            'count': len(pdfs_list)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'pdfs_loaded': len(pdf_info)
    }), 200

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': 'AI Teacher Backend Running',
        'pdfs_loaded': len(pdf_info),
        'available_pdfs': list(pdf_info.keys())
    }), 200

# ===================== ERROR HANDLERS =====================

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')