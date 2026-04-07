/**
 * Economy utility class to unify all financial calculations.
 * Centralizing logic here prevents inconsistencies between UI and actual payment logic.
 */
export class Economy {
    /**
     * Calculate property rent based on level and color set status.
     * New multipliers (as of v46): 20%, 50%, 150%, 400%
     */
    static getPropertyRent(price, level, isColorSet = false, ownerCareer = null) {
        let multiplier = 0.2;
        if (level === 1) multiplier = 0.5;
        else if (level === 2) multiplier = 1.5;
        else if (level === 3) multiplier = 4.0;

        let rent = Math.floor(price * multiplier);
        if (isColorSet) rent *= 2;

        // Career Bonus (Landlord +40%)
        if (ownerCareer?.rentBonus) {
            rent = Math.floor(rent * (1 + ownerCareer.rentBonus));
        }

        return rent;
    }

    /**
     * Calculate utility rent based on dice total.
     * New multiplier (as of v46): $300 per point
     */
    static getUtilityRent(diceTotal, ownerCareer = null) {
        let fee = diceTotal * 300;
        
        // Landlord career bonus applies to utilities too
        if (ownerCareer?.rentBonus) {
            fee = Math.floor(fee * (1 + ownerCareer.rentBonus));
        }
        
        return fee;
    }

    /**
     * Calculate cost to upgrade a property.
     * Base costs: Lv0->1: 0.5, Lv1->2: 0.75, Lv2->3: 1.0 (of price)
     */
    static getUpgradeCost(price, currentLevel, playerCareer = null) {
        let costMultiplier = 0.5;
        if (currentLevel === 1) costMultiplier = 0.75;
        else if (currentLevel === 2) costMultiplier = 1.0;

        let cost = Math.floor(price * costMultiplier);

        // Apply Career Construction Discount (Entrepreneur/Beggar)
        if (playerCareer?.buyDiscount) {
            cost = Math.floor(cost * (1 - playerCareer.buyDiscount));
        }

        return cost;
    }

    /**
     * Calculate acquisition price for a property.
     * Formula: (land price + buildings investment) * 1.2
     */
    static getAcquisitionPrice(price, level) {
        const buildingInvestment = level * Math.floor(price * 0.5);
        return Math.floor((price + buildingInvestment) * 1.2);
    }

    /**
     * Calculate sell value for liquidation (bankruptcy prevention).
     * Formula: (land price + buildings investment) * 0.9
     */
    static getLiquidationValue(price, level) {
        const investment = price + (level * Math.floor(price * 0.5));
        return Math.floor(investment * 0.9);
    }

    /**
     * Rent multiplier strings for display in UI Modals.
     * Used by ui.js to show "rent will become X% of price".
     */
    static getRentPercentageString(level) {
        if (level === 0) return "50%";
        if (level === 1) return "150%";
        if (level === 2) return "400%";
        return "0%";
    }

    /**
     * Get a human-readable description of the rent formula for a specific tile.
     */
    static getRentDescription(tile) {
        if (tile.type === 'property') {
            return `房價的 20% ~ 400%`;
        } else if (tile.type === 'utility') {
            return `骰子點數 × 300`;
        } else if (tile.type === 'station') {
            return `$1,000 (固定)`;
        }
        return "無";
    }
}
