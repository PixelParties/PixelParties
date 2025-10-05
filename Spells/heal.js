// ./Spells/heal.js - Heal Spell Implementation
import { NaoHeroEffect } from '../Heroes/nao.js';

export class HealSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Heal';
        this.displayName = 'Heal';
        
        // Spell constants
        this.BASE_HEAL = 50;
        this.HEAL_PER_LEVEL = 40;
        this.SELF_HEAL_THRESHOLD = 1.5; // Self needs 50% more missing HP than next target
        this.HEALING_EFFECT_DURATION = 1200; // Same as SkeletonHealer
    }

    // ============================================
    // SPELL CASTING CONDITIONS
    // ============================================

    canCast(caster) {
        const target = this.findBestTarget(caster);
        return target !== null;
    }

    // Find the single best target for healing
    findBestTarget(caster) {
        const isNao = NaoHeroEffect.isNao(caster);
        const allies = caster.side === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const candidates = [];
        
        // Gather all potential targets
        ['left', 'center', 'right'].forEach(position => {
            const hero = allies[position];
            if (hero && hero.alive) {
                // Check heal-block
                const healBlockStacks = this.battleManager.statusEffectsManager 
                    ? this.battleManager.statusEffectsManager.getStatusEffectStacks(hero, 'heal-block')
                    : 0;
                
                if (healBlockStacks > 0) return; // Skip heal-blocked targets
                
                const missingHp = hero.maxHp - hero.currentHp;
                const hasShield = hero.currentShield > 0;
                
                // For Nao: Skip targets with shield, allow full HP targets
                if (isNao && hasShield) return;
                
                // For normal casters: Need missing HP
                if (!isNao && missingHp === 0) return;
                
                candidates.push({
                    type: 'hero',
                    hero: hero,
                    position: position,
                    missingHp: missingHp,
                    isSelf: hero === caster
                });
                
                // Check creatures
                if (hero.creatures && hero.creatures.length > 0) {
                    hero.creatures.forEach((creature, index) => {
                        if (!creature.alive) return;
                        
                        const creatureHealBlockStacks = this.battleManager.statusEffectsManager 
                            ? this.battleManager.statusEffectsManager.getStatusEffectStacks(creature, 'heal-block')
                            : 0;
                        
                        if (creatureHealBlockStacks > 0) return;
                        
                        const creatureMissingHp = creature.maxHp - creature.currentHp;
                        const creatureHasShield = creature.currentShield > 0;
                        
                        // For Nao: Skip creatures with shield
                        if (isNao && creatureHasShield) return;
                        
                        // For normal: Need missing HP
                        if (!isNao && creatureMissingHp === 0) return;
                        
                        candidates.push({
                            type: 'creature',
                            hero: hero,
                            creature: creature,
                            creatureIndex: index,
                            position: position,
                            missingHp: creatureMissingHp,
                            isSelf: false
                        });
                    });
                }
            }
        });
        
        if (candidates.length === 0) return null;
        
        // Sort by missing HP (highest first)
        candidates.sort((a, b) => b.missingHp - a.missingHp);
        
        // Handle self-targeting logic
        const selfTarget = candidates.find(c => c.isSelf);
        const otherTargets = candidates.filter(c => !c.isSelf);
        
        if (selfTarget && otherTargets.length > 0) {
            const bestOther = otherTargets[0];
            // Self needs 50% more missing HP to be prioritized
            if (selfTarget.missingHp < bestOther.missingHp * this.SELF_HEAL_THRESHOLD) {
                return bestOther; // Other target has priority
            }
        }
        
        // Return the best target
        return candidates[0];
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    async executeSpell(caster, spell) {
        const target = this.findBestTarget(caster);
        if (!target) return;
        
        const isNao = NaoHeroEffect.isNao(caster);
        const supportMagicLevel = caster.getAbilityStackCount('SupportMagic') || 0;
        const amount = this.BASE_HEAL + (this.HEAL_PER_LEVEL * supportMagicLevel);
        
        // Log the spell
        this.logSpellEffect(caster, target, amount, isNao);
        
        // Play animation and apply effect
        await this.executeHealingEffect(caster, target, amount, isNao);
    }

    async executeHealingEffect(caster, target, amount, isNao) {
        // Send network sync first
        this.sendHealingUpdate(caster, target, amount, isNao);
        
        // Create orbital laser effect (reuse from SkeletonHealer)
        await this.createOrbitalLaserEffect(target);
        
        // Apply the actual effect
        if (isNao) {
            // Apply shield
            if (target.type === 'hero') {
                const oldShield = target.hero.currentShield;
                target.hero.currentShield += amount;
                const actualShield = target.hero.currentShield - oldShield;
                
                this.battleManager.updateHeroHealthBar(
                    target.hero.side, 
                    target.position, 
                    target.hero.currentHp, 
                    target.hero.maxHp
                );
                
                this.battleManager.sendBattleUpdate('hero_shield_changed', {
                    targetAbsoluteSide: target.hero.absoluteSide,
                    targetPosition: target.position,
                    targetName: target.hero.name,
                    newShield: target.hero.currentShield,
                    shieldGained: actualShield,
                    source: 'Heal_Nao',
                    timestamp: Date.now()
                });
            } else {
                // Shield for creatures (stored but not visually shown)
                const oldShield = target.creature.currentShield || 0;
                target.creature.currentShield = (target.creature.currentShield || 0) + amount;
                const actualShield = target.creature.currentShield - oldShield;
            }
        } else {
            // Apply healing
            if (target.type === 'hero') {
                const oldHp = target.hero.currentHp;
                const healResult = target.hero.heal(amount);
                const actualHeal = healResult.newHp - oldHp;
                
                this.battleManager.updateHeroHealthBar(
                    target.hero.side, 
                    target.position, 
                    target.hero.currentHp, 
                    target.hero.maxHp
                );
                
                this.battleManager.sendBattleUpdate('hero_healed', {
                    targetAbsoluteSide: target.hero.absoluteSide,
                    targetPosition: target.position,
                    targetName: target.hero.name,
                    healing: actualHeal,
                    oldHp: oldHp,
                    newHp: target.hero.currentHp,
                    maxHp: target.hero.maxHp,
                    timestamp: Date.now()
                });
            } else {
                const oldHp = target.creature.currentHp;
                target.creature.currentHp = Math.min(target.creature.maxHp, target.creature.currentHp + amount);
                const actualHeal = target.creature.currentHp - oldHp;
                
                this.battleManager.updateCreatureHealthBar(
                    target.hero.side, 
                    target.position, 
                    target.creatureIndex, 
                    target.creature.currentHp, 
                    target.creature.maxHp
                );
                
                this.battleManager.sendBattleUpdate('creature_healed', {
                    heroAbsoluteSide: target.hero.absoluteSide,
                    heroPosition: target.position,
                    creatureIndex: target.creatureIndex,
                    creatureName: target.creature.name,
                    healing: actualHeal,
                    oldHp: oldHp,
                    newHp: target.creature.currentHp,
                    maxHp: target.creature.maxHp,
                    timestamp: Date.now()
                });
            }
        }
        
        // Wait for animation
        await this.battleManager.delay(this.battleManager.getSpeedAdjustedDelay(200));
    }

    // ============================================
    // VISUAL EFFECTS (REUSE SKELETON HEALER)
    // ============================================

    async createOrbitalLaserEffect(target) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;
        
        const targetRect = targetElement.getBoundingClientRect();
        const centerX = targetRect.left + targetRect.width / 2;
        const centerY = targetRect.top + targetRect.height / 2;
        
        const adjustedDuration = this.battleManager.getSpeedAdjustedDelay(this.HEALING_EFFECT_DURATION);
        
        // Create orbital laser container
        const laserContainer = document.createElement('div');
        laserContainer.className = 'heal-spell-orbital-laser';
        laserContainer.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 100px;
            height: 100px;
            transform: translate(-50%, -50%);
            z-index: 1500;
            pointer-events: none;
            animation: orbitalLaserHealing ${adjustedDuration}ms ease-out forwards;
        `;
        
        // Laser beam
        const laserBeam = document.createElement('div');
        laserBeam.className = 'orbital-laser-beam';
        laserBeam.style.cssText = `
            position: absolute;
            left: 50%;
            top: -200px;
            width: 8px;
            height: 200px;
            background: linear-gradient(180deg, 
                transparent 0%,
                rgba(76, 175, 80, 0.3) 20%,
                rgba(76, 175, 80, 0.8) 60%,
                rgba(76, 175, 80, 1) 100%);
            transform: translateX(-50%);
            box-shadow: 
                0 0 20px rgba(76, 175, 80, 0.8),
                inset 0 0 10px rgba(255, 255, 255, 0.3);
            animation: laserBeamGlow ${adjustedDuration}ms ease-out forwards;
        `;
        
        // Impact effect
        const impactEffect = document.createElement('div');
        impactEffect.className = 'orbital-laser-impact';
        impactEffect.innerHTML = '💚✨💚';
        impactEffect.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            opacity: 0;
            animation: laserImpactGlow ${adjustedDuration}ms ease-out forwards;
            text-shadow: 
                0 0 15px rgba(76, 175, 80, 1),
                0 0 30px rgba(76, 175, 80, 0.8);
        `;
        
        laserContainer.appendChild(laserBeam);
        laserContainer.appendChild(impactEffect);
        document.body.appendChild(laserContainer);
        
        // Cleanup
        setTimeout(() => {
            if (laserContainer.parentNode) {
                laserContainer.remove();
            }
        }, adjustedDuration);
        
        await this.battleManager.delay(adjustedDuration);
    }

    getTargetElement(target) {
        let element = null;
        
        if (target.type === 'hero') {
            element = this.battleManager.getHeroElement(target.hero.side, target.position);
        } else if (target.type === 'creature') {
            element = document.querySelector(
                `.${target.hero.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }
        
        return element;
    }

    // ============================================
    // LOGGING
    // ============================================

    logSpellEffect(caster, target, amount, isNao) {
        const targetName = target.type === 'hero' ? target.hero.name : target.creature.name;
        const logType = caster.side === 'player' ? 'success' : 'error';
        
        const effectText = isNao ? `grants ${amount} shield to` : `heals`;
        this.battleManager.addCombatLog(
            `✨💚 ${caster.name} ${effectText} ${targetName} ${isNao ? '' : `for ${amount} HP`}!`,
            logType
        );
    }

    // ============================================
    // NETWORK SYNC
    // ============================================

    sendHealingUpdate(caster, target, amount, isNao) {
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            targetType: target.type,
            targetPosition: target.position,
            targetCreatureIndex: target.creatureIndex,
            amount: amount,
            isNao: isNao
        });
    }

    // ============================================
    // GUEST HANDLING
    // ============================================

    async handleGuestSpellEffect(data) {
        const { casterAbsoluteSide, targetType, targetPosition, targetCreatureIndex, amount, isNao } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Find target and create effect
        const target = {
            type: targetType,
            position: targetPosition,
            creatureIndex: targetCreatureIndex,
            hero: { side: targetLocalSide }
        };
        
        await this.createOrbitalLaserEffect(target);
    }

    // ============================================
    // UTILITY
    // ============================================

    getSpellInfo() {
        return {
            name: this.spellName,
            displayName: this.displayName,
            description: 'Heals the ally with the most missing HP for 50 + (40 × SupportMagic level). Nao grants shield instead.',
            spellSchool: 'Divine',
            targetType: 'single_ally',
            restrictions: 'Cannot target shielded allies if caster is Nao'
        };
    }

    cleanup() {
        const lasers = document.querySelectorAll('.heal-spell-orbital-laser');
        lasers.forEach(laser => laser.remove());
    }
}

export default HealSpell;