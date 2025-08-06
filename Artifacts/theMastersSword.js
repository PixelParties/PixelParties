// theMastersSword.js - The Master's Sword artifact effects and animations

export class TheMastersSwordEffect {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.ensureCSS();
    }
    
    // Count how many Master's Swords the attacker has equipped
    countMastersSwords(attacker) {
        if (!attacker.equipment || attacker.equipment.length === 0) {
            return 0;
        }
        
        return attacker.equipment.filter(item => {
            const name = item.name || item.cardName;
            return name === 'TheMastersSword';
        }).length;
    }
    
    // Check if the effect should trigger (attacker at full HP)
    shouldTrigger(attacker) {
        return attacker.currentHp >= attacker.maxHp;
    }
    
    // Calculate damage multiplier
    calculateMultiplier(swordCount) {
        return 1 + swordCount; // 1 sword = x2, 2 swords = x3, etc.
    }
    
    // Create the impressive sword slash animation
    createSwordSlashAnimation(target, swordCount, damageMultiplier) {
        const targetElement = this.getTargetElement(target);
        if (!targetElement) return;
        
        // Create main container for the effect
        const slashContainer = document.createElement('div');
        slashContainer.className = 'masters-sword-slash-container';
        slashContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1000;
            overflow: visible;
        `;
        
        // Create multiple slash effects based on sword count
        const slashCount = Math.min(3, swordCount); // Cap at 3 for visual clarity
        for (let i = 0; i < slashCount; i++) {
            const slash = this.createSingleSlash(i, slashCount);
            slashContainer.appendChild(slash);
        }
        
        // Add power burst effect
        const powerBurst = this.createPowerBurst(damageMultiplier);
        slashContainer.appendChild(powerBurst);
        
        // Add screen shake for dramatic effect
        this.addScreenShake(damageMultiplier);
        
        // Add the container to target
        targetElement.appendChild(slashContainer);
        
        // Add sword icon indicator
        const swordIndicator = this.createSwordIndicator(swordCount, damageMultiplier);
        targetElement.appendChild(swordIndicator);
        
        // Clean up after animation
        const animDuration = this.battleManager.getSpeedAdjustedDelay(1200);
        setTimeout(() => {
            if (slashContainer.parentNode) slashContainer.remove();
            if (swordIndicator.parentNode) swordIndicator.remove();
        }, animDuration);
    }
    
    // Create a single slash effect
    createSingleSlash(index, total) {
        const slash = document.createElement('div');
        slash.className = 'masters-sword-slash';
        
        // Calculate angle based on index
        const baseAngle = -45 + (index * 30);
        const delay = index * 100; // Stagger the slashes
        
        slash.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 150%;
            height: 4px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0) 20%,
                rgba(255, 255, 255, 1) 40%,
                rgba(100, 200, 255, 1) 50%,
                rgba(255, 255, 255, 1) 60%,
                rgba(255, 255, 255, 0) 80%,
                transparent 100%
            );
            transform: translate(-50%, -50%) rotate(${baseAngle}deg) scaleX(0);
            transform-origin: center;
            filter: drop-shadow(0 0 10px rgba(100, 200, 255, 0.8))
                    drop-shadow(0 0 20px rgba(255, 255, 255, 0.6));
            animation: masterSwordSlash ${this.battleManager.getSpeedAdjustedDelay(600)}ms ease-out ${delay}ms forwards;
            z-index: ${1000 + index};
        `;
        
        // Add afterimage effect
        const afterimage = document.createElement('div');
        afterimage.className = 'masters-sword-afterimage';
        afterimage.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 200%;
            background: linear-gradient(90deg,
                transparent 0%,
                rgba(100, 200, 255, 0.3) 50%,
                transparent 100%
            );
            animation: masterSwordAfterimage ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out ${delay}ms forwards;
        `;
        slash.appendChild(afterimage);
        
        return slash;
    }
    
    // Create power burst effect
    createPowerBurst(multiplier) {
        const burst = document.createElement('div');
        burst.className = 'masters-sword-power-burst';
        
        const size = 100 + (multiplier * 20);
        
        burst.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: ${size}px;
            height: ${size}px;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle,
                rgba(255, 255, 255, 0.8) 0%,
                rgba(100, 200, 255, 0.6) 30%,
                rgba(100, 200, 255, 0.3) 60%,
                transparent 100%
            );
            border-radius: 50%;
            opacity: 0;
            animation: masterSwordPowerBurst ${this.battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
            z-index: 999;
        `;
        
        return burst;
    }
    
    // Create sword indicator showing multiplier
    createSwordIndicator(swordCount, multiplier) {
        const indicator = document.createElement('div');
        indicator.className = 'masters-sword-indicator';
        
        // Create sword icons
        let swordIcons = '';
        for (let i = 0; i < Math.min(swordCount, 3); i++) {
            swordIcons += '⚔️';
        }
        if (swordCount > 3) {
            swordIcons += `+${swordCount - 3}`;
        }
        
        indicator.innerHTML = `
            <div class="sword-multiplier-text">
                ${swordIcons}
                <span class="multiplier-value">×${multiplier}</span>
            </div>
        `;
        
        indicator.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 24px;
            font-weight: bold;
            color: #64c8ff;
            text-shadow: 
                0 0 10px rgba(100, 200, 255, 0.8),
                0 0 20px rgba(255, 255, 255, 0.6),
                2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 1100;
            pointer-events: none;
            animation: masterSwordIndicator ${this.battleManager.getSpeedAdjustedDelay(1200)}ms ease-out forwards;
        `;
        
        return indicator;
    }
    
    // Add screen shake effect
    addScreenShake(multiplier) {
        const battleArea = document.querySelector('.battle-area');
        if (!battleArea) return;
        
        // More intense shake for higher multipliers
        const intensity = Math.min(multiplier * 2, 10);
        
        battleArea.style.animation = `masterSwordShake ${this.battleManager.getSpeedAdjustedDelay(300)}ms ease-out`;
        battleArea.style.setProperty('--shake-intensity', `${intensity}px`);
        
        setTimeout(() => {
            battleArea.style.animation = '';
        }, this.battleManager.getSpeedAdjustedDelay(300));
    }
    
    // Get target element (hero or creature)
    getTargetElement(target) {
        if (target.type === 'hero' || !target.type) {
            return this.battleManager.getHeroElement(target.side, target.position);
        } else {
            // For creatures, find the creature element
            const creatureInfo = this.findCreatureInfo(target);
            if (!creatureInfo) return null;
            
            const { side, position, creatureIndex } = creatureInfo;
            return document.querySelector(
                `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
            );
        }
    }
    
    // Find creature information
    findCreatureInfo(creature) {
        for (const side of ['player', 'opponent']) {
            const heroes = side === 'player' ? 
                this.battleManager.playerHeroes : 
                this.battleManager.opponentHeroes;
            
            for (const position of ['left', 'center', 'right']) {
                const hero = heroes[position];
                if (!hero || !hero.creatures) continue;
                
                const creatureIndex = hero.creatures.indexOf(creature);
                if (creatureIndex !== -1) {
                    return { hero, side, position, creatureIndex };
                }
            }
        }
        
        return null;
    }
    
    // Ensure CSS for animations
    ensureCSS() {
        if (document.getElementById('mastersSwordCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'mastersSwordCSS';
        style.textContent = `
            @keyframes masterSwordSlash {
                0% {
                    transform: translate(-50%, -50%) rotate(var(--rotation, -45deg)) scaleX(0);
                    opacity: 0;
                }
                30% {
                    transform: translate(-50%, -50%) rotate(var(--rotation, -45deg)) scaleX(1.2);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) rotate(var(--rotation, -45deg)) scaleX(1);
                    opacity: 0;
                }
            }
            
            @keyframes masterSwordAfterimage {
                0% {
                    transform: scaleY(0);
                    opacity: 0;
                }
                50% {
                    transform: scaleY(1);
                    opacity: 1;
                }
                100% {
                    transform: scaleY(0.5);
                    opacity: 0;
                }
            }
            
            @keyframes masterSwordPowerBurst {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                30% {
                    transform: translate(-50%, -50%) scale(1.5);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(2);
                    opacity: 0;
                }
            }
            
            @keyframes masterSwordIndicator {
                0% {
                    transform: translateX(-50%) translateY(0) scale(0);
                    opacity: 0;
                }
                30% {
                    transform: translateX(-50%) translateY(-10px) scale(1.2);
                    opacity: 1;
                }
                70% {
                    transform: translateX(-50%) translateY(-10px) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateX(-50%) translateY(-20px) scale(0.8);
                    opacity: 0;
                }
            }
            
            @keyframes masterSwordShake {
                0%, 100% { transform: translateX(0); }
                10% { transform: translateX(calc(-1 * var(--shake-intensity, 5px))); }
                20% { transform: translateX(var(--shake-intensity, 5px)); }
                30% { transform: translateX(calc(-1 * var(--shake-intensity, 5px))); }
                40% { transform: translateX(var(--shake-intensity, 5px)); }
                50% { transform: translateX(calc(-0.5 * var(--shake-intensity, 5px))); }
                60% { transform: translateX(calc(0.5 * var(--shake-intensity, 5px))); }
                70% { transform: translateX(calc(-0.25 * var(--shake-intensity, 5px))); }
                80% { transform: translateX(calc(0.25 * var(--shake-intensity, 5px))); }
                90% { transform: translateX(calc(-0.1 * var(--shake-intensity, 5px))); }
            }
            
            .masters-sword-slash-container {
                will-change: transform, opacity;
            }
            
            .masters-sword-slash {
                will-change: transform, opacity;
                mix-blend-mode: screen;
            }
            
            .masters-sword-power-burst {
                will-change: transform, opacity;
                mix-blend-mode: screen;
            }
            
            .sword-multiplier-text {
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
            }
            
            .multiplier-value {
                font-size: 28px;
                color: #ffeb3b;
                text-shadow: 
                    0 0 15px rgba(255, 235, 59, 0.8),
                    0 0 25px rgba(255, 255, 255, 0.6);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Cleanup
    cleanup() {
        const css = document.getElementById('mastersSwordCSS');
        if (css) css.remove();
    }
}

export default TheMastersSwordEffect;