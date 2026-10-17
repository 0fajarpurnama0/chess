// js/engine/controller.js
window.ChessApp = window.ChessApp || {};

window.ChessApp.Engine = {
    isThinking: false,
    engineType: 'uci', 

    init: function(enginePath) {
        if (enginePath === 'simple') {
            this.engineType = 'native';
            // CRUCIAL FIX: Only kill the Lozza worker if the Eval Bar is OFF
            if (!window.ChessApp.evalAllowed && window.ChessApp.UCI && window.ChessApp.UCI.worker) {
                window.ChessApp.UCI.worker.terminate();
                window.ChessApp.UCI.worker = null;
            }
            return; 
        }

        this.engineType = 'uci';
        window.ChessApp.UCI.init(enginePath);
    },

    askForMove: function() {
        if (this.isThinking || window.ChessApp.game.game_over()) return;
        
        this.isThinking = true;

        if (this.engineType === 'native') {
            const botLevel = document.getElementById('simpleBotSelect').value; 
            
            setTimeout(() => {
                const chosenMove = window.ChessApp.NativeBots.getMove(window.ChessApp.game, botLevel);
                this.isThinking = false;
                
                if (chosenMove && window.ChessApp.playMode === 'computer') {
                    window.ChessApp.handleMove({
                        from: chosenMove.from,
                        to: chosenMove.to,
                        promotion: 'q' 
                    }, true);
                }
            }, 500);
            
        } else {
            window.ChessApp.UCI.askForMove(window.ChessApp.game);
        }
    },

    // NEW: Spectator Mode for the Evaluation Bar
    evaluateBoard: function() {
        if (window.ChessApp.game.game_over()) return;
        
        // Ensure Lozza is awake in the background
        if (!window.ChessApp.UCI || !window.ChessApp.UCI.worker) {
            window.ChessApp.UCI.init('lib/lozza.js');
        }
        
        // Tell Lozza to look at the board, but we won't flag 'isThinking' to true.
        // This tells our app that we are just analyzing, not waiting for a move to be played.
        window.ChessApp.UCI.worker.postMessage("position fen " + window.ChessApp.game.fen());
        window.ChessApp.UCI.worker.postMessage("go depth 10"); // Quick depth for fast UI updates
    }
};