// --- 1. GAME SETUP ---
var board = null;
var game = new Chess();
var redoStack = [];

// PeerJS Variables
var peer = new Peer(); 
var conn = null;
var myColor = 'w'; // Default to White (Host)

var config = {
    position: 'start',
    draggable: false, // Input Trainer Mode
    pieceTheme: '../../img/chesspieces/wikipedia/{piece}.png'
};
board = Chessboard('myBoard', config);
window.addEventListener('resize', board.resize);

// --- 2. PEERJS LOGIC ---

peer.on('open', function(id) {
    document.getElementById('myId').innerText = id;
});

// Handle Incoming Connection (I am Host)
peer.on('connection', function(c) {
    conn = c;
    myColor = 'w'; // I remain White
    document.getElementById('connStatus').innerText = "Connected! You are WHITE.";
    setupConnectionHandlers();
});

// Connect to Friend (I am Joiner)
document.getElementById('connectBtn').addEventListener('click', function() {
    var destId = document.getElementById('connId').value;
    if(!destId) return alert("Enter an ID first");
    
    conn = peer.connect(destId);
    conn.on('open', function() {
    myColor = 'b'; // I become Black
    document.getElementById('connStatus').innerText = "Connected! You are BLACK.";
    board.orientation('black'); // Flip board for Black player
    setupConnectionHandlers();
    });
});

function setupConnectionHandlers() {
    // Listen for data from opponent
    conn.on('data', function(data) {
    console.log("Received:", data);
    
    if (data.type === 'move') {
        // Opponent moved
        game.move(data.san);
        board.position(game.fen());
        redoStack = []; // Clear redo on new move
        updateStatus();
        speak(data.san);
    } 
    else if (data.type === 'reset') {
        // Opponent reset the game
        resetLocalGame();
        alert("Opponent reset the game.");
    }
    });
}

// --- 3. GAMEPLAY LOGIC ---

function handleMove() {
    const moveText = document.getElementById('moveInput').value.trim();
    if (!moveText) return;

    // RULE: Can I move?
    // 1. If connected, is it my turn?
    if (conn && game.turn() !== myColor) {
    speak("Not your turn");
    flashError("It is " + (game.turn() === 'w' ? "White" : "Black") + "'s turn!");
    return;
    }

    // 2. Attempt Move
    const move = game.move(moveText);

    if (move === null) {
    speak("Invalid move");
    flashError();
    return;
    }

    // 3. Success
    board.position(game.fen());
    redoStack = [];
    updateStatus();
    speak(move.san);
    
    document.getElementById('moveInput').value = '';

    // 4. Send to Peer (if connected)
    if (conn && conn.open) {
    conn.send({ type: 'move', san: move.san });
    }
}

// --- 4. NAVIGATION & UTILS ---

function resetGame() {
    // Reset locally
    resetLocalGame();
    // Notify peer
    if (conn && conn.open) {
    conn.send({ type: 'reset' });
    }
}

function resetLocalGame() {
    game.reset();
    board.start();
    redoStack = [];
    updateStatus();
    document.getElementById('moveInput').value = '';
}

function undoMove() {
    // Disable Undo in multiplayer for simplicity (prevents desync)
    if (conn) return alert("Undo disabled in multiplayer mode.");
    
    const move = game.undo();
    if (move) {
    redoStack.push(move);
    board.position(game.fen());
    updateStatus();
    }
}

function redoMove() {
    if (conn) return alert("Redo disabled in multiplayer mode.");
    
    const move = redoStack.pop();
    if (move) {
    game.move(move);
    board.position(game.fen());
    updateStatus();
    }
}

function updateStatus() {
    let status = '';
    let moveColor = (game.turn() === 'b') ? 'Black' : 'White';

    if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
    } else if (game.in_draw()) {
    status = 'Game over, drawn position';
    } else {
    status = moveColor + ' to move';
    if (game.in_check()) status += ', ' + moveColor + ' is in check';
    }

    document.getElementById('status').innerText = status;
    document.getElementById('pgn-output').innerHTML = game.pgn();
}

function speak(text) {
    if ('speechSynthesis' in window) {
    let ut = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(ut);
    }
}

function flashError(msg) {
    const input = document.getElementById('moveInput');
    input.style.borderColor = "red";
    if(msg) document.getElementById('status').innerText = msg;
    
    setTimeout(() => {
    input.style.borderColor = "#ccc";
    updateStatus();
    }, 1000);
}

// Listeners
document.getElementById('submitBtn').addEventListener('click', handleMove);
document.getElementById('moveInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleMove();
});

document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('prevBtn').addEventListener('click', undoMove);
document.getElementById('nextBtn').addEventListener('click', redoMove);

updateStatus();