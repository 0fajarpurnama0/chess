// --- 1. SETUP ---
var board = null;
var game = new Chess();

// Configuration
var config = {
    position: 'start',
    draggable: false, 
    pieceTheme: '../../img/chesspieces/wikipedia/{piece}.png'
};

board = Chessboard('myBoard', config);
window.addEventListener('resize', board.resize); 

// DOM Elements
const moveInput = document.getElementById('moveInput');
const fenInput = document.getElementById('fenInput');
const statusDisplay = document.getElementById('status');
const pgnDisplay = document.getElementById('pgn-output');
const fenDisplay = document.getElementById('fen-output');
const cheatSheetDiv = document.getElementById('cheat-sheet');

// --- 2. CORE LOGIC ---

function handleMove(moveText) {
    // If moveText isn't passed directly, grab it from the input
    const textToPlay = moveText || moveInput.value.trim();
    if (!textToPlay) return;

    const move = game.move(textToPlay);

    if (move === null) {
        // INVALID MOVE
        speak("Invalid move");
        moveInput.style.borderColor = "red";
        setTimeout(() => moveInput.style.borderColor = "#ccc", 500);
        return;
    }

    // VALID MOVE
    board.position(game.fen()); 
    speak(move.san);            
    updateStatus();             
    
    moveInput.value = '';
    moveInput.focus();
}

function updateStatus() {
    let statusText = '';
    let moveColor = (game.turn() === 'b') ? 'Black' : 'White';

    if (game.in_checkmate()) {
        statusText = 'Game over, ' + moveColor + ' is in checkmate.';
        speak("Checkmate!");
    } else if (game.in_draw()) {
        statusText = 'Game over, drawn position';
        speak("Draw!");
    } else {
        statusText = moveColor + ' to move';
        if (game.in_check()) {
            statusText += ', ' + moveColor + ' is in check';
            speak("Check!");
        }
    }

    statusDisplay.innerText = statusText;
    pgnDisplay.innerHTML = game.pgn() || "Start Game";
    fenDisplay.innerText = game.fen();
    
    // Update the list of legal moves available to click/type
    updateCheatSheet();
}

function updateCheatSheet() {
    cheatSheetDiv.innerHTML = ''; 

    // Stop updating if the game is over
    if (game.game_over()) return;

    const legalMoves = game.moves();
    if (legalMoves.length === 0) return;

    const categories = {
        '♙ Pawns': [],
        '♘ Knights': [],
        '♗ Bishops': [],
        '♖ Rooks': [],
        '♕ Queens': [],
        '♔ King': []
    };

    legalMoves.forEach(move => {
        // Sort by algebraic notation
        if (move.startsWith('N')) categories['♘ Knights'].push(move);
        else if (move.startsWith('B')) categories['♗ Bishops'].push(move);
        else if (move.startsWith('R')) categories['♖ Rooks'].push(move);
        else if (move.startsWith('Q')) categories['♕ Queens'].push(move);
        else if (move.startsWith('K') || move.startsWith('O')) categories['♔ King'].push(move); 
        else categories['♙ Pawns'].push(move); 
    });

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
            
            // Execute move on click
            moveSpan.onclick = () => {
                handleMove(move); 
            };
            
            groupDiv.appendChild(moveSpan);
        });

        cheatSheetDiv.appendChild(groupDiv);
    }
}

function speak(text) {
    if ('speechSynthesis' in window) {
        const ut = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(ut);
    }
}

// --- 3. EVENT LISTENERS ---

document.getElementById('submitBtn').addEventListener('click', () => handleMove());

moveInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleMove();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    game.reset();
    board.start();
    moveInput.value = '';
    updateStatus();
    speak("Game reset");
    moveInput.focus();
});

// Initialize the game state on load
updateStatus();

// --- 4. FEN ---
document.getElementById('loadBtn').addEventListener('click', () => {
    const fenString = fenInput.value.trim();
    
    if (!fenString) {
        alert("Please paste a FEN string first.");
        return;
    }

    // game.load() returns true if the FEN is valid, and false if it is invalid
    const isValidFen = game.load(fenString); 
    
    if (isValidFen) {
        // 1. Tell the visual board to match
        board.position(game.fen()); 
        
        // 2. Update the UI
        updateStatus(); 
        
        // 3. Clear the input and notify the user
        fenInput.value = '';
        alert("Game loaded!");
    } else {
        // Handle the silent failure
        alert("Invalid FEN string. Please check the formatting.");
        fenInput.style.borderColor = "red";
        setTimeout(() => fenInput.style.borderColor = "#ccc", 1000);
    }
});

// --- 5. CLIPBOARD & UTILITY FUNCTIONS ---

const copyPgnBtn = document.getElementById('copyPgnBtn');
const copyFenBtn = document.getElementById('copyFenBtn');
const flipBtn = document.getElementById('flipBtn');

// Helper function to copy text and show visual feedback
function copyToClipboard(text, buttonElement) {
    if (!text || text === "Start Game") {
        alert("Nothing to copy yet!");
        return;
    }

    // Modern clipboard API
    navigator.clipboard.writeText(text).then(() => {
        const originalText = buttonElement.innerText;
        buttonElement.innerText = "Copied!";
        buttonElement.classList.add("success");
        
        // Revert back after 2 seconds
        setTimeout(() => {
            buttonElement.innerText = originalText;
            buttonElement.classList.remove("success");
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert("Clipboard copy failed. Your browser might block this feature.");
    });
}

// Copy Event Listeners
copyPgnBtn.addEventListener('click', () => {
    copyToClipboard(game.pgn(), copyPgnBtn);
});

copyFenBtn.addEventListener('click', () => {
    copyToClipboard(game.fen(), copyFenBtn);
});

// Flip Board Event Listener
flipBtn.addEventListener('click', () => {
    board.flip(); // chessboard.js built-in flip function
});