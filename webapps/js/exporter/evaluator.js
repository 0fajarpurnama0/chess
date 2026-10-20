// js/exporter/evaluator.js
window.ChessApp = window.ChessApp || {};
window.ChessApp.Exporter = window.ChessApp.Exporter || {};

window.ChessApp.Exporter.Evaluator = {
    worker: null,

    init: function() {
        if (!this.worker) {
            this.worker = new Worker('lib/lozza.js');
            this.worker.postMessage('uci');
            this.worker.postMessage('ucinewgame');
        }
    },

    cpToWinPercent: function(cp) {
        return 50 + 50 * (2 / (1 + Math.exp(-0.003682 * cp)) - 1);
    },

    evaluateFen: function(fen, turnColor, depth = 10) {
        return new Promise((resolve) => {
            this.init();

            let winPct = 50.0;
            let evalText = "0.0";

            const messageHandler = (e) => {
                const line = e.data;

                if (line.startsWith('info') && line.includes('score')) {
                    if (line.includes('score cp')) {
                        const match = line.match(/score cp (-?\d+)/);
                        if (match) {
                            let cp = parseInt(match[1], 10);
                            if (turnColor === 'b') cp = -cp; // Absolute score relative to White
                            winPct = this.cpToWinPercent(cp);
                            const val = cp / 100.0;
                            evalText = (val >= 0 ? "+" : "") + val.toFixed(1);
                        }
                    } else if (line.includes('score mate')) {
                        const match = line.match(/score mate (-?\d+)/);
                        if (match) {
                            let mateIn = parseInt(match[1], 10);
                            if (turnColor === 'b') mateIn = -mateIn;
                            winPct = mateIn > 0 ? 100.0 : 0.0;
                            evalText = "M" + Math.abs(mateIn);
                        }
                    }
                }

                if (line.startsWith('bestmove')) {
                    this.worker.removeEventListener('message', messageHandler);
                    resolve({ winPct, evalText });
                }
            };

            this.worker.addEventListener('message', messageHandler);
            this.worker.postMessage('position fen ' + fen);
            this.worker.postMessage('go depth ' + depth);
        });
    },

    terminate: function() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
};