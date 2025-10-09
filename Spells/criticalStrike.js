// criticalStrike.js - Critical Strike Fighting Spell Implementation

export class CriticalStrikeSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'CriticalStrike';
    }

    /**
     * Check if CriticalStrike should trigger and return damage modification
     * This is called during damage calculation, before damage is applied
     * @param {Object} attacker - The hero who is attacking
     * @param {Object} target - The target being attacked
     * @param {number} baseDamage - The base damage before CriticalStrike
     * @returns {Object} - { shouldTrigger: boolean, modifiedDamage: number, effectData: Object }
     */
    checkCriticalStrikeTrigger(attacker, target, baseDamage) {
        if (!this.battleManager.isAuthoritative || !attacker || !attacker.alive) {
            return { shouldTrigger: false, modifiedDamage: baseDamage, effectData: null };
        }

        // Check if attacker is silenced
        if (this.battleManager.statusEffectsManager && 
            !this.battleManager.statusEffectsManager.canCastSpells(attacker)) {
            return { shouldTrigger: false, modifiedDamage: baseDamage, effectData: null };
        }

        // Get all CriticalStrike spells this hero has
        const allSpells = attacker.getAllSpells();
        if (!allSpells || allSpells.length === 0) {
            return { shouldTrigger: false, modifiedDamage: baseDamage, effectData: null };
        }

        // Filter for CriticalStrike spells only
        const criticalStrikeSpells = allSpells.filter(spell => 
            spell.spellSchool === 'Fighting' && spell.name === 'CriticalStrike'
        );

        if (criticalStrikeSpells.length === 0) {
            return { shouldTrigger: false, modifiedDamage: baseDamage, effectData: null };
        }

        // Calculate trigger chance - 20% per spell
        const baseChancePerSpell = 0.2; 
        const totalChance = Math.min(1.0, criticalStrikeSpells.length * baseChancePerSpell);

        // Roll for trigger
        const shouldTrigger = this.battleManager.getRandom() <= totalChance;

        if (shouldTrigger) {
            if (this.battleManager.spellSystem) {
                this.battleManager.spellSystem.showFightingSpellCard(attacker, 'CriticalStrike');
            }
            const modifiedDamage = baseDamage * 2; 
            
            this.battleManager.addCombatLog(
                `⚡ ${attacker.name}'s Critical Strike doubles attack damage!`,
                attacker.side === 'player' ? 'success' : 'error'
            );

            // Track statistics
            if (this.battleManager.spellSystem) {
                this.battleManager.spellSystem.spellsCastThisBattle++;
                this.battleManager.spellSystem.spellCastHistory.push({
                    hero: attacker.name,
                    heroPosition: attacker.position,
                    heroSide: attacker.absoluteSide,
                    spell: 'CriticalStrike',
                    spellLevel: criticalStrikeSpells[0].level || 0,
                    spellSchool: 'Fighting',
                    turn: this.battleManager.currentTurn,
                    timestamp: Date.now(),
                    isFightingSpell: true
                });
            }

            const effectData = {
                attackerInfo: this.getTargetSyncInfo(attacker),
                targetInfo: this.getTargetSyncInfo(target),
                originalDamage: baseDamage,
                modifiedDamage: modifiedDamage
            };

            return { shouldTrigger: true, modifiedDamage: modifiedDamage, effectData: effectData };
        }

        return { shouldTrigger: false, modifiedDamage: baseDamage, effectData: null };
    }

    /**
     * Apply the visual effect for Critical Strike
     * @param {Object} target - The target to show effect on
     */
    async createCriticalStrikeEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) {
            console.warn('Could not find target element for Critical Strike effect');
            return;
        }

        // Ensure CSS exists before creating effect
        this.ensureCriticalStrikeCSS();

        // Create the golden slash effect
        const slashEffect = document.createElement('div');
        slashEffect.className = 'critical-strike-slash';
        slashEffect.innerHTML = '⚔️';
        
        const animationDuration = this.battleManager.getSpeedAdjustedDelay(800);
        
        slashEffect.style.cssText = `
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: #FFD700;
            text-shadow: 
                0 0 20px #FFD700,
                0 0 40px #FFA500,
                0 0 60px #FF8C00;
            pointer-events: none;
            z-index: 350;
            animation: criticalStrikeSlash ${animationDuration}ms ease-out forwards;
        `;
        
        targetElement.appendChild(slashEffect);

        // Create additional golden particles
        this.createGoldenParticles(targetElement);

        // Clean up after animation
        setTimeout(() => {
            if (slashEffect && slashEffect.parentNode) {
                slashEffect.remove();
            }
        }, animationDuration);
    }

    /**
     * Create golden particles around the slash effect
     * @param {HTMLElement} targetElement - Target element to attach particles to
     */
    createGoldenParticles(targetElement) {
        const particleCount = 8;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'critical-strike-particle';
            particle.innerHTML = '✨';
            
            const angle = (i / particleCount) * 360;
            const radius = 40;
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;
            
            const animationDelay = (i * 50) + 'ms';
            const animationDuration = this.battleManager.getSpeedAdjustedDelay(600) + 'ms';
            
            particle.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                font-size: 16px;
                color: #FFD700;
                pointer-events: none;
                z-index: 340;
                transform: translate(-50%, -50%);
                animation: criticalStrikeParticle ${animationDuration} ease-out ${animationDelay} forwards;
                text-shadow: 0 0 10px #FFD700;
            `;
            
            targetElement.appendChild(particle);
            particles.push(particle);
        }

        // Clean up particles
        const cleanupDelay = this.battleManager.getSpeedAdjustedDelay(700);
        setTimeout(() => {
            particles.forEach(particle => {
                if (particle && particle.parentNode) {
                    particle.remove();
                }
            });
        }, cleanupDelay);
    }

    /**
     * Get the DOM element for the target (hero or creature)
     * @param {Object} target - Target object
     * @returns {HTMLElement|null} - Target DOM element
     */
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            // Hero element
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            // Creature element
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) {
                console.warn('Could not find creature info for Critical Strike target');
                return null;
            }

            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
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
     * Get target sync information for network communication
     * @param {Object} target - Target object
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
     * Handle guest receiving Critical Strike effect
     * @param {Object} data - Effect data from host
     */
    async handleGuestEffect(data) {
        const { attackerInfo, targetInfo, originalDamage, modifiedDamage } = data;
        
        // Find local targets
        const localAttacker = this.findTargetFromSyncInfo(attackerInfo);
        const localTarget = this.findTargetFromSyncInfo(targetInfo);
        
        if (!localAttacker || !localTarget) {
            console.warn('Could not find local targets for Critical Strike effect');
            return;
        }

        // Log the effect
        this.battleManager.addCombatLog(
            `⚡ ${localAttacker.name}'s Critical Strike doubles attack damage!`,
            localAttacker.side === 'player' ? 'success' : 'error'
        );

        // Create visual effect
        this.createCriticalStrikeEffect(localTarget);
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
     * Ensure CSS for Critical Strike effect exists
     */
    ensureCriticalStrikeCSS() {
        if (document.getElementById('criticalStrikeCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'criticalStrikeCSS';
        style.textContent = `
            @keyframes criticalSlash {
                0% {
                    transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) scale(0);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) scale(1.5);
                    opacity: 1;
                }
                40% {
                    transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) scale(1.2);
                    opacity: 1;
                }
                80% {
                    transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) scale(1.0);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) scale(0.7);
                    opacity: 0;
                }
            }
            
            @keyframes criticalText {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                30% {
                    transform: translate(-50%, -50%) scale(1.3);
                    opacity: 1;
                }
                70% {
                    transform: translate(-50%, -50%) scale(1.0);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                }
            }
            
            @keyframes sparkleEffect {
                0% {
                    transform: translate(-50%, -50%) translate(0px, 0px) scale(0) rotate(0deg);
                    opacity: 0;
                }
                30% {
                    transform: translate(-50%, -50%) translate(var(--x, 0px), var(--y, 0px)) scale(1.2) rotate(180deg);
                    opacity: 1;
                }
                70% {
                    transform: translate(-50%, -50%) translate(var(--x, 0px), var(--y, 0px)) scale(1.0) rotate(360deg);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(-50%, -50%) translate(var(--x, 0px), var(--y, 0px)) scale(0.3) rotate(540deg);
                    opacity: 0;
                }
            }
            
            .critical-strike-container {
                will-change: transform, opacity;
            }
            
            .critical-strike-container > * {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove CSS
        const css = document.getElementById('criticalStrikeCSS');
        if (css) css.remove();
        
        // Remove any remaining effects
        const slashes = document.querySelectorAll('.critical-strike-slash');
        slashes.forEach(slash => slash.remove());
        
        const particles = document.querySelectorAll('.critical-strike-particle');
        particles.forEach(particle => particle.remove());
    }
}

export default CriticalStrikeSpell;