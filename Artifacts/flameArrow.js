// flameArrow.js - Flame Arrow Equip Artifact
// Provides Flame Arrow Counters that enhance attacks with extra damage and burn

export class FlameArrowEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.name = 'FlameArrow';
        this.arrowType = 'FlameArrow';
        
        console.log('🔥🏹 FlameArrow effect initialized');
    }


    // ============================================
    // ARROW CONFIGURATION
    // ============================================
    
    getArrowConfig() {
        return {
            name: 'FlameArrow',
            displayName: 'Flame Arrow',
            icon: '🔥🏹',
            counterDisplay: {
                background: 'linear-gradient(45deg, #ff4500, #ff6500)',
                borderColor: '#ffaa00',
                shadowColor: 'rgba(255, 100, 0, 0.6)'
            }
        };
    }
    
    // ============================================
    // COUNTER MANAGEMENT
    // ============================================
    
    // Count how many Flame Arrows the hero has equipped
    countFlameArrows(hero) {
        if (!hero || !hero.equipment || hero.equipment.length === 0) {
            return 0;
        }
        
        return hero.equipment.filter(equip => {
            const equipName = equip.name || equip.cardName;
            return equipName === 'FlameArrow';
        }).length;
    }
    
    // Initialize Flame Arrow Counters for all heroes at battle start
    initializeFlameArrowCounters() {
        console.log('🔥🏹 Initializing Flame Arrow Counters...');
        
        // Initialize for both sides
        ['player', 'opponent'].forEach(side => {
            const heroes = side === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            
            ['left', 'center', 'right'].forEach(position => {
                const hero = heroes[position];
                if (hero && hero.alive) {
                    const flameArrowCount = this.countFlameArrows(hero);
                    
                    if (flameArrowCount > 0) {
                        // Initialize counters
                        hero.flameArrowCounters = flameArrowCount;
                        
                        console.log(`🔥🏹 ${hero.name} receives ${flameArrowCount} Flame Arrow Counter${flameArrowCount > 1 ? 's' : ''}`);
                        
                        this.battleManager.addCombatLog(
                            `🔥🏹 ${hero.name} receives ${flameArrowCount} Flame Arrow Counter${flameArrowCount > 1 ? 's' : ''}!`,
                            side === 'player' ? 'success' : 'info'
                        );
                    } else {
                        // Ensure property exists
                        hero.flameArrowCounters = 0;
                    }
                }
            });
        });
        
        // Update visual displays
        this.updateAllFlameArrowDisplays();
    }
    
    // Get current counter count for a hero
    getFlameArrowCounters(hero) {
        return hero.flameArrowCounters || 0;
    }
    
    // Check if hero has any counters
    hasFlameArrowCounters(hero) {
        return this.getFlameArrowCounters(hero) > 0;
    }
    
    // Remove one counter from hero
    removeFlameArrowCounter(hero) {
        if (!hero.flameArrowCounters || hero.flameArrowCounters <= 0) return false;
        
        hero.flameArrowCounters--;
        console.log(`🔥🏹 ${hero.name} uses Flame Arrow Counter (${hero.flameArrowCounters} remaining)`);
        
        // Update display
        this.updateFlameArrowDisplay(hero.side, hero.position, hero);
        
        return true;
    }
    
    // ============================================
    // DAMAGE MODIFICATION
    // ============================================
    
    // Check if hero should get damage bonus and calculate it
    calculateDamageBonus(attacker, target, baseDamage) {
        if (!attacker || !attacker.alive || !this.hasFlameArrowCounters(attacker)) {
            return { modifiedDamage: baseDamage, shouldApplyEffects: false };
        }
        
        // Consume a counter NOW when applying the damage bonus
        const counterUsed = this.removeFlameArrowCounter(attacker);
        if (!counterUsed) {
            return { modifiedDamage: baseDamage, shouldApplyEffects: false };
        }
        
        // Add 50 damage
        const bonusDamage = 50;
        const modifiedDamage = baseDamage + bonusDamage;
        
        console.log(`🔥🏹 ${attacker.name} Flame Arrow enhances attack: ${baseDamage} → ${modifiedDamage} (+${bonusDamage})`);
        
        // Mark that we consumed a counter for this attacker
        attacker._flameArrowConsumedThisAttack = true;
        
        return { 
            modifiedDamage: modifiedDamage, 
            shouldApplyEffects: true,
            bonusDamage: bonusDamage
        };
    }
    
    // ============================================
    // ATTACK EFFECTS
    // ============================================
    
    // Process Flame Arrow effects on attack hit
    async processFlameArrowEffects(attacker, defender, damage, equipmentItem) {
        if (!attacker || !attacker.alive || !defender) return;
        
        // Check if we already consumed a counter during damage calculation
        if (attacker._flameArrowConsumedThisAttack) {
            // Clear the flag for next attack
            delete attacker._flameArrowConsumedThisAttack;
            
            // Apply burn effect (counter was already consumed)
            if (this.battleManager.statusEffectsManager) {
                this.battleManager.statusEffectsManager.applyStatusEffect(defender, 'burned', 1);
            }
            
            // Create fiery visual effect
            this.createFlameArrowImpactEffect(defender);
            
            // Add combat log
            this.battleManager.addCombatLog(
                `🔥🏹 ${attacker.name}'s Flame Arrow ignites ${defender.name}! (+50 damage, 1 burn)`,
                'info'
            );
            
            // Sync to guest if host
            if (this.battleManager.isAuthoritative) {
                this.battleManager.sendBattleUpdate('flame_arrow_impact', {
                    attackerAbsoluteSide: attacker.absoluteSide,
                    attackerPosition: attacker.position,
                    attackerCountersRemaining: this.getFlameArrowCounters(attacker),
                    defenderInfo: this.getDefenderSyncInfo(defender),
                    timestamp: Date.now()
                });
            }
        }
        // If no counter was consumed during damage calc, this effect doesn't trigger
        // This handles edge cases where the effect handler is called without damage calc
    }
    
    // ============================================
    // VISUAL EFFECTS
    // ============================================
    
    // Create fiery impact visual effect
    createFlameArrowImpactEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;
        
        // Create flame burst container
        const flameBurst = document.createElement('div');
        flameBurst.className = 'flame-arrow-burst';
        
        // Create multiple flame particles
        const flameCount = 8;
        for (let i = 0; i < flameCount; i++) {
            const flame = document.createElement('div');
            flame.className = 'flame-particle';
            flame.innerHTML = '🔥';
            
            const angle = (360 / flameCount) * i + (Math.random() * 30 - 15);
            const distance = 25 + Math.random() * 15;
            
            flame.style.cssText = `
                position: absolute;
                font-size: ${18 + Math.random() * 6}px;
                animation: flameParticleExplosion ${this.battleManager.getSpeedAdjustedDelay(900)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                z-index: 500;
            `;
            
            flameBurst.appendChild(flame);
        }
        
        // Add arrow impact symbol
        const arrowImpact = document.createElement('div');
        arrowImpact.className = 'arrow-impact';
        arrowImpact.innerHTML = '🏹💥';
        arrowImpact.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 32px;
            z-index: 510;
            animation: arrowImpactFlash ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
        `;
        
        flameBurst.appendChild(arrowImpact);
        
        // Position burst at target center
        flameBurst.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 500;
        `;
        
        targetElement.appendChild(flameBurst);
        
        // Add burning overlay effect
        const burnOverlay = document.createElement('div');
        burnOverlay.className = 'flame-arrow-overlay';
        burnOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(255, 100, 0, 0.4) 0%, transparent 70%);
            pointer-events: none;
            z-index: 490;
            animation: flameArrowPulse ${this.battleManager.getSpeedAdjustedDelay(700)}ms ease-out forwards;
        `;
        
        targetElement.appendChild(burnOverlay);
        
        // Clean up after animation
        setTimeout(() => {
            if (flameBurst.parentNode) flameBurst.remove();
            if (burnOverlay.parentNode) burnOverlay.remove();
        }, this.battleManager.getSpeedAdjustedDelay(900));
    }
    
    // ============================================
    // COUNTER DISPLAY MANAGEMENT
    // ============================================
    
    // Update Flame Arrow Counter display for a specific hero
    updateFlameArrowDisplay(side, position, hero) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement || !hero) return;
        
        // Remove existing display
        const existingDisplay = heroElement.querySelector('.flame-arrow-counter-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }
        
        const counters = this.getFlameArrowCounters(hero);
        
        // Only show display if hero has counters
        if (counters > 0) {
            const counterDisplay = document.createElement('div');
            counterDisplay.className = 'flame-arrow-counter-display';
            counterDisplay.innerHTML = `
                <div class="flame-arrow-icon">🔥🏹</div>
                <div class="flame-arrow-count">${counters}</div>
            `;
            
            counterDisplay.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                background: linear-gradient(45deg, #ff4500, #ff6500);
                border: 2px solid #ffaa00;
                border-radius: 8px;
                padding: 2px 6px;
                font-size: 11px;
                font-weight: bold;
                color: white;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                box-shadow: 0 2px 4px rgba(255, 100, 0, 0.6);
                z-index: 200;
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 3px;
            `;
            
            heroElement.appendChild(counterDisplay);
        }
    }
    
    // Update all Flame Arrow Counter displays
    updateAllFlameArrowDisplays() {
        ['left', 'center', 'right'].forEach(position => {
            ['player', 'opponent'].forEach(side => {
                const heroes = side === 'player' ? 
                    this.battleManager.playerHeroes : 
                    this.battleManager.opponentHeroes;
                const hero = heroes[position];
                
                if (hero) {
                    this.updateFlameArrowDisplay(side, position, hero);
                }
            });
        });
    }
    
    // ============================================
    // UTILITY METHODS
    // ============================================
    
    // Get target element
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
    }
    
    // Find creature information
    findCreatureInfo(creature) {
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            
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
    
    // Get defender sync info
    getDefenderSyncInfo(defender) {
        if (defender.type === 'hero' || !defender.type) {
            return {
                type: 'hero',
                absoluteSide: defender.absoluteSide,
                position: defender.position,
                name: defender.name
            };
        } else {
            const creatureInfo = this.findCreatureInfo(defender);
            if (!creatureInfo) return null;
            
            return {
                type: 'creature',
                absoluteSide: creatureInfo.hero.absoluteSide,
                position: creatureInfo.position,
                creatureIndex: creatureInfo.creatureIndex,
                name: defender.name
            };
        }
    }
    
    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================
    
    // Handle guest update for flame arrow impact
    handleGuestFlameArrowImpact(data) {
        const { attackerAbsoluteSide, attackerPosition, attackerCountersRemaining, defenderInfo } = data;
        
        // Update attacker's counter display
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const attackerLocalSide = (attackerAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const attackerHeroes = attackerLocalSide === 'player' ? 
            this.battleManager.playerHeroes : 
            this.battleManager.opponentHeroes;
        const attacker = attackerHeroes[attackerPosition];
        
        if (attacker) {
            // Sync counter count
            attacker.flameArrowCounters = attackerCountersRemaining;
            this.updateFlameArrowDisplay(attackerLocalSide, attackerPosition, attacker);
        }
        
        // Find the defender and create visual effect
        const defender = this.findDefenderFromSyncInfo(defenderInfo);
        if (defender) {
            this.createFlameArrowImpactEffect(defender);
        }
    }
    
    // Find defender from sync info
    findDefenderFromSyncInfo(defenderInfo) {
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const localSide = (defenderInfo.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        if (defenderInfo.type === 'hero') {
            const heroes = localSide === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            return heroes[defenderInfo.position];
        } else {
            const heroes = localSide === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            const hero = heroes[defenderInfo.position];
            return hero?.creatures?.[defenderInfo.creatureIndex];
        }
    }
    
    // ============================================
    // PERSISTENCE SUPPORT
    // ============================================
    
    // Export Flame Arrow state for checkpoints
    exportFlameArrowState() {
        const state = {
            playerCounters: {},
            opponentCounters: {}
        };
        
        // Export player hero counters
        ['left', 'center', 'right'].forEach(position => {
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero) {
                state.playerCounters[position] = this.getFlameArrowCounters(playerHero);
            }
            
            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero) {
                state.opponentCounters[position] = this.getFlameArrowCounters(opponentHero);
            }
        });
        
        return state;
    }
    
    // Import Flame Arrow state from checkpoints
    importFlameArrowState(state) {
        if (!state) return false;
        
        try {
            // Restore player hero counters
            ['left', 'center', 'right'].forEach(position => {
                const playerHero = this.battleManager.playerHeroes[position];
                if (playerHero && state.playerCounters && state.playerCounters[position] !== undefined) {
                    playerHero.flameArrowCounters = state.playerCounters[position];
                }
                
                const opponentHero = this.battleManager.opponentHeroes[position];
                if (opponentHero && state.opponentCounters && state.opponentCounters[position] !== undefined) {
                    opponentHero.flameArrowCounters = state.opponentCounters[position];
                }
            });
            
            // Update displays after restoration
            this.updateAllFlameArrowDisplays();
            
            console.log('🔥🏹 Flame Arrow state restored from checkpoint');
            return true;
        } catch (error) {
            console.error('Error importing Flame Arrow state:', error);
            return false;
        }
    }
    
    // ============================================
    // CSS AND CLEANUP
    // ============================================
    
    // Ensure CSS for flame arrow effects
    ensureFlameArrowCSS() {
        if (document.getElementById('flameArrowCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'flameArrowCSS';
        style.textContent = `
            @keyframes flameParticleExplosion {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) rotate(0deg) scale(0);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) rotate(120deg) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: 
                        translate(
                            calc(-50% + var(--distance) * cos(var(--angle))), 
                            calc(-50% + var(--distance) * sin(var(--angle)))
                        ) 
                        rotate(240deg) 
                        scale(0.3);
                }
            }
            
            @keyframes arrowImpactFlash {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(-10deg);
                }
                40% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3) rotate(5deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1) rotate(0deg);
                }
            }
            
            @keyframes flameArrowPulse {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: scale(1);
                }
            }
            
            .flame-arrow-burst {
                will-change: transform, opacity;
            }
            
            .flame-particle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: center;
                will-change: transform, opacity;
                filter: drop-shadow(0 0 6px rgba(255, 100, 0, 0.8));
            }
            
            .arrow-impact {
                will-change: transform, opacity;
                filter: drop-shadow(0 0 8px rgba(255, 200, 0, 0.9));
            }
            
            .flame-arrow-overlay {
                will-change: transform, opacity;
                mix-blend-mode: screen;
            }
            
            .flame-arrow-counter-display {
                transition: all 0.3s ease;
                will-change: transform, opacity;
            }
            
            .flame-arrow-counter-display:hover {
                transform: scale(1.1);
            }
            
            .flame-arrow-icon {
                font-size: 10px;
                line-height: 1;
            }
            
            .flame-arrow-count {
                font-size: 11px;
                line-height: 1;
                min-width: 12px;
                text-align: center;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Cleanup
    cleanup() {
        // Remove all counter displays
        const displays = document.querySelectorAll('.flame-arrow-counter-display');
        displays.forEach(display => display.remove());
        
        // Remove CSS
        const css = document.getElementById('flameArrowCSS');
        if (css) css.remove();
        
        console.log('🔥🏹 FlameArrow effect cleaned up');
    }
}

// ============================================
// INTEGRATION FUNCTIONS
// ============================================

// Register FlameArrow with AttackEffectsManager
export function registerFlameArrow(attackEffectsManager, battleManager) {
    const flameArrowEffect = new FlameArrowEffect(battleManager);
    
    // Ensure CSS is loaded
    flameArrowEffect.ensureFlameArrowCSS();
    
    // Register damage modifier for the +50 damage bonus
    attackEffectsManager.registerDamageModifier('FlameArrow', {
        handler: (attacker, target, baseDamage) => {
            const result = flameArrowEffect.calculateDamageBonus(attacker, target, baseDamage);
            return result.modifiedDamage;
        }
    });
    
    // Register attack effect handler for burn application and counter removal
    attackEffectsManager.registerEffectHandler('FlameArrow', {
        trigger: 'on_attack_hit',
        handler: async (attacker, defender, damage, equipmentItem) => {
            await flameArrowEffect.processFlameArrowEffects(attacker, defender, damage, equipmentItem);
        }
    });
    
    // Store reference for access from other systems
    attackEffectsManager.flameArrowEffect = flameArrowEffect;
    
    console.log('🔥🏹 FlameArrow registered with AttackEffectsManager');
    
    return flameArrowEffect;
}

// Apply FlameArrow start-of-battle effects
export function applyFlameArrowStartOfBattleEffects(battleManager) {
    if (battleManager.attackEffectsManager && battleManager.attackEffectsManager.flameArrowEffect) {
        battleManager.attackEffectsManager.flameArrowEffect.initializeFlameArrowCounters();
        console.log('🔥🏹 FlameArrow start-of-battle effects applied');
    } else {
        console.warn('🔥🏹 FlameArrow effect not available for start-of-battle initialization');
    }
}

// Export for use in the game
export default FlameArrowEffect;