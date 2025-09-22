// ./Heroes/ghuanjun.js - Ghuanjun Hero Manager
// Ghuanjun gains bonus attacks when Fighting spells trigger on his attacks

export class GhuanjunHeroManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.heroName = 'Ghuanjun';
        
        // Track Fighting spells used this round (per hero instance)
        this.usedFightingSpells = new Map(); // heroId -> Set of spell names
        
        console.log('⚔️ Ghuanjun Hero Manager initialized');
    }

    // Static method to check if a hero is Ghuanjun
    static isGhuanjun(heroName) {
        return heroName === 'Ghuanjun';
    }

    // Execute Ghuanjun's special action when he acts (called from battle flow)
    async executeHeroAction(ghuanjunActor, position) {
        // Ghuanjun doesn't have pre-attack special effects like Alice
        // His ability triggers after his attacks via the Fighting spell system
        return;
    }

    // Called when a Fighting spell triggers for any hero
    // This is the main hook into the spell system
    async checkGhuanjunFightingSpellBonus(attacker, target, damage, triggeredSpells) {
        if (!this.battleManager.isAuthoritative) return;
        
        // Only process if the attacker is Ghuanjun
        if (!attacker || attacker.name !== 'Ghuanjun' || !attacker.alive) {
            return;
        }

        // NEW: Only grant bonus attacks if the target survived the attack
        if (!target || !target.alive) {
            console.log(`⚔️ ${attacker.name}'s target was defeated - no bonus attack granted`);
            return;
        }

        // Filter to only Fighting spells that triggered
        const fightingSpells = triggeredSpells.filter(spell => spell.spellSchool === 'Fighting');
        if (fightingSpells.length === 0) return;

        // Get or initialize the used spells set for this Ghuanjun
        const heroId = this.getHeroId(attacker);
        if (!this.usedFightingSpells.has(heroId)) {
            this.usedFightingSpells.set(heroId, new Set());
        }
        const usedSpells = this.usedFightingSpells.get(heroId);

        // Find spells that haven't been used yet this round
        const unusedSpells = fightingSpells.filter(spell => !usedSpells.has(spell.name));
        
        if (unusedSpells.length === 0) {
            console.log(`⚔️ All Fighting spells already used by ${attacker.name} this round`);
            return;
        }

        // Grant one bonus attack and mark one spell as used
        let chosenSpell;
        if (unusedSpells.length === 1) {
            chosenSpell = unusedSpells[0];
        } else {
            // Random selection if multiple unused spells triggered
            chosenSpell = this.battleManager.getRandomChoice(unusedSpells);
        }

        // Mark the chosen spell as used
        usedSpells.add(chosenSpell.name);

        console.log(`⚔️ ${attacker.name}'s ${chosenSpell.name} grants a bonus attack!`);

        // Log the bonus attack
        this.battleManager.addCombatLog(
            `⚔️ ${attacker.name}'s Fighting prowess grants a bonus attack!`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Send network update
        this.sendBonusAttackUpdate(attacker, chosenSpell.name, unusedSpells.map(s => s.name));

        // Grant the additional attack (attack-only, no spellcasting)
        await this.grantBonusAttack(attacker, attacker.position);
    }

    // Grant a bonus attack to Ghuanjun
    async grantBonusAttack(ghuanjun, position) {
        if (!this.battleManager.combatManager) return;

        console.log(`⚔️ Executing bonus attack for ${ghuanjun.name}`);

        // Add a brief delay before the bonus attack for better visual feedback
        await this.battleManager.delay(250);

        // Use the existing additional action system, but ensure it's attack-only and non-lethal
        // We'll temporarily mark the hero to skip spellcasting and make attacks non-lethal
        const originalSpellSkip = ghuanjun._skipSpellcastingThisAction;
        const originalNonLethal = ghuanjun._nonLethalAttack;
        
        ghuanjun._skipSpellcastingThisAction = true;
        ghuanjun._nonLethalAttack = true; // Mark as non-lethal

        try {
            await this.battleManager.combatManager.executeAdditionalAction(ghuanjun, position);
        } finally {
            // Restore the original state
            ghuanjun._skipSpellcastingThisAction = originalSpellSkip;
            ghuanjun._nonLethalAttack = originalNonLethal;
        }
    }

    // Reset used spells at the start of each round
    resetForNewRound() {
        console.log(`⚔️ Resetting Ghuanjun Fighting spell usage for new round`);
        this.usedFightingSpells.clear();
        
        // Send reset update to guest
        if (this.battleManager.isAuthoritative) {
            this.battleManager.sendBattleUpdate('ghuanjun_round_reset', {
                timestamp: Date.now()
            });
        }
    }

    // Generate a unique ID for a hero instance
    getHeroId(hero) {
        return `${hero.absoluteSide}_${hero.position}`;
    }

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    // Send bonus attack update to guest
    sendBonusAttackUpdate(ghuanjun, chosenSpell, allTriggeredSpells) {
        this.battleManager.sendBattleUpdate('ghuanjun_bonus_attack', {
            heroAbsoluteSide: ghuanjun.absoluteSide,
            heroPosition: ghuanjun.position,
            heroName: ghuanjun.name,
            chosenSpell: chosenSpell,
            allTriggeredSpells: allTriggeredSpells,
            timestamp: Date.now()
        });
    }

    // Handle guest receiving bonus attack notification
    handleGuestBonusAttack(data) {
        if (this.battleManager.isAuthoritative) return;

        const { heroAbsoluteSide, heroPosition, heroName, chosenSpell, allTriggeredSpells } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Update the used spells tracking on guest side
        const heroId = `${heroAbsoluteSide}_${heroPosition}`;
        if (!this.usedFightingSpells.has(heroId)) {
            this.usedFightingSpells.set(heroId, new Set());
        }
        this.usedFightingSpells.get(heroId).add(chosenSpell);

        // Add to combat log
        const logType = heroLocalSide === 'player' ? 'success' : 'error';
        this.battleManager.addCombatLog(
            `⚔️ ${heroName}'s Fighting prowess grants a bonus attack!`,
            logType
        );

        console.log(`⚔️ Guest: ${heroName} gets bonus attack from ${chosenSpell}`);
    }

    // Handle guest receiving round reset
    handleGuestRoundReset(data) {
        if (this.battleManager.isAuthoritative) return;
        
        console.log(`⚔️ Guest: Resetting Ghuanjun Fighting spell usage for new round`);
        this.usedFightingSpells.clear();
    }

    // ============================================
    // STATE EXPORT/IMPORT FOR PERSISTENCE
    // ============================================

    exportState() {
        const spellsMap = {};
        for (const [heroId, spellSet] of this.usedFightingSpells.entries()) {
            spellsMap[heroId] = Array.from(spellSet);
        }
        return {
            usedFightingSpells: spellsMap
        };
    }

    importState(state) {
        if (!state) return;
        
        this.usedFightingSpells.clear();
        if (state.usedFightingSpells) {
            for (const [heroId, spellArray] of Object.entries(state.usedFightingSpells)) {
                this.usedFightingSpells.set(heroId, new Set(spellArray));
            }
        }
    }

    // ============================================
    // CLEANUP
    // ============================================

    cleanup() {
        console.log('⚔️ Ghuanjun Hero Manager cleaned up');
        this.usedFightingSpells.clear();
    }
}

// Static helper methods
export const GhuanjunHelpers = {
    // Check if any hero in a formation is Ghuanjun
    hasGhuanjunInFormation(formation) {
        return Object.values(formation).some(hero => hero && GhuanjunHeroManager.isGhuanjun(hero.name));
    },

    // Get Ghuanjun from formation if present
    getGhuanjunFromFormation(formation) {
        for (const position in formation) {
            const hero = formation[position];
            if (hero && GhuanjunHeroManager.isGhuanjun(hero.name)) {
                return { hero, position };
            }
        }
        return null;
    }
};

export default GhuanjunHeroManager;