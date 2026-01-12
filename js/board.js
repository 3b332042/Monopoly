export const TILE_DATA = [
    { id: 0, name: "起點", type: "go", color: null, price: 0 },
    { id: 1, name: "基隆", type: "property", color: "brown", price: 600 },
    { id: 2, name: "命運", type: "chance", color: null, price: 0 },
    { id: 3, name: "桃園", type: "property", color: "brown", price: 600 },
    { id: 4, name: "所得稅", type: "tax", color: null, price: 2000 },
    { id: 5, name: "台北車站", type: "station", color: null, price: 2000 },
    { id: 6, name: "宜蘭", type: "property", color: "lightblue", price: 1000 },
    { id: 7, name: "機會", type: "chest", color: null, price: 0 },
    { id: 8, name: "花蓮", type: "property", color: "lightblue", price: 1000 },
    { id: 9, name: "台東", type: "property", color: "lightblue", price: 1200 },
    { id: 10, name: "探監/坐牢", type: "jail", color: null, price: 0 },
    { id: 11, name: "苗栗", type: "property", color: "pink", price: 1400 },
    { id: 12, name: "台電", type: "utility", color: null, price: 1500 },
    { id: 13, name: "南投", type: "property", color: "pink", price: 1400 },
    { id: 14, name: "雲林", type: "property", color: "pink", price: 1600 },
    { id: 15, name: "新竹車站", type: "station", color: null, price: 2000 },
    { id: 16, name: "嘉義", type: "property", color: "orange", price: 1800 },
    { id: 17, name: "命運", type: "chest", color: null, price: 0 },
    { id: 18, name: "台南", type: "property", color: "orange", price: 1800 },
    { id: 19, name: "屏東", type: "property", color: "orange", price: 2000 },
    { id: 20, name: "免費停車", type: "parking", color: null, price: 0 },
    { id: 21, name: "彰化", type: "property", color: "red", price: 2200 },
    { id: 22, name: "機會", type: "chance", color: null, price: 0 },
    { id: 23, name: "台中", type: "property", color: "red", price: 2200 },
    { id: 24, name: "嘉義", type: "property", color: "red", price: 2400 },
    { id: 25, name: "台中車站", type: "station", color: null, price: 2000 },
    { id: 26, name: "綠島", type: "property", color: "yellow", price: 2600 },
    { id: 27, name: "澎湖", type: "property", color: "yellow", price: 2600 },
    { id: 28, name: "自來水", type: "utility", color: null, price: 1500 },
    { id: 29, name: "金門", type: "property", color: "yellow", price: 2800 },
    { id: 30, name: "去坐牢", type: "gotojail", color: null, price: 0 },
    { id: 31, name: "高雄", type: "property", color: "green", price: 3000 },
    { id: 32, name: "高雄", type: "property", color: "green", price: 3000 },
    { id: 33, name: "命運", type: "chest", color: null, price: 0 },
    { id: 34, name: "高雄", type: "property", color: "green", price: 3200 },
    { id: 35, name: "高雄車站", type: "station", color: null, price: 2000 },
    { id: 36, name: "機會", type: "chance", color: null, price: 0 },
    { id: 37, name: "台北", type: "property", color: "blue", price: 3500 },
    { id: 38, name: "奢侈稅", type: "tax", color: null, price: 1000 },
    { id: 39, name: "信義區", type: "property", color: "blue", price: 4000 }
];

export class Board {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render() {
        this.container.innerHTML = '';
        const board = document.createElement('div');
        board.className = 'monopoly-board';

        // Add Center Board (Logo/Dice area)
        const center = document.createElement('div');
        center.className = 'board-center';
        center.innerHTML = `
            <div class="logo">MONOPOLY <br> <span style="font-size:0.5em; color:var(--accent-color)">ONLINE</span></div>
            <div class="dice-area" id="dice-container">
                 <button id="roll-btn" class="btn primary">擲骰子</button>
                 <div id="dice-result"></div>
            </div>
            <div id="game-message" class="game-msg">等待回合...</div>
        `;
        board.appendChild(center);

        // Render Tiles

        // Render Tiles
        TILE_DATA.forEach(tile => {
            const tileEl = document.createElement('div');
            tileEl.className = `tile tile-${tile.id}`;
            tileEl.dataset.id = tile.id;

            // Add grid positioning classes based on ID
            this.assignGridPosition(tileEl, tile.id);

            // Add position class for tooltip styling
            if (tile.id >= 21 && tile.id <= 30) tileEl.classList.add('row-top');
            else if (tile.id >= 0 && tile.id <= 10) tileEl.classList.add('row-bottom');
            else if (tile.id >= 11 && tile.id <= 20) tileEl.classList.add('col-left');
            else tileEl.classList.add('col-right');

            // Inner Content
            let content = '';
            if (tile.type === 'property') {
                content = `
                    <div class="color-bar" style="background-color: ${tile.color}"></div>
                    <div class="tile-name">${tile.name}</div>
                    <div class="tile-price">$${tile.price}</div>
                `;
            } else {
                content = `
                    <div class="tile-name centered">${tile.name}</div>
                `;

                // Add Tooltip for Special Tiles
                let desc = "";
                switch (tile.type) {
                    case 'go': desc = "經過獲得 $2000"; break;
                    case 'tax': desc = `繳納稅金 $${tile.price}`; break;
                    case 'station': desc = "車站: 收取過路費"; break; // Initial desc
                    case 'utility': desc = "公共事業: 擲骰決定過路費"; break; // Initial desc
                    case 'chance': desc = "機會: 隨機事件"; break;
                    case 'chest': desc = "命運: 隨機事件"; break;
                    case 'jail': desc = "探監: 純粹參觀"; break;
                    case 'gotojail': desc = "逮捕: 直送監獄"; break;
                    case 'parking': desc = "免費停車: 休息之處"; break;
                }
                if (desc) tileEl.dataset.tooltip = desc;
            }

            tileEl.innerHTML = content;
            board.appendChild(tileEl);
        });

        this.container.appendChild(board);
    }

    assignGridPosition(el, id) {
        // Standard 11x11 Grid Layout Logic
        // Row 1 (Bottom): 10..0 (Right to Left) -> Wait, usually Go is Bottom Right
        // Let's assume standard index: 0 is Go (Bottom Right), 10 is Jail (Bottom Left), 
        // 20 is Parking (Top Left), 30 is GoToJail (Top Right)

        // CSS Grid 1-based index: 1..11

        if (id >= 0 && id <= 10) { // Bottom Row (Right to Left)
            el.style.gridRow = 11;
            el.style.gridColumn = 11 - id;
        } else if (id >= 11 && id <= 20) { // Left Column (Bottom to Top)
            el.style.gridColumn = 1;
            el.style.gridRow = 11 - (id - 10);
        } else if (id >= 21 && id <= 30) { // Top Row (Left to Right)
            el.style.gridRow = 1;
            el.style.gridColumn = 1 + (id - 20);
        } else if (id >= 31 && id < 40) { // Right Column (Top to Bottom)
            el.style.gridColumn = 11;
            el.style.gridRow = 1 + (id - 30);
        }
    }

    updateTokens(players) {
        // 1. Mark all existing tokens as 'stale'
        document.querySelectorAll('.player-token').forEach(el => el.classList.add('stale-token'));

        players.forEach(p => {
            let token = document.querySelector(`.player-token[data-player-id="${p.id}"]`);

            if (!token) {
                // New Token
                token = this.createTokenElement(p);
                const tile = document.querySelector(`.tile-${p.position}`);
                if (tile) tile.appendChild(token);
                token.dataset.currentPos = p.position; // Sync initial position
            } else {
                // Existing Token -> Check for Movement
                token.classList.remove('stale-token'); // It's still active
                const currentPos = parseInt(token.dataset.currentPos);
                
                // Update basic appearances if changed (color/balance/name)
                token.title = `${p.name} ($${p.balance})`;
                token.style.backgroundColor = p.color;

                if (currentPos !== p.position) {
                    // Check if already animating to this target to avoid double-trigger
                    if (token.dataset.targetPos == p.position) return;
                    
                    this.animateMovement(token, currentPos, p.position);
                }
            }
        });

        // 2. Remove stale tokens (players who left)
        document.querySelectorAll('.stale-token').forEach(el => el.remove());
    }

    createTokenElement(p) {
        const token = document.createElement('div');
        token.className = 'player-token';
        token.dataset.playerId = p.id;
        token.style.backgroundColor = p.color;
        token.title = `${p.name} ($${p.balance})`;
        token.textContent = p.name ? p.name[0].toUpperCase() : '?';
        
        // Styles are better handled in CSS, but keeping inline for now as per original
        Object.assign(token.style, {
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '10px',
            width: '24px',   // Fixed size for consistency
            height: '24px',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
            transition: 'transform 0.2s', // Smooth micro-adjustments
            zIndex: '10'
        });

        return token;
    }

    animateMovement(token, startPos, endPos) {
        token.dataset.targetPos = endPos; // Lock target
        
        // Calculate total steps (Monopoly always moves forward)
        const totalSteps = (endPos - startPos + 40) % 40;
        if (totalSteps === 0) return;

        let currentStep = 0;
        let nextPos = startPos;

        const stepInterval = 300; // ms per tile

        const moveStep = () => {
            if (currentStep >= totalSteps) {
                token.dataset.currentPos = endPos;
                delete token.dataset.targetPos;
                // Ensure we are physically in the final parent
                const finalTile = document.querySelector(`.tile-${endPos}`);
                if (finalTile && !finalTile.contains(token)) {
                    finalTile.appendChild(token);
                }
                return;
            }

            nextPos = (nextPos + 1) % 40;
            const nextTile = document.querySelector(`.tile-${nextPos}`);
            
            if (nextTile) {
                // Play sound effect here if desired
                nextTile.appendChild(token);
                token.dataset.currentPos = nextPos;
            }

            currentStep++;
            setTimeout(moveStep, stepInterval);
        };

        moveStep(); // Start animation
    }

    updatePropertyOwnership(properties, players) {
        // Clear old ownership marks
        document.querySelectorAll('.owner-marker').forEach(el => el.remove());

        // Reset tile states (border, dataset) ONLY for properties
        // We don't want to wipe tooltips for special tiles
        document.querySelectorAll('.tile').forEach(el => {
            const id = el.dataset.id;
            const tileData = TILE_DATA.find(t => t.id == id);

            // Only clear tooltip if it's a property type (because we dynamially set owner info there)
            if (tileData && ['property', 'station', 'utility'].includes(tileData.type)) {
                el.style.borderColor = '';
                delete el.dataset.tooltip;
            }
        });

        if (!properties) return;

        Object.keys(properties).forEach(tileId => {
            const ownerId = properties[tileId];
            const owner = players.find(p => p.id === ownerId);
            const tileEl = document.querySelector(`.tile-${tileId}`);
            // Access TILE_DATA from outer scope or pass it in. 
            // Since TILE_DATA is exported from this module, we can access it directly if we are in board.js
            // However, typical class structure might separate them. Let's assume TILE_DATA is available as it was defined above in the file.
            const tileData = TILE_DATA.find(t => t.id == tileId);

            if (tileEl && owner && tileData) {
                // Calculate basic rent (10% rule)
                const rent = Math.floor(tileData.price * 0.1);

                // Set Data for Tooltip
                // We use encoded newline for CSS content: \A
                // But in HTML attribute we can just use newline, and CSS needs white-space: pre
                const tooltipText = `擁有者: ${owner.name}\n過路費: $${rent}`;
                tileEl.dataset.tooltip = tooltipText;

                // Visual Marker (Glowy Border)
                const marker = document.createElement('div');
                marker.className = 'owner-marker';
                marker.style.borderColor = owner.color;
                marker.style.boxShadow = `0 0 15px ${owner.color}, inset 0 0 10px ${owner.color}`;

                tileEl.appendChild(marker);

                // Color the tile border too
                tileEl.style.borderColor = owner.color;
            }
        });
    }
}
