
'use strict'

let ships = document.getElementsByClassName('ships');

for (let ship of ships) {
    let newX = 0, newY = 0, startX = 0, startY = 0;
    var rotated = false;
    console.log(ship)

    ship.addEventListener('mousedown', mouseDown);

    function mouseDown(e) {
        startX = e.clientX;
        startY = e.clientY;

        document.addEventListener('mousemove', mouseMove);
        document.addEventListener('mouseup', mouseUp);
        ship.addEventListener('wheel', rotateElem);
    }

    function mouseMove(e) {
        // console.log(ship)
        newX = startX - e.clientX;
        newY = startY - e.clientY;

        startX = e.clientX;
        startY = e.clientY;

        ship.style.top = (ship.offsetTop - newY) + 'px';
        ship.style.left = (ship.offsetLeft - newX) + 'px';
    }

    function mouseUp(e){
        document.removeEventListener('mousemove', mouseMove);
    }

    function rotateElem(e) { 
        var deg = rotated ? 0 : 90;
        console.log(ship);
        ship.style.transform = 'rotate('+ deg + 'deg)';

        rotated = !rotated;
    } 

}

class BattleshipGame {
    constructor() {
        this.boardSize = 10;
        this.ships = [
            { name: "Carrier", size: 5 },
            { name: "Battleship", size: 4 },
            { name: "Cruiser", size: 3},
            { name: "Submarine", size: 3},
            { name: "Destroyer", size: 2 },
            { name: "Patrol Boat", size: 1}
        ];
        this.playerBoards = {
            player1: this.createEmptyBoard(),
            player2: this.createEmptyBoard()
        };
        this.currentTurn = "player1";
        this.isGameOver = false; // track if the game is over
        this.initializeUI();

        this.placeAllShips("player1");
        this.placeAllShips("player2");

        this.renderBoards(); // display ships for testing
        this.updateBoardInteractivity();
    }

    createEmptyBoard() {
        return Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill("~"));
    }

    initializeUI() {
        this.createGrid("player1");
        this.createGrid("player2");

        // Start game button
        document.getElementById("start-game").addEventListener("click", () => {
            document.getElementById("message").innerText = "Game started! Player 1's turn to attack!";
        });
    }

    placeAllShips(player) {
        for (const ship of this.ships) {
            this.placeShip(player, ship);
        }
    }

    // randomly place a ship on the board
    placeShip(player, ship) {
        const board = this.playerBoards[player];
        let placed = false;

        while (!placed) {
            const direction = this.getRandomDirection();
            const startRow = Math.floor(Math.random() * this.boardSize);
            const startCol = Math.floor(Math.random() * this.boardSize);

            let fits = this.checkFit(board, startRow, startCol, ship.size, direction);
            let adjacentClear = this.checkAdjacentCells(board, startRow, startCol, ship.size, direction);

            // if the ship fits and there's no adjacent ship, place it; otherwise, retry
            if (fits && adjacentClear) {
                for (let i = 0; i < ship.size; i++) {
                    const { row, col } = this.getShipPosition(startRow, startCol, direction, i);
                    board[row][col] = "S"; // Mark ship position
                }
                placed = true;
            }
        }
    }

    // get a random direction for the ship (1 - Up, 2 - Right, 3 - Down, 4 - Left)
    getRandomDirection() {
        return Math.floor(Math.random() * 4) + 1;
    }

    checkFit(board, startRow, startCol, size, direction) {
        for (let i = 0; i < size; i++) {
            const { row, col } = this.getShipPosition(startRow, startCol, direction, i);

            // check if the position is within bounds and not already occupied
            if (
                row < 0 || row >= this.boardSize || // out of bounds
                col < 0 || col >= this.boardSize || // out of bounds
                board[row][col] !== "~" // occupied by another ship
            ) {
                return false;
            }
        }
        return true;
    }

    // check if the cells adjacent to the ship are clear of other ships
    checkAdjacentCells(board, startRow, startCol, size, direction) {
        for (let i = 0; i < size; i++) {
            const { row, col } = this.getShipPosition(startRow, startCol, direction, i);

            // check all 8 adjacent cells around the ship
            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    // skip checking the cell itself
                    if (r === row && c === col) continue;

                    // xheck if the adjacent cell is within bounds and contains a ship
                    if (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize) {
                        if (board[r][c] === "S") {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    // get position of the ship segment based on direction and index
    getShipPosition(startRow, startCol, direction, index) {
        switch (direction) {
            case 1: // Up
                return { row: startRow - index, col: startCol };
            case 2: // Right
                return { row: startRow, col: startCol + index };
            case 3: // Down
                return { row: startRow + index, col: startCol };
            case 4: // Left
                return { row: startRow, col: startCol - index };
            default:
                return { row: startRow, col: startCol };
        }
    }

    renderBoards() {
        this.renderGrid("player1");
        this.renderGrid("player2");
    }

    // create grid for each player
    createGrid(player) {
        const gridElement = document.getElementById(`grid-${player}`);
        gridElement.innerHTML = ""; // Clear any existing grid cells
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.row = row;
                cell.dataset.col = col;
                gridElement.appendChild(cell);
            }
        }
    }


}

// Initialize the game
document.addEventListener("DOMContentLoaded", () => {
    const game = new BattleshipGame();
});




