// damageSourceManager.js - Central Damage Source Analysis and Modification System
// Handles damage source classification and applies source-based damage modifications

import { getCardInfo } from './cardDatabase.js';
import { SwampborneWaflavHeroEffect } from './Heroes/swampborneWaflav.js';
import { checkShieldOfLifeEffects } from './Artifacts/shieldOfLife.js';
import { checkShieldOfDeathEffects } from './Artifacts/shieldOfDeath.js';

export class DamageSourceManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
    }

    // ============================================
    // DAMAGE SOURCE ANALYSIS
    // ============================================

    /**
     * Central method to determine if damage is physical
     * @param {Object} context - Damage context containing source, attacker, etc.
     * @returns {boolean} - True if damage is physical
     */
    isPhysicalDamage(context = {}) {
        const { source, attacker } = context;
        
        // Hero attacks are always physical
        if (source === 'attack' && attacker && (attacker.type === 'hero' || !attacker.type)) {
            return true;
        }
        
        // Creature attacks are physical if the creature has physicalAttack: true
        if (source === 'attack' && attacker && attacker.type === 'creature') {
            return this.isCreaturePhysical(attacker);
        }
        
        // Other sources (poison, burn, spell effects, etc.) are not physical
        return false;
    }

    /**
     * Check if a creature's attacks are physical
     * @param {Object} creature - The creature to check
     * @returns {boolean} - True if creature's attacks are physical
     */
    isCreaturePhysical(creature) {
        // Check creature object first
        if (creature.physicalAttack !== undefined) {
            return creature.physicalAttack === true;
        }
        
        // Fallback to card database
        const cardInfo = getCardInfo(creature.name);
        if (cardInfo && cardInfo.physicalAttack !== undefined) {
            return cardInfo.physicalAttack === true;
        }
        
        // Default to false if not specified
        return false;
    }

    /**
     * Get damage source classification
     * @param {Object} context - Damage context
     * @returns {Object} - Classification object with useful properties
     */
    analyzeDamageSource(context = {}) {
        const { source, attacker } = context;
        
        return {
            source: source || 'unknown',
            isPhysical: this.isPhysicalDamage(context),
            isMagical: this.isMagicalDamage(context),
            isStatusEffect: this.isStatusEffectDamage(context),
            attacker: attacker || null,
            attackerType: attacker ? (attacker.type || 'hero') : null
        };
    }

    /**
     * Check if damage is magical (for future effects)
     * @param {Object} context - Damage context
     * @returns {boolean} - True if damage is magical
     */
    isMagicalDamage(context = {}) {
        const { source } = context;
        
        // Spell effects are magical
        if (source === 'spell' || source === 'magic') {
            return true;
        }
        
        // Add more magical damage sources as needed
        return false;
    }

    /**
     * Check if damage is from a status effect
     * @param {Object} context - Damage context
     * @returns {boolean} - True if damage is from status effect
     */
    isStatusEffectDamage(context = {}) {
        const { source } = context;
        
        // Status effect damage sources
        return ['poison', 'burn', 'bleed', 'curse'].includes(source);
    }

    // ============================================
    // DAMAGE MODIFICATION SYSTEM
    // ============================================

    /**
     * Apply all damage reductions/modifications based on source and target
     * @param {Object} target - The target taking damage
     * @param {number} damage - Original damage amount
     * @param {Object} context - Damage context
     * @returns {Object} - { finalDamage, modifications }
     */
    applyDamageModifications(target, damage, context = {}) {
        let finalDamage = damage;
        const modifications = [];
        
        // Get damage source analysis
        const sourceAnalysis = this.analyzeDamageSource(context);
        
        // Apply Carris immunity FIRST (overrides all other reductions)
        const carrisResult = this.applyCarrisImmunity(target, finalDamage, sourceAnalysis);
        finalDamage = carrisResult.damage;
        if (carrisResult.modified) {
            modifications.push(carrisResult.modification);
            // If Carris immunity applies, no other modifications matter
            return {
                finalDamage: finalDamage,
                modifications: modifications,
                sourceAnalysis: sourceAnalysis
            };
        }

        // Apply Shield of Life block for physical attack damage
        if (sourceAnalysis.isPhysical && sourceAnalysis.source === 'attack') {
            const shieldOfLifeResult = this.applyShieldOfLifeBlock(target, finalDamage, { source: sourceAnalysis.source, attacker: sourceAnalysis.attacker });
            if (shieldOfLifeResult.blocked) {
                // Shield of Life completely blocks the damage
                const originalDamage = finalDamage;
                finalDamage = 0;
                modifications.push({
                    type: 'shield_of_life_block',
                    originalDamage: originalDamage,
                    finalDamage: 0,
                    blocked: originalDamage,
                    shieldGained: shieldOfLifeResult.shieldGained
                });
                
                // If Shield of Life blocks, no other modifications matter
                return {
                    finalDamage: 0,
                    modifications: modifications,
                    sourceAnalysis: sourceAnalysis
                };
            }
        }

        // Apply Shield of Death block for physical attack damage
        if (sourceAnalysis.isPhysical && sourceAnalysis.source === 'attack') {
            const shieldOfDeathResult = this.applyShieldOfDeathBlock(target, finalDamage, { source: sourceAnalysis.source, attacker: sourceAnalysis.attacker });
            if (shieldOfDeathResult.blocked) {
                // Shield of Death completely blocks the damage
                const originalDamage = finalDamage;
                finalDamage = 0;
                modifications.push({
                    type: 'shield_of_death_block',
                    originalDamage: originalDamage,
                    finalDamage: 0,
                    blocked: originalDamage,
                    curseDamage: shieldOfDeathResult.curseDamage
                });
                
                // If Shield of Death blocks, no other modifications matter
                return {
                    finalDamage: 0,
                    modifications: modifications,
                    sourceAnalysis: sourceAnalysis
                };
            }
        }
        
        // Apply stoneskin reduction for physical damage
        if (sourceAnalysis.isPhysical) {
            const stoneskinResult = this.applyStoneskinReduction(target, finalDamage, sourceAnalysis);
            finalDamage = stoneskinResult.damage;
            if (stoneskinResult.modified) {
                modifications.push(stoneskinResult.modification);
            }
        }

        // Apply clouded reduction for ALL damage types (unlike stoneskin)
        const cloudedResult = this.applyCloudedReduction(target, finalDamage);
        finalDamage = cloudedResult.damage;
        if (cloudedResult.modified) {
            modifications.push(cloudedResult.modification);
        }

        // Apply SwampborneWaflav retaliation check
        if (sourceAnalysis.isPhysical && context.attacker) {
            SwampborneWaflavHeroEffect.checkSwampborneRetaliation(
                target, 
                context.attacker, 
                finalDamage, 
                context, 
                this.battleManager
            );
        }
        
        return {
            finalDamage: finalDamage,
            modifications: modifications,
            sourceAnalysis: sourceAnalysis
        };
    }

    // ============================================
    // CARRIS DIVINE IMMUNITY
    // ============================================

    /**
     * Apply Carris divine immunity (nullifies ALL damage)
     * @param {Object} target - The target with potential Carris immunity
     * @param {number} damage - Original damage amount
     * @param {Object} sourceAnalysis - Damage source analysis
     * @returns {Object} - { damage, modified, modification }
     */
    applyCarrisImmunity(target, damage, sourceAnalysis) {
        // Check if target is Carris
        if (!target || target.name !== 'Carris') {
            return { damage: damage, modified: false };
        }
        
        // Carris is immune to ALL damage from ANY source
        if (damage > 0) {
            const originalDamage = damage;
            
            // Log the immunity
            this.logCarrisImmunity(target, originalDamage, sourceAnalysis);
            
            // Send update to guest if host
            if (this.battleManager.isAuthoritative) {
                this.syncCarrisImmunity(target, originalDamage, sourceAnalysis);
            }
            
            return {
                damage: 0,
                modified: true,
                modification: {
                    type: 'carris_immunity',
                    originalDamage: originalDamage,
                    finalDamage: 0,
                    nullified: originalDamage,
                    source: sourceAnalysis.source
                }
            };
        }
        
        return { damage: damage, modified: false };
    }

    /**
     * Log Carris divine immunity
     */
    logCarrisImmunity(target, originalDamage, sourceAnalysis) {
        const sourceDescription = this.getSourceDescription(sourceAnalysis);
        
        this.battleManager.addCombatLog(
            `✨ Carris's divine immunity nullifies ${originalDamage} damage from ${sourceDescription}!`,
            target.side === 'player' ? 'success' : 'info'
        );
    }

    // ============================================
    // SHIELD BLOCKS
    // ============================================

    /**
     * Apply Shield of Life block for physical attack damage
     * @param {Object} target - The target with potential Shield of Life
     * @param {number} damage - Original damage amount
     * @param {Object} context - Damage context
     * @returns {Object} - { blocked, shieldGained }
     */
    applyShieldOfLifeBlock(target, damage, context = {}) {
        return checkShieldOfLifeEffects(this.battleManager, target, damage, context);
    }

    /**
     * Apply Shield of Death block for physical attack damage
     * @param {Object} target - The target with potential Shield of Death
     * @param {number} damage - Original damage amount
     * @param {Object} context - Damage context
     * @returns {Object} - { blocked, curseDamage }
     */
    applyShieldOfDeathBlock(target, damage, context = {}) {
        return checkShieldOfDeathEffects(this.battleManager, target, damage, context);
    }

    /**
     * Get human-readable description of damage source
     */
    getSourceDescription(sourceAnalysis) {
        const { source, attacker, isPhysical, isStatusEffect } = sourceAnalysis;
        
        if (attacker) {
            if (isPhysical) {
                return `${attacker.name}'s attack`;
            } else {
                return `${attacker.name}'s ability`;
            }
        }
        
        if (isStatusEffect) {
            return `${source} status effect`;
        }
        
        switch (source) {
            case 'attack': return 'an attack';
            case 'spell': return 'a spell';
            case 'poison': return 'poison';
            case 'burn': return 'burning';
            case 'bleed': return 'bleeding';
            default: return source || 'unknown source';
        }
    }

    /**
     * Send Carris immunity update to guest
     */
    syncCarrisImmunity(target, originalDamage, sourceAnalysis) {
        this.battleManager.sendBattleUpdate('carris_immunity_triggered', {
            targetAbsoluteSide: target.absoluteSide,
            targetPosition: target.position,
            targetName: target.name,
            originalDamage: originalDamage,
            source: sourceAnalysis.source,
            sourceDescription: this.getSourceDescription(sourceAnalysis),
            timestamp: Date.now()
        });
    }
    
    /**
     * Apply clouded damage reduction (halves all damage)
     * @param {Object} target - The target with potential clouded status
     * @param {number} damage - Original damage amount
     * @returns {Object} - { damage, modified, modification }
     */
    applyCloudedReduction(target, damage) {
        if (!this.battleManager.statusEffectsManager) {
            return { damage: damage, modified: false };
        }
        
        // Check if target has clouded status
        if (!this.battleManager.statusEffectsManager.hasStatusEffect(target, 'clouded')) {
            return { damage: damage, modified: false };
        }
        
        const originalDamage = damage;
        const reducedDamage = Math.ceil(damage / 2); // Half damage, rounded up
        
        if (reducedDamage < originalDamage) {
            const reduction = originalDamage - reducedDamage;
            
            // Log the reduction
            this.battleManager.addCombatLog(
                `☁️ ${target.name}'s Clouded status reduces damage by half! (${originalDamage} → ${reducedDamage})`,
                target.side === 'player' ? 'success' : 'info'
            );
            
            return {
                damage: reducedDamage,
                modified: true,
                modification: {
                    type: 'clouded_reduction',
                    originalDamage: originalDamage,
                    finalDamage: reducedDamage,
                    reduction: reduction
                }
            };
        }
        
        return { damage: damage, modified: false };
    }

    // ============================================
    // STONESKIN DAMAGE REDUCTION
    // ============================================

    /**
     * Apply stoneskin damage reduction to physical damage
     * @param {Object} target - The target with potential stoneskin
     * @param {number} damage - Original damage amount
     * @param {Object} sourceAnalysis - Damage source analysis
     * @returns {Object} - { damage, modified, modification }
     */
    applyStoneskinReduction(target, damage, sourceAnalysis) {
        if (!this.battleManager.statusEffectsManager) {
            return { damage: damage, modified: false };
        }
        
        // Check if target has stoneskin
        if (!this.battleManager.statusEffectsManager.hasStatusEffect(target, 'stoneskin')) {
            return { damage: damage, modified: false };
        }
        
        const originalDamage = damage;
        const reducedDamage = Math.max(10, damage - 50);
        
        if (reducedDamage < originalDamage) {
            const reduction = originalDamage - reducedDamage;
            
            // Log the reduction
            this.logStoneskinReduction(target, originalDamage, reducedDamage, reduction);
            
            // Send update to guest if host
            if (this.battleManager.isAuthoritative) {
                this.syncStoneskinReduction(target, originalDamage, reducedDamage, reduction);
            }
            
            return {
                damage: reducedDamage,
                modified: true,
                modification: {
                    type: 'stoneskin_reduction',
                    originalDamage: originalDamage,
                    finalDamage: reducedDamage,
                    reduction: reduction
                }
            };
        }
        
        return { damage: damage, modified: false };
    }

    /**
     * Log stoneskin damage reduction
     */
    logStoneskinReduction(target, originalDamage, reducedDamage, reduction) {
        this.battleManager.addCombatLog(
            `🗿 ${target.name}'s Stoneskin reduces physical damage by ${reduction}! (${originalDamage} → ${reducedDamage})`,
            target.side === 'player' ? 'success' : 'info'
        );
    }

    /**
     * Send stoneskin reduction update to guest
     */
    syncStoneskinReduction(target, originalDamage, reducedDamage, reduction) {
        this.battleManager.sendBattleUpdate('stoneskin_damage_reduction', {
            targetAbsoluteSide: target.absoluteSide,
            targetPosition: target.position,
            targetName: target.name,
            originalDamage: originalDamage,
            reducedDamage: reducedDamage,
            reduction: reduction,
            timestamp: Date.now()
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    /**
     * Handle Carris immunity on guest side
     * @param {Object} data - Immunity data from host
     */
    handleGuestCarrisImmunity(data) {
        const { targetAbsoluteSide, targetPosition, targetName, originalDamage, source, sourceDescription } = data;
        
        // Determine log type based on target side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = targetLocalSide === 'player' ? 'success' : 'info';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `✨ ${targetName}'s divine immunity nullifies ${originalDamage} damage from ${sourceDescription}!`,
            logType
        );
    }

    /**
     * Handle stoneskin damage reduction on guest side
     * @param {Object} data - Reduction data from host
     */
    handleGuestStoneskinReduction(data) {
        const { targetAbsoluteSide, targetPosition, targetName, originalDamage, reducedDamage, reduction } = data;
        
        // Determine log type based on target side
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = targetLocalSide === 'player' ? 'success' : 'info';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `🗿 ${targetName}'s Stoneskin reduces physical damage by ${reduction}! (${originalDamage} → ${reducedDamage})`,
            logType
        );
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get debug information about damage source
     * @param {Object} context - Damage context
     * @returns {Object} - Debug information
     */
    getDebugInfo(context = {}) {
        const analysis = this.analyzeDamageSource(context);
        
        return {
            ...analysis,
            contextProvided: Object.keys(context),
            timestamp: Date.now()
        };
    }

    /**
     * Register new damage source type (for future extensibility)
     * @param {string} sourceType - Type identifier
     * @param {Function} classifier - Function to classify this source type
     */
    registerDamageSourceType(sourceType, classifier) {
        // Future implementation for extensible damage source types
    }

    // ============================================
    // CLEANUP
    // ============================================

    /**
     * Cleanup method (called when battle ends)
     */
    cleanup() {
    }
}

export default DamageSourceManager;