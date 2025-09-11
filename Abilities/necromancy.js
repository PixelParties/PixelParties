// ./Abilities/necromancy.js - Enhanced Necromancy with Revival Visual Effects

export class NecromancyManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.styleInjected = false;
        this.injectNecromancyCSS();
    }

    // Initialize necromancy stacks for all heroes at battle start
    initializeNecromancyStacks() {
        let necromancyInitialized = false;
        
        // Initialize for player heroes
        ['left', 'center', 'right'].forEach(position => {
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero && playerHero.hasAbility('Necromancy')) {
                playerHero.initializeNecromancyStacks();
                const stacks = playerHero.getNecromancyStacks();
                if (stacks > 0) {
                    necromancyInitialized = true;
                }
            }
            
            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero && opponentHero.hasAbility('Necromancy')) {
                opponentHero.initializeNecromancyStacks();
                const stacks = opponentHero.getNecromancyStacks();
                if (stacks > 0) {
                    necromancyInitialized = true;
                }
            }
        });
    }

    // Get all heroes on a side that have necromancy stacks
    getHeroesWithNecromancyStacks(side) {
        const heroesWithStacks = [];
        const heroes = side === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.alive && hero.hasNecromancyStacks()) {
                heroesWithStacks.push(hero);
            }
        });
        
        return heroesWithStacks;
    }

    // Select a random hero from those with necromancy stacks
    selectRandomNecromancyHero(heroesWithStacks) {
        if (heroesWithStacks.length === 0) return null;
        if (heroesWithStacks.length === 1) return heroesWithStacks[0];
        
        const randomIndex = Math.floor(Math.random() * heroesWithStacks.length);
        return heroesWithStacks[randomIndex];
    }

    // Animate necromancy revival with stunning visual effects
    async animateNecromancyRevival(side, position, creatureIndex, creature) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );

        if (!creatureElement) {
            console.error(`❌ Necromancy animation failed: creature element not found`, {
                selector: `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`,
                side, position, creatureIndex, creatureName: creature.name
            });
            return;
        }
        
        console.log(`🌟 Starting necromancy revival animation for ${creature.name}`);
        
        if (!creatureElement) return;

        // Create dark purple fog effect
        this.createNecromancyFog(creatureElement);
        
        // Add necromantic glow to the creature
        this.addNecromancyGlow(creatureElement);
        
        // Create floating death runes
        this.createFloatingRunes(creatureElement);
        
        // Animate the creature sprite revival
        this.animateCreatureRevival(creatureElement);
        
        // Animate health bar filling (this will be called separately but we prepare the element)
        this.prepareHealthBarForRevival(creatureElement);
    }

    // Create swirling dark purple fog around the creature
    createNecromancyFog(creatureElement) {
        const fog = document.createElement('div');
        fog.className = 'necromancy-fog';
        fog.innerHTML = `
            <div class="fog-swirl fog-swirl-1"></div>
            <div class="fog-swirl fog-swirl-2"></div>
            <div class="fog-swirl fog-swirl-3"></div>
            <div class="fog-particles">
                ${'<div class="fog-particle"></div>'.repeat(8)}
            </div>
        `;
        
        creatureElement.appendChild(fog);
        
        // Remove fog after animation completes
        setTimeout(() => {
            if (fog.parentNode) {
                fog.remove();
            }
        }, 600);
    }

    // Add necromantic glow effect to the creature
    addNecromancyGlow(creatureElement) {
        const sprite = creatureElement.querySelector('.creature-sprite');
        if (sprite) {
            sprite.classList.add('necromancy-revival-glow');
            
            // Remove glow effect after animation
            setTimeout(() => {
                sprite.classList.remove('necromancy-revival-glow');
            }, 500);
        }
    }

    // Create floating mystical runes around the creature
    createFloatingRunes(creatureElement) {
        const runes = ['☠', '⚰', '🔮', '💀', '⚡', '🌙'];
        const runesContainer = document.createElement('div');
        runesContainer.className = 'necromancy-runes';
        
        runes.forEach((rune, index) => {
            const runeElement = document.createElement('div');
            runeElement.className = 'floating-rune';
            runeElement.textContent = rune;
            runeElement.style.animationDelay = `${index * 0.1}s`;
            runesContainer.appendChild(runeElement);
        });
        
        creatureElement.appendChild(runesContainer);
        
        // Remove runes after animation
        setTimeout(() => {
            if (runesContainer.parentNode) {
                runesContainer.remove();
            }
        }, 600);
    }

    // Animate the creature sprite during revival
    animateCreatureRevival(creatureElement) {
        const sprite = creatureElement.querySelector('.creature-sprite');
        if (sprite) {
            // Remove defeated styling
            sprite.style.filter = '';
            sprite.style.opacity = '';
            
            // Add revival animation
            sprite.classList.add('necromancy-revival');
            
            // Remove revival class after animation
            setTimeout(() => {
                sprite.classList.remove('necromancy-revival');
            }, 500);
        }
        
        // Remove defeated class from container
        creatureElement.classList.remove('defeated');
    }

    // Prepare health bar for animated filling
    prepareHealthBarForRevival(creatureElement) {
        const healthBar = creatureElement.querySelector('.creature-health-bar');
        const healthFill = creatureElement.querySelector('.creature-health-fill');
        
        if (healthBar && healthFill) {
            // Add revival class for special styling
            healthBar.classList.add('necromancy-revival-bar');
            healthFill.classList.add('necromancy-revival-fill');
            
            // Remove classes after animation
            setTimeout(() => {
                healthBar.classList.remove('necromancy-revival-bar');
                healthFill.classList.remove('necromancy-revival-fill');
            }, 600);
        }
    }

    // Enhanced updateCreatureHealthBar with revival animation
    updateCreatureHealthBarWithRevival(side, position, creatureIndex, currentHp, maxHp, isRevival = false) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;
        
        const healthFill = creatureElement.querySelector('.creature-health-fill');
        const hpText = creatureElement.querySelector('.creature-hp-text');
        
        if (healthFill && hpText) {
            const percentage = Math.max(0, (currentHp / maxHp) * 100);
            
            if (isRevival) {
                // Start from 0 and animate to full
                healthFill.style.width = '0%';
                healthFill.style.transition = 'none';
                
                // Force reflow
                void healthFill.offsetWidth;
                
                // Animate to full health over 0.1 seconds
                healthFill.style.transition = 'width 0.1s ease-out';
                healthFill.style.width = `${percentage}%`;
                
                // Special necromancy color during revival
                healthFill.style.background = 'linear-gradient(90deg, #8a2be2 0%, #9932cc 50%, #ba55d3 100%)';
                
                // Animate HP text counter
                this.animateHpTextCounter(hpText, 0, currentHp, maxHp, 100); // 100ms duration
                
                // Return to normal color after animation
                setTimeout(() => {
                    if (percentage > 60) {
                        healthFill.style.background = 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)';
                    } else if (percentage > 30) {
                        healthFill.style.background = 'linear-gradient(90deg, #ff9800 0%, #ffa726 100%)';
                    } else {
                        healthFill.style.background = 'linear-gradient(90deg, #f44336 0%, #ef5350 100%)';
                    }
                }, 150);
            } else {
                // Normal health update
                healthFill.style.width = `${percentage}%`;
                hpText.textContent = `${currentHp}/${maxHp}`;
                
                // Normal color based on health
                if (percentage > 60) {
                    healthFill.style.background = 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)';
                } else if (percentage > 30) {
                    healthFill.style.background = 'linear-gradient(90deg, #ff9800 0%, #ffa726 100%)';
                } else {
                    healthFill.style.background = 'linear-gradient(90deg, #f44336 0%, #ef5350 100%)';
                }
            }
        }
    }

    // Animate HP text counter during revival
    animateHpTextCounter(hpTextElement, startHp, endHp, maxHp, duration) {
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Eased progress for smooth animation
            const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
            const currentHp = Math.floor(startHp + (endHp - startHp) * easedProgress);
            
            hpTextElement.textContent = `${currentHp}/${maxHp}`;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }

    // Attempt to revive a creature using necromancy - ENHANCED WITH VISUALS AND BACK PLACEMENT
    attemptNecromancyRevival(creature, heroOwner, creatureIndex, side, position) {
        if (!this.battleManager.isAuthoritative) return false;
        
        // Check if creature has heal-block - if so, cannot be revived
        if (this.battleManager.statusEffectsManager && 
            this.battleManager.statusEffectsManager.hasStatusEffect(creature, 'healblock')) {
            console.log(`🚫 ${creature.name} cannot be revived due to heal-block`);
            return false;
        }
        
        // Check if any heroes on this side have necromancy stacks
        const heroesWithStacks = this.getHeroesWithNecromancyStacks(side);
        
        if (heroesWithStacks.length === 0) {
            return false; // No necromancy available
        }
        
        // Select a random hero to use their necromancy
        const necromancyHero = this.selectRandomNecromancyHero(heroesWithStacks);
        
        if (!necromancyHero || !necromancyHero.consumeNecromancyStack()) {
            return false; // Failed to consume stack
        }
        
        // Revive the creature at full HP
        creature.currentHp = creature.maxHp;
        creature.alive = true;
        
        // Console log: Array before changes
        console.log(`🔍 NECROMANCY REVIVAL - Array BEFORE changes for ${heroOwner.name}:`, 
            heroOwner.creatures.map((c, i) => `${i}: ${c.name} (${c.alive ? 'alive' : 'dead'})`));
        
        // UPDATED: Move revived creature to END of creatures array
        let finalCreatureIndex = creatureIndex;
        const currentIndex = heroOwner.creatures.indexOf(creature);
        
        if (currentIndex !== -1 && currentIndex !== heroOwner.creatures.length - 1) {
            // Remove from current position
            heroOwner.creatures.splice(currentIndex, 1);
            // Add to end (back of formation)
            heroOwner.creatures.push(creature);
            finalCreatureIndex = heroOwner.creatures.length - 1;
        }
                
        // Add combat log messages
        this.battleManager.addCombatLog(
            `💀✨ ${necromancyHero.name} uses Necromancy to revive ${creature.name}!`,
            side === 'player' ? 'success' : 'error'
        );
        
        this.rerenderCreaturesVisually(side, position, heroOwner);
        
        // Update necromancy stack display
        this.updateNecromancyStackDisplay(side, necromancyHero.position, necromancyHero.getNecromancyStacks());
        
        // Trigger revival animations on the newly rendered elements
        setTimeout(() => {
            this.animateNecromancyRevival(side, position, finalCreatureIndex, creature);
        }, 50); 
        
        // Update health bar with revival animation - use new index  
        this.updateCreatureHealthBarWithRevival(side, position, finalCreatureIndex, creature.currentHp, creature.maxHp, true);
        
        // Send update to opponent - include both old and new indices for robust guest handling
        this.battleManager.sendBattleUpdate('necromancy_revival', {
            revivingHeroAbsoluteSide: necromancyHero.absoluteSide,
            revivingHeroPosition: necromancyHero.position,
            remainingStacks: necromancyHero.getNecromancyStacks(),
            revivedCreature: {
                name: creature.name,
                heroPosition: position,
                creatureIndex: finalCreatureIndex,        // New index after move (now last position)
                originalIndex: creatureIndex,            // Original index for guest to find creature
                heroAbsoluteSide: heroOwner.absoluteSide
            }
        });
        
        return true;
    }

    // Re-render creatures visually to reflect array order changes
    rerenderCreaturesVisually(side, position, heroOwner) {
        const heroSlot = document.querySelector(`.${side}-slot.${position}-slot`);
        if (!heroSlot) return;
        
        // Remove existing creatures display
        const existingCreatures = heroSlot.querySelector('.battle-hero-creatures');
        if (existingCreatures) {
            existingCreatures.remove();
        }
        
        // Re-create creatures HTML in new order
        if (heroOwner.creatures && heroOwner.creatures.length > 0) {
            const creaturesHTML = this.battleManager.battleScreen.createCreaturesHTML(
                heroOwner.creatures, 
                side, 
                position
            );
            heroSlot.insertAdjacentHTML('beforeend', creaturesHTML);
            
            // Update necromancy displays after re-render
            this.updateNecromancyDisplayForHeroWithCreatures(side, position, heroOwner);
            
            // Re-apply any status effects or visual states
            heroOwner.creatures.forEach((creature, index) => {
                if (!creature.alive) {
                    // Re-apply defeated visual state
                    const creatureElement = heroSlot.querySelector(
                        `.creature-icon[data-creature-index="${index}"]`
                    );
                    if (creatureElement) {
                        creatureElement.classList.add('defeated');
                        const sprite = creatureElement.querySelector('.creature-sprite');
                        if (sprite) {
                            sprite.style.filter = 'grayscale(100%)';
                            sprite.style.opacity = '0.5';
                        }
                    }
                }
            });
            
            console.log(`✅ Creatures visually re-rendered for ${side} ${position} after necromancy revival`);
        }
    }

    // Update necromancy stack display for a hero
    updateNecromancyStackDisplay(side, position, stacks) {
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        const stackIndicator = heroElement.querySelector('.necromancy-stack-indicator');
        const stackCircle = heroElement.querySelector('.necromancy-stack-circle');
        const stackNumber = heroElement.querySelector('.necromancy-stack-number');
        
        if (!stackIndicator || !stackCircle || !stackNumber) {
            console.warn(`Necromancy stack indicator elements not found for ${side} ${position}`);
            return;
        }
        
        if (stacks > 0) {
            // Show and update the indicator
            stackIndicator.style.display = 'flex';
            stackNumber.textContent = stacks;
            
            // Add pulse animation when stacks are consumed
            stackCircle.classList.remove('stack-consumed');
            void stackCircle.offsetWidth; // Force reflow
            stackCircle.classList.add('stack-consumed');
            
            // Add title for tooltip
            const hero = side === 'player' 
                ? this.battleManager.playerHeroes[position]
                : this.battleManager.opponentHeroes[position];
            
            if (hero) {
                stackCircle.title = `${hero.name} has ${stacks} Necromancy stacks remaining`;
            }
            
        } else {
            // Hide the indicator when no stacks remain
            stackIndicator.style.display = 'none';
        }
    }

    // Initialize all necromancy stack displays
    initializeNecromancyStackDisplays() {
        // Ensure CSS is injected
        this.injectNecromancyCSS();
        
        ['left', 'center', 'right'].forEach(position => {
            // Player heroes
            const playerHero = this.battleManager.playerHeroes[position];
            if (playerHero && playerHero.hasAbility('Necromancy')) {
                this.updateNecromancyStackDisplay('player', position, playerHero.getNecromancyStacks());
            }
            
            // Opponent heroes
            const opponentHero = this.battleManager.opponentHeroes[position];
            if (opponentHero && opponentHero.hasAbility('Necromancy')) {
                this.updateNecromancyStackDisplay('opponent', position, opponentHero.getNecromancyStacks());
            }
        });
    }

    // Handle necromancy revival update for guest - ENHANCED WITH VISUALS AND REORDERING
    handleGuestNecromancyRevival(data) {
        const { revivingHeroAbsoluteSide, revivingHeroPosition, remainingStacks, revivedCreature } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        
        // Update the necromancy hero's stacks
        const revivingHeroLocalSide = (revivingHeroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const revivingHero = revivingHeroLocalSide === 'player' 
            ? this.battleManager.playerHeroes[revivingHeroPosition]
            : this.battleManager.opponentHeroes[revivingHeroPosition];
        
        if (revivingHero) {
            revivingHero.setNecromancyStacks(remainingStacks);
            this.updateNecromancyStackDisplay(revivingHeroLocalSide, revivingHeroPosition, remainingStacks);
            
            this.battleManager.addCombatLog(
                `💀✨ ${revivingHero.name} uses Necromancy to revive ${revivedCreature.name}!`,
                revivingHeroLocalSide === 'player' ? 'success' : 'error'
            );
        }
        
        // Update the revived creature
        const revivedHeroLocalSide = (revivedCreature.heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const revivedHero = revivedHeroLocalSide === 'player' 
            ? this.battleManager.playerHeroes[revivedCreature.heroPosition]
            : this.battleManager.opponentHeroes[revivedCreature.heroPosition];
        
        if (revivedHero) {
            // Find the creature - try by original index first, then by name as fallback
            let creature = revivedHero.creatures[revivedCreature.originalIndex];
            
            // If not found at original index, search by name and dead status
            if (!creature || creature.name !== revivedCreature.name) {
                creature = revivedHero.creatures.find(c => 
                    c.name === revivedCreature.name && !c.alive
                );
            }
            
            if (creature) {
                // Console log: Array before changes (GUEST SIDE)
                console.log(`🔍 GUEST NECROMANCY REVIVAL - Array BEFORE changes for ${revivedHero.name}:`, 
                    revivedHero.creatures.map((c, i) => `${i}: ${c.name} (${c.alive ? 'alive' : 'dead'})`));
                
                creature.currentHp = creature.maxHp;
                creature.alive = true;
                
                // GUEST: Also move creature to back of array on guest side
                const currentIndex = revivedHero.creatures.indexOf(creature);
                if (currentIndex !== -1 && currentIndex !== revivedHero.creatures.length - 1) {
                    // Remove from current position
                    revivedHero.creatures.splice(currentIndex, 1);
                    // Add to end (back of formation)
                    revivedHero.creatures.push(creature);
                }
                
                // Console log: Array after changes (GUEST SIDE)
                console.log(`🔍 GUEST NECROMANCY REVIVAL - Array AFTER changes for ${revivedHero.name}:`, 
                    revivedHero.creatures.map((c, i) => `${i}: ${c.name} (${c.alive ? 'alive' : 'dead'})`));
                
                const finalIndex = revivedHero.creatures.length - 1;
                console.log(`🎯 GUEST Final creature index: ${finalIndex}`);
                
                // GUEST: Re-render creatures visually to match host
                this.rerenderCreaturesVisually(revivedHeroLocalSide, revivedCreature.heroPosition, revivedHero);
                
                // ENHANCED: Trigger revival animations on guest side (using final index)
                this.animateNecromancyRevival(revivedHeroLocalSide, revivedCreature.heroPosition, finalIndex, creature);
                
                // Update health bar with revival animation (using final index)
                this.updateCreatureHealthBarWithRevival(
                    revivedHeroLocalSide, 
                    revivedCreature.heroPosition, 
                    finalIndex, 
                    creature.currentHp, 
                    creature.maxHp, 
                    true // This is a revival
                );
            } else {
                console.error(`Failed to find creature ${revivedCreature.name} for revival on guest side`);
            }
        }
    }

    // Update necromancy display for battle screen
    updateNecromancyDisplayForHeroWithCreatures(side, position, hero) {
        if (!hero) return;
        
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (!heroElement) return;
        
        const stacks = hero.getNecromancyStacks();
        
        // Check if hero has necromancy ability and creatures
        const hasNecromancy = hero.hasAbility('Necromancy');
        const hasCreatures = hero.creatures && hero.creatures.length > 0;
        
        if (hasNecromancy && hasCreatures) {
            // Add/remove has-necromancy-stacks class for CSS targeting
            heroElement.classList.toggle('has-necromancy-stacks', stacks > 0);
            
            // Update the stack display
            this.updateNecromancyStackDisplay(side, position, stacks);
            
        } else {
            // Remove the class if no necromancy or no creatures
            heroElement.classList.remove('has-necromancy-stacks');
            
            // Hide the indicator
            const stackIndicator = heroElement.querySelector('.necromancy-stack-indicator');
            if (stackIndicator) {
                stackIndicator.style.display = 'none';
            }
        }
    }

    // ENHANCED: Inject necromancy CSS with stunning revival effects
    injectNecromancyCSS() {
        if (this.styleInjected) return;
        
        const styleId = 'necromancyAbilityStyles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* ============================================
            NECROMANCY REVIVAL VISUAL EFFECTS
            ============================================ */
            
            /* Dark purple fog effect */
            .necromancy-fog {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80px;
                height: 80px;
                pointer-events: none;
                z-index: 150;
            }
            
            .fog-swirl {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: radial-gradient(circle, 
                    rgba(138, 43, 226, 0.8) 0%, 
                    rgba(75, 0, 130, 0.6) 40%, 
                    rgba(138, 43, 226, 0.3) 70%, 
                    transparent 100%);
                animation: necromancySwirl 0.5s ease-out;
            }
            
            .fog-swirl-2 {
                animation-delay: 0.1s;
                animation-direction: reverse;
                transform: scale(0.7);
            }
            
            .fog-swirl-3 {
                animation-delay: 0.2s;
                transform: scale(0.4);
            }
            
            @keyframes necromancySwirl {
                0% {
                    opacity: 0;
                    transform: scale(0) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: scale(0.5) rotate(90deg);
                }
                80% {
                    opacity: 0.8;
                    transform: scale(1.2) rotate(360deg);
                }
                100% {
                    opacity: 0;
                    transform: scale(2) rotate(540deg);
                }
            }
            
            /* Floating fog particles */
            .fog-particles {
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
            }
            
            .fog-particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: #8a2be2;
                border-radius: 50%;
                opacity: 0.7;
                animation: fogParticleFloat 0.5s ease-out;
            }
            
            .fog-particle:nth-child(1) { top: 20%; left: 10%; animation-delay: 0.02s; }
            .fog-particle:nth-child(2) { top: 80%; left: 20%; animation-delay: 0.04s; }
            .fog-particle:nth-child(3) { top: 10%; left: 80%; animation-delay: 0.06s; }
            .fog-particle:nth-child(4) { top: 60%; left: 90%; animation-delay: 0.08s; }
            .fog-particle:nth-child(5) { top: 90%; left: 60%; animation-delay: 0.10s; }
            .fog-particle:nth-child(6) { top: 30%; left: 70%; animation-delay: 0.12s; }
            .fog-particle:nth-child(7) { top: 70%; left: 30%; animation-delay: 0.14s; }
            .fog-particle:nth-child(8) { top: 50%; left: 50%; animation-delay: 0.16s; }
            
            @keyframes fogParticleFloat {
                0% {
                    opacity: 0;
                    transform: translateY(0) scale(0);
                }
                50% {
                    opacity: 1;
                    transform: translateY(-20px) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-40px) scale(0);
                }
            }
            
            /* Floating mystical runes */
            .necromancy-runes {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100px;
                height: 100px;
                pointer-events: none;
                z-index: 140;
            }
            
            .floating-rune {
                position: absolute;
                font-size: 16px;
                color: #9932cc;
                text-shadow: 0 0 10px #8a2be2;
                animation: runeFloat 0.5s ease-out;
            }
            
            .floating-rune:nth-child(1) { 
                top: 0%; 
                left: 50%; 
                transform: translateX(-50%);
                animation-delay: 0s;
            }
            .floating-rune:nth-child(2) { 
                top: 25%; 
                right: 0%; 
                animation-delay: 0.02s;
            }
            .floating-rune:nth-child(3) { 
                bottom: 0%; 
                right: 25%; 
                animation-delay: 0.04s;
            }
            .floating-rune:nth-child(4) { 
                bottom: 0%; 
                left: 25%; 
                animation-delay: 0.06s;
            }
            .floating-rune:nth-child(5) { 
                top: 25%; 
                left: 0%; 
                animation-delay: 0.08s;
            }
            .floating-rune:nth-child(6) { 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                animation-delay: 0.10s;
            }
            
            @keyframes runeFloat {
                0% {
                    opacity: 0;
                    transform: scale(0) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: scale(1.2) rotate(180deg);
                }
                70% {
                    opacity: 0.8;
                    transform: scale(1) rotate(360deg);
                }
                100% {
                    opacity: 0;
                    transform: scale(0) rotate(540deg);
                }
            }
            
            /* Creature sprite revival glow */
            .creature-sprite.necromancy-revival-glow {
                filter: brightness(1.5) drop-shadow(0 0 15px #8a2be2) drop-shadow(0 0 25px #9932cc);
                animation: necromancyPulse 0.5s ease-in-out;
            }
            
            @keyframes necromancyPulse {
                0%, 100% {
                    filter: brightness(1.5) drop-shadow(0 0 15px #8a2be2) drop-shadow(0 0 25px #9932cc);
                }
                50% {
                    filter: brightness(2) drop-shadow(0 0 25px #8a2be2) drop-shadow(0 0 35px #9932cc);
                }
            }
            
            /* Creature revival animation */
            .creature-sprite.necromancy-revival {
                animation: creatureRevivalRise 0.5s ease-out;
            }
            
            @keyframes creatureRevivalRise {
                0% {
                    opacity: 0.3;
                    transform: translateY(10px) scale(0.8);
                    filter: grayscale(100%);
                }
                50% {
                    opacity: 0.7;
                    transform: translateY(-5px) scale(1.1);
                    filter: grayscale(50%);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    filter: grayscale(0%);
                }
            }
            
            /* Enhanced health bar revival effects */
            .creature-health-bar.necromancy-revival-bar {
                border-color: #8a2be2;
                box-shadow: 
                    0 0 8px rgba(138, 43, 226, 0.6),
                    inset 0 0 4px rgba(138, 43, 226, 0.3);
                animation: healthBarGlow 0.5s ease-out;
            }
            
            .creature-health-fill.necromancy-revival-fill {
                box-shadow: 
                    inset 0 1px 0 rgba(255, 255, 255, 0.6),
                    0 0 8px rgba(138, 43, 226, 0.8);
            }
            
            @keyframes healthBarGlow {
                0% {
                    box-shadow: 
                        0 0 4px rgba(138, 43, 226, 0.3),
                        inset 0 0 2px rgba(138, 43, 226, 0.2);
                }
                50% {
                    box-shadow: 
                        0 0 12px rgba(138, 43, 226, 0.8),
                        inset 0 0 6px rgba(138, 43, 226, 0.5);
                }
                100% {
                    box-shadow: 
                        0 0 8px rgba(138, 43, 226, 0.6),
                        inset 0 0 4px rgba(138, 43, 226, 0.3);
                }
            }
            
            /* ============================================
            NECROMANCY STACK INDICATOR STYLES
            ============================================ */
            
            .necromancy-stack-indicator {
                opacity: 0;
                transform: scale(0.8);
                transition: all 0.3s ease;
            }
            
            .battle-hero-slot.has-necromancy-stacks .necromancy-stack-indicator {
                opacity: 1;
                transform: scale(1);
            }
            
            .battle-hero-slot:hover .necromancy-stack-circle {
                box-shadow: 
                    0 3px 10px rgba(0, 0, 0, 0.7),
                    0 0 20px rgba(138, 43, 226, 0.7);
            }
            
            @keyframes necromancyStackConsumedNew {
                0% {
                    transform: scale(1);
                    box-shadow: 
                        0 2px 6px rgba(0, 0, 0, 0.5),
                        0 0 10px rgba(138, 43, 226, 0.4);
                }
                50% {
                    transform: scale(1.3);
                    box-shadow: 
                        0 4px 16px rgba(0, 0, 0, 0.8),
                        0 0 24px rgba(138, 43, 226, 0.9);
                    background: rgba(138, 43, 226, 0.9);
                    border-color: rgba(138, 43, 226, 1);
                }
                100% {
                    transform: scale(1);
                    box-shadow: 
                        0 2px 6px rgba(0, 0, 0, 0.5),
                        0 0 10px rgba(138, 43, 226, 0.4);
                    background: rgba(0, 0, 0, 0.9);
                    border-color: rgba(255, 255, 255, 0.8);
                }
            }
            
            .necromancy-stack-circle.stack-consumed {
                animation: necromancyStackConsumedNew 0.8s ease-out;
            }
        `;
        
        document.head.appendChild(style);
        this.styleInjected = true;
    }

    // Cleanup method
    cleanup() {
        // Remove any remaining visual effects
        const effects = document.querySelectorAll(`
            .necromancy-fog,
            .necromancy-runes,
            .necromancy-stack-display
        `);
        effects.forEach(effect => effect.remove());
        
        // Remove revival classes from sprites
        const sprites = document.querySelectorAll('.creature-sprite');
        sprites.forEach(sprite => {
            sprite.classList.remove('necromancy-revival-glow', 'necromancy-revival');
        });
        
        // Remove revival classes from health bars
        const healthBars = document.querySelectorAll('.creature-health-bar, .creature-health-fill');
        healthBars.forEach(bar => {
            bar.classList.remove('necromancy-revival-bar', 'necromancy-revival-fill');
        });
        
        // Hide necromancy stack indicators
        const stackIndicators = document.querySelectorAll('.necromancy-stack-indicator');
        stackIndicators.forEach(indicator => {
            indicator.style.display = 'none';
        });
        
        // Remove necromancy-related classes from hero slots
        const heroSlots = document.querySelectorAll('.battle-hero-slot.has-creatures, .battle-hero-slot.has-necromancy-stacks');
        heroSlots.forEach(slot => {
            slot.classList.remove('has-creatures', 'has-necromancy-stacks');
        });
    }
}

// Export static utility functions for use without manager instance
export const NecromancyUtils = {
    // Check if a hero should show necromancy display
    shouldShowNecromancyDisplay(hero) {
        return hero && hero.hasAbility && hero.hasAbility('Necromancy') && 
               hero.creatures && hero.creatures.length > 0;
    },

    // Get necromancy data for persistence
    extractNecromancyDataFromHero(hero) {
        if (!hero) return null;
        
        return {
            necromancyStacks: hero.necromancyStacks || 0,
            maxNecromancyStacks: hero.maxNecromancyStacks || 0,
            hasNecromancy: hero.hasAbility && hero.hasAbility('Necromancy')
        };
    },

    // Extract necromancy data for hash generation
    extractNecromancyData(state) {
        const necromancyData = {};
        
        // Extract necromancy stacks from both sides
        ['hostHeroes', 'guestHeroes'].forEach(side => {
            if (state[side]) {
                necromancyData[side] = {};
                ['left', 'center', 'right'].forEach(position => {
                    if (state[side][position]) {
                        necromancyData[side][position] = {
                            necromancyStacks: state[side][position].necromancyStacks || 0,
                            maxNecromancyStacks: state[side][position].maxNecromancyStacks || 0
                        };
                    }
                });
            }
        });
        
        return necromancyData;
    }
};

// Default export
export default NecromancyManager;
