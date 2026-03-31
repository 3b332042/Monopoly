import { Player } from './player.js?v=17';
import { TILE_DATA } from './board.js?v=17';
import { CHANCE_CARDS, CHEST_CARDS } from './cards.js?v=17';
import { NetworkManager } from './network.js?v=17';
import { UIManager } from './ui.js?v=17';

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
            properties: {},
            buildings: {}
        };
        this.isProcessingTurn = false;

        this.ui = new UIManager();
        this.network = new NetworkManager(roomId);

        this.initListeners();
    }

    initListeners() {
        this.network.listenToGameState(
            (data) => this.syncPlayers(data),
            (data) => {
                this.gameState = data;
                this.updateUI();
            }
        );
        this.network.listenToAuction((data) => this.handleAuctionUpdate(data));
        this.network.listenToLog((entry) => this.showToast(entry.emoji, entry.message, entry.color));
    }

    showToast(emoji, message, color = '#ffffff') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'game-toast';
        toast.style.borderLeftColor = color;
        toast.style.boxShadow = `0 0 12px ${color}44`;
        toast.innerHTML = `<span class="toast-emoji">${emoji}</span><span class="toast-msg" style="color:${color}">${message}</span>`;

        container.appendChild(toast);
        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('toast-visible'));

        setTimeout(() => {
            toast.classList.remove('toast-visible');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
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

        // Visual Updates
        this.board.updateTokens(Object.values(this.players));
        if (this.gameState && this.gameState.properties) {
            const buildings = this.gameState.buildings || {};
            this.board.updatePropertyOwnership(this.gameState.properties, Object.values(this.players), buildings);
        }

        this.updateUI();
    }

    updateUI() {
        if (!this.gameState || !this.gameState.playerOrder) {
            this.ui.setGameMessage("遊戲狀態載入中...", "yellow");
            return;
        }

        const playerOrder = this.gameState.playerOrder;
        const turnIndex = this.gameState.turnIndex;

        if (turnIndex >= playerOrder.length) {
            this.ui.setGameMessage("回合錯誤 (請重置)", "red");
            return;
        }

        const currentTurnPlayerId = playerOrder[turnIndex];
        const amIInGame = playerOrder.includes(this.myPlayerId);
        const isMyTurn = amIInGame && (currentTurnPlayerId === this.myPlayerId);
        const pName = this.players[currentTurnPlayerId]?.name || 'Unknown';
        const pIdShort = currentTurnPlayerId.slice(-4);
        const [d1, d2] = this.gameState.lastDice || [0, 0];
        const isDoubles = (d1 === d2) && (d1 > 0);

        this.ui.updateRollButtonState(isMyTurn, this.isProcessingTurn, pName, pIdShort, amIInGame, isDoubles);
        this.ui.updateDiceResult(d1, d2);
        this.ui.updateDebugOverlay(playerOrder, this.players, currentTurnPlayerId, this.myPlayerId, isMyTurn);

        // Show/hide auction button (only on your turn, before rolling)
        const auctionBtn = document.getElementById('auction-btn');
        if (auctionBtn) {
            const myProps = Object.entries(this.gameState.properties || {})
                .filter(([, oid]) => oid === this.myPlayerId);
            auctionBtn.style.display = (isMyTurn && !this.isProcessingTurn && myProps.length > 0) ? 'block' : 'none';
        }
    }

    async rollDice(forceD1, forceD2) {
        if (!this.gameState.playerOrder) return;
        const currentTurnPlayerId = this.gameState.playerOrder[this.gameState.turnIndex];

        if (currentTurnPlayerId !== this.myPlayerId) {
            console.warn("Not your turn!");
            return;
        }

        if (this.isProcessingTurn) return; // Double check
        this.isProcessingTurn = true;
        this.updateUI(); // Disable button immediately

        const me = this.players[this.myPlayerId];
        let d1, d2, steps;

        if (me.isJailed) {
            const action = await this.ui.offerJailOptions(me.jailTurns, me.balance);
            if (action === 'pay') {
                me.balance -= 1500;
                me.isJailed = false;
                me.jailTurns = 0;
                this.ui.setGameMessage("支付保釋金 $1500 出獄！", "#00ff00");
                await this.network.pushLog('🔓', `${me.name} 支付 $1500 保釋金出獄！`, '#00ff88');
                await this.network.pushUpdate({
                    [`rooms/${this.roomId}/players/${this.myPlayerId}/balance`]: me.balance,
                    [`rooms/${this.roomId}/players/${this.myPlayerId}/isJailed`]: false,
                    [`rooms/${this.roomId}/players/${this.myPlayerId}/jailTurns`]: 0
                });
                await new Promise(r => setTimeout(r, 1000));
                // Bail payment could bankrupt the player
                await this.checkBankruptcy(this.myPlayerId, null);
                if (this.players[this.myPlayerId]?.balance < 0) return;
            } else {
                d1 = forceD1 !== undefined ? forceD1 : Math.floor(Math.random() * 6) + 1;
                d2 = forceD2 !== undefined ? forceD2 : Math.floor(Math.random() * 6) + 1;
                steps = d1 + d2;
                await this.board.rollDiceAnimation(d1, d2);

                if (d1 === d2) {
                    me.isJailed = false;
                    me.jailTurns = 0;
                    this.ui.setGameMessage(`擲出雙子 ${d1}! 成功越獄！`, "#00ff00");
                    await this.network.pushLog('🎲', `${me.name} 擲出雙子 ${d1}！成功越獄！`, '#00ff88');
                    await this.network.pushUpdate({
                        [`rooms/${this.roomId}/players/${this.myPlayerId}/isJailed`]: false,
                        [`rooms/${this.roomId}/players/${this.myPlayerId}/jailTurns`]: 0
                    });
                } else {
                    me.jailTurns = (me.jailTurns || 0) + 1;
                    if (me.jailTurns >= 3) {
                        me.balance -= 1500;
                        me.isJailed = false;
                        me.jailTurns = 0;
                        this.ui.setGameMessage(`坐牢滿 3 回合，強制支付 $1500 出獄。`, "orange");
                        await this.network.pushLog('⛓️', `${me.name} 坐牢滿 3 回合，強制支付 $1500 出獄。`, '#ff6600');
                        await this.network.pushUpdate({
                            [`rooms/${this.roomId}/players/${this.myPlayerId}/balance`]: me.balance,
                            [`rooms/${this.roomId}/players/${this.myPlayerId}/isJailed`]: false,
                            [`rooms/${this.roomId}/players/${this.myPlayerId}/jailTurns`]: 0
                        });
                        await new Promise(r => setTimeout(r, 1000));
                        await this.checkBankruptcy(this.myPlayerId, null);
                        if (this.players[this.myPlayerId]?.balance < 0) return;
                    } else {
                        // Fail and stay in jail
                        this.ui.setGameMessage(`擲出 ${d1}+${d2} 未中雙子，繼續坐牢 (${me.jailTurns}/3 回合)`, "red");
                        const nextIndex = (this.gameState.turnIndex + 1) % this.gameState.playerOrder.length;
                        await this.network.pushUpdate({
                            [`rooms/${this.roomId}/players/${this.myPlayerId}/jailTurns`]: me.jailTurns,
                            [`rooms/${this.roomId}/gameState/lastDice`]: [d1, d2],
                            [`rooms/${this.roomId}/gameState/turnIndex`]: nextIndex
                        });
                        this.isProcessingTurn = false;
                        this.updateUI();
                        return; // return early to stop moving
                    }
                }
            }
        }

        if (d1 === undefined) {
            d1 = forceD1 !== undefined ? forceD1 : Math.floor(Math.random() * 6) + 1;
            d2 = forceD2 !== undefined ? forceD2 : Math.floor(Math.random() * 6) + 1;
            steps = d1 + d2;
            await this.board.rollDiceAnimation(d1, d2);
        }
        const passedGo = me.move(steps);

        let msg = `擲出了 ${d1} + ${d2} = ${steps}!`;
        if (passedGo) {
            me.balance += 2000;
            msg += ` (經過起點 +$2000)`;
        }

        this.ui.setGameMessage(msg, "#00ff00");

        // 1. Update Movement
        const updates = {};
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/position`] = me.position;
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = me.balance;
        updates[`rooms/${this.roomId}/gameState/lastDice`] = [d1, d2];
        
        await this.network.pushUpdate(updates);
        await this.network.pushLog('🎲', `${me.name} 擲出了 ${d1} + ${d2} = ${steps}！${passedGo ? '（經過起點 +$2000）' : ''}`, '#00ff88');

        // Wait for animation
        const animationDelay = (steps * 300) + 500;
        await new Promise(r => setTimeout(r, animationDelay));

        // 2. Interaction
        await this.checkTileInteraction(me.position);

        // 3. Next Turn Logic
        const endTurnUpdates = {};
        if (d1 !== d2) {
            const nextIndex = (this.gameState.turnIndex + 1) % this.gameState.playerOrder.length;
            endTurnUpdates[`rooms/${this.roomId}/gameState/turnIndex`] = nextIndex;
        } else {
            console.log("Doubles! Roll Again.");
        }

        if (Object.keys(endTurnUpdates).length > 0) {
            await this.network.pushUpdate(endTurnUpdates);
        }

        this.isProcessingTurn = false;
        this.updateUI();
    }

    async checkTileInteraction(position) {
        const tile = TILE_DATA.find(t => t.id === position);
        if (!tile) return;

        const isProperty = tile.type === 'property';

        if (isProperty) {
            const properties = this.gameState.properties || {};
            const ownerId = properties[tile.id];

            if (!ownerId) {
                // UNOWNED -> Ask to Buy
                const me = this.players[this.myPlayerId];
                const action = await this.ui.offerPropertyBuy(tile, me.balance);
                
                if (action === 'buy') {
                    await this.buyProperty(tile);
                } else {
                    this.ui.setGameMessage(`你放棄購買 ${tile.name}`, "#ccc");
                }
            } else if (ownerId !== this.myPlayerId) {
                await this.payRent(tile, ownerId);
            } else {
                // Return to owned property -> UPGRADE logic!
                this.ui.setGameMessage(`回到自己的地盤: ${tile.name}`, "#ffff00");
                await new Promise(r => setTimeout(r, 1000));
                
                if (tile.type === 'property') { // utilities and stations don't level up
                    const buildings = this.gameState.buildings || {};
                    const currentLevel = buildings[tile.id] || 0;
                    if (currentLevel < 3) {
                        const cost = Math.floor(tile.price * 0.5);
                        const me = this.players[this.myPlayerId];
                        const wantsToUpgrade = await this.ui.offerUpgrade(tile, currentLevel, cost, me.balance);
                        if (wantsToUpgrade) {
                            me.balance -= cost;
                            const nextLevel = currentLevel + 1;
                            
                            this.ui.setGameMessage(`💸 花費 $${cost} 將 ${tile.name} 升級至 Lv.${nextLevel}！`, "#ffaa00");
                            
                            const updates = {
                                [`rooms/${this.roomId}/players/${this.myPlayerId}/balance`]: me.balance,
                                [`rooms/${this.roomId}/gameState/buildings/${tile.id}`]: nextLevel
                            };
                            await this.network.pushUpdate(updates);
                            await this.network.pushLog('🌟', `${me.name} 將 ${tile.name} 升級至 Lv.${nextLevel}！`, '#ffaa00');
                        }
                    } else {
                        this.ui.setGameMessage(`(你的 ${tile.name} 已達最高等級)`, "#ffaa00");
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }
        } else if (tile.type === 'utility') {
            const properties = this.gameState.properties || {};
            const ownerId = properties[tile.id];

            if (!ownerId) {
                const me = this.players[this.myPlayerId];
                const action = await this.ui.offerPropertyBuy(tile, me.balance);
                if (action === 'buy') {
                    await this.buyProperty(tile);
                } else {
                    this.ui.setGameMessage(`你放棄購買 ${tile.name}`, "#ccc");
                }
            } else if (ownerId !== this.myPlayerId) {
                await this.payUtilityRent(tile, ownerId);
            } else {
                this.ui.setGameMessage(`回到自己的 ${tile.name}`, "#ffff00");
                await new Promise(r => setTimeout(r, 1000));
            }
        } else if (tile.type === 'tax') {
            await this.payTax(tile);
        } else if (tile.type === 'chance') {
            await this.triggerCard('chance');
        } else if (tile.type === 'station') {
            await this.handleStation(tile);
        } else if (tile.type === 'chest') {
            await this.triggerCard('chest');
        } else if (tile.type === 'gotojail') {
            await this.goToJail();
        }
    }

    async handleStation(tile) {
        const me = this.players[this.myPlayerId];
        // Filter out GoToJail, Jail (if you don't want them flying there), and current pos
        const destinations = TILE_DATA.filter(t => t.id !== me.position && t.type !== 'gotojail' && t.type !== 'jail');
             
        const targetId = await this.ui.offerStationFlight(tile.price, destinations, me.balance);
        
        if (targetId !== null) {
            const oldPos = me.position;
            me.balance -= tile.price;
            me.position = targetId;

            // Check if passed GO (position wrapped or landed on 0)
            const goBonus = this.awardGoBonus(oldPos, targetId);
            if (goBonus > 0) {
                me.balance += goBonus;
                this.ui.setGameMessage(`花費 $${tile.price} 搭乘高鐵前往 ${TILE_DATA[targetId].name}！(經過起點 +$${goBonus})`, "#00ffff");
            } else {
                this.ui.setGameMessage(`花費 $${tile.price} 搭乘高鐵前往 ${TILE_DATA[targetId].name}`, "#00ffff");
            }
            
            this.updateUI();
            
            // Push payment and new position
            const updates = {
                [`rooms/${this.roomId}/players/${this.myPlayerId}/balance`]: me.balance,
                [`rooms/${this.roomId}/players/${this.myPlayerId}/position`]: me.position
            };
            await this.network.pushUpdate(updates);
            await this.network.pushLog('🚉', `${me.name} 搭乘高鐵前往 ${TILE_DATA[targetId].name}！支出 $${tile.price}${goBonus > 0 ? '（獲得起點獎金 $2000）' : ''}`, '#00ffff');
            
            // Wait for visual movement update
            await new Promise(r => setTimeout(r, 1000));
            
            // Interaction on new tile
            await this.checkTileInteraction(me.position);
        } else {
            this.ui.setGameMessage(`你選擇不搭車。`, "#ccc");
        }
    }

    async buyProperty(tile) {
        const p = this.players[this.myPlayerId];
        p.balance -= tile.price;
        
        if(!this.gameState.properties) this.gameState.properties = {};
        this.gameState.properties[tile.id] = this.myPlayerId;

        const updates = {};
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = p.balance;
        updates[`rooms/${this.roomId}/gameState/properties/${tile.id}`] = this.myPlayerId;

        this.ui.setGameMessage(`你買下了 ${tile.name}!`, "#00ff00");
        this.updateUI(); // Optimistic update
        await this.network.pushUpdate(updates);
        await this.network.pushLog('🏠', `${p.name} 買下了 ${tile.name}！`, '#00ff88');
    }

    async triggerCard(type) {
        try {
            const isChance = type === 'chance';
            const deck = isChance ? CHANCE_CARDS : CHEST_CARDS;
            if (!deck || deck.length === 0) return;

            const card = deck[Math.floor(Math.random() * deck.length)];
            await this.ui.drawCard(card, isChance);
            await this.applyCardEffect(card, type);
        } catch (e) {
            console.error("Error drawing card:", e);
        }
    }

    async applyCardEffect(card, type) {
        const me = this.players[this.myPlayerId];
        if (!me) return;

        let msg = "";

        switch (card.type) {
            case 'money':
                me.balance += card.value;
                msg = card.value > 0 ? `獲得獎金 $${card.value}` : `支付 $${Math.abs(card.value)}`;
                break;
            case 'move': {
                const oldPos = me.position;
                me.move(card.value);
                const goBonus = this.awardGoBonus(oldPos, me.position);
                if (goBonus > 0) me.balance += goBonus;
                msg = `移動 ${Math.abs(card.value)} 格${goBonus > 0 ? ` (經過起點 +$${goBonus})` : ''}`;
                break;
            }
            case 'moveto': {
                const oldPos2 = me.position;
                me.position = card.value;
                const goBonus2 = this.awardGoBonus(oldPos2, card.value);
                if (goBonus2 > 0) me.balance += goBonus2;
                msg = `移動到指定地點${goBonus2 > 0 ? ` (經過起點 +$${goBonus2})` : ''}`;
                break;
            }
            case 'jail':
                me.position = 10;
                me.isJailed = true;
                me.jailTurns = 0;
                msg = "被送進監獄！";
                break;
            case 'collect':
                me.balance += card.value;
                msg = `從大家那裡獲得 $${card.value} (暫緩)`;
                break;
        }

        this.ui.setGameMessage(msg, "#00ff00");
        this.updateUI();

        const updates = {};
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = Number(me.balance);
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/position`] = Number(me.position);
        await this.network.pushUpdate(updates);
        
        // GLOBAL LOG for Card Effect
        const cardEmoji = type === 'chance' ? '❓' : '🎁';
        const cardColor = type === 'chance' ? '#ef5350' : '#ab47bc';
        await this.network.pushLog(cardEmoji, `${me.name} 抽到了${type === 'chance' ? '機會' : '命運'}卡：${card.text.replace(/<br>/g, ' ')}`, cardColor);

        if (['move', 'moveto'].includes(card.type)) {
            await new Promise(r => setTimeout(r, 1000));
            // Trigger the tile we landed on
            await this.checkTileInteraction(me.position);
        } else if (card.type === 'jail') {
            // Already handled by goToJail-like logic, no extra interaction needed
        }
    }

    hasColorSet(color, ownerId) {
        if (!color) return false;
        const colorTiles = TILE_DATA.filter(t => t.color === color);
        const properties = this.gameState.properties || {};
        return colorTiles.every(t => properties[t.id] === ownerId);
    }

    async payRent(tile, ownerId) {
        const buildings = this.gameState.buildings || {};
        const level = buildings[tile.id] || 0;
        
        let multiplier = 0.1;
        if (level === 1) multiplier = 0.3;
        else if (level === 2) multiplier = 0.6;
        else if (level === 3) multiplier = 1.0;
        
        let rent = Math.floor(tile.price * multiplier);
        
        // Color Set Bonus
        const isColorSetComplete = this.hasColorSet(tile.color, ownerId);
        if (isColorSetComplete) rent *= 2;

        const ownerName = this.players[ownerId]?.name || "Unknown";
        
        let msg = `踩到 ${ownerName} 的地，支付過路費 $${rent} (Lv.${level})`;
        if (isColorSetComplete && level === 0) msg += " ✨同色加成";
        
        this.ui.setGameMessage(msg, "red");

        const me = this.players[this.myPlayerId];
        // Only modify our own balance locally. Owner's balance update is handled
        // by Firebase sync on the owner's client to prevent double-counting.
        me.balance -= rent;

        this.updateUI();

        const updates = {};
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = me.balance;
        // Push the owner's new balance from their current Firebase value + rent
        // We read it from local state but it's authoritative since only one client pays at a time.
        const owner = this.players[ownerId];
        if (owner) {
            owner.balance += rent; // local optimistic for owner's display on this client
            updates[`rooms/${this.roomId}/players/${ownerId}/balance`] = owner.balance;
        }

        await this.network.pushUpdate(updates);
        await this.network.pushLog('💸', `${me.name} 向 ${this.players[ownerId]?.name || '?'} 支付過路費 $${rent}（${tile.name} Lv.${level}）`, '#ff4444');
        await new Promise(r => setTimeout(r, 2000));

        // Check bankruptcy AFTER we've pushed the payment
        await this.checkBankruptcy(this.myPlayerId, ownerId);

        // Only offer acquisition if player didn't go bankrupt
        const me2 = this.players[this.myPlayerId];
        if (me2 && me2.balance >= 0 && tile.type === 'property') {
            await this.offerAcquisition(tile, ownerId, level);
        }
    }

    async payUtilityRent(tile, ownerId) {
        // Fee = 100 × total dice roll
        const [d1, d2] = this.gameState.lastDice || [1, 1];
        const diceTotal = d1 + d2;
        const fee = diceTotal * 100;

        const ownerName = this.players[ownerId]?.name || 'Unknown';
        this.ui.setGameMessage(`踩到 ${ownerName} 的 ${tile.name}，骨子點數 ${diceTotal} × $100 = $${fee}`, "orange");

        const me = this.players[this.myPlayerId];
        const owner = this.players[ownerId];

        me.balance -= fee;
        if (owner) owner.balance += fee;

        this.updateUI();

        const updates = {};
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = me.balance;
        if (owner) updates[`rooms/${this.roomId}/players/${ownerId}/balance`] = owner.balance;

        await this.network.pushUpdate(updates);
        await this.network.pushLog('⚡', `${me.name} 向 ${this.players[ownerId]?.name || '?'} 支付公共事業費 $${fee}（骰子 ${diceTotal} × $100）`, '#ff6600');
        await new Promise(r => setTimeout(r, 2000));

        await this.checkBankruptcy(this.myPlayerId, ownerId);
    }

    async offerAcquisition(tile, ownerId, level) {
        const me = this.players[this.myPlayerId];
        const owner = this.players[ownerId];
        const ownerName = owner?.name || 'Unknown';

        // Acquisition price = (land + building investment) × 1.2
        const buildingInvestment = level * Math.floor(tile.price * 0.5);
        const acquisitionPrice = Math.floor((tile.price + buildingInvestment) * 1.2);

        const wantsToAcquire = await this.ui.offerAcquisition(tile, level, acquisitionPrice, ownerName, me.balance);

        if (wantsToAcquire) {
            me.balance -= acquisitionPrice;
            if (owner) owner.balance += acquisitionPrice;

            const updates = {
                [`rooms/${this.roomId}/players/${this.myPlayerId}/balance`]: me.balance,
                [`rooms/${this.roomId}/gameState/properties/${tile.id}`]: this.myPlayerId,
                [`rooms/${this.roomId}/gameState/buildings/${tile.id}`]: 0  // reset to bare land
            };
            if (owner) {
                updates[`rooms/${this.roomId}/players/${ownerId}/balance`] = owner.balance;
            }

            await this.network.pushUpdate(updates);
            await this.network.pushLog('🏢', `${me.name} 強制收購 ${tile.name} 自 ${ownerName}！支付 $${acquisitionPrice}`, '#ff9900');

            this.ui.setGameMessage(`🏢 成功收購 ${tile.name}！ (支付 $${acquisitionPrice} 給 ${ownerName})`, '#ff9900');
            this.updateUI();
        }
    }

    async payTax(tile) {
        const me = this.players[this.myPlayerId];
        me.balance -= tile.price;
        this.ui.setGameMessage(`繳納稅金 $${tile.price}`, "orange");
        this.updateUI();

        const updates = {};
        updates[`rooms/${this.roomId}/players/${this.myPlayerId}/balance`] = me.balance;
        
        await this.network.pushUpdate(updates);
        await this.network.pushLog('🏦', `${me.name} 繳納稅金 $${tile.price}（${tile.name}）`, '#ffcc00');
        await new Promise(r => setTimeout(r, 1500));

        // Check bankruptcy for taxes (creditor = bank / null)
        await this.checkBankruptcy(this.myPlayerId, null);
    }

    async forceNextTurn() {
        if (!this.gameState.playerOrder || this.gameState.playerOrder.length === 0) return;
        const nextIndex = (this.gameState.turnIndex + 1) % this.gameState.playerOrder.length;
        
        this.gameState.turnIndex = nextIndex;
        this.isProcessingTurn = false;
        this.updateUI();

        await this.network.pushUpdate({
            [`rooms/${this.roomId}/gameState/turnIndex`]: nextIndex
        });
    }

    async adminTeleport(targetId) {
        const me = this.players[this.myPlayerId];
        const oldPos = me.position;
        me.position = targetId;
        
        const goBonus = this.awardGoBonus(oldPos, targetId);
        if (goBonus > 0) {
            me.balance += goBonus;
            this.ui.setGameMessage(`(Admin) 傳送至 ${targetId} 號格 (經過起點 +$${goBonus})`, "cyan");
        }
        
        this.updateUI();
        await this.network.pushUpdate({
            [`rooms/${this.roomId}/players/${this.myPlayerId}/position`]: me.position,
            [`rooms/${this.roomId}/players/${this.myPlayerId}/balance`]: me.balance
        });
        await this.network.pushLog('🛠️', `管理員將 ${me.name} 傳送至 ${targetId} 號格 ${goBonus > 0 ? '（獲得起點獎金 $2000）' : ''}`, '#00ccff');
        await new Promise(r => setTimeout(r, 1000));
        await this.checkTileInteraction(me.position);
    }

    awardGoBonus(oldPos, newPos) {
        // Award $2000 if player passes or lands exactly on GO (position 0)
        // Passing GO means: newPos < oldPos (wrapped around), or newPos === 0
        // But NOT if it's a direct teleport to jail
        if (newPos === 10) return 0; // Sent to jail never gives bonus
        if (newPos === oldPos) return 0; // No movement
        if (newPos === 0) return 2000; // Landed on GO
        if (newPos < oldPos) return 2000; // Passed GO (wrap)
        return 0;
    }

    async adminAddMoney(amount) {
        const me = this.players[this.myPlayerId];
        me.balance += amount;
        this.updateUI();
        await this.network.pushUpdate({
            [`rooms/${this.roomId}/players/${this.myPlayerId}/balance`]: me.balance
        });
        this.ui.setGameMessage(`(Debug) 資金變更 $${amount}`, "cyan");
        await this.network.pushLog('🛠️', `管理員調整 ${me.name} 的資金：${amount > 0 ? '+' : ''}${amount}`, '#00ff00');
    }

    async goToJail() {
        const me = this.players[this.myPlayerId];
        // Move to jail tile
        me.position = 10;
        me.isJailed = true;
        me.jailTurns = 0;
        
        this.ui.setGameMessage("🚨 遣送入獄！", "red");
        this.updateUI();
        await this.network.pushLog('🚨', `${me.name} 被送進監獄！`, '#ff0044');
        await this.network.pushUpdate({
            [`rooms/${this.roomId}/players/${this.myPlayerId}/position`]: 10,
            [`rooms/${this.roomId}/players/${this.myPlayerId}/isJailed`]: true,
            [`rooms/${this.roomId}/players/${this.myPlayerId}/jailTurns`]: 0
        });

        await new Promise(r => setTimeout(r, 1500));
    }

    async checkBankruptcy(playerId, creditorId) {
        const player = this.players[playerId];
        if (!player || player.balance >= 0) return;
        const playerName = player?.name || playerId;
        const creditorName = creditorId ? (this.players[creditorId]?.name || creditorId) : '銀行';
        await this.network.pushLog('💀', `${playerName} 宣告破產！資產全數移交給 ${creditorName}。`, '#ff0000');
        await this.declareBankruptcy(playerId, creditorId);
    }

    async declareBankruptcy(playerId, creditorId) {
        const player = this.players[playerId];
        const creditor = creditorId ? this.players[creditorId] : null;
        const playerName = player?.name || playerId;
        const creditorName = creditor?.name || null;

        // Show announcement
        await this.ui.showBankruptcy(playerName, creditorName);

        const updates = {};

        // Transfer all properties to creditor, or return to bank
        const properties = this.gameState.properties || {};

        Object.keys(properties).forEach(tileId => {
            if (properties[tileId] === playerId) {
                if (creditorId) {
                    updates[`rooms/${this.roomId}/gameState/properties/${tileId}`] = creditorId;
                } else {
                    // Return to bank
                    updates[`rooms/${this.roomId}/gameState/properties/${tileId}`] = null;
                    updates[`rooms/${this.roomId}/gameState/buildings/${tileId}`] = null;
                }
            }
        });

        // Remove bankrupt player from turn order
        const playerOrder = this.gameState.playerOrder || [];
        const newOrder = playerOrder.filter(id => id !== playerId);
        let newTurnIndex = this.gameState.turnIndex;
        const bankruptIdx = playerOrder.indexOf(playerId);
        if (bankruptIdx < newTurnIndex && newTurnIndex > 0) {
            newTurnIndex--;
        }
        if (newOrder.length > 0) newTurnIndex = newTurnIndex % newOrder.length;
        else newTurnIndex = 0;

        updates[`rooms/${this.roomId}/gameState/playerOrder`] = newOrder;
        updates[`rooms/${this.roomId}/gameState/turnIndex`] = newTurnIndex;
        updates[`rooms/${this.roomId}/players/${playerId}/balance`] = 0;
        updates[`rooms/${this.roomId}/players/${playerId}/isBankrupt`] = true;

        await this.network.pushUpdate(updates);

        this.isProcessingTurn = false;
        this.updateUI();

        // Check for game over
        if (newOrder.length <= 1) {
            const winnerId = newOrder[0];
            const winnerName = this.players[winnerId]?.name || '贏家';
            await new Promise(r => setTimeout(r, 1000));
            this.ui.setGameMessage(`🏆 ${winnerName} 獲得最終勝利！`, "gold");
        }
    }

    // ==========================
    // AUCTION SYSTEM
    // ==========================

    openAuctionSetup() {
        const modal = document.getElementById('auction-setup-modal');
        const select = document.getElementById('auction-tile-select');
        const startPriceInput = document.getElementById('auction-start-price');
        const btnStart = document.getElementById('btn-auction-start');
        const btnCancel = document.getElementById('btn-auction-setup-cancel');
        if (!modal) return;

        // Populate with player's properties
        const properties = this.gameState.properties || {};
        const myTileIds = Object.entries(properties)
            .filter(([, oid]) => oid === this.myPlayerId)
            .map(([tid]) => parseInt(tid));

        select.innerHTML = '';
        myTileIds.forEach(tileId => {
            const tile = TILE_DATA.find(t => t.id === tileId);
            if (!tile) return;
            const level = (this.gameState.buildings || {})[tileId] || 0;
            const opt = document.createElement('option');
            opt.value = tileId;
            opt.textContent = `${tile.name} (Lv.${level}) - 定價 $${tile.price}`;
            select.appendChild(opt);
        });

        startPriceInput.value = '';
        modal.classList.remove('hidden');

        const cleanupAndClose = () => {
            modal.classList.add('hidden');
            btnStart.onclick = null;
            btnCancel.onclick = null;
        };

        btnCancel.onclick = cleanupAndClose;

        btnStart.onclick = async () => {
            const tileId = parseInt(select.value);
            const startPrice = parseInt(startPriceInput.value);
            const me = this.players[this.myPlayerId];

            if (!tileId || isNaN(startPrice) || startPrice <= 0) {
                alert('請輸入有效的起拍價格！');
                return;
            }
            if (me.balance < 700) {
                alert('餘額不足以支付 $700 押金！');
                return;
            }

            cleanupAndClose();
            await this.startAuction(tileId, startPrice);
        };
    }

    async startAuction(tileId, startPrice) {
        const me = this.players[this.myPlayerId];
        me.balance -= 700;

        const endTime = Date.now() + 30000; // 30s

        const auctionData = {
            tileId,
            sellerId: this.myPlayerId,
            startingPrice: startPrice,
            currentBid: 0,
            currentBidderId: null,
            endTime
        };

        await this.network.pushUpdate({
            [`rooms/${this.roomId}/players/${this.myPlayerId}/balance`]: me.balance
        });
        await this.network.pushAuction(auctionData);
        // Reset auction-closed guard for next auction
        this._auctionClosed = false;
        this._latestAuctionData = null;

        const tileName = TILE_DATA.find(t => t.id === tileId)?.name || '未知地產';
        await this.network.pushLog('🔨', `${me.name} 發起了 ${tileName} 的公開競拍！起拍價 $${startPrice}`, '#aa00ff');

        this.ui.setGameMessage(`🔨 發起競拍！押金 $700 已扣除。起拍價 $${startPrice}`, '#aa00ff');
        this.updateUI();
    }

    handleAuctionUpdate(auctionData) {
        const biddingModal = document.getElementById('auction-bidding-modal');
        if (!biddingModal) return;

        // Always track the latest auction state for closeAuction to read
        this._latestAuctionData = auctionData;

        // No auction active
        if (!auctionData) {
            biddingModal.classList.add('hidden');
            if (this._auctionTimerInterval) {
                clearInterval(this._auctionTimerInterval);
                this._auctionTimerInterval = null;
            }
            return;
        }

        const tile = TILE_DATA.find(t => t.id === auctionData.tileId);
        const seller = this.players[auctionData.sellerId];
        const currentBidder = auctionData.currentBidderId ? this.players[auctionData.currentBidderId] : null;

        document.getElementById('auction-bid-tile-name').textContent = `🏠 ${tile?.name || '未知地產'}`;
        document.getElementById('auction-bid-seller').textContent = `拍賣方：${seller?.name || '?'}　起拍價：$${auctionData.startingPrice}`;
        document.getElementById('auction-current-bid').textContent = auctionData.currentBid > 0 ? `$${auctionData.currentBid}` : `(最低 $${auctionData.startingPrice})`;
        document.getElementById('auction-current-bidder').textContent = currentBidder ? `最高出價者：${currentBidder.name}` : '尚無人出價';

        const isSeller = auctionData.sellerId === this.myPlayerId;
        const bidControls = document.getElementById('auction-bid-controls');
        const sellerView = document.getElementById('auction-seller-view');

        if (isSeller) {
            bidControls.classList.add('hidden');
            sellerView.classList.remove('hidden');
        } else {
            bidControls.classList.remove('hidden');
            sellerView.classList.add('hidden');

            const btnBid = document.getElementById('btn-place-bid');
            btnBid.onclick = async () => {
                const amount = parseInt(document.getElementById('auction-bid-input').value);
                const minBid = Math.max(auctionData.startingPrice, (auctionData.currentBid || 0) + 1);
                const me = this.players[this.myPlayerId];

                if (!amount || amount < minBid) {
                    alert(`出價需高於 $${minBid}`);
                    return;
                }
                if (amount > me.balance) {
                    alert(`餘額不足！你只有 $${me.balance}`);
                    return;
                }
                await this.network.pushUpdate({
                    [`rooms/${this.roomId}/auction/currentBid`]: amount,
                    [`rooms/${this.roomId}/auction/currentBidderId`]: this.myPlayerId
                });
                document.getElementById('auction-bid-input').value = '';
            };
        }

        biddingModal.classList.remove('hidden');

        // Capture the endTime for this interval
        const endTime = auctionData.endTime;

        // Start/update countdown timer — only start once
        if (!this._auctionTimerInterval) {
            this._auctionTimerInterval = setInterval(async () => {
                const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
                const timerEl = document.getElementById('auction-timer');
                if (timerEl) timerEl.textContent = remaining;

                if (remaining <= 0) {
                    clearInterval(this._auctionTimerInterval);
                    this._auctionTimerInterval = null;

                    // Only seller closes the auction, and only once
                    if (isSeller && !this._auctionClosed) {
                        this._auctionClosed = true;
                        // Read the LATEST auction data from our local game state mirror
                        // (Firebase listener would have kept auctionData stale in closure)
                        const latestAuction = this._latestAuctionData;
                        if (latestAuction) await this.closeAuction(latestAuction);
                    }
                }
            }, 1000);
        }
    }

    async closeAuction(auctionData) {
        const biddingModal = document.getElementById('auction-bidding-modal');
        if (biddingModal) biddingModal.classList.add('hidden');

        const tile = TILE_DATA.find(t => t.id === auctionData.tileId);
        const hasBid = auctionData.currentBid >= auctionData.startingPrice && auctionData.currentBidderId;

        const updates = {};

        if (hasBid) {
            const winner = this.players[auctionData.currentBidderId];
            const seller = this.players[auctionData.sellerId];
            const amount = auctionData.currentBid;

            if (winner) winner.balance -= amount;
            if (seller) seller.balance += amount;

            updates[`rooms/${this.roomId}/gameState/properties/${auctionData.tileId}`] = auctionData.currentBidderId;
            updates[`rooms/${this.roomId}/gameState/buildings/${auctionData.tileId}`] = 0;
            if (winner) updates[`rooms/${this.roomId}/players/${auctionData.currentBidderId}/balance`] = winner.balance;
            if (seller) updates[`rooms/${this.roomId}/players/${auctionData.sellerId}/balance`] = seller.balance;

            updates[`rooms/${this.roomId}/auction`] = null;
            await this.network.pushUpdate(updates);

            const winnerName = winner?.name || '?';
            const sellerName = seller?.name || '?';
            await this.network.pushLog('🎉', `競拍成交！${winnerName} 以 $${amount} 得標 ${tile?.name}！${sellerName} 獲得 $${amount}。`, '#aa00ff');
            this.showAuctionResult(`🎉 ${winnerName} 以 $${amount} 得標！\n${sellerName} 獲得 $${amount}。`, true);
        } else {
            // No valid bids — deposit already deducted, property stays
            updates[`rooms/${this.roomId}/auction`] = null;
            await this.network.pushUpdate(updates);
            await this.network.pushLog('💔', `流拍！無人出價 ${tile?.name}，押金 $700 不退回。`, '#ff4444');
            this.showAuctionResult(`流拍！無人出價，押金 $700 不退回。\n${tile?.name} 保留在賣方手中。`, false);
        }

        this.updateUI();
    }

    showAuctionResult(message, success) {
        const modal = document.getElementById('auction-result-modal');
        const titleEl = document.getElementById('auction-result-title');
        const descEl = document.getElementById('auction-result-desc');
        const btn = document.getElementById('btn-auction-result-ok');
        if (!modal) return;

        titleEl.textContent = success ? '🎉 競拍成交！' : '😔 流拍';
        titleEl.style.color = success ? '#00ff88' : '#ff4444';
        descEl.textContent = message;
        modal.classList.remove('hidden');

        btn.onclick = () => { modal.classList.add('hidden'); };
    }
}
