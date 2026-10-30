// js/engine/bots.js
window.ChessApp = window.ChessApp || {};

window.ChessApp.NativeBots = {
    getMove: function(game, botLevel) {
        const possibleMoves = game.moves({ verbose: true });
        if (possibleMoves.length === 0) return null;

        const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        const myColor = game.turn();
        
        let chosenMove = null;

        // ==========================================
        // TIER 1: THE GIMMICKS (Chaos & Flaws)
        // ==========================================

        if (botLevel === 'random') {
            chosenMove = pickRandom(possibleMoves);

        } else if (botLevel === 'copycat') {
            const history = game.history({ verbose: true });
            if (history.length > 0) {
                const lastMove = history[history.length - 1];
                // Mirror rank vertically: rank 2 becomes 7, etc.
                const mirrorSquare = (sq) => sq[0] + (9 - parseInt(sq[1], 10));
                
                const mirroredFrom = mirrorSquare(lastMove.from);
                const mirroredTo = mirrorSquare(lastMove.to);
                
                const copyMove = possibleMoves.find(m => m.from === mirroredFrom && m.to === mirroredTo);
                chosenMove = copyMove || pickRandom(possibleMoves);
            } else {
                chosenMove = pickRandom(possibleMoves);
            }

        } else if (botLevel === 'wanderer') {
            let bestKingMoves = [];
            let maxProgress = -Infinity;
            const kingMoves = possibleMoves.filter(m => m.piece === 'k');
            
            for (let m of kingMoves) {
                const fromRank = parseInt(m.from[1], 10);
                const toRank = parseInt(m.to[1], 10);
                // White wants higher ranks, Black wants lower ranks
                const progress = myColor === 'w' ? (toRank - fromRank) : (fromRank - toRank);
                
                if (progress > maxProgress) {
                    maxProgress = progress;
                    bestKingMoves = [m];
                } else if (progress === maxProgress) {
                    bestKingMoves.push(m);
                }
            }
            chosenMove = bestKingMoves.length > 0 ? pickRandom(bestKingMoves) : pickRandom(possibleMoves);

        } else if (botLevel === 'no_retreat') {
            const forwardMoves = possibleMoves.filter(m => {
                const fromRank = parseInt(m.from[1], 10);
                const toRank = parseInt(m.to[1], 10);
                return myColor === 'w' ? toRank >= fromRank : toRank <= fromRank;
            });
            chosenMove = forwardMoves.length > 0 ? pickRandom(forwardMoves) : pickRandom(possibleMoves);

        } else if (botLevel === 'obsessive') {
            const history = game.history({ verbose: true });
            let lastBotMove = history.length >= 2 ? history[history.length - 2] : null;
            
            if (lastBotMove) {
                const repeatMoves = possibleMoves.filter(m => m.from === lastBotMove.to);
                if (repeatMoves.length > 0) chosenMove = pickRandom(repeatMoves);
            }
            if (!chosenMove) chosenMove = pickRandom(possibleMoves);


        // ==========================================
        // TIER 2: THE EXTREMISTS (Hyper-focused)
        // ==========================================

        } else if (botLevel === 'pacifist') {
            const peacefulMoves = possibleMoves.filter(m => !m.flags.includes('c') && !m.flags.includes('e'));
            chosenMove = peacefulMoves.length > 0 ? pickRandom(peacefulMoves) : pickRandom(possibleMoves);

        } else if (botLevel === 'caveman') {
            const captureMoves = possibleMoves.filter(m => m.flags.includes('c') || m.flags.includes('e'));
            chosenMove = captureMoves.length > 0 ? pickRandom(captureMoves) : pickRandom(possibleMoves);

        } else if (botLevel === 'assassin') {
            let bestCaptureMove = null;
            let highestValue = -1;

            for (let m of possibleMoves) {
                if (m.flags.includes('c') || m.flags.includes('e')) {
                    const capturedPiece = m.flags.includes('e') ? 'p' : m.captured;
                    const val = pieceValues[capturedPiece] || 0;
                    if (val > highestValue) {
                        highestValue = val;
                        bestCaptureMove = m;
                    }
                }
            }
            chosenMove = bestCaptureMove || pickRandom(possibleMoves);

        } else if (botLevel === 'check_seeker') {
            const checkMoves = possibleMoves.filter(m => m.san.includes('+') || m.san.includes('#'));
            chosenMove = checkMoves.length > 0 ? pickRandom(checkMoves) : pickRandom(possibleMoves);

        } else if (botLevel === 'pawn_pusher') {
            const pawnMoves = possibleMoves.filter(m => m.piece === 'p');
            chosenMove = pawnMoves.length > 0 ? pickRandom(pawnMoves) : pickRandom(possibleMoves);

        } else if (botLevel === 'edge_lord') {
            const fileScore = { 'a': 3, 'h': 3, 'b': 2, 'g': 2, 'c': 1, 'f': 1, 'd': 0, 'e': 0 };
            const rankScore = { '1': 3, '8': 3, '2': 2, '7': 2, '3': 1, '6': 1, '4': 0, '5': 0 };
            
            let maxEdge = -1;
            let edgeMoves = [];
            for (let m of possibleMoves) {
                const score = fileScore[m.to[0]] + rankScore[m.to[1]];
                if (score > maxEdge) {
                    maxEdge = score;
                    edgeMoves = [m];
                } else if (score === maxEdge) {
                    edgeMoves.push(m);
                }
            }
            chosenMove = pickRandom(edgeMoves);


        // ==========================================
        // TIER 3: THE FUNDAMENTALS (Basic Chess Logic)
        // ==========================================

        } else if (botLevel === 'textbook') {
            let maxTxScore = -1;
            let txMoves = [];
            for (let m of possibleMoves) {
                let score = 0;
                if (m.flags.includes('k') || m.flags.includes('q')) score = 10; // Castling
                else if (['n', 'b'].includes(m.piece) && !['1', '8'].includes(m.to[1])) score = 5; // Develop minors
                else if (m.piece === 'p' && ['d', 'e'].includes(m.to[0])) score = 3; // Center pawns
                else score = 1;

                if (score > maxTxScore) {
                    maxTxScore = score;
                    txMoves = [m];
                } else if (score === maxTxScore) {
                    txMoves.push(m);
                }
            }
            chosenMove = pickRandom(txMoves);

        } else if (botLevel === 'defender') {
            let bestMoves = [];
            let minOpponentMaxCapture = Infinity;

            for (let m of possibleMoves) {
                game.move(m);
                let opponentMaxCapture = 0;
                
                // See what the opponent's best capture would be on the next turn
                const oppMoves = game.moves({ verbose: true });
                for (let om of oppMoves) {
                    if (om.flags.includes('c') || om.flags.includes('e')) {
                        const cap = om.flags.includes('e') ? 'p' : om.captured;
                        const val = pieceValues[cap] || 0;
                        if (val > opponentMaxCapture) opponentMaxCapture = val;
                    }
                }
                game.undo();

                // We want to pick the move that minimizes the opponent's best capture
                if (opponentMaxCapture < minOpponentMaxCapture) {
                    minOpponentMaxCapture = opponentMaxCapture;
                    bestMoves = [m];
                } else if (opponentMaxCapture === minOpponentMaxCapture) {
                    bestMoves.push(m);
                }
            }
            chosenMove = pickRandom(bestMoves);

        } else if (botLevel === 'scholar') {
            // Original flat material counting
            let bestScore = -Infinity;
            let bestMoves = [];

            for (let m of possibleMoves) {
                game.move(m);
                let score = 0;
                const board = game.board();
                for (let row of board) {
                    for (let sq of row) {
                        if (sq) {
                            const val = pieceValues[sq.type];
                            score += (sq.color === myColor ? val : -val); 
                        }
                    }
                }
                game.undo(); 

                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [m];
                } else if (score === bestScore) {
                    bestMoves.push(m);
                }
            }
            chosenMove = pickRandom(bestMoves);

        } else if (botLevel === 'strategist') {
            // Material + Center Control
            const pieceVals = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
            const centerBonuses = [
                [ 0,  0,  0,  0,  0,  0,  0,  0],
                [ 0,  0,  0,  0,  0,  0,  0,  0],
                [ 0,  0, 10, 15, 15, 10,  0,  0],
                [ 0, 10, 20, 30, 30, 20, 10,  0],
                [ 0, 10, 20, 30, 30, 20, 10,  0],
                [ 0,  0, 10, 15, 15, 10,  0,  0],
                [ 0,  0,  0,  0,  0,  0,  0,  0],
                [ 0,  0,  0,  0,  0,  0,  0,  0]
            ];

            let bestScore = -Infinity;
            let bestMoves = [];

            for (let m of possibleMoves) {
                game.move(m);
                let score = 0;
                const board = game.board();
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        const sq = board[r][c];
                        if (sq) {
                            let val = pieceVals[sq.type];
                            // Rank 0 is row 8 from white's perspective in array
                            if (['n', 'b', 'p'].includes(sq.type)) val += centerBonuses[r][c];
                            score += (sq.color === myColor ? val : -val);
                        }
                    }
                }
                game.undo(); 

                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [m];
                } else if (score === bestScore) {
                    bestMoves.push(m);
                }
            }
            chosenMove = pickRandom(bestMoves);

        } else if (botLevel === 'tactician') {
            // 2-ply Minimax (Looks ahead 1 full turn: Bot -> Player)
            const pieceVals = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
            
            const evaluateBoard = (g) => {
                let score = 0;
                const board = g.board();
                for (let row of board) {
                    for (let sq of row) {
                        if (sq) score += (sq.color === 'w' ? pieceVals[sq.type] : -pieceVals[sq.type]);
                    }
                }
                return score;
            };

            const minimax = (g, depth, alpha, beta, isMaximizingPlayer) => {
                if (depth === 0 || g.game_over()) return evaluateBoard(g);

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

            const isMaximizing = (myColor === 'w');
            let bestScore = isMaximizing ? -Infinity : Infinity;
            let bestMoves = [];

            for (let m of possibleMoves) {
                game.move(m);
                // Depth 1 means 1 ply more after this move (opponent's response)
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
            chosenMove = pickRandom(bestMoves);
        }

        // Fallback safety net
        return chosenMove || pickRandom(possibleMoves);
    }
};