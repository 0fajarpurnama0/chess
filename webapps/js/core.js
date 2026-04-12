// js/core.js

// ==========================================
// 1. STATE & INITIALIZATION
// ==========================================
window.ChessApp = {
    game: new Chess(),
    board: null,
    myColor: 'w',
    playMode: 'p2p',     // Modes: 'p2p', 'local', or 'computer'
    sendNetworkData: null, // Hook for WebRTC message sending
    evalAllowed: false   // Tracks if the engine evaluation bar is active
};


// ==========================================
// 2. CORE MOVE EXECUTION
// ==========================================
window.ChessApp.handleMove = function(moveText, isRemote = false) {
    // Prevent moving if playing online and it's not your turn (unless the move came from the network)
    if (window.ChessApp.playMode === 'p2p' && !isRemote && window.ChessApp.game.turn() !== window.ChessApp.myColor) {
        return false; 
    }

    // Attempt to execute the move in the game logic
    const move = window.ChessApp.game.move(moveText);
    if (move === null) return false; // Invalid move

    // --- A. Visual & Audio Polish ---
    if (window.ChessApp.Speech) window.ChessApp.Speech.speakMove(move);
    if (window.ChessApp.GUI && window.ChessApp.GUI.highlightLastMove) {
        window.ChessApp.GUI.highlightLastMove(move.from, move.to);
    }
    
    // Sync the visual board with the internal logic
    window.ChessApp.board.position(window.ChessApp.game.fen()); 
    window.ChessApp.updateStatus();             
    
    // Update timers if they exist
    if (window.ChessApp.Timer) window.ChessApp.Timer.updateUI();
    
    // --- B. Network Broadcast ---
    // If playing P2P and this was a local move, send it to the opponent
    if (window.ChessApp.playMode === 'p2p' && !isRemote && window.ChessApp.sendNetworkData) {
        let payload = { type: 'move', san: move.san };
        
        // Attach our exact clock times to keep both clients perfectly synced
        if (window.ChessApp.Timer && window.ChessApp.Timer.isEnabled) {
            payload.timeW = window.ChessApp.Timer.timeW;
            payload.timeB = window.ChessApp.Timer.timeB;
        }
        
        window.ChessApp.sendNetworkData(payload);
    }
    
    // --- C. Engine Hooks (Bots & Eval) ---
    // If playing vs Computer, and it is the computer's turn, trigger its response
    if (window.ChessApp.playMode === 'computer') {
        if (window.ChessApp.game.turn() !== window.ChessApp.myColor && !window.ChessApp.game.game_over()) {
            // Add a tiny delay so the UI can draw the player's move before the bot locks the thread
            setTimeout(() => { window.ChessApp.Engine.askForMove(); }, 250);
        }
    }

    // If Eval Bar is on (and we aren't already asking the bot for a move), ask for an evaluation
    if (window.ChessApp.evalAllowed && window.ChessApp.playMode !== 'computer') {
        window.ChessApp.Engine.askForMove();
    }

    return true; 
};


// ==========================================
// 3. UI & STATUS UPDATES
// ==========================================

window.ChessApp.updateStatus = function() {
    const statusDisplay = document.getElementById('status');
    const moveInput = document.getElementById('moveInput');
    const submitBtn = document.getElementById('submitBtn');
    const pgnDisplay = document.getElementById('pgn-output');
    const fenDisplay = document.getElementById('fen-output');
    const cheatSheetDiv = document.getElementById('cheat-sheet');

    let statusText = '';
    let moveColor = (window.ChessApp.game.turn() === 'b') ? 'Black' : 'White';
    let isMyTurn = (window.ChessApp.game.turn() === window.ChessApp.myColor);

    // --- Scenario A: The Game is Over ---
    if (window.ChessApp.game.game_over()) {
        let title = "";
        let message = "";
        
        if (window.ChessApp.game.in_checkmate()) {
            title = "Checkmate!";
            message = `${moveColor} is in checkmate. ${(moveColor === 'White' ? 'Black' : 'White')} wins!`;
            statusText = message;
        } else if (window.ChessApp.game.in_draw()) {
            title = "Draw";
            message = "The game ended in a draw.";
            if (window.ChessApp.game.in_stalemate()) message += " (Stalemate)";
            else if (window.ChessApp.game.in_threefold_repetition()) message += " (Threefold Repetition)";
            statusText = message;
        }

        // Trigger the Victory/Draw Modal
        const modal = document.getElementById('game-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = `<p style="font-size: 18px; margin: 10px 0;">${message}</p>`;
        
        const closeBtn = document.getElementById('modal-close');
        closeBtn.style.display = 'inline-block';
        closeBtn.onclick = () => modal.style.display = 'none'; // Allow user to dismiss and view board
        
        modal.style.display = 'flex';
    } 
    // --- Scenario B: The Game is Ongoing ---
    else {
        statusText = moveColor + ' to move';
        if (window.ChessApp.game.in_check()) statusText += ', ' + moveColor + ' is in check';
    }

    // Configure input boxes based on play mode
    if (window.ChessApp.playMode === 'local') {
        statusDisplay.innerText = "LOCAL PLAY - " + statusText;
        moveInput.disabled = false; submitBtn.disabled = false;
        moveInput.placeholder = moveColor + "'s turn! Type a move...";
        if (!window.ChessApp.game.game_over()) moveInput.focus();
        window.ChessApp.updateCheatSheet();
    } else {
        if (isMyTurn && !window.ChessApp.game.game_over()) {
            statusDisplay.innerText = "YOUR TURN (" + (window.ChessApp.myColor==='w'?'White':'Black') + ") - " + statusText;
            moveInput.disabled = false; submitBtn.disabled = false;
            moveInput.placeholder = "Your turn! Type a move...";
            moveInput.focus();
            window.ChessApp.updateCheatSheet();
        } else {
            statusDisplay.innerText = "OPPONENT's TURN - " + statusText;
            moveInput.disabled = true; submitBtn.disabled = true;
            moveInput.placeholder = "Waiting for opponent..."; 
            cheatSheetDiv.innerHTML = '<p style="color: #7f8c8d; text-align: center;"><em>Moves hidden until your turn...</em></p>';
        }
    }
    
    // Update Data Outputs & Trackers
    pgnDisplay.innerText = window.ChessApp.game.pgn() || "Start Game";
    fenDisplay.innerText = window.ChessApp.game.fen();
    window.ChessApp.updateMaterialTracker();
};

window.ChessApp.updateMaterialTracker = function() {
    // Point values for standard chess pieces
    const ptValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
    // Starting quantity of pieces to calculate what is "missing" (captured)
    const initialCounts = { 'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1 };
    
    let wScore = 0; let bScore = 0;
    let wPieces = { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0 };
    let bPieces = { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0 };

    // 1. Scan the board and tally current pieces & scores
    const board = window.ChessApp.game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.type !== 'k') {
                if (piece.color === 'w') {
                    wScore += ptValues[piece.type];
                    wPieces[piece.type]++;
                } else {
                    bScore += ptValues[piece.type];
                    bPieces[piece.type]++;
                }
            }
        }
    }

    // 2. Generate the visual icons for captured pieces
    const pieceOrder = ['p', 'n', 'b', 'r', 'q'];
    let wHTML = ''; // White's captures (Black pieces missing from board)
    let bHTML = ''; // Black's captures (White pieces missing from board)

    pieceOrder.forEach(type => {
        let bMissing = Math.max(0, initialCounts[type] - bPieces[type]);
        for(let i = 0; i < bMissing; i++) {
            wHTML += `<img src="img/chesspieces/wikipedia/b${type.toUpperCase()}.png" class="captured-piece" alt="Captured Black Piece">`;
        }
        
        let wMissing = Math.max(0, initialCounts[type] - wPieces[type]);
        for(let i = 0; i < wMissing; i++) {
            bHTML += `<img src="img/chesspieces/wikipedia/w${type.toUpperCase()}.png" class="captured-piece" alt="Captured White Piece">`;
        }
    });

    // 3. Append the point difference (e.g., "+3") to whoever is ahead
    const diff = wScore - bScore;
    if (diff > 0) wHTML += `<span class="score-diff">+${diff}</span>`;
    if (diff < 0) bHTML += `<span class="score-diff">+${Math.abs(diff)}</span>`;

    // 4. Inject into the UI (Ensure the player's own perspective is always on bottom)
    const topDiv = document.getElementById('material-top');
    const botDiv = document.getElementById('material-bottom');
    if (!topDiv || !botDiv) return;

    if (window.ChessApp.myColor === 'w') {
        botDiv.innerHTML = wHTML; 
        topDiv.innerHTML = bHTML;
    } else {
        botDiv.innerHTML = bHTML; 
        topDiv.innerHTML = wHTML;
    }
};

window.ChessApp.updateCheatSheet = function() {
    const cheatSheetDiv = document.getElementById('cheat-sheet');
    cheatSheetDiv.innerHTML = ''; 
    if (window.ChessApp.game.game_over()) return;

    const legalMoves = window.ChessApp.game.moves();
    if (legalMoves.length === 0) return;

    // Categorize moves by piece type for cleaner UI
    const categories = { '♙ Pawns': [], '♘ Knights': [], '♗ Bishops': [], '♖ Rooks': [], '♕ Queens': [], '♔ King': [] };

    legalMoves.forEach(move => {
        if (move.startsWith('N')) categories['♘ Knights'].push(move);
        else if (move.startsWith('B')) categories['♗ Bishops'].push(move);
        else if (move.startsWith('R')) categories['♖ Rooks'].push(move);
        else if (move.startsWith('Q')) categories['♕ Queens'].push(move);
        else if (move.startsWith('K') || move.startsWith('O')) categories['♔ King'].push(move); // 'O' catches Castling (O-O)
        else categories['♙ Pawns'].push(move); 
    });

    // Generate clickable spans for each move
    for (const [label, moves] of Object.entries(categories)) {
        if (moves.length === 0) continue; 
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'piece-group';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'piece-label';
        labelSpan.innerText = label;
        groupDiv.appendChild(labelSpan);

        moves.forEach(move => {
            const moveSpan = document.createElement('span');
            moveSpan.className = 'clickable-move';
            moveSpan.innerText = move;
            moveSpan.onclick = () => {
                // If clicked, execute the move and clear the typing input box
                if (window.ChessApp.handleMove(move)) {
                    document.getElementById('moveInput').value = '';
                }
            }; 
            groupDiv.appendChild(moveSpan);
        });
        cheatSheetDiv.appendChild(groupDiv);
    }
};


// ==========================================
// 4. GAME ACTIONS (UNDO & EVAL)
// ==========================================

window.ChessApp.requestUndo = function() {
    // Mode 1: Local Pass & Play (Undo 1 half-move instantly)
    if (window.ChessApp.playMode === 'local') {
        window.ChessApp.game.undo();
        window.ChessApp.board.position(window.ChessApp.game.fen());
        window.ChessApp.updateStatus();
    } 
    // Mode 2: Play vs Computer (Undo 2 half-moves: bot's move, then yours)
    else if (window.ChessApp.playMode === 'computer') {
        if (window.ChessApp.Engine.isThinking) {
            alert("Please wait for the computer to finish thinking before undoing!");
            return;
        }
        window.ChessApp.game.undo(); 
        window.ChessApp.game.undo(); 
        window.ChessApp.board.position(window.ChessApp.game.fen());
        window.ChessApp.updateStatus();
    } 
    // Mode 3: P2P Multiplayer (Ask opponent for permission)
    else if (window.ChessApp.playMode === 'p2p' && window.ChessApp.sendNetworkData) {
        window.ChessApp.sendNetworkData({ type: 'undo_request' });
        
        // Show waiting modal
        const modal = document.getElementById('game-modal');
        document.getElementById('modal-title').innerText = "Undo Requested";
        document.getElementById('modal-body').innerHTML = `<p>Waiting for opponent to accept...</p>`;
        document.getElementById('modal-close').style.display = 'none'; // Prevent closing while waiting
        modal.style.display = 'flex';
    }
};

window.ChessApp.executeP2PUndo = function() {
    window.ChessApp.game.undo(); // Undo last move
    // If it is still not my turn, undo again to give me my turn back
    if (window.ChessApp.game.turn() !== window.ChessApp.myColor) {
        window.ChessApp.game.undo();
    }
    window.ChessApp.board.position(window.ChessApp.game.fen());
    window.ChessApp.updateStatus();
};

window.ChessApp.requestEvalToggle = function() {
    // If it's already on, just turn it off locally
    if (window.ChessApp.evalAllowed) {
        window.ChessApp.evalAllowed = false;
        document.getElementById('eval-bar-container').style.display = 'none';
        document.getElementById('engine-stats-container').style.display = 'none';
        window.ChessApp.board.resize();
        document.getElementById('toggleEvalBtn').innerText = "📊 Request Eval Bar";
        return;
    }

    // Local / Bot mode: Turn it on instantly
    if (window.ChessApp.playMode === 'local' || window.ChessApp.playMode === 'computer') {
        window.ChessApp.executeEvalEnable();
    } 
    // P2P Mode: Ask opponent for permission
    else if (window.ChessApp.playMode === 'p2p' && window.ChessApp.sendNetworkData) {
        window.ChessApp.sendNetworkData({ type: 'eval_request' });
        
        const modal = document.getElementById('game-modal');
        document.getElementById('modal-title').innerText = "Evaluation Bar";
        document.getElementById('modal-body').innerHTML = `<p>Asking opponent to enable the engine evaluation bar...</p>`;
        document.getElementById('modal-close').style.display = 'none';
        modal.style.display = 'flex';
    }
};

window.ChessApp.executeEvalEnable = function() {
    window.ChessApp.evalAllowed = true;
    document.getElementById('toggleEvalBtn').innerText = "📊 Hide Eval Bar";
    
    // Reveal UI elements
    document.getElementById('eval-bar-container').style.display = 'block';
    document.getElementById('engine-stats-container').style.display = 'block';
    window.ChessApp.board.resize(); 

    // Init engine if needed, then request a move
    if (!window.ChessApp.Engine.worker) {
        const enginePath = document.getElementById('engineSelect').value || 'lib/lozza.js';
        window.ChessApp.Engine.init(enginePath);
        setTimeout(() => {
            window.ChessApp.Engine.askForMove();
        }, 200);
    } else {
        window.ChessApp.Engine.askForMove();
    }
};