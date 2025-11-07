// ./Spells/ritualChamber.js - Ritual Chamber Area Effect with Dark Power Enhancement
// Provides eerie red glow and buffs ALL heroes when ANY creature is defeated

export class RitualChamberEffect {
    constructor() {
        this.isActive = false;
        this.chamberIntensity = 'normal'; // 'normal' or 'double'
        this.chamberOverlay = null;
        this.animationIntervals = [];
        this.activeChamberCount = 0;
        
        // Track total attack bonuses granted this battle
        this.totalAttackBonusesGranted = 0;
        this.creatureDeathsTriggered = 0;
    }

    // Check if Ritual Chamber should be active at battle start
    checkRitualChamberActive(battleManager) {
        if (!battleManager) return { active: false, intensity: 'normal', count: 0 };

        const playerHasChamber = battleManager.playerAreaCard && 
                                 battleManager.playerAreaCard.name === 'RitualChamber';
        const opponentHasChamber = battleManager.opponentAreaCard && 
                                   battleManager.opponentAreaCard.name === 'RitualChamber';

        let count = 0;
        if (playerHasChamber) count++;
        if (opponentHasChamber) count++;

        if (count === 2) {
            return { active: true, intensity: 'double', count: 2 };
        } else if (count === 1) {
            return { active: true, intensity: 'normal', count: 1 };
        }

        return { active: false, intensity: 'normal', count: 0 };
    }

    // Apply Ritual Chamber effects at battle start
    async applyRitualChamberEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) return;

        const chamberCheck = this.checkRitualChamberActive(battleManager);
        
        if (!chamberCheck.active) return;

        this.isActive = true;
        this.chamberIntensity = chamberCheck.intensity;
        this.activeChamberCount = chamberCheck.count;

        // Create red chamber animation immediately
        this.createRitualChamberAnimation(battleManager);

        // Log messages
        let chamberMessage = '';
        if (this.chamberIntensity === 'double') {
            chamberMessage = `Twin Ritual Chambers pulse with dark energy! All heroes gain +10 ATK per creature death`;
        } else {
            chamberMessage = `The Ritual Chamber glows with ominous power! All heroes gain +10 ATK per creature death`;
        }
        
        battleManager.addCombatLog(`🔴 ${chamberMessage}`, 'info');

        // Send sync data to guest immediately
        this.sendRitualChamberStartUpdate(battleManager);
    }

    // Send Ritual Chamber start update to guest
    sendRitualChamberStartUpdate(battleManager) {
        battleManager.sendBattleUpdate('ritual_chamber_start', {
            intensity: this.chamberIntensity,
            activeChamberCount: this.activeChamberCount,
            reason: 'battle_start',
            timestamp: Date.now()
        });
    }

    // Handle guest Ritual Chamber start
    handleGuestRitualChamberStart(data) {
        if (!data) return;

        this.isActive = true;
        this.chamberIntensity = data.intensity;
        this.activeChamberCount = data.activeChamberCount;
        
        // Create animation for guest
        this.createRitualChamberAnimation();

        // Log message for guest
        if (data.reason === 'battle_start') {
            let chamberMessage = '';
            if (this.chamberIntensity === 'double') {
                chamberMessage = `Twin Ritual Chambers pulse with dark energy! All heroes gain +10 ATK per creature death`;
            } else {
                chamberMessage = `The Ritual Chamber glows with ominous power! All heroes gain +10 ATK per creature death`;
            }
            
            if (window.battleManager) {
                window.battleManager.addCombatLog(`🔴 ${chamberMessage}`, 'info');
            }
        }
    }

    // Handle creature death and buff all heroes
    async handleCreatureDeath(battleManager, creature) {
        
        if (!this.isActive || !battleManager) {
            return;
        }

        // Only host triggers this
        if (!battleManager.isAuthoritative) {
            return;
        }

        
        // Track this death
        this.creatureDeathsTriggered++;

        // Calculate attack bonus based on number of active chambers
        // 1 chamber = +10 ATK, 2 chambers = +20 ATK
        const attackBonusPerChamber = 10;
        const attackBonus = attackBonusPerChamber * this.activeChamberCount;
        this.totalAttackBonusesGranted += attackBonus;

        // Get all heroes from both sides
        // USE THE SAME PATTERN AS GRAVEYARDOFLIMITEDPOWER
        const allHeroesArray = [];
        
        // Collect player heroes using position strings
        if (battleManager.playerHeroes) {
            ['left', 'center', 'right'].forEach(position => {
                const hero = battleManager.playerHeroes[position];
                if (hero && hero.alive) {
                    allHeroesArray.push(hero);
                }
            });
        }
        
        // Collect opponent heroes using position strings
        if (battleManager.opponentHeroes) {
            ['left', 'center', 'right'].forEach(position => {
                const hero = battleManager.opponentHeroes[position];
                if (hero && hero.alive) {
                    allHeroesArray.push(hero);
                }
            });
        }

        // DE-DUPLICATE: Remove any duplicate hero object references
        const allHeroes = [...new Set(allHeroesArray)];

        // Buff all heroes (now guaranteed unique)
        for (const hero of allHeroes) {
            // Add to battleAttackBonus (temporary battle bonus)
            hero.battleAttackBonus = (hero.battleAttackBonus || 0) + attackBonus;
        }

        // Update hero visual displays
        this.updateAllHeroVisuals(battleManager);

        // Show dark particles around all heroes
        this.showDarkMagicParticles(battleManager, allHeroes);

        // Log the buff
        battleManager.addCombatLog(
            `⚫ Ritual Chamber: All heroes gain +${attackBonus} ATK from ${creature.name}'s defeat!`,
            'info'
        );

        // Send network update to guest
        this.sendCreatureDeathBuff(battleManager, attackBonus, creature.name);
        
    }

    // Send creature death buff to guest
    sendCreatureDeathBuff(battleManager, attackBonus, creatureName) {
        battleManager.sendBattleUpdate('ritual_chamber_buff', {
            attackBonus: attackBonus,
            creatureName: creatureName,
            totalBonusesGranted: this.totalAttackBonusesGranted,
            deathCount: this.creatureDeathsTriggered,
            timestamp: Date.now()
        });
    }

    // Handle guest receiving creature death buff
    handleGuestCreatureDeathBuff(data, battleManager) {
        if (!data || !battleManager) return;

        const attackBonus = data.attackBonus;
        this.totalAttackBonusesGranted = data.totalBonusesGranted;
        this.creatureDeathsTriggered = data.deathCount;

        // Get all heroes from both sides
        // USE THE SAME PATTERN AS GRAVEYARDOFLIMITEDPOWER
        const allHeroesArray = [];
        
        // Collect player heroes using position strings
        if (battleManager.playerHeroes) {
            ['left', 'center', 'right'].forEach(position => {
                const hero = battleManager.playerHeroes[position];
                if (hero && hero.alive) {
                    allHeroesArray.push(hero);
                }
            });
        }
        
        // Collect opponent heroes using position strings
        if (battleManager.opponentHeroes) {
            ['left', 'center', 'right'].forEach(position => {
                const hero = battleManager.opponentHeroes[position];
                if (hero && hero.alive) {
                    allHeroesArray.push(hero);
                }
            });
        }

        // DE-DUPLICATE: Remove any duplicate hero object references
        const allHeroes = [...new Set(allHeroesArray)];

        // Buff all heroes (now guaranteed unique)
        for (const hero of allHeroes) {
            // Add to battleAttackBonus (temporary battle bonus)
            hero.battleAttackBonus = (hero.battleAttackBonus || 0) + attackBonus;
        }

        // Update hero visual displays
        this.updateAllHeroVisuals(battleManager);

        // Show dark particles around all heroes
        this.showDarkMagicParticles(battleManager, allHeroes);

        // Log the buff
        battleManager.addCombatLog(
            `⚫ Ritual Chamber: All heroes gain +${attackBonus} ATK from ${data.creatureName}'s defeat!`,
            'info'
        );
    }

    // Update all hero visual displays
    updateAllHeroVisuals(battleManager) {
        ['left', 'center', 'right'].forEach(position => {
            // Update player heroes
            if (battleManager.playerHeroes[position]) {
                const hero = battleManager.playerHeroes[position];
                battleManager.updateHeroAttackDisplay('player', position, hero);
            }
            
            // Update opponent heroes
            if (battleManager.opponentHeroes[position]) {
                const hero = battleManager.opponentHeroes[position];
                battleManager.updateHeroAttackDisplay('opponent', position, hero);
            }
        });
    }
    // Show dark magic particles around buffed heroes
    showDarkMagicParticles(battleManager, heroes) {
        if (!heroes || heroes.length === 0) return;

        // Create particles for each hero
        heroes.forEach((hero, index) => {
            setTimeout(() => {
                const heroElement = battleManager.getHeroElement(hero.side, hero.position);
                if (heroElement) {
                    this.createDarkMagicEffect(heroElement, battleManager);
                }
            }, index * 100);
        });
    }

    // Create dark magic effect on a single hero
    createDarkMagicEffect(heroElement, battleManager) {
        if (!heroElement) return;

        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'ritual-chamber-dark-particle';
            
            const angle = (360 / particleCount) * i;
            const distance = 30 + Math.random() * 20;
            
            particle.innerHTML = '⚫';
            particle.style.cssText = `
                position: absolute;
                font-size: 16px;
                opacity: 0;
                z-index: 1000;
                pointer-events: none;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                animation: ritualChamberParticle ${battleManager.getSpeedAdjustedDelay(800)}ms ease-out forwards;
                --angle: ${angle}deg;
                --distance: ${distance}px;
                text-shadow: 0 0 10px rgba(139, 0, 0, 0.8);
            `;
            
            heroElement.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, battleManager.getSpeedAdjustedDelay(800));
        }
        
        // Add particle animation CSS if not already present
        this.ensureDarkMagicCSS();
    }

    // Ensure dark magic CSS is injected
    ensureDarkMagicCSS() {
        if (document.getElementById('ritualChamberDarkMagicStyles')) return;

        const style = document.createElement('style');
        style.id = 'ritualChamberDarkMagicStyles';
        style.textContent = `
            @keyframes ritualChamberParticle {
                0% {
                    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0);
                    opacity: 0;
                }
                20% {
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(-1 * var(--distance)));
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Create ritual chamber animation overlay
    createRitualChamberAnimation(battleManager) {
        // Remove any existing overlay
        this.removeRitualChamberAnimation();

        // Inject CSS
        this.injectRitualChamberCSS();

        // Create overlay container
        this.chamberOverlay = document.createElement('div');
        this.chamberOverlay.className = 'ritual-chamber-overlay';
        this.chamberOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            overflow: hidden;
        `;

        // Add to body
        document.body.appendChild(this.chamberOverlay);

        // Create gradient effect
        this.createChamberGradient();

        // Start dark particle effects
        this.startDarkParticles();

        // Start red pulsing effect
        this.startRedPulse();
    }

    // Create the red gradient overlay
    createChamberGradient() {
        if (!this.chamberOverlay) return;

        const gradient = document.createElement('div');
        gradient.className = 'ritual-chamber-gradient';
        
        const intensity = this.chamberIntensity === 'double' ? 0.35 : 0.22;
        
        gradient.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                180deg, 
                rgba(139, 0, 0, ${intensity}) 0%, 
                rgba(178, 34, 34, ${intensity * 0.9}) 15%, 
                rgba(220, 20, 60, ${intensity * 0.7}) 35%, 
                rgba(255, 69, 0, ${intensity * 0.4}) 60%, 
                transparent 100%
            );
            animation: ritualChamberPulse 6s ease-in-out infinite;
        `;

        this.chamberOverlay.appendChild(gradient);
    }

    // Start dark floating particles
    startDarkParticles() {
        const spawnFrequency = this.chamberIntensity === 'double' ? 600 : 900;
        
        const particleInterval = setInterval(() => {
            if (!this.isActive || !this.chamberOverlay) {
                clearInterval(particleInterval);
                return;
            }
            
            this.createFloatingDarkParticle();
        }, Math.random() * spawnFrequency + 300);

        this.animationIntervals.push(particleInterval);
    }

    // Create a single floating dark particle
    createFloatingDarkParticle() {
        if (!this.chamberOverlay) return;

        const particle = document.createElement('div');
        particle.className = 'ritual-chamber-particle';
        
        const size = Math.random() * 5 + 3;
        const duration = Math.random() * 10 + 7;
        const horizontalDrift = Math.random() * 150 - 75;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle, rgba(139, 0, 0, 0.8) 0%, rgba(178, 34, 34, 0.5) 50%, transparent 100%);
            border-radius: 50%;
            bottom: -20px;
            left: ${Math.random() * 100}%;
            animation: floatUp ${duration}s linear;
            --horizontal-drift: ${horizontalDrift}px;
            box-shadow: 0 0 ${size * 2}px rgba(139, 0, 0, 0.5);
        `;

        this.chamberOverlay.appendChild(particle);

        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, duration * 1000);
    }

    // Start red pulsing effect
    startRedPulse() {
        const pulseInterval = setInterval(() => {
            if (!this.isActive || !this.chamberOverlay) {
                clearInterval(pulseInterval);
                return;
            }
            
            // Occasionally spawn extra particles during pulse peaks
            if (Math.random() < 0.4) {
                setTimeout(() => this.createFloatingDarkParticle(), Math.random() * 800);
            }
        }, 3000);

        this.animationIntervals.push(pulseInterval);
    }

    // Remove ritual chamber animation
    removeRitualChamberAnimation() {
        if (this.chamberOverlay) {
            if (this.chamberOverlay.parentNode) {
                this.chamberOverlay.parentNode.removeChild(this.chamberOverlay);
            }
            this.chamberOverlay = null;
        }

        // Clear animation intervals
        this.animationIntervals.forEach(interval => clearInterval(interval));
        this.animationIntervals = [];
    }

    // Inject ritual chamber-specific CSS
    injectRitualChamberCSS() {
        if (document.getElementById('ritualChamberStyles')) return;

        const style = document.createElement('style');
        style.id = 'ritualChamberStyles';
        style.textContent = `
            @keyframes ritualChamberPulse {
                0%, 100% { 
                    opacity: 1;
                    transform: scale(1);
                }
                50% { 
                    opacity: 0.75;
                    transform: scale(1.03);
                }
            }

            @keyframes floatUp {
                0% { 
                    transform: translateY(0) translateX(0);
                    opacity: 0;
                }
                10% { 
                    opacity: 1;
                }
                90% { 
                    opacity: 1;
                }
                100% { 
                    transform: translateY(calc(-100vh - 50px)) translateX(var(--horizontal-drift));
                    opacity: 0;
                }
            }

            .ritual-chamber-overlay .ritual-chamber-particle {
                will-change: transform, opacity;
            }

            .ritual-chamber-overlay .ritual-chamber-gradient {
                will-change: transform, opacity;
            }

            .ritual-chamber-dark-particle {
                will-change: transform, opacity;
            }
        `;

        document.head.appendChild(style);
    }

    // Restart ritual chamber animation (for reconnection)
    restartRitualChamberAnimation() {
        if (!this.isActive) return;
        
        // Remove existing animation
        this.removeRitualChamberAnimation();
        
        // Recreate animation
        setTimeout(() => {
            this.createRitualChamberAnimation();
        }, 100);
    }

    // Cleanup
    cleanup(battleManager = null) {
        this.isActive = false;
        this.activeChamberCount = 0;
        this.totalAttackBonusesGranted = 0;
        this.creatureDeathsTriggered = 0;
        this.removeRitualChamberAnimation();
        
        // Send cleanup message to guest if this is the host
        if (battleManager && battleManager.isAuthoritative && battleManager.sendBattleUpdate) {
            this.sendRitualChamberCleanup(battleManager);
        }
    }

    // Send Ritual Chamber cleanup update to guest
    sendRitualChamberCleanup(battleManager) {
        battleManager.sendBattleUpdate('ritual_chamber_cleanup', {
            timestamp: Date.now()
        });
    }

    // Handle guest Ritual Chamber cleanup
    handleGuestRitualChamberCleanup() {
        this.isActive = false;
        this.activeChamberCount = 0;
        this.totalAttackBonusesGranted = 0;
        this.creatureDeathsTriggered = 0;
        this.removeRitualChamberAnimation();
    }

    // Export state for checkpoint system
    exportState() {
        return {
            isActive: this.isActive,
            chamberIntensity: this.chamberIntensity,
            activeChamberCount: this.activeChamberCount,
            totalAttackBonusesGranted: this.totalAttackBonusesGranted,
            creatureDeathsTriggered: this.creatureDeathsTriggered
        };
    }

    // Import state from checkpoint system
    importState(state) {
        if (!state) return;

        this.isActive = state.isActive || false;
        this.chamberIntensity = state.chamberIntensity || 'normal';
        this.activeChamberCount = state.activeChamberCount || 0;
        this.totalAttackBonusesGranted = state.totalAttackBonusesGranted || 0;
        this.creatureDeathsTriggered = state.creatureDeathsTriggered || 0;

        // Recreate visual effects if the chamber was active
        if (this.isActive) {
            this.createRitualChamberAnimation();
        }
    }
}

// Functions for managing RitualChamber externally

// Initialize a RitualChamber area
export function initializeRitualChamberArea(areaCard) {
    if (areaCard && areaCard.name === 'RitualChamber') {
        // RitualChamber doesn't use counters
        // Its effect is based on presence and creature deaths
    }
    return areaCard;
}

// Apply Ritual Chamber effects at battle start
export async function applyRitualChamberBattleEffects(battleManager) {
    if (!battleManager.ritualChamberEffect) {
        battleManager.ritualChamberEffect = new RitualChamberEffect();
    }
    
    await battleManager.ritualChamberEffect.applyRitualChamberEffects(battleManager);
}

// Handle guest Ritual Chamber start
export function handleGuestRitualChamberStart(data, battleManager) {
    if (!battleManager.ritualChamberEffect) {
        battleManager.ritualChamberEffect = new RitualChamberEffect();
    }
    
    battleManager.ritualChamberEffect.handleGuestRitualChamberStart(data);
}

// Handle guest creature death buff
export function handleGuestRitualChamberBuff(data, battleManager) {
    if (!battleManager.ritualChamberEffect) {
        battleManager.ritualChamberEffect = new RitualChamberEffect();
    }
    
    battleManager.ritualChamberEffect.handleGuestCreatureDeathBuff(data, battleManager);
}

// Handle guest Ritual Chamber cleanup
export function handleGuestRitualChamberCleanup(data, battleManager) {
    if (battleManager.ritualChamberEffect) {
        battleManager.ritualChamberEffect.handleGuestRitualChamberCleanup();
    }
}

// Trigger on creature death (called from battleCombatManager)
export async function triggerRitualChamberOnCreatureDeath(battleManager, creature) {
    
    if (!battleManager.ritualChamberEffect || !battleManager.ritualChamberEffect.isActive) {
        return;
    }
    
    await battleManager.ritualChamberEffect.handleCreatureDeath(battleManager, creature);
}

export default RitualChamberEffect;