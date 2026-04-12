// js/engine/bots.js
window.ChessApp = window.ChessApp || {};

window.ChessApp.NativeBots = {
    getMove: function(game, botLevel) {
        const possibleMoves = game.moves({ verbose: true });
        if (possibleMoves.length === 0) return null;

        let chosenMove = null;

        if (botLevel === 'random') {
            const randomIdx = Math.floor(Math.random() * possibleMoves.length);
            chosenMove = possibleMoves[randomIdx];

        } else if (botLevel === 'caveman') {
            const captureMoves = possibleMoves.filter(m => m.flags.includes('c') || m.flags.includes('e'));
            if (captureMoves.length > 0) {
                const randomIdx = Math.floor(Math.random() * captureMoves.length);
                chosenMove = captureMoves[randomIdx];
            } else {
                const randomIdx = Math.floor(Math.random() * possibleMoves.length);
                chosenMove = possibleMoves[randomIdx];
            }

        } else if (botLevel === 'assassin') {
            const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
            let bestCaptureMove = null;
            let highestValue = -1;

            for (let m of possibleMoves) {
                if (m.flags.includes('c') || m.flags.includes('e')) {
                    let capturedPiece = m.captured; 
                    if (m.flags.includes('e')) capturedPiece = 'p';

                    const val = pieceValues[capturedPiece] || 0;
                    if (val > highestValue) {
                        highestValue = val;
                        bestCaptureMove = m;
                    }
                }
            }
            chosenMove = bestCaptureMove || possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

        } else if (botLevel === 'scholar') {
            const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
            let bestScore = -9999;
            let bestMoves = [];

            const evaluateBoard = (g) => {
                let score = 0;
                const board = g.board();
                for (let row of board) {
                    for (let square of row) {
                        if (square) {
                            const val = pieceValues[square.type];
                            score += (square.color === g.turn() ? -val : val); 
                        }
                    }
                }
                return score;
            };

            for (let m of possibleMoves) {
                game.move(m);
                let score = evaluateBoard(game); 
                game.undo(); 

                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [m];
                } else if (score === bestScore) {
                    bestMoves.push(m);
                }
            }
            chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

        } else if (botLevel === 'tactician') {
            const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
            
            const evaluateBoard = (g) => {
                let score = 0;
                const board = g.board();
                for (let row of board) {
                    for (let square of row) {
                        if (square) {
                            score += (square.color === 'w' ? pieceValues[square.type] : -pieceValues[square.type]);
                        }
                    }
                }
                return score;
            };

            const minimax = (g, depth, alpha, beta, isMaximizingPlayer) => {
                if (depth === 0 || g.game_over()) {
                    return evaluateBoard(g);
                }

                const moves = g.moves();
                if (isMaximizingPlayer) {
                    let maxEval = -Infinity;
                    for (let m of moves) {
                        g.move(m);
                        let ev = minimax(g, depth - 1, alpha, beta, false);
                        g.undo();
                        maxEval = Math.max(maxEval, ev);
                        alpha = Math.max(alpha, ev);
                        if (beta <= alpha) break; 
                    }
                    return maxEval;
                } else {
                    let minEval = Infinity;
                    for (let m of moves) {
                        g.move(m);
                        let ev = minimax(g, depth - 1, alpha, beta, true);
                        g.undo();
                        minEval = Math.min(minEval, ev);
                        beta = Math.min(beta, ev);
                        if (beta <= alpha) break; 
                    }
                    return minEval;
                }
            };

            const botColor = game.turn();
            const isMaximizing = (botColor === 'w');
            
            let bestScore = isMaximizing ? -Infinity : Infinity;
            let bestMoves = [];

            for (let m of possibleMoves) {
                game.move(m);
                let score = minimax(game, 1, -Infinity, Infinity, !isMaximizing); 
                game.undo();

                if (isMaximizing) {
                    if (score > bestScore) {
                        bestScore = score;
                        bestMoves = [m];
                    } else if (score === bestScore) {
                        bestMoves.push(m);
                    }
                } else {
                    if (score < bestScore) {
                        bestScore = score;
                        bestMoves = [m];
                    } else if (score === bestScore) {
                        bestMoves.push(m);
                    }
                }
            }
            chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }

        return chosenMove;
    }
};