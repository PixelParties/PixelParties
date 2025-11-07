// ./Spells/soulTransmigrationRitual.js - Soul Transmigration Ritual Spell Implementation

export class SoulTransmigrationRitualSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'SoulTransmigrationRitual';
        this.displayName = 'Soul Transmigration Ritual';
        
        console.log('⚗️💀 Soul Transmigration Ritual spell module initialized');
    }

    // ============================================
    // SPELL CASTING CONDITIONS
    // ============================================

    // Check if spell can be cast (requires at least 1 dead ally and 3+ living creatures)
    canCast(caster) {
        // Check for defeated allies
        const eligibleDeadHeroes = this.findEligibleDeadHeroes(caster);
        if (eligibleDeadHeroes.length === 0) {
            console.log(`⚗️💀 ${caster.name} cannot cast ${this.displayName} - no eligible defeated allies`);
            return false;
        }

        // Check for at least 3 living creatures
        const livingCreatures = this.findLivingCreatures(caster);
        if (livingCreatures.length < 3) {
            console.log(`⚗️💀 ${caster.name} cannot cast ${this.displayName} - only ${livingCreatures.length}/3 living creatures`);
            return false;
        }

        console.log(`⚗️💀 ${caster.name} can cast ${this.displayName} - ${eligibleDeadHeroes.length} defeated hero(es), ${livingCreatures.length} creature(s)`);
        return true;
    }

    // Find defeated ally heroes with 0 heal-block stacks
    findEligibleDeadHeroes(caster) {
        const allies = caster.side === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const eligibleTargets = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = allies[position];
            if (hero && !hero.alive) {
                // Check heal-block stacks
                const healBlockStacks = this.battleManager.statusEffectsManager 
                    ? this.battleManager.statusEffectsManager.getStatusEffectStacks(hero, 'heal-block')
                    : 0;
                
                if (healBlockStacks === 0) {
                    eligibleTargets.push({ hero, position });
                    console.log(`⚗️💀 Eligible dead hero found: ${hero.name} at ${position} (${healBlockStacks} heal-block stacks)`);
                } else {
                    console.log(`⚗️💀 ${hero.name} at ${position} not eligible (${healBlockStacks} heal-block stacks)`);
                }
            }
        });
        
        return eligibleTargets;
    }

    // Find all living creatures on caster's side
    findLivingCreatures(caster) {
        const alliedHeroes = caster.side === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const livingCreatures = [];
        
        for (const position of ['left', 'center', 'right']) {
            const hero = alliedHeroes[position];
            if (hero && hero.alive && hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (creature.alive && creature.currentHp > 0) {
                        livingCreatures.push({
                            hero: hero,
                            creature: creature,
                            creatureIndex: index,
                            position: position,
                            side: caster.side
                        });
                    }
                });
            }
        }
        
        return livingCreatures;
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Soul Transmigration Ritual spell effect
    async executeSpell(caster, spell) {
        console.log(`⚗️💀 ${caster.name} casting ${this.displayName}!`);
        
        // Find eligible dead heroes
        const eligibleDeadHeroes = this.findEligibleDeadHeroes(caster);
        
        if (eligibleDeadHeroes.length === 0) {
            console.log(`⚗️💀 ${this.displayName}: No eligible dead heroes found!`);
            return;
        }
        
        // Find living creatures
        const livingCreatures = this.findLivingCreatures(caster);
        
        if (livingCreatures.length < 3) {
            console.log(`⚗️💀 ${this.displayName}: Not enough living creatures (${livingCreatures.length}/3)!`);
            return;
        }
        
        // Select 3 lowest-level creatures to sacrifice
        const sacrificeTargets = this.selectLowestLevelCreatures(livingCreatures, 3);
        
        // Randomly select a defeated hero to revive
        const randomIndex = Math.floor(this.battleManager.getRandom() * eligibleDeadHeroes.length);
        const revivalTarget = eligibleDeadHeroes[randomIndex];
        
        console.log(`⚗️💀 ${this.displayName} targeting: ${revivalTarget.hero.name} at ${revivalTarget.position}`);
        console.log(`⚗️💀 Sacrificing creatures: ${sacrificeTargets.map(t => t.creature.name).join(', ')}`);
        
        // Log the spell effect
        this.logSpellEffect(caster, sacrificeTargets, revivalTarget);
        
        // STEP 1: Sacrifice the creatures
        await this.sacrificeCreatures(sacrificeTargets, caster);
        
        // STEP 2: Play ritual animation
        await this.playRitualAnimation(caster, revivalTarget);
        
        // STEP 3: Revive the hero
        const revivalHp = this.calculateRevivalHp(caster, revivalTarget.hero);
        this.reviveHero(revivalTarget, revivalHp);
        
        // STEP 4: Send network update
        this.sendRitualUpdate(caster, sacrificeTargets, revivalTarget, revivalHp);
        
        console.log(`⚗️💀 ${this.displayName} completed!`);
    }

    // ============================================
    // CREATURE SELECTION AND SACRIFICE
    // ============================================

    // Select N lowest-level creatures (if tied, random selection among tied creatures)
    selectLowestLevelCreatures(creatures, count) {
        // Sort creatures by level (ascending)
        const sortedCreatures = [...creatures].sort((a, b) => {
            const levelA = a.creature.level || 1;
            const levelB = b.creature.level || 1;
            return levelA - levelB;
        });
        
        // Get the level of the Nth creature (determines cutoff)
        const cutoffLevel = sortedCreatures[Math.min(count - 1, sortedCreatures.length - 1)].creature.level || 1;
        
        // Get all creatures at or below the cutoff level
        const candidates = sortedCreatures.filter(c => (c.creature.level || 1) <= cutoffLevel);
        
        // If we have exactly the count we need, return them
        if (candidates.length === count) {
            return candidates.slice(0, count);
        }
        
        // If we have more than needed, randomly select from the candidates at the cutoff level
        const belowCutoff = candidates.filter(c => (c.creature.level || 1) < cutoffLevel);
        const atCutoff = candidates.filter(c => (c.creature.level || 1) === cutoffLevel);
        
        // Take all below cutoff, then randomly select from those at cutoff
        const needed = count - belowCutoff.length;
        const shuffledAtCutoff = this.shuffleArray([...atCutoff]);
        const selected = [...belowCutoff, ...shuffledAtCutoff.slice(0, needed)];
        
        console.log(`⚗️💀 Selected ${count} lowest-level creatures (cutoff level: ${cutoffLevel})`);
        return selected;
    }

    // Shuffle array helper (Fisher-Yates)
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.battleManager.getRandom() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Sacrifice multiple creatures sequentially
    async sacrificeCreatures(sacrificeTargets, caster) {
        console.log(`⚗️💀 Beginning ritual sacrifice of ${sacrificeTargets.length} creatures...`);
        
        for (let i = 0; i < sacrificeTargets.length; i++) {
            const target = sacrificeTargets[i];
            const { hero, creature, creatureIndex, position, side } = target;
            
            console.log(`⚗️💀 Sacrificing creature ${i + 1}/3: ${creature.name} (Level ${creature.level || 1})`);
            
            // Apply maximum damage to instantly defeat the creature
            this.battleManager.authoritative_applyDamageToCreature({
                hero: hero,
                creature: creature,
                creatureIndex: creatureIndex,
                damage: creature.currentHp, // Deal exactly enough damage to kill
                position: position,
                side: side
            }, {
                source: 'spell_sacrifice',
                attacker: caster,
                spellName: this.spellName
            });
            
            // Add sacrifice log
            this.battleManager.addCombatLog(
                `⚗️💀 ${creature.name} is consumed by the ritual!`,
                side === 'player' ? 'warning' : 'info'
            );
            
            // Small delay between sacrifices for dramatic effect
            await this.battleManager.delay(250);
        }
        
        console.log(`⚗️💀 All creatures sacrificed for the ritual`);
    }

    // ============================================
    // REVIVAL MECHANICS
    // ============================================

    // Calculate revival HP based on SupportMagic level
    calculateRevivalHp(caster, targetHero) {
        const basePercent = 0.10; // 10% base
        
        // Get SupportMagic level
        const supportMagicLevel = caster.hasAbility('SupportMagic') 
            ? caster.getAbilityStackCount('SupportMagic') 
            : 0;
        
        // Total percent = 10% + (10% × SupportMagic level), capped at 100%
        const bonusPercent = supportMagicLevel * 0.10;
        const totalPercent = Math.min(1.0, basePercent + bonusPercent); // Cap at 100%
        
        // Calculate HP and always round UP
        const revivalHp = Math.ceil(targetHero.maxHp * totalPercent);
        
        console.log(`⚗️💀 Revival calculation: ${targetHero.name} maxHp=${targetHero.maxHp}, SupportMagic=${supportMagicLevel}, percent=${(totalPercent * 100).toFixed(0)}%, revivalHp=${revivalHp}`);
        
        return revivalHp;
    }

    // Revive the target hero
    reviveHero(targetData, revivalHp) {
        const { hero, position } = targetData;
        const casterSide = hero.side;
        
        // Revive the hero
        hero.alive = true;
        hero.currentHp = revivalHp;
        
        console.log(`⚗️💀 ${hero.name} revived with ${revivalHp}/${hero.maxHp} HP`);
        
        // Update hero visual state
        this.updateHeroVisualState(casterSide, position, hero);
        
        return revivalHp;
    }

    // Update hero visual state after revival
    updateHeroVisualState(side, position, hero) {
        // Remove defeated visual state
        const heroElement = this.battleManager.getHeroElement(side, position);
        if (heroElement) {
            const card = heroElement.querySelector('.battle-hero-card');
            if (card) {
                card.classList.remove('defeated');
                card.style.filter = '';
                card.style.opacity = '';
                card.style.transform = '';
            }
        }
        
        // Update health bar
        this.battleManager.updateHeroHealthBar(side, position, hero.currentHp, hero.maxHp);
        
        console.log(`⚗️💀 Updated visual state for revived ${hero.name}`);
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the ritual animation
    async playRitualAnimation(caster, targetData) {
        console.log(`⚗️💀 Playing Soul Transmigration Ritual animation for ${targetData.hero.name}...`);
        
        const { hero, position } = targetData;
        const targetElement = this.battleManager.getHeroElement(hero.side, position);
        
        if (!targetElement) {
            console.error('Could not find target element for ritual animation');
            return;
        }
        
        // Create ritual circle effect
        this.createRitualCircleEffect(targetElement);
        
        // Create soul wisps rising effect
        this.createSoulWispsEffect(targetElement);
        
        // Animation timing
        const ritualTime = 600; // Ritual circle and wisps
        const revivalTime = 300; // Revival burst
        
        // Wait for ritual to build
        await this.battleManager.delay(ritualTime);
        
        // Create revival burst effect
        this.createRevivalBurstEffect(targetElement);
        
        // Wait for revival effect to complete
        await this.battleManager.delay(revivalTime);
        
        // Cleanup
        this.cleanupRitualEffects();
    }

    // Create ritual circle at target location
    createRitualCircleEffect(targetElement) {
        const effect = document.createElement('div');
        effect.className = 'soul-ritual-circle';
        effect.innerHTML = '⭕🔮⭕';
        
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.5);
            font-size: 64px;
            z-index: 400;
            pointer-events: none;
            animation: soulRitualCircle ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
            text-shadow: 
                0 0 30px rgba(138, 43, 226, 1),
                0 0 60px rgba(75, 0, 130, 0.8),
                0 0 90px rgba(148, 0, 211, 0.6);
            filter: drop-shadow(0 0 15px rgba(138, 43, 226, 0.9));
        `;
        
        targetElement.appendChild(effect);
        
        // Ensure CSS exists
        this.ensureRitualCSS();
    }

    // Create soul wisps rising from ritual circle
    createSoulWispsEffect(targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;
        
        // Create multiple soul wisps
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const wisp = document.createElement('div');
                wisp.className = 'soul-ritual-wisp';
                wisp.innerHTML = '👻';
                
                const offsetX = (Math.random() - 0.5) * 80;
                
                wisp.style.cssText = `
                    position: fixed;
                    left: ${targetX + offsetX}px;
                    top: ${targetY + 60}px;
                    font-size: ${20 + Math.random() * 12}px;
                    z-index: 420;
                    pointer-events: none;
                    animation: soulRitualWisp ${this.battleManager.getSpeedAdjustedDelay(500)}ms ease-out forwards;
                    opacity: 0;
                    text-shadow: 
                        0 0 15px rgba(255, 255, 255, 0.9),
                        0 0 30px rgba(138, 43, 226, 0.7);
                `;
                
                wisp.style.setProperty('--target-x', `${targetX}px`);
                wisp.style.setProperty('--target-y', `${targetY}px`);
                
                document.body.appendChild(wisp);
            }, this.battleManager.getSpeedAdjustedDelay(i * 120));
        }
    }

    // Create revival burst effect
    createRevivalBurstEffect(targetElement) {
        const effect = document.createElement('div');
        effect.className = 'soul-ritual-revival-burst';
        effect.innerHTML = '✨💜✨';
        
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 72px;
            z-index: 500;
            pointer-events: none;
            animation: soulRitualRevivalBurst ${this.battleManager.getSpeedAdjustedDelay(300)}ms ease-out forwards;
            text-shadow: 
                0 0 30px rgba(255, 255, 255, 1),
                0 0 60px rgba(138, 43, 226, 0.9),
                0 0 90px rgba(148, 0, 211, 0.7);
        `;
        
        targetElement.appendChild(effect);
        
        // Remove effect after animation
        setTimeout(() => {
            if (effect && effect.parentNode) {
                effect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(300));
    }

    // Clean up any remaining ritual effects
    cleanupRitualEffects() {
        // Remove ritual circles
        const circles = document.querySelectorAll('.soul-ritual-circle');
        circles.forEach(circle => circle.remove());
        
        // Remove soul wisps
        const wisps = document.querySelectorAll('.soul-ritual-wisp');
        wisps.forEach(wisp => wisp.remove());
        
        // Remove revival bursts
        const bursts = document.querySelectorAll('.soul-ritual-revival-burst');
        bursts.forEach(burst => burst.remove());
    }

    // Ensure CSS animations exist for ritual effects
    ensureRitualCSS() {
        if (document.getElementById('soulRitualCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'soulRitualCSS';
        style.textContent = `
            @keyframes soulRitualCircle {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                25% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.0) rotate(90deg);
                }
                75% {
                    opacity: 0.9;
                    transform: translate(-50%, -50%) scale(1.2) rotate(270deg);
                }
                100% { 
                    opacity: 0.2;
                    transform: translate(-50%, -50%) scale(1.5) rotate(360deg);
                }
            }
            
            @keyframes soulRitualWisp {
                0% { 
                    opacity: 0;
                    top: calc(var(--target-y) + 60px);
                    transform: translateX(0) scale(0.5);
                }
                30% {
                    opacity: 1;
                    transform: translateX(0) scale(1.0);
                }
                100% { 
                    opacity: 0;
                    top: var(--target-y);
                    transform: translateX(0) scale(0.7);
                }
            }
            
            @keyframes soulRitualRevivalBurst {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.4) rotate(0deg); 
                }
                40% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.4) rotate(120deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(2.2) rotate(360deg); 
                }
            }
            
            /* Enhanced visual effects */
            .soul-ritual-circle {
                will-change: transform, opacity;
            }
            
            .soul-ritual-wisp {
                will-change: transform, opacity, top;
            }
            
            .soul-ritual-revival-burst {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, sacrificeTargets, revivalTarget) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        const creatureNames = sacrificeTargets.map(t => t.creature.name).join(', ');
        const targetName = revivalTarget.hero.name;
        
        // Main spell effect log
        const logMessage = `⚗️💀 ${this.displayName} sacrifices ${creatureNames} to revive ${targetName}!`;
        
        this.battleManager.addCombatLog(logMessage, logType);
    }

    // ============================================
    // NETWORK SYNCHRONIZATION
    // ============================================

    // Send ritual update to network
    sendRitualUpdate(caster, sacrificeTargets, revivalTarget, revivalHp) {
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: revivalTarget.hero.name,
            targetAbsoluteSide: revivalTarget.hero.absoluteSide,
            targetPosition: revivalTarget.position,
            revivalHp: revivalHp,
            maxHp: revivalTarget.hero.maxHp,
            effectType: 'soul_transmigration_ritual',
            // Sacrifice information for guest-side handling
            sacrificeInfo: sacrificeTargets.map(target => ({
                creatureName: target.creature.name,
                creatureLevel: target.creature.level || 1,
                heroAbsoluteSide: target.hero.absoluteSide,
                heroPosition: target.position,
                creatureIndex: target.creatureIndex
            })),
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, sacrificeInfo, revivalHp, maxHp } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Handle sacrifices first if provided
        if (sacrificeInfo && sacrificeInfo.length > 0) {
            sacrificeInfo.forEach(sacrifice => {
                this.handleGuestSacrifice(sacrifice);
            });
        }
        
        // Add spell casting log
        const creatureNames = sacrificeInfo.map(s => s.creatureName).join(', ');
        this.battleManager.addCombatLog(
            `⚗️💀 ${displayName} sacrifices ${creatureNames} to revive ${targetName}!`,
            logType
        );
        
        // Update target hero on guest side
        const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetHeroes = targetLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const targetHero = targetHeroes[data.targetPosition];
        
        if (targetHero) {
            // Revive the hero
            targetHero.alive = true;
            targetHero.currentHp = revivalHp;
            
            // Update visual state
            this.updateHeroVisualState(targetLocalSide, data.targetPosition, targetHero);
        }
        
        // Create mock objects for guest-side animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const mockTarget = {
            hero: targetHero || { name: targetName },
            position: data.targetPosition
        };
        
        // Play visual effects on guest side
        this.playRitualAnimationGuestSide(mockCaster, mockTarget);
        
        console.log(`⚗️💀 GUEST: ${casterName} used ${displayName} to revive ${targetName} (${revivalHp}/${maxHp} HP)`);
    }

    // Handle sacrifice effect on guest side
    handleGuestSacrifice(sacrificeInfo) {
        const { heroAbsoluteSide, heroPosition, creatureIndex, creatureName } = sacrificeInfo;
        
        // Determine local side for guest
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find the hero and creature
        const heroes = heroLocalSide === 'player' ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        const hero = heroes[heroPosition];
        
        if (hero && hero.creatures && hero.creatures[creatureIndex]) {
            const creature = hero.creatures[creatureIndex];
            
            // Apply visual death state immediately
            if (creature.name === creatureName) {
                creature.alive = false;
                creature.currentHp = 0;
                
                // Update visual state
                this.battleManager.handleCreatureDeathWithoutRevival(hero, creature, creatureIndex, heroLocalSide, heroPosition);
                
                // Add to combat log
                this.battleManager.addCombatLog(
                    `⚗️💀 ${creatureName} is consumed by the ritual!`,
                    heroLocalSide === 'player' ? 'warning' : 'info'
                );
                
                console.log(`⚗️💀 GUEST: Sacrificed ${creatureName} for Soul Transmigration Ritual`);
            }
        }
    }

    // Guest-side animation (visual only, revival already handled)
    async playRitualAnimationGuestSide(caster, target) {
        const targetElement = this.battleManager.getHeroElement(target.hero.side || target.hero.localSide || 'player', target.position);
        
        if (!targetElement) {
            console.error('Could not find target element for guest ritual animation');
            return;
        }
        
        // Create ritual circle effect
        this.createRitualCircleEffect(targetElement);
        
        // Create soul wisps effect
        this.createSoulWispsEffect(targetElement);
        
        // Animation timing
        const ritualTime = 600;
        const revivalTime = 300;
        
        // Wait for ritual to build
        await this.battleManager.delay(ritualTime);
        
        // Create revival burst effect
        this.createRevivalBurstEffect(targetElement);
        
        // Wait for revival effect to complete
        await this.battleManager.delay(revivalTime);
        
        // Cleanup
        this.cleanupRitualEffects();
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
            description: 'Sacrifices 3 of your lowest-level Creatures to revive a random defeated ally. Revival HP: 10% + (10% × SupportMagic level), capped at 100%.',
            effectFormula: 'Revive at 10% + (10% × SupportMagic) max HP, capped at 100%',
            targetType: 'random_dead_ally',
            spellSchool: 'SupportMagic',
            requirements: 'Requires at least 1 defeated ally with 0 heal-block stacks and 3+ living creatures',
            restrictions: 'Sacrifices 3 lowest-level creatures.'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupRitualEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('soulRitualCSS');
        if (css) css.remove();
        
        console.log('⚗️💀 Soul Transmigration Ritual spell cleaned up');
    }
}

// Export for use in spell system
export default SoulTransmigrationRitualSpell;