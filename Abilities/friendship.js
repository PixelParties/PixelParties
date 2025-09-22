// ./Abilities/friendship.js - Friendship Ability Implementation

export class FriendshipManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        
        console.log('🌈 Friendship ability manager initialized');
    }

    // ============================================
    // FRIENDSHIP EFFECTS APPLICATION
    // ============================================

    // Apply Friendship effects at battle start (before potions)
    async applyFriendshipEffectsAtBattleStart() {
        const bm = this.battleManager;
        
        if (!bm.isAuthoritative) {
            return; // Only host applies friendship effects
        }

        console.log('🌈 Applying Friendship effects at battle start...');

        // Apply for both sides
        await this.applyFriendshipForSide('player', bm.playerHeroes);
        await this.applyFriendshipForSide('opponent', bm.opponentHeroes);
    }

    async applyFriendshipForSide(side, heroes) {
        const bm = this.battleManager;
        
        // First pass: identify heroes with Friendship and calculate total stacks
        const friendshipHeroes = [];
        let totalFriendshipStacks = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            if (hero && hero.hasAbility && hero.hasAbility('Friendship')) {
                const stacks = hero.getAbilityStackCount('Friendship');
                if (stacks > 0) {
                    friendshipHeroes.push({
                        hero: hero,
                        position: position,
                        stacks: stacks
                    });
                    totalFriendshipStacks += stacks;
                }
            }
        });

        if (friendshipHeroes.length === 0) {
            return; // No friendship on this side
        }

        // Get the appropriate player's lunaBuffs counter
        const counters = side === 'player' ? bm.playerCounters : bm.opponentCounters;
        const lunaBuffs = counters ? (counters.lunaBuffs || 0) : 0;
        
        // Calculate Luna buff multiplier (2% per lunaBuffs counter)
        const lunaMultiplier = 1 + (lunaBuffs * 0.02);
        
        // Calculate base bonuses and apply Luna multiplier
        const baseHpBonus = totalFriendshipStacks * 50;
        const baseAttackBonus = totalFriendshipStacks * 10;
        const hpBonus = Math.floor(baseHpBonus * lunaMultiplier);
        const attackBonus = Math.floor(baseAttackBonus * lunaMultiplier);

        // Second pass: apply bonuses to all OTHER heroes (not the ones with Friendship)
        const beneficiaries = [];
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = heroes[position];
            // Hero exists AND doesn't have Friendship = beneficiary
            if (hero && !friendshipHeroes.some(f => f.position === position)) {
                // Apply battle bonuses using existing Hero methods
                hero.addBattleHpBonus(hpBonus);
                hero.addBattleAttackBonus(attackBonus);
                
                beneficiaries.push({
                    hero: hero,
                    position: position,
                    side: side,
                    hpBonus: hpBonus,
                    attackBonus: attackBonus
                });
            }
        });

        // Apply effects if there are beneficiaries
        if (beneficiaries.length > 0) {
            // Create visual effects
            await this.createFriendshipVisualEffects(beneficiaries);
            
            // Update visual displays
            this.updateHeroDisplays(side, beneficiaries);
            
            // Log the effect with Luna buff info if applicable
            const friendNames = friendshipHeroes.map(f => f.hero.name).join(', ');
            const beneficiaryNames = beneficiaries.map(b => b.hero.name).join(', ');
            
            let logMessage = `🌈 ${friendNames}'s Friendship grants ${beneficiaryNames} +${hpBonus} HP and +${attackBonus} Attack!`;
            if (lunaBuffs > 0) {
                logMessage += ` (Enhanced by ${lunaBuffs} Luna buffs: ×${lunaMultiplier.toFixed(2)})`;
            }
            
            bm.addCombatLog(
                logMessage,
                side === 'player' ? 'success' : 'info'
            );

            // Send to guest for synchronization
            if (bm.isAuthoritative) {
                bm.sendBattleUpdate('friendship_effects_applied', {
                    side: side,
                    friendshipHeroes: friendshipHeroes.map(f => ({
                        position: f.position,
                        name: f.hero.name,
                        stacks: f.stacks
                    })),
                    beneficiaries: beneficiaries.map(b => ({
                        position: b.position,
                        name: b.hero.name,
                        hpBonus: b.hpBonus,
                        attackBonus: b.attackBonus
                    })),
                    totalFriendshipStacks: totalFriendshipStacks,
                    hpBonus: hpBonus,
                    attackBonus: attackBonus,
                    lunaBuffs: lunaBuffs,
                    lunaMultiplier: lunaMultiplier,
                    timestamp: Date.now()
                });
            }
        }
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    async createFriendshipVisualEffects(beneficiaries) {
        // Inject CSS if not already present
        this.injectFriendshipStyles();
        
        // Create particle effects for each beneficiary
        const effectPromises = beneficiaries.map(beneficiary => 
            this.createRainbowParticleEffect(beneficiary.side, beneficiary.position)
        );
        
        await Promise.all(effectPromises);
    }

    async createRainbowParticleEffect(side, position) {
        const bm = this.battleManager;
        const heroElement = bm.getHeroElement(side, position);
        if (!heroElement) return;

        // Create rainbow particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'friendship-particle-effect';
        particleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 100;
            overflow: hidden;
        `;

        // Create multiple rainbow particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'friendship-particle';
            
            // Random position and timing for natural effect
            const startX = Math.random() * 100;
            const startY = 100 + Math.random() * 20; // Start below the hero
            const duration = 2000 + Math.random() * 1000;
            const delay = Math.random() * 800;
            
            particle.style.cssText = `
                position: absolute;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: radial-gradient(circle, #FFD700 0%, #FF69B4 40%, #00CED1 80%, #32CD32 100%);
                box-shadow: 0 0 12px rgba(255, 215, 0, 0.9), 0 0 6px rgba(255, 105, 180, 0.6);
                left: ${startX}%;
                top: ${startY}%;
                opacity: 0;
                animation: friendshipParticleRise ${duration}ms ease-out ${delay}ms forwards;
            `;
            
            particleContainer.appendChild(particle);
        }

        // Add golden glow effect to the hero
        const heroCard = heroElement.querySelector('.battle-hero-card');
        if (heroCard) {
            heroCard.classList.add('friendship-blessed');
        }

        heroElement.appendChild(particleContainer);

        // Remove particle effects after animation completes
        setTimeout(() => {
            if (particleContainer.parentNode) {
                particleContainer.parentNode.removeChild(particleContainer);
            }
            if (heroCard) {
                heroCard.classList.remove('friendship-blessed');
            }
        }, 4000);

        // Add delay for effect timing
        await bm.delay(300);
    }

    updateHeroDisplays(side, beneficiaries) {
        const bm = this.battleManager;
        
        // Update health and attack displays for beneficiaries
        beneficiaries.forEach(beneficiary => {
            bm.updateHeroHealthBar(beneficiary.side, beneficiary.position, 
                beneficiary.hero.currentHp, beneficiary.hero.maxHp);
            bm.updateHeroAttackDisplay(beneficiary.side, beneficiary.position, beneficiary.hero);
        });
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    handleGuestFriendshipEffects(data) {
        const bm = this.battleManager;
        if (bm.isAuthoritative) return; // Only process on guest side

        const { side, friendshipHeroes, beneficiaries, hpBonus, attackBonus } = data;

        // CORRECT perspective mapping for guest:
        const localSide = side === 'player' ? 'opponent' : 'player';
        
        const actualBeneficiaries = [];

        // Apply bonuses to the correct local hero objects, but check for double application
        beneficiaries.forEach(b => {
            const localHeroes = localSide === 'player' ? bm.playerHeroes : bm.opponentHeroes;
            const localHero = localHeroes[b.position];
            if (localHero) {
                // Check if bonuses are already applied to prevent double application
                const currentBattleAttackBonus = localHero.battleAttackBonus || 0;
                const expectedFriendshipBonus = b.attackBonus;
                
                // Only apply if not already applied
                if (currentBattleAttackBonus < expectedFriendshipBonus) {
                    const neededAttackBonus = expectedFriendshipBonus - currentBattleAttackBonus;
                    const neededHpBonus = b.hpBonus - (localHero.battleHpBonus || 0);
                    
                    if (neededAttackBonus > 0) {
                        localHero.addBattleAttackBonus(neededAttackBonus);
                    }
                    if (neededHpBonus > 0) {
                        localHero.addBattleHpBonus(neededHpBonus);
                    }
                }
                
                actualBeneficiaries.push({
                    hero: localHero,
                    position: b.position,
                    side: localSide,
                    hpBonus: b.hpBonus,
                    attackBonus: b.attackBonus
                });
            }
        });

        // Create visual effects for beneficiaries
        this.createFriendshipVisualEffects(actualBeneficiaries);

        // Update hero displays to show the newly applied stats
        this.updateHeroDisplays(localSide, actualBeneficiaries);

        // Add combat log
        const friendNames = friendshipHeroes.map(f => f.name).join(', ');
        const beneficiaryNames = beneficiaries.map(b => b.name).join(', ');
        
        bm.addCombatLog(
            `🌈 ${friendNames}'s Friendship grants ${beneficiaryNames} +${hpBonus} HP and +${attackBonus} Attack!`,
            localSide === 'player' ? 'success' : 'info'
        );
    }

    // ============================================
    // STYLES AND CLEANUP
    // ============================================

    injectFriendshipStyles() {
        if (!document.getElementById('friendshipEffectStyles')) {
            const style = document.createElement('style');
            style.id = 'friendshipEffectStyles';
            style.textContent = `
                @keyframes friendshipParticleRise {
                    0% {
                        opacity: 0;
                        transform: translateY(0) scale(0.3) rotate(0deg);
                    }
                    20% {
                        opacity: 1;
                        transform: translateY(-30px) scale(1) rotate(90deg);
                    }
                    60% {
                        opacity: 0.9;
                        transform: translateY(-80px) scale(1.3) rotate(270deg);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-150px) scale(0.5) rotate(360deg);
                    }
                }

                .friendship-blessed {
                    animation: friendshipGlow 3s ease-out forwards;
                    position: relative;
                }

                .friendship-blessed::after {
                    content: '';
                    position: absolute;
                    top: -5px;
                    left: -5px;
                    right: -5px;
                    bottom: -5px;
                    background: linear-gradient(45deg, #FFD700, #FF69B4, #00CED1, #32CD32, #FFD700);
                    background-size: 300% 300%;
                    border-radius: inherit;
                    z-index: -1;
                    opacity: 0.7;
                    animation: friendshipRainbow 2s ease-in-out infinite;
                }

                @keyframes friendshipGlow {
                    0% {
                        box-shadow: 0 0 0 rgba(255, 215, 0, 0);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 105, 180, 0.4);
                    }
                    100% {
                        box-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
                    }
                }

                @keyframes friendshipRainbow {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    cleanup() {
        // Remove any remaining particle effects
        const particleEffects = document.querySelectorAll('.friendship-particle-effect');
        particleEffects.forEach(effect => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        });

        // Remove friendship blessed effects
        const blessedCards = document.querySelectorAll('.friendship-blessed');
        blessedCards.forEach(card => {
            card.classList.remove('friendship-blessed');
        });

        console.log('🌈 Friendship manager cleaned up');
    }
}

// ============================================
// BATTLE MANAGER INTEGRATION PATCHES
// ============================================

export function applyFriendshipPatches(BattleManager) {
    // Store original methods
    const originalInit = BattleManager.prototype.init;
    const originalReset = BattleManager.prototype.reset;
    const originalReceiveBattleData = BattleManager.prototype.receiveBattleData;

    // Patch init to create FriendshipManager
    BattleManager.prototype.init = function(...args) {
        originalInit.apply(this, args);
        
        // Initialize friendship manager
        this.friendshipManager = new FriendshipManager(this);
    };

    // Patch reset to cleanup friendship manager
    BattleManager.prototype.reset = function() {
        originalReset.apply(this);
        
        // Cleanup friendship manager
        if (this.friendshipManager) {
            this.friendshipManager.cleanup();
            this.friendshipManager = null;
        }
    };

    // Patch receiveBattleData to handle friendship messages
    BattleManager.prototype.receiveBattleData = function(message) {
        originalReceiveBattleData.apply(this, arguments);
        
        // Handle friendship-specific messages
        const { type, data } = message;
        
        if (type === 'friendship_effects_applied' && this.friendshipManager) {
            this.friendshipManager.handleGuestFriendshipEffects(data);
        }
    };

    // Add guest handler method
    BattleManager.prototype.guest_handleFriendshipEffects = function(data) {
        if (this.friendshipManager) {
            this.friendshipManager.handleGuestFriendshipEffects(data);
        }
    };
}

export default FriendshipManager;