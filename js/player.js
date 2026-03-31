export class Player {
    constructor(id, data) {
        this.id = id;
        this.name = data.name;
        this.color = data.color;
        this.balance = Number(data.balance);
        this.position = Number(data.position || 0);
        this.isJailed = data.isJailed || false;
        this.jailTurns = Number(data.jailTurns || 0);
    }

    // Advance position and return true if passed GO
    move(steps) {
        const oldPos = this.position;
        // Handle negative steps correctly for JS modulo
        this.position = (this.position + steps + 40) % 40;

        // Pass GO logic:
        // Forward: simple wrap around detection
        // Backward: usually doesn't count as passing GO for money, but let's stick to simple logic
        // If moving forward (steps > 0) and new position is smaller than old, we passed GO.
        return this.position < oldPos && steps > 0;
    }
}
