const socket = io();
        let gameState = {
            gameId: null,
            playerId: null,
            opponentId: null,
            currentShipIndex: 0,
            isHorizontal: true,
            ships: [
                { name: "Carrier", size: 5 },
                { name: "Battleship", size: 4 },
                { name: "Cruiser", size: 3 },
                { name: "Submarine", size: 3 },
                { name: "Destroyer", size: 2 },
                { name: "Patrol Boat", size: 1 }
            ],
            board: Array(10).fill(null).map(() => Array(10).fill("~")),
            isMyTurn: false,
            gameStarted: false
        };

        // Initialize UI
        function initializeUI() {
            createGrid('player-grid');
            createGrid('opponent-grid');
            
            document.getElementById('join-game').addEventListener('click', () => {
                socket.emit('joinGame');
                document.getElementById('join-game').disabled = true;
            });

            document.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                gameState.isHorizontal = !gameState.isHorizontal;
            });

            document.getElementById('ready-button').addEventListener('click', () => {
                socket.emit('placeShips', {
                    gameId: gameState.gameId,
                    board: gameState.board
                });
                document.getElementById('ready-button').disabled = true;
                document.querySelector('.placement-controls').classList.add('hidden');
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
                placeShip(row, col, ship.size);
                gameState.currentShipIndex++;
                updateShipPlacementInfo();
                
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
            for (let i = 0; i < size; i++) {
                const currentRow = gameState.isHorizontal ? row : row + i;
                const currentCol = gameState.isHorizontal ? col + i : col;
                
                gameState.board[currentRow][currentCol] = "S";
                const cell = document.querySelector(`#player-grid .cell[data-row="${currentRow}"][data-col="${currentCol}"]`);
                cell.classList.add('ship');
            }
        }

        function handleAttack(row, col) {
            if (!gameState.gameStarted || !gameState.isMyTurn) return;
            
            socket.emit('attack', {
                gameId: gameState.gameId,
                row,
                col
            });
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

        socket.on('attackResult', ({ row, col, result, nextTurn, isAttacker, isGameOver, winner }) => {
            if (isAttacker) {
                const cell = document.querySelector(`#opponent-grid .cell[data-row="${row}"][data-col="${col}"]`);
                // Force reflow
                cell.style.display = 'none';
                cell.offsetHeight; // This triggers reflow
                cell.style.display = '';
                
                requestAnimationFrame(() => {
                    cell.classList.add(result === 'hit' ? 'hit' : 'miss');
                });
            } else {
                const cell = document.querySelector(`#player-grid .cell[data-row="${row}"][data-col="${col}"]`);
                // Force reflow
                cell.style.display = 'none';
                cell.offsetHeight;
                cell.style.display = '';
                
                requestAnimationFrame(() => {
                    if (result === 'hit') {
                        cell.classList.remove('ship');
                        cell.classList.add('hit');
                    } else {
                        cell.classList.add('miss');
                    }
                });
            }

            gameState.isMyTurn = nextTurn === gameState.playerId;
            
            if (isGameOver) {
                const winMessage = winner === gameState.playerId ? 'You won!' : 'You lost!';
                document.getElementById('game-status').textContent = winMessage;
            } else {
                updateGameStatus();
            }
        });

        socket.on('opponentDisconnected', () => {
            document.getElementById('game-status').textContent = 'Opponent disconnected. Game ended.';
            gameState.gameStarted = false;
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
            if (gameState.currentShipIndex >= gameState.ships.length) return;
            
            const ship = gameState.ships[gameState.currentShipIndex];
            if (canPlaceShip(row, col, ship.size)) {
                for (let i = 0; i < ship.size; i++) {
                    const currentRow = gameState.isHorizontal ? row : row + i;
                    const currentCol = gameState.isHorizontal ? col + i : col;
                    
                    if (currentRow < 10 && currentCol < 10) {
                        const cell = document.querySelector(`#player-grid .cell[data-row="${currentRow}"][data-col="${currentCol}"]`);
                        cell.style.backgroundColor = '#77afba';
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

        // Initialize the game
        document.addEventListener('DOMContentLoaded', initializeUI);