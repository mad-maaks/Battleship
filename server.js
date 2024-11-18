const express = require('express');
const path = require('path')
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// Game state
let gameState = {
    player1: {
      board: createEmptyBoard(),
      ready: false,
      turn: false, // Only one player can have the turn
    },
    player2: {
      board: createEmptyBoard(),
      ready: false,
      turn: false,
    },
    currentTurn: 'player1', // Player 1 starts
    isGameOver: false,
  };
  
//   io.emit("turn-changed", { currentTurn: gameState.currentTurn });
  
  
  // Initialize empty board
function createEmptyBoard() {
    return Array(10).fill(null).map(() => Array(10).fill("~"));
}

const connections = [null, null]

io.on('connection', socket => {
    socket.emit('sync-game-state', { gameState });
  
    // Find an available player number
    let playerIndex = -1;
    for (const i in connections) {
      if (connections[i] === null) {
        playerIndex = i
        break
      }
    }
  
    // Tell the connecting client what player number they are
    socket.emit('player-number', playerIndex) 
    console.log(`Player ${playerIndex} has connected`)
  
    // Ignore player 3
    if (playerIndex === -1) return

    if (playerIndex !== -1) {
        connections[playerIndex] = socket.id;

        // Place ships for this player and update the game state
        gameState[`player${parseInt(playerIndex) + 1}`].board = placeShipsOnBoard(createEmptyBoard());

        // Emit the updated game state to both clients
        io.emit('sync-game-state', { gameState });

        // Sync connection status with other players
        socket.broadcast.emit('player-connection', playerIndex);

        // If both players are connected, check if they are ready to start
        if (gameState.player1.board && gameState.player2.board) {
            io.emit('game-start', { currentTurn: gameState.currentTurn });
        }
    }
  
    connections[playerIndex] = socket.id;
  
    // Tell eveyone what player number just connected
    socket.broadcast.emit('player-connection', playerIndex);
  
    // Check player connections
    socket.on('check-players', () => {
      const players = []
      for (const i in connections) {
        connections[i] === null ? players.push({connected: false}) : players.push({connected: true})
      }
      socket.emit('check-players', players)
    });

    socket.on('set-ready', (player) => {
        console.log('Player number:', player);
        if (gameState[`player${player + 1}`]) {
            gameState[`player${player + 1}`].ready = true;

            // Only emit 'game-start' once both players are ready and both have placed their ships
            if (gameState.player1.ready && gameState.player2.ready) {
                gameState.isGameOver = false;
                gameState.currentTurn = 'player1'; // Player 1 starts the game
                io.emit('sync-game-state', { gameState }); // Synchronize game state with both clients
                io.emit('game-start', { currentTurn: gameState.currentTurn }); // Notify players to start the game
            }
        } else {
            console.log('Error: Invalid player number');
        }
    });
    
    socket.on("attack", ({ player, row, col }) => {
        if (player !== gameState.currentTurn) {
            socket.emit("invalid-attack", { message: "It's not your turn!" });
            return;
        }
    
        const opponent = player === "player1" ? "player2" : "player1";
        const board = gameState[opponent].board;
    
        if (board[row][col] === "X" || board[row][col] === "O") {
            socket.emit("invalid-attack", { message: "This cell has already been attacked." });
            return;
        }
    
        let result;
        if (board[row][col] === "S") {
            board[row][col] = "X"; // Hit
            result = "hit";
        } else {
            board[row][col] = "O"; // Miss
            result = "miss";
        }
    
        io.emit("attack-result", { player, row, col, result });
    
        const allShipsSunk = board.every(row => !row.includes("S"));
        if (allShipsSunk) {
            io.emit("game-over", { winner: player });
            return;
        }
    
        // Switch turn after attack
        gameState.currentTurn = gameState.currentTurn === "player1" ? "player2" : "player1";
        io.emit("turn-changed", { currentTurn: gameState.currentTurn }); // Only emit this once
    });
    
    
    socket.on('place-ships', ({ player, board }) => {
        if (!gameState[`player${player}`]) return;

        // Update board and set player as ready
        gameState[`player${player}`].board = board;
        gameState[`player${player}`].ready = true;

        // Emit the updated game state and notify other players about the readiness
        io.emit('sync-game-state', { gameState });
        io.emit('player-ready', { player, ready: true });

        // Check if both players are ready and start the game
        if (gameState.player1.ready && gameState.player2.ready) {
            gameState.currentTurn = 'player1'; // Player 1 starts the game
            io.emit('game-start', { currentTurn: gameState.currentTurn }); // Start the game
        }
    });

    function placeShipsOnBoard(board) {
        const ships = [
          { name: "Carrier", size: 5 },
          { name: "Battleship", size: 4 },
          { name: "Cruiser", size: 3 },
          { name: "Submarine", size: 3 },
          { name: "Destroyer", size: 2 },
          { name: "Patrol Boat", size: 1 }
        ];
        boardSize = 10;
      
        for (const ship of ships) {
          let placed = false;
          while (!placed) {
            const direction = getRandomDirection();
            const startRow = Math.floor(Math.random() * boardSize);
            const startCol = Math.floor(Math.random() * boardSize);
      
            if (checkFit(board, startRow, startCol, ship.size, direction) &&
                checkAdjacentCells(board, startRow, startCol, ship.size, direction)) {
              for (let i = 0; i < ship.size; i++) {
                const { row, col } = getShipPosition(startRow, startCol, direction, i);
                board[row][col] = "S";
              }
              placed = true;
            }
          }
        }
      
        return board;
    }

    function getRandomDirection() {
        return Math.floor(Math.random() * 4) + 1;
    }
    
    function checkFit(board, startRow, startCol, size, direction) {
        for (let i = 0; i < size; i++) {
            const { row, col } = getShipPosition(startRow, startCol, direction, i);
    
            if (
                row < 0 || row >= boardSize || 
                col < 0 || col >= boardSize || 
                board[row][col] !== "~"
            ) {
                return false;
            }
        }
        return true;
    }
    
    function checkAdjacentCells(board, startRow, startCol, size, direction) {
        for (let i = 0; i < size; i++) {
            const { row, col } = getShipPosition(startRow, startCol, direction, i);
    
            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r === row && c === col) continue;
    
                    if (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
                        if (board[r][c] === "S") {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    
    function getShipPosition(startRow, startCol, direction, index) {
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
    
    // Handle Diconnect
    socket.on('disconnect', () => {
        console.log(`Player ${playerIndex} disconnected`)
        connections[playerIndex] = null
        //Tell everyone what player numbe just disconnected
        socket.broadcast.emit('player-connection', playerIndex)
    });

        // Timeout connection
    setTimeout(() => {
      connections[playerIndex] = null
      socket.emit('timeout')
      socket.disconnect()
    }, 600000) // 10 minute limit per player
});
  


server.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`);
})