// --- 1. SETUP & VARIABLES ---
let board = null;
let game = new Chess();
let peer = null;
let conn = null;
let myColor = 'w'; 
let pendingFen = ''; // Used to store the FEN the host wants to load until guest approves
// Check if URL has ?join=ID
const autoJoinId = new URLSearchParams(window.location.search).get('join');

// DOM Elements
const connectionPanel = document.getElementById('connection-panel');
const gameWrapper = document.getElementById('game-wrapper');
const myIdDisplay = document.getElementById('my-id');
const opponentIdInput = document.getElementById('opponent-id-input');
const connectBtn = document.getElementById('connectBtn');
const connectionStatus = document.getElementById('connection-status');
const hostControls = document.getElementById('host-controls');

const moveInput = document.getElementById('moveInput');
const submitBtn = document.getElementById('submitBtn');
const statusDisplay = document.getElementById('status');
const pgnDisplay = document.getElementById('pgn-output');
const fenDisplay = document.getElementById('fen-output');
const cheatSheetDiv = document.getElementById('cheat-sheet');
const fenInput = document.getElementById('fenInput');

const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatBox = document.getElementById('chat-box');

// Initialize Board
const config = {
    position: 'start',
    draggable: false, 
    pieceTheme: '../../img/chesspieces/wikipedia/{piece}.png'
};
board = Chessboard('myBoard', config);
window.addEventListener('resize', board.resize); 

// --- 2. PEERJS NETWORK LOGIC ---

function initializePeer() {
    peer = new Peer(); 
    
    peer.on('open', (id) => { 
        // 1. Display the Raw ID
        myIdDisplay.innerText = id;

        // 2. Generate and display the shareable link
        const currentUrl = window.location.origin + window.location.pathname;
        const inviteLink = `${currentUrl}?join=${id}`;
        inviteLinkInput.value = inviteLink;

        // 3. Auto-connect if they arrived via link
        if (autoJoinId) {
            document.getElementById('opponent-id-input').value = autoJoinId;
            document.getElementById('connectBtn').click(); 
        }
    });

    peer.on('connection', (connection) => {
        conn = connection;
        myColor = 'w'; 
        setupConnection();
    });
}

connectBtn.addEventListener('click', () => {
    let oppId = opponentIdInput.value.trim();
    if (!oppId) return;

    // SAFEGUARD: If they pasted the full link instead of the ID, extract just the ID
    if (oppId.includes('?join=')) {
        oppId = oppId.split('?join=')[1];
    }

    connectionStatus.innerText = "Connecting...";
    conn = peer.connect(oppId);
    myColor = 'b';
    setupConnection();
});

function setupConnection() {
    conn.on('open', () => {
        connectionPanel.style.display = 'none';
        gameWrapper.style.display = 'block';
        board.resize();
        
        if (myColor === 'b') {
            board.orientation('black');
            hostControls.style.display = 'none'; 
            appendChatMessage("Connected to game. White's move.", "system");
        } else {
            appendChatMessage("Guest joined the game. Your move.", "system");
        }
        updateStatus();
    });

    conn.on('data', (data) => {
        // Handle Game Moves
        if (data.type === 'move') {
            game.move(data.san);
            board.position(game.fen());
            updateStatus();
        } 
        
        // Handle Chat
        else if (data.type === 'chat') {
            appendChatMessage(data.text, 'opponent');
        } 

        // GUEST RECEIVES REQUESTS
        else if (data.type === 'requestReset') {
            if (confirm("The Host has requested to reset the game to the starting position. Do you accept?")) {
                game.reset(); board.start(); updateStatus();
                conn.send({ type: 'acceptReset' });
                appendChatMessage("Game reset by mutual agreement.", "system");
            } else {
                conn.send({ type: 'rejectReset' });
            }
        } 
        else if (data.type === 'requestFen') {
            if (confirm("The Host has requested to load a new board position. Do you accept?")) {
                game.load(data.fen); board.position(game.fen()); updateStatus();
                conn.send({ type: 'acceptFen' });
                appendChatMessage("New board position loaded.", "system");
            } else {
                conn.send({ type: 'rejectFen' });
            }
        }

        // HOST RECEIVES GUEST ANSWERS
        else if (data.type === 'acceptReset') {
            game.reset(); board.start(); updateStatus();
            alert("Guest accepted! Board reset.");
            appendChatMessage("Game reset by mutual agreement.", "system");
        } 
        else if (data.type === 'rejectReset') {
            alert("Guest declined your request to reset the game.");
        } 
        else if (data.type === 'acceptFen') {
            game.load(pendingFen); board.position(game.fen()); updateStatus();
            alert("Guest accepted! New position loaded.");
            appendChatMessage("New board position loaded.", "system");
        } 
        else if (data.type === 'rejectFen') {
            alert("Guest declined your request to load a new position.");
        }
    });

    conn.on('close', () => {
        alert("Opponent disconnected!");
        location.reload(); 
    });
}

// --- 3. CHESS LOGIC ---
// ... (Note: handleMove, updateStatus, updateCheatSheet remain identical to before)
function handleMove(moveText) {
    if (game.turn() !== myColor) return; 
    const textToPlay = moveText || moveInput.value.trim();
    if (!textToPlay) return;

    const move = game.move(textToPlay);
    if (move === null) {
        moveInput.style.borderColor = "red";
        setTimeout(() => moveInput.style.borderColor = "#ccc", 500);
        return;
    }

    board.position(game.fen()); 
    updateStatus();             
    moveInput.value = '';
    
    conn.send({ type: 'move', san: move.san });
}

function updateStatus() {
    let statusText = '';
    let moveColor = (game.turn() === 'b') ? 'Black' : 'White';
    let isMyTurn = (game.turn() === myColor);

    if (game.in_checkmate()) statusText = 'Game over, ' + moveColor + ' is in checkmate.';
    else if (game.in_draw()) statusText = 'Game over, drawn position';
    else {
        statusText = moveColor + ' to move';
        if (game.in_check()) statusText += ', ' + moveColor + ' is in check';
    }

    if (isMyTurn && !game.game_over()) {
        statusDisplay.innerText = "YOUR TURN (" + (myColor==='w'?'White':'Black') + ") - " + statusText;
        moveInput.disabled = false; submitBtn.disabled = false;
        moveInput.placeholder = "Your turn! Type a move...";
        moveInput.focus();
    } else {
        statusDisplay.innerText = "OPPONENT's TURN - " + statusText;
        moveInput.disabled = true; submitBtn.disabled = true;
        moveInput.placeholder = "Waiting for opponent..."; moveInput.value = ''; 
    }

    pgnDisplay.innerText = game.pgn() || "Start Game";
    fenDisplay.innerText = game.fen();
    
    if (isMyTurn) updateCheatSheet();
    else cheatSheetDiv.innerHTML = '<p style="color: #7f8c8d; text-align: center;"><em>Moves hidden until your turn...</em></p>';
}

function updateCheatSheet() {
    cheatSheetDiv.innerHTML = ''; 
    if (game.game_over()) return;

    const legalMoves = game.moves();
    if (legalMoves.length === 0) return;

    const categories = { '♙ Pawns': [], '♘ Knights': [], '♗ Bishops': [], '♖ Rooks': [], '♕ Queens': [], '♔ King': [] };

    legalMoves.forEach(move => {
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
            moveSpan.onclick = () => handleMove(move); 
            groupDiv.appendChild(moveSpan);
        });
        cheatSheetDiv.appendChild(groupDiv);
    }
}

// --- 4. CHAT LOGIC ---

function appendChatMessage(text, senderClass) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${senderClass}`;
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
}

function sendChat() {
    const text = chatInput.value.trim();
    if (!text || !conn) return;
    
    appendChatMessage(text, 'self');
    conn.send({ type: 'chat', text: text });
    chatInput.value = '';
}

sendChatBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
});

// --- 5. EVENT LISTENERS & HOST CONTROLS ---

submitBtn.addEventListener('click', () => handleMove());
moveInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleMove(); });

// Updated: Host controls now ask for permission!
document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to ask the guest to reset the board?")) {
        conn.send({ type: 'requestReset' });
        appendChatMessage("Requested board reset...", "system");
    }
});

document.getElementById('loadBtn').addEventListener('click', () => {
    pendingFen = fenInput.value.trim();
    if (!pendingFen) { alert("Please paste a FEN string first."); return; }

    // Use a temporary game instance to validate the FEN without ruining the live board
    const tempGame = new Chess();
    if (tempGame.load(pendingFen)) {
        conn.send({ type: 'requestFen', fen: pendingFen });
        alert("Request sent to guest for approval.");
        fenInput.value = '';
    } else {
        alert("Invalid FEN string.");
    }
});

// Clipboard
copyIdBtn = document.getElementById('copyIdBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const inviteLinkInput = document.getElementById('invite-link-input');
const copyPgnBtn = document.getElementById('copyPgnBtn');
const copyFenBtn = document.getElementById('copyFenBtn');
const flipBtn = document.getElementById('flipBtn');

function copyToClipboard(text, buttonElement) {
    if (!text || text === "Start Game") return;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = buttonElement.innerText;
        buttonElement.innerText = "Copied!";
        buttonElement.classList.add("success");
        setTimeout(() => {
            buttonElement.innerText = originalText;
            buttonElement.classList.remove("success");
        }, 2000);
    });
}

copyIdBtn.addEventListener('click', () => copyToClipboard(myIdDisplay.innerText, copyIdBtn));
copyLinkBtn.addEventListener('click', () => {
    copyToClipboard(inviteLinkInput.value, copyLinkBtn);
});
copyPgnBtn.addEventListener('click', () => copyToClipboard(game.pgn(), copyPgnBtn));
copyFenBtn.addEventListener('click', () => copyToClipboard(game.fen(), copyFenBtn));
flipBtn.addEventListener('click', () => board.flip());

initializePeer();