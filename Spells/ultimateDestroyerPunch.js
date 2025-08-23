// ultimateDestroyerPunch.js - Ultimate Destroyer Punch Fighting Spell Implementation

export class UltimateDestroyerPunchSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'UltimateDestroyerPunch';
    }

    /**
     * Override trigger chance to always trigger when conditions are met
     * @param {Object} attacker - The attacking hero
     * @param {Object} target - The target that was attacked
     * @param {number} damage - The damage dealt
     * @returns {number} - Always 1.0 (100%) if creature died, 0 otherwise
     */
    getTriggerChance(attacker, target, damage) {
        // Only trigger if target was a creature that died
        if (target && target.type === 'creature' && !target.alive) {
            return 1.0; // 100% chance when creature dies
        }
        return 0; // 0% chance for other cases
    }

    /**
     * Execute Ultimate Destroyer Punch effect after a successful attack
     * Only triggers if the target was a creature that died
     * @param {Object} attacker - The hero who attacked
     * @param {Object} target - The target that was attacked (should be a creature)
     * @param {number} attackDamage - The damage that was dealt
     * @returns {Promise} - Animation completion promise
     */
    async executeEffect(attacker, target, attackDamage) {
        // This method is only called if getTriggerChance returned > 0
        // So we know the conditions are already met

        // Find the nearest enemy hero using ranged targeting logic
        const punchTarget = this.findPunchTarget(attacker);
        
        if (!punchTarget) {
            // No valid punch target found
            this.battleManager.addCombatLog(
                `💀 ${attacker.name}'s Ultimate Destroyer Punch has no target!`,
                attacker.side === 'player' ? 'success' : 'error'
            );
            return;
        }

        // Calculate punch damage: 10 + (10 × Fighting stacks)
        const fightingStacks = attacker.getAbilityStackCount('Fighting');
        const punchDamage = 40 + (fightingStacks * 20);

        // Log the effect
        this.battleManager.addCombatLog(
            `👊 ${attacker.name}'s Ultimate Destroyer Punch strikes ${punchTarget.hero.name} for ${punchDamage} damage!`,
            attacker.side === 'player' ? 'success' : 'error'
        );

        // Create punch animation (don't await - let it run in background)
        this.createPunchEffect(punchTarget.hero);

        // Apply damage to the punch target (host only - damage will sync automatically)
        if (this.battleManager.isAuthoritative) {
            this.battleManager.combatManager.authoritative_applyDamage({
                target: punchTarget.hero,
                damage: punchDamage,
                newHp: Math.max(0, punchTarget.hero.currentHp - punchDamage),
                died: (punchTarget.hero.currentHp - punchDamage) <= 0
            }, {
                source: 'ultimateDestroyerPunch',
                attacker: attacker
            });

            // Sync to guest
            this.battleManager.sendBattleUpdate('ultimate_destroyer_punch_triggered', {
                attackerInfo: this.getTargetSyncInfo(attacker),
                originalTargetInfo: this.getTargetSyncInfo(target),
                punchTargetInfo: this.getTargetSyncInfo(punchTarget.hero),
                punchDamage: punchDamage,
                fightingStacks: fightingStacks,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Find the punch target using ranged targeting logic
     * @param {Object} attacker - The attacking hero
     * @returns {Object|null} - Target object or null
     */
    findPunchTarget(attacker) {
        // Use the same logic as ranged attacks to find nearest enemy hero
        const attackerSide = attacker.side;
        const attackerPosition = attacker.position;
        
        // Get ranged target (ignores creatures, targets heroes directly)
        return this.battleManager.combatManager.authoritative_findTargetIgnoringCreatures(
            attackerPosition, 
            attackerSide
        );
    }

    /**
     * Create the punch effect animation
     * @param {Object} target - The target hero to punch
     * @returns {Promise} - Animation completion promise
     */
    async createPunchEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) {
            console.warn('Could not find target element for Ultimate Destroyer Punch effect');
            return;
        }

        // Ensure CSS exists before creating effect
        this.ensurePunchEffectCSS();

        // Create punch effect with impact particles
        const punchContainer = this.createPunchContainer();
        targetElement.appendChild(punchContainer);

        // Create multiple impact effects
        this.createImpactEffects(punchContainer);

        // Clean up effect after animation
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(800);
        setTimeout(() => {
            if (punchContainer && punchContainer.parentNode) {
                punchContainer.remove();
            }
        }, animationDuration);
    }

    /**
     * Create the main punch effect container
     * @returns {HTMLElement} - Punch effect container
     */
    createPunchContainer() {
        const container = document.createElement('div');
        container.className = 'ultimate-destroyer-punch-container';
        
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(800) + 'ms';
        
        // Main punch fist
        const punchFist = document.createElement('div');
        punchFist.className = 'ultimate-destroyer-punch-fist';
        punchFist.innerHTML = '👊';
        punchFist.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            font-size: 48px;
            pointer-events: none;
            z-index: 300;
            transform: translate(-50%, -50%) scale(0);
            animation: ultimateDestroyerPunchFist ${animationDuration} ease-out forwards;
            text-shadow: 0 0 20px rgba(255, 69, 0, 0.8);
            filter: drop-shadow(0 0 10px rgba(255, 69, 0, 0.6));
        `;
        
        container.appendChild(punchFist);
        
        container.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 299;
        `;
        
        return container;
    }

    /**
     * Create impact particle effects around the punch
     * @param {HTMLElement} container - Container for effects
     */
    createImpactEffects(container) {
        const particleCount = 8;
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(600);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'ultimate-destroyer-punch-particle';
            
            // Calculate position around punch in a circle
            const angle = (i / particleCount) * 360;
            const radius = 40;
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;
            
            // Random size and impact colors
            const size = 8 + Math.random() * 6;
            const opacity = 0.8 + Math.random() * 0.2;
            
            // Impact colors (orange/red burst)
            const impactColors = [
                `rgba(255, 69, 0, ${opacity})`,   // Orange red
                `rgba(255, 140, 0, ${opacity})`,  // Dark orange
                `rgba(255, 215, 0, ${opacity})`,  // Gold
                `rgba(220, 20, 60, ${opacity})`   // Crimson
            ];
            const impactColor = impactColors[Math.floor(Math.random() * impactColors.length)];
            
            const delay = (i * 50) + 'ms';
            const duration = animationDuration + 'ms';
            
            particle.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                width: ${size}px;
                height: ${size}px;
                background: ${impactColor};
                border-radius: 50%;
                pointer-events: none;
                z-index: 301;
                transform: translate(-50%, -50%);
                animation: ultimateDestroyerPunchParticle ${duration} ease-out ${delay} forwards;
                box-shadow: 0 0 10px ${impactColor};
                border: 2px solid rgba(255, 255, 255, 0.3);
            `;
            
            container.appendChild(particle);
        }
    }

    /**
     * Get the DOM element for the target hero
     * @param {Object} target - Target hero object
     * @returns {HTMLElement|null} - Target DOM element
     */
    getTargetElement(target) {
        // For heroes only (this spell only targets heroes)
        return this.battleManager.getHeroElement(target.side, target.position);
    }

    /**
     * Get target sync information for network communication
     * @param {Object} target - Target object (hero or creature)
     * @returns {Object} - Sync information
     */
    getTargetSyncInfo(target) {
        if (target.type === 'hero' || !target.type) {
            return {
                type: 'hero',
                absoluteSide: target.absoluteSide,
                position: target.position,
                name: target.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: target.name
            };
        }
    }

    /**
     * Find creature information (hero, position, index)
     * @param {Object} creature - Creature object
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
     * Handle guest receiving Ultimate Destroyer Punch effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, originalTargetInfo, punchTargetInfo, punchDamage, fightingStacks } = data;
        
        // Find local targets
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        const localPunchTarget = this.findTargetFromSyncInfo(punchTargetInfo);
        
        if (!localAttacker || !localPunchTarget) {
            console.warn('Could not find local targets for Ultimate Destroyer Punch effect');
            return;
        }

        // Log the effect (damage will be applied via normal damage sync)
        this.battleManager.addCombatLog(
            `👊 ${localAttacker.name}'s Ultimate Destroyer Punch strikes ${localPunchTarget.name} for ${punchDamage} damage!`,
            localAttacker.side === 'player' ? 'success' : 'error'
        );

        // Create visual effect only (damage is handled by host and synced separately)
        this.createPunchEffect(localPunchTarget);
    }

    /**
     * Find target from sync information
     * @param {Object} targetInfo - Target sync info
     * @returns {Object|null} - Target object or null
     */
    findTargetFromSyncInfo(targetInfo) {
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (targetInfo.type === 'hero') {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            return heroes[targetInfo.position];
        } else {
            const heroes = localSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[targetInfo.position];
            return hero?.creatures?.[targetInfo.creatureIndex];
        }
    }

    /**
     * Ensure CSS for punch effect exists
     */
    ensurePunchEffectCSS() {
        if (document.getElementById('ultimateDestroyerPunchCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'ultimateDestroyerPunchCSS';
        style.textContent = `
            @keyframes ultimateDestroyerPunchFist {
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(-45deg);
                    opacity: 0;
                }
                25% {
                    transform: translate(-50%, -50%) scale(1.8) rotate(0deg);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(2.2) rotate(15deg);
                    opacity: 1;
                }
                75% {
                    transform: translate(-50%, -50%) scale(1.5) rotate(-10deg);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                    opacity: 0;
                }
            }
            
            @keyframes ultimateDestroyerPunchParticle {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                30% {
                    transform: translate(-50%, -50%) scale(1.5);
                    opacity: 1;
                }
                70% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.5);
                    opacity: 0;
                }
            }
            
            .ultimate-destroyer-punch-container {
                will-change: transform;
            }
            
            .ultimate-destroyer-punch-fist {
                will-change: transform, opacity;
            }
            
            .ultimate-destroyer-punch-particle {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Debug method to verify spell setup
     * Call this from console: battleManager.spellSystem.spellImplementations.get('UltimateDestroyerPunch').debugSpellSetup()
     */
    debugSpellSetup() {
        console.log('🔍 UltimateDestroyerPunch Debug Info:');
        
        // Check if spell is registered
        const isRegistered = this.battleManager.spellSystem.spellImplementations.has('UltimateDestroyerPunch');
        console.log(`- Spell registered: ${isRegistered}`);
        
        // Check heroes for this spell
        const allHeroes = [...Object.values(this.battleManager.playerHeroes), ...Object.values(this.battleManager.opponentHeroes)];
        
        allHeroes.forEach(hero => {
            if (!hero) return;
            
            const allSpells = hero.getAllSpells();
            const ultimateDestroyerSpells = allSpells.filter(spell => spell.name === 'UltimateDestroyerPunch');
            
            if (ultimateDestroyerSpells.length > 0) {
                console.log(`- ${hero.name} has ${ultimateDestroyerSpells.length} UltimateDestroyerPunch spell(s):`);
                ultimateDestroyerSpells.forEach(spell => {
                    console.log(`  - spellSchool: "${spell.spellSchool}" (should be "Fighting")`);
                    console.log(`  - subtype: "${spell.subtype}" (should NOT be "Trap")`);
                    console.log(`  - cardType: "${spell.cardType}"`);
                });
                
                const fightingSpells = allSpells.filter(spell => spell.spellSchool === 'Fighting');
                console.log(`  - Total Fighting spells: ${fightingSpells.length}`);
            }
        });
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('ultimateDestroyerPunchCSS');
        if (css) css.remove();
        
        // Remove any remaining punch effects
        const effects = document.querySelectorAll('.ultimate-destroyer-punch-container');
        effects.forEach(effect => effect.remove());
    }
}

export default UltimateDestroyerPunchSpell;