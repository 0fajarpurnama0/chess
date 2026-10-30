// js/engine/uci.js
window.ChessApp = window.ChessApp || {};

window.ChessApp.UCI = {
    worker: null,
    currentMode: 'idle', // 'idle', 'eval', or 'move'

    init: function(enginePath) {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        try {
            this.worker = new Worker(enginePath);
        } catch (err) {
            console.error("Failed to load Web Worker.", err);
            return;
        }

        const self = this;

        this.worker.onmessage = function(e) {
            const line = e.data;

            // Handle evaluation bar stats
            if (line.startsWith('info') && window.ChessApp.evalAllowed) {
                if (line.includes('score cp')) {
                    const match = line.match(/score cp (-?\d+)/);
                    if (match) {
                        let cp = parseInt(match[1], 10);
                        if (window.ChessApp.game.turn() === 'b') cp = -cp; 

                        const scoreText = (cp > 0 ? "+" : "") + (cp / 100).toFixed(1);
                        const scoreElem = document.getElementById('eval-score-text');
                        if (scoreElem) scoreElem.innerText = scoreText;

                        let percent = 50 + (cp / 10);
                        percent = Math.max(0, Math.min(100, percent)); 
                        const barElem = document.getElementById('eval-bar-fill');
                        if (barElem) barElem.style.height = percent + '%';
                    }
                }
                
                if (line.includes('score mate')) {
                    const match = line.match(/score mate (-?\d+)/);
                    if (match) {
                        let mateIn = parseInt(match[1], 10);
                        if (window.ChessApp.game.turn() === 'b') mateIn = -mateIn;
                        
                        const scoreElem = document.getElementById('eval-score-text');
                        if (scoreElem) scoreElem.innerText = "M" + Math.abs(mateIn);
                        const barElem = document.getElementById('eval-bar-fill');
                        if (barElem) barElem.style.height = mateIn > 0 ? '100%' : '0%';
                    }
                }

                const depthMatch = line.match(/depth (\d+)/);
                if (depthMatch && document.getElementById('engine-depth')) document.getElementById('engine-depth').innerText = depthMatch[1];
                const nodesMatch = line.match(/nodes (\d+)/);
                if (nodesMatch && document.getElementById('engine-nodes')) document.getElementById('engine-nodes').innerText = parseInt(nodesMatch[1]).toLocaleString();
                const npsMatch = line.match(/nps (\d+)/);
                if (npsMatch && document.getElementById('engine-nps')) document.getElementById('engine-nps').innerText = parseInt(npsMatch[1]).toLocaleString();
                const pvMatch = line.match(/pv (.*)/);
                if (pvMatch && document.getElementById('engine-pv')) {
                    const rawPv = pvMatch[1].trim().split(' ').slice(0, 5).join(' ➔ '); 
                    document.getElementById('engine-pv').innerText = rawPv;
                }
            }

            // Handle move output
            if (line.startsWith('bestmove')) {
                // ABSOLUTE PROTECTION: If the worker was running an evaluation, swallow bestmove completely!
                if (self.currentMode === 'eval') {
                    self.currentMode = 'idle';
                    return; 
                }

                if (self.currentMode !== 'move') {
                    return;
                }

                self.currentMode = 'idle';
                window.ChessApp.Engine.isThinking = false; 

                const parts = line.split(' ');
                const bestMove = parts[1]; 
                if (!bestMove || bestMove === '(none)') return;
                
                const moveObj = {
                    from: bestMove.substring(0, 2),
                    to: bestMove.substring(2, 4),
                    promotion: bestMove.length > 4 ? bestMove[4] : 'q' 
                };
                
                if (window.ChessApp.playMode === 'computer' && window.ChessApp.game.turn() !== window.ChessApp.myColor) {
                    window.ChessApp.handleMove(moveObj, true);
                }
            }
        };

        this.worker.postMessage('uci');
        this.worker.postMessage('ucinewgame');
    },

    evaluateBoard: function(game) {
        if (!this.worker) return;

        // Stop any previous calculation before requesting evaluation
        this.worker.postMessage('stop');
        this.currentMode = 'eval';
        
        this.worker.postMessage('position fen ' + game.fen());
        this.worker.postMessage('go depth 10');
    },

    askForMove: function(game) {
        if (!this.worker) return;

        // Stop any previous calculation before requesting a bot move
        this.worker.postMessage('stop');
        this.currentMode = 'move';

        this.worker.postMessage('position fen ' + game.fen());

        if (window.ChessApp.Timer && window.ChessApp.Timer.isRunning) {
            const wtime = window.ChessApp.Timer.whiteTime * 1000;
            const btime = window.ChessApp.Timer.blackTime * 1000;
            this.worker.postMessage(`go wtime ${wtime} btime ${btime}`);
        } else {
            const strengthElem = document.getElementById('lozzaStrengthSelect');
            const strength = strengthElem ? strengthElem.value : "5";
            if (strength === 'beth') {
                this.worker.postMessage('go depth 14'); 
            } else {
                this.worker.postMessage('go depth ' + strength); 
            }
        }
    }
};