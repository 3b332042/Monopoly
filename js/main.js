import { db, ref, set, onValue, update, push, get, child } from './firebase.js?v=16';

// DOM Elements
const lobbyScreen = document.getElementById('lobby-screen');
const waitingScreen = document.getElementById('waiting-screen');
const gameScreen = document.getElementById('game-screen');

const btnCreate = document.getElementById('btn-create-room');
const btnJoin = document.getElementById('btn-join-room');
const btnStart = document.getElementById('btn-start-game');
const nameInput = document.getElementById('player-name');
const roomInput = document.getElementById('room-code-input');
const displayRoomCode = document.getElementById('display-room-code');
const playerList = document.getElementById('player-list');
const hostControls = document.getElementById('host-controls');
const waitingMsg = document.getElementById('waiting-msg');
const lobbyStatus = document.getElementById('lobby-status');

// State
let currentPlayerId = null;
let currentRoomId = null;
let isHost = false;

// Helpers
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString(); // Simple 4 digit code
}

function showScreen(screenId) {
    // 1. Hide all OTHER screens
    document.querySelectorAll('.screen').forEach(s => {
        if (s.id !== screenId) {
            s.classList.remove('active');
            setTimeout(() => {
                // Only add hidden if it's still not the active screen (in case user clicked fast)
                if (s.id !== screenId) {
                    s.classList.add('hidden');
                }
            }, 500);
        }
    });

    // 2. Show TARGET screen
    const target = document.getElementById(screenId);
    target.classList.remove('hidden');
    // Force reflow to ensure transition works
    void target.offsetWidth;
    target.classList.add('active');
}

// Actions
async function createRoom() {
    const name = nameInput.value || "Player 1";
    const roomId = generateRoomCode();

    // Use existing ID or create new
    let savedId = localStorage.getItem('monopoly_playerId');
    if (!savedId) {
        savedId = "p_" + Date.now();
        localStorage.setItem('monopoly_playerId', savedId);
    }
    currentPlayerId = savedId;

    currentRoomId = roomId;
    isHost = true;

    lobbyStatus.textContent = "正在建立房間...";

    // Check if room exists (collision check skipped for MVP)
    const roomRef = ref(db, 'rooms/' + roomId);

    const roomData = {
        host: currentPlayerId,
        status: 'waiting',
        created: Date.now(),
        players: {
            [currentPlayerId]: {
                name: name,
                balance: 15000,
                position: 0,
                color: '#ff0000', // Default Red
                isReady: true
            }
        }
    };

    try {
        await set(roomRef, roomData);
        enterWaitingRoom(roomId);
    } catch (e) {
        console.error(e);
        lobbyStatus.textContent = "建立失敗: " + e.message;
    }
}

async function joinRoom() {
    const roomId = roomInput.value.trim();
    const name = nameInput.value || "Player 2";

    if (!roomId) {
        lobbyStatus.textContent = "請輸入房間代碼";
        return;
    }

    lobbyStatus.textContent = "正在加入...";

    const roomRef = ref(db, 'rooms/' + roomId);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
        const roomData = snapshot.val();
        if (roomData.status !== 'waiting') {
            lobbyStatus.textContent = "遊戲已經開始或房間已關閉";
            return;
        }

        // Use existing ID or create new
        let savedId = localStorage.getItem('monopoly_playerId');
        if (!savedId) {
            savedId = "p_" + Date.now();
            localStorage.setItem('monopoly_playerId', savedId);
        }
        currentPlayerId = savedId;

        currentRoomId = roomId;
        isHost = false;

        // Add player to room
        const playerRef = ref(db, `rooms/${roomId}/players/${currentPlayerId}`);
        await set(playerRef, {
            name: name,
            balance: 15000,
            position: 0,
            color: '#00ff00', // Default Green (improve later)
            isReady: true
        });

        enterWaitingRoom(roomId);
    } else {
        lobbyStatus.textContent = "找不到此房間";
    }
}

function enterWaitingRoom(roomId) {
    showScreen('waiting-screen');
    displayRoomCode.textContent = roomId;

    if (isHost) {
        hostControls.classList.remove('hidden');
        waitingMsg.classList.add('hidden');
    } else {
        hostControls.classList.add('hidden');
        waitingMsg.classList.remove('hidden');
    }

    // Subscribe to room updates
    const roomRef = ref(db, 'rooms/' + roomId);
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Update player list (only if in waiting screen)
        if (!hasGameStarted) {
            updatePlayerList(data.players);
        }

        // Check for game start
        if (data.status === 'playing' && !hasGameStarted) {
            startGame();
        }
    });
}

let hasGameStarted = false;

function updatePlayerList(players) {
    playerList.innerHTML = '';
    Object.values(players).forEach(p => {
        const li = document.createElement('li');
        li.textContent = `${p.name} ($${p.balance})`;
        playerList.appendChild(li);
    });
}

function startGameRequest() {
    if (!isHost) return;
    update(ref(db, 'rooms/' + currentRoomId), {
        status: 'playing'
    });
}

import { Board } from './board.js?v=16';
import { Game } from './game.js?v=16';

let gameBoard = null;
let gameInstance = null;

function startGame() {
    if (hasGameStarted) return;
    hasGameStarted = true;

    showScreen('game-screen');
    console.log("Game Start!");

    // Initialize Game Board
    if (!gameBoard) {
        gameBoard = new Board('game-board-container');
    }
    gameBoard.render();

    // Display Room ID
    const roomSpan = document.getElementById('game-room-id');
    if (roomSpan) roomSpan.textContent = currentRoomId;

    // Initialize Game Logic
    if (!gameInstance) {
        // DEBUG MODE: If no room ID (user used Debug Button directly), create fake data
        if (!currentRoomId) {
            console.warn("Debug Mode: Using Mock Data");
            currentRoomId = "debug_room";
            currentPlayerId = "p_debug_1";
            isHost = true;

            // Mock DB State for local testing (client-side only trick isn't enough for Firebase, 
            // but we can at least simulate the Game object state locally or force a write to a debug node)
        }

        gameInstance = new Game(currentRoomId, currentPlayerId, gameBoard);

        // If Host (or Debug), init the game state
        if (isHost) {
            console.log("I am Host. Attempting to initialize Game State...");
            // Ensure gameInstance and network exist before trying to fetch
            if (!gameInstance || !gameInstance.network) {
                console.error("Critical Error: gameInstance.network is undefined! Game object:", gameInstance);
                // Fallback to offline mode for debug automatically
                const mockPlayers = [currentPlayerId, 'p_debug_2'];
                gameInstance.gameState.playerOrder = mockPlayers;
                gameInstance.players = {
                    [currentPlayerId]: { name: "玩家", color: "#00f0ff", balance: 15000, position: 0 },
                    'p_debug_2': { name: "對手", color: "#ff0099", balance: 15000, position: 0 }
                };
                if (gameInstance.board) gameInstance.board.updateTokens(Object.values(gameInstance.players));
                if (gameInstance.updateUI) gameInstance.updateUI();
            } else {
                gameInstance.network.fetchPlayers().then(data => {
                    if (data) {
                        const players = Object.keys(data);
                        console.log("Found players:", players);
                        gameInstance.network.initGame(players).then(() => {
                            console.log("Game State Initialized in DB!");
                        }).catch(err => console.error("Failed to write Game State:", err));
                    } else {
                        console.error("No players found in DB!");
                        // Mock for Debug Button
                        const mockPlayers = ['p_debug_1', 'p_debug_2'];
                        gameInstance.gameState.playerOrder = mockPlayers;
                        gameInstance.players = {
                            'p_debug_1': { name: "Debug P1", color: "red", balance: 15000, position: 0 },
                            'p_debug_2': { name: "Debug P2", color: "lime", balance: 15000, position: 0 }
                        };
                        gameInstance.board.updateTokens(Object.values(gameInstance.players));
                        gameInstance.network.initGame(mockPlayers);
                        gameInstance.updateUI();
                    }
                }).catch(err => {
                    console.error("Error fetching players:", err);
                    const mockPlayers = [currentPlayerId, 'p_debug_2'];
                    gameInstance.gameState.playerOrder = mockPlayers;
                    gameInstance.players = {
                        [currentPlayerId]: { name: "玩家", color: "#00f0ff", balance: 15000, position: 0 },
                        'p_debug_2': { name: "對手", color: "#ff0099", balance: 15000, position: 0 }
                    };
                    gameInstance.network.forceOffline(); // FORCE OFFLINE TO PREVENT ROLLBACK GLITCHES
                    gameInstance.board.updateTokens(Object.values(gameInstance.players));
                    gameInstance.updateUI();
                });
            }
        } else {
            console.log("I am Client. Waiting for Host to init Game State...");
        }
    }

    // Expose for debugging
    window.game = gameInstance;

    // --- Admin Console Bindings ---
    const btnTeleport = document.getElementById('btn-admin-teleport');
    if (btnTeleport) {
        btnTeleport.addEventListener('click', () => {
            if (!gameInstance) return;
            const val = parseInt(document.getElementById('admin-teleport-val').value);
            if (!isNaN(val) && val >= 0 && val <= 39) {
                gameInstance.adminTeleport(val);
            } else {
                alert("請輸入有效的格位 ID (0-39)");
            }
        });
    }

    const btnMoney = document.getElementById('btn-admin-money');
    if (btnMoney) {
        btnMoney.addEventListener('click', () => {
            if (!gameInstance) return;
            const val = parseInt(document.getElementById('admin-money-val').value);
            if (!isNaN(val)) {
                gameInstance.adminAddMoney(val);
            }
        });
    }

    const btnDice = document.getElementById('btn-admin-dice');
    if (btnDice) {
        btnDice.addEventListener('click', () => {
            if (!gameInstance) return;
            const d1 = parseInt(document.getElementById('admin-d1-val').value);
            const d2 = parseInt(document.getElementById('admin-d2-val').value);
            if (!isNaN(d1) && !isNaN(d2) && d1 > 0 && d2 > 0) {
                gameInstance.rollDice(d1, d2);
            } else {
                alert("請輸入有效的骰子點數 (1-6)");
            }
        });
    }

    const btnNext = document.getElementById('btn-admin-next');
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (gameInstance) gameInstance.forceNextTurn();
        });
    }
    // ------------------------------

    // Bind Roll Button from Board UI
    const rollBtn = document.getElementById('roll-btn');
    if (rollBtn) {
        const newBtn = rollBtn.cloneNode(true);
        rollBtn.parentNode.replaceChild(newBtn, rollBtn);
        newBtn.addEventListener('click', () => {
            gameInstance.rollDice();
        });
    }

    // Bind Auction Button
    const auctionBtn = document.getElementById('auction-btn');
    if (auctionBtn) {
        auctionBtn.addEventListener('click', () => {
            if (gameInstance) gameInstance.openAuctionSetup();
        });
    }

    // Bind Force Start (Host only ideally, but let's expose it for safety)
    const forceBtn = document.getElementById('force-start-btn');
    if (forceBtn) {
        forceBtn.addEventListener('click', async () => {
            console.log("Force initializing...");
            if (!gameInstance || !gameInstance.network) {
                alert("遊戲尚未完全初始化，無法強制重置");
                return;
            }
            try {
                const data = await gameInstance.network.fetchPlayers();
                if (data) {
                    await gameInstance.network.initGame(Object.keys(data));
                    alert("已強制重置遊戲狀態！");
                } else {
                    alert("找不到玩家資料，無法初始化");
                }
            } catch (err) {
                console.error("Force initialize error:", err);
                alert("強制重置失敗: " + err.message);
            }
        });
    }

    // Bind Skip Turn
    const skipBtn = document.getElementById('skip-turn-btn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            console.log("Skipping turn...");
            gameInstance.forceNextTurn();
        });
    }

    // Bind Reset Room
    const resetBtn = document.getElementById('reset-room-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm("確定要刪除所有玩家與狀態並重置嗎？所有人將被踢出。")) {
                await set(ref(db, `rooms/${currentRoomId}`), null);
                alert("房間已重置，請重新整理頁面");
                window.location.reload();
            }
        });
    }
}


// Event Listeners
btnCreate.addEventListener('click', createRoom);
btnJoin.addEventListener('click', joinRoom);
btnStart.addEventListener('click', startGameRequest);

document.getElementById('btn-debug-board').addEventListener('click', () => {
    startGame();
});

console.log("Main Loaded");
