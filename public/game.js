const socket = io();

let currentPlayer = "user";
let playerNum = 0;
let ready = false;
let enemyReady = false;
let isGameOver = false;
let currentTurn = 'player1';


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

// Game state variables
const boardSize = 10;

const playerBoards = {
    player1: createEmptyBoard(),
    player2: createEmptyBoard()
};

// UI elements
const startButton = document.getElementById("start-game");
const messageElement = document.getElementById("message");
const resultElement = document.getElementById("result");

initializeUI();

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('sync-game-state', ({ gameState }) => {
    console.log(gameState);
    playerBoards.player1 = gameState.player1.board;
    playerBoards.player2 = gameState.player2.board;
    renderBoards();
});


socket.on('player-number', num => {
    if (num === -1) {
        console.log("Server is full");
    } else {
        playerNum = parseInt(num);
        if (playerNum === 1) currentPlayer = "enemy";

        console.log(playerNum);

        socket.emit('check-players');
    }
})

socket.on("player-connection", num => {
    console.log(`Player ${num} has connected`)
    playerConnectedOrDisconnected(num);
})

    // Check player status
socket.on('check-players', players => {
    players.forEach((p, i) => {
        if(p.connected) playerConnectedOrDisconnected(i)
    })
})

socket.on("turn-changed", ({ currentTurn }) => {
    if (currentTurn !== 'player1' && currentTurn !== 'player2') {
        console.error("Received undefined currentTurn");
        messageElement.innerText = "Error: Current turn is undefined!";
        return;
    }

    console.log(`Turn changed to: ${currentTurn}`);
    messageElement.innerText = `${currentTurn}'s turn to attack!`;

    if (currentTurn === 'player2') {
        console.log("Enabling Player 1's board, disabling Player 2's board");
        enableBoard('player1');
        disableBoard('player2');
    } else {
        console.log("Enabling Player 2's board, disabling Player 1's board");
        enableBoard('player2');
        disableBoard('player1');
    }

    // updateBoardInteractivity();
});

function enableBoard(player) {
    const board = document.getElementById(`grid-${player}`);
    console.log(`Enabling board: grid-${player}`);
    board.style.pointerEvents = "auto";
}

function disableBoard(player) {
    const board = document.getElementById(`grid-${player}`);
    console.log(`Disabling board: grid-${player}`);
    board.style.pointerEvents = "none";
}


socket.on('game-start', () => {
    messageElement.innerText = "Game started! Player 1's turn to attack!";
    updateBoardInteractivity();
})

socket.on('player-ready', ({ player, ready }) => {
    if (ready) {
        messageElement.innerText = `${player} is ready!`;
    }
});

socket.on('attack-result', ({ player, row, col, result }) => {
    const opponent = player === "player1" ? "player2" : "player1";
    const board = playerBoards[opponent];

    if (result === "hit") {
        board[row][col] = "X";
        document.querySelector(`#grid-${opponent} .cell[data-row="${row}"][data-col="${col}"]`).classList.add("hit");
    } else if (result === "miss") {
        board[row][col] = "O";
        document.querySelector(`#grid-${opponent} .cell[data-row="${row}"][data-col="${col}"]`).classList.add("miss");
    }
});

socket.on("turn-changed", ({ currentTurn }) => {
    if (!currentTurn) {
        console.error("Received undefined currentTurn");
        messageElement.innerText = "Error: Current turn is undefined!";
        return;
    }
    console.log(`Turn changed to: ${currentTurn}`);
    messageElement.innerText = `${currentTurn}'s turn to attack!`;
    updateBoardInteractivity(currentTurn);
});


socket.on("game-over", ({ winner }) => {
    isGameOver = true; // Set game state to over
    messageElement.innerText = `${winner} wins the game!`;
    disableBoardClicks(); // Disable further interactions
});


// On Timeout
socket.on('timeout', () => {
    infoDisplay.innerHTML = 'You have reached the 10 minute limit'
});

function playerConnectedOrDisconnected(num) {
    let player = `.p${parseInt(num) + 1}`;
    document.querySelector(`${player} .connected span`).classList.toggle('green');
    if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold';
}

startButton.addEventListener("click", () => {
    socket.emit('set-ready', playerNum);
    const playerBoard = playerBoards[`player${playerNum + 1}`];

    // Send board to server
    socket.emit('place-ships', { player: `player${playerNum + 1}`, board: playerBoard });

    // Update UI
    messageElement.innerText = "Waiting for the other player...";
});

function createEmptyBoard() {
    return Array(boardSize).fill(null).map(() => Array(boardSize).fill("~"));
}

function initializeUI() {
    createGrid("player1");
    createGrid("player2");
}

function renderBoards() {
    renderGrid("player1");
    renderGrid("player2");
}

function createGrid(player) {
    const gridElement = document.getElementById(`grid-${player}`);
    gridElement.innerHTML = ""; 
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.row = row;
            cell.dataset.col = col;
            gridElement.appendChild(cell);
        }
    }
}

function renderGrid(player) {
    const board = playerBoards[player];
    const gridElement = document.getElementById(`grid-${player}`);
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
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

function updateBoardInteractivity() {
    const playerToAttack = currentTurn === "player1" ? "player2" : "player1";
    const opponentGrid = document.getElementById(`grid-${playerToAttack}`);
    const currentPlayerGrid = document.getElementById(`grid-${currentTurn}`);

    // Disable clicks on the current player's own board
    currentPlayerGrid.querySelectorAll(".cell").forEach(cell => {
        const newCell = cell.cloneNode(true);
        cell.parentNode.replaceChild(newCell, cell); // Remove any existing listeners
    });

    // Enable clicks on the opponent's board if it's this player's turn
    opponentGrid.querySelectorAll(".cell").forEach(cell => {
        const newCell = cell.cloneNode(true);
        cell.parentNode.replaceChild(newCell, cell); // Remove any existing listeners
        if (currentTurn === (playerNum === 0 ? "player1" : "player2")) {
            newCell.addEventListener("click", handleCellClick);
        }
    });
}

function handleCellClick(event) {
    const cell = event.target;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    // Send the attack to the server
    socket.emit("attack", { player: currentTurn, row, col });
}


function handleAttack(attacker, row, col) {
    if (isGameOver) return;

    // Send the attack to the server
    socket.emit('attack', { player: currentTurn, row: parseInt(row), col: parseInt(col) });
}

function checkWin(player) {
    const board = playerBoards[player];
    const allShipsSunk = board.every(row => !row.includes("S"));

    if (allShipsSunk) {
        resultElement.innerText = `${currentTurn} wins the game!`;
        console.log("Game end");
        isGameOver = true;
        disableBoardClicks();
    }
}

function switchTurn() {
    currentTurn = currentTurn === "player1" ? "player2" : "player1";
    messageElement.innerText = `${currentTurn}'s turn to attack!`;
    updateBoardInteractivity();
}

function disableBoardClicks() {
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


'use strict'