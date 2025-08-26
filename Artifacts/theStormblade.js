// Artifacts/theStormblade.js - TheStormblade Artifact with Post-Attack Wind Swaps

export class TheStormbladeEffect {
    constructor(attackEffectsManager, battleManager) {
        this.attackEffectsManager = attackEffectsManager;
        this.battleManager = battleManager;
        
        // Track active animations
        this.activeAnimations = 0;
        this.animationPromises = [];
        
        // NEW: Track recent attacks to prevent duplicate triggers
        this.recentAttacks = new Map(); // attackerId -> timestamp
        this.cooldownDuration = 100; // 100ms cooldown between attack effect triggers
        
        console.log('🌪️ TheStormblade effect initialized');
    }
    
    // Register TheStormblade as an attack effect
    register() {
        this.attackEffectsManager.registerEffectHandler('TheStormblade', {
            trigger: 'on_attack_hit',
            handler: this.handleStormbladeEffect.bind(this)
        });
        
        console.log('🌪️ TheStormblade registered as attack effect');
    }
    
    // Main handler for TheStormblade effect (triggered after each attack)
    async handleStormbladeEffect(attacker, defender, damage, equipmentItem) {
        if (!this.battleManager.isAuthoritative) return;
        
        // NEW: Check for recent attack from this attacker to prevent duplicate triggers
        const attackerId = this.getAttackerId(attacker);
        const now = Date.now();
        const lastTrigger = this.recentAttacks.get(attackerId);
        
        if (lastTrigger && (now - lastTrigger) < this.cooldownDuration) {
            console.log(`🌪️ Skipping duplicate Stormblade trigger for ${attacker.name} (${now - lastTrigger}ms ago)`);
            return;
        }
        
        // Count TheStormblade artifacts on the attacker
        const stormbladeCount = this.countStormblades(attacker);
        
        if (stormbladeCount === 0) return;
        
        // NEW: Record this trigger to prevent duplicates
        this.recentAttacks.set(attackerId, now);
        
        // Clean up old entries (older than 1 second)
        for (const [id, timestamp] of this.recentAttacks.entries()) {
            if (now - timestamp > 1000) {
                this.recentAttacks.delete(id);
            }
        }
        
        console.log(`🌪️ ${attacker.name} has ${stormbladeCount} Stormblade(s) - triggering wind swaps!`);
        
        // Determine enemy side (opposite of attacker)
        const enemySide = attacker.side === 'player' ? 'opponent' : 'player';
        
        // Apply wind swaps to enemy heroes (don't await - let it run in parallel)
        const animationPromise = this.applyStormbladeWindSwaps(enemySide, stormbladeCount, attacker);
        
        // Track this animation
        this.trackAnimation(animationPromise);
    }
    
    // Generate unique attacker ID for cooldown tracking
    getAttackerId(attacker) {
        return `${attacker.side}_${attacker.position}_${attacker.name}`;
    }
    
    // Track active animation
    trackAnimation(animationPromise) {
        this.activeAnimations++;
        this.animationPromises.push(animationPromise);
        
        console.log(`🌪️ Tracking animation - ${this.activeAnimations} active`);
        
        // When animation completes, remove from tracking
        animationPromise.finally(() => {
            this.activeAnimations = Math.max(0, this.activeAnimations - 1);
            this.animationPromises = this.animationPromises.filter(p => p !== animationPromise);
            console.log(`🌪️ Animation completed - ${this.activeAnimations} remaining`);
        });
    }
    
    // Check if any animations are currently active
    hasActiveAnimations() {
        return this.activeAnimations > 0;
    }
    
    // Wait for all active animations to complete
    async waitForAllAnimations() {
        if (this.animationPromises.length === 0) return;
        
        console.log(`🌪️ Waiting for ${this.animationPromises.length} animations to complete...`);
        await Promise.all([...this.animationPromises]); // Copy array to avoid mutation issues
        console.log(`🌪️ All animations completed`);
    }
    
    // Get estimated time remaining for animations
    getAnimationTimeRemaining() {
        if (this.activeAnimations === 0) return 0;
        // Each wind swap takes about 1600ms total
        return 1600; // Return max time in case animations just started
    }
    
    countStormblades(hero) {
        if (!hero.equipment || hero.equipment.length === 0) return 0;
        
        return hero.equipment.filter(item => {
            const itemName = item.name || item.cardName;
            return itemName === 'TheStormblade';
        }).length;
    }
    
    // Apply wind swaps to target side (adapted from CrusadersHookshot)
    async applyStormbladeWindSwaps(targetSide, stormbladeCount, attacker) {
        const sideLabel = targetSide === 'player' ? 'Player' : 'Opponent';
        const attackerLabel = attacker.side === 'player' ? 'Player' : 'Opponent';
        
        console.log(`🌪️ ${attackerLabel}'s Stormblade will wind-swap ${sideLabel} heroes ${stormbladeCount} time(s)`);

        // Get living heroes on target side
        const heroes = targetSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const livingPositions = [];
        ['left', 'center', 'right'].forEach(position => {
            if (heroes[position] && heroes[position].alive) {
                livingPositions.push(position);
            }
        });

        // Need at least 2 heroes to swap
        if (livingPositions.length < 2) {
            console.log(`🌪️ Not enough living heroes to swap (only ${livingPositions.length} alive)`);
            this.battleManager.addCombatLog(
                `🌪️ ${attacker.name}'s Stormblade finds no targets for wind swaps!`,
                'warning'
            );
            return;
        }

        // Log initial effect
        this.battleManager.addCombatLog(
            `🌪️ ${attacker.name}'s Stormblade unleashes ${stormbladeCount} wind burst(s)!`,
            'info'
        );

        // Track which positions have been swapped to avoid double-swapping
        const swappedPairs = new Set();

        // Perform swaps SEQUENTIALLY with enhanced synchronization
        for (let i = 0; i < stormbladeCount; i++) {
            // Find a valid pair to swap
            let attempts = 0;
            let position1 = null;
            let position2 = null;
            
            while (attempts < 10) {
                // Randomly select two different positions
                const shuffled = [...livingPositions].sort(() => this.battleManager.getRandom() - 0.5);
                position1 = shuffled[0];
                position2 = shuffled[1];
                
                // Check if this pair hasn't been swapped yet
                const pairKey = [position1, position2].sort().join('-');
                if (!swappedPairs.has(pairKey)) {
                    swappedPairs.add(pairKey);
                    break;
                }
                
                attempts++;
            }

            if (position1 && position2 && position1 !== position2) {
                console.log(`🌪️ Wind Swap #${i + 1}: Swapping ${position1} ↔ ${position2}`);
                
                // Generate unique swap ID for tracking using deterministic randomness
                const swapId = `wind_${Date.now()}_${i}_${this.battleManager.getRandomId(9)}`;
                
                // Send swap data to guest for animation sync
                const swapData = {
                    targetSide: targetSide,
                    position1: position1,
                    position2: position2,
                    windNumber: i + 1,
                    totalWinds: stormbladeCount,
                    attackerInfo: {
                        name: attacker.name,
                        side: attacker.side,
                        absoluteSide: attacker.absoluteSide
                    },
                    swapId: swapId
                };
                
                this.battleManager.sendBattleUpdate('stormblade_wind_swap', swapData);
                
                // Wait for guest acknowledgment at higher speeds
                if (this.battleManager.battleSpeed > 1) {
                    await this.battleManager.waitForGuestAcknowledgment('wind_swap_' + swapId, 300);
                }
                
                // Perform the swap with wind animation (AWAITED - this ensures sequential execution)
                await this.performWindSwap(targetSide, position1, position2);
                
                // Log the swap
                const hero1Name = heroes[position2].name; // After swap
                const hero2Name = heroes[position1].name; // After swap
                this.battleManager.addCombatLog(
                    `🌪️ Winds sweep ${hero1Name} and ${hero2Name} - they spin into new positions!`,
                    targetSide === 'player' ? 'error' : 'success'
                );
                
                // Speed-aware delay between swaps
                if (i < stormbladeCount - 1) {
                    const swapDelay = this.getSwapDelay();
                    await this.battleManager.delay(swapDelay);
                }
            }
        }
    }
    
    getSwapDelay() {
        const baseDelay = 500;
        const speedMultiplier = this.battleManager.battleSpeed || 1;
        
        // At higher speeds, ensure minimum visual time for swaps
        const minDelay = 300; // Minimum delay even at max speed
        const adjustedDelay = Math.max(minDelay, baseDelay / speedMultiplier);
        
        return adjustedDelay;
    }

    // Perform the actual hero swap with wind animation (adapted from CrusadersHookshot)
    async performWindSwap(side, position1, position2) {
        // Get hero references
        const heroes = side === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const hero1 = heroes[position1];
        const hero2 = heroes[position2];
        
        if (!hero1 || !hero2) {
            console.error(`🌪️ Cannot swap - missing heroes at ${position1} or ${position2}`);
            return;
        }

        // Animate the wind effect (this takes about 1600ms total)
        await this.animateWindSwap(side, position1, position2);

        // ===== SWAP IN HERO REFERENCES =====
        heroes[position1] = hero2;
        heroes[position2] = hero1;
        
        // Update hero position properties
        hero1.position = position2;
        hero2.position = position1;
        
        // ===== SWAP IN FORMATION DATA FOR PERSISTENCE =====
        const formation = side === 'player' ? 
            this.battleManager.playerFormation : 
            this.battleManager.opponentFormation;
        
        // Swap the formation data
        const tempFormationData = formation[position1];
        formation[position1] = formation[position2];
        formation[position2] = tempFormationData;
        
        console.log(`🌪️ Updated formation - ${position1} now has ${formation[position1]?.name}, ${position2} now has ${formation[position2]?.name}`);
        
        // ===== SWAP ABILITIES, SPELLBOOKS, CREATURES, AND EQUIPMENT DATA =====
        if (side === 'player') {
            // Swap player abilities
            if (this.battleManager.playerAbilities) {
                const tempAbilities = this.battleManager.playerAbilities[position1];
                this.battleManager.playerAbilities[position1] = this.battleManager.playerAbilities[position2];
                this.battleManager.playerAbilities[position2] = tempAbilities;
            }
            
            // Swap player spellbooks
            if (this.battleManager.playerSpellbooks) {
                const tempSpellbooks = this.battleManager.playerSpellbooks[position1];
                this.battleManager.playerSpellbooks[position1] = this.battleManager.playerSpellbooks[position2];
                this.battleManager.playerSpellbooks[position2] = tempSpellbooks;
            }
            
            // Swap player creatures
            if (this.battleManager.playerCreatures) {
                const tempCreatures = this.battleManager.playerCreatures[position1];
                this.battleManager.playerCreatures[position1] = this.battleManager.playerCreatures[position2];
                this.battleManager.playerCreatures[position2] = tempCreatures;
            }
            
            // Swap player equipment
            if (this.battleManager.playerEquips) {
                const tempEquips = this.battleManager.playerEquips[position1];
                this.battleManager.playerEquips[position1] = this.battleManager.playerEquips[position2];
                this.battleManager.playerEquips[position2] = tempEquips;
            }
        } else {
            // Swap opponent abilities
            if (this.battleManager.opponentAbilities) {
                const tempAbilities = this.battleManager.opponentAbilities[position1];
                this.battleManager.opponentAbilities[position1] = this.battleManager.opponentAbilities[position2];
                this.battleManager.opponentAbilities[position2] = tempAbilities;
            }
            
            // Swap opponent spellbooks
            if (this.battleManager.opponentSpellbooks) {
                const tempSpellbooks = this.battleManager.opponentSpellbooks[position1];
                this.battleManager.opponentSpellbooks[position1] = this.battleManager.opponentSpellbooks[position2];
                this.battleManager.opponentSpellbooks[position2] = tempSpellbooks;
            }
            
            // Swap opponent creatures
            if (this.battleManager.opponentCreatures) {
                const tempCreatures = this.battleManager.opponentCreatures[position1];
                this.battleManager.opponentCreatures[position1] = this.battleManager.opponentCreatures[position2];
                this.battleManager.opponentCreatures[position2] = tempCreatures;
            }
            
            // Swap opponent equipment
            if (this.battleManager.opponentEquips) {
                const tempEquips = this.battleManager.opponentEquips[position1];
                this.battleManager.opponentEquips[position1] = this.battleManager.opponentEquips[position2];
                this.battleManager.opponentEquips[position2] = tempEquips;
            }
        }
        
        // ===== SWAP RESISTANCE STACKS =====
        // Swap resistance stacks so they follow the heroes
        if (this.battleManager.resistanceManager) {
            this.battleManager.resistanceManager.swapResistanceStacks(side, position1, position2);
            console.log(`🌪️ Swapped resistance stacks between ${position1} and ${position2}`);
        }

        // ===== SWAP VISUAL ELEMENTS ===== (MOVED TO AFTER ANIMATION)
        this.swapHeroVisuals(side, position1, position2);
                
        // ===== UPDATE DISPLAYS =====
        this.battleManager.updateHeroHealthBar(side, position1, hero2.currentHp, hero2.maxHp);
        this.battleManager.updateHeroHealthBar(side, position2, hero1.currentHp, hero1.maxHp);
        this.battleManager.updateHeroAttackDisplay(side, position1, hero2);
        this.battleManager.updateHeroAttackDisplay(side, position2, hero1);
        
        // Update creature visuals
        this.battleManager.updateCreatureVisuals(side, position1, hero2.creatures);
        this.battleManager.updateCreatureVisuals(side, position2, hero1.creatures);
        
        // Update necromancy displays if applicable
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.updateNecromancyStackDisplay(side, position1, hero2.necromancyStacks);
            this.battleManager.necromancyManager.updateNecromancyStackDisplay(side, position2, hero1.necromancyStacks);
        }

        // Notify Kazena about the swap
        if (this.battleManager.kazenaEffect) {
            console.log(`🌪️ [DEBUG] Notifying Kazena about Stormblade swap: ${side} ${position1}<->${position2}`);
            await this.battleManager.kazenaEffect.onHeroSwap({
                side: side,
                position1: position1,
                position2: position2,
                source: 'stormblade'
            });
            console.log(`🌪️ [DEBUG] Kazena swap notification completed`);
        } else {
            console.log(`🌪️ [DEBUG] No kazenaEffect available to notify about swap`);
        }
        
        // ===== SAVE TO PERSISTENCE =====
        if (this.battleManager.isAuthoritative) {
            await this.battleManager.saveBattleStateToPersistence();
            console.log(`🌪️ Saved wind-swapped positions to persistence`);
        }
        
        console.log(`🌪️ Wind-swapped ${hero1.name} to ${position2} and ${hero2.name} to ${position1} (including formations)`);
    }
    
    // Animate wind swap between two heroes
    async animateWindSwap(side, position1, position2) {
        // Ensure CSS is loaded
        this.ensureWindAnimationCSS();
        
        // Get hero elements
        const heroElement1 = this.getHeroElement(side, position1);
        const heroElement2 = this.getHeroElement(side, position2);
        
        if (!heroElement1 || !heroElement2) {
            console.warn('⚠️ Could not find hero elements for wind swap animation');
            return;
        }

        // Get positions for wind animation
        const rect1 = heroElement1.getBoundingClientRect();
        const rect2 = heroElement2.getBoundingClientRect();
        
        // Create wind effects connecting both heroes
        const windEffect1 = this.createWindEffect(rect1, rect2, 'wind1');
        const windEffect2 = this.createWindEffect(rect2, rect1, 'wind2');
        
        // Add wind effects to document
        document.body.appendChild(windEffect1);
        document.body.appendChild(windEffect2);
        
        // Create swirling wind impact at both heroes
        this.createWindImpact(heroElement1);
        this.createWindImpact(heroElement2);
        
        // Wait for wind buildup
        await this.battleManager.delay(300);
        
        // Animate hero spinning movement
        const movePromise1 = this.animateSpinningMovement(heroElement1, rect1, rect2);
        const movePromise2 = this.animateSpinningMovement(heroElement2, rect2, rect1);
        
        // Keep wind effects active during movement
        this.animateWindFlow(windEffect1, rect1, rect2, 1200);
        this.animateWindFlow(windEffect2, rect2, rect1, 1200);
        
        // Wait for movement to complete
        await Promise.all([movePromise1, movePromise2]);
        
        // Remove wind effects with fade
        windEffect1.style.animation = 'windFadeOut 0.4s ease-out forwards';
        windEffect2.style.animation = 'windFadeOut 0.4s ease-out forwards';
        
        await this.battleManager.delay(400);
        
        // Clean up
        windEffect1.remove();
        windEffect2.remove();
    }
    
    // Create wind effect between two points
    createWindEffect(fromRect, toRect, id) {
        const wind = document.createElement('div');
        wind.className = 'stormblade-wind';
        wind.id = `stormblade-${id}`;
        
        const centerX1 = fromRect.left + fromRect.width / 2;
        const centerY1 = fromRect.top + fromRect.height / 2;
        const centerX2 = toRect.left + toRect.width / 2;
        const centerY2 = toRect.top + toRect.height / 2;
        
        const length = Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
        const angle = Math.atan2(centerY2 - centerY1, centerX2 - centerX1) * 180 / Math.PI;
        
        wind.style.cssText = `
            position: fixed;
            left: ${centerX1}px;
            top: ${centerY1}px;
            width: ${length}px;
            height: 8px;
            background: linear-gradient(90deg, 
                rgba(173, 216, 230, 0.8) 0%, 
                rgba(135, 206, 250, 0.9) 25%, 
                rgba(100, 149, 237, 1) 50%, 
                rgba(135, 206, 250, 0.9) 75%, 
                rgba(173, 216, 230, 0.8) 100%);
            border-radius: 4px;
            box-shadow: 0 0 15px rgba(135, 206, 250, 0.6);
            transform-origin: left center;
            transform: rotate(${angle}deg);
            z-index: 500;
            animation: windAppear 0.3s ease-out;
            opacity: 0.8;
        `;
        
        // Add wind particle pattern
        const particles = document.createElement('div');
        particles.className = 'wind-particles';
        particles.innerHTML = '🌪️ 💨 🌀 💨 🌪️';
        particles.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 12px;
            animation: windParticleFlow 0.8s linear infinite;
            white-space: nowrap;
        `;
        
        wind.appendChild(particles);
        
        return wind;
    }
    
    // Create swirling wind impact effect
    createWindImpact(heroElement) {
        const impact = document.createElement('div');
        impact.className = 'stormblade-wind-impact';
        
        // Create multiple wind symbols for swirling effect
        const windSymbols = ['🌪️', '💨', '🌀'];
        const symbolCount = 6;
        
        for (let i = 0; i < symbolCount; i++) {
            const symbol = document.createElement('div');
            symbol.className = 'wind-symbol';
            symbol.innerHTML = windSymbols[i % windSymbols.length];
            
            const angle = (360 / symbolCount) * i;
            symbol.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                font-size: 20px;
                z-index: 600;
                pointer-events: none;
                animation: windSwirl 1s ease-out forwards;
                --wind-angle: ${angle}deg;
                --wind-radius: 40px;
                transform: translate(-50%, -50%);
                filter: drop-shadow(0 0 8px rgba(135, 206, 250, 0.8));
            `;
            
            impact.appendChild(symbol);
        }
        
        impact.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 600;
        `;
        
        heroElement.appendChild(impact);
        
        // Remove after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.remove();
            }
        }, 1000);
    }
    
    // Animate hero spinning movement to new position
    async animateSpinningMovement(heroElement, fromRect, toRect, duration = 1200) {
        // Always target the battle-hero-card, which is the standard for battle animations
        const heroCard = heroElement.querySelector('.battle-hero-card');
        if (!heroCard) {
            console.warn('Could not find .battle-hero-card element for wind animation');
            return; // Skip animation if card element not found
        }
        
        // Calculate relative movement between the two slots
        const slot1Center = {
            x: fromRect.left + fromRect.width / 2,
            y: fromRect.top + fromRect.height / 2
        };
        const slot2Center = {
            x: toRect.left + toRect.width / 2, 
            y: toRect.top + toRect.height / 2
        };
        
        const deltaX = slot2Center.x - slot1Center.x;
        const deltaY = slot2Center.y - slot1Center.y;
        
        // Apply animation consistently to the hero card
        heroCard.style.transition = `transform ${duration}ms ease-in-out`;
        heroCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(720deg) scale(1.1)`;
        heroCard.style.zIndex = '1000';
        heroCard.style.filter = 'drop-shadow(0 0 15px rgba(135, 206, 250, 0.8))';
        
        await this.battleManager.delay(duration);
        
        // Reset all styles on the same element
        heroCard.style.transition = '';
        heroCard.style.transform = '';
        heroCard.style.zIndex = '';
        heroCard.style.filter = '';
    }
    
    // Animate wind flow to follow hero movement
    animateWindFlow(windElement, fromRect, toRect, duration) {
        let startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease in-out with wind turbulence
            const eased = progress < 0.5 
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Add slight turbulence to wind flow
            const turbulence = Math.sin(progress * Math.PI * 4) * 5;
            
            // Interpolate positions with turbulence
            const currentX1 = fromRect.left + (toRect.left - fromRect.left) * eased + fromRect.width / 2;
            const currentY1 = fromRect.top + (toRect.top - fromRect.top) * eased + fromRect.height / 2 + turbulence;
            const currentX2 = toRect.left + (fromRect.left - toRect.left) * eased + toRect.width / 2;
            const currentY2 = toRect.top + (fromRect.top - toRect.top) * eased + toRect.height / 2 + turbulence;
            
            const length = Math.sqrt(Math.pow(currentX2 - currentX1, 2) + Math.pow(currentY2 - currentY1, 2));
            const angle = Math.atan2(currentY2 - currentY1, currentX2 - currentX1) * 180 / Math.PI;
            
            windElement.style.left = `${currentX1}px`;
            windElement.style.top = `${currentY1}px`;
            windElement.style.width = `${length}px`;
            windElement.style.transform = `rotate(${angle}deg)`;
            windElement.style.opacity = `${0.8 * (1 - progress * 0.3)}`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // Swap hero visual elements in the DOM (same as hookshot)
    swapHeroVisuals(side, position1, position2) {
        const slot1 = document.querySelector(`.${side}-slot.${position1}-slot`);
        const slot2 = document.querySelector(`.${side}-slot.${position2}-slot`);
        
        if (!slot1 || !slot2) {
            console.error('🌪️ Could not find hero slots to swap visuals');
            return;
        }

        // NEW: Use element-based swapping instead of innerHTML
        try {
            // Create temporary container
            const tempContainer = document.createElement('div');
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);
            
            // Store references to all children
            const slot1Children = Array.from(slot1.children);
            const slot2Children = Array.from(slot2.children);
            
            // Move slot1 children to temp
            slot1Children.forEach(child => tempContainer.appendChild(child));
            
            // Move slot2 children to slot1
            slot2Children.forEach(child => slot1.appendChild(child));
            
            // Move temp children to slot2
            Array.from(tempContainer.children).forEach(child => slot2.appendChild(child));
            
            // Clean up temp container
            tempContainer.remove();
            
            // Add visual feedback
            slot1.classList.add('hero-swapped');
            slot2.classList.add('hero-swapped');
            
            // Remove visual feedback after brief delay
            setTimeout(() => {
                slot1.classList.remove('hero-swapped');
                slot2.classList.remove('hero-swapped');
            }, 400);
            
            console.log(`🌪️ Enhanced visual swap completed between ${position1} and ${position2}`);
            
        } catch (error) {
            console.error('❌ Error in enhanced visual swap, falling back to innerHTML method:', error);
            
            // Fallback to original method
            const content1 = slot1.innerHTML;
            const content2 = slot2.innerHTML;
            slot1.innerHTML = content2;
            slot2.innerHTML = content1;
        }
    }
    
    // Get hero element helper
    getHeroElement(side, position) {
        return document.querySelector(`.${side}-slot.${position}-slot`);
    }
    
    // Handle guest wind swap animation
    handleGuestWindSwap(data) {
        console.log('🌪️ Guest handling wind swap:', data);
        
        const { targetSide, position1, position2, windNumber, totalWinds, attackerInfo } = data;
        
        // Log initial effect if first wind
        if (windNumber === 1) {
            this.battleManager.addCombatLog(
                `🌪️ ${attackerInfo.name}'s Stormblade unleashes ${totalWinds} wind burst(s)!`,
                'info'
            );
        }
        
        // Perform the swap on guest side with swap data for acknowledgment
        this.performGuestWindSwap(targetSide, position1, position2, attackerInfo, data);
    }
    
    // Perform wind swap on guest side
    async performGuestWindSwap(side, position1, position2, attackerInfo, swapData) {
        // Convert to local side perspective
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetIsMyPlayer = (side === 'player' && this.battleManager.isHost) || 
                                (side === 'opponent' && !this.battleManager.isHost);
        const localSide = targetIsMyPlayer ? 'player' : 'opponent';
        
        // Get hero references
        const heroes = localSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const hero1 = heroes[position1];
        const hero2 = heroes[position2];
        
        if (!hero1 || !hero2) {
            console.error(`🌪️ GUEST: Cannot swap - missing heroes at ${position1} or ${position2}`);
            // Send acknowledgment even on error
            if (swapData && swapData.swapId) {
                this.battleManager.sendAcknowledgment('wind_swap_' + swapData.swapId);
            }
            return;
        }

        // Log the swap
        this.battleManager.addCombatLog(
            `🌪️ Winds sweep ${hero1.name} and ${hero2.name} - they spin into new positions!`,
            localSide === 'player' ? 'error' : 'success'
        );

        // Animate the wind effect
        await this.animateWindSwap(localSide, position1, position2);
        
        // ===== SWAP HEROES IN DATA MODEL =====
        heroes[position1] = hero2;
        heroes[position2] = hero1;
        
        // Update hero position properties
        hero1.position = position2;
        hero2.position = position1;
        
        // NOTE: TheStormblade should NOT update the permanent FormationManager
        // as that affects the team building screen. Only battle state should be modified.
        
        // ===== ENHANCED VISUAL SWAPPING =====
        await this.swapHeroVisuals(localSide, position1, position2);
        
        // ===== SWAP RESISTANCE STACKS ON GUEST SIDE =====
        // Use local swap to avoid triggering network messages
        if (this.battleManager.resistanceManager) {
            this.battleManager.resistanceManager.swapResistanceStacksLocal(localSide, position1, position2);
            console.log(`🌪️ GUEST: Swapped resistance stacks between ${position1} and ${position2}`);
        }
        
        // Update displays
        this.battleManager.updateHeroHealthBar(localSide, position1, hero2.currentHp, hero2.maxHp);
        this.battleManager.updateHeroHealthBar(localSide, position2, hero1.currentHp, hero1.maxHp);
        this.battleManager.updateHeroAttackDisplay(localSide, position1, hero2);
        this.battleManager.updateHeroAttackDisplay(localSide, position2, hero1);
        
        // Update creature visuals
        this.battleManager.updateCreatureVisuals(localSide, position1, hero2.creatures);
        this.battleManager.updateCreatureVisuals(localSide, position2, hero1.creatures);
        
        // Update necromancy displays if applicable
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.updateNecromancyStackDisplay(localSide, position1, hero2.necromancyStacks);
            this.battleManager.necromancyManager.updateNecromancyStackDisplay(localSide, position2, hero1.necromancyStacks);
        }
        
        // ===== KAZENA INTEGRATION - ADD THIS =====
        // Notify Kazena about the swap (guest receives swap notification, so Kazena should trigger)
        if (this.battleManager.kazenaEffect) {
            await this.battleManager.kazenaEffect.onHeroSwap({
                side: localSide,
                position1: position1,
                position2: position2,
                source: 'stormblade_guest',
                originalSide: side // Keep track of which side was actually swapped in the original event
            });
        }
        
        // Send acknowledgment when swap is complete
        if (swapData && swapData.swapId) {
            this.battleManager.sendAcknowledgment('wind_swap_' + swapData.swapId);
        }
        
        console.log(`🌪️ GUEST: Wind-swapped ${hero1.name} to ${position2} and ${hero2.name} to ${position1}`);
    }
    
    // Ensure wind animation CSS
    ensureWindAnimationCSS() {
        if (document.getElementById('stormbladeWindStyles')) return;

        const style = document.createElement('style');
        style.id = 'stormbladeWindStyles';
        style.textContent = `
            @keyframes windAppear {
                0% {
                    opacity: 0;
                    transform: rotate(var(--angle, 0deg)) scaleX(0);
                    filter: blur(4px);
                }
                100% {
                    opacity: 0.8;
                    transform: rotate(var(--angle, 0deg)) scaleX(1);
                    filter: blur(0px);
                }
            }
            
            @keyframes windFadeOut {
                0% {
                    opacity: 0.8;
                    filter: blur(0px);
                }
                100% {
                    opacity: 0;
                    filter: blur(6px);
                }
            }
            
            @keyframes windParticleFlow {
                0% {
                    transform: translate(-50%, -50%) translateX(-100%);
                    opacity: 0;
                }
                20% {
                    opacity: 1;
                }
                80% {
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) translateX(100%);
                    opacity: 0;
                }
            }
            
            @keyframes windSwirl {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) 
                               rotate(0deg) 
                               translateX(0px) 
                               scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) 
                               rotate(180deg) 
                               translateX(var(--wind-radius)) 
                               scale(1.2);
                }
                70% {
                    opacity: 1;
                    transform: translate(-50%, -50%) 
                               rotate(540deg) 
                               translateX(calc(var(--wind-radius) * 1.5)) 
                               scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) 
                               rotate(720deg) 
                               translateX(calc(var(--wind-radius) * 2)) 
                               scale(0.8);
                }
            }
            
            .stormblade-wind {
                will-change: transform, opacity, width, left, top;
                background-image: repeating-linear-gradient(
                    90deg,
                    rgba(135, 206, 250, 0.9) 0px,
                    rgba(173, 216, 230, 0.7) 3px,
                    rgba(100, 149, 237, 1) 6px,
                    rgba(173, 216, 230, 0.7) 9px,
                    rgba(135, 206, 250, 0.9) 12px
                );
                animation: windPulse 0.6s ease-in-out infinite alternate;
            }
            
            @keyframes windPulse {
                from {
                    box-shadow: 0 0 15px rgba(135, 206, 250, 0.6);
                }
                to {
                    box-shadow: 0 0 25px rgba(135, 206, 250, 0.9);
                }
            }
            
            .wind-particles {
                color: rgba(135, 206, 250, 0.9);
                text-shadow: 0 0 8px rgba(135, 206, 250, 0.8);
            }
            
            .stormblade-wind-impact {
                will-change: transform, opacity;
            }
            
            .wind-symbol {
                will-change: transform, opacity;
                color: rgba(135, 206, 250, 1);
                text-shadow: 
                    0 0 10px rgba(135, 206, 250, 0.8),
                    0 0 20px rgba(173, 216, 230, 0.6);
            }
        `;

        document.head.appendChild(style);
    }
    
    // Cleanup method
    cleanup() {
        // Clear any active animation tracking
        this.activeAnimations = 0;
        this.animationPromises = [];
        
        // NEW: Clear attack cooldown tracking
        this.recentAttacks.clear();
        
        const css = document.getElementById('stormbladeWindStyles');
        if (css) css.remove();
        
        console.log('🌪️ TheStormblade effect cleaned up');
    }
}

// Function to register TheStormblade with AttackEffectsManager
export function registerTheStormblade(attackEffectsManager, battleManager) {
    const stormbladeEffect = new TheStormbladeEffect(attackEffectsManager, battleManager);
    stormbladeEffect.register();
    return stormbladeEffect;
}

// Export for use in attackEffects.js
export default TheStormbladeEffect;