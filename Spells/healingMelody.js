// ./Spells/healingMelody.js - Healing Melody Spell Implementation

export class HealingMelodySpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'HealingMelody';
        this.displayName = 'Healing Melody';
        
        console.log('🎵 Healing Melody spell module initialized');
    }

    // ============================================
    // SPELL CASTING CONDITIONS
    // ============================================

    // Check if spell can be cast (requires eligible targets)
    canCast(caster) {
        const eligibleTargets = this.findEligibleTargets(caster);
        const canCast = eligibleTargets.heroes.length >= 1 || eligibleTargets.creatures.length >= 2;
        
        if (!canCast) {
            console.log(`🎵 ${caster.name} cannot cast ${this.displayName} - insufficient eligible targets`);
        } else {
            console.log(`🎵 ${caster.name} can cast ${this.displayName} - ${eligibleTargets.heroes.length} hero(s), ${eligibleTargets.creatures.length} creature(s) eligible`);
        }
        
        return canCast;
    }

    // Find eligible targets (heroes ≤50% HP and creatures ≤50% HP, all with 0 heal-block)
    findEligibleTargets(caster) {
        const allies = caster.side === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const eligibleTargets = {
            heroes: [],
            creatures: []
        };
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = allies[position];
            if (hero && hero.alive) {
                // Check heal-block stacks for hero
                const heroHealBlockStacks = this.battleManager.statusEffectsManager 
                    ? this.battleManager.statusEffectsManager.getStatusEffectStacks(hero, 'heal-block')
                    : 0;
                
                // Check if hero is eligible (≤50% HP and 0 heal-block)
                const heroHpPercent = (hero.currentHp / hero.maxHp) * 100;
                if (heroHpPercent <= 50 && heroHealBlockStacks === 0) {
                    eligibleTargets.heroes.push({ hero, position });
                    console.log(`🎵 Eligible hero: ${hero.name} at ${position} (${hero.currentHp}/${hero.maxHp} HP, ${heroHealBlockStacks} heal-block)`);
                }
                
                // Check creatures
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, creatureIndex) => {
                        if (creature.alive) {
                            const creatureHealBlockStacks = this.battleManager.statusEffectsManager 
                                ? this.battleManager.statusEffectsManager.getStatusEffectStacks(creature, 'heal-block')
                                : 0;
                            
                            const creatureHpPercent = (creature.currentHp / creature.maxHp) * 100;
                            if (creatureHpPercent <= 50 && creatureHealBlockStacks === 0) {
                                eligibleTargets.creatures.push({ 
                                    hero, 
                                    creature, 
                                    creatureIndex, 
                                    position 
                                });
                                console.log(`🎵 Eligible creature: ${creature.name} at ${position} (${creature.currentHp}/${creature.maxHp} HP, ${creatureHealBlockStacks} heal-block)`);
                            }
                        }
                    });
                }
            }
        });
        
        return eligibleTargets;
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Healing Melody spell effect
    async executeSpell(caster, spell) {
        console.log(`🎵 ${caster.name} casting ${this.displayName}!`);
        
        // Find all allies to heal (any with 0 heal-block, regardless of HP)
        const allTargets = this.findAllHealableTargets(caster);
        
        if (allTargets.heroes.length === 0 && allTargets.creatures.length === 0) {
            console.log(`🎵 ${this.displayName}: No targets can be healed (all have heal-block)!`);
            return;
        }
        
        // Log the spell effect
        this.logSpellEffect(caster, allTargets);
        
        // Play healing melody animation
        await this.playHealingMelodyAnimation(caster, allTargets);
        
        console.log(`🎵 ${this.displayName} completed!`);
    }

    // Find all targets that can be healed (0 heal-block, regardless of HP)
    findAllHealableTargets(caster) {
        const allies = caster.side === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const healableTargets = {
            heroes: [],
            creatures: []
        };
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = allies[position];
            if (hero && hero.alive) {
                // Check heal-block stacks for hero
                const heroHealBlockStacks = this.battleManager.statusEffectsManager 
                    ? this.battleManager.statusEffectsManager.getStatusEffectStacks(hero, 'heal-block')
                    : 0;
                
                // Include hero if no heal-block
                if (heroHealBlockStacks === 0) {
                    healableTargets.heroes.push({ hero, position });
                }
                
                // Check creatures
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, creatureIndex) => {
                        if (creature.alive) {
                            const creatureHealBlockStacks = this.battleManager.statusEffectsManager 
                                ? this.battleManager.statusEffectsManager.getStatusEffectStacks(creature, 'heal-block')
                                : 0;
                            
                            if (creatureHealBlockStacks === 0) {
                                healableTargets.creatures.push({ 
                                    hero, 
                                    creature, 
                                    creatureIndex, 
                                    position 
                                });
                            }
                        }
                    });
                }
            }
        });
        
        return healableTargets;
    }

    // ============================================
    // HEALING MECHANICS
    // ============================================

    // Heal a hero for 100 HP
    healHero(heroData) {
        const { hero, position } = heroData;
        const healAmount = 100;
        
        const oldHp = hero.currentHp;
        const healResult = hero.heal(healAmount);
        const actualHeal = healResult.newHp - oldHp;
        
        console.log(`🎵 ${hero.name} healed for ${actualHeal} HP (${oldHp} → ${healResult.newHp})`);
        
        // Update hero health bar
        this.battleManager.updateHeroHealthBar(hero.side, position, hero.currentHp, hero.maxHp);
        
        return actualHeal;
    }

    // Heal a creature for 100 HP
    healCreature(creatureData) {
        const { hero, creature, creatureIndex, position } = creatureData;
        const healAmount = 100;
        
        const oldHp = creature.currentHp;
        creature.currentHp = Math.min(creature.maxHp, creature.currentHp + healAmount);
        const actualHeal = creature.currentHp - oldHp;
        
        console.log(`🎵 ${creature.name} healed for ${actualHeal} HP (${oldHp} → ${creature.currentHp})`);
        
        // Update creature health bar
        this.battleManager.updateCreatureHealthBar(hero.side, position, creatureIndex, creature.currentHp, creature.maxHp);
        
        return actualHeal;
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the healing melody animation with music notes
    async playHealingMelodyAnimation(caster, targets) {
        console.log(`🎵 Playing Healing Melody animation...`);
        
        // ✅ SEND NETWORK MESSAGE FIRST - before any animations or delays
        // This ensures guest starts animation at the same time as host
        this.sendAnimationStartToGuest(caster, targets);
        
        // Create music notes flying across the battlefield
        this.createMusicNotesAnimation(caster.side);
        
        // Animation timing - FIXED to match CSS animations and respect battle speed
        const musicNotesTime = this.battleManager.getSpeedAdjustedDelay(2500);
        const healingTime = this.battleManager.getSpeedAdjustedDelay(800);
        const musicNotesDelay = this.battleManager.getSpeedAdjustedDelay(1500);
        
        console.log(`🎵 Animation timings: music=${musicNotesTime}ms, healing=${healingTime}ms, delay=${musicNotesDelay}ms`);
        
        // Wait for music notes to fly across before applying healing
        await this.battleManager.delay(musicNotesDelay);
        
        // Apply healing to all targets
        const healingResults = {
            heroes: [],
            creatures: []
        };
        
        // Heal heroes
        targets.heroes.forEach(heroData => {
            const actualHeal = this.healHero(heroData);
            healingResults.heroes.push({
                ...heroData,
                actualHeal
            });
        });
        
        // Heal creatures
        targets.creatures.forEach(creatureData => {
            const actualHeal = this.healCreature(creatureData);
            healingResults.creatures.push({
                ...creatureData,
                actualHeal
            });
        });
        
        // Create healing visual effects on all targets
        this.createHealingEffects(targets);
        
        // Send network update to guest (existing method - for HP updates)
        this.sendHealingUpdate(caster, healingResults);
        
        // Wait for all animations to complete
        // Music notes started at the beginning and run for musicNotesTime
        // Healing effects started now and run for healingTime
        // We need to wait for whichever is longer to finish
        const remainingMusicTime = musicNotesTime - musicNotesDelay;
        const totalWaitTime = Math.max(remainingMusicTime, healingTime);
        
        console.log(`🎵 Waiting ${totalWaitTime}ms for animations to complete...`);
        await this.battleManager.delay(totalWaitTime);
        
        // Small buffer to ensure everything is done
        await this.battleManager.delay(this.battleManager.getSpeedAdjustedDelay(200));
        
        // Cleanup
        this.cleanupHealingMelodyEffects();
        
        console.log(`🎵 HealingMelody animation sequence completed!`);
    }

    sendAnimationStartToGuest(caster, targets) {
        this.battleManager.sendBattleUpdate('healing_melody_start', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            casterLocalSide: caster.side,
            targetCount: targets.heroes.length + targets.creatures.length,
            timestamp: Date.now()
        });
    }

    // Create music notes flying across the battlefield
    createMusicNotesAnimation(casterSide) {        
        const musicNotes = ['♪', '♫', '♬', '♩', '♭', '♯'];
        
        // Try multiple selectors to find the battlefield container
        let battlefield = document.querySelector('.battle-container') || 
                         document.querySelector('.battle-screen') || 
                         document.querySelector('.battle-area') ||
                         document.body;
        
        if (!battlefield) {
            console.error('🎵 ERROR: No battlefield container found for music notes!');
            return;
        }
        
        console.log(`🎵 Using container:`, battlefield.className);
        
        // Ensure CSS exists first
        this.ensureHealingMelodyCSS();
        
        // Create multiple waves of music notes
        for (let wave = 0; wave < 3; wave++) {
            setTimeout(() => {                
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        const note = document.createElement('div');
                        note.className = 'healing-melody-note';
                        note.innerHTML = musicNotes[Math.floor(Math.random() * musicNotes.length)];
                        
                        // Better positioning - use viewport coordinates
                        const startX = 10 + Math.random() * 80; // 10% to 90% of screen width
                        const startY = 10 + Math.random() * 60; // 10% to 70% of screen height
                        const endX = startX + (Math.random() * 60 - 30); // Move up to 30% left or right
                        const endY = startY + (Math.random() * 30 - 15); // Move up to 15% up or down
                        
                        note.style.cssText = `
                            position: fixed;
                            left: ${startX}vw;
                            top: ${startY}vh;
                            font-size: ${28 + Math.random() * 20}px;
                            color: #4CAF50;
                            z-index: 9999;
                            pointer-events: none;
                            animation: healingMelodyNote ${this.battleManager.getSpeedAdjustedDelay(2500)}ms ease-out forwards;
                            text-shadow: 
                                0 0 15px rgba(76, 175, 80, 1),
                                0 0 30px rgba(76, 175, 80, 0.8),
                                0 0 45px rgba(76, 175, 80, 0.6);
                            font-weight: bold;
                        `;
                        
                        // Set target position for animation
                        note.style.setProperty('--end-x', `${endX}vw`);
                        note.style.setProperty('--end-y', `${endY}vh`);
                        
                        document.body.appendChild(note); // Always append to body for maximum visibility
                        
                        // Remove note after animation
                        setTimeout(() => {
                            if (note && note.parentNode) {
                                note.remove();
                            }
                        }, this.battleManager.getSpeedAdjustedDelay(2500));
                        
                    }, this.battleManager.getSpeedAdjustedDelay(i * 150));
                }
            }, this.battleManager.getSpeedAdjustedDelay(wave * 600));
        }
    }

    // Create healing visual effects on targets
    createHealingEffects(targets) {
        // Create healing effects on heroes
        targets.heroes.forEach(heroData => {
            const heroElement = this.battleManager.getHeroElement(heroData.hero.side, heroData.position);
            if (heroElement) {
                this.createHealingEffect(heroElement);
            }
        });
        
        // Create healing effects on creatures
        targets.creatures.forEach(creatureData => {
            const creatureElement = document.querySelector(
                `.${creatureData.hero.side}-slot.${creatureData.position}-slot .creature-icon[data-creature-index="${creatureData.creatureIndex}"]`
            );
            if (creatureElement) {
                this.createHealingEffect(creatureElement);
            }
        });
    }

    // Create individual healing effect
    createHealingEffect(targetElement) {
        const effect = document.createElement('div');
        effect.className = 'healing-melody-heal-effect';
        effect.innerHTML = '✨💚✨';
        
        effect.style.cssText = `
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 32px;
            z-index: 500;
            pointer-events: none;
            animation: healingMelodyHeal ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(76, 175, 80, 1),
                0 0 30px rgba(76, 175, 80, 0.8),
                0 0 45px rgba(76, 175, 80, 0.6);
        `;
        
        targetElement.appendChild(effect);
        
        // Remove effect after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(800));
    }

    // Send healing update to network
    sendHealingUpdate(caster, healingResults) {
        // Send individual healing messages for each hero
        healingResults.heroes.forEach(heroData => {
            this.battleManager.sendBattleUpdate('hero_healed', {
                targetAbsoluteSide: heroData.hero.absoluteSide,
                targetPosition: heroData.position,
                targetName: heroData.hero.name,
                healing: heroData.actualHeal,
                oldHp: heroData.hero.currentHp - heroData.actualHeal, // Calculate old HP
                newHp: heroData.hero.currentHp,
                maxHp: heroData.hero.maxHp,
                timestamp: Date.now()
            });
        });
        
        // Send individual healing messages for each creature
        healingResults.creatures.forEach(creatureData => {
            this.battleManager.sendBattleUpdate('creature_healed', {
                heroAbsoluteSide: creatureData.hero.absoluteSide,
                heroPosition: creatureData.position,
                creatureIndex: creatureData.creatureIndex,
                creatureName: creatureData.creature.name,
                healing: creatureData.actualHeal,
                oldHp: creatureData.creature.currentHp - creatureData.actualHeal, // Calculate old HP
                newHp: creatureData.creature.currentHp,
                maxHp: creatureData.creature.maxHp,
                timestamp: Date.now()
            });
        });
        
        // Also send the original batch message for the spell system to handle
        this.battleManager.sendBattleUpdate('healing_melody_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            healingResults: {
                heroes: healingResults.heroes.map(heroData => ({
                    targetAbsoluteSide: heroData.hero.absoluteSide,
                    targetPosition: heroData.position,
                    targetName: heroData.hero.name,
                    currentHp: heroData.hero.currentHp,
                    maxHp: heroData.hero.maxHp,
                    actualHeal: heroData.actualHeal
                })),
                creatures: healingResults.creatures.map(creatureData => ({
                    heroAbsoluteSide: creatureData.hero.absoluteSide,
                    heroPosition: creatureData.position,
                    creatureIndex: creatureData.creatureIndex,
                    creatureName: creatureData.creature.name,
                    currentHp: creatureData.creature.currentHp,
                    maxHp: creatureData.creature.maxHp,
                    actualHeal: creatureData.actualHeal
                }))
            },
            effectType: 'mass_healing',
            timestamp: Date.now()
        });
    }

    // Clean up any remaining healing melody effects
    cleanupHealingMelodyEffects() {
        // Remove any remaining music notes
        const musicNotes = document.querySelectorAll('.healing-melody-note');
        musicNotes.forEach(note => note.remove());
        
        // Remove any remaining healing effects
        const healingEffects = document.querySelectorAll('.healing-melody-heal-effect');
        healingEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for healing melody effects
    ensureHealingMelodyCSS() {
        if (document.getElementById('healingMelodyCSS')) return;
                
        const style = document.createElement('style');
        style.id = 'healingMelodyCSS';
        style.textContent = `
            @keyframes healingMelodyNote {
                0% { 
                    opacity: 0;
                    transform: scale(0.5) rotate(0deg);
                }
                10% {
                    opacity: 1;
                    transform: scale(1.2) rotate(45deg);
                }
                50% {
                    opacity: 0.9;
                    transform: scale(1.0) rotate(180deg);
                    left: calc(var(--end-x));
                    top: calc(var(--end-y));
                }
                90% {
                    opacity: 0.5;
                    transform: scale(0.8) rotate(315deg);
                    left: calc(var(--end-x));
                    top: calc(var(--end-y));
                }
                100% { 
                    opacity: 0;
                    transform: scale(0.3) rotate(360deg);
                    left: calc(var(--end-x));
                    top: calc(var(--end-y));
                }
            }
            
            @keyframes healingMelodyHeal {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3); 
                }
                25% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1); 
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3); 
                }
                75% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.5); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(1.8); 
                }
            }
            
            /* Enhanced visual effects */
            .healing-melody-note {
                will-change: transform, opacity, left, top;
                transition: left 2s ease-out, top 2s ease-out;
            }
            
            .healing-melody-heal-effect {
                will-change: transform, opacity;
            }
            
            /* Ensure notes are always visible */
            .healing-melody-note {
                font-family: 'Arial Unicode MS', Arial, sans-serif;
                z-index: 99999 !important;
                position: fixed !important;
            }
        `;
        
        document.head.appendChild(style);
        console.log('🎵 HealingMelody CSS added to document');
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, targets) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        const totalTargets = targets.heroes.length + targets.creatures.length;
        
        // Main spell effect log
        const logMessage = `🎵 ${this.displayName} heals ${totalTargets} allies with soothing music!`;
        
        this.battleManager.addCombatLog(logMessage, logType);
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    async handleGuestSpellEffect(data) {
        console.log(`🎵 GUEST: Handling HealingMelody spell effect`, data);
        
        const { displayName, casterName, healingResults } = data; 
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        const totalTargets = healingResults.heroes.length + healingResults.creatures.length;
        const logMessage = `🎵 ${displayName} heals ${totalTargets} allies with soothing music!`;
        this.battleManager.addCombatLog(logMessage, logType);
        
        // Note: HP updates are now handled by dedicated guest_handleHeroHealed and guest_handleCreatureHealed handlers
        // This ensures proper network synchronization of HP bar updates
        
        // Wait for animation to complete before continuing
        console.log(`🎵 GUEST: Starting animation for ${casterLocalSide} side and waiting...`);
        await this.playGuestSideAnimation(casterLocalSide);
        
        console.log(`🎵 GUEST: ${casterName} used ${displayName} (healed ${totalTargets} targets) - Complete!`);
    }

    // Guest-side animation (visual only)
    async playGuestSideAnimation(casterLocalSide) {
        console.log(`🎵 GUEST: Playing animation for ${casterLocalSide} side`);
        
        // Create music notes animation IMMEDIATELY
        this.createMusicNotesAnimation(casterLocalSide);
        
        // Wait for music notes to fly before showing healing effects (speed-adjusted)
        const musicNotesDelay = this.battleManager.getSpeedAdjustedDelay(1500);
        await this.battleManager.delay(musicNotesDelay);
        
        console.log(`🎵 GUEST: Creating healing effects after ${musicNotesDelay}ms`);
        
        // Create healing effects on all valid targets
        ['left', 'center', 'right'].forEach(position => {
            const heroes = casterLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
            const hero = heroes[position];
            
            if (hero && hero.alive) {
                // Create healing effect on hero
                const heroElement = this.battleManager.getHeroElement(casterLocalSide, position);
                if (heroElement) {
                    this.createHealingEffect(heroElement);
                    console.log(`🎵 GUEST: Added healing effect to ${hero.name}`);
                }
                
                // Create healing effects on creatures
                if (hero.creatures) {
                    hero.creatures.forEach((creature, creatureIndex) => {
                        if (creature.alive) {
                            const creatureElement = document.querySelector(
                                `.${casterLocalSide}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
                            );
                            if (creatureElement) {
                                this.createHealingEffect(creatureElement);
                                console.log(`🎵 GUEST: Added healing effect to ${creature.name}`);
                            }
                        }
                    });
                }
            }
        });
        
        // Wait for animations to complete (same timing as host)
        const musicNotesTime = this.battleManager.getSpeedAdjustedDelay(2500);
        const healingTime = this.battleManager.getSpeedAdjustedDelay(800);
        const remainingMusicTime = musicNotesTime - musicNotesDelay;
        const totalWaitTime = Math.max(remainingMusicTime, healingTime);
        
        console.log(`🎵 GUEST: Waiting ${totalWaitTime}ms for remaining animations...`);
        await this.battleManager.delay(totalWaitTime);
        
        // Small buffer
        await this.battleManager.delay(this.battleManager.getSpeedAdjustedDelay(200));
        
        // Cleanup
        this.cleanupHealingMelodyEffects();
        
        console.log(`🎵 GUEST: Animation sequence completed!`);
    }

    // ============================================
    // DEBUG AND TESTING
    // ============================================

    // Test method - call this to test music notes animation
    testMusicNotesAnimation() {
        console.log('🎵 TESTING: Starting music notes animation test');
        this.createMusicNotesAnimation('player');
        
        // Also test a simple note creation
        setTimeout(() => {
            const testNote = document.createElement('div');
            testNote.innerHTML = '♪ TEST ♪';
            testNote.style.cssText = `
                position: fixed;
                top: 50vh;
                left: 50vw;
                font-size: 48px;
                color: #FF0000;
                z-index: 99999;
                background: yellow;
                padding: 10px;
                border: 3px solid black;
            `;
            document.body.appendChild(testNote);
            
            setTimeout(() => testNote.remove(), 3000);
        }, 1000);
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
            description: 'Heals all allies without heal-block for 150 HP with soothing musical notes. Requires at least 1 injured hero or 2 injured creatures to cast.',
            effectFormula: 'Heal all allies (0 heal-block) for 150 HP',
            targetType: 'all_allies',
            spellSchool: 'Divine',
            restrictions: 'Requires 1+ heroes ≤50% HP OR 2+ creatures ≤50% HP (with 0 heal-block)'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupHealingMelodyEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('healingMelodyCSS');
        if (css) css.remove();
        
        console.log('🎵 Healing Melody spell cleaned up');
    }
}

// Export for use in spell system
export default HealingMelodySpell;