const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

socket.on('connect', () => {
    console.log('Connected to server');
    document.getElementById('connection-status').textContent = 'Connected';
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    document.getElementById('connection-status').textContent = 'Connection error';
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    document.getElementById('connection-status').textContent = 'Disconnected';
});

let gameState = {
    gameId: null,
    playerId: null,
    opponentId: null,
    currentShipIndex: 0,
    isHorizontal: true,
    ships: [
        { 
            name: "Carrier", 
            size: 5,
            imageUrl: '/images/carrier.png',
            className: 'carrier'
        },
        { 
            name: "Battleship", 
            size: 4,
            imageUrl: '/images/battleship.png',
            className: 'battleship'
        },
        { 
            name: "Cruiser", 
            size: 3,
            imageUrl: '/images/cruiser.png',
            className: 'cruiser'
        },
        { 
            name: "Submarine", 
            size: 3,
            imageUrl: '/images/submarine.png',
            className: 'submarine'
        },
        { 
            name: "Destroyer", 
            size: 2,
            imageUrl: '/images/destroyer.png',
            className: 'destroyer'
        },
        { 
            name: "Patrol Boat", 
            size: 1,
            imageUrl: '/images/patrol.png',
            className: 'patrol'
        }
    ],
    board: Array(10).fill(null).map(() => Array(10).fill("~")),
    isMyTurn: false,
    gameStarted: false,
    placementHistory: []
};

const ships = gameState.ships;

// Initialize UI
function initializeUI() {
    createGrid('player-grid');
    createGrid('opponent-grid');
    const buttonAudio = new Audio('/audio/button.wav');
    
    document.getElementById('join-game').addEventListener('click', () => {
        socket.emit('joinGame');
        document.getElementById('join-game').disabled = true;
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        buttonAudio.play();
    });

    document.getElementById('rotate-ship').addEventListener('click', () => {
        gameState.isHorizontal = !gameState.isHorizontal;
    })

    document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        gameState.isHorizontal = !gameState.isHorizontal;
    });

    document.getElementById('ready-button').addEventListener('click', () => {
        const readyAudio = new Audio('/audio/ready.wav');
        socket.emit('placeShips', {
            gameId: gameState.gameId,
            board: gameState.board
        });
        document.getElementById('ready-button').disabled = true;
        document.querySelector('.placement-controls').classList.add('hidden');
        readyAudio.play();
    });

    document.getElementById('play-again').addEventListener('click', () => {
        buttonAudio.play();
        window.location.reload(); 
    });

    document.getElementById('undo-button').addEventListener('click', () => {
        undoLastPlacement();
    });
}

function createGrid(gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            if (gridId === 'player-grid') {
                cell.addEventListener('click', () => handleShipPlacement(row, col));
                cell.addEventListener('mouseover', () => showShipPreview(row, col));
                cell.addEventListener('mouseout', () => removeShipPreview());
            } else {
                cell.addEventListener('click', () => handleAttack(row, col));
            }
            
            grid.appendChild(cell);
        }
    }
}

function handleShipPlacement(row, col) {
    if (gameState.currentShipIndex >= gameState.ships.length) return;
    
    const ship = gameState.ships[gameState.currentShipIndex];
    if (canPlaceShip(row, col, ship.size)) {
        const placementInfo = {
            shipIndex: gameState.currentShipIndex,
            positions: [],
            isHorizontal: gameState.isHorizontal
        };

        for (let i = 0; i < ship.size; i++) {
            const currentRow = gameState.isHorizontal ? row : row + i;
            const currentCol = gameState.isHorizontal ? col + i : col;
            placementInfo.positions.push({row: currentRow, col: currentCol});
        }

        placeShip(row, col, ship.size);
        new Audio('/audio/placeship.wav').play();
        gameState.placementHistory.push(placementInfo);
        gameState.currentShipIndex++;
        updateShipPlacementInfo();

        document.getElementById('undo-button').disabled = false;
        document.getElementById('ready-button').disabled = gameState.currentShipIndex < gameState.ships.length;
        
        if (gameState.currentShipIndex >= gameState.ships.length) {
            document.getElementById('ready-button').disabled = false;
        }
    }
}

function canPlaceShip(row, col, size) {
    for (let i = 0; i < size; i++) {
        const currentRow = gameState.isHorizontal ? row : row + i;
        const currentCol = gameState.isHorizontal ? col + i : col;
        
        if (currentRow >= 10 || currentCol >= 10) return false;
        if (gameState.board[currentRow][currentCol] !== "~") return false;
        
        // Check adjacent cells
        for (let r = currentRow - 1; r <= currentRow + 1; r++) {
            for (let c = currentCol - 1; c <= currentCol + 1; c++) {
                if (r >= 0 && r < 10 && c >= 0 && c < 10) {
                    if (gameState.board[r][c] === "S") return false;
                }
            }
        }
    }
    return true;
}

function placeShip(row, col, size) {
    const currentShip = gameState.ships[gameState.currentShipIndex];
    const isHorizontal = gameState.isHorizontal;
    const cellSize = 30; // Match your CSS cell size

    for (let i = 0; i < size; i++) {
        const currentRow = isHorizontal ? row : row + i;
        const currentCol = isHorizontal ? col + i : col;
        
        gameState.board[currentRow][currentCol] = "S";
        const cell = document.querySelector(`#player-grid .cell[data-row="${currentRow}"][data-col="${currentCol}"]`);
        cell.classList.add('ship');
        cell.dataset.shipType = currentShip.className;
        cell.dataset.shipIndex = i;
        cell.dataset.shipSize = size;
        cell.dataset.shipOrientation = isHorizontal ? 'horizontal' : 'vertical';
        
        // Create ship container for each cell
        const shipContainer = document.createElement('div');
        shipContainer.className = `ship-container ${currentShip.className} ${isHorizontal ? 'horizontal' : 'vertical'}`;
        
        // Set container size for each segment
        shipContainer.style.width = `${cellSize}px`;
        shipContainer.style.height = `${cellSize}px`;
        shipContainer.style.position = 'absolute';
        shipContainer.style.zIndex = '2';
        
        // Add custom attributes for positioning the background image
        shipContainer.dataset.partIndex = i;
        shipContainer.dataset.totalParts = size;
        
        // Create ship image
        const shipImage = document.createElement('img');
        shipImage.src = currentShip.imageUrl;
        shipImage.alt = currentShip.name;
        
        if (isHorizontal) {
            shipImage.style.width = `${size * 100}%`;
            shipImage.style.height = '100%';
            shipImage.style.left = `${-i * 100}%`;
            shipImage.style.top = '0';
            shipImage.style.transform = 'none';
        } else {
            shipImage.style.width = `${size * 100}%`;
            shipImage.style.height = '100%';
            shipImage.style.top = `${-i * 100}%`;
            shipImage.style.left = '0';
            shipImage.style.transform = 'rotate(90deg) translate(0, -100%)';
            shipImage.style.transformOrigin = 'top left';
        }
        
        shipImage.style.position = 'absolute';
        shipImage.style.objectFit = 'cover';
        
        shipContainer.appendChild(shipImage);
        cell.appendChild(shipContainer);
    }
}

function undoLastPlacement() {
    if (gameState.placementHistory.length === 0) return;

    const lastPlacement = gameState.placementHistory.pop();

    lastPlacement.positions.forEach(({row, col}) => {
        gameState.board[row][col] = "~";

        const cell = document.querySelector(`#player-grid .cell[data-row="${row}"][data-col="${col}"]`);
        cell.classList.remove('ship');
        cell.removeAttribute('data-ship-type');
        cell.removeAttribute('data-ship-index');
        cell.removeAttribute('data-ship-size');
        cell.removeAttribute('data-ship-orientation');

        const shipContainer = cell.querySelector('.ship-container');
        if (shipContainer) {
            cell.removeChild(shipContainer);
        }
    });

    gameState.currentShipIndex--;

    updateShipPlacementInfo();
    document.getElementById('ready-button').disabled = true;

    document.getElementById('undo-button').disabled = gameState.placementHistory.length === 0;
}

function handleAttack(row, col) {
    if (!gameState.gameStarted || !gameState.isMyTurn) return;
    
    socket.emit('attack', {
        gameId: gameState.gameId,
        row,
        col
    });
}

function showGameOver(isWinner) {
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverTitle = document.getElementById('game-over-title');
    const gameOverMessage = document.getElementById('game-over-message');

    isWinner ? new Audio('/audio/win.wav').play() : new Audio('/audio/lose.wav').play();
    gameOverTitle.textContent = isWinner ? 'You Won :D' : 'You Deer :(';
    gameOverMessage.textContent = isWinner 
        ? 'Congratulations, deer! You have destroyed all enemy ships!'
        : 'Your fleet has been destroyed! Nice try, deer.';
    
    gameOverScreen.classList.remove('hidden');
}


// Socket event handlers
socket.on('waitingForOpponent', () => {
    document.getElementById('game-status').textContent = 'Waiting for opponent...';
});

socket.on('gameStart', ({ gameId, playerId, opponent }) => {
    gameState.gameId = gameId;
    gameState.playerId = playerId;
    gameState.opponentId = opponent;
    
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    updateShipPlacementInfo();
});

socket.on('bothPlayersReady', ({ currentTurn }) => {
    gameState.gameStarted = true;
    gameState.isMyTurn = currentTurn === gameState.playerId;
    updateGameStatus();
});

socket.on('attackResult', ({ row, col, result, nextTurn, isAttacker, winner }) => {
    const targetGrid = isAttacker ? '#opponent-grid' : '#player-grid';
    const cell = document.querySelector(`${targetGrid} .cell[data-row="${row}"][data-col="${col}"]`);
    const hitAudio = new Audio('/audio/hit.wav');
    const missAudio = new Audio('/audio/miss.wav');
    
    if (result === 'hit') {
        cell.classList.add('hit');
        hitAudio.play();
        
        if (isAttacker) {
            const shipType = cell.dataset.shipType;
            const shipIndex = parseInt(cell.dataset.shipIndex);
            const shipSize = parseInt(cell.dataset.shipSize);
            const isHorizontal = cell.dataset.shipOrientation === 'horizontal';
            const cellSize = 30;
            
            // Create ship container for the hit cell
            const shipContainer = document.createElement('div');
            shipContainer.className = `ship-container ${shipType} ${isHorizontal ? 'horizontal' : 'vertical'}`;
            
            shipContainer.style.width = `${cellSize}px`;
            shipContainer.style.height = `${cellSize}px`;
            shipContainer.style.position = 'absolute';
            shipContainer.style.zIndex = '2';
            
            // Find the ship definition
            const ship = ships.find(s => s.className === shipType);
            if (ship) {
                const shipImage = document.createElement('img');
                shipImage.src = ship.imageUrl;
                shipImage.alt = ship.name;
                
                if (isHorizontal) {
                    shipImage.style.width = `${shipSize * 100}%`;
                    shipImage.style.height = '100%';
                    shipImage.style.left = `${-shipIndex * 100}%`;
                    shipImage.style.top = '0';
                    shipImage.style.transform = 'none';
                } else {
                    shipImage.style.width = '100%';
                    shipImage.style.height = `${shipSize * 100}%`;
                    shipImage.style.top = `${-shipIndex * 100}%`;
                    shipImage.style.left = '0';
                    shipImage.style.transform = 'rotate(90deg) translate(0, -100%)';
                    shipImage.style.transformOrigin = 'top left';
                }
                
                shipImage.style.position = 'absolute';
                shipImage.style.objectFit = 'cover';
                
                shipContainer.appendChild(shipImage);
                cell.appendChild(shipContainer);
            }
        }
    } else {
        cell.classList.add('miss');
        missAudio.play();
    }
    
    gameState.isMyTurn = nextTurn === gameState.playerId;
    
    if (winner) {
        showGameOver(winner === gameState.playerId);
    } else {
        updateGameStatus();
    }
});

function updateGameStatus() {
    const status = gameState.isMyTurn ? 'Your turn to attack!' : "Opponent's turn";
    document.getElementById('game-status').textContent = status;
}

function updateShipPlacementInfo() {
    const info = document.getElementById('ship-placement-info');
    if (gameState.currentShipIndex < gameState.ships.length) {
        const ship = gameState.ships[gameState.currentShipIndex];
        info.textContent = `Place your ${ship.name} (size: ${ship.size})`;
    } else {
        info.textContent = 'All ships placed! Click Ready when done.';
    }
}

function showShipPreview(row, col) {
    if (gameState.currentShipIndex >= ships.length) return;
    
    const ship = ships[gameState.currentShipIndex];
    if (canPlaceShip(row, col, ship.size)) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'ship-preview';
        
        for (let i = 0; i < ship.size; i++) {
            const currentRow = gameState.isHorizontal ? row : row + i;
            const currentCol = gameState.isHorizontal ? col + i : col;
            
            if (currentRow < 10 && currentCol < 10) {
                const cell = document.querySelector(`#player-grid .cell[data-row="${currentRow}"][data-col="${currentCol}"]`);
                cell.style.backgroundColor = 'rgba(35, 86, 125, 0.159)';
            }
        }
    }
}

function removeShipPreview() {
    document.querySelectorAll('#player-grid .cell').forEach(cell => {
        if (!cell.classList.contains('ship')) {
            cell.style.backgroundColor = '';
        }
    });
}

function adjustForDevice() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Adjust grid size for mobile
        document.querySelectorAll('.grid').forEach(grid => {
            grid.style.gridTemplateColumns = 'repeat(10, 25px)';
        });
        
        document.querySelectorAll('.cell').forEach(cell => {
            cell.style.width = '25px';
            cell.style.height = '25px';
        });
    }
}

// Add responsive layout
window.addEventListener('resize', adjustForDevice);

// Initialize the game
document.addEventListener('DOMContentLoaded', initializeUI);