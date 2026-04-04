import { PROFESSIONS } from './professions.js';

export class UIManager {
    constructor() {
        this.msgEl = document.getElementById('game-message');
        this.rollBtn = document.getElementById('roll-btn');
        this.diceRes = document.getElementById('dice-result');
        this.debugOverlay = document.getElementById('debug-overlay');
        
        // Modals
        this.actionModal = document.getElementById('action-modal');
        this.cardModal = document.getElementById('card-modal');
        this.careerModal = document.getElementById('career-modal');
        this.careerList = document.getElementById('career-list');
    }

    showCareerSelection() {
        return new Promise((resolve) => {
            if (!this.careerModal || !this.careerList) {
                console.error("Career modal not found");
                resolve(Object.keys(PROFESSIONS)[0]);
                return;
            }

            this.careerList.innerHTML = '';
            Object.values(PROFESSIONS).forEach(career => {
                const card = document.createElement('div');
                card.className = 'career-card';
                card.style.setProperty('--card-color', career.color);
                card.style.setProperty('--card-glow', `${career.color}44`);
                
                card.innerHTML = `
                    <div class="career-icon">${career.icon}</div>
                    <div class="career-name" style="color: ${career.color}">${career.name}</div>
                    <div class="career-desc">${career.description}</div>
                `;

                card.onclick = () => {
                    this.careerModal.classList.add('hidden');
                    resolve(career.id);
                };

                this.careerList.appendChild(card);
            });

            this.careerModal.classList.remove('hidden');
        });
    }

    setGameMessage(text, color) {
        if (!this.msgEl) return;
        this.msgEl.innerHTML = text;
        this.msgEl.style.color = color;
    }

    updateRollButtonState(isMyTurn, isProcessing, pName, pIdShort, amIInGame, isDoubles) {
        if (!this.rollBtn || !this.msgEl) return;

        if (isMyTurn && !isProcessing) {
            if (isDoubles) {
                this.setGameMessage("🎲 雙巴!! (Doubles) <br> 請再擲一次", "#00ffff");
                this.rollBtn.textContent = "再擲一次";
            } else {
                this.setGameMessage("🎲 輪到你了！請擲骰子", "#00ff00");
                this.rollBtn.textContent = "擲骰子";
            }

            this.msgEl.classList.add('pulse-animation');
            this.rollBtn.disabled = false;
            this.rollBtn.style.opacity = 1;
            this.rollBtn.style.cursor = 'pointer';
        } else {
            if (amIInGame) {
                this.setGameMessage(`等待 ${pName} (${pIdShort}) 行動...`, "#ccc");
            } else {
                this.setGameMessage(`觀戰模式: ${pName} 回合`, "cyan");
            }

            this.msgEl.classList.remove('pulse-animation');
            this.rollBtn.disabled = true;
            this.rollBtn.style.opacity = 0.3;
            this.rollBtn.style.cursor = 'not-allowed';
            this.rollBtn.textContent = "等待中";
        }
    }

    updateDiceResult(d1, d2) {
        if (!this.diceRes) return;
        if (d1 > 0) {
            this.diceRes.textContent = `前次點數: ${d1 + d2}`;
        }
    }

    updateDebugOverlay(playerOrder, players, currentTurnPlayerId, myPlayerId, isMyTurn) {
        if (!this.debugOverlay) return;

        let playersHtml = "";
        
        (playerOrder || []).forEach((pid, idx) => {
            const p = players[pid];
            const isTurn = pid === currentTurnPlayerId;
            const isMe = pid === myPlayerId;
            
            const name = p?.name || `Player ${idx + 1}`;
            const balance = p?.balance ?? 0;
            const color = p?.color || '#00f0ff';
            
            // Career Info
            const careerId = p?.career;
            const career = careerId ? PROFESSIONS[careerId] : null;
            const careerHtml = career ? `
                <div style="font-size: 12px; color: ${career.color}; margin-top: 4px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                    <span>${career.icon}</span> <span>${career.name}</span>
                </div>
            ` : '<div style="font-size: 11px; color: #555; margin-top: 4px;">尚未選擇職業</div>';
            
            playersHtml += `
            <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.5); border-left: 4px solid ${color}; border-radius: 6px; transition: transform 0.2s; ${isTurn ? `transform: scale(1.05); box-shadow: 0 0 10px ${color};` : ''}">
                <div style="font-size: 14px; color: #ccc;">
                    ${isTurn ? '▶' : ''} ${name} ${isMe ? '(You)' : ''}
                </div>
                <div style="font-size: 28px; font-weight: bold; color: ${color}; text-shadow: 0 0 10px ${color};">
                    $${balance}
                </div>
                ${careerHtml}
                <div style="font-size: 11px; color: #888; margin-top: 4px;">Position: ${p?.position ?? 0}</div>
            </div>`;
        });

        this.debugOverlay.innerHTML = `
            <div style="font-size: 14px; border-bottom: 2px solid #444; padding-bottom: 8px; margin-bottom: 10px;">
                <span style="color: #aaa;">Status:</span> 
                <span style="color:${isMyTurn ? '#0f0' : '#888'}; font-weight: bold;">
                    ${isMyTurn ? 'YOUR TURN' : 'WAITING...'}
                </span>
            </div>
            ${playersHtml}
        `;
    }

    offerPropertyBuy(tile, playerBalance) {
        return new Promise((resolve) => {
            const title = document.getElementById('modal-title');
            const price = document.getElementById('modal-price');
            const desc = document.getElementById('modal-description');
            let btnBuy = document.getElementById('btn-modal-action');
            let btnPass = document.getElementById('btn-modal-cancel');

            if (playerBalance < tile.price) {
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

            this.actionModal.classList.remove('hidden');

            const cleanup = () => {
                this.actionModal.classList.add('hidden');
                // Remove listeners by completely replacing nodes
                btnBuy.replaceWith(btnBuy.cloneNode(true));
                btnPass.replaceWith(btnPass.cloneNode(true));
            };

            // Fetch newly cloned buttons for handlers
            btnBuy = document.getElementById('btn-modal-action');
            btnPass = document.getElementById('btn-modal-cancel');

            btnBuy.onclick = () => {
                cleanup();
                resolve('buy');
            };

            btnPass.onclick = () => {
                cleanup();
                resolve('pass');
            };
        });
    }

    async drawCard(card, isChance) {
        const display = this.cardModal.querySelector('.card-display');
        const front = this.cardModal.querySelector('.card-front');
        const title = document.getElementById('card-type-title');
        const desc = document.getElementById('card-desc');
        let btnOk = document.getElementById('btn-card-ok');

        // Reset State
        display.classList.remove('flipped');
        this.cardModal.classList.remove('hidden');

        // Style Logic
        if (isChance) {
            front.classList.remove('chest-style');
            title.textContent = "機會";
            title.style.color = "#d32f2f";
        } else {
            front.classList.add('chest-style');
            title.textContent = "命運";
            title.style.color = "#7b1fa2";
        }

        desc.innerHTML = card.text;

        // Animate Flip
        await new Promise(r => setTimeout(r, 100)); // Render delay
        await new Promise(r => setTimeout(r, 600)); // Wait before flip
        display.classList.add('flipped');

        // Wait for User confirmation
        return new Promise(resolve => {
            btnOk.replaceWith(btnOk.cloneNode(true));
            btnOk = document.getElementById('btn-card-ok');
            btnOk.onclick = () => {
                this.cardModal.classList.add('hidden');
                resolve();
            };
        });
    }

    offerStationFlight(ticketPrice, destinations, playerBalance) {
        return new Promise((resolve) => {
            const modal = document.getElementById('station-modal');
            const title = document.getElementById('station-title');
            const priceEl = document.getElementById('station-price');
            const selectEl = document.getElementById('station-dest-select');
            let btnBuy = document.getElementById('btn-station-buy');
            let btnCancel = document.getElementById('btn-station-cancel');

            if (!modal) {
                console.error("Station modal not found");
                resolve(null);
                return;
            }

            title.textContent = "高鐵車站";
            priceEl.textContent = `$${ticketPrice}`;

            if (playerBalance < ticketPrice) {
                btnBuy.disabled = true;
                btnBuy.textContent = "餘額不足";
            } else {
                btnBuy.disabled = false;
                btnBuy.textContent = "搭車";
            }

            // Populate select options
            selectEl.innerHTML = '';
            destinations.forEach(dest => {
                const opt = document.createElement('option');
                opt.value = dest.id;
                let prefix = "";
                if (dest.type === 'property') prefix = "🏦 ";
                else if (dest.type === 'station') prefix = "🚉 ";
                else if (dest.type === 'tax') prefix = "💸 ";
                else if (dest.type === 'chance' || dest.type === 'chest') prefix = "❓ ";
                opt.textContent = `${prefix}${dest.name} (格位 ${dest.id})`;
                selectEl.appendChild(opt);
            });

            modal.classList.remove('hidden');

            const cleanup = () => {
                modal.classList.add('hidden');
                btnBuy.replaceWith(btnBuy.cloneNode(true));
                btnCancel.replaceWith(btnCancel.cloneNode(true));
            };

            btnBuy = document.getElementById('btn-station-buy');
            btnCancel = document.getElementById('btn-station-cancel');

            btnBuy.onclick = () => {
                const targetId = parseInt(document.getElementById('station-dest-select').value);
                cleanup();
                resolve(targetId);
            };

            btnCancel.onclick = () => {
                cleanup();
                resolve(null);
            };
        });
    }

    offerJailOptions(jailTurns, playerBalance) {
        return new Promise((resolve) => {
            const modal = document.getElementById('jail-modal');
            const descEl = document.getElementById('jail-status-desc');
            let btnPay = document.getElementById('btn-jail-pay');
            let btnRoll = document.getElementById('btn-jail-roll');

            if (!modal) {
                console.error("Jail modal not found");
                resolve('roll'); // Default fallback
                return;
            }

            descEl.textContent = `你已經被關了 ${jailTurns} 回合。`;

            // Enforce $1500 penalty logic
            const jailFine = 1500;
            if (playerBalance < jailFine) {
                btnPay.disabled = true;
                btnPay.textContent = "保釋金不足 ($1500)";
            } else {
                btnPay.disabled = false;
                btnPay.textContent = "付保釋金 $1500出獄";
            }

            modal.classList.remove('hidden');

            const cleanup = () => {
                modal.classList.add('hidden');
                btnPay.replaceWith(btnPay.cloneNode(true));
                btnRoll.replaceWith(btnRoll.cloneNode(true));
            };

            btnPay = document.getElementById('btn-jail-pay');
            btnRoll = document.getElementById('btn-jail-roll');

            btnPay.onclick = () => {
                cleanup();
                resolve('pay');
            };

            btnRoll.onclick = () => {
                cleanup();
                resolve('roll');
            };
        });
    }

    offerUpgrade(tile, currentLevel, cost, playerBalance) {
        return new Promise((resolve) => {
            const modal = document.getElementById('upgrade-modal');
            const titleEl = document.getElementById('upgrade-title');
            const descEl = document.getElementById('upgrade-desc');
            let btnYes = document.getElementById('btn-upgrade-yes');
            let btnNo = document.getElementById('btn-upgrade-no');

            if (!modal) {
                console.error("Upgrade modal not found");
                resolve(false);
                return;
            }

            titleEl.textContent = `🌟 升級 ${tile.name} (Lv.${currentLevel} ➔ Lv.${currentLevel+1})`;
            
            let percentage = "0%";
            if (currentLevel === 0) percentage = "30%";
            else if (currentLevel === 1) percentage = "60%";
            else if (currentLevel === 2) percentage = "100%";

            descEl.textContent = `要花費 $${cost} 將此地升級為 Lv.${currentLevel+1} 嗎？\n升級後過路費將提升至房價的 ${percentage}！`;

            if (playerBalance < cost) {
                btnYes.disabled = true;
                btnYes.textContent = `資金不足 ($${cost})`;
            } else {
                btnYes.disabled = false;
                btnYes.textContent = `💸 花費 $${cost} 升級`;
            }

            modal.classList.remove('hidden');

            const cleanup = () => {
                modal.classList.add('hidden');
                btnYes.replaceWith(btnYes.cloneNode(true));
                btnNo.replaceWith(btnNo.cloneNode(true));
            };

            btnYes = document.getElementById('btn-upgrade-yes');
            btnNo = document.getElementById('btn-upgrade-no');

            btnYes.onclick = () => {
                cleanup();
                resolve(true);
            };

            btnNo.onclick = () => {
                cleanup();
                resolve(false);
            };
        });
    }

    showBankruptcy(playerName, creditorName) {
        return new Promise((resolve) => {
            const modal = document.getElementById('bankruptcy-modal');
            const titleEl = document.getElementById('bankrupt-title');
            const descEl = document.getElementById('bankrupt-desc');
            let btn = document.getElementById('btn-bankrupt-ok');

            titleEl.textContent = `💀 ${playerName} 破產了！`;
            if (creditorName) {
                descEl.textContent = `所有財產已轉讓給 ${creditorName}`;
            } else {
                descEl.textContent = `繳不出稅金，所有財產已充公。`;
            }

            modal.classList.remove('hidden');

            btn.onclick = () => {
                modal.classList.add('hidden');
                resolve();
            };
        });
    }

    offerAcquisition(tile, level, acquisitionPrice, ownerName, playerBalance) {
        return new Promise((resolve) => {
            const modal = document.getElementById('acquire-modal');
            const titleEl = document.getElementById('acquire-title');
            const descEl = document.getElementById('acquire-desc');
            const priceDescEl = document.getElementById('acquire-price-desc');
            let btnYes = document.getElementById('btn-acquire-yes');
            let btnNo = document.getElementById('btn-acquire-no');

            if (!modal) { resolve(false); return; }

            titleEl.textContent = `🏢 收購 ${tile.name}`;
            descEl.textContent = `要從 ${ownerName} 手中強制收購 "${tile.name}" (Lv.${level}) 嗎？`;
            priceDescEl.textContent = `土地 $${tile.price} + 建築投資 $${Math.floor(tile.price * 0.5 * level)} = 共 $${Math.floor((tile.price + tile.price * 0.5 * level))} × 1.2 = 收購金 $${acquisitionPrice}`;

            if (playerBalance < acquisitionPrice) {
                btnYes.disabled = true;
                btnYes.textContent = `資金不足 ($${acquisitionPrice})`;
            } else {
                btnYes.disabled = false;
                btnYes.textContent = `💰 支付 $${acquisitionPrice} 收購`;
            }

            modal.classList.remove('hidden');

            const cleanup = () => {
                modal.classList.add('hidden');
                btnYes.replaceWith(btnYes.cloneNode(true));
                btnNo.replaceWith(btnNo.cloneNode(true));
            };

            btnYes = document.getElementById('btn-acquire-yes');
            btnNo = document.getElementById('btn-acquire-no');

            btnYes.onclick = () => { cleanup(); resolve(true); };
            btnNo.onclick = () => { cleanup(); resolve(false); };
        });
    }

    showVictory(winnerName, onRestart) {
        const modal = document.getElementById('victory-modal');
        const nameEl = document.getElementById('victory-winner-name');
        const btn = document.getElementById('btn-victory-restart');
        if (!modal) return;

        if (nameEl) nameEl.textContent = winnerName;
        modal.classList.remove('hidden');

        btn.onclick = () => {
            modal.classList.add('hidden');
            if (onRestart) onRestart();
        };
    }
}
