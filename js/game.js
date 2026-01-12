import { db, ref, update, onValue, set } from './firebase.js';
import { Player } from './player.js';
import { TILE_DATA } from './board.js';

export class Game {
    constructor(roomId, myPlayerId, board) {
        this.roomId = roomId;
        this.myPlayerId = myPlayerId;
        this.board = board;
        this.players = {};
        this.gameState = {
            turnIndex: 0,
            playerOrder: [],
            lastDice: [1, 1],
            properties: {} // { tileId: playerId }
        };

        this.initListeners();
    }

    initListeners() {
        // Listen to Players Data
        const playersRef = ref(db, `rooms/${this.roomId}/players`);
        onValue(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) this.syncPlayers(data);
        });

        // Listen to Game State (Turns, etc)
        const gameRef = ref(db, `rooms/${this.roomId}/gameState`);
        onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            // console.log("Game State Update:", data); 
            if (data) {
                this.gameState = data;
                this.updateUI();
            } else {
                console.warn("No Game State found!");
            }
        });
    }

    syncPlayers(data) {
        // Update local player objects
        Object.keys(data).forEach(pid => {
            if (!this.players[pid]) {
                this.players[pid] = new Player(pid, data[pid]);
            } else {
                Object.assign(this.players[pid], data[pid]);
            }
        });

        // Update Board Visuals
        this.board.updateTokens(Object.values(this.players));

        // Update Ownership Visuals
        if (this.gameState && this.gameState.properties) {
            this.board.updatePropertyOwnership(this.gameState.properties, Object.values(this.players));
        }
    }

    async startGame(playerIds) {
        playerIds.sort();
        const initialState = {
            turnIndex: 0,
            playerOrder: playerIds,
            lastDice: [0, 0],
            properties: {}
        };
        await set(ref(db, `rooms/${this.roomId}/gameState`), initialState);
    }

    updateUI() {
        // 1. Safety Checks
        if (!this.gameState || !this.gameState.playerOrder) {
            this.setGameMessage("遊戲狀態載入中...", "yellow");
            return;
        }

        const playerOrder = this.gameState.playerOrder;
        const turnIndex = this.gameState.turnIndex;

        // 2. Validate Turn Index
        if (turnIndex >= playerOrder.length) {
            this.setGameMessage("回合錯誤 (請重置)", "red");
            return;
        }

        const currentTurnPlayerId = playerOrder[turnIndex];

        // 3. Determine My Status
        const amIInGame = playerOrder.includes(this.myPlayerId);
        const isMyTurn = amIInGame && (currentTurnPlayerId === this.myPlayerId);

        // 4. Update Message UI
        const msgEl = document.getElementById('game-message');
        const rollBtn = document.getElementById('roll-btn');
        const diceRes = document.getElementById('dice-result');

        if (isMyTurn) {
            const [d1, d2] = this.gameState.lastDice || [0, 0];
            const isDoubles = (d1 === d2) && (d1 > 0);

            if (isDoubles) {
                this.setGameMessage("🎲 雙巴!! (Doubles) <br> 請再擲一次", "#00ffff");
                rollBtn.textContent = "再擲一次";
            } else {
                this.setGameMessage("🎲 輪到你了！請擲骰子", "#00ff00");
                rollBtn.textContent = "擲骰子";
            }

            msgEl.classList.add('pulse-animation');
            rollBtn.disabled = false;
            rollBtn.style.opacity = 1;
            rollBtn.style.cursor = 'pointer';
        } else {
            const pName = this.players[currentTurnPlayerId]?.name || 'Unknown';
            const pIdShort = currentTurnPlayerId.slice(-4);

            if (amIInGame) {
                this.setGameMessage(`等待 ${pName} (${pIdShort}) 行動...`, "#ccc");
            } else {
                this.setGameMessage(`觀戰模式: ${pName} 回合`, "#cyan");
            }

            msgEl.classList.remove('pulse-animation');
            rollBtn.disabled = true;
            rollBtn.style.opacity = 0.3;
            rollBtn.style.cursor = 'not-allowed';
            rollBtn.textContent = "等待中";
        }

        // 5. Show Dice Result
        const [d1, d2] = this.gameState.lastDice || [0, 0];
        if (d1 > 0) diceRes.textContent = `前次點數: ${d1 + d2}`;

        // 6. Update Debug Overlay
        this.updateDebugOverlay(currentTurnPlayerId, isMyTurn);
    }

    setGameMessage(text, color) {
        const msgEl = document.getElementById('game-message');
        msgEl.innerHTML = text;
        msgEl.style.color = color;
    }

    updateDebugOverlay(currentTurnPlayerId, isMyTurn) {
        const debugEl = document.getElementById('debug-overlay');
        if (!debugEl) return;

        let playersHtml = '';
        this.gameState.playerOrder.forEach((pid, idx) => {
            const p = this.players[pid];
            const isTurn = idx === this.gameState.turnIndex;
            const bgStyle = isTurn ? 'background:rgba(0,255,0,0.2);' : '';
            const isMe = pid === this.myPlayerId;

            playersHtml += `
                <div style="${bgStyle} border-bottom:1px solid #444; padding:4px; font-size:11px;">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="${isTurn ? 'color:#0f0; font-weight:bold;' : 'color:#aaa'}">
                            ${isTurn ? '▶' : ''} ${p?.name || '???'} 
                            ${isMe ? '(YOU)' : ''}
                        </span>
                        <span>$${p?.balance}</span>
                    </div>
                    <div style="font-size:10px; color:#aaa; text-align:right;">Pos: ${p?.position}</div>
                </div>
            `;
        });

        debugEl.innerHTML = `
            <div style="border-bottom:1px solid red; padding-bottom:5px; margin-bottom:5px;">
                <strong>Room: ${this.roomId}</strong> <br>
                Status: ${isMyTurn ? '<span style="color:#0f0">YOUR TURN</span>' : 'WAITING'}
            </div>
            ${playersHtml}
        `;
        debugEl.style.color = 'white';
        debugEl.style.border = '1px solid var(--accent-color)';
    }

    async rollDice() {
        if (!this.gameState.playerOrder) return;
        const currentTurnPlayerId = this.gameState.playerOrder[this.gameState.turnIndex];

        if (currentTurnPlayerId !== this.myPlayerId) {
            console.warn("Not your turn!");
            return;
        }

        const rollBtn = document.getElementById('roll-btn');
        rollBtn.disabled = true;

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const steps = d1 + d2;

        const me = this.players[this.myPlayerId];
        const passedGo = me.move(steps);

        let msg = `擲出了 ${d1} + ${d2} = ${steps}!`;
        if (passedGo) {
            me.balance += 2000;
            msg += ` (經過起點 +$2000)`;
        }

        this.setGameMessage(msg, "#00ff00");

        // 1. Update Movement
        const updates = {};
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/position`] = me.position;
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = me.balance;
        updates[`rooms/${this.roomId}/gameState/lastDice`] = [d1, d2];

        await update(ref(db), updates);

        // Wait for animation to finish (300ms per step + 500ms buffer)
        const animationDelay = (steps * 300) + 500;
        await new Promise(r => setTimeout(r, animationDelay));

        // 2. Interaction
        await this.checkTileInteraction(me.position);

        // 3. Next Turn Logic
        if (d1 !== d2) {
            const nextIndex = (this.gameState.turnIndex + 1) % this.gameState.playerOrder.length;
            updates[`rooms/${this.roomId}/gameState/turnIndex`] = nextIndex;
        } else {
            console.log("Doubles! Roll Again.");
        }

        await update(ref(db), updates);
    }

    async checkTileInteraction(position) {
        const tile = TILE_DATA.find(t => t.id === position);
        if (!tile) return;

        const isProperty = ['property', 'station', 'utility'].includes(tile.type);

        if (isProperty) {
            const properties = this.gameState.properties || {};
            const ownerId = properties[tile.id];

            if (!ownerId) {
                // UNOWNED -> Ask to Buy
                await this.offerPropertyBuy(tile);
            } else if (ownerId !== this.myPlayerId) {
                // OWNED BY OTHERS -> Pay Rent
                await this.payRent(tile, ownerId);
            } else {
                // OWNED BY ME
                this.setGameMessage(`回到自己的地盤: ${tile.name}`, "#ffff00");
                await new Promise(r => setTimeout(r, 1000));
            }
        } else if (tile.type === 'tax') {
            await this.payTax(tile);
        }
    }

    offerPropertyBuy(tile) {
        return new Promise((resolve) => {
            const modal = document.getElementById('action-modal');
            const title = document.getElementById('modal-title');
            const price = document.getElementById('modal-price');
            const desc = document.getElementById('modal-description');
            const btnBuy = document.getElementById('btn-modal-action');
            const btnPass = document.getElementById('btn-modal-cancel');

            if (this.players[this.myPlayerId].balance < tile.price) {
                btnBuy.disabled = true;
                btnBuy.textContent = "錢不夠";
            } else {
                btnBuy.disabled = false;
                btnBuy.textContent = "購買";
            }

            title.textContent = tile.name;
            title.style.color = tile.color || '#fff';
            price.textContent = `$${tile.price}`;
            desc.textContent = "這塊地目前無人擁有，要購買嗎？";

            modal.classList.remove('hidden');

            const cleanup = () => {
                modal.classList.add('hidden');
                btnBuy.replaceWith(btnBuy.cloneNode(true));
                btnPass.replaceWith(btnPass.cloneNode(true));
            };

            // Handlers
            document.getElementById('btn-modal-action').onclick = async () => {
                const p = this.players[this.myPlayerId];
                p.balance -= tile.price;

                const updates = {};
                updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = p.balance;
                updates[`rooms/${this.roomId}/gameState/properties/${tile.id}`] = this.myPlayerId;

                await update(ref(db), updates);
                this.setGameMessage(`你買下了 ${tile.name}!`, "#00ff00");

                cleanup();
                resolve();
            };

            document.getElementById('btn-modal-cancel').onclick = () => {
                this.setGameMessage(`你放棄購買 ${tile.name}`, "#ccc");
                cleanup();
                resolve();
            };
        });
    }

    async payRent(tile, ownerId) {
        const rent = Math.floor(tile.price * 0.1);
        const ownerName = this.players[ownerId]?.name || "Unknown";

        this.setGameMessage(`踩到 ${ownerName} 的地，支付過路費 $${rent}`, "red");

        const me = this.players[this.myPlayerId];
        const owner = this.players[ownerId];

        me.balance -= rent;

        const updates = {};
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = me.balance;
        if (owner) {
            updates[`rooms/${this.roomId}/players/${ownerId}/balance`] = owner.balance + rent;
        }

        await update(ref(db), updates);
        await new Promise(r => setTimeout(r, 2000));
    }

    async payTax(tile) {
        const me = this.players[this.myPlayerId];
        me.balance -= tile.price;
        this.setGameMessage(`繳納稅金 $${tile.price}`, "orange");

        const updates = {};
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = me.balance;
        await update(ref(db), updates);
        await new Promise(r => setTimeout(r, 1500));
    }

    async forceNextTurn() {
        if (!this.gameState.playerOrder || this.gameState.playerOrder.length === 0) return;
        const nextIndex = (this.gameState.turnIndex + 1) % this.gameState.playerOrder.length;
        await update(ref(db, `rooms/${this.roomId}/gameState`), {
            turnIndex: nextIndex
        });
    }
}
