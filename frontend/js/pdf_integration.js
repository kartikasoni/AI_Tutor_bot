// PDF RAG Integration (Pre-loaded PDFs from data folder)

// ============================================
// AI Teacher - Main Integration
// Connects PDF selection with Voice Conversation
// ============================================

class AITeacher {
    constructor() {
        this.backendURL = 'http://localhost:5001/api';
        this.currentIndexName = null;
        this.pdfs = [];
        this.voiceConversation = null;
        
        this.init();
    }

    async init() {
        // Load available PDFs
        await this.loadAvailablePDFs();
        
        // Initialize voice conversation
        this.setupVoiceConversation();
        
        // Initialize text mode
        this.setupTextMode();
    }

    async loadAvailablePDFs() {
        const select = document.getElementById('pdfSelect');
        const whiteboard = document.getElementById('whiteboard');

        try {
            const response = await fetch(`${this.backendURL}/pdfs`);
            const data = await response.json();
            this.pdfs = data.pdfs || [];

            select.innerHTML = '';

            if (!this.pdfs.length) {
                whiteboard.innerHTML = '<p style="color: #f44336;">⚠️ No PDFs found. Please add PDFs to the data folder.</p>';
                return;
            }

            select.innerHTML = '<option value="">-- Select a Material --</option>';

            this.pdfs.forEach(pdf => {
                const option = document.createElement('option');
                option.value = pdf.index_name;
                option.textContent = pdf.display_name;
                select.appendChild(option);
            });

            // Handle selection
            select.addEventListener('change', (e) => {
                this.currentIndexName = e.target.value;
                
                if (this.currentIndexName) {
                    const selectedName = e.target.options[e.target.selectedIndex].text;
                    whiteboard.innerHTML = `
                        <div style="padding: 20px; background: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 10px;">
                            <h3 style="margin: 0 0 10px 0; color: #1976D2;">📘 Ready to Study:</h3>
                            <p style="margin: 0; font-size: 1.2em; font-weight: bold;">${selectedName}</p>
                            <p style="margin: 10px 0 0 0; color: #666;">Type a question or use voice mode!</p>
                        </div>
                    `;
                }
            });

            // Auto-select first PDF
            if (select.options.length > 1) {
                select.selectedIndex = 1;
                select.dispatchEvent(new Event('change'));
            }

        } catch (error) {
            console.error('Error loading PDFs:', error);
            whiteboard.innerHTML = `
                <p style="color: #f44336;">
                    ⚠️ Cannot connect to backend. 
                    <br><br>
                    Make sure Flask server is running on port 5001.
                    <br><br>
                    Run: <code>cd python_backend && python app.py</code>
                </p>
            `;
        }
    }

    setupTextMode() {
        const askBtn = document.getElementById('askBtn');
        const questionInput = document.getElementById('questionInput');

        if (askBtn) {
            askBtn.addEventListener('click', () => this.askTextQuestion());
        }

        if (questionInput) {
            questionInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.askTextQuestion();
                }
            });
        }
    }

    async askTextQuestion() {
        const questionInput = document.getElementById('questionInput');
        const whiteboard = document.getElementById('whiteboard');
        const question = questionInput.value.trim();

        if (!question) {
            alert('⚠️ Please type a question');
            return;
        }

        if (!this.currentIndexName) {
            alert('⚠️ Please select a PDF first');
            return;
        }

        // Show loading
        whiteboard.innerHTML = '<p style="color: #666;">🔍 Searching your material...</p>';

        try {
            const response = await fetch(`${this.backendURL}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question,
                    index_name: this.currentIndexName
                })
            });

            const data = await response.json();
            console.log('Response:', data);

            // Display answer
            this.displayTextAnswer(data.answer, data.images || [], data.pages || []);

            // Clear input
            questionInput.value = '';

        } catch (error) {
            console.error('Error:', error);
            whiteboard.innerHTML = `
                <p style="color: #f44336;">
                    ❌ Error: ${error.message}
                </p>
            `;
        }
    }

    displayTextAnswer(answer, images, pages) {
        const whiteboard = document.getElementById('whiteboard');
        whiteboard.innerHTML = '';

        // Answer box
        const answerDiv = document.createElement('div');
        answerDiv.className = 'answer-box';
        answerDiv.innerHTML = `
            <div class="answer-header">💬 Answer:</div>
            <div class="answer-text">${answer}</div>
        `;
        whiteboard.appendChild(answerDiv);

        // Images
        if (images && images.length > 0) {
            const imgSection = document.createElement('div');
            imgSection.className = 'images-section';
            imgSection.innerHTML = '<h3>📊 Related Images:</h3>';

            images.forEach(img => {
                const imgDiv = document.createElement('div');
                imgDiv.className = 'image-container';
                imgDiv.innerHTML = `
                    <p class="image-label">Page ${img.page}</p>
                    <img src="http://localhost:5001${img.path}" alt="Page ${img.page}" onclick="window.open(this.src)" />
                `;
                imgSection.appendChild(imgDiv);
            });

            whiteboard.appendChild(imgSection);
        }

        // Pages
        if (pages && pages.length > 0) {
            const pagesInfo = document.createElement('p');
            pagesInfo.className = 'pages-info';
            pagesInfo.textContent = `📄 Found on pages: ${pages.join(', ')}`;
            whiteboard.appendChild(pagesInfo);
        }
    }

    setupVoiceConversation() {
        // Create voice conversation instance
        this.voiceConversation = new VoiceConversation(
            this.backendURL,
            () => this.currentIndexName // Function to get current PDF
        );

        // Wire up buttons
        const startBtn = document.getElementById('startVoiceBtn');
        const stopBtn = document.getElementById('stopVoiceBtn');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.voiceConversation.startConversation();
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.voiceConversation.stopConversation();
            });
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.aiTeacher = new AITeacher();
    console.log('✅ AI Teacher initialized with both text and voice modes');
});












// class AITeacher {
//     constructor() {
//         this.backendURL = 'http://localhost:5001/api'; // 
//         this.currentIndexName = null;
//         this.pdfs = [];
//         this.setupEventListeners();
//         this.loadAvailablePDFs();
//     }

//     setupEventListeners() {
//         const askBtn = document.getElementById('askBtn');
//         if (askBtn) {
//             askBtn.addEventListener('click', () => this.askQuestion());
//         }

//         const questionInput = document.getElementById('question');
//         if (questionInput) {
//             questionInput.addEventListener('keypress', (e) => {
//                 if (e.key === 'Enter') this.askQuestion();
//             });
//         }
//     }

//     async loadAvailablePDFs() {
//         const whiteboard = document.getElementById('whiteboard');

//         try {
//             const response = await fetch(`${this.backendURL}/pdfs`);
//             const data = await response.json();

//             //  Support both response formats
//             this.pdfs = data.pdfs ?? data ?? [];

//             const select = document.getElementById('pdfSelect');
//             select.innerHTML = '';

//             if (!this.pdfs.length) {
//                 whiteboard.innerHTML =
//                     '<p> PDFs not loaded. Check backend /api/pdfs response.</p>';
//                 return;
//             }

//             select.innerHTML = '<option value="">-- Select a Material --</option>';

//             this.pdfs.forEach(pdf => {
//                 const option = document.createElement('option');

//                 if (typeof pdf === 'string') {
//                     option.value = pdf.replace('.pdf', '');
//                     option.textContent = pdf;
//                 } else {
//                     option.value = pdf.index_name;
//                     option.textContent = pdf.display_name;
//                 }

//                 select.appendChild(option);
//             });

//             select.addEventListener('change', (e) => {
//                 this.currentIndexName = e.target.value;
//                 if (this.currentIndexName) {
//                     whiteboard.innerHTML =
//                         `<p> Selected: <strong>${e.target.options[e.target.selectedIndex].text}</strong></p>
//                          <p>Ready to answer questions...</p>`;
//                 }
//             });

//             // Auto-select first PDF
//             select.selectedIndex = 1;
//             select.dispatchEvent(new Event('change'));

//         } catch (error) {
//             console.error('Error loading PDFs:', error);
//             whiteboard.innerHTML =
//                 '<p> Cannot connect to backend. Is Flask running?</p>';
//         }
//     }

//     async askQuestion() {
//         const question = document.getElementById('question').value.trim();
//         const whiteboard = document.getElementById('whiteboard');

//         if (!question) {
//             alert('Please ask a question');
//             return;
//         }

//         if (!this.currentIndexName) {
//             alert('Please select a PDF first');
//             return;
//         }

//         whiteboard.innerHTML = '<p>🔍 Searching your material...</p>';

//         try {
//             const response = await fetch(`${this.backendURL}/ask`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     question,
//                     index_name: this.currentIndexName
//                 })
//             });

//             const data = await response.json();
//             this.displayAnswerWithAnimation(data.answer, whiteboard);

//         } catch (error) {
//             whiteboard.innerHTML = `<p> Error: ${error.message}</p>`;
//         }
//     }

//     displayAnswerWithAnimation(text, element) {
//         element.innerHTML = '';
//         let i = 0;

//         const type = () => {
//             if (i < text.length) {
//                 element.innerHTML += text[i++];
//                 setTimeout(type, 20);
//             }
//         };
//         type();
//     }
// }

// document.addEventListener('DOMContentLoaded', () => {
//     window.aiTeacher = new AITeacher();
// });