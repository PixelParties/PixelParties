// furiousAnger.js - Furious Anger Fighting Spell Implementation
// Triggers when any creature on the same team is defeated (even if revived)
// Grants heroes a chance for immediate extra actions

export class FuriousAngerEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.effectName = 'FuriousAnger';
    }

    /**
     * Check for Furious Anger reactions when a creature is defeated
     * @param {Object} defeatedCreature - The creature that was defeated
     * @param {string} defeatedCreatureSide - Side of the defeated creature ('player' or 'opponent')
     * @param {Object} defeatedCreatureHero - The hero who owned the defeated creature
     */
    async checkFuriousAngerReactions(defeatedCreature, defeatedCreatureSide, defeatedCreatureHero) {
        if (!this.battleManager.isAuthoritative) return;

        console.log(`🔥 Checking Furious Anger reactions for ${defeatedCreature.name} defeat on ${defeatedCreatureSide} side`);

        // Find all heroes on the same side as the defeated creature
        const alliedHeroes = defeatedCreatureSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;

        const heroesForFreeActions = [];

        // Check each allied hero for FuriousAnger spells
        ['left', 'center', 'right'].forEach(position => {
            const hero = alliedHeroes[position];
            if (hero && hero.alive) {
                const furiousAngerCount = this.countFuriousAngerSpells(hero);
                if (furiousAngerCount > 0) {
                    console.log(`😡 ${hero.name} has ${furiousAngerCount} FuriousAnger spells, rolling for triggers...`);
                    
                    // Roll for each FuriousAnger spell independently
                    let heroGotFreeAction = false;
                    let successfulRolls = 0;
                    
                    for (let i = 0; i < furiousAngerCount; i++) {
                        const roll = this.battleManager.getRandom();
                        console.log(`🎲 FuriousAnger roll ${i + 1}: ${roll.toFixed(3)} vs 0.200`);
                        
                        if (roll < 0.20) { // 20% chance
                            successfulRolls++;
                            if (!heroGotFreeAction) {
                                heroGotFreeAction = true; // Only 1 free action max per hero
                            }
                        }
                    }
                    
                    if (heroGotFreeAction) {
                        heroesForFreeActions.push({
                            hero: hero,
                            spellCount: furiousAngerCount,
                            successCount: successfulRolls
                        });
                        
                        const spellText = furiousAngerCount === 1 ? 'FuriousAnger' : `${furiousAngerCount} FuriousAnger spells`;
                        const successText = successfulRolls === 1 ? '1 success' : `${successfulRolls} successes`;
                        
                        this.battleManager.addCombatLog(
                            `😡💢 ${hero.name}'s ${spellText} triggers (${successText})! Granted extra action!`,
                            hero.side === 'player' ? 'success' : 'error'
                        );
                    }
                }
            }
        });

        // Execute free actions for heroes that triggered (one at a time)
        for (const heroData of heroesForFreeActions) {
            await this.executeFuriousAngerAction(heroData.hero, heroData.spellCount, heroData.successCount);
            
            // Small delay between multiple hero actions for clarity
            if (heroesForFreeActions.length > 1) {
                await this.battleManager.delay(300);
            }
        }
    }

    /**
     * Count FuriousAnger spells in hero's spellbook
     * @param {Object} hero - The hero to check
     * @returns {number} - Number of FuriousAnger spells
     */
    countFuriousAngerSpells(hero) {
        if (!hero.spellbook || !Array.isArray(hero.spellbook)) {
            return 0;
        }

        return hero.spellbook.filter(spell => 
            spell && (spell.name === 'FuriousAnger' || spell.cardName === 'FuriousAnger')
        ).length;
    }

    /**
     * Execute a free action for a hero with Furious Anger
     * @param {Object} hero - The hero taking the free action
     * @param {number} spellCount - Number of FuriousAnger spells the hero has
     * @param {number} successCount - Number of successful triggers
     */
    async executeFuriousAngerAction(hero, spellCount, successCount) {
        console.log(`⚡ Executing Furious Anger free action for ${hero.name}`);

        // Create visual effect showing anger symbols during the action
        this.createFuriousAngerVisualEffect(hero, successCount);

        // Check if hero can take action (not stunned/frozen)
        let canAct = true;
        if (this.battleManager.statusEffectsManager && 
            !this.battleManager.statusEffectsManager.canTakeAction(hero)) {
            const stunned = this.battleManager.statusEffectsManager.hasStatusEffect(hero, 'stunned');
            const frozen = this.battleManager.statusEffectsManager.hasStatusEffect(hero, 'frozen');
            
            if (stunned || frozen) {
                const condition = stunned ? 'stunned' : 'frozen';
                this.battleManager.addCombatLog(
                    `😡❄️ ${hero.name} is ${condition} and cannot take free action!`,
                    hero.side === 'player' ? 'error' : 'success'
                );
                canAct = false;
            }
        }

        if (canAct) {
            // Create an actor object for this hero
            const heroActor = {
                type: 'hero',
                name: hero.name,
                data: hero,
                hero: hero
            };

            this.battleManager.addCombatLog(
                `⚡ ${hero.name} takes a free action from Furious Anger!`,
                hero.side === 'player' ? 'success' : 'error'
            );

            // Execute the hero action (this will handle attack/spell casting automatically)
            // Note: We pass null for opponent actor since this is a solo free action
            await this.battleManager.executeHeroActions(heroActor, null, hero.position);
        }

        // Send sync data to guest
        this.battleManager.sendBattleUpdate('furious_anger_action', {
            heroAbsoluteSide: hero.absoluteSide,
            heroPosition: hero.position,
            heroName: hero.name,
            spellCount: spellCount,
            successCount: successCount,
            canAct: canAct,
            timestamp: Date.now()
        });
    }

    /**
     * Create visual effect showing anger symbols around the hero
     * @param {Object} hero - The hero displaying anger
     * @param {number} successCount - Number of successful triggers (affects intensity)
     */
    createFuriousAngerVisualEffect(hero, successCount) {
        const heroElement = this.battleManager.getHeroElement(hero.side, hero.position);
        if (!heroElement) {
            console.warn('Could not find hero element for Furious Anger effect');
            return;
        }

        // Ensure CSS exists
        this.ensureFuriousAngerCSS();

        // Create anger effect container
        const angerContainer = document.createElement('div');
        angerContainer.className = 'furious-anger-effect';

        // Create multiple anger symbols based on success count
        const angerSymbols = ['😡', '💢', '🔥', '⚡', '💥'];
        const symbolCount = Math.min(3 + successCount, 8); // 3-8 symbols based on success count
        
        for (let i = 0; i < symbolCount; i++) {
            const symbol = document.createElement('div');
            symbol.className = 'anger-symbol';
            symbol.innerHTML = angerSymbols[i % angerSymbols.length];

            // Position symbols around hero in a circle
            const angle = (i / symbolCount) * 360 + Math.random() * 30;
            const radius = 35 + Math.random() * 15;
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;

            const animationDelay = (i * 150) + 'ms';
            const animationDuration = this.battleManager.getSpeedAdjustedDelay(2000 + Math.random() * 500) + 'ms';

            symbol.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                font-size: ${16 + Math.random() * 6}px;
                transform: translate(-50%, -50%) translate(${x}px, ${y}px);
                animation: furiousAngerFloat ${animationDuration} ease-out ${animationDelay} forwards;
                pointer-events: none;
                z-index: 350;
                text-shadow: 0 0 8px rgba(255, 0, 0, 0.8);
            `;

            angerContainer.appendChild(symbol);
        }

        // Create pulsing red aura around hero
        const aura = document.createElement('div');
        aura.className = 'furious-anger-aura';
        aura.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border: 3px solid rgba(255, 0, 0, 0.6);
            border-radius: 50%;
            animation: furiousAngerPulse ${this.battleManager.getSpeedAdjustedDelay(1500)}ms ease-in-out infinite;
            pointer-events: none;
            z-index: 340;
        `;
        angerContainer.appendChild(aura);

        angerContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 340;
        `;

        heroElement.appendChild(angerContainer);

        // Clean up after action completes
        const cleanupDelay = this.battleManager.getSpeedAdjustedDelay(3000);
        setTimeout(() => {
            if (angerContainer && angerContainer.parentNode) {
                angerContainer.remove();
            }
        }, cleanupDelay);
    }

    /**
     * Ensure CSS for Furious Anger effects exists
     */
    ensureFuriousAngerCSS() {
        if (document.getElementById('furiousAngerCSS')) return;

        const style = document.createElement('style');
        style.id = 'furiousAngerCSS';
        style.textContent = `
            @keyframes furiousAngerFloat {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) translate(var(--x, 0), var(--y, 0)) scale(0) rotate(0deg);
                }
                15% {
                    opacity: 1;
                    transform: translate(-50%, -50%) translate(var(--x, 0), var(--y, 0)) scale(1.4) rotate(60deg);
                }
                85% {
                    opacity: 0.9;
                    transform: translate(-50%, -50%) translate(var(--x, 0), var(--y, 0)) scale(1.1) rotate(300deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) translate(var(--x, 0), var(--y, 0)) scale(0.3) rotate(360deg);
                }
            }

            @keyframes furiousAngerPulse {
                0% {
                    opacity: 0.3;
                    transform: scale(1);
                    border-color: rgba(255, 0, 0, 0.6);
                }
                50% {
                    opacity: 0.8;
                    transform: scale(1.1);
                    border-color: rgba(255, 100, 100, 0.9);
                }
                100% {
                    opacity: 0.3;
                    transform: scale(1);
                    border-color: rgba(255, 0, 0, 0.6);
                }
            }

            .furious-anger-effect {
                will-change: transform, opacity;
            }

            .anger-symbol {
                will-change: transform, opacity;
                filter: drop-shadow(0 0 6px rgba(255, 0, 0, 0.8));
                font-weight: bold;
            }

            .furious-anger-aura {
                will-change: transform, opacity;
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.5);
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Handle guest receiving Furious Anger action
     * @param {Object} data - Action data from host
     */
    handleGuestFuriousAngerAction(data) {
        const { heroAbsoluteSide, heroPosition, heroName, spellCount, successCount, canAct } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the hero
        const heroes = heroLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[heroPosition];
        
        if (hero) {
            const spellText = spellCount === 1 ? 'FuriousAnger' : `${spellCount} FuriousAnger spells`;
            const successText = successCount === 1 ? '1 success' : `${successCount} successes`;
            
            // Add to combat log
            this.battleManager.addCombatLog(
                `😡💢 ${heroName}'s ${spellText} triggers (${successText})! Granted extra action!`,
                heroLocalSide === 'player' ? 'success' : 'error'
            );

            if (canAct) {
                this.battleManager.addCombatLog(
                    `⚡ ${heroName} takes a free action from Furious Anger!`,
                    heroLocalSide === 'player' ? 'success' : 'error'
                );
            } else {
                this.battleManager.addCombatLog(
                    `😡❄️ ${heroName} cannot take free action (stunned/frozen)!`,
                    heroLocalSide === 'player' ? 'error' : 'success'
                );
            }

            // Create visual effect
            this.createFuriousAngerVisualEffect(hero, successCount);
        }
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('furiousAngerCSS');
        if (css) css.remove();

        // Remove any remaining effects
        const effects = document.querySelectorAll('.furious-anger-effect');
        effects.forEach(effect => effect.remove());
    }
}

// Export main functions for integration with battle system
export const furiousAngerEffect = new FuriousAngerEffect(null);

/**
 * Initialize Furious Anger effect with battle manager
 * @param {Object} battleManager - The battle manager instance
 * @returns {FuriousAngerEffect} - The initialized effect instance
 */
export function initFuriousAngerEffect(battleManager) {
    furiousAngerEffect.battleManager = battleManager;
    console.log('🔥 Furious Anger effect initialized');
    return furiousAngerEffect;
}

/**
 * Main function to check for Furious Anger reactions (called from creature death handling)
 * @param {Object} defeatedCreature - The creature that was defeated  
 * @param {string} defeatedCreatureSide - Side of the defeated creature
 * @param {Object} defeatedCreatureHero - Hero who owned the defeated creature
 * @param {Object} battleManager - The battle manager instance
 */
export async function checkFuriousAngerReactions(defeatedCreature, defeatedCreatureSide, defeatedCreatureHero, battleManager) {
    if (!battleManager || !battleManager.isAuthoritative) return;

    const effect = new FuriousAngerEffect(battleManager);
    await effect.checkFuriousAngerReactions(defeatedCreature, defeatedCreatureSide, defeatedCreatureHero);
}

/**
 * Handle guest-side Furious Anger action
 * @param {Object} data - Action data from host
 * @param {Object} battleManager - The battle manager instance
 */
export function handleGuestFuriousAngerAction(data, battleManager) {
    const effect = new FuriousAngerEffect(battleManager);
    effect.handleGuestFuriousAngerAction(data);
}

export default FuriousAngerEffect;