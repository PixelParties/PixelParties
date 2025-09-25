// ./Spells/pinkSky.js - Pink Sky Area Effect with CutePhoenix Revival Enhancement
// Provides visual effects and enhances CutePhoenix revival chances when area is active

export class PinkSkyEffect {
    constructor() {
        this.isActive = false;
        this.skyIntensity = 'normal'; // 'normal' or 'double'
        this.skyOverlay = null;
        this.animationIntervals = [];
        // Track how many PinkSky areas are active for revival calculation
        this.activePinkSkyCount = 0;
    }

    // Check if Pink Sky should be active at battle start
    checkPinkSkyActive(battleManager) {
        if (!battleManager) return { active: false, intensity: 'normal', count: 0 };

        const playerHasPinkSky = battleManager.playerAreaCard && 
                                battleManager.playerAreaCard.name === 'PinkSky';
        const opponentHasPinkSky = battleManager.opponentAreaCard && 
                                  battleManager.opponentAreaCard.name === 'PinkSky';

        let count = 0;
        if (playerHasPinkSky) count++;
        if (opponentHasPinkSky) count++;

        if (count === 2) {
            return { active: true, intensity: 'double', count: 2 };
        } else if (count === 1) {
            return { active: true, intensity: 'normal', count: 1 };
        }

        return { active: false, intensity: 'normal', count: 0 };
    }

    // Apply Pink Sky effects at battle start
    async applyPinkSkyEffects(battleManager) {
        if (!battleManager || !battleManager.isAuthoritative) return;

        const skyCheck = this.checkPinkSkyActive(battleManager);
        
        if (!skyCheck.active) return;

        this.isActive = true;
        this.skyIntensity = skyCheck.intensity;
        this.activePinkSkyCount = skyCheck.count;

        // Create pink sky animation immediately
        this.createPinkSkyAnimation(battleManager);

        // Log messages
        let skyMessage = '';
        if (this.skyIntensity === 'double') {
            skyMessage = `Twin Pink Skies create a mystical aurora! CutePhoenix revival chance: 100%`;
        } else {
            skyMessage = `The sky turns a magical pink hue! CutePhoenix revival chance: 50%`;
        }
        
        battleManager.addCombatLog(`🌸 ${skyMessage}`, 'info');

        // Send sync data to guest immediately
        this.sendPinkSkyStartUpdate(battleManager);
    }

    // Send Pink Sky start update to guest
    sendPinkSkyStartUpdate(battleManager) {
        battleManager.sendBattleUpdate('pink_sky_start', {
            intensity: this.skyIntensity,
            activePinkSkyCount: this.activePinkSkyCount,
            reason: 'battle_start',
            timestamp: Date.now()
        });
    }

    // Handle guest Pink Sky start
    handleGuestPinkSkyStart(data) {
        if (!data) return;

        this.isActive = true;
        this.skyIntensity = data.intensity;
        this.activePinkSkyCount = data.activePinkSkyCount;
        
        // Create animation for guest
        this.createPinkSkyAnimation();

        // Log message for guest
        if (data.reason === 'battle_start') {
            let skyMessage = '';
            if (this.skyIntensity === 'double') {
                skyMessage = `Twin Pink Skies create a mystical aurora! CutePhoenix revival chance: 100%`;
            } else {
                skyMessage = `The sky turns a magical pink hue! CutePhoenix revival chance: 50%`;
            }
            
            if (window.battleManager) {
                window.battleManager.addCombatLog(`🌸 ${skyMessage}`, 'info');
            }
        }
    }

    // Get CutePhoenix revival chance modifier based on active Pink Skies
    getCutePhoenixRevivalChance() {
        if (!this.isActive) return 25; // Default 25% chance

        // Each Pink Sky doubles the revival chance
        // 1 Pink Sky: 25% → 50%
        // 2 Pink Skies: 25% → 100%
        const baseChance = 25;
        const multiplier = Math.pow(2, this.activePinkSkyCount);
        const modifiedChance = Math.min(100, baseChance * multiplier);
        
        return modifiedChance;
    }

    // Export state for checkpoints/persistence
    exportState() {
        return {
            isActive: this.isActive,
            skyIntensity: this.skyIntensity,
            activePinkSkyCount: this.activePinkSkyCount
        };
    }

    // Import state from checkpoint system
    importState(state) {
        if (!state) return;
        
        const wasActive = this.isActive;
        this.isActive = state.isActive || false;
        this.skyIntensity = state.skyIntensity || 'normal';
        this.activePinkSkyCount = state.activePinkSkyCount || 0;
        
        // Only restart if animation wasn't already running or if state changed
        if (this.isActive && (!wasActive || this.needsRestart(state))) {
            setTimeout(() => {
                this.restartPinkSkyAnimation();
            }, 500);
        }
    }

    // Create persistent pink sky animation overlay
    createPinkSkyAnimation(battleManager) {
        // Remove existing sky if present
        this.removePinkSkyAnimation();

        const battleArena = document.getElementById('battleArena');
        if (!battleArena) return;

        // Create sky overlay
        this.skyOverlay = document.createElement('div');
        this.skyOverlay.className = 'pink-sky-overlay';
        this.skyOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 999;
            overflow: hidden;
        `;

        // Create pink gradient background
        this.createPinkGradient();
        
        // Start floating particles
        this.startFloatingParticles();

        // Start gentle pulsing effect
        this.startGentlePulse();

        battleArena.appendChild(this.skyOverlay);

        // Add pink sky CSS if not already present
        this.injectPinkSkyCSS();
    }

    // Create pink gradient background
    createPinkGradient() {
        if (!this.skyOverlay) return;

        const gradient = document.createElement('div');
        gradient.className = 'pink-sky-gradient';
        
        const intensity = this.skyIntensity === 'double' ? 0.4 : 0.25;
        
        gradient.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                180deg, 
                rgba(255, 182, 193, ${intensity}) 0%, 
                rgba(255, 192, 203, ${intensity * 0.8}) 20%, 
                rgba(255, 218, 185, ${intensity * 0.6}) 40%, 
                rgba(255, 240, 245, ${intensity * 0.3}) 70%, 
                transparent 100%
            );
            animation: pinkSkyPulse 8s ease-in-out infinite;
        `;

        this.skyOverlay.appendChild(gradient);
    }

    // Start floating cherry blossom particles
    startFloatingParticles() {
        const spawnFrequency = this.skyIntensity === 'double' ? 800 : 1200;
        
        const particleInterval = setInterval(() => {
            if (!this.isActive || !this.skyOverlay) {
                clearInterval(particleInterval);
                return;
            }
            
            this.createFloatingParticle();
        }, Math.random() * spawnFrequency + 400);

        this.animationIntervals.push(particleInterval);
    }

    // Create a single floating particle (cherry blossom petal)
    createFloatingParticle() {
        if (!this.skyOverlay) return;

        const particle = document.createElement('div');
        particle.className = 'pink-sky-particle';
        
        const size = Math.random() * 6 + 4;
        const duration = Math.random() * 8 + 6;
        const horizontalDrift = Math.random() * 200 - 100; // -100 to +100px drift
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(ellipse 60% 40%, rgba(255, 192, 203, 0.9) 0%, rgba(255, 182, 193, 0.7) 50%, transparent 100%);
            border-radius: 50% 20% 50% 20%;
            top: -20px;
            left: ${Math.random() * 100}%;
            transform: rotate(${Math.random() * 360}deg);
            animation: floatDown ${duration}s linear;
            --horizontal-drift: ${horizontalDrift}px;
        `;

        this.skyOverlay.appendChild(particle);

        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, duration * 1000);
    }

    // Start gentle pulsing effect
    startGentlePulse() {
        // The pulsing is handled by CSS animations, so this just tracks the interval
        const pulseInterval = setInterval(() => {
            if (!this.isActive || !this.skyOverlay) {
                clearInterval(pulseInterval);
                return;
            }
            
            // Occasionally spawn extra particles during pulse peaks
            if (Math.random() < 0.3) {
                setTimeout(() => this.createFloatingParticle(), Math.random() * 1000);
            }
        }, 4000); // Every 4 seconds (half of the 8s pulse cycle)

        this.animationIntervals.push(pulseInterval);
    }

    // Remove pink sky animation
    removePinkSkyAnimation() {
        if (this.skyOverlay) {
            if (this.skyOverlay.parentNode) {
                this.skyOverlay.parentNode.removeChild(this.skyOverlay);
            }
            this.skyOverlay = null;
        }

        // Clear animation intervals
        this.animationIntervals.forEach(interval => clearInterval(interval));
        this.animationIntervals = [];
    }

    // Inject pink sky-specific CSS
    injectPinkSkyCSS() {
        if (document.getElementById('pinkSkyStyles')) return;

        const style = document.createElement('style');
        style.id = 'pinkSkyStyles';
        style.textContent = `
            @keyframes pinkSkyPulse {
                0%, 100% { 
                    opacity: 1;
                    transform: scale(1);
                }
                50% { 
                    opacity: 0.7;
                    transform: scale(1.02);
                }
            }

            @keyframes floatDown {
                0% { 
                    transform: translateY(0) translateX(0) rotate(0deg);
                    opacity: 0;
                }
                10% { 
                    opacity: 1;
                }
                90% { 
                    opacity: 1;
                }
                100% { 
                    transform: translateY(calc(100vh + 50px)) translateX(var(--horizontal-drift)) rotate(720deg);
                    opacity: 0;
                }
            }

            .pink-sky-overlay .pink-sky-particle {
                will-change: transform, opacity;
            }

            .pink-sky-overlay .pink-sky-gradient {
                will-change: transform, opacity;
            }
        `;

        document.head.appendChild(style);
    }

    // Restart pink sky animation (for reconnection)
    restartPinkSkyAnimation() {
        if (!this.isActive) return;
        
        // Remove existing animation
        this.removePinkSkyAnimation();
        
        // Recreate animation
        setTimeout(() => {
            this.createPinkSkyAnimation();
        }, 100);
    }

    guest_handlePinkSkyStart(data) {
        if (this.isAuthoritative) {
            return;
        }

        try {
            import('./Spells/pinkSky.js').then(({ handleGuestPinkSkyStart }) => {
                handleGuestPinkSkyStart(data, this);
            }).catch(error => {
                // Error handled silently
            });
        } catch (error) {
            // Error handled silently
        }
    }

    // Cleanup
    cleanup() {
        this.isActive = false;
        this.activePinkSkyCount = 0;
        this.removePinkSkyAnimation();
    }
}

// Functions for managing PinkSky externally

// Initialize a PinkSky area
export function initializePinkSkyArea(areaCard) {
    if (areaCard && areaCard.name === 'PinkSky') {
        // PinkSky doesn't use counters like GatheringStorm
        // Its effect is based on presence, not accumulation
    }
    return areaCard;
}

// Get the current CutePhoenix revival chance based on active Pink Skies
export function getCutePhoenixRevivalChance(battleManager) {
    if (!battleManager || !battleManager.pinkSkyEffect) {
        return 25; // Default 25% if no Pink Sky effect
    }
    
    return battleManager.pinkSkyEffect.getCutePhoenixRevivalChance();
}

// Apply Pink Sky effects at battle start
export async function applyPinkSkyBattleEffects(battleManager) {
    if (!battleManager.pinkSkyEffect) {
        battleManager.pinkSkyEffect = new PinkSkyEffect();
    }
    
    await battleManager.pinkSkyEffect.applyPinkSkyEffects(battleManager);
}

// Handle guest Pink Sky start
export function handleGuestPinkSkyStart(data, battleManager) {
    if (!battleManager.pinkSkyEffect) {
        battleManager.pinkSkyEffect = new PinkSkyEffect();
    }
    
    battleManager.pinkSkyEffect.handleGuestPinkSkyStart(data);
}

export default PinkSkyEffect;