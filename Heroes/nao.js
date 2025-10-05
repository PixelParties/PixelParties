// ./Heroes/nao.js - Nao Hero Special Effects

export class NaoHeroEffect {
    /**
     * Check if a hero is Nao
     */
    static isNao(hero) {
        return hero && hero.name === 'Nao';
    }

    /**
     * Find eligible targets for Nao's version of Healing Melody
     * (allies with 0 shield)
     */
    static findNaoHealingMelodyTargets(caster, battleManager) {
        const allies = caster.side === 'player' 
            ? battleManager.playerHeroes 
            : battleManager.opponentHeroes;
        
        const eligibleTargets = {
            heroes: [],
            creatures: []
        };
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = allies[position];
            if (hero && hero.alive) {
                // Check if hero has no shield
                const currentShield = hero.currentShield || 0;
                if (currentShield === 0) {
                    eligibleTargets.heroes.push({ hero, position });
                }
                
                // Check creatures for no shield
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, creatureIndex) => {
                        if (creature.alive) {
                            const creatureShield = creature.currentShield || 0;
                            if (creatureShield === 0) {
                                eligibleTargets.creatures.push({ 
                                    hero, 
                                    creature, 
                                    creatureIndex, 
                                    position 
                                });
                            }
                        }
                    });
                }
            }
        });
        
        return eligibleTargets;
    }

    /**
     * Check if Nao can cast Healing Melody (at least 1 ally with no shield)
     */
    static canNaoCastHealingMelody(caster, battleManager) {
        const eligibleTargets = NaoHeroEffect.findNaoHealingMelodyTargets(caster, battleManager);
        return eligibleTargets.heroes.length >= 1 || eligibleTargets.creatures.length >= 1;
    }

    /**
     * Apply shield to a hero (Nao's version of healing)
     */
    static applyShieldToHero(heroData, shieldAmount, battleManager) {
        const { hero, position } = heroData;
        
        const oldShield = hero.currentShield || 0;
        hero.currentShield = (hero.currentShield || 0) + shieldAmount;
        const actualShield = hero.currentShield - oldShield;
        
        // Update hero health bar to show shield
        battleManager.updateHeroHealthBar(hero.side, position, hero.currentHp, hero.maxHp);
        
        return actualShield;
    }

    /**
     * Apply shield to a creature (Nao's version of healing)
     */
    static applyShieldToCreature(creatureData, shieldAmount, battleManager) {
        const { hero, creature, creatureIndex, position } = creatureData;
        
        const oldShield = creature.currentShield || 0;
        creature.currentShield = (creature.currentShield || 0) + shieldAmount;
        const actualShield = creature.currentShield - oldShield;
        
        // Update creature visuals if needed
        // Note: Most creatures don't have shield displays, but the data is stored
        
        return actualShield;
    }
}

export default NaoHeroEffect;