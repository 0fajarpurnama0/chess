// --- 1. SETUP ---
var board = null;
var game = new Chess();

// Configuration: Local images + Responsive + No Dragging
var config = {
    position: 'start',
    draggable: false, // Strictly no dragging!
    pieceTheme: '../img/chesspieces/wikipedia/{piece}.png'
};

// Initialize Board
board = Chessboard('myBoard', config);
window.addEventListener('resize', board.resize); // Responsive fix

// DOM Elements
const moveInput = document.getElementById('moveInput');
const statusDisplay = document.getElementById('status');
const pgnDisplay = document.getElementById('pgn-output');

// --- 2. CORE LOGIC ---

function handleMove() {
    const moveText = moveInput.value.trim();
    if (!moveText) return;

    // Try to make the move in the game logic
    // chess.js requires SAN (Standard Algebraic Notation) by default
    const move = game.move(moveText);

    if (move === null) {
    // INVALID MOVE
    speak("Invalid move");
    // Shake the input box to show error visually (optional CSS trick)
    moveInput.style.borderColor = "red";
    setTimeout(() => moveInput.style.borderColor = "#ccc", 500);
    return;
    }

    // VALID MOVE
    board.position(game.fen()); // Update board
    speak(move.san);            // Voice notation
    updateStatus();             // Update turn info
    
    // Clear input for next turn
    moveInput.value = '';
    moveInput.focus();
}

function updateStatus() {
    let status = '';
    let moveColor = (game.turn() === 'b') ? 'Black' : 'White';

    // Check for Checkmate / Draw
    if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
    speak("Checkmate!");
    } else if (game.in_draw()) {
    status = 'Game over, drawn position';
    speak("Draw!");
    } else {
    status = moveColor + ' to move';
    if (game.in_check()) {
        status += ', ' + moveColor + ' is in check';
        speak("Check!");
    }
    }

    statusDisplay.innerText = status;
    pgnDisplay.innerHTML = game.pgn(); // Show full history
}

function speak(text) {
    if ('speechSynthesis' in window) {
    const ut = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(ut);
    }
}

// --- 3. EVENT LISTENERS ---

// Submit button click
document.getElementById('submitBtn').addEventListener('click', handleMove);

// "Enter" key in input box
moveInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
    handleMove();
    }
});

// Reset Game
document.getElementById('resetBtn').addEventListener('click', () => {
    game.reset();
    board.start();
    moveInput.value = '';
    updateStatus();
    speak("Game reset");
    moveInput.focus();
});

// Initial Status
updateStatus();