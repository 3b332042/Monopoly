import { TILE_DATA } from './board.js?v=47';

/**
 * AdminManager handles developer/debug tools.
 * Moving these out of Game class to keep core logic clean.
 */
export class AdminManager {
    constructor(game) {
        this.game = game;
    }

    async teleport(targetId) {
        const targetPos = Number(targetId);
        const me = this.game.players[this.game.myPlayerId];
        const oldPos = Number(me.position);
        me.position = targetPos; 
        const goBonus = this.game.awardGoBonus(this.game.myPlayerId, oldPos, targetPos);
        if (goBonus > 0) {
            me.balance += goBonus;
            this.game.ui.setGameMessage(`(Admin) 傳送至 ${targetPos} 號格 (經過起點 +$${goBonus})`, "cyan");
        }

        this.game.updateUI();
        await this.game.network.pushUpdate({
            [`rooms/${this.game.roomId}/players/${this.game.myPlayerId}/position`]: me.position,
            [`rooms/${this.game.roomId}/players/${this.game.myPlayerId}/balance`]: me.balance
        });
        
        await this.game.network.pushLog('🛠️', `管理員將 ${me.name} 傳送至 ${targetPos} 號格 ${goBonus > 0 ? '（獲得起點獎金 $2000）' : ''}`, '#00ccff');
        await new Promise(r => setTimeout(r, 1000));
        await this.game.checkTileInteraction(me.position);
    }

    async addMoney(amount) {
        const me = this.game.players[this.game.myPlayerId];
        me.balance += amount;
        this.game.updateUI();
        await this.game.network.pushUpdate({
            [`rooms/${this.game.roomId}/players/${this.game.myPlayerId}/balance`]: me.balance
        });
        this.game.ui.setGameMessage(`(Debug) 資金變更 $${amount}`, "cyan");
        await this.game.network.pushLog('🛠️', `管理員調整 ${me.name} 的資金：${amount > 0 ? '+' : ''}${amount}`, '#00ff00');
    }

    async selfBankrupt() {
        const me = this.game.players[this.game.myPlayerId];
        me.balance = -1;
        this.game.updateUI();
        await this.game.network.pushUpdate({
            [`rooms/${this.game.roomId}/players/${this.game.myPlayerId}/balance`]: -1
        });
        this.game.ui.setGameMessage("(Admin) 自殺式破產測試中...", "red");
        await this.game.checkBankruptcy(this.game.myPlayerId, null);
    }

    async acquireAll() {
        const properties = this.game.gameState.properties || {};
        const updates = {};
        TILE_DATA.forEach(tile => {
            if ((tile.type === 'property' || tile.type === 'utility' || tile.type === 'station') && !properties[tile.id]) {
                updates[`rooms/${this.game.roomId}/gameState/properties/${tile.id}`] = this.game.myPlayerId;
            }
        });
        if (Object.keys(updates).length > 0) {
            await this.game.network.pushUpdate(updates);
            this.game.ui.setGameMessage("(Admin) 已獲得所有無主地產", "cyan");
            await this.game.network.pushLog('🛠️', `${this.game.players[this.game.myPlayerId]?.name} 執行了【資產大亨】（獲得所有無主地產）`, '#ffaa00');
        }
    }

    async resetProperties() {
        const updates = {
            [`rooms/${this.game.roomId}/gameState/properties`]: null,
            [`rooms/${this.game.roomId}/gameState/buildings`]: null
        };
        await this.game.network.pushUpdate(updates);
        this.game.ui.setGameMessage("(Admin) 已清空所有地產權屬", "cyan");
        await this.game.network.pushLog('🛠️', `管理員執行了【清空地盤】，所有地產歸還銀行。`, '#cccccc');
    }

    async triggerCard(card, type) {
        if (!card) return;
        this.game.ui.setGameMessage(`(Admin) 強制觸發：${card.text.replace(/<br>/g, ' ')}`, "cyan");
        
        // Show the standard card UI first
        this.game.ui.showCard(card, type);
        
        // Wait a bit before applying the actual effect
        await new Promise(r => setTimeout(r, 1000));
        
        // Apply the effect
        await this.game.applyCardEffect(card, type);
    }
}
