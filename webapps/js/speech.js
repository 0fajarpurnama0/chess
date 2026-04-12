// js/speech.js

window.ChessApp.Speech = {
    
    // ==========================================
    // 1. CONFIGURATION & DICTIONARIES
    // ==========================================
    enabled: true, // Master toggle for voice announcements

    // Translate internal piece characters into spoken words
    pieceNames: {
        'p': 'Pawn',
        'n': 'Knight',
        'b': 'Bishop',
        'r': 'Rook',
        'q': 'Queen',
        'k': 'King'
    },

    // ==========================================
    // 2. MOVE PARSER & SENTENCE BUILDER
    // ==========================================
    speakMove: function(moveObj) {
        // Guard Clause: Abort if toggled off or browser lacks the API
        if (!this.enabled || !('speechSynthesis' in window)) return;

        let text = "";

        // --- A. Castling ---
        if (moveObj.san === 'O-O') {
            text = "Castles kingside";
        } else if (moveObj.san === 'O-O-O') {
            text = "Castles queenside";
        } 
        // --- B. Standard Moves & Captures ---
        else {
            const pieceName = this.pieceNames[moveObj.piece];
            
            if (moveObj.captured) {
                text = `${pieceName} takes ${moveObj.to}`;
            } else {
                text = `${pieceName} to ${moveObj.to}`;
            }

            // --- C. Pawn Promotions ---
            if (moveObj.promotion) {
                text += ` promotes to ${this.pieceNames[moveObj.promotion]}`;
            }
        }

        // --- D. Checks & Checkmates ---
        if (moveObj.san.includes('#')) {
            text += ", checkmate!";
        } else if (moveObj.san.includes('+')) {
            text += ", check.";
        }

        // ==========================================
        // 3. AUDIO EXECUTION
        // ==========================================
        
        // Cancel any currently playing or queued speech so rapid-fire moves don't lag behind
        window.speechSynthesis.cancel(); 
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Tweak the voice delivery. 
        // A rate of 1.2 is slightly faster and sounds more natural for game commentary.
        utterance.rate = 1.2; 
        
        window.speechSynthesis.speak(utterance);
    }
};