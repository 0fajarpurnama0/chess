// --- 1. STATE & FALLBACK DATA ---
var board = null;
var game = new Chess();
var currentOpeningMoves = [];
var currentMoveIndex = -1;
let openings = {}; // This will hold the JSON data or the fallback data

// --- 2. INITIALIZATION ---
var config = {
    position: 'start',
    draggable: false, 
    pieceTheme: '../../img/chesspieces/wikipedia/{piece}.png' 
}
board = Chessboard('myBoard', config);

// UI Elements
const selector = document.getElementById('openingSelector');
const pgnOutput = document.getElementById('pgn-output');
const customContainer = document.getElementById('customInputContainer');
const pgnInput = document.getElementById('pgnInput');

// Load Data (with Fallback Logic)
// Global lookup object
let flatOpenings = {}; 

async function initBoard() {
    let rawData = null;
    let dataLoaded = false;
    
    try {
        const response = await fetch('https://0fajarpurnama0.github.io/assets/json/chessopenings-simple.json');
        if (response.ok) {
            rawData = await response.json();
            dataLoaded = true;
        }
    } catch (error) {
        console.warn("Using local fallback data.");
        rawData = local_openings; // This now refers to your new 3-level object
        dataLoaded = true;
    }

    if (dataLoaded) {
        // Reset Dropdown
        selector.innerHTML = '<option value="" disabled selected>Select an Opening</option><option value="custom">-- Custom PGN --</option>';
        
        // Reset Lookup Map
        flatOpenings = {};

        // --- LOOP LEVEL 1: Major / Minor / Irregular ---
        for (const topCategory in rawData) {
            const subCategories = rawData[topCategory];

            // --- LOOP LEVEL 2: King's Pawn / English / etc. ---
            for (const groupName in subCategories) {
                
                // Create <optgroup>
                const group = document.createElement('optgroup');
                // Combine names to show full hierarchy, e.g., "Major Openings - King's Pawn"
                group.label = `${topCategory} - ${groupName}`;

                const specificOpenings = subCategories[groupName];

                // --- LOOP LEVEL 3: The actual openings ---
                for (const openingName in specificOpenings) {
                    
                    const option = document.createElement('option');
                    option.value = openingName; // Unique ID
                    option.innerText = openingName; // Display Text
                    group.appendChild(option);

                    // Flatten the move data into our lookup object
                    flatOpenings[openingName] = specificOpenings[openingName];
                }

                // Add the populated group to the selector
                selector.appendChild(group);
            }
        }
    }
    
    attachEventListeners();
    updateBoardAndNotation();
}

// --- 3. HELPER: PARSE PGN ---
function loadMovesFromPGN(pgnText) {
    // Use Chess.js to parse the PGN automatically
    const tempGame = new Chess();
    const valid = tempGame.load_pgn(pgnText);
    
    if (!valid) {
        // Fallback: Manually try to parse standard moves
        tempGame.reset();
        const moves = pgnText.replace(/[\d]+\./g, '').split(/\s+/);
        for(let move of moves) {
            if(move.trim()) tempGame.move(move);
        }
    }

    // Extract the clean list of moves from the temp game history
    return tempGame.history(); 
}

// --- 4. CORE FUNCTIONS ---
function updateBoardAndNotation() {
    board.position(game.fen());
    
    // Render PGN with highlight
    const history = game.history({ verbose: true });
    let pgnString = '';
    for (let i = 0; i < history.length; i++) {
        if (i % 2 === 0) pgnString += (i / 2 + 1) + '. ';
        const moveClass = (i === currentMoveIndex) ? ' class="highlight"' : '';
        pgnString += `<span${moveClass}>${history[i].san}</span> `;
    }
    pgnOutput.innerHTML = pgnString.trim() || "Start Position";
}

function speakNotation(move) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(move);
        utterance.rate = 1.0; 
        window.speechSynthesis.speak(utterance);
    }
}

// --- 5. EVENT HANDLERS ---
function attachEventListeners() {
    // Dropdown Change
    selector.addEventListener('change', () => {
        const val = selector.value;
        
        if (val === "custom") {
            customContainer.style.display = "block";
        } else {
            customContainer.style.display = "none";
            
            // USE THE LOOKUP MAP (flatOpenings)
            const movesStr = flatOpenings[val]; 
            
            if (movesStr) {
                currentOpeningMoves = loadMovesFromPGN(movesStr);
                game.reset();
                currentMoveIndex = -1;
                updateBoardAndNotation();
            }
        }
    });

    // "Load Moves" Button
    document.getElementById('loadCustomBtn').addEventListener('click', () => {
        const text = pgnInput.value;
        if(!text.trim()) { alert("Please enter some moves first."); return; }
        const parsedMoves = loadMovesFromPGN(text);
        currentOpeningMoves = parsedMoves;
        game.reset();
        currentMoveIndex = -1;
        updateBoardAndNotation();
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentMoveIndex < currentOpeningMoves.length - 1) {
            currentMoveIndex++;
            game.move(currentOpeningMoves[currentMoveIndex]);
            speakNotation(currentOpeningMoves[currentMoveIndex]);
            updateBoardAndNotation();
        }
    });

    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentMoveIndex >= 0) {
            game.undo();
            currentMoveIndex--;
            updateBoardAndNotation();
        }
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        game.reset();
        currentMoveIndex = -1;
        updateBoardAndNotation();
    });

    window.addEventListener('resize', board.resize);
}

initBoard();