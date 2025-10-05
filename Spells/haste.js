// ./Spells/haste.js - Haste Spell Implementation

export class HasteSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Haste';
        this.displayName = 'Haste';
        
        console.log('⚡ Haste spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Haste spell effect
    async executeSpell(caster, spell) {
        console.log(`⚡ ${caster.name} casting ${this.displayName}!`);
        
        // Calculate number of targets based on SupportMagic level
        const targetCount = this.calculateTargetCount(caster);
        
        // Find random ally targets
        const targets = this.findRandomAllyTargets(caster, targetCount);
        
        if (targets.length === 0) {
            console.log(`⚡ ${this.displayName}: No valid targets found!`);
            this.battleManager.addCombatLog(
                `⚡ ${this.displayName} fizzles - no allies to hasten!`,
                caster.side === 'player' ? 'success' : 'error'
            );
            return;
        }

        // Log the spell effect
        this.logSpellEffect(caster, targets, targetCount);
        
        // Play haste animation on all targets
        await this.playHasteAnimation(caster, targets);
        
        // Grant additional actions to all targets
        await this.grantAdditionalActions(targets);
        
        console.log(`⚡ ${this.displayName} completed!`);
    }

    // ============================================
    // TARGET CALCULATION AND SELECTION
    // ============================================

    // Calculate number of targets based on SupportMagic level
    calculateTargetCount(caster) {
        // Get SupportMagic level (defaults to 0 if hero doesn't have the ability)
        const supportMagicLevel = caster.hasAbility('SupportMagic') 
            ? caster.getAbilityStackCount('SupportMagic') 
            : 0;
        
        // FIXED: Ensure minimum level of 1 for calculations
        const effectiveLevel = Math.max(1, supportMagicLevel);
        
        console.log(`⚡ ${caster.name} SupportMagic level ${supportMagicLevel} (effective: ${effectiveLevel}): targeting up to ${effectiveLevel} allies`);
        
        return effectiveLevel;
    }

    // Find random ally targets (heroes and creatures)
    findRandomAllyTargets(caster, maxTargets) {
        const alliedSide = caster.side;
        const alliedHeroes = alliedSide === 'player' ? 
            this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
        
        const allTargets = [];
        
        // Collect all alive allied heroes and creatures
        ['left', 'center', 'right'].forEach(position => {
            const hero = alliedHeroes[position];
            if (hero && hero.alive) {
                // Add hero as potential target
                allTargets.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    side: alliedSide,
                    name: hero.name
                });
                
                // Add living creatures as potential targets
                if (hero.creatures) {
                    hero.creatures.forEach((creature, index) => {
                        if (creature.alive) {
                            allTargets.push({
                                type: 'creature',
                                hero: hero,
                                creature: creature,
                                creatureIndex: index,
                                position: position,
                                side: alliedSide,
                                name: creature.name
                            });
                        }
                    });
                }
            }
        });
        
        if (allTargets.length === 0) {
            console.log(`⚡ ${this.displayName} found no alive allied targets!`);
            return [];
        }
        
        // Shuffle and take up to maxTargets
        const shuffledTargets = this.battleManager.shuffleArray([...allTargets]);
        const selectedTargets = shuffledTargets.slice(0, maxTargets);
        
        console.log(`⚡ ${this.displayName} selected ${selectedTargets.length} targets:`, 
            selectedTargets.map(t => `${t.name} (${t.type})`).join(', '));
        
        return selectedTargets;
    }

    // ============================================
    // ADDITIONAL ACTION GRANTING
    // ============================================

    // Grant additional actions to all targets
    async grantAdditionalActions(targets) {
        console.log(`⚡ Granting additional actions to ${targets.length} targets`);
        
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            
            // Small delay between each target's action for visual clarity
            if (i > 0) {
                await this.battleManager.delay(300);
            }
            
            if (target.type === 'hero') {
                await this.grantHeroAdditionalAction(target);
            } else if (target.type === 'creature') {
                await this.grantCreatureAdditionalAction(target);
            }
        }
    }

    // Grant additional action to a hero
    async grantHeroAdditionalAction(target) {
        const hero = target.hero;
        const position = target.position;
        
        // Check if hero is still alive
        if (!hero.alive || hero.currentHp <= 0) {
            this.battleManager.addCombatLog(
                `💀 ${hero.name} is dead - Haste inspiration fizzles!`, 
                'info'
            );
            return;
        }
        
        // Log the extra action
        this.battleManager.addCombatLog(
            `⚡ ${hero.name} takes an extra turn from Haste!`, 
            target.side === 'player' ? 'success' : 'error'
        );

        // Use the combat manager's additional action method (same as Crum uses)
        if (this.battleManager.combatManager) {
            await this.battleManager.combatManager.executeAdditionalAction(hero, position);
        }
    }

    // Grant additional action to a creature
    async grantCreatureAdditionalAction(target) {
        const creature = target.creature;
        const hero = target.hero;
        const position = target.position;
        const side = target.side;
        
        // Check if creature is still alive
        if (!creature.alive || creature.currentHp <= 0) {
            this.battleManager.addCombatLog(
                `💀 ${creature.name} is dead - Haste inspiration fizzles!`, 
                'info'
            );
            return;
        }
        
        // Log the creature action
        this.battleManager.addCombatLog(
            `⚡ ${creature.name} activates from Haste!`, 
            side === 'player' ? 'success' : 'error'
        );

        // Create actor object like FieldStandard does
        const actor = {
            type: 'creature',
            name: creature.name,
            data: creature,
            index: target.creatureIndex,
            hero: hero
        };
        
        // Execute creature rally using the same method as FieldStandard
        await this.executeCreatureAction(actor, position, side);
    }

    // Execute creature action (borrowed from FieldStandard approach)
    async executeCreatureAction(actor, position, side) {
        try {
            const creatureName = actor.name;
            
            // Import creature classes as needed and execute their special attacks
            if (creatureName.includes('Jiggles')) {
                if (this.battleManager.jigglesManager) {
                    await this.battleManager.jigglesManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonArcher') {
                if (this.battleManager.skeletonArcherManager) {
                    await this.battleManager.skeletonArcherManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonNecromancer') {
                if (this.battleManager.skeletonNecromancerManager) {
                    await this.battleManager.skeletonNecromancerManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonDeathKnight') {
                if (this.battleManager.skeletonDeathKnightManager) {
                    await this.battleManager.skeletonDeathKnightManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'BurningSkeleton') {
                if (this.battleManager.burningSkeletonManager) {
                    await this.battleManager.burningSkeletonManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonReaper') {
                if (this.battleManager.skeletonReaperManager) {
                    await this.battleManager.skeletonReaperManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonBard') {
                if (this.battleManager.skeletonBardManager) {
                    await this.battleManager.skeletonBardManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'SkeletonMage') {
                if (this.battleManager.skeletonMageManager) {
                    await this.battleManager.skeletonMageManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'FrontSoldier') {
                if (this.battleManager.frontSoldierManager) {
                    await this.battleManager.frontSoldierManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'Archer') {
                if (this.battleManager.archerManager) {
                    await this.battleManager.archerManager.executeSpecialAttack(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'RoyalCorgi') {
                if (this.battleManager.royalCorgiManager) {
                    await this.battleManager.royalCorgiManager.executeRoyalCorgiAction(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'MoonlightButterfly') {
                if (this.battleManager.moonlightButterflyManager) {
                    await this.battleManager.moonlightButterflyManager.executeMoonlightButterflyAction(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'CrumTheClassPet') {
                if (this.battleManager.crumTheClassPetManager) {
                    await this.battleManager.crumTheClassPetManager.executeCrumTheClassPetAction(actor, position);
                    return;
                }
            }
            
            if (creatureName === 'GrinningCat') {
                if (this.battleManager.grinningCatManager) {
                    await this.battleManager.grinningCatManager.executeGrinningCatAction(actor, position);
                    return;
                }
            }
            
            // Default action for creatures without special attacks - just shake
            await this.battleManager.animationManager.shakeCreature(side, position, actor.index);
            
        } catch (error) {
            console.error('Error executing creature haste action:', error);
            // Fallback to simple shake animation
            await this.battleManager.animationManager.shakeCreature(side, position, actor.index);
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play haste animation on all targets
    async playHasteAnimation(caster, targets) {
        console.log(`⚡ Playing Haste animation from ${caster.name} to ${targets.length} targets...`);
        
        // Ensure CSS exists
        this.ensureHasteCSS();
        
        // Create speed burst effect on caster first
        await this.createCasterSpeedBurst(caster);
        
        // Wait a moment then apply to all targets simultaneously
        await this.battleManager.delay(200);
        
        // Apply haste effects to all targets simultaneously
        const targetAnimations = targets.map(target => this.createTargetHasteEffect(target));
        
        // Wait for all animations to complete
        await Promise.all(targetAnimations);
        
        // Cleanup
        this.cleanupHasteEffects();
    }

    // Create speed burst effect on the caster
    async createCasterSpeedBurst(caster) {
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        if (!casterElement) return;
        
        // Create speed lines emanating from caster
        for (let i = 0; i < 8; i++) {
            const speedLine = document.createElement('div');
            speedLine.className = 'haste-speed-line';
            speedLine.innerHTML = '⚡';
            
            const angle = (i / 8) * Math.PI * 2;
            const distance = 60;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            speedLine.style.cssText = `
                position: absolute;
                top: calc(50% + ${y}px);
                left: calc(50% + ${x}px);
                transform: translate(-50%, -50%);
                font-size: 20px;
                z-index: 400;
                pointer-events: none;
                opacity: 0;
                animation: hasteSpeedLine ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
                animation-delay: ${this.battleManager.getSpeedAdjustedDelay(i * 50)}ms;
                color: #ffff00;
                filter: drop-shadow(0 0 8px rgba(255, 255, 0, 0.8));
            `;
            
            casterElement.appendChild(speedLine);
            
            setTimeout(() => {
                if (speedLine && speedLine.parentNode) {
                    speedLine.remove();
                }
            }, this.battleManager.getSpeedAdjustedDelay(800 + i * 50));
        }
        
        await this.battleManager.delay(400);
    }

    // Create haste effect on a target
    async createTargetHasteEffect(target) {
        let targetElement;
        
        if (target.type === 'hero') {
            targetElement = this.battleManager.getHeroElement(target.side, target.position);
        } else {
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }
        
        if (!targetElement) return;
        
        // Create haste aura
        const hasteAura = document.createElement('div');
        hasteAura.className = 'haste-target-aura';
        hasteAura.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border: 3px solid rgba(255, 255, 0, 0.8);
            border-radius: 50%;
            animation: hasteAuraPulse ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-in-out;
            pointer-events: none;
            z-index: 350;
            box-shadow: 0 0 20px rgba(255, 255, 0, 0.6);
        `;
        
        // Create speed particles around target
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'haste-particle';
            particle.innerHTML = '✨';
            
            const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
            const radius = 25 + Math.random() * 15;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            particle.style.cssText = `
                position: absolute;
                top: calc(50% + ${y}px);
                left: calc(50% + ${x}px);
                transform: translate(-50%, -50%);
                font-size: ${16 + Math.random() * 8}px;
                z-index: 400;
                pointer-events: none;
                opacity: 0;
                animation: hasteParticleFloat ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
                animation-delay: ${this.battleManager.getSpeedAdjustedDelay(i * 80)}ms;
                color: #ffff00;
                filter: drop-shadow(0 0 6px rgba(255, 255, 0, 0.8));
            `;
            
            hasteAura.appendChild(particle);
        }
        
        targetElement.appendChild(hasteAura);
        
        // Remove effect after animation
        setTimeout(() => {
            if (hasteAura && hasteAura.parentNode) {
                hasteAura.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(800));
    }

    // Clean up any remaining haste effects
    cleanupHasteEffects() {
        const hasteEffects = document.querySelectorAll('.haste-speed-line, .haste-target-aura, .haste-particle');
        hasteEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for haste effects
    ensureHasteCSS() {
        if (document.getElementById('hasteSpellCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'hasteSpellCSS';
        style.textContent = `
            @keyframes hasteSpeedLine {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(90deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(2) rotate(180deg);
                }
            }
            
            @keyframes hasteAuraPulse {
                0% { 
                    opacity: 0; 
                    transform: scale(0.8); 
                    border-color: rgba(255, 255, 0, 0);
                }
                50% { 
                    opacity: 1; 
                    transform: scale(1.2); 
                    border-color: rgba(255, 255, 0, 1);
                }
                100% { 
                    opacity: 0.3; 
                    transform: scale(1.4); 
                    border-color: rgba(255, 255, 0, 0.3);
                }
            }
            
            @keyframes hasteParticleFloat {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(180deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.7) rotate(360deg); 
                }
            }
            
            /* Enhanced visual effects */
            .haste-speed-line,
            .haste-target-aura,
            .haste-particle {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster, targets, maxTargets) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `⚡ ${this.displayName} grants additional actions to ${targets.length} allies!`,
            logType
        );
        
        // List the targets
        const targetNames = targets.map(t => t.name).join(', ');
        this.battleManager.addCombatLog(
            `⚡ Hastened: ${targetNames}`,
            logType
        );
        
        // Send spell effect update to guest
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetCount: targets.length,
            maxTargets: maxTargets,
            targets: targets.map(t => ({
                name: t.name,
                type: t.type,
                position: t.position,
                absoluteSide: t.hero.absoluteSide
            })),
            effectType: 'haste_application',
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    handleGuestSpellEffect(data) {
        const { displayName, casterName, targetCount, targets } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `⚡ ${displayName} grants additional actions to ${targetCount} allies!`,
            logType
        );
        
        const targetNames = targets.map(t => t.name).join(', ');
        this.battleManager.addCombatLog(
            `⚡ Hastened: ${targetNames}`,
            logType
        );
        
        // Create mock objects for guest-side animation
        const mockCaster = {
            side: casterLocalSide,
            position: data.casterPosition,
            name: casterName
        };
        
        const mockTargets = targets.map(t => {
            const targetLocalSide = (t.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
            return {
                type: t.type,
                side: targetLocalSide,
                position: t.position,
                name: t.name,
                hero: { name: t.name }
            };
        });
        
        // Play visual effects on guest side (no actual action granting)
        this.playHasteAnimationGuestSide(mockCaster, mockTargets);
        
        console.log(`⚡ GUEST: ${casterName} used ${displayName} on ${targetCount} targets`);
    }

    // Guest-side animation (visual only)
    async playHasteAnimationGuestSide(caster, targets) {
        // Ensure CSS exists
        this.ensureHasteCSS();
        
        // Create speed burst effect on caster
        await this.createCasterSpeedBurst(caster);
        
        // Wait a moment then apply to all targets
        await this.battleManager.delay(200);
        
        // Apply haste effects to all targets
        const targetAnimations = targets.map(target => this.createTargetHasteEffect(target));
        await Promise.all(targetAnimations);
        
        // Cleanup
        this.cleanupHasteEffects();
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
            description: 'Grants additional actions to random ally targets based on SupportMagic level.',
            effectFormula: 'Up to max(1, SupportMagic level) targets',
            targetType: 'random_allies',
            spellSchool: 'SupportMagic',
            usageLimit: 'Unlimited'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupHasteEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('hasteSpellCSS');
        if (css) css.remove();
        
        console.log('⚡ Haste spell cleaned up');
    }
}

// Export for use in spell system
export default HasteSpell;