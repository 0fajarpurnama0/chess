// js/exporter/pipeline.js
window.ChessApp = window.ChessApp || {};
window.ChessApp.Exporter = window.ChessApp.Exporter || {};

window.ChessApp.Exporter.Pipeline = {
    isProcessing: false,

    runBatchExport: async function(pgnString, options = {}, onProgress = null) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const myUsernames = options.usernames || ['0fajarpurnama0', 'fajar purnama'];
        const engineDepth = options.depth || 8;

        // 1. Parse PGN
        const parsed = window.ChessApp.Exporter.Parser.extractMoveTimeline(pgnString, myUsernames);
        if (!parsed) {
            this.isProcessing = false;
            throw new Error('Invalid PGN string.');
        }

        // 2. Preload Assets
        await window.ChessApp.Exporter.Renderer.preloadPieces();

        const frames = [];
        const total = parsed.timeline.length;

        // 3. Process each move sequentially
        for (let i = 0; i < total; i++) {
            const item = parsed.timeline[i];
            const tempGame = new Chess(item.fen);
            const turnColor = tempGame.turn();

            // Evaluate position using Lozza
            const { winPct, evalText } = await window.ChessApp.Exporter.Evaluator.evaluateFen(
                item.fen, 
                turnColor, 
                engineDepth
            );

            // Render Frame
            const dataUrl = window.ChessApp.Exporter.Renderer.renderFrame(
                item.fen,
                parsed.orientation,
                winPct,
                evalText,
                item.lastMove
            );

            frames.push({
                frameIndex: item.moveIndex,
                san: item.san,
                duration: item.duration,
                evalText: evalText,
                winPct: winPct,
                dataUrl: dataUrl
            });

            if (onProgress) {
                onProgress({ current: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
            }
        }

        window.ChessApp.Exporter.Evaluator.terminate();
        this.isProcessing = false;

        return {
            metadata: parsed.headers,
            orientation: parsed.orientation,
            frames: frames
        };
    }
};