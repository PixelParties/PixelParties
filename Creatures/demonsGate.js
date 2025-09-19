// ./Creatures/demonsGate.js - Demon's Gate Creature that casts FlameAvalanche and enhances DestructionMagic post-battle

import { getCardInfo } from '../cardDatabase.js';

export class DemonsGateCreature {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        console.log('🌋 Demon\'s Gate Creature module initialized');
    }

    // Check if a creature is Demon's Gate
    static isDemonsGate(creatureName) {
        return creatureName === 'DemonsGate' || creatureName === 'Demon\'s Gate';
    }

    // Execute Demon's Gate special attack - cast FlameAvalanche
    async executeSpecialAttack(demonsGateActor, position) {
        if (!this.battleManager.isAuthoritative) return;

        const demonsGateCreature = demonsGateActor.data;
        const ownerHero = demonsGateActor.hero;
        const attackerSide = ownerHero.side;
        
        // Safety check: ensure Demon's Gate is still alive
        if (!demonsGateCreature.alive || demonsGateCreature.currentHp <= 0) {
            console.log(`Demon's Gate is dead, cannot execute special attack`);
            return;
        }
        
        this.battleManager.addCombatLog(
            `🌋 ${demonsGateCreature.name} opens a portal to the infernal realm!`, 
            attackerSide === 'player' ? 'success' : 'error'
        );

        // Create a FlameAvalanche spell object
        const flameAvalancheSpell = {
            name: 'FlameAvalanche',
            level: 1,
            spellSchool: 'DestructionMagic',
            cardType: 'Spell',
            subtype: 'Spell'
        };

        // Check if we have access to the spell system and FlameAvalanche
        if (!this.battleManager.spellSystem || !this.battleManager.spellSystem.spellImplementations.has('FlameAvalanche')) {
            console.error('FlameAvalanche spell not available in spell system');
            this.battleManager.addCombatLog(
                `⚠️ ${demonsGateCreature.name} fails to channel the spell!`, 
                'info'
            );
            return;
        }

        // Send synchronization data to guest before casting
        this.sendDemonsGateSpellCast(demonsGateActor, ownerHero, position);

        // Small delay to ensure guest receives the message
        await this.battleManager.delay(100);

        // Get the FlameAvalanche spell implementation
        const flameAvalancheImpl = this.battleManager.spellSystem.spellImplementations.get('FlameAvalanche');
        
        try {
            // Get the Demon's Gate creature element for flame spawn point
            const demonsGateElement = this.getDemonsGateElement(attackerSide, position, demonsGateActor.index);
            let spawnOverride = null;
            
            if (demonsGateElement) {
                const rect = demonsGateElement.getBoundingClientRect();
                spawnOverride = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
            }
            
            // Cast FlameAvalanche using the owner Hero as the caster (for scaling)
            // but with flames spawning from the Demon's Gate creature
            await this.executeCustomFlameAvalanche(ownerHero, flameAvalancheSpell, spawnOverride);
            
            this.battleManager.addCombatLog(
                `🔥 The portal erupts with devastating flames across the battlefield!`, 
                attackerSide === 'player' ? 'success' : 'error'
            );
            
        } catch (error) {
            console.error('Error casting FlameAvalanche from Demon\'s Gate:', error);
            this.battleManager.addCombatLog(
                `⚠️ The infernal portal flickers and fails to manifest!`, 
                'info'
            );
        }
    }

    // Get the DOM element for Demon's Gate creature
    getDemonsGateElement(side, heroPosition, creatureIndex) {
        return document.querySelector(
            `.${side}-slot.${heroPosition}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
    }

    // Execute FlameAvalanche with custom spawn point (from Demon's Gate instead of Hero)
    async executeCustomFlameAvalanche(caster, spell, spawnOverride) {
        // Get the FlameAvalanche spell implementation
        const flameAvalancheImpl = this.battleManager.spellSystem.spellImplementations.get('FlameAvalanche');
        
        // If we have a spawn override, temporarily patch the spawnFlameWave method
        if (spawnOverride && flameAvalancheImpl) {
            const originalSpawnFlameWave = flameAvalancheImpl.spawnFlameWave.bind(flameAvalancheImpl);
            
            // Temporarily override the spawn method
            flameAvalancheImpl.spawnFlameWave = (targets, caster, waveNumber, waveDuration, resistanceResults) => {
                this.spawnFlameWaveFromCreature(targets, caster, waveNumber, waveDuration, resistanceResults, spawnOverride, flameAvalancheImpl);
            };
            
            try {
                // Execute the spell with our custom spawn point
                await flameAvalancheImpl.executeSpell(caster, spell);
            } finally {
                // Restore the original method
                flameAvalancheImpl.spawnFlameWave = originalSpawnFlameWave;
            }
        } else {
            // Fallback to normal execution
            await flameAvalancheImpl.executeSpell(caster, spell);
        }
    }

    // Custom flame wave spawn method that uses creature position instead of caster position
    spawnFlameWaveFromCreature(targets, caster, waveNumber, waveDuration, resistanceResults, spawnOverride, flameAvalancheImpl) {
        console.log(`🔥 Spawning wave ${waveNumber} from Demon's Gate with ${targets.length * 10} flames`);
        
        const casterCenterX = spawnOverride.x;
        const casterCenterY = spawnOverride.y;
        
        // Spawn 10 flames for each target (same as original FlameAvalanche)
        targets.forEach((target, targetIndex) => {
            const targetKey = flameAvalancheImpl.getTargetKey(target);
            const isResisted = resistanceResults.get(targetKey);
            
            for (let flameIndex = 0; flameIndex < 10; flameIndex++) {
                setTimeout(() => {
                    flameAvalancheImpl.spawnFlyingFlame(
                        casterCenterX, 
                        casterCenterY, 
                        target, 
                        waveNumber, 
                        targetIndex, 
                        flameIndex,
                        waveDuration,
                        isResisted
                    );
                }, this.battleManager.getSpeedAdjustedDelay(flameIndex * 5));
            }
        });
    }

    // Send spell cast data to guest for synchronization  
    sendDemonsGateSpellCast(demonsGateActor, ownerHero, position) {
        this.battleManager.sendBattleUpdate('demons_gate_spell_cast', {
            creatureData: {
                side: ownerHero.side,
                position: position,
                creatureIndex: demonsGateActor.index,
                name: demonsGateActor.data.name,
                absoluteSide: ownerHero.absoluteSide
            },
            ownerHero: {
                name: ownerHero.name,
                side: ownerHero.side,
                position: ownerHero.position,
                absoluteSide: ownerHero.absoluteSide,
                destructionMagicLevel: ownerHero.hasAbility('DestructionMagic') 
                    ? ownerHero.getAbilityStackCount('DestructionMagic') 
                    : 0
            },
            spellName: 'FlameAvalanche',
            timestamp: Date.now()
        });
    }

    // Handle Demon's Gate spell cast on guest side
    handleGuestSpellCast(data) {
        const { creatureData, ownerHero, spellName } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const creatureLocalSide = (creatureData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        this.battleManager.addCombatLog(
            `🌋 ${creatureData.name} opens a portal to the infernal realm!`, 
            creatureLocalSide === 'player' ? 'success' : 'error'
        );

        // Find the local Demon's Gate creature element for flame spawn
        const demonsGateElement = this.getDemonsGateElement(
            creatureLocalSide,
            creatureData.position,
            creatureData.creatureIndex
        );

        // Create spawn override for guest-side animation
        let spawnOverride = null;
        if (demonsGateElement) {
            const rect = demonsGateElement.getBoundingClientRect();
            spawnOverride = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }

        // Store the spawn override for when the spell system processes the FlameAvalanche effect
        if (spawnOverride && this.battleManager.spellSystem && 
            this.battleManager.spellSystem.spellImplementations.has('FlameAvalanche')) {
            
            const flameAvalancheImpl = this.battleManager.spellSystem.spellImplementations.get('FlameAvalanche');
            
            // Store the override temporarily (will be used by guest spell effect handler)
            flameAvalancheImpl._demonsGateSpawnOverride = spawnOverride;
            
            // Clear it after a short delay to avoid affecting other spell casts
            setTimeout(() => {
                if (flameAvalancheImpl._demonsGateSpawnOverride) {
                    delete flameAvalancheImpl._demonsGateSpawnOverride;
                }
            }, this.battleManager.getSpeedAdjustedDelay(2000));
        }
        
        // Add a brief delay then show the spell eruption message
        setTimeout(() => {
            this.battleManager.addCombatLog(
                `🔥 The portal erupts with devastating flames across the battlefield!`, 
                creatureLocalSide === 'player' ? 'success' : 'error'
            );
        }, this.battleManager.getSpeedAdjustedDelay(150));
    }

    // NEW: Process post-battle DestructionMagic enhancement for Demon's Gate owners
    processPostBattleDestructionMagicEnhancement(heroSelection) {
        if (!heroSelection || !heroSelection.heroCreatureManager || !heroSelection.heroAbilitiesManager) {
            console.log('🌋 Missing required managers for Demon\'s Gate post-battle processing');
            return;
        }

        console.log('🌋 Processing Demon\'s Gate post-battle DestructionMagic enhancement...');

        const positions = ['left', 'center', 'right'];
        let enhancementsProcessed = 0;

        positions.forEach(position => {
            // Get creatures for this hero position
            const heroCreatures = heroSelection.heroCreatureManager.getHeroCreatures(position);
            
            // Check if any creature is Demon's Gate
            const hasDemonsGate = heroCreatures.some(creature => 
                DemonsGateCreature.isDemonsGate(creature.name)
            );

            if (hasDemonsGate) {
                console.log(`🌋 Found Demon's Gate at ${position}, processing DestructionMagic enhancement`);
                
                const enhanced = this.enhanceHeroDestructionMagic(heroSelection, position);
                if (enhanced) {
                    enhancementsProcessed++;
                }
            }
        });

        if (enhancementsProcessed > 0) {
            console.log(`🌋 Demon's Gate enhanced DestructionMagic for ${enhancementsProcessed} hero(s)`);
        }
    }

    // Enhance DestructionMagic ability for a specific hero position
    enhanceHeroDestructionMagic(heroSelection, heroPosition) {
        const heroAbilitiesManager = heroSelection.heroAbilitiesManager;
        
        // Check if hero has DestructionMagic ability
        const currentLevel = heroAbilitiesManager.getAbilityStackCountForPosition(heroPosition, 'DestructionMagic');
        
        if (currentLevel > 0) {
            // Hero has DestructionMagic - increase it by 1 level
            console.log(`🌋 ${heroPosition} hero has DestructionMagic level ${currentLevel}, increasing by 1`);
            
            const destructionMagicInfo = getCardInfo('DestructionMagic');
            if (destructionMagicInfo) {
                // Find which zone has DestructionMagic
                const zoneWithDestructionMagic = this.findDestructionMagicZone(heroAbilitiesManager, heroPosition);
                
                if (zoneWithDestructionMagic) {
                    // Add another stack to the existing zone
                    const success = heroAbilitiesManager.addAbilityToZone(
                        heroPosition, 
                        zoneWithDestructionMagic, 
                        destructionMagicInfo, 
                        true // bypass unique check since we're stacking
                    );
                    
                    if (success) {
                        // Trigger flame animation around the enhanced ability
                        setTimeout(() => {
                            this.showFlameEnhancementAnimation(heroPosition, zoneWithDestructionMagic);
                        }, 500);
                        
                        console.log(`🌋 Successfully enhanced DestructionMagic to level ${currentLevel + 1} for ${heroPosition} hero`);
                        return true;
                    }
                }
            }
        } else {
            // Hero doesn't have DestructionMagic - try to add it
            console.log(`🌋 ${heroPosition} hero doesn't have DestructionMagic, attempting to add it`);
            
            const freeZone = heroAbilitiesManager.findLeftmostFreeZone(heroPosition);
            
            if (freeZone) {
                const destructionMagicInfo = getCardInfo('DestructionMagic');
                if (destructionMagicInfo) {
                    const success = heroAbilitiesManager.addAbilityToZone(
                        heroPosition, 
                        freeZone, 
                        destructionMagicInfo
                    );
                    
                    if (success) {
                        // Trigger flame animation around the new ability
                        setTimeout(() => {
                            this.showFlameEnhancementAnimation(heroPosition, freeZone);
                        }, 500);
                        
                        console.log(`🌋 Successfully added DestructionMagic to zone ${freeZone} for ${heroPosition} hero`);
                        return true;
                    }
                }
            } else {
                // No free zones - fail silently as requested
                console.log(`🌋 ${heroPosition} hero has no free ability zones, DestructionMagic enhancement skipped silently`);
            }
        }
        
        return false;
    }

    // Find which zone contains DestructionMagic for a hero
    findDestructionMagicZone(heroAbilitiesManager, heroPosition) {
        const heroAbilities = heroAbilitiesManager.getHeroAbilities(heroPosition);
        if (!heroAbilities) return null;
        
        for (let i = 1; i <= 3; i++) {
            const zoneName = `zone${i}`;
            const zone = heroAbilities[zoneName];
            
            if (zone && zone.length > 0 && zone[0].name === 'DestructionMagic') {
                return i;
            }
        }
        
        return null;
    }

    // Show flame animation around enhanced DestructionMagic ability
    showFlameEnhancementAnimation(heroPosition, zoneNumber) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;

        // Find the specific ability zone
        const abilityZone = teamSlot.querySelector(`.ability-zone-${zoneNumber}`);
        if (!abilityZone) return;

        console.log(`🌋 Showing flame enhancement animation for ${heroPosition} hero zone ${zoneNumber}`);

        // Create flame enhancement overlay
        const flameOverlay = document.createElement('div');
        flameOverlay.className = 'demons-gate-flame-enhancement';
        flameOverlay.style.cssText = `
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            pointer-events: none;
            z-index: 1000;
            border-radius: 8px;
            background: radial-gradient(ellipse at center, 
                rgba(255, 140, 0, 0.4) 0%,
                rgba(255, 69, 0, 0.3) 40%,
                rgba(220, 20, 60, 0.2) 70%,
                transparent 100%);
            animation: demonsGateFlameEnhancement 3s ease-out;
            box-shadow: 0 0 20px rgba(255, 69, 0, 0.6),
                        0 0 40px rgba(255, 140, 0, 0.4),
                        0 0 60px rgba(220, 20, 60, 0.2);
        `;

        // Create multiple flame particles
        for (let i = 0; i < 8; i++) {
            const flame = document.createElement('div');
            flame.className = 'demons-gate-flame-particle';
            flame.style.cssText = `
                position: absolute;
                width: 6px;
                height: 12px;
                background: linear-gradient(to top, 
                    #ff4500 0%, 
                    #ff8c00 50%, 
                    #ffd700 100%);
                border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                animation: demonsGateFlameParticle ${2 + Math.random()}s ease-out;
                left: ${20 + Math.random() * 60}%;
                top: ${20 + Math.random() * 60}%;
                transform-origin: bottom center;
            `;
            flameOverlay.appendChild(flame);
        }

        // Ensure relative positioning for the ability zone
        const originalPosition = abilityZone.style.position;
        abilityZone.style.position = 'relative';
        abilityZone.appendChild(flameOverlay);

        // Add the CSS animations if they don't exist
        this.ensureFlameAnimationStyles();

        // Clean up after animation
        setTimeout(() => {
            if (flameOverlay.parentNode) {
                flameOverlay.parentNode.removeChild(flameOverlay);
                // Restore original position
                abilityZone.style.position = originalPosition;
            }
        }, 3000);
    }

    // Ensure flame animation CSS styles are added to the document
    ensureFlameAnimationStyles() {
        if (document.getElementById('demons-gate-flame-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'demons-gate-flame-styles';
        styleSheet.textContent = `
            @keyframes demonsGateFlameEnhancement {
                0% {
                    opacity: 0;
                    transform: scale(0.8);
                    box-shadow: 0 0 10px rgba(255, 69, 0, 0.8),
                               0 0 20px rgba(255, 140, 0, 0.6),
                               0 0 30px rgba(220, 20, 60, 0.4);
                }
                20% {
                    opacity: 1;
                    transform: scale(1.1);
                    box-shadow: 0 0 25px rgba(255, 69, 0, 0.9),
                               0 0 50px rgba(255, 140, 0, 0.7),
                               0 0 75px rgba(220, 20, 60, 0.5);
                }
                80% {
                    opacity: 0.8;
                    transform: scale(1.05);
                }
                100% {
                    opacity: 0;
                    transform: scale(1);
                    box-shadow: 0 0 5px rgba(255, 69, 0, 0.2),
                               0 0 10px rgba(255, 140, 0, 0.1),
                               0 0 15px rgba(220, 20, 60, 0.05);
                }
            }

            @keyframes demonsGateFlameParticle {
                0% {
                    opacity: 0;
                    transform: translateY(0) scale(0.5) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: translateY(-5px) scale(1) rotate(5deg);
                }
                80% {
                    opacity: 0.8;
                    transform: translateY(-15px) scale(0.8) rotate(-5deg);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-25px) scale(0.3) rotate(10deg);
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }

    // Clean up (called on battle end/reset)
    cleanup() {
        console.log('🌋 Demon\'s Gate Creature cleaned up');
        
        // Remove flame animation styles
        const flameStyles = document.getElementById('demons-gate-flame-styles');
        if (flameStyles) {
            flameStyles.remove();
        }
        
        // Clean up any remaining flame overlays
        const flameOverlays = document.querySelectorAll('.demons-gate-flame-enhancement');
        flameOverlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
    }
}

// Static helper methods
export const DemonsGateHelpers = {
    // Check if any creature in a list is Demon's Gate
    hasDemonsGateInList(creatures) {
        return creatures.some(creature => DemonsGateCreature.isDemonsGate(creature.name));
    },

    // Get all Demon's Gate creatures from a list
    getDemonsGateFromList(creatures) {
        return creatures.filter(creature => DemonsGateCreature.isDemonsGate(creature.name));
    }
};

export default DemonsGateCreature;