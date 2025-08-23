// crashLanding.js - Crash Landing Fighting Spell Implementation
// Triggers when a creature attacks a hero possessing CrashLanding
// Deals 9999 damage to the attacking creature with spectacular crash animation

export class CrashLandingSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'CrashLanding';
    }

    /**
     * Check if CrashLanding should trigger when a creature attacks a hero
     * @param {Object} attackingCreature - The creature that attacked
     * @param {Object} defendingHero - The hero that was attacked
     * @returns {boolean} - True if CrashLanding should trigger
     */
    shouldTriggerCrashLanding(attackingCreature, defendingHero) {
        if (!this.battleManager.isAuthoritative) return false;
        if (!attackingCreature || !defendingHero) return false;
        if (attackingCreature.type !== 'creature') return false;
        if (!defendingHero.alive) return false;
        
        // Check if the defending hero has CrashLanding spells
        const crashLandingSpells = defendingHero.getAllSpells().filter(spell => 
            spell.name === 'CrashLanding' && spell.spellSchool === 'Fighting'
        );
        
        return crashLandingSpells.length > 0;
    }

    /**
     * Apply CrashLanding retaliation effect
     * @param {Object} attackingCreature - The creature that attacked
     * @param {Object} defendingHero - The hero with CrashLanding
     * @returns {boolean} - True if CrashLanding triggered
     */
    applyCrashLandingEffect(attackingCreature, defendingHero) {
        const crashLandingSpells = defendingHero.getAllSpells().filter(spell => 
            spell.name === 'CrashLanding' && spell.spellSchool === 'Fighting'
        );
        
        if (crashLandingSpells.length === 0) return false;
        
        let anyTriggered = false;
        let successfulTriggers = 0;
        
        console.log(`✈️ ${defendingHero.name} has ${crashLandingSpells.length} CrashLanding spells, rolling for triggers...`);
        
        // Roll for each CrashLanding spell independently (20% chance each)
        for (let i = 0; i < crashLandingSpells.length; i++) {
            const roll = this.battleManager.getRandom();
            console.log(`🎲 CrashLanding roll ${i + 1}: ${roll.toFixed(3)} vs 0.200`);
            
            if (roll < 0.20) { // 20% chance per spell
                successfulTriggers++;
                anyTriggered = true;
            }
        }
        
        if (anyTriggered) {
            this.executeCrashLanding(attackingCreature, defendingHero, crashLandingSpells.length, successfulTriggers);
        }
        
        return anyTriggered;
    }
    
    /**
     * Execute the crash landing retaliation effect
     * @param {Object} attackingCreature - The creature that attacked
     * @param {Object} defendingHero - The hero with CrashLanding
     * @param {number} totalSpells - Total number of CrashLanding spells
     * @param {number} successfulTriggers - Number of successful triggers
     */
    async executeCrashLanding(attackingCreature, defendingHero, totalSpells, successfulTriggers) {
        const spellText = totalSpells === 1 ? 'CrashLanding' : `${totalSpells} CrashLanding spells`;
        const successText = successfulTriggers === 1 ? '1 success' : `${successfulTriggers} successes`;
        
        this.battleManager.addCombatLog(
            `💥✈️ ${defendingHero.name}'s ${spellText} retaliates (${successText})! ${attackingCreature.name} is sent crashing!`,
            defendingHero.side === 'player' ? 'success' : 'error'
        );
        
        // Create crash landing animation (don't await - let it run in background)
        this.createCrashLandingAnimation(attackingCreature);
        
        // Deal 9999 damage to the attacking creature (this will kill it)
        const creatureInfo = this.findCreatureInfo(attackingCreature);
        if (creatureInfo) {
            await this.battleManager.authoritative_applyDamageToCreature({
                hero: creatureInfo.hero,
                creature: attackingCreature,
                creatureIndex: creatureInfo.creatureIndex,
                damage: 9999,
                position: creatureInfo.position,
                side: creatureInfo.side
            }, {
                source: 'crash_landing_retaliation',
                defender: defendingHero // Track who caused the retaliation
            });
        }
        
        // Send sync data to guest
        this.battleManager.sendBattleUpdate('crash_landing_triggered', {
            attackingCreatureData: this.getCreatureSyncInfo(attackingCreature),
            defendingHeroData: this.getHeroSyncInfo(defendingHero),
            totalSpells: totalSpells,
            successfulTriggers: successfulTriggers,
            timestamp: Date.now()
        });
    }
    
    /**
     * Create the spectacular crash landing animation
     * @param {Object} attackingCreature - The creature to animate
     */
    async createCrashLandingAnimation(attackingCreature) {
        const creatureInfo = this.findCreatureInfo(attackingCreature);
        if (!creatureInfo) {
            console.warn('Could not find creature info for CrashLanding animation');
            return;
        }
        
        const creatureElement = document.querySelector(
            `.${creatureInfo.side}-slot.${creatureInfo.position}-slot .creature-icon[data-creature-index="${creatureInfo.creatureIndex}"]`
        );
        
        if (!creatureElement) {
            console.warn('Could not find creature element for CrashLanding animation');
            return;
        }
        
        // Ensure CSS exists
        this.ensureCrashLandingCSS();
        
        // Create animation container
        const animationContainer = document.createElement('div');
        animationContainer.className = 'crash-landing-animation';
        
        const flyingCreature = document.createElement('div');
        flyingCreature.className = 'flying-creature';
        flyingCreature.innerHTML = '✈️'; // Airplane emoji represents the crashing creature
        
        animationContainer.appendChild(flyingCreature);
        creatureElement.appendChild(animationContainer);
        
        // Animation duration with speed adjustment
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(2500);
        
        flyingCreature.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            font-size: 28px;
            transform: translate(-50%, -50%);
            animation: crashLandingFlight ${animationDuration}ms ease-in-out forwards;
            z-index: 350;
            filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.8));
        `;
        
        // Clean up after animation
        setTimeout(() => {
            if (animationContainer && animationContainer.parentNode) {
                animationContainer.remove();
            }
        }, animationDuration);
    }
    
    /**
     * Find creature information (hero, position, index)
     * @param {Object} creature - Creature object to find
     * @returns {Object|null} - Creature info or null
     */
    findCreatureInfo(creature) {
        // Search through all heroes and their creatures
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            
            for (const position of ['left', 'center', 'right']) {
                const hero = heroes[position];
                if (!hero || !hero.creatures) continue;
                
                const creatureIndex = hero.creatures.indexOf(creature);
                if (creatureIndex !== -1) {
                    return { hero, side, position, creatureIndex };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Get creature sync information for network communication
     * @param {Object} creature - Creature object
     * @returns {Object} - Sync information
     */
    getCreatureSyncInfo(creature) {
        const creatureInfo = this.findCreatureInfo(creature);
        if (!creatureInfo) return null;
        
        return {
            type: 'creature',
            absoluteSide: creatureInfo.hero.absoluteSide,
            position: creatureInfo.position,
            creatureIndex: creatureInfo.creatureIndex,
            name: creature.name
        };
    }
    
    /**
     * Get hero sync information for network communication
     * @param {Object} hero - Hero object
     * @returns {Object} - Sync information
     */
    getHeroSyncInfo(hero) {
        return {
            type: 'hero',
            absoluteSide: hero.absoluteSide,
            position: hero.position,
            name: hero.name
        };
    }
    
    /**
     * Handle guest-side CrashLanding effect
     * @param {Object} data - Effect data from host
     */
    handleGuestCrashLandingEffect(data) {
        const { attackingCreatureData, defendingHeroData, totalSpells, successfulTriggers } = data;
        
        // Find local targets
        const localDefender = this.findTargetFromSyncInfo(defendingHeroData);
        const localAttacker = this.findTargetFromSyncInfo(attackingCreatureData);
        
        if (!localDefender || !localAttacker) {
            console.warn('Could not find local targets for CrashLanding effect');
            return;
        }
        
        const spellText = totalSpells === 1 ? 'CrashLanding' : `${totalSpells} CrashLanding spells`;
        const successText = successfulTriggers === 1 ? '1 success' : `${successfulTriggers} successes`;
        
        // Log the effect (damage will be applied via normal damage sync)
        this.battleManager.addCombatLog(
            `💥✈️ ${localDefender.name}'s ${spellText} retaliates (${successText})! ${localAttacker.name} is sent crashing!`,
            localDefender.side === 'player' ? 'success' : 'error'
        );
        
        // Create visual effect only (damage is handled by host and synced separately)
        this.createCrashLandingAnimation(localAttacker);
    }
    
    /**
     * Find target from sync information
     * @param {Object} targetInfo - Target sync info
     * @returns {Object|null} - Target object or null
     */
    findTargetFromSyncInfo(targetInfo) {
        if (!targetInfo) return null;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetInfo.type === 'hero') {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            return heroes[targetInfo.position];
        } else if (targetInfo.type === 'creature') {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[targetInfo.position];
            return hero?.creatures?.[targetInfo.creatureIndex];
        }
        
        return null;
    }

    checkAndApplyCrashLanding(attacker, defender) {
        if (!this.battleManager.isAuthoritative || !this.battleManager.spellSystem) return false;
        
        // Only trigger if a creature is attacking a hero
        if (!attacker || attacker.type !== 'creature' || !defender || defender.type === 'creature') {
            return false;
        }
        
        // Get CrashLanding spell implementation
        const crashLandingSpell = this.battleManager.spellSystem.spellImplementations.get('CrashLanding');
        if (!crashLandingSpell) return false;
        
        // Check if CrashLanding should trigger
        if (!crashLandingSpell.shouldTriggerCrashLanding(attacker, defender)) {
            return false;
        }
        
        // Apply CrashLanding effect
        const triggered = crashLandingSpell.applyCrashLandingEffect(attacker, defender);
        
        return triggered;
    }
    
    /**
     * Ensure CSS for crash landing animation exists
     */
    ensureCrashLandingCSS() {
        if (document.getElementById('crashLandingCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'crashLandingCSS';
        style.textContent = `
            @keyframes crashLandingFlight {
                0% {
                    transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    opacity: 1;
                }
                25% {
                    transform: translate(-50%, -200%) scale(1.2) rotate(90deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -250%) scale(1.3) rotate(180deg);
                    opacity: 1;
                }
                75% {
                    transform: translate(-50%, -150%) scale(1.1) rotate(270deg);
                    opacity: 0.9;
                }
                85% {
                    transform: translate(-50%, -50%) scale(1.2) rotate(340deg);
                    opacity: 0.8;
                }
                95% {
                    transform: translate(-50%, -20%) scale(1.4) rotate(360deg);
                    opacity: 0.6;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                    opacity: 0;
                }
            }
            
            .crash-landing-animation {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 350;
                will-change: transform;
            }
            
            .flying-creature {
                will-change: transform, opacity;
                text-shadow: 0 0 10px rgba(255, 100, 0, 0.8);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('crashLandingCSS');
        if (css) css.remove();
        
        // Remove any remaining effects
        const effects = document.querySelectorAll('.crash-landing-animation');
        effects.forEach(effect => effect.remove());
    }
}

export default CrashLandingSpell;