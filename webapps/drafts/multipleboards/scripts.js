function initializeEducationalBoards() {
    const boardElements = document.querySelectorAll('.edu-board');

    boardElements.forEach((boardDiv) => {
        const boardId = boardDiv.id;
        const pgnString = boardDiv.getAttribute('data-pgn');
        
        // Grab the custom FEN, or default to 'start' if it's missing
        const startFen = boardDiv.getAttribute('data-start-fen') || 'start';
        
        const lessonBlock = boardDiv.closest('.lesson-block');
        const prevBtn = lessonBlock.querySelector('.prev-btn');
        const nextBtn = lessonBlock.querySelector('.next-btn');
        const resetBtn = lessonBlock.querySelector('.reset-btn');

        const game = new Chess();
        let moves = [];
        let currentMoveIndex = -1;

        // 1. Load PGN to extract the clean move history
        if (pgnString) {
            let loadedSuccessfully = false;

            if (startFen !== 'start') {
                // FIX: Added \n\n before the pgnString. PGN requires a blank line here!
                const pgnWithHeaders = `[SetUp "1"]\n[FEN "${startFen}"]\n\n${pgnString}`;
                loadedSuccessfully = game.load_pgn(pgnWithHeaders);
            } else {
                loadedSuccessfully = game.load_pgn(pgnString);
            }

            if (!loadedSuccessfully) {
                console.error(`Error loading moves for ${boardId}. Check if the FEN and PGN moves are legal!`);
            }
            
            moves = game.history(); 
        }

        // 2. Reset the internal game state to the starting position
        if (startFen !== 'start') {
            game.load(startFen); // Load custom FEN
        } else {
            game.reset();        // Standard reset
        }

        // 3. Initialize the visual chessboard
        const config = {
            position: startFen, // Initialize visual board with custom FEN or 'start'
            pieceTheme: '../../img/chesspieces/wikipedia/{piece}.png',
            draggable: false
        };
        const board = Chessboard(boardId, config);

        // 4. Attach Event Listeners to the buttons
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentMoveIndex < moves.length - 1) {
                    currentMoveIndex++;
                    game.move(moves[currentMoveIndex]);
                    board.position(game.fen());
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentMoveIndex >= 0) {
                    game.undo();
                    currentMoveIndex--;
                    board.position(game.fen()); // Update visual board to match game state
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (startFen !== 'start') {
                    game.load(startFen);
                } else {
                    game.reset();
                }
                currentMoveIndex = -1;
                board.position(game.fen());
            });
        }
    });
}

document.addEventListener("DOMContentLoaded", initializeEducationalBoards);