// ./Creatures/lunaKiai.js - LunaKiai Creature Burn All Module

export class LunaKiaiCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.activeFlameEffects = new Set(); // Track active flame effects for cleanup
        
        // LunaKiai stats
        this.FLAME_DURATION = 1500; // 1.5 second flame duration
        
        // Inject CSS styles
        this.injectLunaKiaiStyles();
        
        console.log('🔥 LunaKiai Creature module initialized');
    }

    // Check if a creature is LunaKiai
    static isLunaKiai(creatureName) {
        return creatureName === 'LunaKiai';
    }

    // Execute LunaKiai special attack - burn all targets
    async executeSpecialAttack(lunaKiaiActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const lunaKiaiCreature = lunaKiaiActor.data;
        const lunaKiaiHero = lunaKiaiActor.hero;
        const attackerSide = lunaKiaiHero.side;
        
        // Safety check: ensure LunaKiai is still alive
        if (!lunaKiaiCreature.alive || lunaKiaiCreature.currentHp <= 0) {
            console.log(`LunaKiai is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🔥 ${lunaKiaiCreature.name} ignites the battlefield with burning passion!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Find ALL targets (heroes and creatures on both sides)
        const allTargets = this.findAllTargets();
        
        if (allTargets.length === 0) {
            this.battleManager.addCombatLog(
                `💨 ${lunaKiaiCreature.name} finds no targets to affect!`, 
                'info'
            );
            
            // Do generic shake animation when no targets
            await this.battleManager.animationManager.shakeCreature(attackerSide, position, lunaKiaiActor.index);
            return;
        }
        
        // Log the flame ignition
        this.battleManager.addCombatLog(
            `🔥 ${lunaKiaiCreature.name} sets ${allTargets.length} targets ablaze!`, 
            'info'
        );

        // Send synchronization data to guest
        this.sendFlameAttackUpdate(lunaKiaiActor, allTargets, position);

        // Short delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Execute flame attack with visual effects
        await this.executeFlameAttack(lunaKiaiActor, allTargets, position);
    }

    // Find all targets (heroes and creatures on both sides)
    findAllTargets() {
        const targets = [];
        
        // Check both player and opponent sides
        ['player', 'opponent'].forEach(side => {
            const heroes = side === 'player' ? 
                this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            
            // Check all hero positions
            ['left', 'center', 'right'].forEach(position => {
                const hero = heroes[position];
                if (hero && hero.alive) {
                    // Add hero as target
                    targets.push({
                        type: 'hero',
                        target: hero,
                        side: side,
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
                                    side: side,
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
        });
        
        return targets;
    }

    // Execute the flame attack with visual effects (host side)
    async executeFlameAttack(lunaKiaiActor, allTargets, position) {
        const attackerSide = lunaKiaiActor.hero.side;
        
        // Create flame effects for all targets
        const flamePromises = [];
        
        for (const targetData of allTargets) {
            const targetElement = this.getTargetElement(targetData);
            if (targetElement) {
                const flameEffect = this.createFlameEffect(targetElement);
                this.activeFlameEffects.add(flameEffect);
                flamePromises.push(flameEffect.promise);
            }
        }
        
        // Small delay before applying status effects
        await this.battleManager.delay(300);
        
        // Apply burn status to all targets
        for (const targetData of allTargets) {
            this.applyBurnStatus(targetData);
        }
        
        this.battleManager.addCombatLog(
            `🔥 All targets are now burning with intense flames!`, 
            'info'
        );
        
        // Wait for flame effects to complete
        await Promise.all(flamePromises);
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

    // Create flame effect with dancing flame particles
    createFlameEffect(targetElement) {
        if (!targetElement) return { promise: Promise.resolve() };

        const flameContainer = document.createElement('div');
        flameContainer.className = 'luna-kiai-flame';
        
        const adjustedDuration = this.battleManager.getSpeedAdjustedDelay(this.FLAME_DURATION);
        
        // Position relative to the target's parent container
        const targetParent = targetElement.parentElement;
        const targetRect = targetElement.getBoundingClientRect();
        const parentRect = targetParent.getBoundingClientRect();
        
        // Calculate position relative to parent
        const relativeLeft = targetRect.left - parentRect.left;
        const relativeTop = targetRect.top - parentRect.top;
        
        // Position the container to cover the target area
        flameContainer.style.cssText = `
            position: absolute;
            left: ${relativeLeft - 20}px;
            top: ${relativeTop - 20}px;
            width: ${targetRect.width + 40}px;
            height: ${targetRect.height + 40}px;
            pointer-events: none;
            z-index: 1600;
            overflow: hidden;
        `;
        
        // Create flame particles
        const flameCount = 10;
        
        for (let i = 0; i < flameCount; i++) {
            const flame = document.createElement('div');
            flame.className = 'luna-kiai-flame-particle';
            flame.innerHTML = '🔥';
            
            const size = Math.random() * 8 + 4;
            const startX = Math.random() * 100; // % position within container
            const animationDelay = Math.random() * adjustedDuration * 0.3;
            
            const baseAnimationDuration = Math.random() * 800 + 1000;
            const animationDuration = this.battleManager.getSpeedAdjustedDelay(baseAnimationDuration);
            
            flame.style.cssText = `
                position: absolute;
                left: ${startX}%;
                bottom: 0px;
                font-size: ${size}px;
                color: rgba(255, ${Math.random() * 100 + 100}, 0, ${Math.random() * 0.4 + 0.6});
                animation: lunaKiaiFlameRise ${animationDuration}ms ease-out infinite;
                animation-delay: ${animationDelay}ms;
                text-shadow: 0 0 4px rgba(255, 100, 0, 0.8);
                filter: blur(${Math.random() * 0.2}px);
            `;
            
            flameContainer.appendChild(flame);
        }
        
        // Append to the target's parent for proper relative positioning
        targetParent.appendChild(flameContainer);
        
        const promise = new Promise(resolve => {
            setTimeout(() => {
                if (flameContainer && flameContainer.parentNode) {
                    flameContainer.remove();
                }
                this.activeFlameEffects.delete({ container: flameContainer, promise });
                resolve();
            }, adjustedDuration);
        });
        
        return { container: flameContainer, promise };
    }

    // Apply burn status to target
    applyBurnStatus(targetData) {
        // Apply 1 stack of burned status effect
        this.battleManager.statusEffectsManager.applyStatusEffect(targetData.target, 'burned', 1);
        
        // Log the burn application
        const targetSideText = targetData.side === 'player' ? 'ally' : 'enemy';
        this.battleManager.addCombatLog(
            `🔥 ${targetData.target.name} (${targetSideText}) is now burning!`,
            'info'
        );
    }

    // Send flame attack data to guest for synchronization
    sendFlameAttackUpdate(lunaKiaiActor, allTargets, position) {
        const attackerSide = lunaKiaiActor.hero.side;
        
        this.battleManager.sendBattleUpdate('luna_kiai_flame_attack', {
            lunaKiaiData: {
                side: attackerSide,
                position: position,
                creatureIndex: lunaKiaiActor.index,
                name: lunaKiaiActor.data.name,
                absoluteSide: lunaKiaiActor.hero.absoluteSide
            },
            targets: allTargets.map(target => ({
                targetInfo: target.targetInfo
            })),
            flameDuration: this.FLAME_DURATION
        });
    }

    // Handle flame attack on guest side
    handleGuestFlameAttack(data) {
        const { lunaKiaiData, targets, flameDuration } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const lunaKiaiLocalSide = (lunaKiaiData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🔥 ${lunaKiaiData.name} ignites the battlefield with burning passion!`, 
            lunaKiaiLocalSide === 'player' ? 'success' : 'error'
        );

        // Start guest animation immediately
        this.createGuestFlames(lunaKiaiData, targets, flameDuration, myAbsoluteSide);
    }

    // Create flames on guest side
    async createGuestFlames(lunaKiaiData, targetData, flameDuration, myAbsoluteSide) {
        const flamePromises = [];
        
        // Create flame effects for all targets
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
                const flameEffect = this.createFlameEffect(targetElement);
                this.activeFlameEffects.add(flameEffect);
                flamePromises.push(flameEffect.promise);
            }
        }
        
        // Log status application for each target
        for (const target of targetData) {
            const targetSideText = (target.targetInfo.absoluteSide === myAbsoluteSide) ? 'ally' : 'enemy';
            this.battleManager.addCombatLog(
                `🔥 ${target.targetInfo.name} (${targetSideText}) is now burning!`,
                'info'
            );
        }
        
        // Wait for all flame effects to complete
        await Promise.all(flamePromises);
    }

    // Clean up all active flame effects (called on battle end/reset)
    cleanup() {
        console.log(`🔥 Cleaning up ${this.activeFlameEffects.size} active LunaKiai flame effects`);
        
        this.activeFlameEffects.forEach(flame => {
            try {
                if (flame.container && flame.container.parentNode) {
                    flame.container.remove();
                }
            } catch (error) {
                console.warn('Error removing flame during cleanup:', error);
            }
        });
        
        this.activeFlameEffects.clear();

        // Also remove any orphaned flame elements
        try {
            const orphanedFlames = document.querySelectorAll('.luna-kiai-flame');
            orphanedFlames.forEach(flame => {
                if (flame.parentNode) {
                    flame.remove();
                }
            });
            
            if (orphanedFlames.length > 0) {
                console.log(`🔥 Cleaned up ${orphanedFlames.length} orphaned LunaKiai flame effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned flames:', error);
        }
    }

    // Inject CSS styles for LunaKiai effects
    injectLunaKiaiStyles() {
        if (document.getElementById('lunaKiaiCreatureStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'lunaKiaiCreatureStyles';
        style.textContent = `
            /* LunaKiai Flame Styles */
            .luna-kiai-flame {
                border-radius: 8px;
                position: relative;
                overflow: visible;
            }

            .luna-kiai-flame-particle {
                will-change: transform, opacity;
                user-select: none;
                pointer-events: none;
            }

            @keyframes lunaKiaiFlameRise {
                0% { 
                    transform: translateY(0px) translateX(0px) rotate(0deg) scale(1);
                    opacity: 0;
                }
                20% {
                    opacity: 1;
                }
                80% {
                    opacity: 0.8;
                }
                100% { 
                    transform: translateY(-60px) translateX(${Math.random() * 20 - 10}px) rotate(${Math.random() * 360}deg) scale(0.3);
                    opacity: 0;
                }
            }

            /* Enhanced creature glow when LunaKiai is preparing to attack */
            .creature-icon.luna-kiai-charging .creature-sprite {
                filter: brightness(1.8) drop-shadow(0 0 20px rgba(255, 100, 0, 0.9));
                animation: lunaKiaiChargeGlow 1.2s ease-in-out infinite alternate;
            }

            @keyframes lunaKiaiChargeGlow {
                0% { 
                    filter: brightness(1.8) drop-shadow(0 0 20px rgba(255, 100, 0, 0.9));
                }
                100% { 
                    filter: brightness(2.3) drop-shadow(0 0 35px rgba(255, 150, 0, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const LunaKiaiHelpers = {
    // Check if any creature in a list is LunaKiai
    hasLunaKiaiInList(creatures) {
        return creatures.some(creature => LunaKiaiCreature.isLunaKiai(creature.name));
    },

    // Get all LunaKiai creatures from a list
    getLunaKiaiFromList(creatures) {
        return creatures.filter(creature => LunaKiaiCreature.isLunaKiai(creature.name));
    }
};

export default LunaKiaiCreature;