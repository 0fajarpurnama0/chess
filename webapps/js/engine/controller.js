// js/engine/controller.js
window.ChessApp = window.ChessApp || {};

window.ChessApp.Engine = {
    isThinking: false,
    engineType: 'uci', 

    init: function(enginePath) {
        if (enginePath === 'simple') {
            this.engineType = 'native';
            // Do not terminate worker if evaluation bar is using it
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

        if (this.engineType === 'native') {
            this.isThinking = true;
            const botLevel = document.getElementById('simpleBotSelect') ? document.getElementById('simpleBotSelect').value : 'random'; 
            
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
            this.isThinking = true;
            window.ChessApp.UCI.askForMove(window.ChessApp.game);
        }
    },

    evaluateBoard: function() {
        if (window.ChessApp.game.game_over() || !window.ChessApp.evalAllowed) return;
        
        if (!window.ChessApp.UCI || !window.ChessApp.UCI.worker) {
            window.ChessApp.UCI.init('lib/lozza.js');
        }
        
        window.ChessApp.UCI.evaluateBoard(window.ChessApp.game);
    }
};