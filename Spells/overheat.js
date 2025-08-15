// ./Spells/overheat.js - Overheat Spell Implementation

export class OverheatSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Overheat';
        this.displayName = 'Overheat';
        
        // Track equipment removed by Overheat (for restoration at battle end)
        // Structure: { heroAbsoluteSide: { heroPosition: [removedEquipmentData] } }
        this.removedEquipmentTracking = {};
        
        console.log('🔥 Overheat spell module initialized');
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Overheat spell effect
    async executeSpell(caster, spell) {
        console.log(`🔥 ${caster.name} attempting to cast ${this.displayName}!`);
        
        // Find target hero with equipment
        const target = this.findTargetWithEquipment(caster);
        
        if (!target) {
            console.log(`🔥 ${this.displayName}: No valid targets with equipment found! Spell skipped.`);
            this.battleManager.addCombatLog(
                `🔥 ${caster.name}'s ${this.displayName} fizzles - no equipped enemies!`,
                caster.side === 'player' ? 'info' : 'info'
            );
            return;
        }

        // 🔥 UPDATED: Pass caster to resistance check for Ida effect
        const isResisted = this.battleManager.resistanceManager && 
            this.battleManager.resistanceManager.shouldResistSpell(target.hero, this.spellName, caster);
        
        if (isResisted) {
            console.log(`🛡️ ${target.hero.name} resisted ${this.displayName}!`);
            // Resistance manager will handle the log message
        } else {
            // Calculate how many equips to remove
            const equipsToRemove = this.calculateEquipsToRemove(caster);
            
            // Log the spell effect
            this.logSpellEffect(caster, target, equipsToRemove);
            
            // Play overheat animation
            await this.playOverheatAnimation(caster, target, isResisted);
            
            // Remove equipment if not resisted
            if (!isResisted) {
                const removedEquips = await this.removeTargetEquipment(target, equipsToRemove, caster);
                
                // Send update to guest with removed equipment info
                this.sendOverheatUpdate(caster, target, removedEquips, isResisted);
            }
        }
        
        console.log(`🔥 ${this.displayName} completed!`);
    }

    // ============================================
    // TARGET FINDING
    // ============================================

    // Find enemy hero with equipment (prioritizing those with more equips)
    findTargetWithEquipment(caster) {
        const enemySide = caster.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Get all alive enemy heroes with equipment
        const heroesWithEquipment = [];
        ['left', 'center', 'right'].forEach(position => {
            const hero = enemyHeroes[position];
            if (hero && hero.alive && hero.equipment && hero.equipment.length > 0) {
                heroesWithEquipment.push({
                    hero: hero,
                    position: position,
                    side: enemySide,
                    equipmentCount: hero.equipment.length
                });
            }
        });
        
        if (heroesWithEquipment.length === 0) {
            return null;
        }
        
        // Sort by equipment count (descending) for weighted selection
        heroesWithEquipment.sort((a, b) => b.equipmentCount - a.equipmentCount);
        
        // Create weighted array for selection (more equips = higher chance)
        const weightedTargets = [];
        heroesWithEquipment.forEach(target => {
            // Add target multiple times based on equipment count
            for (let i = 0; i < target.equipmentCount; i++) {
                weightedTargets.push(target);
            }
        });
        
        // Randomly select from weighted array
        const selectedTarget = this.battleManager.getRandomChoice(weightedTargets);
        
        console.log(`🎯 ${this.displayName} targeting ${selectedTarget.hero.name} with ${selectedTarget.equipmentCount} equipment(s)`);
        return selectedTarget;
    }

    // ============================================
    // EQUIPMENT REMOVAL
    // ============================================

    // Calculate how many equips to remove: X+1 (X = DecayMagic level)
    calculateEquipsToRemove(caster) {
        const decayLevel = caster.hasAbility('DecayMagic') 
            ? caster.getAbilityStackCount('DecayMagic') 
            : 0;
        
        const equipsToRemove = decayLevel + 1;
        
        console.log(`🔥 ${caster.name} DecayMagic level ${decayLevel}: removing up to ${equipsToRemove} equipment(s)`);
        
        return equipsToRemove;
    }

    // Remove equipment from target hero
    async removeTargetEquipment(target, maxToRemove, caster) {
        const removedEquips = [];
        const hero = target.hero;
        
        // Get current equipment
        const currentEquipment = [...hero.equipment];
        const actualToRemove = Math.min(maxToRemove, currentEquipment.length);
        
        console.log(`🔥 Removing ${actualToRemove} equipment(s) from ${hero.name}`);
        
        // Randomly select equipment to remove
        const shuffledEquipment = this.battleManager.shuffleArray([...currentEquipment]);
        
        for (let i = 0; i < actualToRemove; i++) {
            const equipToRemove = shuffledEquipment[i];
            const equipName = equipToRemove.name || equipToRemove.cardName;
            
            // Remove from hero
            const removed = hero.removeEquipment(equipName);
            if (removed) {
                removedEquips.push({
                    ...removed,
                    originalIndex: currentEquipment.indexOf(equipToRemove)
                });
                
                console.log(`🔥 Removed ${equipName} from ${hero.name}`);
                
                // Create visual effect for each removed equipment
                this.createEquipmentRemovalEffect(target, equipName, i);
            }
        }
        
        // Track removed equipment for restoration at battle end
        this.trackRemovedEquipment(hero, removedEquips);
        
        // Update hero display to reflect equipment loss
        if (this.battleManager.updateHeroAttackDisplay) {
            this.battleManager.updateHeroAttackDisplay(target.side, target.position, hero);
        }
        
        // Add combat log for each removed equipment
        removedEquips.forEach(equip => {
            const equipName = equip.name || equip.cardName;
            this.battleManager.addCombatLog(
                `🔥 ${hero.name} loses ${equipName} to overheating!`,
                target.side === 'player' ? 'error' : 'success'
            );
        });
        
        return removedEquips;
    }

    // Track removed equipment for restoration
    trackRemovedEquipment(hero, removedEquips) {
        const key = `${hero.absoluteSide}_${hero.position}`;
        
        if (!this.removedEquipmentTracking[key]) {
            this.removedEquipmentTracking[key] = [];
        }
        
        // Add to tracking with timestamp
        removedEquips.forEach(equip => {
            this.removedEquipmentTracking[key].push({
                ...equip,
                removedAt: Date.now(),
                removedBySpell: this.spellName
            });
        });
        
        console.log(`📋 Tracking ${removedEquips.length} removed equipment(s) for restoration`);
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play the overheat animation
    async playOverheatAnimation(caster, target, isResisted = false) {
        console.log(`🔥 Playing Overheat animation on ${target.hero.name}... (resisted: ${isResisted})`);
        
        // Get target element
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        
        if (!targetElement) {
            console.error('Could not find target element for overheat animation');
            return;
        }
        
        // Create overheat effects
        this.createRedGlowEffect(targetElement, isResisted);
        this.createHeatLinesEffect(targetElement, isResisted);
        this.createSteamEffect(targetElement, isResisted);
        
        // Animation timing
        const animationTime = 1500; // 1.5 seconds for full effect
        
        // Wait for animation to complete
        await this.battleManager.delay(animationTime);
        
        // Cleanup
        this.cleanupOverheatEffects();
    }

    // Create red glow effect
    createRedGlowEffect(targetElement, isResisted) {
        const glowOverlay = document.createElement('div');
        glowOverlay.className = 'overheat-glow';
        
        if (isResisted) {
            glowOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(circle, rgba(100, 200, 255, 0.3) 0%, transparent 70%);
                animation: overheatGlowResisted ${this.battleManager.getSpeedAdjustedDelay(1500)}ms ease-in-out;
                pointer-events: none;
                z-index: 100;
            `;
        } else {
            glowOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(circle, rgba(255, 50, 0, 0.6) 0%, rgba(255, 100, 0, 0.3) 50%, transparent 70%);
                animation: overheatGlow ${this.battleManager.getSpeedAdjustedDelay(1500)}ms ease-in-out;
                pointer-events: none;
                z-index: 100;
                mix-blend-mode: screen;
            `;
        }
        
        targetElement.appendChild(glowOverlay);
    }

    // Create heat lines effect
    createHeatLinesEffect(targetElement, isResisted) {
        const heatContainer = document.createElement('div');
        heatContainer.className = 'overheat-lines-container';
        heatContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 101;
            overflow: hidden;
        `;
        
        // Create multiple heat lines
        for (let i = 0; i < 8; i++) {
            const heatLine = document.createElement('div');
            heatLine.className = 'overheat-line';
            
            const startY = Math.random() * 100;
            const endY = startY + (Math.random() * 40 - 20);
            const duration = 800 + Math.random() * 400;
            const delay = i * 100;
            
            if (isResisted) {
                heatLine.style.cssText = `
                    position: absolute;
                    left: 0;
                    top: ${startY}%;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.8), transparent);
                    animation: heatLineMove ${this.battleManager.getSpeedAdjustedDelay(duration)}ms ease-in-out ${this.battleManager.getSpeedAdjustedDelay(delay)}ms;
                    opacity: 0;
                `;
            } else {
                heatLine.style.cssText = `
                    position: absolute;
                    left: 0;
                    top: ${startY}%;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(255, 100, 0, 0.9), rgba(255, 200, 0, 0.7), transparent);
                    filter: blur(1px);
                    animation: heatLineMove ${this.battleManager.getSpeedAdjustedDelay(duration)}ms ease-in-out ${this.battleManager.getSpeedAdjustedDelay(delay)}ms;
                    opacity: 0;
                `;
            }
            
            heatContainer.appendChild(heatLine);
        }
        
        targetElement.appendChild(heatContainer);
    }

    // Create steam effect
    createSteamEffect(targetElement, isResisted) {
        const steamContainer = document.createElement('div');
        steamContainer.className = 'overheat-steam-container';
        steamContainer.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            pointer-events: none;
            z-index: 102;
        `;
        
        // Create steam particles
        for (let i = 0; i < 12; i++) {
            const steam = document.createElement('div');
            steam.className = 'overheat-steam';
            steam.innerHTML = '💨';
            
            const xOffset = (Math.random() - 0.5) * 60;
            const duration = 1000 + Math.random() * 500;
            const delay = i * 80;
            const size = 16 + Math.random() * 12;
            
            if (isResisted) {
                steam.style.cssText = `
                    position: absolute;
                    left: ${xOffset}px;
                    font-size: ${size}px;
                    opacity: 0;
                    filter: hue-rotate(180deg);
                    animation: steamRise ${this.battleManager.getSpeedAdjustedDelay(duration)}ms ease-out ${this.battleManager.getSpeedAdjustedDelay(delay)}ms;
                `;
            } else {
                steam.style.cssText = `
                    position: absolute;
                    left: ${xOffset}px;
                    font-size: ${size}px;
                    opacity: 0;
                    filter: brightness(1.5) contrast(1.2);
                    animation: steamRise ${this.battleManager.getSpeedAdjustedDelay(duration)}ms ease-out ${this.battleManager.getSpeedAdjustedDelay(delay)}ms;
                `;
            }
            
            steamContainer.appendChild(steam);
        }
        
        targetElement.appendChild(steamContainer);
    }

    // Create visual effect for each equipment removal
    createEquipmentRemovalEffect(target, equipName, index) {
        const targetElement = this.battleManager.getHeroElement(target.side, target.position);
        if (!targetElement) return;
        
        const equipEffect = document.createElement('div');
        equipEffect.className = 'overheat-equip-removed';
        equipEffect.innerHTML = `⚙️ ${equipName}`;
        
        const delay = index * 200;
        
        equipEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 16px;
            font-weight: bold;
            color: #ff6600;
            text-shadow: 0 0 10px rgba(255, 100, 0, 0.8);
            z-index: 500;
            pointer-events: none;
            animation: equipRemove ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out ${this.battleManager.getSpeedAdjustedDelay(delay)}ms forwards;
            opacity: 0;
        `;
        
        targetElement.appendChild(equipEffect);
        
        // Remove after animation
        setTimeout(() => {
            if (equipEffect && equipEffect.parentNode) {
                equipEffect.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(800 + delay));
    }

    // Clean up overheat effects
    cleanupOverheatEffects() {
        const effects = document.querySelectorAll('.overheat-glow, .overheat-lines-container, .overheat-steam-container, .overheat-equip-removed');
        effects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist
    ensureOverheatCSS() {
        if (document.getElementById('overheatCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'overheatCSS';
        style.textContent = `
            @keyframes overheatGlow {
                0% { 
                    opacity: 0;
                    filter: brightness(1);
                }
                30% {
                    opacity: 1;
                    filter: brightness(1.3) saturate(1.5);
                }
                70% {
                    opacity: 1;
                    filter: brightness(1.5) saturate(2) contrast(1.2);
                }
                100% { 
                    opacity: 0;
                    filter: brightness(1);
                }
            }
            
            @keyframes overheatGlowResisted {
                0% { 
                    opacity: 0;
                }
                50% {
                    opacity: 1;
                }
                100% { 
                    opacity: 0;
                }
            }
            
            @keyframes heatLineMove {
                0% {
                    opacity: 0;
                    transform: translateX(-100%) scaleX(0.5);
                }
                20% {
                    opacity: 1;
                }
                80% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                    transform: translateX(100%) scaleX(0.5);
                }
            }
            
            @keyframes steamRise {
                0% {
                    opacity: 0;
                    transform: translateY(0) scale(0.5);
                }
                20% {
                    opacity: 0.8;
                    transform: translateY(-10px) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-60px) scale(1.5) rotate(180deg);
                }
            }
            
            @keyframes equipRemove {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(10deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -150%) scale(0.8) rotate(-20deg);
                }
            }
            
            .overheat-glow {
                border-radius: 10px;
            }
        `;
        
        document.head.appendChild(style);
        
        // Ensure CSS is added
        setTimeout(() => {
            if (!document.getElementById('overheatCSS')) {
                document.head.appendChild(style);
            }
        }, 0);
    }

    // ============================================
    // BATTLE LOG & NETWORK SYNC
    // ============================================

    // Log the spell effect
    logSpellEffect(caster, target, maxEquipsToRemove) {
        const actualToRemove = Math.min(maxEquipsToRemove, target.hero.equipment.length);
        
        this.battleManager.addCombatLog(
            `🔥 ${caster.name} casts ${this.displayName} on ${target.hero.name}!`,
            caster.side === 'player' ? 'success' : 'error'
        );
        
        if (actualToRemove > 0) {
            this.battleManager.addCombatLog(
                `⚙️ Preparing to overheat ${actualToRemove} equipment piece${actualToRemove > 1 ? 's' : ''}...`,
                'warning'
            );
        }
    }

    // Send update to guest
    sendOverheatUpdate(caster, target, removedEquips, isResisted) {
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            displayName: this.displayName,
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetName: target.hero.name,
            targetAbsoluteSide: target.hero.absoluteSide,
            targetPosition: target.position,
            removedEquipment: removedEquips.map(e => ({
                name: e.name || e.cardName,
                originalIndex: e.originalIndex
            })),
            effectType: 'overheat_equipment_removal',
            isResisted: isResisted,
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle spell effect on guest side
    async handleGuestSpellEffect(data) {
        const { displayName, casterName, targetName, removedEquipment, isResisted } = data;
        
        // Determine log type based on caster side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const targetLocalSide = (data.targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Add combat logs
        this.battleManager.addCombatLog(
            `🔥 ${casterName} casts ${displayName} on ${targetName}!`,
            casterLocalSide === 'player' ? 'success' : 'error'
        );
        
        if (!isResisted && removedEquipment && removedEquipment.length > 0) {
            this.battleManager.addCombatLog(
                `⚙️ Overheating ${removedEquipment.length} equipment piece${removedEquipment.length > 1 ? 's' : ''}...`,
                'warning'
            );
        }
        
        // Get target hero
        const targetHeroes = targetLocalSide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        const targetHero = targetHeroes[data.targetPosition];
        
        if (targetHero) {
            // Create mock target for animation
            const mockTarget = {
                hero: targetHero,
                position: data.targetPosition,
                side: targetLocalSide
            };
            
            // Play visual effects
            await this.playOverheatAnimation(null, mockTarget, isResisted);
            
            // Apply equipment removal on guest side (if not resisted)
            if (!isResisted && removedEquipment && removedEquipment.length > 0) {
                removedEquipment.forEach(equip => {
                    targetHero.removeEquipment(equip.name);
                    
                    this.battleManager.addCombatLog(
                        `🔥 ${targetName} loses ${equip.name} to overheating!`,
                        targetLocalSide === 'player' ? 'error' : 'success'
                    );
                });
                
                // Track for restoration
                this.trackRemovedEquipment(targetHero, removedEquipment);
                
                // Update display
                if (this.battleManager.updateHeroAttackDisplay) {
                    this.battleManager.updateHeroAttackDisplay(targetLocalSide, data.targetPosition, targetHero);
                }
            }
        }
        
        console.log(`🔥 GUEST: ${casterName} used ${displayName} on ${targetName}${isResisted ? ' (RESISTED)' : ''}`);
    }

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    // Export state for persistence
    exportState() {
        return {
            removedEquipmentTracking: JSON.parse(JSON.stringify(this.removedEquipmentTracking))
        };
    }

    // Import state from persistence
    importState(state) {
        if (state && state.removedEquipmentTracking) {
            this.removedEquipmentTracking = JSON.parse(JSON.stringify(state.removedEquipmentTracking));
            console.log('📋 Restored Overheat equipment tracking from saved state');
        }
    }

    // ============================================
    // BATTLE END RESTORATION
    // ============================================

    // Restore all equipment removed by Overheat
    restoreAllRemovedEquipment() {
        console.log('🔧 Restoring equipment removed by Overheat...');
        
        let totalRestored = 0;
        
        for (const key in this.removedEquipmentTracking) {
            const [absoluteSide, position] = key.split('_');
            const removedItems = this.removedEquipmentTracking[key];
            
            if (removedItems && removedItems.length > 0) {
                // Find the hero
                const isPlayerSide = (absoluteSide === 'host' && this.battleManager.isHost) || 
                                   (absoluteSide === 'guest' && !this.battleManager.isHost);
                const heroes = isPlayerSide ? this.battleManager.playerHeroes : this.battleManager.opponentHeroes;
                const hero = heroes[position];
                
                if (hero) {
                    removedItems.forEach(item => {
                        // Restore the equipment
                        hero.addEquipment(item);
                        console.log(`🔧 Restored ${item.name || item.cardName} to ${hero.name}`);
                        totalRestored++;
                    });
                }
            }
        }
        
        if (totalRestored > 0) {
            console.log(`✅ Restored ${totalRestored} equipment piece(s) removed by Overheat`);
            this.battleManager.addCombatLog(
                `🔧 All equipment overheated during battle has been restored!`,
                'info'
            );
        }
        
        // Clear tracking
        this.removedEquipmentTracking = {};
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
            description: 'Overheats enemy equipment, temporarily disabling X+1 random equipped items (X = DecayMagic level)',
            targetType: 'enemy_hero_with_equipment',
            spellSchool: 'DecayMagic',
            requiresTarget: true,
            skipIfNoValidTarget: true
        };
    }

    // Initialize (called when spell system initializes)
    init() {
        this.ensureOverheatCSS();
    }

    canCast(hero) {
        // Check if there are any valid targets with equipment
        const enemySide = hero.side === 'player' ? 'opponent' : 'player';
        const enemyHeroes = enemySide === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        // Check if any enemy has equipment
        for (const position of ['left', 'center', 'right']) {
            const enemyHero = enemyHeroes[position];
            if (enemyHero && enemyHero.alive && enemyHero.equipment && enemyHero.equipment.length > 0) {
                return true; // Found at least one valid target
            }
        }
        
        return false; // No valid targets, skip this spell
    }

    // Cleanup (called when battle ends)
    cleanup() {
        // Restore all removed equipment before cleanup
        this.restoreAllRemovedEquipment();
        
        this.cleanupOverheatEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('overheatCSS');
        if (css) css.remove();
        
        // Clear tracking
        this.removedEquipmentTracking = {};
        
        console.log('🔥 Overheat spell cleaned up');
    }
}

// Export for use in spell system
export default OverheatSpell;