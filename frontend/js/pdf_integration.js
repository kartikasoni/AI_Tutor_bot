// PDF RAG Integration (Pre-loaded PDFs from data folder)

class AITeacher {
    constructor() {
        this.backendURL = 'http://localhost:5001/api'; // 
        this.currentIndexName = null;
        this.pdfs = [];
        this.setupEventListeners();
        this.loadAvailablePDFs();
    }

    setupEventListeners() {
        const askBtn = document.getElementById('askBtn');
        if (askBtn) {
            askBtn.addEventListener('click', () => this.askQuestion());
        }

        const questionInput = document.getElementById('question');
        if (questionInput) {
            questionInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.askQuestion();
            });
        }
    }

    async loadAvailablePDFs() {
        const whiteboard = document.getElementById('whiteboard');

        try {
            const response = await fetch(`${this.backendURL}/pdfs`);
            const data = await response.json();

            //  Support both response formats
            this.pdfs = data.pdfs ?? data ?? [];

            const select = document.getElementById('pdfSelect');
            select.innerHTML = '';

            if (!this.pdfs.length) {
                whiteboard.innerHTML =
                    '<p> PDFs not loaded. Check backend /api/pdfs response.</p>';
                return;
            }

            select.innerHTML = '<option value="">-- Select a Material --</option>';

            this.pdfs.forEach(pdf => {
                const option = document.createElement('option');

                if (typeof pdf === 'string') {
                    option.value = pdf.replace('.pdf', '');
                    option.textContent = pdf;
                } else {
                    option.value = pdf.index_name;
                    option.textContent = pdf.display_name;
                }

                select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
                this.currentIndexName = e.target.value;
                if (this.currentIndexName) {
                    whiteboard.innerHTML =
                        `<p> Selected: <strong>${e.target.options[e.target.selectedIndex].text}</strong></p>
                         <p>Ready to answer questions...</p>`;
                }
            });

            // Auto-select first PDF
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change'));

        } catch (error) {
            console.error('Error loading PDFs:', error);
            whiteboard.innerHTML =
                '<p> Cannot connect to backend. Is Flask running?</p>';
        }
    }

    async askQuestion() {
        const question = document.getElementById('question').value.trim();
        const whiteboard = document.getElementById('whiteboard');

        if (!question) {
            alert('Please ask a question');
            return;
        }

        if (!this.currentIndexName) {
            alert('Please select a PDF first');
            return;
        }

        whiteboard.innerHTML = '<p>🔍 Searching your material...</p>';

        try {
            const response = await fetch(`${this.backendURL}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    index_name: this.currentIndexName
                })
            });

            const data = await response.json();
            this.displayAnswerWithAnimation(data.answer, whiteboard);

        } catch (error) {
            whiteboard.innerHTML = `<p> Error: ${error.message}</p>`;
        }
    }

    displayAnswerWithAnimation(text, element) {
        element.innerHTML = '';
        let i = 0;

        const type = () => {
            if (i < text.length) {
                element.innerHTML += text[i++];
                setTimeout(type, 20);
            }
        };
        type();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.aiTeacher = new AITeacher();
});