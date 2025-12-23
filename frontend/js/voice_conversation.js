// ============================================
// Two-Way Voice Conversation with Interruption
// ============================================
// Features:
// - Continuous listening
// - Interrupt AI by speaking
// - Voice Activity Detection (VAD)
// - Visual feedback
// - 100% FREE using browser APIs
// ============================================

class VoiceConversation {
    constructor(backendURL, getCurrentPdf) {
        this.backendURL = backendURL;
        this.getCurrentPdf = getCurrentPdf; // Function to get selected PDF
        
        // Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            this.showError('Speech recognition not supported in this browser. Use Chrome or Edge.');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        // Speech Synthesis
        this.synthesis = window.speechSynthesis;
        this.currentUtterance = null;
        
        // Voice Activity Detection
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        
        // State
        this.isConversationActive = false;
        this.isSpeaking = false;
        this.isProcessing = false;
        this.silenceTimeout = null;
        this.lastTranscript = '';
        
        // Settings
        this.SILENCE_THRESHOLD = 30; // Audio level threshold for VAD
        this.SILENCE_DURATION = 1500; // ms of silence before processing
        this.INTERRUPTION_THRESHOLD = 35; // Higher threshold for interruption
        
        this.setupRecognition();
    }
    
    // ============================================
    // SETUP
    // ============================================
    
    setupRecognition() {
        // Handle speech results
        this.recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript.trim();
            const isFinal = event.results[last].isFinal;
            
            // Show interim results
            this.updateUserSpeech(transcript, !isFinal);
            
            // If AI is speaking and user starts talking - INTERRUPT!
            if (this.isSpeaking && transcript.length > 3) {
                console.log('User interrupted AI!');
                this.handleInterruption();
            }
            
            // If final result
            if (isFinal && transcript.length > 0) {
                this.lastTranscript = transcript;
                
                // Wait for silence before processing
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = setTimeout(() => {
                    this.processQuestion(this.lastTranscript);
                    this.lastTranscript = '';
                }, this.SILENCE_DURATION);
            }
        };
        
        // Handle errors
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            if (event.error === 'no-speech') {
                // Just continue listening, don't show error
                return;
            }
            
            if (event.error === 'not-allowed') {
                this.showError('Microphone permission denied. Please allow microphone access.');
                this.stopConversation();
            }
        };
        
        // Keep listening
        this.recognition.onend = () => {
            if (this.isConversationActive) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.log('Recognition restart:', e.message);
                }
            }
        };
    }
    
    async setupVAD() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            // Create analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.microphone.connect(this.analyser);
            
            // Start monitoring
            this.monitorAudioLevels();
            
            return true;
        } catch (error) {
            console.error('VAD setup error:', error);
            this.showError('Could not access microphone: ' + error.message);
            return false;
        }
    }
    
    // ============================================
    // VOICE ACTIVITY DETECTION
    // ============================================
    
    monitorAudioLevels() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkAudioLevel = () => {
            if (!this.isConversationActive || !this.analyser) {
                return;
            }
            
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
            
            // Update visual indicator
            this.updateVolumeIndicator(average);
            
            // If AI is speaking and user starts speaking - INTERRUPT
            if (this.isSpeaking && average > this.INTERRUPTION_THRESHOLD) {
                this.handleInterruption();
            }
            
            requestAnimationFrame(checkAudioLevel);
        };
        
        checkAudioLevel();
    }
    
    handleInterruption() {
        if (!this.isSpeaking) return;
        
        console.log('Interruption handled');
        
        // Stop AI immediately
        this.stopSpeaking();
        
        // Clear any pending processing
        clearTimeout(this.silenceTimeout);
        
        // Update UI
        this.updateStatus('👂 Listening...', 'listening');
        
        // Visual feedback
        this.flashInterruption();
    }
    
    // ============================================
    // CONVERSATION CONTROL
    // ============================================
    
    async startConversation() {
        const pdfName = this.getCurrentPdf();
        if (!pdfName) {
            this.showError('Please select a PDF first!');
            return;
        }
        
        console.log('🎤 Starting conversation...');
        
        // Setup VAD
        const vadReady = await this.setupVAD();
        if (!vadReady) {
            return;
        }
        
        // Start recognition
        this.isConversationActive = true;
        
        try {
            this.recognition.start();
        } catch (e) {
            console.log('Recognition already started');
        }
        
        // Update UI
        this.updateStatus('👂 Listening... (Speak your question)', 'listening');
        this.toggleButtons(true);
        
        // Welcome message
        setTimeout(() => {
            this.speak("Hi! I'm ready to help you with your studies. What would you like to know?");
        }, 500);
    }
    
    stopConversation() {
        console.log('⏸️ Stopping conversation...');
        
        this.isConversationActive = false;
        
        // Stop recognition
        try {
            this.recognition.stop();
        } catch (e) {
            console.log('Recognition already stopped');
        }
        
        // Stop speaking
        this.stopSpeaking();
        
        // Clean up audio
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyser = null;
        
        // Clear timeouts
        clearTimeout(this.silenceTimeout);
        
        // Update UI
        this.updateStatus('⏸️ Conversation Stopped', 'stopped');
        this.toggleButtons(false);
        this.updateUserSpeech('', false);
        this.updateVolumeIndicator(0);
    }
    
    // ============================================
    // SPEECH PROCESSING
    // ============================================
    
    async processQuestion(question) {
        if (this.isProcessing || !question || question.length < 3) {
            return;
        }
        
        this.isProcessing = true;
        
        console.log(`Processing: "${question}"`);
        
        this.updateStatus('🤔 Thinking...', 'processing');
        
        try {
            const response = await fetch(`${this.backendURL}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question,
                    index_name: this.getCurrentPdf()
                })
            });
            
            if (!response.ok) {
                throw new Error('Backend error: ' + response.statusText);
            }
            
            const data = await response.json();
            
            // Display answer visually
            this.displayAnswer(data.answer, data.images, data.pages);
            
            // Speak the answer
            this.speak(data.answer);
            
        } catch (error) {
            console.error('Error:', error);
            const errorMsg = 'Sorry, I encountered an error. Please try again.';
            this.displayAnswer(errorMsg, [], []);
            this.speak(errorMsg);
        } finally {
            this.isProcessing = false;
        }
    }
    
    speak(text) {
        // Stop any ongoing speech
        this.stopSpeaking();
        
        // Clean text for speech
        const cleanText = text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/`/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '')
            .replace(/#{1,6}\s/g, '');
        
        this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
        
        // Settings
        this.currentUtterance.rate = 0.95;
        this.currentUtterance.pitch = 1;
        this.currentUtterance.volume = 1;
        
        // Try to use better voice
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(v => 
            v.name.includes('Google') || 
            v.name.includes('Female') ||
            v.name.includes('Samantha')
        );
        if (preferredVoice) {
            this.currentUtterance.voice = preferredVoice;
        }
        
        // Events
        this.currentUtterance.onstart = () => {
            this.isSpeaking = true;
            this.updateStatus('🔊 Speaking...', 'speaking');
        };
        
        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
            if (this.isConversationActive) {
                this.updateStatus('Listening...', 'listening');
            }
        };
        
        this.currentUtterance.onerror = (e) => {
            console.error('Speech synthesis error:', e);
            this.isSpeaking = false;
        };
        
        this.synthesis.speak(this.currentUtterance);
    }
    
    stopSpeaking() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
        this.isSpeaking = false;
    }
    
    // ============================================
    // UI UPDATES
    // ============================================
    
    updateStatus(message, statusClass) {
        const statusEl = document.getElementById('voiceStatus');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'voice-status ' + statusClass;
        }
    }
    
    updateUserSpeech(text, isInterim) {
        const el = document.getElementById('userSpeechText');
        if (el) {
            el.textContent = text;
            el.style.opacity = isInterim ? '0.6' : '1';
            el.style.fontStyle = isInterim ? 'italic' : 'normal';
        }
    }
    
    updateVolumeIndicator(level) {
        const indicator = document.getElementById('volumeIndicator');
        if (indicator) {
            const percentage = Math.min(100, (level / 100) * 100);
            indicator.style.width = percentage + '%';
            
            // Color based on level
            if (level > this.INTERRUPTION_THRESHOLD) {
                indicator.style.backgroundColor = '#f44336'; // Red (interrupting)
            } else if (level > this.SILENCE_THRESHOLD) {
                indicator.style.backgroundColor = '#4caf50'; // Green (speaking)
            } else {
                indicator.style.backgroundColor = '#2196f3'; // Blue (quiet)
            }
        }
    }
    
    displayAnswer(answer, images = [], pages = []) {
        const whiteboard = document.getElementById('whiteboard');
        if (!whiteboard) return;
        
        // Clear previous
        whiteboard.innerHTML = '';
        
        // Answer
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
                    <img src="http://localhost:5001${img.path}" alt="Page ${img.page}" />
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
    
    toggleButtons(isActive) {
        const startBtn = document.getElementById('startVoiceBtn');
        const stopBtn = document.getElementById('stopVoiceBtn');
        
        if (startBtn) startBtn.disabled = isActive;
        if (stopBtn) stopBtn.disabled = !isActive;
    }
    
    flashInterruption() {
        const statusEl = document.getElementById('voiceStatus');
        if (statusEl) {
            statusEl.style.animation = 'flash 0.3s ease-in-out';
            setTimeout(() => {
                statusEl.style.animation = '';
            }, 300);
        }
    }
    
    showError(message) {
        alert('⚠️ ' + message);
        this.updateStatus('❌ Error', 'error');
    }
}

// Export for use in other files
window.VoiceConversation = VoiceConversation;
