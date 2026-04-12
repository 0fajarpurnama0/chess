// js/app.js

// ==========================================
// 1. APP INFRASTRUCTURE
// ==========================================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log("Service Worker Registered"))
        .catch(err => console.error("Service Worker Failed", err));
}

// Automatically resize the board if the user resizes their browser window
window.addEventListener('resize', () => {
    if (window.ChessApp.board && document.getElementById('game-wrapper').style.display === 'block') {
        window.ChessApp.board.resize();
    }
});


// ==========================================
// 2. GAME MODE INITIALIZATION
// ==========================================

// --- Local Play (Pass & Play) ---
document.getElementById('localPlayBtn').addEventListener('click', () => {
    window.ChessApp.playMode = 'local';
    
    // UI Toggles
    document.getElementById('connection-panel').style.display = 'none';
    document.getElementById('game-wrapper').style.display = 'block';
    document.querySelector('.chat-container').style.display = 'none';
    document.getElementById('practice-controls').style.display = 'block';
    document.getElementById('bot-selection-container').style.display = 'none';
    document.getElementById('simple-bot-container').style.display = 'none';
    document.getElementById('lozza-strength-container').style.display = 'none';
    
    // Fix mini-board by waiting 10ms for CSS to update before resizing
    setTimeout(() => {
        window.ChessApp.board.resize();
        window.ChessApp.updateStatus();
        
        // Start Timer explicitly after DOM load
        const timeSetting = window.ChessApp.getTimeSetting();
        if (window.ChessApp.Timer) {
            window.ChessApp.Timer.init(timeSetting);
            window.ChessApp.Timer.start();
        }
    }, 10);
});

// --- Play vs Computer ---
document.getElementById('playComputerBtn').addEventListener('click', () => {
    window.ChessApp.playMode = 'computer';
    
    let chosenColor = document.getElementById('colorSelect').value;
    if (chosenColor === 'r') chosenColor = Math.random() < 0.5 ? 'w' : 'b';
    window.ChessApp.myColor = chosenColor;

    // UI Toggles
    document.getElementById('connection-panel').style.display = 'none';
    document.getElementById('game-wrapper').style.display = 'block';
    document.getElementById('practice-controls').style.display = 'block';
    document.getElementById('bot-selection-container').style.display = 'flex';
    
    const selectedEngine = document.getElementById('engineTypeSelect').value;
    document.getElementById('simple-bot-container').style.display = (selectedEngine === 'simple') ? 'flex' : 'none';
    document.getElementById('lozza-strength-container').style.display = (selectedEngine === 'lib/lozza.js') ? 'flex' : 'none';

    window.ChessApp.Engine.init(selectedEngine);

    // Fix mini-board by resizing after DOM paint
    setTimeout(() => {
        if (window.ChessApp.myColor === 'b') {
            window.ChessApp.board.orientation('black');
            // If human is black, bot goes first
            setTimeout(() => { window.ChessApp.Engine.askForMove(); }, 500);
        } else {
            window.ChessApp.board.orientation('white');
        }
        
        window.ChessApp.board.resize();
        window.ChessApp.updateStatus();

        const timeVal = document.getElementById('timeControlSelect').value;
        if (timeVal !== "none" && window.ChessApp.Timer) {
            window.ChessApp.Timer.init(window.ChessApp.getTimeSetting()); 
            window.ChessApp.Timer.start();
        }
    }, 10);
});


// ==========================================
// 3. ENGINE & BOT SETTINGS (HOT-SWAPPING)
// ==========================================

// Change Main Category (Simple vs Lozza)
document.getElementById('engineTypeSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    document.getElementById('simple-bot-container').style.display = (val === 'simple') ? 'flex' : 'none';
    document.getElementById('lozza-strength-container').style.display = (val === 'lib/lozza.js') ? 'flex' : 'none';
    
    window.ChessApp.Engine.init(val);
    
    if (window.ChessApp.playMode === 'computer' && window.ChessApp.game.turn() !== window.ChessApp.myColor) {
        window.ChessApp.Engine.askForMove();
    }
});

// Change Simple Bot Level
document.getElementById('simpleBotSelect').addEventListener('change', () => {
    if (window.ChessApp.playMode === 'computer' && window.ChessApp.game.turn() !== window.ChessApp.myColor) {
        window.ChessApp.Engine.askForMove();
    }
});

// Change Lozza's Strength
document.getElementById('lozzaStrengthSelect').addEventListener('change', () => {
    if (window.ChessApp.playMode === 'computer' && window.ChessApp.game.turn() !== window.ChessApp.myColor) {
        window.ChessApp.Engine.askForMove();
    }
});


// ==========================================
// 4. IN-GAME CONTROLS (Time, Reset, FEN)
// ==========================================

// Time Control UI Logic
document.getElementById('timeControlSelect').addEventListener('change', function() {
    const customInput = document.getElementById('customTimeInput');
    customInput.style.display = (this.value === 'custom') ? 'inline-block' : 'none';
});

window.ChessApp.getTimeSetting = function() {
    const selectVal = document.getElementById('timeControlSelect').value;
    if (selectVal === 'unlimited') return 'unlimited';
    if (selectVal === 'custom') {
        const mins = parseInt(document.getElementById('customTimeInput').value, 10);
        return (isNaN(mins) || mins <= 0 ? 15 : mins) * 60; // Fallback to 15 mins
    }
    return selectVal;
};

// Reset Board
document.getElementById('resetBtn').addEventListener('click', () => {
    if (window.ChessApp.playMode === 'local') {
        if (confirm("Reset the board to the starting position?")) {
            window.ChessApp.game.reset();
            window.ChessApp.board.start();
            
            if (window.ChessApp.Timer) {
                window.ChessApp.Timer.init(window.ChessApp.getTimeSetting());
                window.ChessApp.Timer.start(); // Restart clock
            }
            window.ChessApp.updateStatus();
        }
    } else if (window.ChessApp.playMode === 'computer') {
        if (confirm("Reset the game against the bot?")) {
            window.ChessApp.game.reset();
            window.ChessApp.board.start();
            
            if (window.ChessApp.Timer) {
                window.ChessApp.Timer.init(window.ChessApp.getTimeSetting());
                // Only start clock immediately if human is white. Otherwise wait for bot.
                if (window.ChessApp.myColor === 'w') window.ChessApp.Timer.start(); 
            }
            
            window.ChessApp.updateStatus();
            
            if (window.ChessApp.myColor === 'b') {
                setTimeout(() => { window.ChessApp.Engine.askForMove(); }, 500);
            }
        }
    } else if (window.ChessApp.requestNetworkReset) {
        // Delegate P2P resets to the networking file
        window.ChessApp.requestNetworkReset();
    }
});

// Load custom FEN
document.getElementById('loadBtn').addEventListener('click', () => {
    const fenStr = document.getElementById('fenInput').value.trim();
    if (!fenStr) { alert("Please paste a FEN string first."); return; }

    // Validate FEN using a temporary chess instance
    const tempGame = new Chess();
    if (!tempGame.load(fenStr)) {
        alert("Invalid FEN string.");
        return;
    }

    if (window.ChessApp.playMode === 'local') {
        window.ChessApp.game.load(fenStr);
        window.ChessApp.board.position(window.ChessApp.game.fen());
        window.ChessApp.updateStatus();
        document.getElementById('fenInput').value = '';
    } else if (window.ChessApp.requestNetworkFen) {
        window.ChessApp.requestNetworkFen(fenStr);
    }
});


// ==========================================
// 5. MAIN INITIALIZATION (DOM Load)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialize Chessboard.js
    const config = {
        pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
        position: 'start',
        showNotation: true,
        draggable: true,
        onDragStart: window.ChessApp.GUI.onDragStart,
        onDrop: window.ChessApp.GUI.onDrop,
        onSnapEnd: window.ChessApp.GUI.onSnapEnd
    };
    
    window.ChessApp.board = Chessboard('myBoard', config);

    // 2. Listen for clicks on the board for the Tap-To-Move feature
    document.getElementById('myBoard').addEventListener('click', (e) => {
        const squareEl = e.target.closest('[data-square]');
        if (squareEl) {
            const square = squareEl.getAttribute('data-square');
            
            // Check if the clicked square contains one of our own pieces
            const piece = window.ChessApp.game.get(square);
            const isMyPiece = piece && piece.color === window.ChessApp.game.turn();

            // Only trigger the DOM click logic if it is an EMPTY square or an ENEMY piece.
            // Clicks on our own pieces are handled safely by gui.js -> onDrop (source === target)
            if (!isMyPiece) {
                window.ChessApp.GUI.handleSquareClick(square);
            }
        }
    });

    // 3. Manual Text Input Hooks
    document.getElementById('submitBtn').addEventListener('click', () => {
        const moveStr = document.getElementById('moveInput').value.trim();
        if (window.ChessApp.handleMove(moveStr)) {
            document.getElementById('moveInput').value = '';
        } else {
            alert("Invalid move! Use SAN format (e.g. e4, Nf3, O-O).");
        }
    });

    document.getElementById('moveInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            document.getElementById('submitBtn').click();
        }
    });

    // 4. Auxiliary Buttons (Copy, Undo, Eval, Flip)
    document.getElementById('copyPgnBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(window.ChessApp.game.pgn());
    });
    
    document.getElementById('copyFenBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(window.ChessApp.game.fen());
    });
    
    document.getElementById('undoBtn').addEventListener('click', () => {
        window.ChessApp.requestUndo();
    });

    document.getElementById('toggleEvalBtn').addEventListener('click', () => {
        window.ChessApp.requestEvalToggle();
    });

    document.getElementById('flipBtn').addEventListener('click', () => {
        window.ChessApp.board.flip();
        window.ChessApp.board.resize(); // Prevent visual bugs
    });
    
    // 5. Final Status Sync
    window.ChessApp.updateStatus();
});