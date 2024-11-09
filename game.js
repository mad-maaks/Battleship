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

    renderGrid(player) {
        const board = this.playerBoards[player];
        const gridElement = document.getElementById(`grid-${player}`);
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = gridElement.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                if (board[row][col] === "S") {
                    cell.classList.add("ship");
                } else if (board[row][col] === "X") {
                    cell.classList.add("hit");
                } else if (board[row][col] === "O") {
                    cell.classList.add("miss");
                }
            }
        }
    }

    updateBoardInteractivity() {
        const playerToAttack = this.currentTurn === "player1" ? "player2" : "player1";
        const opponentGrid = document.getElementById(`grid-${playerToAttack}`);
        const currentPlayerGrid = document.getElementById(`grid-${this.currentTurn}`);

        // enable attack clicks only on the opponent's grid
        opponentGrid.querySelectorAll(".cell").forEach(cell => {
            cell.addEventListener("click", this.handleAttack.bind(this, this.currentTurn, cell.dataset.row, cell.dataset.col));
        });

        // remove clicks from the current player's own grid to prevent self-attack
        currentPlayerGrid.querySelectorAll(".cell").forEach(cell => {
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
        });
    }

    handleAttack(attacker, row, col) {
        if (this.isGameOver) return; // stop further moves if game is over

        const opponent = attacker === "player1" ? "player2" : "player1";
        const board = this.playerBoards[opponent];
        const cell = document.querySelector(`#grid-${opponent} .cell[data-row="${row}"][data-col="${col}"]`);

        if (board[row][col] === "S") {
            board[row][col] = "X"; // mark hit
            cell.classList.add("hit");
            document.getElementById("result").innerText = `Hit on ${opponent}'s ship!`;
        } else if (board[row][col] === "~") {
            board[row][col] = "O"; // mark miss
            cell.classList.add("miss");
            document.getElementById("result").innerText = `Miss on ${opponent}'s board.`;
        } else {
            document.getElementById("result").innerText = "This cell has already been attacked.";
            return;
        }

        this.checkWin(opponent);
        this.switchTurn();
    }

    // check if all ships of a player are sunk
    checkWin(player) {
        const board = this.playerBoards[player];
        const allShipsSunk = board.every(row => !row.includes("S"));
    
        if (allShipsSunk) {
            document.getElementById("result").innerText = `${this.currentTurn} wins the game!`;
            console.log(`Game end`)
            this.isGameOver = true;
            this.disableBoardClicks();
        }
    }

    switchTurn() {
        this.currentTurn = this.currentTurn === "player1" ? "player2" : "player1";
        document.getElementById("message").innerText = `${this.currentTurn}'s turn to attack!`;
        this.updateBoardInteractivity();
    }

    // disable clicks on both boards after game ends
    disableBoardClicks() {
        const player1Grid = document.getElementById(`grid-player1`);
        const player2Grid = document.getElementById(`grid-player2`);
        
        player1Grid.querySelectorAll(".cell").forEach(cell => {
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
        });
        player2Grid.querySelectorAll(".cell").forEach(cell => {
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
        });
    }
}

// Initialize the game
document.addEventListener("DOMContentLoaded", () => {
    const game = new BattleshipGame();
});
