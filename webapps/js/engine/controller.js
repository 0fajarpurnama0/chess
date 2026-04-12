// js/engine/controller.js
window.ChessApp = window.ChessApp || {};

window.ChessApp.Engine = {
    isThinking: false,
    engineType: 'uci', 

    init: function(enginePath) {
        if (enginePath === 'simple') {
            this.engineType = 'native';
            // Clean up worker if switching from Lozza to Native
            if (window.ChessApp.UCI && window.ChessApp.UCI.worker) {
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
            
            // Add a slight delay so the UI doesn't feel instantly robotic
            setTimeout(() => {
                const chosenMove = window.ChessApp.NativeBots.getMove(window.ChessApp.game, botLevel);
                
                this.isThinking = false;
                
                if (chosenMove && window.ChessApp.playMode === 'computer') {
                    window.ChessApp.handleMove({
                        from: chosenMove.from,
                        to: chosenMove.to,
                        promotion: 'q' // We will fix auto-queening in the next step!
                    }, true);
                }
            }, 500);
            
        } else {
            // Forward to UCI
            window.ChessApp.UCI.askForMove(window.ChessApp.game);
        }
    }
};