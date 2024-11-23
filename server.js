const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

// Game state storage
const games = new Map();
const playerQueue = [];

class GameState {
    constructor(player1Id, player2Id) {
        this.players = {
            [player1Id]: {
                board: Array(10).fill(null).map(() => Array(10).fill("~")),
                ready: false
            },
            [player2Id]: {
                board: Array(10).fill(null).map(() => Array(10).fill("~")),
                ready: false
            }
        };
        this.currentTurn = player1Id;
        this.gameStarted = false;
    }
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle player joining queue
    socket.on('joinGame', () => {
        playerQueue.push(socket.id);
        
        if (playerQueue.length >= 2) {
            const player1Id = playerQueue.shift();
            const player2Id = playerQueue.shift();
            
            // Create new game instance
            const gameId = `game-${Date.now()}`;
            games.set(gameId, new GameState(player1Id, player2Id));
            
            // Notify both players
            io.to(player1Id).emit('gameStart', { gameId, playerId: player1Id, opponent: player2Id });
            io.to(player2Id).emit('gameStart', { gameId, playerId: player2Id, opponent: player1Id });
        } else {
            socket.emit('waitingForOpponent');
        }
    });

    // Handle ship placement
    socket.on('placeShips', ({ gameId, board }) => {
        const game = games.get(gameId);
        if (!game) return;

        game.players[socket.id].board = board;
        game.players[socket.id].ready = true;

        // Check if both players are ready
        const allPlayersReady = Object.values(game.players).every(player => player.ready);
        if (allPlayersReady && !game.gameStarted) {
            game.gameStarted = true;
            io.to(Object.keys(game.players)).emit('bothPlayersReady', { currentTurn: game.currentTurn });
        }
    });

    // Handle attacks
    socket.on('attack', ({ gameId, row, col }) => {
        const game = games.get(gameId);
        if (!game || !game.gameStarted || game.currentTurn !== socket.id) return;

        const opponent = Object.keys(game.players).find(id => id !== socket.id);
        const opponentBoard = game.players[opponent].board;

        let result;
        if (opponentBoard[row][col] === "S") {
            opponentBoard[row][col] = "X"; // Hit
            result = "hit";
        } else if (opponentBoard[row][col] === "~") {
            opponentBoard[row][col] = "O"; // Miss
            result = "miss";
        } else {
            return; // Cell already attacked
        }

        // Check for win condition
        const isGameOver = !opponentBoard.some(row => row.includes("S"));
        
        // Switch turns
        game.currentTurn = opponent;

        // Notify both players of the attack result
        io.to(Object.keys(game.players)).emit('attackResult', {
            row,
            col,
            result,
            nextTurn: game.currentTurn,
            isGameOver,
            winner: isGameOver ? socket.id : null
        });

        if (isGameOver) {
            games.delete(gameId);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const queueIndex = playerQueue.indexOf(socket.id);
        if (queueIndex > -1) {
            playerQueue.splice(queueIndex, 1);
        }

        // Notify opponent if player disconnects during game
        for (const [gameId, game] of games.entries()) {
            if (game.players[socket.id]) {
                const opponent = Object.keys(game.players).find(id => id !== socket.id);
                if (opponent) {
                    io.to(opponent).emit('opponentDisconnected');
                }
                games.delete(gameId);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});