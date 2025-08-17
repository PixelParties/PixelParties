// ./Creatures/crumTheClassPet.js - Crum The Class Pet Creature with Counter System and Extra Hero Turns

export class CrumTheClassPetCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        // Crum The Class Pet stats
        this.MAX_COUNTERS = 2; // Crum needs only 2 counters to activate
        
        // Inject CSS styles
        this.injectCrumStyles();
        
        console.log('🐹 Crum The Class Pet Creature module initialized');
    }

    // Check if a creature is Crum The Class Pet
    static isCrumTheClassPet(creatureName) {
        return creatureName === 'CrumTheClassPet';
    }

    // Execute Crum The Class Pet special action - gain counter or grant extra turn
    async executeCrumTheClassPetAction(crumActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const crum = crumActor.data;
        const crumHero = crumActor.hero;
        const attackerSide = crumHero.side;
        
        // Safety check: ensure Crum is still alive
        if (!crum.alive || crum.currentHp <= 0) {
            console.log(`Crum The Class Pet is dead, cannot execute action`);
            return;
        }
        
        // Initialize counters if not present
        if (crum.counters === undefined) {
            crum.counters = 0;
        }
        
        // Gain a counter
        crum.counters++;
        
        this.battleManager.addCombatLog(
            `🐹 ${crum.name} gains a counter (${crum.counters}/${this.MAX_COUNTERS})!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Update counter display for all players
        this.sendCounterUpdate(crumActor, position);
        
        // Show excitement animation for gaining counter
        await this.showCounterGainAnimation(crumActor, position);
        
        // Check if ready to grant extra turn
        if (crum.counters >= this.MAX_COUNTERS) {
            // Reset counters
            crum.counters = 0;
            
            this.battleManager.addCombatLog(
                `🎓 ${crum.name} is excited! Granting extra turn to ${crumHero.name}!`, 
                attackerSide === 'player' ? 'success' : 'error'
            );

            // Update counter display after reset
            this.sendCounterUpdate(crumActor, position);
            
            // Short delay for dramatic effect
            await this.battleManager.delay(500);
            
            // Grant extra turn to the hero
            await this.grantExtraHeroTurn(crumActor, position);
        }
    }

    // Execute a single hero extra turn with proper side-based targeting
    async executeSingleHeroExtraTurn(hero, position) {
        await this.battleManager.combatManager.executeAdditionalAction(hero, position);

    }

    // Check if a hero is a ranged attacker (copied from combat manager)
    isRangedAttacker(hero) {
        // For now, Darge always uses ranged attacks as proof of concept
        return hero.name === 'Darge';
    }

    // Create a hero proxy that only exposes enabled spells (copied from combat manager)
    createHeroWithEnabledSpellsOnly(hero) {
        return new Proxy(hero, {
            get(target, prop) {
                if (prop === 'getAllSpells') {
                    return (enabledOnly = true) => target.getAllSpells(enabledOnly);
                }
                if (prop === 'hasSpell') {
                    return (spellName, enabledOnly = true) => target.hasSpell(spellName, enabledOnly);
                }
                if (prop === 'getSpell') {
                    return (spellName, enabledOnly = true) => target.getSpell(spellName, enabledOnly);
                }
                if (prop === 'getSpellCount') {
                    return (enabledOnly = true) => target.getSpellCount(enabledOnly);
                }
                if (prop === 'getSpecificSpellCount') {
                    return (spellName, enabledOnly = true) => target.getSpecificSpellCount(spellName, enabledOnly);
                }
                return target[prop];
            }
        });
    }

    // Grant an extra turn to the hero who owns Crum
    async grantExtraHeroTurn(crumActor, position) {
        const crumHero = crumActor.hero;
        const attackerSide = crumHero.side;
        
        // Check if hero is still alive
        if (!crumHero.alive || crumHero.currentHp <= 0) {
            this.battleManager.addCombatLog(
                `💀 ${crumHero.name} is dead - Crum's inspiration fizzles!`, 
                'info'
            );
            
            // Send fizzle update to guest
            this.sendExtraActionUpdate(crumActor, position, false, 'hero_dead');
            return;
        }
        
        // Log the extra turn
        this.battleManager.addCombatLog(
            `⚡ ${crumHero.name} takes an extra turn inspired by ${crumActor.data.name}!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Create visual effect showing inspiration
        this.createInspirationEffect(crumHero, crumActor);

        // Send synchronization data to guest
        this.sendExtraActionUpdate(crumActor, position, true, 'success');

        // Small delay to ensure guest receives the message
        await this.battleManager.delay(50);

        // Check if hero can take action (not stunned/frozen)
        let canAct = true;
        if (this.battleManager.statusEffectsManager && 
            !this.battleManager.statusEffectsManager.canTakeAction(crumHero)) {
            const stunned = this.battleManager.statusEffectsManager.hasStatusEffect(crumHero, 'stunned');
            const frozen = this.battleManager.statusEffectsManager.hasStatusEffect(crumHero, 'frozen');
            
            if (stunned || frozen) {
                const condition = stunned ? 'stunned' : 'frozen';
                this.battleManager.addCombatLog(
                    `🐹❄️ ${crumHero.name} is ${condition} and cannot take extra action!`,
                    attackerSide === 'player' ? 'error' : 'success'
                );
                canAct = false;
            }
        }

        if (canAct) {
            // Execute a single hero extra turn using the hero's actual side
            await this.executeSingleHeroExtraTurn(crumHero, position);
        }
    }

    // Show excitement animation for counter gain
    async showCounterGainAnimation(crumActor, position) {
        const attackerSide = crumActor.hero.side;
        const crumElement = this.getCrumElement(attackerSide, position, crumActor.index);
        
        if (!crumElement) return;

        const rect = crumElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const excitementAnimation = document.createElement('div');
        excitementAnimation.className = 'crum-counter-gain';
        excitementAnimation.innerHTML = '🎒';
        excitementAnimation.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            font-size: 24px;
            transform: translate(-50%, -50%);
            z-index: 1600;
            pointer-events: none;
            animation: crumCounterGain 1s ease-out forwards;
        `;

        document.body.appendChild(excitementAnimation);

        // Remove animation after completion
        setTimeout(() => {
            if (excitementAnimation.parentNode) {
                excitementAnimation.remove();
            }
        }, 1000);

        await this.battleManager.delay(300);
    }

    // Create inspiration effect showing Crum inspiring the hero
    createInspirationEffect(hero, crumActor) {
        const heroElement = this.battleManager.getHeroElement(hero.side, hero.position);
        if (!heroElement) {
            console.warn('Could not find hero element for Crum inspiration effect');
            return;
        }

        // Ensure CSS exists
        this.ensureCrumCSS();

        // Create inspiration effect container
        const inspirationContainer = document.createElement('div');
        inspirationContainer.className = 'crum-inspiration-effect';

        // Create multiple inspiration symbols
        const inspirationSymbols = ['✨', '🌟', '💫', '⭐', '🎓'];
        const symbolCount = 5;
        
        for (let i = 0; i < symbolCount; i++) {
            const symbol = document.createElement('div');
            symbol.className = 'inspiration-symbol';
            symbol.innerHTML = inspirationSymbols[i % inspirationSymbols.length];

            // Position symbols around hero in a circle
            const angle = (i / symbolCount) * 360 + Math.random() * 30;
            const radius = 40 + Math.random() * 15;
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;

            const animationDelay = (i * 100) + 'ms';
            const animationDuration = this.battleManager.getSpeedAdjustedDelay(2500 + Math.random() * 500) + 'ms';

            symbol.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                font-size: ${18 + Math.random() * 6}px;
                transform: translate(-50%, -50%) translate(${x}px, ${y}px);
                animation: crumInspirationFloat ${animationDuration} ease-out ${animationDelay} forwards;
                pointer-events: none;
                z-index: 350;
                text-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
            `;

            inspirationContainer.appendChild(symbol);
        }

        // Create pulsing golden aura around hero
        const aura = document.createElement('div');
        aura.className = 'crum-inspiration-aura';
        aura.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border: 3px solid rgba(255, 215, 0, 0.6);
            border-radius: 50%;
            animation: crumInspirationPulse ${this.battleManager.getSpeedAdjustedDelay(1500)}ms ease-in-out infinite;
            pointer-events: none;
            z-index: 340;
        `;
        inspirationContainer.appendChild(aura);

        inspirationContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 340;
        `;

        heroElement.appendChild(inspirationContainer);

        // Clean up after action completes
        const cleanupDelay = this.battleManager.getSpeedAdjustedDelay(3000);
        setTimeout(() => {
            if (inspirationContainer && inspirationContainer.parentNode) {
                inspirationContainer.remove();
            }
        }, cleanupDelay);
    }

    // Get the DOM element for Crum creature
    getCrumElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Send counter update to guest for synchronization
    sendCounterUpdate(crumActor, position) {
        const attackerSide = crumActor.hero.side;
        
        this.battleManager.sendBattleUpdate('creature_counter_update', {
            creatureData: {
                side: attackerSide,
                position: position,
                creatureIndex: crumActor.index,
                name: crumActor.data.name,
                absoluteSide: crumActor.hero.absoluteSide,
                counters: crumActor.data.counters || 0
            }
        });
    }

    // Send extra action data to guest for synchronization
    sendExtraActionUpdate(crumActor, position, success, reason) {
        const attackerSide = crumActor.hero.side;
        
        this.battleManager.sendBattleUpdate('crum_extra_action', {
            crumData: {
                side: attackerSide,
                position: position,
                creatureIndex: crumActor.index,
                name: crumActor.data.name,
                absoluteSide: crumActor.hero.absoluteSide
            },
            heroData: {
                side: attackerSide,
                position: position,
                name: crumActor.hero.name,
                absoluteSide: crumActor.hero.absoluteSide,
                alive: crumActor.hero.alive
            },
            success: success,
            reason: reason,
            timestamp: Date.now()
        });
    }

    // Handle counter update on guest side
    handleGuestCounterUpdate(data) {
        const { creatureData } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const creatureLocalSide = (creatureData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Update counter display
        this.updateCreatureCounterDisplay(
            creatureLocalSide,
            creatureData.position,
            creatureData.creatureIndex,
            creatureData.counters
        );
    }

    // Handle Crum extra action on guest side
    handleGuestExtraAction(data) {
        const { crumData, heroData, success, reason } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const crumLocalSide = (crumData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (success) {
            this.battleManager.addCombatLog(
                `🎓 ${crumData.name} is excited! Granting extra turn to ${heroData.name}!`, 
                crumLocalSide === 'player' ? 'success' : 'error'
            );

            this.battleManager.addCombatLog(
                `⚡ ${heroData.name} takes an extra turn inspired by ${crumData.name}!`,
                crumLocalSide === 'player' ? 'success' : 'error'
            );

            // Find the hero for visual effect
            const heroes = crumLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[heroData.position];
            
            if (hero) {
                // Create visual effect
                const crumActor = { data: { name: crumData.name } };
                this.createInspirationEffect(hero, crumActor);
            }
        } else {
            if (reason === 'hero_dead') {
                this.battleManager.addCombatLog(
                    `💀 ${heroData.name} is dead - Crum's inspiration fizzles!`,
                    'info'
                );
            }
        }
    }

    // Update creature counter display (reused from MoonlightButterfly pattern)
    updateCreatureCounterDisplay(side, position, creatureIndex, counters) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;

        // Remove existing counter display
        const existingCounter = creatureElement.querySelector('.creature-counter-display');
        if (existingCounter) {
            existingCounter.remove();
        }

        // Add new counter display if counters > 0
        if (counters > 0) {
            const counterDisplay = document.createElement('div');
            counterDisplay.className = 'creature-counter-display';
            counterDisplay.textContent = counters;
            counterDisplay.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: white;
                color: #333;
                border: 2px solid #666;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 10;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            `;
            
            creatureElement.appendChild(counterDisplay);
        }
    }

    // Ensure CSS for Crum effects exists
    ensureCrumCSS() {
        if (document.getElementById('crumStyles')) return;

        const style = document.createElement('style');
        style.id = 'crumStyles';
        style.textContent = `
            @keyframes crumInspirationFloat {
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

            @keyframes crumInspirationPulse {
                0% {
                    opacity: 0.3;
                    transform: scale(1);
                    border-color: rgba(255, 215, 0, 0.6);
                }
                50% {
                    opacity: 0.8;
                    transform: scale(1.1);
                    border-color: rgba(255, 215, 0, 0.9);
                }
                100% {
                    opacity: 0.3;
                    transform: scale(1);
                    border-color: rgba(255, 215, 0, 0.6);
                }
            }

            .crum-inspiration-effect {
                will-change: transform, opacity;
            }

            .inspiration-symbol {
                will-change: transform, opacity;
                filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8));
                font-weight: bold;
            }

            .crum-inspiration-aura {
                will-change: transform, opacity;
                box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
            }
        `;

        document.head.appendChild(style);
    }

    // Clean up all active effects (called on battle end/reset)
    cleanup() {
        console.log(`Cleaning up Crum The Class Pet effects`);
        
        // Remove any orphaned effect elements
        try {
            const orphanedEffects = document.querySelectorAll('.crum-inspiration-effect');
            orphanedEffects.forEach(effect => {
                if (effect.parentNode) {
                    effect.remove();
                }
            });
            
            if (orphanedEffects.length > 0) {
                console.log(`Cleaned up ${orphanedEffects.length} orphaned Crum effects`);
            }
        } catch (error) {
            console.warn('Error cleaning up orphaned Crum effects:', error);
        }
    }

    // Inject CSS styles for Crum effects
    injectCrumStyles() {
        if (document.getElementById('crumStyles')) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = 'crumStyles';
        style.textContent = `
            /* Crum Counter Gain Animation */
            @keyframes crumCounterGain {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -70%) scale(1.2) rotate(180deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -90%) scale(0.8) rotate(360deg);
                }
            }

            /* Crum Inspiration Float Animation */
            @keyframes crumInspirationFloat {
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

            /* Crum Inspiration Pulse Animation */
            @keyframes crumInspirationPulse {
                0% {
                    opacity: 0.3;
                    transform: scale(1);
                    border-color: rgba(255, 215, 0, 0.6);
                }
                50% {
                    opacity: 0.8;
                    transform: scale(1.1);
                    border-color: rgba(255, 215, 0, 0.9);
                }
                100% {
                    opacity: 0.3;
                    transform: scale(1);
                    border-color: rgba(255, 215, 0, 0.6);
                }
            }

            /* Enhanced creature glow when Crum is excited */
            .creature-icon.crum-excited .creature-sprite {
                filter: brightness(1.5) drop-shadow(0 0 15px rgba(255, 215, 0, 0.9));
                animation: crumExcitedGlow 1.5s ease-in-out infinite alternate;
            }

            @keyframes crumExcitedGlow {
                0% { 
                    filter: brightness(1.5) drop-shadow(0 0 15px rgba(255, 215, 0, 0.9));
                }
                100% { 
                    filter: brightness(2) drop-shadow(0 0 25px rgba(255, 215, 0, 1));
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Static helper methods
export const CrumTheClassPetHelpers = {
    // Check if any creature in a list is Crum The Class Pet
    hasCrumTheClassPetInList(creatures) {
        return creatures.some(creature => CrumTheClassPetCreature.isCrumTheClassPet(creature.name));
    },

    // Get all Crum The Class Pet creatures from a list
    getCrumTheClassPetFromList(creatures) {
        return creatures.filter(creature => CrumTheClassPetCreature.isCrumTheClassPet(creature.name));
    }
};

export default CrumTheClassPetCreature;