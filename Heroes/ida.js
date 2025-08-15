// ./Heroes/ida.js - Ida Hero Effect Implementation

export class IdaHeroEffect {
    
    // ============================================
    // CORE IDA EFFECT
    // ============================================

    // Check and apply Ida's spell effect when a spell is not resisted
    static checkIdaSpellEffect(caster, target, spellName, battleManager) {
        // Only trigger for Ida
        if (!caster || caster.name !== "Ida") return;
        
        console.log(`🔥 Ida's spell effect triggered on ${target.name || target.creature?.name}!`);
        
        // Apply Ida's flame effect
        this.applyIdaFlames(caster, target, battleManager);
    }

    // ============================================
    // FLAME EFFECT APPLICATION
    // ============================================

    // Apply Ida's flame effect: 50 damage + visual flames
    static async applyIdaFlames(caster, target, battleManager) {
        const damage = 50;
        
        // Log the effect
        battleManager.addCombatLog(
            `🔥 Ida's magical flames engulf the target for ${damage} additional damage!`,
            caster.side === 'player' ? 'success' : 'error'
        );
        
        // Show flame animation
        this.showIdaFlameAnimation(target, battleManager);
        
        // Apply damage after a brief delay for visual effect
        setTimeout(() => {
            this.applyIdaDamage(caster, target, damage, battleManager);
        }, battleManager.getSpeedAdjustedDelay(150));
    }

    // ============================================
    // DAMAGE APPLICATION
    // ============================================

    // Apply Ida's additional damage
    static applyIdaDamage(caster, target, damage, battleManager) {
        if (target.type === 'hero' || !target.type) {
            // Target is a hero
            const hero = target.hero || target;
            
            battleManager.authoritative_applyDamage({
                target: hero,
                damage: damage,
                newHp: Math.max(0, hero.currentHp - damage),
                died: (hero.currentHp - damage) <= 0
            }, { 
                source: 'ida_spell_effect', 
                attacker: caster 
            });
            
        } else if (target.type === 'creature') {
            // Target is a creature
            battleManager.authoritative_applyDamageToCreature({
                hero: target.hero,
                creature: target.creature,
                creatureIndex: target.creatureIndex,
                damage: damage,
                position: target.position,
                side: target.side
            }, { 
                source: 'ida_spell_effect', 
                attacker: caster 
            });
        }
        
        console.log(`🔥 Ida's flames dealt ${damage} additional damage to ${target.name || target.creature?.name}`);
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Show Ida's flame animation on the target
    static showIdaFlameAnimation(target, battleManager) {
        // Get target element
        let targetElement = null;
        
        if (target.type === 'hero' || !target.type) {
            const hero = target.hero || target;
            targetElement = battleManager.getHeroElement(hero.side, hero.position);
        } else if (target.type === 'creature') {
            targetElement = document.querySelector(
                `.${target.side}-slot.${target.position}-slot .creature-icon[data-creature-index="${target.creatureIndex}"]`
            );
        }
        
        if (!targetElement) {
            console.warn('Could not find target element for Ida flame animation');
            return;
        }
        
        // Create flame effect
        this.createIdaFlameEffect(targetElement, battleManager);
    }

    // Create the visual flame effect
    static createIdaFlameEffect(targetElement, battleManager) {
        const flameEffect = document.createElement('div');
        flameEffect.className = 'ida-flame-effect';
        flameEffect.innerHTML = '🔥✨🔥';
        
        flameEffect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28px;
            z-index: 200;
            pointer-events: none;
            animation: idaFlameEffect ${battleManager.getSpeedAdjustedDelay(600)}ms ease-out forwards;
            text-shadow: 
                0 0 8px rgba(255, 100, 0, 0.9),
                0 0 16px rgba(255, 150, 0, 0.7),
                0 0 24px rgba(255, 200, 0, 0.5);
        `;
        
        targetElement.appendChild(flameEffect);
        
        // Remove after animation
        setTimeout(() => {
            if (flameEffect && flameEffect.parentNode) {
                flameEffect.remove();
            }
        }, battleManager.getSpeedAdjustedDelay(600));
        
        // Ensure CSS exists
        this.ensureIdaFlameCSS();
    }

    // Ensure CSS animations exist for Ida flame effects
    static ensureIdaFlameCSS() {
        if (document.getElementById('idaFlameCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'idaFlameCSS';
        style.textContent = `
            @keyframes idaFlameEffect {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(45deg);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.3) rotate(90deg);
                }
                80% {
                    opacity: 0.8;
                    transform: translate(-50%, -50%) scale(1.1) rotate(135deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
                }
            }
            
            .ida-flame-effect {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // CLEANUP
    // ============================================

    // Cleanup Ida effects
    static cleanup() {
        // Remove any remaining flame effects
        const flames = document.querySelectorAll('.ida-flame-effect');
        flames.forEach(flame => flame.remove());
        
        // Remove CSS
        const css = document.getElementById('idaFlameCSS');
        if (css) css.remove();
        
        console.log('🔥 Ida hero effects cleaned up');
    }
}