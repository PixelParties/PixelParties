// ./Spells/bigGwen.js - Big Gwen Area Effect with Time Magic Target Selection
// Provides visual effects and adds selected target to actor list an additional time

export class BigGwenEffect {
    constructor() {
        this.isActive = false;
        this.selectedTarget = null; // { heroPosition: 'left', type: 'hero' } or { heroPosition: 'left', type: 'creature', creatureIndex: 0 }
        this.opponentSelectedTarget = null; // For when both sides have BigGwen
        this.ownerSide = null; // 'player', 'opponent', or 'both'
        this.clockOverlay = null;
        this.animationIntervals = [];
        this.activeBigGwenCount = 0;
    }

    // Check if BigGwen should be active at battle start
    checkBigGwenActive(battleManager) {
        if (!battleManager) return { active: false, count: 0, ownerSide: null };

        const playerHasBigGwen = battleManager.playerAreaCard && 
                               battleManager.playerAreaCard.name === 'BigGwen';
        const opponentHasBigGwen = battleManager.opponentAreaCard && 
                                 battleManager.opponentAreaCard.name === 'BigGwen';

        let count = 0;
        let ownerSide = null;

        if (playerHasBigGwen) {
            count++;
            ownerSide = 'player';
        }
        if (opponentHasBigGwen) {
            count++;
            if (ownerSide === 'player') {
                ownerSide = 'both'; // Both sides have BigGwen
            } else {
                ownerSide = 'opponent';
            }
        }

        if (count > 0) {
            return { active: true, count: count, ownerSide: ownerSide };
        }

        return { active: false, count: 0, ownerSide: null };
    }

    // Apply BigGwen effects at battle start
    async applyBigGwenEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) return;

        const gwenCheck = this.checkBigGwenActive(battleManager);
        
        if (!gwenCheck.active) return;

        this.isActive = true;
        this.activeBigGwenCount = gwenCheck.count;
        this.ownerSide = gwenCheck.ownerSide;

        // Create clock animation immediately
        this.createClockAnimation(battleManager);

        // Select target(s) based on ownership
        if (this.ownerSide === 'player' || this.ownerSide === 'both') {
            this.selectedTarget = this.selectRandomTarget(battleManager, 'player');
            if (this.selectedTarget) {
                await this.createTargetSelectionAnimation(battleManager, this.selectedTarget, 'player');
            }
        }

        // For opponent side or both sides
        if (this.ownerSide === 'opponent' || this.ownerSide === 'both') {
            const opponentTarget = this.selectRandomTarget(battleManager, 'opponent');
            if (opponentTarget) {
                await this.createTargetSelectionAnimation(battleManager, opponentTarget, 'opponent');
                
                // Store opponent target separately if both sides have BigGwen
                if (this.ownerSide === 'both') {
                    this.opponentSelectedTarget = opponentTarget;
                } else {
                    this.selectedTarget = opponentTarget;
                }
            }
        }

        // Log message
        let gwenMessage = '';
        if (this.ownerSide === 'both') {
            gwenMessage = `Time magic fills the battlefield! Both players have chosen their time-blessed targets!`;
        } else if (this.ownerSide === 'player') {
            gwenMessage = `Big Gwen's time magic activates! A target has been chosen for temporal acceleration!`;
        } else {
            gwenMessage = `The opponent's Big Gwen chooses a target for time manipulation!`;
        }
        
        battleManager.addCombatLog(`⏰ ${gwenMessage}`, 'info');

        // Send sync data to guest immediately
        this.sendBigGwenStartUpdate(battleManager);
    }

    // Select a random target from the given side
    selectRandomTarget(battleManager, side) {
        const heroes = side === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
        const allTargets = [];

        // Collect all possible targets (heroes and creatures)
        for (const position of ['left', 'center', 'right']) {
            const hero = heroes[position];
            if (hero && hero.alive) {
                // Add hero as potential target
                allTargets.push({
                    heroPosition: position,
                    type: 'hero',
                    hero: hero
                });

                // Add living creatures as potential targets
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            allTargets.push({
                                heroPosition: position,
                                type: 'creature',
                                creatureIndex: index,
                                creature: creature
                            });
                        }
                    });
                }
            }
        }

        if (allTargets.length === 0) return null;

        // Use battleManager's deterministic random selection
        const randomIndex = battleManager.getRandomInt(0, allTargets.length - 1);
        return allTargets[randomIndex];
    }

    // Create target selection animation
    async createTargetSelectionAnimation(battleManager, target, side) {
        if (!target) return;

        const targetElement = this.getTargetElement(target, side);
        if (!targetElement) return;

        // Create time-themed animation container
        const animationContainer = document.createElement('div');
        animationContainer.className = 'bigGwen-target-selection';
        animationContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 998;
            overflow: hidden;
        `;

        // Create pocket watch elements
        for (let i = 0; i < 6; i++) {
            const watch = document.createElement('div');
            watch.innerHTML = '⏰';
            watch.style.cssText = `
                position: absolute;
                font-size: 24px;
                color: #FFD700;
                text-shadow: 0 0 10px #FFD700, 0 0 20px #FFA500;
                animation: bigGwenPocketWatch 3s ease-in-out infinite;
                animation-delay: ${i * 0.5}s;
                transform-origin: center;
            `;
            
            // Position watches around the target
            const angle = (i * 60) * Math.PI / 180;
            const radius = 80;
            const x = 50 + Math.cos(angle) * radius / 2;
            const y = 50 + Math.sin(angle) * radius / 2;
            
            watch.style.left = `${x}%`;
            watch.style.top = `${y}%`;
            watch.style.transform = 'translate(-50%, -50%)';
            
            animationContainer.appendChild(watch);
        }

        // Create star particles
        for (let i = 0; i < 12; i++) {
            const star = document.createElement('div');
            star.innerHTML = '✨';
            star.style.cssText = `
                position: absolute;
                font-size: 16px;
                color: #87CEEB;
                text-shadow: 0 0 8px #87CEEB;
                animation: bigGwenStarParticle 2s ease-in-out infinite;
                animation-delay: ${i * 0.2}s;
            `;
            
            // Random positioning
            star.style.left = `${20 + Math.random() * 60}%`;
            star.style.top = `${20 + Math.random() * 60}%`;
            star.style.transform = 'translate(-50%, -50%)';
            
            animationContainer.appendChild(star);
        }

        // Create central time indicator
        const timeIndicator = document.createElement('div');
        timeIndicator.innerHTML = '⏳';
        timeIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 32px;
            color: #DAA520;
            text-shadow: 0 0 15px #DAA520, 0 0 30px #FFD700;
            animation: bigGwenTimeIndicator 1.5s ease-in-out infinite;
            z-index: 1000;
        `;
        
        animationContainer.appendChild(timeIndicator);

        // Add to target element
        targetElement.style.position = 'relative';
        targetElement.appendChild(animationContainer);

        // Log selection
        const targetName = target.type === 'hero' ? target.hero.name : target.creature.name;
        battleManager.addCombatLog(
            `⏰ ${targetName} has been chosen by Big Gwen's time magic!`,
            side === 'player' ? 'success' : 'info'
        );

        // Remove animation after delay
        setTimeout(() => {
            if (animationContainer.parentNode) {
                animationContainer.remove();
            }
        }, 4000);
    }

    // Get the DOM element for a target
    getTargetElement(target, side) {
        if (target.type === 'hero') {
            return document.querySelector(`.${side}-slot.${target.heroPosition}-slot .battle-hero-card`);
        } else if (target.type === 'creature') {
            return document.querySelector(
                `.${side}-slot.${target.heroPosition}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }
        return null;
    }

    // Check if a target should get BigGwen bonus action (called from buildActorList)
    shouldGetBigGwenBonus(actor, battleManager) {
        if (!this.isActive) return false;

        // Handle both sides having BigGwen
        if (this.ownerSide === 'both') {
            // Check player side target
            if (actor.hero.side === 'player' && this.selectedTarget) {
                if (this.matchesTarget(actor, this.selectedTarget)) {
                    return true;
                }
            }
            // Check opponent side target
            if (actor.hero.side === 'opponent' && this.opponentSelectedTarget) {
                if (this.matchesTarget(actor, this.opponentSelectedTarget)) {
                    return true;
                }
            }
            return false;
        }

        // Single side BigGwen
        const expectedSide = this.ownerSide === 'player' ? 'player' : 'opponent';
        if (actor.hero.side !== expectedSide) return false;

        const targetToCheck = this.selectedTarget;
        return this.matchesTarget(actor, targetToCheck);
    }

    // Check if an actor matches the selected target
    matchesTarget(actor, target) {
        if (!target) return false;

        if (target.type === 'hero' && actor.type === 'hero') {
            return actor.hero.position === target.heroPosition;
        } else if (target.type === 'creature' && actor.type === 'creature') {
            return actor.hero.position === target.heroPosition && 
                   actor.index === target.creatureIndex;
        }

        return false;
    }

    // Create persistent clock animation overlay
    createClockAnimation(battleManager) {
        // Remove existing clock if present
        this.removeClockAnimation();

        const battleArena = document.getElementById('battleArena');
        if (!battleArena) return;

        // Create clock overlay
        this.clockOverlay = document.createElement('div');
        this.clockOverlay.className = 'bigGwen-clock-overlay';
        this.clockOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: -200px;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        `;

        // Create giant clock
        this.createGiantClock();

        battleArena.appendChild(this.clockOverlay);

        // Add BigGwen CSS if not already present
        this.injectBigGwenCSS();
    }

    // Create giant clock background
    createGiantClock() {
        if (!this.clockOverlay) return;

        const clock = document.createElement('div');
        clock.className = 'bigGwen-giant-clock';
        
        clock.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80vmin;
            height: 80vmin;
            border: 8px solid rgba(184, 134, 11, 0.3);
            border-radius: 50%;
            background: radial-gradient(
                circle,
                rgba(255, 215, 0, 0.1) 0%,
                rgba(184, 134, 11, 0.05) 50%,
                transparent 100%
            );
            opacity: 0.6;
            animation: bigGwenClockTick 2s ease-in-out infinite;
        `;

        // Create clock face markings
        for (let i = 0; i < 12; i++) {
            const marking = document.createElement('div');
            marking.style.cssText = `
                position: absolute;
                top: 5%;
                left: 50%;
                width: 2px;
                height: 10%;
                background: rgba(184, 134, 11, 0.5);
                transform-origin: bottom center;
                transform: translateX(-50%) rotate(${i * 30}deg);
            `;
            clock.appendChild(marking);
        }

        // Create hour hand
        const hourHand = document.createElement('div');
        hourHand.style.cssText = `
            position: absolute;
            top: 30%;
            left: 50%;
            width: 3px;
            height: 20%;
            background: rgba(184, 134, 11, 0.7);
            transform-origin: bottom center;
            transform: translateX(-50%);
            animation: bigGwenHourHand 240s linear infinite;
        `;
        clock.appendChild(hourHand);

        // Create minute hand
        const minuteHand = document.createElement('div');
        minuteHand.style.cssText = `
            position: absolute;
            top: 20%;
            left: 50%;
            width: 2px;
            height: 30%;
            background: rgba(184, 134, 11, 0.8);
            transform-origin: bottom center;
            transform: translateX(-50%);
            animation: bigGwenMinuteHand 20s linear infinite;
        `;
        clock.appendChild(minuteHand);

        // Create center dot
        const center = document.createElement('div');
        center.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 12px;
            height: 12px;
            background: rgba(184, 134, 11, 0.9);
            border-radius: 50%;
            transform: translate(-50%, -50%);
        `;
        clock.appendChild(center);

        this.clockOverlay.appendChild(clock);
    }

    // Send BigGwen start update to guest
    sendBigGwenStartUpdate(battleManager) {
        battleManager.sendBattleUpdate('big_gwen_start', {
            ownerSide: this.ownerSide,
            activeBigGwenCount: this.activeBigGwenCount,
            selectedTarget: this.selectedTarget,
            opponentSelectedTarget: this.opponentSelectedTarget,
            reason: 'battle_start',
            timestamp: Date.now()
        });
    }

    // Handle guest BigGwen start
    async handleGuestBigGwenStart(data) {
        if (!data) return;

        this.isActive = true;
        this.ownerSide = data.ownerSide;
        this.activeBigGwenCount = data.activeBigGwenCount;
        this.selectedTarget = data.selectedTarget;
        this.opponentSelectedTarget = data.opponentSelectedTarget;
        
        // Create clock animation for guest
        this.createClockAnimation();

        // ADD THIS: Create target selection animations from guest perspective
        await this.createGuestTargetSelectionAnimations(data);

        // Log message for guest
        if (data.reason === 'battle_start') {
            let gwenMessage = '';
            if (this.ownerSide === 'both') {
                gwenMessage = `Time magic fills the battlefield! Both players have chosen their time-blessed targets!`;
            } else if (this.ownerSide === 'player') {
                gwenMessage = `Big Gwen's time magic activates! A target has been chosen for temporal acceleration!`;
            } else {
                gwenMessage = `The opponent's Big Gwen chooses a target for time manipulation!`;
            }
            
            if (window.battleManager) {
                window.battleManager.addCombatLog(`⏰ ${gwenMessage}`, 'info');
            }
        }
    }

    // Create target selection animations for guest (with perspective mapping)
    async createGuestTargetSelectionAnimations(data) {
        if (!window.battleManager) return;

        // Map host perspective to guest perspective
        // From guest's view: host's "player" = guest's "opponent", host's "opponent" = guest's "player"
        
        if (this.ownerSide === 'player' || this.ownerSide === 'both') {
            // Host's player side has BigGwen, which is guest's opponent side
            if (data.selectedTarget) {
                await this.createTargetSelectionAnimation(
                    window.battleManager, 
                    data.selectedTarget, 
                    'opponent' // Guest sees this as opponent target
                );
            }
        }

        if (this.ownerSide === 'opponent' || this.ownerSide === 'both') {
            // Host's opponent side has BigGwen, which is guest's player side
            const targetToAnimate = this.ownerSide === 'both' ? data.opponentSelectedTarget : data.selectedTarget;
            if (targetToAnimate) {
                await this.createTargetSelectionAnimation(
                    window.battleManager, 
                    targetToAnimate, 
                    'player' // Guest sees this as their own target
                );
            }
        }
    }

    // Remove clock animation
    removeClockAnimation() {
        if (this.clockOverlay) {
            if (this.clockOverlay.parentNode) {
                this.clockOverlay.parentNode.removeChild(this.clockOverlay);
            }
            this.clockOverlay = null;
        }

        // Clear animation intervals
        this.animationIntervals.forEach(interval => clearInterval(interval));
        this.animationIntervals = [];
    }

    // Inject BigGwen-specific CSS
    injectBigGwenCSS() {
        if (document.getElementById('bigGwenStyles')) return;

        const style = document.createElement('style');
        style.id = 'bigGwenStyles';
        style.textContent = `
            @keyframes bigGwenClockTick {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 0.6;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.02);
                    opacity: 0.8;
                }
            }

            @keyframes bigGwenHourHand {
                0% { transform: translateX(-50%) rotate(0deg); }
                100% { transform: translateX(-50%) rotate(360deg); }
            }

            @keyframes bigGwenMinuteHand {
                0% { transform: translateX(-50%) rotate(0deg); }
                100% { transform: translateX(-50%) rotate(360deg); }
            }

            @keyframes bigGwenPocketWatch {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    opacity: 0.7;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
                    opacity: 1;
                }
            }

            @keyframes bigGwenStarParticle {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0.6;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 1;
                }
            }

            @keyframes bigGwenTimeIndicator {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    opacity: 0.8;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.3) rotate(180deg);
                    opacity: 1;
                }
            }

            .bigGwen-clock-overlay .bigGwen-giant-clock {
                will-change: transform, opacity;
            }

            .bigGwen-target-selection {
                will-change: transform, opacity;
            }
        `;

        document.head.appendChild(style);
    }

    // Export state for checkpoints/persistence
    exportState() {
        return {
            isActive: this.isActive,
            selectedTarget: this.selectedTarget,
            opponentSelectedTarget: this.opponentSelectedTarget,
            ownerSide: this.ownerSide,
            activeBigGwenCount: this.activeBigGwenCount
        };
    }

    // Import state from checkpoint system
    importState(state) {
        if (!state) return;
        
        const wasActive = this.isActive;
        this.isActive = state.isActive || false;
        this.selectedTarget = state.selectedTarget || null;
        this.opponentSelectedTarget = state.opponentSelectedTarget || null;
        this.ownerSide = state.ownerSide || null;
        this.activeBigGwenCount = state.activeBigGwenCount || 0;
        
        // Only restart if animation wasn't already running
        if (this.isActive && !wasActive) {
            setTimeout(() => {
                this.restartClockAnimation();
            }, 500);
        }
    }

    // Restart clock animation (for reconnection)
    restartClockAnimation() {
        if (!this.isActive) return;
        
        // Remove existing animation
        this.removeClockAnimation();
        
        // Recreate animation
        setTimeout(() => {
            this.createClockAnimation();
        }, 200);
    }

    // Cleanup
    cleanup() {
        this.isActive = false;
        this.selectedTarget = null;
        this.opponentSelectedTarget = null;
        this.ownerSide = null;
        this.activeBigGwenCount = 0;
        this.removeClockAnimation();
    }
}

// Functions for managing BigGwen externally

// Initialize a BigGwen area
export function initializeBigGwenArea(areaCard) {
    if (areaCard && areaCard.name === 'BigGwen') {
        // BigGwen doesn't use counters like GatheringStorm
        // Its effect is based on presence and target selection
    }
    return areaCard;
}

// Apply BigGwen effects at battle start
export async function applyBigGwenBattleEffects(battleManager) {
    if (!battleManager.bigGwenEffect) {
        battleManager.bigGwenEffect = new BigGwenEffect();
    }
    
    await battleManager.bigGwenEffect.applyBigGwenEffects(battleManager);
}

// Handle guest BigGwen start
export function handleGuestBigGwenStart(data, battleManager) {
    if (!battleManager.bigGwenEffect) {
        battleManager.bigGwenEffect = new BigGwenEffect();
    }
    
    battleManager.bigGwenEffect.handleGuestBigGwenStart(data);
}

export default BigGwenEffect;