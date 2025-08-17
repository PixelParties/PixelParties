// battleAnimationManager.js - Dedicated Animation System for Battle Manager

export class BattleAnimationManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.ensureAnimationStyles();
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Get speed-adjusted delay from battle manager
    getSpeedAdjustedDelay(ms) {
        return this.battleManager.getSpeedAdjustedDelay(ms);
    }

    // Async delay utility
    async delay(ms) {
        const adjustedMs = this.getSpeedAdjustedDelay(ms);
        return new Promise(resolve => setTimeout(resolve, adjustedMs));
    }

    // Get hero element helper
    getHeroElement(side, position) {
        const selector = `.${side}-slot.${position}-slot`;
        const element = document.querySelector(selector);
        if (!element) {
            console.error(`Could not find hero element with selector: ${selector}`);
        }
        return element;
    }

    // ============================================
    // HERO ATTACK ANIMATIONS
    // ============================================

    // Animate hero attack (single)
    async animateHeroAttack(hero, target) {
        // Safety check for null target
        if (!target) {
            console.warn('animateHeroAttack called with null target, skipping animation');
            return;
        }
        
        if (target.type === 'creature') {
            await this.animateHeroToCreatureAttack(hero, target, hero.side);
        } else {
            await this.animateFullAttack(hero, target.hero);
        }
    }

    // Animate simultaneous hero attacks
    async animateSimultaneousHeroAttacks(playerAttack, opponentAttack) {
        const animations = [];
        
        // Player attack animation
        if (playerAttack.target.type === 'creature') {
            animations.push(this.animateHeroToCreatureAttack(playerAttack.hero, playerAttack.target, 'player'));
        } else {
            animations.push(this.animateCollisionAttackTowards(playerAttack.hero, 
                this.getHeroElement(playerAttack.target.side, playerAttack.target.position), 'player'));
        }
        
        // Opponent attack animation
        if (opponentAttack.target.type === 'creature') {
            animations.push(this.animateHeroToCreatureAttack(opponentAttack.hero, opponentAttack.target, 'opponent'));
        } else {
            animations.push(this.animateCollisionAttackTowards(opponentAttack.hero, 
                this.getHeroElement(opponentAttack.target.side, opponentAttack.target.position), 'opponent'));
        }
        
        await Promise.all(animations);
    }

    // Animate collision attacks
    async animateSimultaneousAttacks(playerHero, opponentHero) {
        const playerElement = this.getHeroElement('player', playerHero.position);
        const opponentElement = this.getHeroElement('opponent', opponentHero.position);
        
        if (!playerElement || !opponentElement) {
            console.error('Could not find hero elements for collision animation');
            return;
        }

        const animations = [
            this.animateCollisionAttackTowards(playerHero, opponentElement, 'player'),
            this.animateCollisionAttackTowards(opponentHero, playerElement, 'opponent')
        ];
        
        await Promise.all(animations);
    }

    // Animate collision attack towards target
    async animateCollisionAttackTowards(attacker, targetElement, attackerSide) {
        const attackerElement = this.getHeroElement(attackerSide, attacker.position);
        if (!attackerElement || !targetElement) return;

        const attackerCard = attackerElement.querySelector('.battle-hero-card');
        if (!attackerCard) return;

        const attackerRect = attackerElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const deltaX = (targetRect.left - attackerRect.left) * 0.5;
        const deltaY = (targetRect.top - attackerRect.top) * 0.5;
        
        attackerCard.classList.add('attacking');
        attackerCard.style.transition = `transform ${this.getSpeedAdjustedDelay(80)}ms ease-out`;
        attackerCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
        
        await this.delay(80);
        this.createCollisionEffect();
    }

    // Animate full attack to target
    async animateFullAttack(attacker, target) {
        const attackerElement = this.getHeroElement(attacker.side, attacker.position);
        const targetElement = this.getHeroElement(target.side, target.position);
        
        if (!attackerElement || !targetElement) {
            console.error(`Could not find elements for attack: ${attacker.name} -> ${target.name}`);
            return;
        }

        const attackerCard = attackerElement.querySelector('.battle-hero-card');
        if (!attackerCard) return;

        const attackerRect = attackerElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        const deltaX = targetRect.left - attackerRect.left;
        const deltaY = targetRect.top - attackerRect.top;

        attackerCard.classList.add('attacking');
        attackerCard.style.transition = `transform ${this.getSpeedAdjustedDelay(120)}ms ease-out`;
        attackerCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.2)`;
        
        await this.delay(120);
        this.createImpactEffect(targetElement);
    }

    // Animate hero attacking a creature
    async animateHeroToCreatureAttack(hero, creatureTarget, heroSide) {
        const heroElement = this.getHeroElement(heroSide, hero.position);
        const creatureElement = document.querySelector(
            `.${creatureTarget.side}-slot.${creatureTarget.position}-slot .creature-icon[data-creature-index="${creatureTarget.creatureIndex}"]`
        );
        
        if (!heroElement || !creatureElement) return;
        
        const heroCard = heroElement.querySelector('.battle-hero-card');
        if (!heroCard) return;
        
        const heroRect = heroElement.getBoundingClientRect();
        const creatureRect = creatureElement.getBoundingClientRect();
        
        const deltaX = creatureRect.left + creatureRect.width/2 - (heroRect.left + heroRect.width/2);
        const deltaY = creatureRect.top + creatureRect.height/2 - (heroRect.top + heroRect.height/2);
            
        heroCard.classList.add('attacking');
        heroCard.style.transition = `transform ${this.getSpeedAdjustedDelay(120)}ms ease-out`;
        heroCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.2)`;
        
        await this.delay(120);
        this.createImpactEffect(creatureElement);
    }

    // GUEST: Animate hero to creature attack
    async guest_animateHeroToCreatureAttack(hero, targetData, heroSide) {
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const targetLocalSide = (targetData.absoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        
        const heroElement = this.getHeroElement(heroSide, hero.position);
        const creatureElement = document.querySelector(
            `.${targetLocalSide}-slot.${targetData.position}-slot .creature-icon[data-creature-index="${targetData.creatureIndex}"]`
        );
        
        if (!heroElement || !creatureElement) return;
        
        const heroCard = heroElement.querySelector('.battle-hero-card');
        if (!heroCard) return;
        
        const heroRect = heroElement.getBoundingClientRect();
        const creatureRect = creatureElement.getBoundingClientRect();
        
        const deltaX = creatureRect.left + creatureRect.width/2 - (heroRect.left + heroRect.width/2);
        const deltaY = creatureRect.top + creatureRect.height/2 - (heroRect.top + heroRect.height/2);
        
        heroCard.classList.add('attacking');
        heroCard.style.transition = 'transform 0.12s ease-out';
        heroCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.2)`;
        
        await this.delay(120);
        this.createImpactEffect(creatureElement);
    }

    // Animate return to position
    async animateReturn(hero, side) {
        const heroElement = this.getHeroElement(side, hero.position);
        if (!heroElement) return;

        const card = heroElement.querySelector('.battle-hero-card');
        if (!card) return;

        card.style.transition = `transform ${this.getSpeedAdjustedDelay(80)}ms ease-in-out`;
        card.style.transform = 'translate(0, 0) scale(1)';
        card.classList.remove('attacking');
        
        await this.delay(80);
    }



    // ============================================
    // MONIA PROTECTION DASH ANIMATIONS
    // ============================================

    // Main Monia protection dash method
    async animateMoniaProtectionDash(protectingMonia, target) {
        if (!target) {
            console.warn('animateMoniaProtectionDash called with null target, skipping animation');
            return;
        }
        
        console.log(`🛡️ Animating Monia protection dash: ${protectingMonia.name} → ${target.name || 'creature'}`);
        
        if (target.type === 'creature') {
            await this.animateMoniaToCreatureDash(protectingMonia, target);
        } else {
            await this.animateMoniaToHeroDash(protectingMonia, target);
        }
        
        // Return to position after dash (shorter return time for protection)
        await this.animateReturn(protectingMonia, protectingMonia.side);
    }

    // Animate Monia dashing to protect a hero
    async animateMoniaToHeroDash(protectingMonia, targetHero) {
        const moniaElement = this.getHeroElement(protectingMonia.side, protectingMonia.position);
        const targetElement = this.getHeroElement(targetHero.side, targetHero.position);
        
        if (!moniaElement || !targetElement) {
            console.error(`Could not find elements for Monia protection dash: ${protectingMonia.name} -> ${targetHero.name}`);
            return;
        }

        const moniaCard = moniaElement.querySelector('.battle-hero-card');
        if (!moniaCard) return;

        const moniaRect = moniaElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        // Calculate movement - dash to 70% of the way to target (not all the way)
        const deltaX = (targetRect.left - moniaRect.left) * 0.7;
        const deltaY = (targetRect.top - moniaRect.top) * 0.7;

        moniaCard.classList.add('attacking');
        moniaCard.style.transition = `transform ${this.getSpeedAdjustedDelay(150)}ms ease-out`;
        moniaCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
        
        // Add protection glow effect during dash
        moniaCard.style.filter = 'brightness(1.3) drop-shadow(0 0 15px rgba(135, 206, 250, 0.8))';
        
        await this.delay(150);
        
        // Remove glow effect
        moniaCard.style.filter = '';
    }

    // Animate Monia dashing to protect a creature
    async animateMoniaToCreatureDash(protectingMonia, creatureTarget) {
        const moniaElement = this.getHeroElement(protectingMonia.side, protectingMonia.position);
        const creatureElement = document.querySelector(
            `.${creatureTarget.side}-slot.${creatureTarget.position}-slot .creature-icon[data-creature-index="${creatureTarget.creatureIndex}"]`
        );
        
        if (!moniaElement || !creatureElement) {
            console.error(`Could not find elements for Monia creature protection dash: ${protectingMonia.name} -> creature`);
            return;
        }
        
        const moniaCard = moniaElement.querySelector('.battle-hero-card');
        if (!moniaCard) return;
        
        const moniaRect = moniaElement.getBoundingClientRect();
        const creatureRect = creatureElement.getBoundingClientRect();
        
        // Calculate movement to creature position (70% of the way)
        const deltaX = (creatureRect.left + creatureRect.width/2 - (moniaRect.left + moniaRect.width/2)) * 0.7;
        const deltaY = (creatureRect.top + creatureRect.height/2 - (moniaRect.top + moniaRect.height/2)) * 0.7;
            
        moniaCard.classList.add('attacking');
        moniaCard.style.transition = `transform ${this.getSpeedAdjustedDelay(150)}ms ease-out`;
        moniaCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
        
        // Add protection glow effect during dash
        moniaCard.style.filter = 'brightness(1.3) drop-shadow(0 0 15px rgba(135, 206, 250, 0.8))';
        
        await this.delay(150);
        
        // Remove glow effect
        moniaCard.style.filter = '';
    }



    // ============================================
    // CREATURE ANIMATIONS
    // ============================================

    // Shake creature animation
    async shakeCreature(side, position, creatureIndex) {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;
        
        creatureElement.classList.add('creature-shaking');
        
        // Add glow effect during shake
        creatureElement.style.filter = 'brightness(1.5) drop-shadow(0 0 10px rgba(255, 255, 100, 0.8))';
        
        await this.delay(400);
        
        creatureElement.classList.remove('creature-shaking');
        creatureElement.style.filter = '';
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Create collision effect in battlefield center
    createCollisionEffect() {
        const battleCenter = document.querySelector('.battle-effects-area');
        if (!battleCenter) return;

        const effect = document.createElement('div');
        effect.className = 'collision-effect';
        effect.innerHTML = '💥';
        effect.style.cssText = `
            position: absolute;
            font-size: 48px;
            animation: collisionPulse ${this.getSpeedAdjustedDelay(200)}ms ease-out;
            z-index: 100;
        `;
        
        battleCenter.appendChild(effect);
        setTimeout(() => effect.remove(), this.getSpeedAdjustedDelay(200));
    }

    // Create impact effect on target
    createImpactEffect(targetElement) {
        const effect = document.createElement('div');
        effect.className = 'impact-effect';
        effect.innerHTML = '💥';
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 36px;
            animation: impactPulse ${this.getSpeedAdjustedDelay(150)}ms ease-out;
            z-index: 100;
        `;
        
        targetElement.appendChild(effect);
        setTimeout(() => effect.remove(), this.getSpeedAdjustedDelay(150));
    }

    // Create floating damage number with dynamic styling
    createDamageNumber(side, position, damage, maxHp, source = 'attack') {
        const heroElement = this.getHeroElement(side, position);
        if (!heroElement) return;

        const styling = this.calculateDamageNumberStyling(damage, maxHp, source, true);
        const damagePercent = (damage / maxHp) * 100;
        
        const damageNumber = document.createElement('div');
        damageNumber.className = `damage-number damage-${source}`;
        damageNumber.textContent = `-${damage}`;
        
        // Add high damage class for special effects
        this.addHighDamageClass(damageNumber, damagePercent);
        
        damageNumber.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: ${styling.fontSize}px;
            font-weight: ${styling.fontWeight};
            color: ${styling.color};
            text-shadow: ${styling.textShadow};
            z-index: 200;
            pointer-events: none;
            animation: ${styling.animation} ${this.getSpeedAdjustedDelay(styling.duration)}ms ease-out forwards;
            filter: ${styling.filter};
        `;
        
        heroElement.appendChild(damageNumber);
        setTimeout(() => damageNumber.remove(), this.getSpeedAdjustedDelay(styling.duration));
    }

    // Create damage number on creature with dynamic styling
    createDamageNumberOnCreature(side, position, creatureIndex, damage, maxHp, source = 'attack') {
        const creatureElement = document.querySelector(
            `.${side}-slot.${position}-slot .creature-icon[data-creature-index="${creatureIndex}"]`
        );
        
        if (!creatureElement) return;
        
        const styling = this.calculateDamageNumberStyling(damage, maxHp, source, false);
        const damagePercent = (damage / maxHp) * 100;
        
        const damageNumber = document.createElement('div');
        damageNumber.className = `damage-number damage-${source}`;
        damageNumber.textContent = `-${damage}`;
        
        // Add high damage class for special effects
        this.addHighDamageClass(damageNumber, damagePercent);
        
        damageNumber.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: ${styling.fontSize}px;
            font-weight: ${styling.fontWeight};
            color: ${styling.color};
            text-shadow: ${styling.textShadow};
            z-index: 200;
            pointer-events: none;
            animation: ${styling.animation} ${this.getSpeedAdjustedDelay(styling.duration)}ms ease-out forwards;
            filter: ${styling.filter};
        `;
        
        creatureElement.appendChild(damageNumber);
        setTimeout(() => damageNumber.remove(), this.getSpeedAdjustedDelay(styling.duration));
    }

    // Calculate dynamic damage number styling based on damage, max HP, and source
    calculateDamageNumberStyling(damage, maxHp, source, isHero) {
        // Calculate damage percentage (1% to 100%+)
        const damagePercent = Math.min((damage / maxHp) * 100, 100);
        
        // Base font sizes (heroes get larger numbers than creatures)
        const baseFontSize = isHero ? 30 : 20;
        const maxFontSize = isHero ? 60 : 40;
        
        // Scale font size based on damage percentage (logarithmic for better visual progression)
        const sizeMultiplier = 1 + Math.log(1 + damagePercent * 0.1) * 0.5;
        const fontSize = Math.min(baseFontSize * sizeMultiplier, maxFontSize);
        
        // Determine font weight based on damage severity
        const fontWeight = damagePercent > 50 ? 'bold' : damagePercent > 25 ? '700' : '600';
        
        // Get source-specific styling
        const sourceStyle = this.getDamageSourceStyling(source, damagePercent);
        
        // Choose animation based on damage severity
        let animation = 'floatUp';
        let duration = 500;
        
        if (damagePercent > 75) {
            animation = 'criticalDamageFloat';
            duration = 700;
        } else if (damagePercent > 50) {
            animation = 'heavyDamageFloat';
            duration = 600;
        } else if (damagePercent < 10) {
            animation = 'lightDamageFloat';
            duration = 400;
        }
        
        return {
            fontSize: Math.round(fontSize),
            fontWeight,
            color: sourceStyle.color,
            textShadow: sourceStyle.textShadow,
            filter: sourceStyle.filter,
            animation,
            duration
        };
    }

    // Get styling specific to damage source
    getDamageSourceStyling(source, damagePercent) {
        const styles = {
            attack: {
                color: '#ff3333',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(255, 51, 51, 0.5)',
                filter: damagePercent > 50 ? 'drop-shadow(0 0 6px rgba(255, 51, 51, 0.8))' : 'none'
            },
            burn: {
                color: '#ff8533',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(255, 133, 51, 0.6)',
                filter: `drop-shadow(0 0 6px rgba(255, 133, 51, 0.7)) brightness(${Math.min(1.2, 1 + damagePercent * 0.003)})`
            },
            poison: {
                color: '#33ff66',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(51, 255, 102, 0.6)',
                filter: `drop-shadow(0 0 6px rgba(51, 255, 102, 0.7)) hue-rotate(${Math.min(30, damagePercent * 0.3)}deg)`
            },
            destruction: {
                color: damagePercent > 50 ? '#660000' : '#990000',
                textShadow: '2px 2px 6px rgba(0, 0, 0, 0.9), 0 0 10px rgba(102, 0, 0, 0.8)',
                filter: `drop-shadow(0 0 8px rgba(102, 0, 0, 0.9)) contrast(${Math.min(1.5, 1 + damagePercent * 0.005)})`
            },
            // Add more sources as needed
            healing: {
                color: '#33ffaa',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(51, 255, 170, 0.6)',
                filter: 'drop-shadow(0 0 6px rgba(51, 255, 170, 0.7)) brightness(1.1)'
            }
        };
        
        return styles[source] || styles.attack; // Default to attack styling
    }

    // Create healing number with positive styling
    createHealingNumber(side, position, healing, maxHp) {
        const heroElement = this.getHeroElement(side, position);
        if (!heroElement) return;

        const styling = this.calculateDamageNumberStyling(healing, maxHp, 'healing', true);
        
        const healingNumber = document.createElement('div');
        healingNumber.className = 'damage-number damage-healing';
        healingNumber.textContent = `+${healing}`;
        healingNumber.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: ${styling.fontSize}px;
            font-weight: ${styling.fontWeight};
            color: ${styling.color};
            text-shadow: ${styling.textShadow};
            z-index: 200;
            pointer-events: none;
            animation: healingFloat ${this.getSpeedAdjustedDelay(600)}ms ease-out forwards;
            filter: ${styling.filter};
        `;
        
        heroElement.appendChild(healingNumber);
        setTimeout(() => healingNumber.remove(), this.getSpeedAdjustedDelay(600));
    }

    // Add special class for high damage attacks
    addHighDamageClass(element, damagePercent) {
        if (damagePercent > 50 && element.classList.contains('damage-attack')) {
            element.classList.add('high-damage');
        }
    }

    // Clear all visual effects
    clearVisualEffects() {
        const battleCenter = document.querySelector('.battle-effects-area');
        if (battleCenter) {
            const effects = battleCenter.querySelectorAll('.collision-effect, .impact-effect');
            effects.forEach(effect => effect.remove());
        }
        
        const damageNumbers = document.querySelectorAll('.damage-number');
        damageNumbers.forEach(number => number.remove());
        
        const resultOverlays = document.querySelectorAll('.battle-result-overlay');
        resultOverlays.forEach(overlay => overlay.remove());
    }

    // ============================================
    // STYLES AND CLEANUP
    // ============================================

    // Ensure animation styles are loaded
    ensureAnimationStyles() {
        if (document.getElementById('battleAnimationStyles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'battleAnimationStyles';
        style.textContent = `
            @keyframes collisionPulse {
                0% { transform: scale(0) rotate(0deg); opacity: 1; }
                100% { transform: scale(2) rotate(180deg); opacity: 0; }
            }
            
            @keyframes impactPulse {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
            
            /* ============================================
            ENHANCED DAMAGE NUMBER ANIMATIONS
            ============================================ */
            
            /* Standard damage float animation */
            @keyframes floatUp {
                0% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 1;
                }
                25% {
                    transform: translate(-50%, -60%) scale(1);
                }
                100% {
                    transform: translate(-50%, -120%) scale(0.9);
                    opacity: 0;
                }
            }
            
            /* Light damage animation (< 10% HP) */
            @keyframes lightDamageFloat {
                0% {
                    transform: translate(-50%, -50%) scale(0.6);
                    opacity: 0.9;
                }
                50% {
                    transform: translate(-50%, -70%) scale(0.8);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -100%) scale(0.7);
                    opacity: 0;
                }
            }
            
            /* Heavy damage animation (50-75% HP) */
            @keyframes heavyDamageFloat {
                0% {
                    transform: translate(-50%, -50%) scale(0.9) rotate(-2deg);
                    opacity: 1;
                }
                20% {
                    transform: translate(-50%, -65%) scale(1.1) rotate(1deg);
                }
                60% {
                    transform: translate(-50%, -90%) scale(1.05) rotate(-0.5deg);
                }
                100% {
                    transform: translate(-50%, -130%) scale(0.95) rotate(0deg);
                    opacity: 0;
                }
            }
            
            /* Critical damage animation (> 75% HP) */
            @keyframes criticalDamageFloat {
                0% {
                    transform: translate(-50%, -50%) scale(1) rotate(-3deg);
                    opacity: 1;
                }
                15% {
                    transform: translate(-50%, -55%) scale(1.3) rotate(2deg);
                }
                30% {
                    transform: translate(-50%, -70%) scale(1.2) rotate(-1deg);
                }
                60% {
                    transform: translate(-50%, -100%) scale(1.15) rotate(0.5deg);
                }
                100% {
                    transform: translate(-50%, -150%) scale(1) rotate(0deg);
                    opacity: 0;
                }
            }
            
            /* ============================================
            DAMAGE SOURCE SPECIFIC EFFECTS
            ============================================ */
            
            /* Healing animation - upward floating with sparkle effect */
            @keyframes healingFloat {
                0% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 1;
                }
                30% {
                    transform: translate(-50%, -65%) scale(1.1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -110%) scale(1);
                    opacity: 0;
                }
            }
            
            .damage-healing::after {
                content: '✨';
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 0.6em;
                animation: sparkle 0.6s ease-out;
                z-index: -1;
            }
            
            @keyframes sparkle {
                0%, 100% { opacity: 0; transform: translateX(-50%) scale(0.5); }
                50% { opacity: 1; transform: translateX(-50%) scale(1); }
            }
            
            /* Burn damage - flickering effect */
            .damage-burn {
                animation-timing-function: ease-in-out;
            }
            
            .damage-burn::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: radial-gradient(circle, rgba(255, 133, 51, 0.3) 0%, transparent 70%);
                border-radius: 50%;
                animation: burnGlow 0.3s ease-in-out infinite alternate;
                z-index: -1;
            }
            
            @keyframes burnGlow {
                0% { opacity: 0.5; transform: scale(0.9); }
                100% { opacity: 0.8; transform: scale(1.1); }
            }
            
            /* Poison damage - pulsing effect */
            .damage-poison {
                animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            
            .damage-poison::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 120%;
                height: 120%;
                background: radial-gradient(circle, rgba(51, 255, 102, 0.2) 0%, transparent 60%);
                transform: translate(-50%, -50%);
                border-radius: 50%;
                animation: poisonPulse 0.4s ease-out infinite;
                z-index: -1;
            }
            
            @keyframes poisonPulse {
                0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.8); }
                50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.2); }
            }
            
            /* Destruction magic - dark energy effect */
            .damage-destruction {
                animation-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }
            
            .damage-destruction::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 140%;
                height: 140%;
                background: radial-gradient(circle, rgba(102, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.3) 40%, transparent 70%);
                transform: translate(-50%, -50%);
                border-radius: 50%;
                animation: destructionDarkness 0.5s ease-out;
                z-index: -1;
            }
            
            @keyframes destructionDarkness {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg); 
                }
                50% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1) rotate(180deg); 
                }
                100% { 
                    opacity: 0.2; 
                    transform: translate(-50%, -50%) scale(1.3) rotate(360deg); 
                }
            }
            
            /* Attack damage - enhanced for high damage */
            .damage-attack.high-damage::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 130%;
                height: 130%;
                background: radial-gradient(circle, rgba(255, 51, 51, 0.3) 0%, transparent 60%);
                transform: translate(-50%, -50%);
                border-radius: 50%;
                animation: attackShockwave 0.4s ease-out;
                z-index: -1;
            }
            
            @keyframes attackShockwave {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
                30% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
            }
            
            /* ============================================
            CREATURE ANIMATIONS
            ============================================ */
            
            @keyframes creatureShake {
                0%, 100% { transform: translateX(0); }
                10% { transform: translateX(-2px) rotate(-5deg); }
                20% { transform: translateX(2px) rotate(5deg); }
                30% { transform: translateX(-2px) rotate(-5deg); }
                40% { transform: translateX(2px) rotate(5deg); }
                50% { transform: translateX(-2px) rotate(-5deg); }
                60% { transform: translateX(2px) rotate(5deg); }
                70% { transform: translateX(-1px) rotate(-2deg); }
                80% { transform: translateX(1px) rotate(2deg); }
                90% { transform: translateX(-1px) rotate(-2deg); }
            }
            
            .creature-shaking {
                animation: creatureShake 0.4s ease-in-out;
                z-index: 100;
            }
            
            /* ============================================
            HERO ANIMATIONS
            ============================================ */
            
            .battle-hero-card.attacking {
                z-index: 50 !important;
            }
            
            .battle-hero-card.defeated {
                animation: heroDefeat 0.5s ease-out forwards;
            }
            
            @keyframes heroDefeat {
                0% { opacity: 1; transform: scale(1); }
                100% { opacity: 0.3; transform: scale(0.9); filter: grayscale(100%); }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Cleanup method
    cleanup() {
        this.clearVisualEffects();
        
        // Remove animation styles if they exist
        const animationStyles = document.getElementById('battleAnimationStyles');
        if (animationStyles) {
            animationStyles.remove();
        }
    }
}