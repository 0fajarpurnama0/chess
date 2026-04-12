// js/timer.js

window.ChessApp.Timer = {
    
    // ==========================================
    // 1. TIMER STATE
    // ==========================================
    timeW: 0,
    timeB: 0,
    interval: null,
    isEnabled: false,


    // ==========================================
    // 2. CORE CONTROLS (INIT, START, STOP)
    // ==========================================
    
    init: function(seconds) {
        this.stop(); // Clear any existing intervals
        
        // Handle Unlimited Time
        if (seconds === 'unlimited') {
            this.isEnabled = false;
            document.getElementById('timer-display').style.display = 'none';
            return;
        }
        
        // Setup countdown timer
        this.isEnabled = true;
        this.timeW = parseInt(seconds, 10);
        this.timeB = parseInt(seconds, 10);
        
        document.getElementById('timer-display').style.display = 'flex';
        this.updateUI();
    },

    start: function() {
        if (!this.isEnabled) return;
        this.stop(); // Prevent duplicate intervals from stacking
        this.interval = setInterval(() => this.tick(), 1000);
    },

    stop: function() {
        if (this.interval) clearInterval(this.interval);
    },

    tick: function() {
        // Halt the clock if the game has ended naturally (checkmate, draw, etc.)
        if (window.ChessApp.game.game_over()) {
            this.stop();
            return;
        }

        // Decrement the active player's clock
        const turn = window.ChessApp.game.turn();
        if (turn === 'w') {
            if (this.timeW > 0) this.timeW--;
        } else {
            if (this.timeB > 0) this.timeB--;
        }
        
        this.updateUI();
    },


    // ==========================================
    // 3. NETWORK SYNCHRONIZATION
    // ==========================================
    
    // Used by network.js to fix latency drift during P2P multiplayer
    sync: function(timeW, timeB) {
        if (!this.isEnabled) return;
        this.timeW = timeW;
        this.timeB = timeB;
        this.updateUI();
    },


    // ==========================================
    // 4. UI UPDATES & FORMATTING
    // ==========================================
    
    updateUI: function() {
        if (!this.isEnabled) return;
        
        const elW = document.getElementById('timer-w');
        const elB = document.getElementById('timer-b');

        // Update textual time display
        elW.querySelector('span').innerText = this.format(this.timeW);
        elB.querySelector('span').innerText = this.format(this.timeB);

        // Highlight the active timer with a colored border
        const turn = window.ChessApp.game.turn();
        elW.style.borderColor = turn === 'w' ? '#3498db' : 'transparent';
        elB.style.borderColor = turn === 'b' ? '#3498db' : 'transparent';

        // --- Soft Timer Logic --- 
        // Turn red and append (FLAGGED) at 0, but do not forcefully stop the game.
        if (this.timeW === 0) {
            elW.style.color = 'red';
            if (!elW.innerText.includes("FLAGGED")) elW.querySelector('span').innerText += " (FLAGGED)";
        } else {
            elW.style.color = 'inherit';
        }

        if (this.timeB === 0) {
            elB.style.color = 'red';
            if (!elB.innerText.includes("FLAGGED")) elB.querySelector('span').innerText += " (FLAGGED)";
        } else {
            elB.style.color = 'inherit';
        }
    },

    // Helper method to convert raw seconds into MM:SS format
    format: function(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
};