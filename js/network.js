import { db, ref, update, onValue, set, get } from './firebase.js?v=16';

export class NetworkManager {
    constructor(roomId) {
        this.roomId = roomId;
        this.isOfflineMode = false;
        if (roomId === 'debug_room') {
            this.isOfflineMode = true;
            console.warn("Offline Mode Enabled (Debug): All Firebase syncs bypassed.");
        }
        this.playersRef = ref(db, `rooms/${this.roomId}/players`);
        this.gameRef = ref(db, `rooms/${this.roomId}/gameState`);
        this.auctionRef = ref(db, `rooms/${this.roomId}/auction`);
    }

    forceOffline() { this.isOfflineMode = true; }

    async fetchPlayers() {
        const snap = await get(this.playersRef);
        return snap.exists() ? snap.val() : null;
    }

    async initGame(playerIds) {
        playerIds.sort();
        const initialState = {
            turnIndex: 0,
            playerOrder: playerIds,
            lastDice: [0, 0],
            properties: {}
        };
        await set(this.gameRef, initialState);
    }

    listenToGameState(onPlayersUpdate, onGameUpdate) {
        if (this.roomId === 'debug_room') return;

        onValue(this.playersRef, (snapshot) => {
            if (this.isOfflineMode) return;
            const data = snapshot.val();
            if (data) onPlayersUpdate(data);
        });

        onValue(this.gameRef, (snapshot) => {
            if (this.isOfflineMode) return;
            const data = snapshot.val();
            if (data) onGameUpdate(data);
        });
    }

    listenToAuction(callback) {
        if (this.roomId === 'debug_room') return;
        onValue(this.auctionRef, (snapshot) => {
            if (this.isOfflineMode) return;
            callback(snapshot.val());
        });
    }

    async pushAuction(auctionData) {
        if (this.isOfflineMode) return;
        await set(this.auctionRef, auctionData);
    }

    async clearAuction() {
        if (this.isOfflineMode) return;
        await set(this.auctionRef, null);
    }

    async pushUpdate(updates) {
        if (this.isOfflineMode) return;
        try {
            await update(ref(db), updates);
        } catch (e) {
            console.error("Firebase update failed, continuing in local mode:", e);
            this.isOfflineMode = true;
        }
    }
}
