// js/exporter/parser.js
window.ChessApp = window.ChessApp || {};
window.ChessApp.Exporter = window.ChessApp.Exporter || {};

window.ChessApp.Exporter.Parser = {
    DEFAULT_DURATION: 1.0,
    MIN_DURATION: 0.2,

    parseClock: function(comment) {
        if (!comment) return null;
        const match = comment.match(/\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/);
        if (match) {
            const h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const s = parseFloat(match[3]);
            return h * 3600 + m * 60 + s;
        }
        return null;
    },

    // Parses [%emt H:MM:SS] or [%emt M:SS] or [%emt SS] elapsed move time
    parseEmt: function(comment) {
        if (!comment) return null;
        const match = comment.match(/\[%emt\s+(?:(\d+):)?(?:(\d+):)?(\d+(?:\.\d+)?)\]/);
        if (match) {
            const hours = match[1] && match[2] ? parseInt(match[1], 10) : 0;
            const mins = match[1] && !match[2] ? parseInt(match[1], 10) : (match[2] ? parseInt(match[2], 10) : 0);
            const secs = parseFloat(match[3]);
            return hours * 3600 + mins * 60 + secs;
        }
        return null;
    },

    parseTimestamp: function(comment) {
        if (!comment) return null;
        const match = comment.match(/\[%timestamp\s+(\d+)\]/);
        return match ? parseInt(match[1], 10) / 10.0 : null;
    },

    parseTimeControl: function(tcHeader) {
        if (!tcHeader || tcHeader === '?') return { base: null, inc: 0 };
        const parts = tcHeader.split('+');
        const base = parseFloat(parts[0]) || null;
        const inc = parts[1] ? parseFloat(parts[1]) || 0 : 0;
        return { base, inc };
    },

    determineOrientation: function(headers, myUsernames = []) {
        const blackPlayer = (headers.Black || '').trim().toLowerCase();
        for (let uname of myUsernames) {
            if (blackPlayer.includes(uname.toLowerCase())) return 'b';
        }
        return 'w';
    },

    extractMoveTimeline: function(pgnString, myUsernames = []) {
        const tempGame = new Chess();
        if (!tempGame.load_pgn(pgnString)) return null;

        const headers = tempGame.header();
        const orientation = this.determineOrientation(headers, myUsernames);
        const tc = this.parseTimeControl(headers.TimeControl);

        const history = tempGame.history({ verbose: true });
        const comments = tempGame.get_comments ? tempGame.get_comments() : [];

        // Build position list starting from move 0
        const replayGame = new Chess();
        const timeline = [{
            moveIndex: 0,
            san: 'Start',
            fen: replayGame.fen(),
            lastMove: null,
            duration: this.DEFAULT_DURATION
        }];

        let prevClocks = { w: tc.base, b: tc.base };

        for (let i = 0; i < history.length; i++) {
            const move = history[i];
            replayGame.move(move);

            // Find comment for this move if available
            const moveComment = comments[i] ? comments[i].comment : '';
            
            const emt = this.parseEmt(moveComment);
            const ts = this.parseTimestamp(moveComment);
            const currClk = this.parseClock(moveComment);

            let duration = this.DEFAULT_DURATION;
            const turn = move.color;
            const prevClk = prevClocks[turn];

            // Timing Priority Hierarchy:
            // 1. [%emt ...] - Explicit Elapsed Move Time
            // 2. [%timestamp ...] - Explicit timestamp in tenths of a second
            // 3. [%clk ...] - Calculated delta between remaining clock times
            if (emt !== null) {
                duration = Math.max(emt, this.MIN_DURATION);
            } else if (ts !== null) {
                duration = Math.max(ts, this.MIN_DURATION);
            } else if (currClk !== null && prevClk !== null) {
                duration = Math.max(prevClk - currClk + tc.inc, this.MIN_DURATION);
                prevClocks[turn] = currClk;
            }

            timeline.push({
                moveIndex: i + 1,
                san: move.san,
                fen: replayGame.fen(),
                lastMove: { from: move.from, to: move.to },
                duration: duration
            });
        }

        return { headers, orientation, timeline };
    }
};