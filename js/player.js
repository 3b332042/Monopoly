export class Player {
    constructor(id, data) {
        this.id = id;
        this.name = data.name;
        this.color = data.color;
        this.balance = data.balance;
        this.position = data.position || 0;
        this.isJailed = data.isJailed || false;
    }

    // Advance position and return true if passed GO
    move(steps) {
        const oldPos = this.position;
        this.position = (this.position + steps) % 40;
        return this.position < oldPos && steps > 0;
    }
}
