const config = require('./config');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});
const ip = require('ip');

app.use(express.static('public'));

// Game state storage
const games = new Map();
const playerQueue = [];
const playerGameMap = new Map();

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

let connectedUsers = 0;

function createNewGame(player1Id, player2Id) {
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
    const gameState = new GameState(player1Id, player2Id);
    games.set(gameId, gameState);

    playerGameMap.set(player1Id, gameId);
    playerGameMap.set(player2Id, gameId);

    return gameId;
}

function matchPlayers() {
    while (playerQueue.length >= 2) {
        const player1Id = playerQueue.shift();
        const player2Id = playerQueue.shift();

        const gameId = createNewGame(player1Id, player2Id);

        io.to(player1Id).emit('gameStart', { gameId, playerId: player1Id, opponent: player2Id });
        io.to(player2Id).emit('gameStart', { gameId, playerId: player2Id, opponent: player1Id });
    }
}

function cleanupPlayer(playerId){
    const queueIndex = playerQueue.indexOf(playerId);
    if (queueIndex > -1) {
        playerQueue.splice(queueIndex, 1);
    }

    const gameId = playerGameMap.get(playerId);
    if (gameId) {
        const game = games.get(gameId);
        if (game) {
            const opponent = Object.keys(game.players).find(id => id !== playerId);
            if (opponent) {
                io.to(opponent).emit('opponentDisconnected');
            }
            // Clean up game
            games.delete(gameId);
        }
        // Remove game mapping
        const opponent = Object.keys(game.players).find(id => id !== playerId);
        if (opponent) playerGameMap.delete(opponent);
        playerGameMap.delete(playerId);
    }
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    connectedUsers++;
    console.log(`Connected users: ${connectedUsers}`);

    socket.on('disconnect', () => {
        connectedUsers--;
        cleanupPlayer(socket.id);
        io.emit('playerCount', connectedUsers);
        console.log(`User disconnected. Connected users: ${connectedUsers}`);
    });

    // Handle player joining queue
    socket.on('joinGame', () => {
        // Add player to queue
        playerQueue.push(socket.id);
        socket.emit('waitingForOpponent');
        
        // Try to match players
        matchPlayers();
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

        const isGameOver = !opponentBoard.some(row => row.includes("S"));
        game.currentTurn = opponent;

        // Send attack results
        socket.emit('attackResult', {
            row,
            col,
            result,
            nextTurn: game.currentTurn,
            isAttacker: true,
            winner: isGameOver ? socket.id : null
        });

        io.to(opponent).emit('attackResult', {
            row,
            col,
            result,
            nextTurn: game.currentTurn,
            isAttacker: false,
            winner: isGameOver ? socket.id : null
        });

        if (isGameOver) {
            // Clean up the completed game
            playerGameMap.delete(socket.id);
            playerGameMap.delete(opponent);
            games.delete(gameId);
        }
    });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

http.listen(config.PORT, '0.0.0.0', () => {
    const ipAddress = ip.address();
    console.log(`Server running on:`);
    console.log(`- Local: http://localhost:${config.PORT}`);
    console.log(`- Network: http://${ipAddress}:${config.PORT}`);
});