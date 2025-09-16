// ./Spells/darkDeal.js - Dark Deal Spell Implementation (Fixed)

export class DarkDealSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'DarkDeal';
        this.displayName = 'Dark Deal';
        
        console.log('🖤 Dark Deal spell module initialized');
    }

    // ============================================
    // SPELL CASTING CONDITIONS
    // ============================================

    // Check if spell can be cast - only if enemies have living creatures
    canCast(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        // Count living enemy creatures
        let livingEnemyCreatures = 0;
        Object.values(enemyHeroes).forEach(hero => {
            if (hero && hero.creatures) {
                livingEnemyCreatures += hero.creatures.filter(c => c.alive).length;
            }
        });
        
        return livingEnemyCreatures > 0;
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Dark Deal spell effect
    async executeSpell(caster, spell) {
        console.log(`🖤 ${caster.name} casting ${this.displayName}!`);
        
        // Calculate how many creatures to steal based on DecayMagic level
        const decayMagicLevel = caster.hasAbility('DecayMagic') 
            ? caster.getAbilityStackCount('DecayMagic') 
            : 0;
        
        // FIXED: Ensure minimum level of 1 for calculations
        const effectiveLevel = Math.max(1, decayMagicLevel);
        
        const maxSteals = effectiveLevel; // Equal to effective DecayMagic level
        
        // Find living enemy creatures
        const enemyCreatures = this.findLivingEnemyCreatures(caster);
        
        if (enemyCreatures.length === 0) {
            console.log(`🖤 ${this.displayName}: No enemy creatures to steal!`);
            return;
        }
        
        // Randomly select up to maxSteals creatures
        const creaturesToSteal = this.selectRandomCreatures(enemyCreatures, maxSteals);
        
        // Log the spell effect
        this.logSpellEffect(caster, creaturesToSteal, maxSteals);
        
        // Show dark deal casting animation
        await this.playDarkDealCastingAnimation(caster);
        
        // Steal each creature with individual animations
        for (let i = 0; i < creaturesToSteal.length; i++) {
            const creatureData = creaturesToSteal[i];
            await this.stealCreature(creatureData, caster, i, creaturesToSteal.length);
            
            // Small delay between creature steals for visual clarity
            if (i < creaturesToSteal.length - 1) {
                await this.battleManager.delay(300);
            }
        }
        
        console.log(`🖤 ${this.displayName} completed! Stole ${creaturesToSteal.length} creatures.`);
    }

    // ============================================
    // CREATURE FINDING AND SELECTION
    // ============================================

    // Find all living enemy creatures
    findLivingEnemyCreatures(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const livingCreatures = [];
        
        Object.keys(enemyHeroes).forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive) {
                        livingCreatures.push({
                            creature: creature,
                            hero: hero,
                            heroPosition: position,
                            creatureIndex: index,
                            side: enemySide
                        });
                    }
                });
            }
        });
        
        return livingCreatures;
    }

    // Randomly select creatures to steal
    selectRandomCreatures(availableCreatures, maxCount) {
        const toSteal = Math.min(maxCount, availableCreatures.length);
        
        // Create a copy and shuffle using battleManager's deterministic randomness
        const shuffled = [...availableCreatures];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.battleManager.getRandomInt(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled.slice(0, toSteal);
    }

    // ============================================
    // CREATURE STEALING MECHANICS
    // ============================================

    // Steal a specific creature
    async stealCreature(creatureData, caster, stealIndex, totalSteals) {
        const { creature, hero, heroPosition, creatureIndex, side } = creatureData;
        
        console.log(`🖤 Stealing ${creature.name} from ${hero.name} (${side} ${heroPosition})`);
        
        // Show stealing animation on the creature
        await this.createDarkDealStealingEffect(side, heroPosition, creatureIndex);
        
        // Remove creature from original hero's array
        const stolenCreature = hero.creatures.splice(creatureIndex, 1)[0];
        
        // Update indices for remaining creatures in original position
        this.updateCreatureIndices(side, heroPosition);
        
        // Add creature to caster's army (at the end)
        caster.creatures.push({
            ...stolenCreature,
            stolenBy: 'DarkDeal',
            originalOwner: hero.name,
            stolenAt: Date.now()
        });
        
        // Force complete re-render for both positions
        if (this.battleManager.battleScreen && this.battleManager.battleScreen.renderCreaturesAfterInit) {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
        } else {
            // Fallback: update both positions individually
            this.battleManager.updateCreatureVisuals(side, heroPosition, hero.creatures);
            this.battleManager.updateCreatureVisuals(caster.side, caster.position, caster.creatures);
        }
        
        // Update necromancy displays if available
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                side, heroPosition, hero
            );
            this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                caster.side, caster.position, caster
            );
        }
        
        // Show arrival effect on caster
        const newCreatureIndex = caster.creatures.length - 1;
        await this.createDarkDealArrivalEffect(caster.side, caster.position, newCreatureIndex);
        
        // Send network update to guest
        this.battleManager.sendBattleUpdate('dark_deal_creature_stolen', {
            stolenCreature: {
                name: creature.name,
                maxHp: creature.maxHp,
                currentHp: creature.currentHp,
                atk: creature.atk
            },
            originalOwner: {
                side: side,
                position: heroPosition,
                heroName: hero.name,
                creatureIndex: creatureIndex
            },
            newOwner: {
                side: caster.side,
                position: caster.position,
                heroName: caster.name,
                newCreatureIndex: newCreatureIndex
            },
            stealIndex: stealIndex,
            totalSteals: totalSteals,
            spellName: this.spellName,
            timestamp: Date.now()
        });
    }

    // Update creature indices in DOM after removal
    updateCreatureIndices(side, position) {
        const creatureElements = document.querySelectorAll(
            `.${side}-slot.${position}-slot .creature-icon`
        );
        creatureElements.forEach((el, index) => {
            el.setAttribute('data-creature-index', index);
        });
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play dark deal casting animation on caster
    async playDarkDealCastingAnimation(caster) {
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        if (!casterElement) return;
        
        // Create dark aura around caster
        const darkAura = document.createElement('div');
        darkAura.className = 'dark-deal-casting-aura';
        darkAura.innerHTML = `
            <div class="dark-circle"></div>
            <div class="evil-runes">
                <span class="rune">📜</span>
                <span class="rune">🖤</span>
                <span class="rune">💀</span>
                <span class="rune">⚡</span>
            </div>
            <div class="dark-energy">🌀</div>
        `;
        
        darkAura.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 500;
            pointer-events: none;
            animation: darkDealCasting ${this.battleManager.getSpeedAdjustedDelay(1500)}ms ease-out forwards;
        `;
        
        casterElement.appendChild(darkAura);
        
        this.ensureDarkDealCSS();
        
        await this.battleManager.delay(1500);
        
        if (darkAura && darkAura.parentNode) {
            darkAura.remove();
        }
    }

    // Create stealing effect on target creature
    async createDarkDealStealingEffect(side, position, creatureIndex) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;
        
        const stealingEffect = document.createElement('div');
        stealingEffect.className = 'dark-deal-stealing-effect';
        stealingEffect.innerHTML = `
            <div class="dark-chains">
                <span class="chain">⛓️</span>
                <span class="chain">🖤</span>
                <span class="chain">⛓️</span>
            </div>
            <div class="shadow-hands">
                <span class="hand">👤</span>
                <span class="hand">🖖</span>
            </div>
            <div class="corruption-aura">💀</div>
        `;
        
        stealingEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 600;
            pointer-events: none;
            animation: darkDealStealing ${this.battleManager.getSpeedAdjustedDelay(1200)}ms ease-out forwards;
        `;
        
        creatureElement.appendChild(stealingEffect);
        
        await this.battleManager.delay(1200);
        
        if (stealingEffect && stealingEffect.parentNode) {
            stealingEffect.remove();
        }
    }

    // Create arrival effect when creature appears with caster
    async createDarkDealArrivalEffect(side, position, creatureIndex) {
        await this.battleManager.delay(100); // Wait for creature to be rendered
        
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;
        
        const arrivalEffect = document.createElement('div');
        arrivalEffect.className = 'dark-deal-arrival-effect';
        arrivalEffect.innerHTML = `
            <div class="dark-portal">
                <span class="portal-ring">🌀</span>
                <span class="dark-mist">💨</span>
            </div>
            <div class="binding-complete">
                <span class="bind">⛓️</span>
                <span class="heart">🖤</span>
                <span class="bind">⛓️</span>
            </div>
        `;
        
        arrivalEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 600;
            pointer-events: none;
            animation: darkDealArrival ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
        `;
        
        creatureElement.appendChild(arrivalEffect);
        
        await this.battleManager.delay(1000);
        
        if (arrivalEffect && arrivalEffect.parentNode) {
            arrivalEffect.remove();
        }
    }

    // Ensure CSS animations exist for dark deal effects
    ensureDarkDealCSS() {
        if (document.getElementById('darkDealCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'darkDealCSS';
        style.textContent = `
            @keyframes darkDealCasting {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                30% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                70% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.3);
                }
            }
            
            @keyframes darkDealStealing {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                25% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1) rotate(90deg);
                }
                75% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0) rotate(270deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.4) rotate(360deg);
                }
            }
            
            @keyframes darkDealArrival {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.0);
                }
            }
            
            .dark-deal-casting-aura .dark-circle {
                position: absolute;
                width: 100px;
                height: 100px;
                border: 3px solid #4a0e4e;
                border-radius: 50%;
                top: -50px;
                left: -50px;
                animation: darkCirclePulse 1.5s ease-in-out infinite;
            }
            
            .dark-deal-casting-aura .evil-runes {
                position: absolute;
                top: -40px;
                left: -40px;
                width: 80px;
                height: 80px;
            }
            
            .dark-deal-casting-aura .rune {
                position: absolute;
                font-size: 16px;
                animation: runeOrbit 3s linear infinite;
            }
            
            .dark-deal-casting-aura .rune:nth-child(1) { animation-delay: 0s; }
            .dark-deal-casting-aura .rune:nth-child(2) { animation-delay: 0.75s; }
            .dark-deal-casting-aura .rune:nth-child(3) { animation-delay: 1.5s; }
            .dark-deal-casting-aura .rune:nth-child(4) { animation-delay: 2.25s; }
            
            .dark-deal-casting-aura .dark-energy {
                position: absolute;
                top: -10px;
                left: -10px;
                font-size: 20px;
                animation: energySpin 2s linear infinite;
            }
            
            .dark-deal-stealing-effect .dark-chains {
                position: absolute;
                top: -30px;
                left: -30px;
                width: 60px;
                height: 60px;
            }
            
            .dark-deal-stealing-effect .chain {
                position: absolute;
                font-size: 18px;
                animation: chainTighten 1.2s ease-in-out;
            }
            
            .dark-deal-stealing-effect .chain:nth-child(1) {
                top: 0;
                left: 20px;
                animation-delay: 0s;
            }
            
            .dark-deal-stealing-effect .chain:nth-child(2) {
                top: 20px;
                left: 0;
                animation-delay: 0.2s;
            }
            
            .dark-deal-stealing-effect .chain:nth-child(3) {
                top: 20px;
                left: 40px;
                animation-delay: 0.4s;
            }
            
            .dark-deal-stealing-effect .shadow-hands {
                position: absolute;
                top: -20px;
                left: -20px;
                width: 40px;
                height: 40px;
            }
            
            .dark-deal-stealing-effect .hand {
                position: absolute;
                font-size: 16px;
                animation: handGrasp 1.2s ease-in-out;
            }
            
            .dark-deal-stealing-effect .hand:nth-child(1) {
                top: 5px;
                left: 5px;
                animation-delay: 0.3s;
            }
            
            .dark-deal-stealing-effect .hand:nth-child(2) {
                top: 5px;
                left: 25px;
                animation-delay: 0.5s;
            }
            
            .dark-deal-stealing-effect .corruption-aura {
                position: absolute;
                top: -5px;
                left: -5px;
                font-size: 22px;
                animation: corruptionPulse 1.2s ease-in-out;
            }
            
            .dark-deal-arrival-effect .dark-portal {
                position: absolute;
                top: -25px;
                left: -25px;
                width: 50px;
                height: 50px;
            }
            
            .dark-deal-arrival-effect .portal-ring {
                position: absolute;
                top: 15px;
                left: 15px;
                font-size: 20px;
                animation: portalSpin 1s linear infinite;
            }
            
            .dark-deal-arrival-effect .dark-mist {
                position: absolute;
                top: 20px;
                left: 20px;
                font-size: 16px;
                animation: mistFlow 1s ease-in-out;
            }
            
            .dark-deal-arrival-effect .binding-complete {
                position: absolute;
                top: -15px;
                left: -15px;
                width: 30px;
                height: 30px;
            }
            
            .dark-deal-arrival-effect .bind {
                position: absolute;
                font-size: 12px;
                animation: bindingSnap 1s ease-out;
            }
            
            .dark-deal-arrival-effect .bind:nth-child(1) {
                top: 5px;
                left: 0;
                animation-delay: 0.3s;
            }
            
            .dark-deal-arrival-effect .bind:nth-child(3) {
                top: 5px;
                left: 20px;
                animation-delay: 0.5s;
            }
            
            .dark-deal-arrival-effect .heart {
                position: absolute;
                top: 5px;
                left: 10px;
                font-size: 14px;
                animation: heartBound 1s ease-out 0.4s;
            }
            
            @keyframes darkCirclePulse {
                0%, 100% { 
                    border-color: #4a0e4e;
                    transform: scale(1);
                }
                50% { 
                    border-color: #8b1538;
                    transform: scale(1.1);
                }
            }
            
            @keyframes runeOrbit {
                0% { 
                    transform: rotate(0deg) translateX(40px) rotate(0deg);
                }
                100% { 
                    transform: rotate(360deg) translateX(40px) rotate(-360deg);
                }
            }
            
            @keyframes energySpin {
                0% { transform: rotate(0deg) scale(1); }
                50% { transform: rotate(180deg) scale(1.2); }
                100% { transform: rotate(360deg) scale(1); }
            }
            
            @keyframes chainTighten {
                0% { 
                    opacity: 0;
                    transform: scale(1.5) rotate(0deg);
                }
                50% { 
                    opacity: 1;
                    transform: scale(1.0) rotate(180deg);
                }
                100% { 
                    opacity: 0.8;
                    transform: scale(0.8) rotate(360deg);
                }
            }
            
            @keyframes handGrasp {
                0% { 
                    opacity: 0;
                    transform: scale(1.2);
                }
                50% { 
                    opacity: 1;
                    transform: scale(0.8);
                }
                100% { 
                    opacity: 0.6;
                    transform: scale(1.0);
                }
            }
            
            @keyframes corruptionPulse {
                0% { 
                    opacity: 0;
                    transform: scale(0.5);
                    text-shadow: 0 0 5px #4a0e4e;
                }
                50% { 
                    opacity: 1;
                    transform: scale(1.3);
                    text-shadow: 0 0 15px #8b1538;
                }
                100% { 
                    opacity: 0;
                    transform: scale(1.0);
                    text-shadow: 0 0 10px #4a0e4e;
                }
            }
            
            @keyframes portalSpin {
                0% { transform: rotate(0deg) scale(0.8); }
                100% { transform: rotate(360deg) scale(1.2); }
            }
            
            @keyframes mistFlow {
                0% { 
                    opacity: 0;
                    transform: translateY(10px);
                }
                50% { 
                    opacity: 0.8;
                    transform: translateY(-5px);
                }
                100% { 
                    opacity: 0;
                    transform: translateY(-15px);
                }
            }
            
            @keyframes bindingSnap {
                0% { 
                    opacity: 0;
                    transform: scale(1.5);
                }
                60% { 
                    opacity: 1;
                    transform: scale(0.8);
                }
                100% { 
                    opacity: 0.7;
                    transform: scale(1.0);
                }
            }
            
            @keyframes heartBound {
                0% { 
                    opacity: 0;
                    transform: scale(0.5);
                    color: #ff0000;
                }
                50% { 
                    opacity: 1;
                    transform: scale(1.2);
                    color: #4a0e4e;
                }
                100% { 
                    opacity: 0.8;
                    transform: scale(1.0);
                    color: #000000;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { spellName, casterName, stealIndex, totalSteals } = data;
        
        if (spellName !== this.spellName) return;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Only log once for the first steal
        if (stealIndex === 0) {
            this.battleManager.addCombatLog(
                `🖤 ${casterName} casts ${this.displayName} and steals ${totalSteals} creature${totalSteals > 1 ? 's' : ''}!`,
                logType
            );
        }
        
        console.log(`🖤 GUEST: ${casterName} used ${this.displayName} (${stealIndex + 1}/${totalSteals})`);
    }

    // Handle creature stealing on guest side
    async handleGuestCreatureStealing(data) {
        const { stolenCreature, originalOwner, newOwner, stealIndex, totalSteals } = data;
        
        // Determine local sides for guest
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const originalLocalSide = originalOwner.side === 'player' ?
            (myAbsoluteSide === 'host' ? 'player' : 'opponent') :
            (myAbsoluteSide === 'host' ? 'opponent' : 'player');
        const newOwnerLocalSide = newOwner.side === 'player' ?
            (myAbsoluteSide === 'host' ? 'player' : 'opponent') :
            (myAbsoluteSide === 'host' ? 'opponent' : 'player');
        
        // Get the heroes
        const originalHeroes = originalLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const newOwnerHeroes = newOwnerLocalSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const originalHero = originalHeroes[originalOwner.position];
        const receivingHero = newOwnerHeroes[newOwner.position];
        
        if (!originalHero || !receivingHero) {
            console.error('GUEST: Could not find heroes for Dark Deal creature stealing');
            return;
        }
        
        // Show stealing effect first
        await this.createDarkDealStealingEffect(
            originalLocalSide, 
            originalOwner.position, 
            originalOwner.creatureIndex
        );
        
        // Remove from original hero (ONLY if it exists to prevent double removal)
        let removedCreature = null;
        if (originalOwner.creatureIndex < originalHero.creatures.length) {
            const targetCreature = originalHero.creatures[originalOwner.creatureIndex];
            if (targetCreature && targetCreature.name === stolenCreature.name) {
                removedCreature = originalHero.creatures.splice(originalOwner.creatureIndex, 1)[0];
            }
        }
        
        // Only proceed if we actually removed a creature (prevents double processing)
        if (!removedCreature && originalHero.creatures.length > 0) {
            // Fallback: find and remove by name
            const targetIndex = originalHero.creatures.findIndex(c => c.name === stolenCreature.name && c.alive);
            if (targetIndex >= 0) {
                removedCreature = originalHero.creatures.splice(targetIndex, 1)[0];
            }
        }
        
        if (!removedCreature) {
            console.warn('GUEST: Creature already removed or not found for Dark Deal stealing');
            return;
        }
        
        // Create the stolen creature (full HP)
        const revivedCreature = {
            name: stolenCreature.name,
            currentHp: stolenCreature.maxHp,
            maxHp: stolenCreature.maxHp,
            atk: stolenCreature.atk,
            alive: true,
            statusEffects: [],
            counters: 0,
            type: 'creature',
            stolenBy: 'DarkDeal',
            stolenAt: Date.now()
        };
        
        // Add to new owner (ONLY if not already there)
        const alreadyExists = receivingHero.creatures.some(c => 
            c.name === revivedCreature.name && c.stolenBy === 'DarkDeal' && 
            Math.abs((c.stolenAt || 0) - Date.now()) < 2000 // Within last 2 seconds
        );
        
        if (!alreadyExists) {
            receivingHero.creatures.push(revivedCreature);
        } else {
            console.warn('GUEST: Creature already exists, skipping addition to prevent duplication');
            return;
        }
        
        // Single complete re-render
        if (this.battleManager.battleScreen && this.battleManager.battleScreen.renderCreaturesAfterInit) {
            this.battleManager.battleScreen.renderCreaturesAfterInit();
        } else {
            // Fallback: update both positions individually
            this.battleManager.updateCreatureVisuals(originalLocalSide, originalOwner.position, originalHero.creatures);
            this.battleManager.updateCreatureVisuals(newOwnerLocalSide, newOwner.position, receivingHero.creatures);
        }
        
        // Update necromancy displays if available
        if (this.battleManager.necromancyManager) {
            this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                originalLocalSide, originalOwner.position, originalHero
            );
            this.battleManager.necromancyManager.updateNecromancyDisplayForHeroWithCreatures(
                newOwnerLocalSide, newOwner.position, receivingHero
            );
        }
        
        // Show arrival effect
        await this.createDarkDealArrivalEffect(
            newOwnerLocalSide, 
            newOwner.position, 
            receivingHero.creatures.length - 1
        );
        
        console.log(`GUEST: ${stolenCreature.name} stolen by Dark Deal (${stealIndex + 1}/${totalSteals})`);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, creaturesStolen, maxSteals) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        const creatureNames = creaturesStolen.map(c => c.creature.name).join(', ');
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `🖤 ${this.displayName} steals ${creaturesStolen.length} creature${creaturesStolen.length > 1 ? 's' : ''}: ${creatureNames}!`,
            logType
        );
        
        // Send spell effect update to guest (for the overall spell cast)
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            totalSteals: creaturesStolen.length,
            maxSteals: maxSteals,
            effectType: 'creature_stealing',
            timestamp: Date.now()
        });
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
            description: 'Makes a deal with dark powers to steal up to X enemy creatures, where X is your DecayMagic level',
            effectFormula: 'Steal up to max(1, DecayMagic level) enemy creatures',
            targetType: 'enemy_creatures',
            spellSchool: 'DecayMagic',
            canOnlyCastWhen: 'Enemies have living creatures'
        };
    }

    // ============================================
    // DARK DEAL GOLD LEARNING SYSTEM
    // ============================================

    // Static method to check if hero can use DarkDeal gold learning
    static canUseGoldLearning(heroSelection, heroPosition, spellCardName) {
        if (spellCardName !== 'DarkDeal') {
            return { canUse: false, reason: 'Not DarkDeal spell' };
        }
        
        const playerGold = heroSelection.goldManager.getPlayerGold();
        const darkDealCost = 10;
        
        if (playerGold >= darkDealCost) {
            const formation = heroSelection.formationManager.getBattleFormation();
            const hero = formation[heroPosition];
            const heroName = hero ? hero.name : 'Hero';
            
            return {
                canUse: true,
                goldCost: darkDealCost,
                playerGold: playerGold,
                heroName: heroName,
                reason: `Spend ${darkDealCost} Gold on a Dark Deal?`
            };
        } else {
            return {
                canUse: false,
                goldCost: darkDealCost,
                playerGold: playerGold,
                reason: `You need ${darkDealCost} Gold for a Dark Deal (have ${playerGold})`
            };
        }
    }

    // Static method to show DarkDeal gold learning dialog
    static showGoldLearningDialog(heroSelection, targetSlot, spellCardName, cardIndex) {
        const goldCheck = DarkDealSpell.canUseGoldLearning(heroSelection, targetSlot, spellCardName);
        
        if (!goldCheck.canUse) {
            console.warn('Cannot show DarkDeal dialog:', goldCheck.reason);
            return false;
        }
        
        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'darkdeal-dialog-overlay';
        overlay.innerHTML = `
            <div class="darkdeal-dialog-container">
                <div class="darkdeal-dialog-header">
                    <h3>💀 Dark Deal</h3>
                    <p>Learn this forbidden spell for ${goldCheck.goldCost} Gold?</p>
                </div>
                
                <div class="darkdeal-dialog-content">
                    <div class="darkdeal-spell-info">
                        <strong>${heroSelection.formatCardName(spellCardName)}</strong>
                    </div>
                    <div class="darkdeal-cost-info">
                        <div class="cost-breakdown">
                            <span class="cost-label">Dark Deal Cost:</span>
                            <span class="cost-value">${goldCheck.goldCost} 💰</span>
                        </div>
                        <div class="cost-breakdown">
                            <span class="cost-label">Your Gold:</span>
                            <span class="cost-value">${goldCheck.playerGold} 💰</span>
                        </div>
                    </div>
                </div>
                
                <div class="darkdeal-dialog-actions">
                    <button class="btn darkdeal-btn-confirm" onclick="window.DarkDealSpell.confirmGoldLearning('${targetSlot}', '${spellCardName}', ${cardIndex})">
                        💀 Make the Deal
                    </button>
                    <button class="btn darkdeal-btn-cancel" onclick="window.DarkDealSpell.cancelGoldLearning()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add event listener for clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                DarkDealSpell.cancelGoldLearning();
            }
        });
        
        // Ensure CSS is loaded
        DarkDealSpell.ensureGoldLearningCSS();
        
        return true;
    }

    // Static method to confirm DarkDeal gold learning
    static async confirmGoldLearning(targetSlot, spellCardName, cardIndex) {
        const heroSelection = window.heroSelection;
        if (!heroSelection) {
            console.error('HeroSelection not available');
            return;
        }
        
        const goldCheck = DarkDealSpell.canUseGoldLearning(heroSelection, targetSlot, spellCardName);
        
        if (!goldCheck.canUse) {
            heroSelection.showSpellDropResult(targetSlot, goldCheck.reason, false);
            DarkDealSpell.cancelGoldLearning();
            return;
        }
        
        // Deduct the gold
        heroSelection.goldManager.addPlayerGold(-goldCheck.goldCost, 'darkdeal_learning');
        
        // Add the spell to hero's spellbook
        const success = heroSelection.heroSpellbookManager.addSpellToHero(targetSlot, spellCardName);
        
        if (success) {
            // Remove spell from hand
            heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            
            // Show success message
            const formation = heroSelection.formationManager.getBattleFormation();
            const hero = formation[targetSlot];
            const successMessage = `${hero.name} made a Dark Deal to learn ${heroSelection.formatCardName(spellCardName)}!`;
            heroSelection.showSpellDropResult(targetSlot, successMessage, true);
            
            // Update UI and save
            heroSelection.updateHandDisplay();
            heroSelection.updateGoldDisplay();
            heroSelection.updateActionDisplay();
            await heroSelection.saveGameState();
            await heroSelection.sendFormationUpdate();
        } else {
            // Refund gold if spell learning failed
            heroSelection.goldManager.addPlayerGold(goldCheck.goldCost, 'darkdeal_refund');
            heroSelection.showSpellDropResult(targetSlot, 'Failed to learn spell', false);
        }
        
        // Clean up dialog
        DarkDealSpell.cancelGoldLearning();
    }

    // Static method to cancel DarkDeal gold learning
    static cancelGoldLearning() {
        const overlay = document.querySelector('.darkdeal-dialog-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // End hand card drag
        if (window.heroSelection && window.heroSelection.handManager) {
            window.heroSelection.handManager.endHandCardDrag();
        }
    }

    // Static method to ensure DarkDeal gold learning CSS is loaded
    static ensureGoldLearningCSS() {
        if (document.getElementById('darkDealGoldLearningCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'darkDealGoldLearningCSS';
        style.textContent = `
            /* DarkDeal Gold Learning Styles */
            .darkdeal-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            }

            .darkdeal-dialog-container {
                background: linear-gradient(135deg, #2d1b69 0%, #1a1a2e 100%);
                border: 3px solid #6a1b9a;
                border-radius: 15px;
                padding: 25px;
                min-width: 350px;
                max-width: 450px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
                animation: scaleIn 0.3s ease-out;
            }

            .darkdeal-dialog-header h3 {
                color: #e1bee7;
                text-align: center;
                margin-bottom: 10px;
                font-size: 20px;
            }

            .darkdeal-dialog-header p {
                color: #ce93d8;
                text-align: center;
                margin-bottom: 20px;
            }

            .darkdeal-spell-info {
                text-align: center;
                margin-bottom: 15px;
                font-size: 16px;
                color: #fff;
            }

            .darkdeal-cost-info {
                margin-bottom: 20px;
            }

            .cost-breakdown {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                color: #e1bee7;
            }

            .cost-value {
                font-weight: bold;
                color: #fff;
            }

            .darkdeal-dialog-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
            }

            .darkdeal-btn-confirm {
                background: linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%);
                color: white;
                border: 2px solid #8e24aa;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .darkdeal-btn-confirm:hover {
                background: linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(106, 27, 154, 0.4);
            }

            .darkdeal-btn-cancel {
                background: linear-gradient(135deg, #424242 0%, #303030 100%);
                color: white;
                border: 2px solid #616161;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .darkdeal-btn-cancel:hover {
                background: linear-gradient(135deg, #515151 0%, #424242 100%);
                transform: translateY(-2px);
            }

            @keyframes scaleIn {
                from {
                    transform: scale(0.8);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Cleanup (called when battle ends)
    cleanup() {
        // Remove any remaining effects
        const effects = document.querySelectorAll('.dark-deal-casting-aura, .dark-deal-stealing-effect, .dark-deal-arrival-effect');
        effects.forEach(effect => effect.remove());
        
        // Remove CSS if needed
        const css = document.getElementById('darkDealCSS');
        if (css) css.remove();
        
        console.log('🖤 Dark Deal spell cleaned up');
    }
}

// Global window exposure with safety
if (typeof window !== 'undefined') {
    window.DarkDealSpell = DarkDealSpell;
    
    // Also expose the static methods directly for easier access
    window.confirmDarkDealGoldLearning = async function(targetSlot, spellCardName, cardIndex) {
        await DarkDealSpell.confirmGoldLearning(targetSlot, spellCardName, cardIndex);
    };
    
    window.cancelDarkDealGoldLearning = function() {
        DarkDealSpell.cancelGoldLearning();
    };
}

// Export for use in spell system
export default DarkDealSpell;