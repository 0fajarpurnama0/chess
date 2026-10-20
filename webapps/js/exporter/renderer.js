// js/exporter/renderer.js
window.ChessApp = window.ChessApp || {};
window.ChessApp.Exporter = window.ChessApp.Exporter || {};

window.ChessApp.Exporter.Renderer = {
    pieceImages: {},
    isLoaded: false,

    preloadPieces: function() {
        if (this.isLoaded) return Promise.resolve();
        const pieces = ['wP','wN','wB','wR','wQ','wK','bP','bN','bB','bR','bQ','bK'];
        let loadedCount = 0;

        return new Promise((resolve) => {
            pieces.forEach((p) => {
                const img = new Image();
                img.src = `img/chesspieces/wikipedia/${p}.png`;
                img.onload = () => {
                    this.pieceImages[p] = img;
                    loadedCount++;
                    if (loadedCount === pieces.length) {
                        this.isLoaded = true;
                        resolve();
                    }
                };
            });
        });
    },

    renderFrame: function(fen, orientation, winPct, evalText, lastMove = null, boardSize = 600) {
        const barWidth = 32;
        const margin = 8;
        const canvasWidth = boardSize + barWidth + (margin * 3);
        const canvasHeight = boardSize;

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        // Background Fill
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // --- 1. Draw Evaluation Bar ---
        const x0 = margin;
        const y0 = margin;
        const x1 = margin + barWidth;
        const y1 = canvasHeight - margin;
        const barHeight = y1 - y0;

        const whiteHeight = Math.round(barHeight * (winPct / 100.0));

        // Dark side bar (top/fill)
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(x0, y0, barWidth, barHeight);

        // White side bar (bottom)
        ctx.fillStyle = '#ebebeb';
        ctx.fillRect(x0, y1 - whiteHeight, barWidth, whiteHeight);

        // Border
        ctx.strokeStyle = '#787878';
        ctx.lineWidth = 1;
        ctx.strokeRect(x0, y0, barWidth, barHeight);

        // Score Text
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = winPct > 50 ? '#0a0a0a' : '#f0f0f0';
        const textY = winPct > 50 ? Math.max(y0 + 14, y1 - whiteHeight + 14) : Math.min(y1 - 6, y0 + 16);
        ctx.fillText(evalText, x0 + barWidth / 2, textY);

        // --- 2. Draw Chessboard ---
        const boardX = barWidth + (margin * 2);
        const sqSize = boardSize / 8;
        const tempGame = new Chess(fen);
        const boardState = tempGame.board();

        const files = ['a','b','c','d','e','f','g','h'];
        const ranks = ['8','7','6','5','4','3','2','1'];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const isLight = (r + c) % 2 === 0;
                const px = boardX + c * sqSize;
                const py = r * sqSize;

                ctx.fillStyle = isLight ? '#f0d9b5' : '#b58863';
                ctx.fillRect(px, py, sqSize, sqSize);

                // Highlight Last Move
                if (lastMove) {
                    const currentSq = orientation === 'w' 
                        ? files[c] + ranks[r]
                        : files[7 - c] + ranks[7 - r];
                    if (currentSq === lastMove.from || currentSq === lastMove.to) {
                        ctx.fillStyle = 'rgba(155, 199, 0, 0.41)';
                        ctx.fillRect(px, py, sqSize, sqSize);
                    }
                }

                // Draw Piece
                const gridR = orientation === 'w' ? r : 7 - r;
                const gridC = orientation === 'w' ? c : 7 - c;
                const piece = boardState[gridR][gridC];

                if (piece) {
                    const pieceKey = piece.color + piece.type.toUpperCase();
                    const pieceImg = this.pieceImages[pieceKey];
                    if (pieceImg) {
                        ctx.drawImage(pieceImg, px, py, sqSize, sqSize);
                    }
                }
            }
        }

        return canvas.toDataURL('image/png');
    }
};