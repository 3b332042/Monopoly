import { db, ref, update, onValue, set, get, push, onChildAdded } from './firebase.js?v=47';

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
        this.logRef = ref(db, `rooms/${this.roomId}/log`);
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

    async pushLog(emoji, message, color) {
        if (this.isOfflineMode) return;
        await push(this.logRef, {
            emoji: emoji || '📢',
            message,
            color: color || '#ffffff',
            ts: Date.now()
        });
    }

    listenToLog(callback) {
        if (this.roomId === 'debug_room') return;
        // Adjust start time back slightly to catch logs that might have been sent during listener setup
        const startTime = Date.now() - 2000; 
        onChildAdded(this.logRef, (snapshot) => {
            if (this.isOfflineMode) return;
            const entry = snapshot.val();
            // Skip entries that existed before this session started
            if (!entry || entry.ts < startTime) return;
            callback(entry);
        });
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
