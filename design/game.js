'use strict';

class BattleshipGame {
    constructor() {
        this.boardSize = 10;
        this.gridCellSize = 50; // Define grid cell size
        this.playerBoards = {
            player1: this.createEmptyBoard(),
            // player2: this.createEmptyBoard()
        };
        this.currentTurn = "player1";
        this.isGameOver = false; // track if the game is over
        this.initializeUI();

        // this.renderBoards(); // Display ships for testing
        // this.updateBoardInteractivity();
    }

    createEmptyBoard() {
        return Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill("~"));
    }

    initializeUI() {
        this.createGrid("player1");
        // this.createGrid("player2");

        // Start game button
        document.getElementById("start-game").addEventListener("click", () => {
            document.getElementById("message").innerText = "Game started! Player 1's turn to attack!";
        });
    }

    renderBoards() {
        this.renderGrid("player1");
        // this.renderGrid("player2");
    }

    // Create grid for each player
    createGrid(player) {
        const gridElement = document.getElementById(`grid-${player}`);
        gridElement.innerHTML = ""; // Clear any existing grid cells
        gridElement.style.position = "relative"; // Ensure grid is positioned
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.style.width = `${this.gridCellSize}px`;
                cell.style.height = `${this.gridCellSize}px`;
                gridElement.appendChild(cell);
            }
        }
    }
}

let game = new BattleshipGame();

let ships = document.getElementsByClassName('ships');
const gridSize = 50; // Each grid cell size (assume square cells)
const boardElement = document.getElementById("grid-player1");
const boardRect = boardElement.getBoundingClientRect(); // Get board's position and size

function snapToGridWithinBoard(value, boardStart, boardEnd) {
    // Ensure snapping happens within the board boundaries
    if (value < boardStart) return boardStart;
    if (value > boardEnd) return boardEnd;
    return Math.round(value / gridSize) * gridSize;
}

for (let ship of ships) {
    let newX = 0, newY = 0, startX = 0, startY = 0;
    var rotated = false;

    ship.addEventListener('mousedown', mouseDown);

    function mouseDown(e) {
        startX = e.clientX;
        startY = e.clientY;

        document.addEventListener('mousemove', mouseMove);
        document.addEventListener('mouseup', mouseUp);
        ship.addEventListener('wheel', rotateElem, { once: true });
    }

    function mouseMove(e) {
        newX = startX - e.clientX;
        newY = startY - e.clientY;

        startX = e.clientX;
        startY = e.clientY;

        ship.style.top = (ship.offsetTop - newY) + 'px';
        ship.style.left = (ship.offsetLeft - newX) + 'px';
    }

    function mouseUp(e) {
        document.removeEventListener('mousemove', mouseMove);

        // Calculate new position and snap to grid within board
        let shipTop = ship.offsetTop - boardRect.top;
        let shipLeft = ship.offsetLeft - boardRect.left;

        let snappedTop = snapToGridWithinBoard(shipTop, 0, gridSize * (game.boardSize - 1));
        let snappedLeft = snapToGridWithinBoard(shipLeft, 0, gridSize * (game.boardSize - 1));

        // Update ship position if within board, else reset position
        if (snappedTop >= 0 && snappedTop < gridSize * game.boardSize &&
            snappedLeft >= 0 && snappedLeft < gridSize * game.boardSize) {
            ship.style.top = `${snappedTop + boardRect.top}px`;
            ship.style.left = `${snappedLeft + boardRect.left}px`;

            // Get board coordinates (row, col)
            let row = snappedTop / gridSize;
            let col = snappedLeft / gridSize;

            console.log(`Ship placed at row: ${row}, col: ${col}`);
        } else {
            console.log('Ship placed outside of board');
        }

        document.removeEventListener('mouseup', mouseUp);
    }

    function rotateElem(e) {
        let deg = rotated ? 0 : 90;
        ship.style.transform = `rotate(${deg}deg)`;
        rotated = !rotated;
    }
}
