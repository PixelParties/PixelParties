// ./Creatures/boulder.js - Boulder Creature Implementation
// Boulder is a defensive creature summoned by BoulderInABottle potion
// It does nothing when it acts but serves as a meat shield

export default class BoulderCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.name = 'Boulder';
    }

    // Check if a creature name is a Boulder
    static isBoulder(creatureName) {
        return creatureName === 'Boulder';
    }

    // Execute Boulder's "action" (which is doing nothing)
    async executeSpecialAttack(actorData, position) {
        const bm = this.battleManager;
        const { data: creature, hero } = actorData;
        const side = hero.side;
        
        // Boulder just sits there menacingly
        bm.addCombatLog(
            `🪨 ${creature.name} stands firm and immovable!`, 
            side === 'player' ? 'success' : 'error'
        );
        
        // Simple animation - just a gentle shake to show it's "acting"
        if (bm.animationManager) {
            const creatureIndex = hero.creatures.indexOf(creature);
            await bm.animationManager.shakeCreature(side, position, creatureIndex);
        }
        
        // Add a small delay for dramatic effect
        await bm.delay(300);
        
        console.log(`🪨 Boulder at ${side} ${position} completed its turn (did nothing)`);
    }

    // Boulder has no special death effects - it just crumbles away
    executeDeathEffect(creature, heroOwner, position, side) {
        const bm = this.battleManager;
        
        bm.addCombatLog(
            `🪨 ${creature.name} crumbles into rubble!`, 
            side === 'player' ? 'error' : 'success'
        );
        
        console.log(`🪨 Boulder death effect: ${creature.name} crumbled`);
    }

    // No cleanup needed for Boulder specifically
    cleanup() {
        // Boulder is cleaned up by the BoulderInABottlePotion cleanup method
        console.log('🪨 Boulder creature manager cleaned up');
    }

    // Get Boulder's default stats (used for reference)
    static getDefaultStats(currentTurn = 1) {
        const baseHp = 50;
        const turnBonus = 50 * Math.max(1, currentTurn);
        
        return {
            name: 'Boulder',
            hp: baseHp + turnBonus,
            atk: 0,
            type: 'creature',
            description: `A sturdy boulder that blocks damage for your heroes. HP scales with turn number.`
        };
    }

    // Boulder behavior: Always targets nothing (it doesn't attack)
    selectTarget(availableTargets) {
        return null; // Boulder never attacks
    }

    // Boulder is always considered "defensive" 
    static isDefensiveCreature() {
        return true;
    }

    // Boulder cannot be buffed by most effects due to its stone nature
    static isImmuneToBuff(buffType) {
        const immuneBuffs = ['poison', 'burn', 'freeze']; // Stone doesn't burn, freeze, or get poisoned
        return immuneBuffs.includes(buffType);
    }
}