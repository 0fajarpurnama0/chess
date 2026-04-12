// js/network.js

// ==========================================
// 1. DOM ELEMENTS & GLOBAL STATE
// ==========================================
const myIdDisplay = document.getElementById('my-id');
const opponentIdInput = document.getElementById('opponent-id-input');
const connectBtn = document.getElementById('connectBtn');
const connectionStatus = document.getElementById('connection-status');
const createLinkBtn = document.getElementById('createLinkBtn'); 
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

let peer = new Peer(); 
let conn;
let pendingFen = ''; 


// ==========================================
// 2. PEER SETUP & INVITE LINKS
// ==========================================
peer.on('open', (id) => {
    myIdDisplay.innerText = id;
    
    // Generate an easy-join URL based on the current domain
    const inviteUrl = window.location.origin + window.location.pathname + '?join=' + id;
    createLinkBtn.setAttribute('data-link', inviteUrl);

    // Auto-connect if the player arrived via an invite link
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get('join');
    if (joinId) {
        opponentIdInput.value = joinId;
        connectBtn.click(); 
    }
});

// UX: Click to copy invite link
createLinkBtn.addEventListener('click', () => {
    const link = createLinkBtn.getAttribute('data-link');
    if (link) {
        navigator.clipboard.writeText(link);
        const originalText = createLinkBtn.innerText;
        createLinkBtn.innerText = "Copied!";
        setTimeout(() => createLinkBtn.innerText = originalText, 2000);
    }
});

// UX: Click ID to copy
myIdDisplay.addEventListener('click', () => {
    navigator.clipboard.writeText(myIdDisplay.innerText);
    myIdDisplay.style.color = "#2ecc71";
    setTimeout(() => myIdDisplay.style.color = "", 1000);
});
myIdDisplay.style.cursor = "pointer";


// ==========================================
// 3. CONNECTION INITIATION (HOST VS GUEST)
// ==========================================

// --- A. We are the HOST (Receiving a connection) ---
peer.on('connection', (connection) => {
    conn = connection;
    
    // Host dictates the game parameters (Color & Time)
    let chosen = document.getElementById('colorSelect').value;
    if (chosen === 'random') chosen = Math.random() < 0.5 ? 'w' : 'b';
    window.ChessApp.myColor = chosen;
    
    if (window.ChessApp.Timer) {
        window.ChessApp.Timer.init(window.ChessApp.getTimeSetting());
    }

    setupConnection(true); 
});

// --- B. We are the GUEST (Initiating a connection) ---
connectBtn.addEventListener('click', () => {
    let oppId = opponentIdInput.value.trim();
    if (!oppId) return;
    
    // Sanitize input just in case they pasted the whole URL instead of the ID
    if (oppId.includes('?join=')) oppId = oppId.split('?join=')[1];

    connectionStatus.innerText = "Connecting...";
    conn = peer.connect(oppId);
    
    window.ChessApp.myColor = null; // Wait for Host to assign color
    setupConnection(false); 
});


// ==========================================
// 4. NETWORK DATA ROUTER (THE BRAIN)
// ==========================================

function setupConnection(isHost) {
    // Expose a global method so core.js can send data out
    window.ChessApp.sendNetworkData = (data) => { if (conn) conn.send(data); };

    conn.on('open', () => {
        // Handshake: Host sends the game settings to the Guest
        if (isHost) {
            const guestColor = (window.ChessApp.myColor === 'w') ? 'b' : 'w';
            const selectedTime = window.ChessApp.getTimeSetting();
            conn.send({ type: 'assignColor', color: guestColor, time: selectedTime });
            
            finalizeConnectionUI(); 
        }
    });

    // Handle incoming data packets
    conn.on('data', (data) => {
        const modal = document.getElementById('game-modal'); // Cache modal reference for use in switch cases

        switch (data.type) {
            // --- A. Setup & Gameplay ---
            case 'assignColor':
                window.ChessApp.myColor = data.color;
                if (window.ChessApp.Timer) window.ChessApp.Timer.init(data.time);
                finalizeConnectionUI();
                break;

            case 'move':
                if (data.timeW !== undefined && window.ChessApp.Timer) {
                    window.ChessApp.Timer.sync(data.timeW, data.timeB);
                }
                window.ChessApp.handleMove(data.san, true); 
                break;

            case 'chat':
                appendChatMessage(data.text, 'opponent');
                break;

            // --- B. Reset Requests ---
            case 'requestReset':
                if (confirm("Your opponent requested to reset the game. Do you accept?")) {
                    window.ChessApp.game.reset(); 
                    window.ChessApp.board.start(); 
                    window.ChessApp.updateStatus();
                    conn.send({ type: 'acceptReset' });
                    appendChatMessage("Game reset by mutual agreement.", "system");
                } else {
                    conn.send({ type: 'rejectReset' });
                }
                break;

            case 'acceptReset':
                window.ChessApp.game.reset(); 
                window.ChessApp.board.start(); 
                window.ChessApp.updateStatus();
                alert("Opponent accepted! Board reset.");
                appendChatMessage("Game reset by mutual agreement.", "system");
                break;

            case 'rejectReset':
                alert("Opponent declined the game reset.");
                break;

            // --- C. Custom FEN (Position) Requests ---
            case 'requestFen':
                if (confirm("Your opponent requested to load a new position. Accept?")) {
                    window.ChessApp.game.load(data.fen); 
                    window.ChessApp.board.position(window.ChessApp.game.fen()); 
                    window.ChessApp.updateStatus();
                    conn.send({ type: 'acceptFen' });
                    appendChatMessage("New board position loaded.", "system");
                } else {
                    conn.send({ type: 'rejectFen' });
                }
                break;

            case 'acceptFen':
                window.ChessApp.game.load(pendingFen); 
                window.ChessApp.board.position(window.ChessApp.game.fen()); 
                window.ChessApp.updateStatus();
                alert("Opponent accepted! Position loaded.");
                appendChatMessage("New board position loaded.", "system");
                break;

            case 'rejectFen':
                alert("Opponent declined the position load.");
                break;

            // --- D. Takeback (Undo) Requests ---
            case 'undo_request':
                document.getElementById('modal-title').innerText = "Takeback Request";
                document.getElementById('modal-body').innerHTML = `
                    <p>Your opponent wants to undo their last move. Do you accept?</p>
                    <div style="margin-top: 15px; display: flex; justify-content: space-around;">
                        <button id="acceptUndoBtn" class="action-button" style="background-color: #2ecc71;">Yes</button>
                        <button id="declineUndoBtn" class="action-button" style="background-color: #e74c3c;">No</button>
                    </div>
                `;
                document.getElementById('modal-close').style.display = 'none';
                modal.style.display = 'flex';

                document.getElementById('acceptUndoBtn').onclick = () => {
                    modal.style.display = 'none';
                    window.ChessApp.sendNetworkData({ type: 'undo_accept' });
                    window.ChessApp.executeP2PUndo();
                };
                document.getElementById('declineUndoBtn').onclick = () => {
                    modal.style.display = 'none';
                    window.ChessApp.sendNetworkData({ type: 'undo_decline' });
                };
                break;

            case 'undo_accept':
                modal.style.display = 'none';
                window.ChessApp.executeP2PUndo();
                alert("Opponent accepted your undo request.");
                break;

            case 'undo_decline':
                modal.style.display = 'none';
                alert("Opponent declined your undo request.");
                break;

            // --- E. Evaluation Bar Requests ---
            case 'eval_request':
                document.getElementById('modal-title').innerText = "Enable Engine Assistance?";
                document.getElementById('modal-body').innerHTML = `
                    <p>Your opponent wants to turn on the Evaluation Bar. Do you accept?</p>
                    <div style="margin-top: 15px; display: flex; justify-content: space-around;">
                        <button id="acceptEvalBtn" class="action-button" style="background-color: #2ecc71;">Yes</button>
                        <button id="declineEvalBtn" class="action-button" style="background-color: #e74c3c;">No</button>
                    </div>
                `;
                document.getElementById('modal-close').style.display = 'none';
                modal.style.display = 'flex';

                document.getElementById('acceptEvalBtn').onclick = () => {
                    modal.style.display = 'none';
                    window.ChessApp.sendNetworkData({ type: 'eval_accept' });
                    window.ChessApp.executeEvalEnable();
                };
                document.getElementById('declineEvalBtn').onclick = () => {
                    modal.style.display = 'none';
                    window.ChessApp.sendNetworkData({ type: 'eval_decline' });
                };
                break;

            case 'eval_accept':
                modal.style.display = 'none';
                window.ChessApp.executeEvalEnable();
                break;

            case 'eval_decline':
                modal.style.display = 'none';
                alert("Opponent declined the Evaluation Bar request.");
                break;

            default:
                console.warn("Unknown network packet received:", data);
        }
    });

    conn.on('close', () => { 
        alert("Opponent disconnected!"); 
        location.reload(); 
    });
}


// ==========================================
// 5. UI TRANSITIONS & CHAT LOGIC
// ==========================================

function finalizeConnectionUI() {
    document.getElementById('connection-panel').style.display = 'none';
    document.getElementById('game-wrapper').style.display = 'block';
    
    // Hide bot controls during P2P
    document.getElementById('practice-controls').style.display = 'block';
    document.getElementById('bot-selection-container').style.display = 'none';
    document.getElementById('simple-bot-container').style.display = 'none';
    document.getElementById('lozza-strength-container').style.display = 'none';
    
    // Delay slightly to ensure CSS transitions finish before calculating board size
    setTimeout(() => {
        window.ChessApp.board.orientation(window.ChessApp.myColor === 'b' ? 'black' : 'white');
        window.ChessApp.board.resize();
        window.ChessApp.updateStatus();
        
        appendChatMessage("Connected to game. " + (window.ChessApp.myColor === 'w' ? "You are White. Your move." : "You are Black. White's move."), "system");

        if (window.ChessApp.Timer) window.ChessApp.Timer.start();
    }, 10);
}

function appendChatMessage(message, sender) {
    const msgDiv = document.createElement('div');
    
    // Utilize the CSS classes defined in styles.css for consistent UI
    msgDiv.classList.add('chat-message', sender);
    msgDiv.innerText = message; 

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
}

// Chat Input Event Listeners
sendChatBtn.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (text && conn) {
        conn.send({ type: 'chat', text: text });
        appendChatMessage(text, 'self'); // Match the CSS class 'self'
        chatInput.value = '';
    }
});

chatInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendChatBtn.click();
});


// ==========================================
// 6. OUTGOING P2P REQUESTS
// ==========================================

window.ChessApp.requestNetworkReset = function() {
    if (confirm("Ask your opponent to reset the board?")) {
        conn.send({ type: 'requestReset' });
        appendChatMessage("Requested board reset...", "system");
    }
};

window.ChessApp.requestNetworkFen = function(fenStr) {
    pendingFen = fenStr;
    conn.send({ type: 'requestFen', fen: fenStr });
    alert("Request sent to opponent.");
    document.getElementById('fenInput').value = '';
};