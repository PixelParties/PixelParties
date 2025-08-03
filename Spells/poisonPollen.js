// ./Spells/poisonPollen.js - Poison Pollen Spell Implementation

export class PoisonPollenSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'PoisonPollen';
        this.displayName = 'Poison Pollen';
        
        console.log('🌸 Poison Pollen spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Poison Pollen spell effect
    async executeSpell(caster, spell) {
        console.log(`🌸 ${caster.name} casting ${this.displayName}!`);
        
        // Find poisoned enemies (we know there are some because canCast was checked)
        const poisonedTargets = this.findPoisonedEnemies(caster);
        
        console.log(`🌸 ${caster.name} casting ${this.displayName} on ${poisonedTargets.length} poisoned enemies!`);
        
        // Log the spell effect
        this.logSpellEffect(caster, poisonedTargets);
        
        // Play purple particle rain animation and apply stun afterwards
        await this.playPoisonPollenAnimation(caster, poisonedTargets);
        
        console.log(`🌸 ${this.displayName} completed!`);
    }

    // Check if this spell can be cast (requires poisoned enemies)
    canCast(caster) {
        // Check if there are any poisoned enemies
        const poisonedTargets = this.findPoisonedEnemies(caster);
        return poisonedTargets.length > 0;
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find all poisoned enemy targets
    findPoisonedEnemies(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const poisonedTargets = [];
        
        // Check each position for heroes and creatures
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero) {
                // Check living hero for poison
                if (hero.alive && this.battleManager.statusEffectsManager && 
                    this.battleManager.statusEffectsManager.hasStatusEffect(hero, 'poisoned')) {
                    poisonedTargets.push({
                        type: 'hero',
                        hero: hero,
                        position: position,
                        side: enemySide,
                        name: hero.name
                    });
                }
                
                // Check living creatures for poison
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive && this.battleManager.statusEffectsManager &&
                            this.battleManager.statusEffectsManager.hasStatusEffect(creature, 'poisoned')) {
                            poisonedTargets.push({
                                type: 'creature',
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: enemySide,
                                name: creature.name
                            });
                        }
                    });
                }
            }
        });
        
        console.log(`🌸 ${this.displayName} found ${poisonedTargets.length} poisoned enemies:`, 
                   poisonedTargets.map(t => `${t.name} (${t.type})`).join(', '));
        
        return poisonedTargets;
    }

    // ============================================
    // STUN APPLICATION
    // ============================================

    // Apply stun to all poisoned targets
    async applyStunToTargets(targets) {
        const stunPromises = [];
        
        targets.forEach((target, index) => {
            // Stagger stun application for visual effect
            const delay = index * 50; // 50ms between each target
            
            const stunPromise = new Promise((resolve) => {
                setTimeout(() => {
                    let actualTarget;
                    
                    if (target.type === 'creature') {
                        actualTarget = target.creature;
                    } else {
                        actualTarget = target.hero;
                    }
                    
                    // Apply stun status effect using the status effects manager
                    if (this.battleManager.statusEffectsManager) {
                        const success = this.battleManager.statusEffectsManager.applyStatusEffect(
                            actualTarget, 
                            'stunned', 
                            1 // Always 1 stack of stun
                        );
                        
                        if (success) {
                            console.log(`🌸 Applied 1 stun stack to ${actualTarget.name}`);
                        } else {
                            console.error(`🌸 Failed to apply stun to ${actualTarget.name}`);
                        }
                    }
                    
                    resolve();
                }, this.battleManager.getSpeedAdjustedDelay(delay));
            });
            
            stunPromises.push(stunPromise);
        });
        
        // Wait for all stun applications to complete
        await Promise.all(stunPromises);
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the poison pollen animation on poisoned targets
    async playPoisonPollenAnimation(caster, targets) {
        console.log(`🌸 Playing Poison Pollen animation on ${targets.length} targets...`);
        
        // Create pollen particle effects on each target
        this.createPollenEffectsOnTargets(targets);
        
        // Animation timing
        const pollenDuration = 1000; // 1 second of pollen particles
        const stunApplicationDelay = 900; // Apply stun 0.9 seconds into the effect
        
        // Start applying stun near the end of the pollen effect
        setTimeout(() => {
            this.applyStunToTargets(targets);
        }, this.battleManager.getSpeedAdjustedDelay(stunApplicationDelay));
        
        // Wait for full pollen duration
        await this.battleManager.delay(pollenDuration);
        
        // Cleanup
        this.cleanupPollenEffects();
    }

    // Create pollen particle effects on specific targets
    createPollenEffectsOnTargets(targets) {
        targets.forEach((target, index) => {
            setTimeout(() => {
                let targetElement;
                
                if (target.type === 'creature') {
                    targetElement = document.querySelector(
                        `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
                    );
                } else {
                    targetElement = this.battleManager.getHeroElement(target.side, target.position);
                }
                
                if (targetElement) {
                    this.createPollenParticleEffect(targetElement);
                }
            }, this.battleManager.getSpeedAdjustedDelay(index * 100)); // Staggered start
        });
        
        // Ensure CSS exists
        this.ensurePollenEffectsCSS();
    }

    // Create pollen particle effect on a single target
    createPollenParticleEffect(targetElement) {
        const pollenContainer = document.createElement('div');
        pollenContainer.className = 'poison-pollen-container';
        
        // Get target bounds for particle positioning
        const rect = targetElement.getBoundingClientRect();
        
        pollenContainer.style.cssText = `
            position: fixed;
            left: ${rect.left - 30}px;
            top: ${rect.top - 30}px;
            width: ${rect.width + 60}px;
            height: ${rect.height + 60}px;
            z-index: 500;
            pointer-events: none;
            overflow: hidden;
        `;
        
        document.body.appendChild(pollenContainer);
        
        // Create multiple pollen particles
        const particleCount = 20; // Number of pollen particles per target
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                this.createPollenParticle(pollenContainer, rect);
            }, this.battleManager.getSpeedAdjustedDelay(i * 40)); // Stagger particle creation
        }
    }

    // Create a single pollen particle
    createPollenParticle(container, targetRect) {
        const particle = document.createElement('div');
        particle.className = 'poison-pollen-particle';
        particle.innerHTML = '🌸';
        
        // Random particle characteristics
        const x = Math.random() * (targetRect.width + 60);
        const y = Math.random() * (targetRect.height + 60);
        const size = 0.6 + Math.random() * 0.8; // 0.6x to 1.4x size
        const duration = 800 + Math.random() * 400; // 800-1200ms lifetime
        const rotation = Math.random() * 360;
        const drift = (Math.random() - 0.5) * 40; // Horizontal drift
        
        particle.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            font-size: ${14 * size}px;
            transform: rotate(${rotation}deg);
            animation: pollenParticleFloat ${this.battleManager.getSpeedAdjustedDelay(duration)}ms ease-out forwards;
            text-shadow: 
                0 0 8px rgba(138, 43, 226, 0.9),
                0 0 16px rgba(128, 0, 128, 0.7),
                0 0 24px rgba(75, 0, 130, 0.5);
            filter: drop-shadow(0 0 4px rgba(138, 43, 226, 0.8));
        `;
        
        // Set drift amount
        particle.style.setProperty('--drift-amount', `${drift}px`);
        
        container.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle && particle.parentNode) {
                particle.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(duration + 100));
    }

    // Clean up any remaining pollen effects
    cleanupPollenEffects() {
        // Remove pollen containers
        const containers = document.querySelectorAll('.poison-pollen-container');
        containers.forEach(container => container.remove());
        
        // Remove any remaining particles
        const particles = document.querySelectorAll('.poison-pollen-particle');
        particles.forEach(particle => particle.remove());
    }

    // Ensure CSS animations exist for pollen effects
    ensurePollenEffectsCSS() {
        if (document.getElementById('poisonPollenCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'poisonPollenCSS';
        style.textContent = `
            @keyframes pollenParticleFloat {
                0% { 
                    opacity: 0;
                    transform: translateY(0) translateX(0) rotate(0deg) scale(0.5);
                }
                20% {
                    opacity: 1;
                    transform: translateY(-10px) translateX(var(--drift-amount)) rotate(90deg) scale(1);
                }
                80% {
                    opacity: 0.8;
                    transform: translateY(-20px) translateX(calc(var(--drift-amount) * 1.5)) rotate(270deg) scale(1.1);
                }
                100% { 
                    opacity: 0;
                    transform: translateY(-30px) translateX(calc(var(--drift-amount) * 2)) rotate(360deg) scale(0.8);
                }
            }
            
            /* Enhanced visual effects */
            .poison-pollen-container {
                will-change: transform;
            }
            
            .poison-pollen-particle {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, targets) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        const heroTargets = targets.filter(t => t.type === 'hero').length;
        const creatureTargets = targets.filter(t => t.type === 'creature').length;
        
        let targetDescription = '';
        if (heroTargets > 0 && creatureTargets > 0) {
            targetDescription = `${heroTargets} poisoned hero${heroTargets > 1 ? 's' : ''} and ${creatureTargets} poisoned creature${creatureTargets > 1 ? 's' : ''}`;
        } else if (heroTargets > 0) {
            targetDescription = `${heroTargets} poisoned hero${heroTargets > 1 ? 's' : ''}`;
        } else if (creatureTargets > 0) {
            targetDescription = `${creatureTargets} poisoned creature${creatureTargets > 1 ? 's' : ''}`;
        }
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `🌸 ${this.displayName} covers ${targetDescription} in stunning pollen, applying 1 stun stack each!`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetCount: targets.length,
            heroTargets: heroTargets,
            creatureTargets: creatureTargets,
            targets: targets.map(t => ({
                type: t.type,
                name: t.name,
                position: t.position,
                creatureIndex: t.creatureIndex
            })),
            effectType: 'targeted_stun_pollen',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, heroTargets, creatureTargets } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Create target description
        let targetDescription = '';
        if (heroTargets > 0 && creatureTargets > 0) {
            targetDescription = `${heroTargets} poisoned hero${heroTargets > 1 ? 's' : ''} and ${creatureTargets} poisoned creature${creatureTargets > 1 ? 's' : ''}`;
        } else if (heroTargets > 0) {
            targetDescription = `${heroTargets} poisoned hero${heroTargets > 1 ? 's' : ''}`;
        } else if (creatureTargets > 0) {
            targetDescription = `${creatureTargets} poisoned creature${creatureTargets > 1 ? 's' : ''}`;
        }
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🌸 ${displayName} covers ${targetDescription} in stunning pollen, applying 1 stun stack each!`,
            logType
        );
        
        // Create mock caster for animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        // Create mock targets for animation
        const mockTargets = data.targets.map(targetData => {
            const targetLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'opponent' : 'player';
            return {
                type: targetData.type,
                name: targetData.name,
                position: targetData.position,
                side: targetLocalSide,
                creatureIndex: targetData.creatureIndex
            };
        });
        
        // Play visual effects on guest side (no stun application)
        this.playPollenAnimationGuestSide(mockCaster, mockTargets);
        
        console.log(`🌸 GUEST: ${casterName} used ${displayName} affecting ${data.targetCount} poisoned targets`);
    }

    // Guest-side animation (visual only, no stun application)
    async playPollenAnimationGuestSide(caster, targets) {
        console.log(`🌸 GUEST: Playing Poison Pollen animation...`);
        
        // Create pollen particle effects on each target
        this.createPollenEffectsOnTargets(targets);
        
        // Wait for full pollen duration
        await this.battleManager.delay(1000);
        
        // Cleanup
        this.cleanupPollenEffects();
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Check if this spell module handles the given spell
    canHandle(spellName) {
        return spellName === this.spellName;
    }

    // Get spell information
    getSpellInfo() {
        return {
            name: this.spellName,
            displayName: this.displayName,
            description: 'Covers all poisoned enemies in stunning pollen particles, applying 1 stun stack to each. Can only be cast if there are poisoned enemies.',
            effectFormula: '1 stun stack to all poisoned enemies',
            targetType: 'poisoned_enemies_only',
            spellSchool: 'DecayMagic',
            condition: 'Requires at least 1 poisoned enemy'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupPollenEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('poisonPollenCSS');
        if (css) css.remove();
        
        console.log('🌸 Poison Pollen spell cleaned up');
    }
}

// Export for use in spell system
export default PoisonPollenSpell;