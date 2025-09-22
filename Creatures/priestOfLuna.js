// ./Creatures/priestOfLuna.js - PriestOfLuna Creature Cleansing Module

export class PriestOfLunaCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeCleansingEffects = new Set(); // Track active cleansing effects for cleanup
        
        // PriestOfLuna stats
        this.CLEANSING_DURATION = 1500; // 1.5 second cleansing duration
        
        // Inject CSS styles
        this.injectPriestOfLunaStyles();
        
        console.log('🌙 PriestOfLuna Creature module initialized');
    }

    // Check if a creature is PriestOfLuna
    static isPriestOfLuna(creatureName) {
        return creatureName === 'PriestOfLuna';
    }

    // Execute PriestOfLuna special attack - cleanse burn from all allies
    async executeSpecialAttack(priestActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const priestCreature = priestActor.data;
        const priestHero = priestActor.hero;
        const attackerSide = priestHero.side;
        
        // Safety check: ensure PriestOfLuna is still alive
        if (!priestCreature.alive || priestCreature.currentHp <= 0) {
            console.log(`PriestOfLuna is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🌙 ${priestCreature.name} channels lunar energy to cleanse allies!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find ALL ally targets (heroes and creatures on the same side)
        const allyTargets = this.findAllyTargets(attackerSide);
        
        if (allyTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${priestCreature.name} finds no allies to cleanse!`, 
                'info'
            );
            
            // Do generic shake animation when no targets
            await this.battleManager.animationManager.shakeCreature(attackerSide, position, priestActor.index);
            return;
        }
        
        // Filter targets that actually have burn to cleanse
        const burnedTargets = allyTargets.filter(target => 
            this.battleManager.statusEffectsManager.hasStatusEffect(target.target, 'burned')
        );
        
        if (burnedTargets.length === 0) {
            this.battleManager.addCombatLog(
                `🌙 ${priestCreature.name} finds no burned allies to cleanse!`, 
                'info'
            );
            
            // Do generic shake animation when no burned targets
            await this.battleManager.animationManager.shakeCreature(attackerSide, position, priestActor.index);
            return;
        }

        // Log the cleansing
        this.battleManager.addCombatLog(
            `🌙 ${priestCreature.name} cleanses ${burnedTargets.length} burned allies!`, 
            'info'
        );

        // Send synchronization data to guest
        this.sendCleansingUpdate(priestActor, burnedTargets, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute cleansing with visual effects
        await this.executeCleansingAction(priestActor, burnedTargets, position);
    }

    // Find all ally targets (heroes and creatures on the same side)
    findAllyTargets(attackerSide) {
        const targets = [];
        
        // Only check the attacker's side for allies
        const heroes = attackerSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Check all hero positions on the ally side
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive) {
                // Add hero as target
                targets.push({
                    type: 'hero',
                    target: hero,
                    side: attackerSide,
                    position: position,
                    targetInfo: {
                        type: 'hero',
                        absoluteSide: hero.absoluteSide,
                        position: position,
                        name: hero.name
                    }
                });
                
                // Add living creatures as targets
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            targets.push({
                                type: 'creature',
                                target: creature,
                                side: attackerSide,
                                position: position,
                                creatureIndex: index,
                                hero: hero,
                                targetInfo: {
                                    type: 'creature',
                                    absoluteSide: hero.absoluteSide,
                                    position: position,
                                    creatureIndex: index,
                                    name: creature.name
                                }
                            });
                        }
                    });
                }
            }
        });
        
        return targets;
    }

    // Execute the cleansing action with visual effects (host side)
    async executeCleansingAction(priestActor, burnedTargets, position) {
        const attackerSide = priestActor.hero.side;
        
        // Create cleansing effects for all burned targets
        const cleansingPromises = [];
        
        for (const targetData of burnedTargets) {
            const targetElement = this.getTargetElement(targetData);
            if (targetElement) {
                const cleansingEffect = this.createCleansingEffect(targetElement);
                this.activeCleansingEffects.add(cleansingEffect);
                cleansingPromises.push(cleansingEffect.promise);
            }
        }
        
        // Small delay before applying cleansing
        await this.battleManager.delay(300);
        
        // Remove burn status from all burned targets
        for (const targetData of burnedTargets) {
            this.removeBurnStatus(targetData);
        }
        
        this.battleManager.addCombatLog(
            `🌙 Lunar energy cleanses the burning wounds of all allies!`, 
            'info'
        );
        
        // Wait for cleansing effects to complete
        await Promise.all(cleansingPromises);
    }

    // Get the DOM element for a target
    getTargetElement(targetData) {
        if (targetData.type === 'hero') {
            const heroElement = document.querySelector(
                `.${targetData.side}-slot.${targetData.position}-slot .battle-hero-card`
            );
            if (!heroElement) {
                // Fallback to the slot itself
                return document.querySelector(`.${targetData.side}-slot.${targetData.position}-slot`);
            }
            return heroElement;
        } else if (targetData.type === 'creature') {
            return document.querySelector(
                `.${targetData.side}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
            );
        }
        return null;
    }

    // Create cleansing effect with lunar energy particles
    createCleansingEffect(targetElement) {
        if (!targetElement) return { promise: Promise.resolve() };

        const cleansingContainer = document.createElement('div');
        cleansingContainer.className = 'priest-of-luna-cleansing';
        
        const adjustedDuration = this.battleManager.getSpeedAdjustedDelay(this.CLEANSING_DURATION);
        
        // Position relative to the target's parent container
        const targetParent = targetElement.parentElement;
        const targetRect = targetElement.getBoundingClientRect();
        const parentRect = targetParent.getBoundingClientRect();
        
        // Calculate position relative to parent
        const relativeLeft = targetRect.left - parentRect.left;
        const relativeTop = targetRect.top - parentRect.top;
        
        // Position the container to cover the target area
        cleansingContainer.style.cssText = `
            position: absolute;
            left: ${relativeLeft - 20}px;
            top: ${relativeTop - 20}px;
            width: ${targetRect.width + 40}px;
            height: ${targetRect.height + 40}px;
            pointer-events: none;
            z-index: 1600;
            overflow: hidden;
        `;
        
        // Create lunar energy particles
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'priest-of-luna-particle';
            particle.innerHTML = '✨';
            
            const size = Math.random() * 6 + 3;
            const startX = Math.random() * 100; // % position within container
            const animationDelay = Math.random() * adjustedDuration * 0.3;
            
            const baseAnimationDuration = Math.random() * 600 + 800;
            const animationDuration = this.battleManager.getSpeedAdjustedDelay(baseAnimationDuration);
            
            particle.style.cssText = `
                position: absolute;
                left: ${startX}%;
                top: 50%;
                font-size: ${size}px;
                color: rgba(200, 220, 255, ${Math.random() * 0.4 + 0.6});
                animation: priestOfLunaHeal ${animationDuration}ms ease-out infinite;
                animation-delay: ${animationDelay}ms;
                text-shadow: 0 0 6px rgba(200, 220, 255, 0.9);
                filter: blur(${Math.random() * 0.1}px);
            `;
            
            cleansingContainer.appendChild(particle);
        }
        
        // Add central moon symbol
        const moonSymbol = document.createElement('div');
        moonSymbol.className = 'priest-of-luna-moon';
        moonSymbol.innerHTML = '🌙';
        moonSymbol.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            animation: priestOfLunaMoonGlow ${adjustedDuration}ms ease-in-out;
            text-shadow: 0 0 10px rgba(200, 220, 255, 1);
        `;
        
        cleansingContainer.appendChild(moonSymbol);
        
        // Append to the target's parent for proper relative positioning
        targetParent.appendChild(cleansingContainer);
        
        const promise = new Promise(resolve => {
            setTimeout(() => {
                if (cleansingContainer && cleansingContainer.parentNode) {
                    cleansingContainer.remove();
                }
                this.activeCleansingEffects.delete({ container: cleansingContainer, promise });
                resolve();
            }, adjustedDuration);
        });
        
        return { container: cleansingContainer, promise };
    }

    // Remove burn status from target
    removeBurnStatus(targetData) {
        // Remove 1 stack of burned status effect
        this.battleManager.statusEffectsManager.removeStatusEffect(targetData.target, 'burned', 1);
        
        // Log the burn removal
        this.battleManager.addCombatLog(
            `🌙 ${targetData.target.name} is cleansed of burning!`,
            'success'
        );
    }

    // Send cleansing data to guest for synchronization
    sendCleansingUpdate(priestActor, burnedTargets, position) {
        const attackerSide = priestActor.hero.side;
        
        this.battleManager.sendBattleUpdate('priest_of_luna_cleansing', {
            priestData: {
                side: attackerSide,
                position: position,
                creatureIndex: priestActor.index,
                name: priestActor.data.name,
                absoluteSide: priestActor.hero.absoluteSide
            },
            targets: burnedTargets.map(target => ({
                targetInfo: target.targetInfo
            })),
            cleansingDuration: this.CLEANSING_DURATION
        });
    }

    // Handle cleansing on guest side
    handleGuestCleansing(data) {
        const { priestData, targets, cleansingDuration } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const priestLocalSide = (priestData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🌙 ${priestData.name} channels lunar energy to cleanse allies!`, 
            priestLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestCleansing(priestData, targets, cleansingDuration, myAbsoluteSide);
    }

    // Create cleansing effects on guest side
    async createGuestCleansing(priestData, targetData, cleansingDuration, myAbsoluteSide) {
        const cleansingPromises = [];
        
        // Create cleansing effects for all targets
        for (const target of targetData) {
            const targetLocalSide = (target.targetInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            let targetElement = null;
            
            if (target.targetInfo.type === 'hero') {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${target.targetInfo.position}-slot .battle-hero-card`
                );
                if (!targetElement) {
                    targetElement = document.querySelector(
                        `.${targetLocalSide}-slot.${target.targetInfo.position}-slot`
                    );
                }
            } else if (target.targetInfo.type === 'creature') {
                targetElement = document.querySelector(
                    `.${targetLocalSide}-slot.${target.targetInfo.position}-slot .creature-icon[data-creature-index="${target.targetInfo.creatureIndex}"]`
                );
            }

            if (targetElement) {
                const cleansingEffect = this.createCleansingEffect(targetElement);
                this.activeCleansingEffects.add(cleansingEffect);
                cleansingPromises.push(cleansingEffect.promise);
            }
        }
        
        // Log cleansing for each target
        for (const target of targetData) {
            this.battleManager.addCombatLog(
                `🌙 ${target.targetInfo.name} is cleansed of burning!`,
                'success'
            );
        }
        
        // Wait for all cleansing effects to complete
        await Promise.all(cleansingPromises);
    }

    // Clean up all active cleansing effects (called on battle end/reset)
    cleanup() {
        console.log(`🌙 Cleaning up ${this.activeCleansingEffects.size} active PriestOfLuna cleansing effects`);
        
        this.activeCleansingEffects.forEach(cleansing => {
            try {
                if (cleansing.container && cleansing.container.parentNode) {
                    cleansing.container.remove();
                }
            } catch (error) {
                console.warn('Error removing cleansing effect during cleanup:', error);
            }
        });
        
        this.activeCleansingEffects.clear();

        // Also remove any orphaned cleansing elements
        try {
            const orphanedCleansing = document.querySelectorAll('.priest-of-luna-cleansing');
            orphanedCleansing.forEach(cleansing => {
                if (cleansing.parentNode) {
                    cleansing.remove();
                }
            });
            
            if (orphanedCleansing.length > 0) {
                console.log(`🌙 Cleaned up ${orphanedCleansing.length} orphaned PriestOfLuna cleansing effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned cleansing effects:', error);
        }
    }

    // Inject CSS styles for PriestOfLuna effects
    injectPriestOfLunaStyles() {
        if (document.getElementById('priestOfLunaCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'priestOfLunaCreatureStyles';
        style.textContent = `
            /* PriestOfLuna Cleansing Styles */
            .priest-of-luna-cleansing {
                border-radius: 8px;
                position: relative;
                overflow: visible;
            }

            .priest-of-luna-particle {
                will-change: transform, opacity;
                user-select: none;
                pointer-events: none;
            }

            @keyframes priestOfLunaHeal {
                0% { 
                    transform: translateY(0px) translateX(0px) rotate(0deg) scale(1);
                    opacity: 0;
                }
                20% {
                    opacity: 1;
                }
                80% {
                    opacity: 0.9;
                }
                100% { 
                    transform: translateY(-30px) translateX(${Math.random() * 30 - 15}px) rotate(${Math.random() * 180}deg) scale(1.2);
                    opacity: 0;
                }
            }

            @keyframes priestOfLunaMoonGlow {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            /* Enhanced creature glow when PriestOfLuna is preparing to cleanse */
            .creature-icon.priest-of-luna-charging .creature-sprite {
                filter: brightness(1.6) drop-shadow(0 0 20px rgba(200, 220, 255, 0.9));
                animation: priestOfLunaChargeGlow 1.2s ease-in-out infinite alternate;
            }

            @keyframes priestOfLunaChargeGlow {
                0% { 
                    filter: brightness(1.6) drop-shadow(0 0 20px rgba(200, 220, 255, 0.9));
                }
                100% { 
                    filter: brightness(2.1) drop-shadow(0 0 30px rgba(220, 240, 255, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const PriestOfLunaHelpers = {
    // Check if any creature in a list is PriestOfLuna
    hasPriestOfLunaInList(creatures) {
        return creatures.some(creature => PriestOfLunaCreature.isPriestOfLuna(creature.name));
    },

    // Get all PriestOfLuna creatures from a list
    getPriestOfLunaFromList(creatures) {
        return creatures.filter(creature => PriestOfLunaCreature.isPriestOfLuna(creature.name));
    }
};

export default PriestOfLunaCreature;