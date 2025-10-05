// ./Spells/cure.js - Cure Spell Implementation

export class CureSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'Cure';
        this.displayName = 'Cure';
        
        // Visual constants
        this.CURE_EFFECT_DURATION = 1500;
        this.PARTICLE_COUNT = 8;
    }

    // ============================================
    // SPELL CASTING CONDITIONS
    // ============================================

    canCast(caster) {
        const affectedTargets = this.findAffectedTargets(caster);
        return affectedTargets.length > 0;
    }

    // Find all allies with negative status effects
    findAffectedTargets(caster) {
        const allies = caster.side === 'player' 
            ? this.battleManager.playerHeroes 
            : this.battleManager.opponentHeroes;
        
        const targets = [];
        
        // Check all allied positions
        ['left', 'center', 'right'].forEach(position => {
            const hero = allies[position];
            if (!hero || !hero.alive) return;
            
            const debuffs = this.getDebuffsForTarget(hero);
            if (debuffs.length > 0) {
                targets.push({
                    type: 'hero',
                    target: hero,
                    position: position,
                    debuffs: debuffs
                });
            }
            
            // Check creatures
            if (hero.creatures) {
                hero.creatures.forEach((creature, index) => {
                    if (!creature.alive) return;
                    
                    const creatureDebuffs = this.getDebuffsForTarget(creature);
                    if (creatureDebuffs.length > 0) {
                        targets.push({
                            type: 'creature',
                            target: creature,
                            hero: hero,
                            position: position,
                            creatureIndex: index,
                            debuffs: creatureDebuffs
                        });
                    }
                });
            }
        });
        
        return targets;
    }

    getDebuffsForTarget(target) {
        if (!target.statusEffects) return [];
        
        const debuffNames = ['silenced', 'poisoned', 'stunned', 'dazed', 'burned', 'frozen', 'healblock', 'weakened'];
        
        return target.statusEffects.filter(effect => 
            debuffNames.includes(effect.name) && effect.stacks > 0
        );
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    async executeSpell(caster, spell) {
        const affectedTargets = this.findAffectedTargets(caster);
        if (affectedTargets.length === 0) return;
        
        // Log the spell effect
        this.logSpellEffect(caster, affectedTargets);
        
        // Send network sync
        this.sendCureUpdate(caster, affectedTargets);
        
        // Create visual effects for all targets simultaneously
        const effectPromises = affectedTargets.map(targetInfo => 
            this.createCureParticles(targetInfo)
        );
        
        // Start all particle effects
        await Promise.all(effectPromises);
        
        // Remove all debuffs from all targets
        this.removeAllDebuffs(affectedTargets);
        
        // Wait for animation to complete
        await this.battleManager.delay(this.CURE_EFFECT_DURATION);
    }

    removeAllDebuffs(affectedTargets) {
        const statusManager = this.battleManager.statusEffectsManager;
        if (!statusManager) return;
        
        affectedTargets.forEach(targetInfo => {
            targetInfo.debuffs.forEach(debuff => {
                // Remove all stacks of each debuff
                statusManager.removeStatusEffect(targetInfo.target, debuff.name, debuff.stacks);
            });
        });
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    async createCureParticles(targetInfo) {
        const targetElement = this.getTargetElement(targetInfo);
        if (!targetElement) return;
        
        const targetRect = targetElement.getBoundingClientRect();
        const centerX = targetRect.left + targetRect.width / 2;
        const centerY = targetRect.top + targetRect.height / 2;
        
        const adjustedDuration = this.battleManager.getSpeedAdjustedDelay(this.CURE_EFFECT_DURATION);
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'cure-spell-particles';
        particleContainer.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 150px;
            height: 150px;
            transform: translate(-50%, -50%);
            z-index: 1500;
            pointer-events: none;
        `;
        
        // Create multiple green healing particles
        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const particle = document.createElement('div');
            const angle = (i / this.PARTICLE_COUNT) * Math.PI * 2;
            const radius = 40 + Math.random() * 20;
            
            particle.innerHTML = '✨';
            particle.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                font-size: ${16 + Math.random() * 8}px;
                color: #4caf50;
                text-shadow: 
                    0 0 10px rgba(76, 175, 80, 1),
                    0 0 20px rgba(76, 175, 80, 0.8),
                    0 0 30px rgba(76, 175, 80, 0.6);
                animation: cureParticleFloat${i} ${adjustedDuration}ms ease-out forwards;
                animation-delay: ${i * 50}ms;
            `;
            
            // Create unique animation for each particle
            this.createParticleAnimation(i, angle, radius, adjustedDuration);
            particleContainer.appendChild(particle);
        }
        
        // Add cleansing burst effect
        const burst = document.createElement('div');
        burst.className = 'cure-burst';
        burst.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            width: 100px;
            height: 100px;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, 
                rgba(76, 175, 80, 0.8) 0%,
                rgba(76, 175, 80, 0.4) 30%,
                transparent 70%);
            border-radius: 50%;
            opacity: 0;
            animation: cureBurst ${adjustedDuration}ms ease-out forwards;
        `;
        
        particleContainer.appendChild(burst);
        document.body.appendChild(particleContainer);
        
        // Cleanup
        setTimeout(() => {
            if (particleContainer.parentNode) {
                particleContainer.remove();
            }
            this.cleanupParticleAnimations();
        }, adjustedDuration + 500);
    }

    createParticleAnimation(index, angle, radius, duration) {
        if (!document.getElementById('cureParticleStyles')) {
            const style = document.createElement('style');
            style.id = 'cureParticleStyles';
            document.head.appendChild(style);
        }
        
        const style = document.getElementById('cureParticleStyles');
        const keyframes = `
            @keyframes cureParticleFloat${index} {
                0% {
                    transform: translate(-50%, -50%) translate(0, 0) scale(0);
                    opacity: 0;
                }
                20% {
                    transform: translate(-50%, -50%) translate(${Math.cos(angle) * radius * 0.5}px, ${Math.sin(angle) * radius * 0.5}px) scale(1.2);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) translate(${Math.cos(angle) * radius * 1.5}px, ${Math.sin(angle) * radius * 1.5 - 30}px) scale(0.5);
                    opacity: 0;
                }
            }
        `;
        
        if (!style.textContent.includes(`cureParticleFloat${index}`)) {
            style.textContent += keyframes;
        }
        
        // Add burst animation if not exists
        if (!style.textContent.includes('cureBurst')) {
            style.textContent += `
                @keyframes cureBurst {
                    0% {
                        width: 20px;
                        height: 20px;
                        opacity: 0;
                    }
                    30% {
                        width: 150px;
                        height: 150px;
                        opacity: 0.8;
                    }
                    100% {
                        width: 200px;
                        height: 200px;
                        opacity: 0;
                    }
                }
            `;
        }
    }

    cleanupParticleAnimations() {
        const style = document.getElementById('cureParticleStyles');
        if (style) {
            style.remove();
        }
    }

    getTargetElement(targetInfo) {
        if (targetInfo.type === 'hero') {
            return this.battleManager.getHeroElement(targetInfo.target.side, targetInfo.position);
        } else {
            return document.querySelector(
                `.${targetInfo.hero.side}-slot.${targetInfo.position}-slot .creature-icon[data-creature-index="${targetInfo.creatureIndex}"]`
            );
        }
    }

    // ============================================
    // LOGGING
    // ============================================

    logSpellEffect(caster, affectedTargets) {
        const logType = caster.side === 'player' ? 'success' : 'error';
        
        // Build target names list
        const targetNames = affectedTargets.map(t => 
            t.type === 'hero' ? t.target.name : t.target.name
        );
        
        const uniqueNames = [...new Set(targetNames)];
        const targetText = uniqueNames.length === 1 
            ? uniqueNames[0]
            : uniqueNames.slice(0, -1).join(', ') + ' and ' + uniqueNames[uniqueNames.length - 1];
        
        this.battleManager.addCombatLog(
            `✨💚 ${caster.name} cures ${targetText}, removing all negative effects!`,
            logType
        );
    }

    // ============================================
    // NETWORK SYNC
    // ============================================

    sendCureUpdate(caster, affectedTargets) {
        const targetData = affectedTargets.map(t => ({
            type: t.type,
            position: t.position,
            creatureIndex: t.creatureIndex,
            debuffs: t.debuffs.map(d => ({ name: d.name, stacks: d.stacks }))
        }));
        
        this.battleManager.sendBattleUpdate('spell_effect', {
            spellName: this.spellName,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            casterName: caster.name,
            affectedTargets: targetData
        });
    }

    // ============================================
    // GUEST HANDLING
    // ============================================

    async handleGuestSpellEffect(data) {
        const { casterAbsoluteSide, casterPosition, casterName, affectedTargets } = data;
        
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        // Create visual effects for all affected targets
        const effectPromises = affectedTargets.map(targetData => {
            const targetLocalSide = casterLocalSide; // Allies of caster
            const targetInfo = {
                type: targetData.type,
                position: targetData.position,
                creatureIndex: targetData.creatureIndex,
                target: { side: targetLocalSide },
                hero: { side: targetLocalSide }
            };
            
            return this.createCureParticles(targetInfo);
        });
        
        await Promise.all(effectPromises);
    }

    // ============================================
    // UTILITY
    // ============================================

    getSpellInfo() {
        return {
            name: this.spellName,
            displayName: this.displayName,
            description: 'Removes all negative status effects from all affected allies. Can only be cast when at least one ally has a debuff.',
            spellSchool: 'Divine',
            targetType: 'all_affected_allies',
            hasImplementation: true
        };
    }

    cleanup() {
        const particles = document.querySelectorAll('.cure-spell-particles');
        particles.forEach(p => p.remove());
        this.cleanupParticleAnimations();
    }
}

export default CureSpell;