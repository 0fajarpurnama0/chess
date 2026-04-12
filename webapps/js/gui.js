// js/gui.js
window.ChessApp = window.ChessApp || {};

window.ChessApp.GUI = {
    
    // ==========================================
    // 1. STATE VARIABLES
    // ==========================================
    selectedSquare: null,
    pendingMove: null, // Stores a move temporarily while waiting for the user to choose a promotion piece


    // ==========================================
    // 2. DRAG AND DROP LOGIC (chessboard.js hooks)
    // ==========================================
    
    onDragStart: function(source, piece, position, orientation) {
        // Prevent moving if the game is over
        if (window.ChessApp.game.game_over()) return false;
        
        // Prevent moving the opponent's pieces
        if ((window.ChessApp.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (window.ChessApp.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
        
        // Prevent moving if playing online and it's not your turn
        if (window.ChessApp.playMode === 'p2p' && window.ChessApp.game.turn() !== window.ChessApp.myColor) {
            return false;
        }
        
        window.ChessApp.GUI.showLegalMoves(source);
    },

    onDrop: function(source, target) {
        window.ChessApp.GUI.clearLegalMoves();

        // If dropped on the same square, treat it as a click-to-select
        if (source === target) {
            window.ChessApp.GUI.handleSquareClick(source);
            return 'snapback'; // Tell chessboard.js to return piece to center of square
        }

        // Intercept Pawn Promotions before making the move
        if (window.ChessApp.GUI.isPromotion(source, target)) {
            // Verify it's a legal move by temporarily testing a queen promotion
            const tempMove = window.ChessApp.game.move({ from: source, to: target, promotion: 'q' });
            if (tempMove === null) return 'snapback'; 
            window.ChessApp.game.undo();

            window.ChessApp.GUI.showPromotionModal(source, target);
            return; // Leave the piece visually on the edge while modal is open
        }

        // Standard move execution
        const moveObj = { from: source, to: target, promotion: 'q' };
        const tempMove = window.ChessApp.game.move(moveObj);

        // If illegal, snap the piece back to where it started
        if (tempMove === null) return 'snapback';

        // Clean up UI state
        window.ChessApp.GUI.clearHighlight();
        window.ChessApp.GUI.selectedSquare = null;

        // Undo the temp move and process it officially through the app logic
        window.ChessApp.game.undo();
        const success = window.ChessApp.handleMove(tempMove.san);
        if (!success) return 'snapback';
    },

    onSnapEnd: function() {
        // Ensures the visual board syncs perfectly with the internal engine after a move animates
        window.ChessApp.board.position(window.ChessApp.game.fen());
    },


    // ==========================================
    // 3. CLICK-TO-MOVE LOGIC (Mobile Friendly)
    // ==========================================
    
    handleSquareClick: function(square) {
        if (window.ChessApp.game.game_over()) return;
        if (window.ChessApp.playMode === 'p2p' && window.ChessApp.game.turn() !== window.ChessApp.myColor) return;

        const piece = window.ChessApp.game.get(square);
        const isMyPiece = piece && piece.color === window.ChessApp.game.turn();

        // Scenario A: Nothing selected yet. Clicked own piece to select it.
        if (!this.selectedSquare) {
            if (isMyPiece) {
                this.selectedSquare = square;
                this.highlightSquare(square);
                this.showLegalMoves(square);
            }
            return;
        }

        // Scenario B: Clicked the same piece again. Deselect it.
        if (this.selectedSquare === square) {
            this.clearHighlight();
            this.clearLegalMoves();
            this.selectedSquare = null;
            return;
        }

        // Scenario C: Clicked a different piece of own color. Switch selection.
        if (isMyPiece) {
            this.clearHighlight();
            this.clearLegalMoves();
            this.selectedSquare = square;
            this.highlightSquare(square);
            this.showLegalMoves(square);
            return;
        }

        // Scenario D: Clicked an empty square or enemy piece. Attempt to move.
        const source = this.selectedSquare;
        const target = square;

        this.clearHighlight();
        this.clearLegalMoves();
        this.selectedSquare = null;

        // Intercept Promotions on Clicks
        if (this.isPromotion(source, target)) {
            const tempMove = window.ChessApp.game.move({ from: source, to: target, promotion: 'q' });
            if (tempMove !== null) {
                window.ChessApp.game.undo();
                this.showPromotionModal(source, target);
            }
            return;
        }

        const moveObj = { from: source, to: target, promotion: 'q' };
        const tempMove = window.ChessApp.game.move(moveObj);

        if (tempMove !== null) {
            window.ChessApp.game.undo();
            window.ChessApp.handleMove(tempMove.san);
        }
    },


    // ==========================================
    // 4. PAWN PROMOTION INTERCEPTORS
    // ==========================================
    
    isPromotion: function(source, target) {
        const piece = window.ChessApp.game.get(source);
        if (!piece || piece.type !== 'p') return false;
        
        // A pawn moving to rank 8 (White) or rank 1 (Black)
        return (piece.color === 'w' && target[1] === '8') ||
               (piece.color === 'b' && target[1] === '1');
    },

    showPromotionModal: function(source, target) {
        const color = window.ChessApp.game.turn();
        this.pendingMove = { source, target }; 

        const modal = document.getElementById('game-modal');
        document.getElementById('modal-title').innerText = "Promote Pawn:";
        document.getElementById('modal-close').style.display = 'none';

        // Inject the image buttons dynamically based on whose turn it is
        document.getElementById('modal-body').innerHTML = `
            <div class="promotion-pieces">
                <img data-piece="q" src="img/chesspieces/wikipedia/${color}Q.png" alt="Queen">
                <img data-piece="r" src="img/chesspieces/wikipedia/${color}R.png" alt="Rook">
                <img data-piece="b" src="img/chesspieces/wikipedia/${color}B.png" alt="Bishop">
                <img data-piece="n" src="img/chesspieces/wikipedia/${color}N.png" alt="Knight">
            </div>
        `;

        modal.style.display = 'flex';

        // Attach click listeners to the newly injected images
        document.querySelectorAll('.promotion-pieces img').forEach(img => {
            img.onclick = () => {
                const promoPiece = img.getAttribute('data-piece');
                window.ChessApp.GUI.executePromotion(promoPiece);
            };
        });
    },

    executePromotion: function(promoPiece) {
        document.getElementById('game-modal').style.display = 'none';
        if (!this.pendingMove) return;

        const moveObj = {
            from: this.pendingMove.source,
            to: this.pendingMove.target,
            promotion: promoPiece
        };

        const tempMove = window.ChessApp.game.move(moveObj);
        this.pendingMove = null;

        if (tempMove !== null) {
            window.ChessApp.game.undo();
            window.ChessApp.handleMove(tempMove.san);
        } else {
            // Failsafe: if the move was somehow invalid, reset the board UI
            window.ChessApp.board.position(window.ChessApp.game.fen());
        }
    },


    // ==========================================
    // 5. UI & HIGHLIGHTING HELPERS
    // ==========================================

    highlightSquare: function(square) {
        this.clearHighlight();
        const el = document.querySelector(`[data-square="${square}"]`);
        if (el) {
            el.classList.add('highlighted-square');
            el.style.boxShadow = 'inset 0 0 0 4px #3498db'; 
        }
    },

    clearHighlight: function() {
        const els = document.querySelectorAll('.highlighted-square');
        els.forEach(el => {
            el.classList.remove('highlighted-square');
            el.style.boxShadow = '';
        });
    },

    highlightLastMove: function(source, target) {
        // Wipe old last move highlights
        const oldEls = document.querySelectorAll('.highlight-last-move');
        oldEls.forEach(el => el.classList.remove('highlight-last-move'));

        // Apply new last move highlights
        const el1 = document.querySelector(`[data-square="${source}"]`);
        const el2 = document.querySelector(`[data-square="${target}"]`);
        if (el1) el1.classList.add('highlight-last-move');
        if (el2) el2.classList.add('highlight-last-move');
    },

    showLegalMoves: function(square) {
        this.clearLegalMoves(); // Clear any old hints first

        // Ask engine for legal moves from this specific square
        const moves = window.ChessApp.game.moves({
            square: square,
            verbose: true // We need verbose to easily read the 'to' coordinates
        });

        if (moves.length === 0) return;

        moves.forEach(move => {
            const el = document.querySelector(`[data-square="${move.to}"]`);
            if (el) {
                // If there's a piece on the target square, it's a capture!
                if (window.ChessApp.game.get(move.to)) {
                    el.classList.add('legal-move-capture');
                } else {
                    el.classList.add('legal-move-hint');
                }
            }
        });
    },

    clearLegalMoves: function() {
        const hints = document.querySelectorAll('.legal-move-hint, .legal-move-capture');
        hints.forEach(el => {
            el.classList.remove('legal-move-hint');
            el.classList.remove('legal-move-capture');
        });
    }
};