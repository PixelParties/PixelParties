// bloodSoakedCoin.js - Blood-Soaked Coin Artifact Handler Module

export const bloodSoakedCoinArtifact = {
    // Card name this artifact handles
    cardName: 'BloodSoakedCoin',
    
    // Handle card click
    async handleClick(cardIndex, cardName, heroSelection) {
        console.log(`BloodSoakedCoin clicked at index ${cardIndex}`);
        
        // Apply the artifact effect
        await this.applyBloodSoakedCoinEffect(cardIndex, heroSelection);
    },
    
    // Handle card being dragged outside the hand
    async handleDraggedOutside(cardIndex, cardName, heroSelection) {
        console.log(`BloodSoakedCoin dragged outside hand from index ${cardIndex}`);
        
        // Apply the artifact effect
        await this.applyBloodSoakedCoinEffect(cardIndex, heroSelection);
    },
    
    // Core logic to apply blood-soaked coin effect
    async applyBloodSoakedCoinEffect(cardIndex, heroSelection) {
        if (!heroSelection) {
            console.error('No heroSelection instance available');
            return;
        }
        
        // Get managers
        const handManager = heroSelection.getHandManager();
        const goldManager = heroSelection.getGoldManager();
        
        if (!handManager || !goldManager) {
            console.error('Required managers not available');
            return;
        }
        
        // Check gold cost and deduct it (if any)
        const cardInfo = heroSelection.getCardInfo(this.cardName);
        const cost = cardInfo?.cost || 0;
        const playerGold = goldManager.getPlayerGold();
        
        if (playerGold < cost) {
            this.showError(`You need ${cost} Gold to use ${this.cardName}!`);
            return;
        }
        
        // Remove card from hand first
        const removedCard = handManager.removeCardFromHandByIndex(cardIndex);
        
        if (removedCard !== this.cardName) {
            console.error(`Expected to remove ${this.cardName} but removed ${removedCard}`);
            return;
        }
        
        // Deduct gold cost if applicable
        if (cost > 0) {
            goldManager.addPlayerGold(-cost, 'blood_soaked_coin_cost');
            console.log(`🩸 Deducted ${cost} gold for BloodSoakedCoin cost`);
        }
        
        // Grant 20 Gold immediately
        const goldGained = 20;
        goldManager.addPlayerGold(goldGained, 'blood_soaked_coin_gain');
        console.log(`🩸 BloodSoakedCoin: Gained ${goldGained} gold`);
        
        // Register delayed blood toll effect for next battle
        await this.registerDelayedBloodTollEffect(heroSelection);
        
        // Show visual feedback
        this.showBloodSoakedCoinAnimation(cardIndex, goldGained);
        
        // Update UI
        heroSelection.updateHandDisplay();
        heroSelection.updateGoldDisplay();
        
        // Save game state
        await heroSelection.saveGameState();
        
        console.log(`🩸 BloodSoakedCoin consumed! Gained ${goldGained} gold. Blood toll registered for next battle.`);
    },
    
    // Register the delayed blood toll effect for next battle
    async registerDelayedBloodTollEffect(heroSelection) {
        // Method 1: Try to integrate with potionHandler system (preferred)
        if (window.potionHandler && typeof window.potionHandler.addBattleStartEffect === 'function') {
            window.potionHandler.addBattleStartEffect('blood_soaked_coin_toll', {
                type: 'damage_all_player_heroes',
                damageAmount: 100,
                stacks: 1,
                source: 'BloodSoakedCoin',
                description: 'All your Heroes will lose 100 HP at battle start'
            });
            console.log('🩸 Registered blood toll with potionHandler for next battle');
            return;
        }
        
        // Method 2: Fallback - store in heroSelection state
        if (!heroSelection.delayedArtifactEffects) {
            heroSelection.delayedArtifactEffects = [];
        }
        
        // Find existing BloodSoakedCoin effect to accumulate stacks
        let existingEffect = heroSelection.delayedArtifactEffects.find(
            effect => effect.source === 'BloodSoakedCoin' && effect.type === 'damage_all_player_heroes'
        );
        
        if (existingEffect) {
            // Increment stacks instead of replacing
            existingEffect.stacks += 1;
            existingEffect.appliedAt = Date.now(); // Update timestamp
            console.log(`🩸 Increased BloodSoakedCoin toll stacks to ${existingEffect.stacks}`);
        } else {
            // Add new effect if none exists
            heroSelection.delayedArtifactEffects.push({
                type: 'damage_all_player_heroes',
                damageAmount: 100,
                stacks: 1,
                source: 'BloodSoakedCoin',
                appliedAt: Date.now(),
                description: 'All your Heroes will lose 100 HP at battle start'
            });
            console.log('🩸 Added new BloodSoakedCoin toll with 1 stack');
        }
        
        console.log('🩸 Stored blood toll in heroSelection for next battle');
    },
    
    // Show blood-soaked coin consumption animation
    showBloodSoakedCoinAnimation(cardIndex, goldGained) {
        // Create visual effect burst
        const effectBurst = document.createElement('div');
        effectBurst.className = 'blood-soaked-coin-effect-burst';
        effectBurst.innerHTML = `
            <div class="blood-soaked-coin-content">
                <div class="coin-icon">🪙</div>
                <div class="effect-details">
                    <div class="gold-gained">
                        <span class="gold-icon">💰</span>
                        <span class="effect-text">+${goldGained} Gold!</span>
                    </div>
                    <div class="blood-warning">
                        <span class="blood-icon">🩸</span>
                        <span class="warning-text">Blood Toll Applied!</span>
                    </div>
                </div>
            </div>
        `;
        
        // Position near the consumed card
        this.positionEffectBurst(effectBurst, cardIndex);
        
        // Add to DOM
        document.body.appendChild(effectBurst);
        
        // Remove after animation
        setTimeout(() => {
            if (effectBurst && effectBurst.parentNode) {
                effectBurst.remove();
            }
        }, 3000);
        
        // Play sound effect
        this.playBloodSoakedCoinSound();
    },
    
    // Position the visual effect near the card
    positionEffectBurst(effectBurst, cardIndex) {
        const handContainer = document.querySelector('.hand-cards');
        
        if (handContainer) {
            const handCards = handContainer.querySelectorAll('.hand-card');
            
            if (handCards[cardIndex]) {
                const cardRect = handCards[cardIndex].getBoundingClientRect();
                effectBurst.style.left = `${cardRect.left + cardRect.width / 2}px`;
                effectBurst.style.top = `${cardRect.top}px`;
            } else {
                // Fallback to center of hand
                const handRect = handContainer.getBoundingClientRect();
                effectBurst.style.left = `${handRect.left + handRect.width / 2}px`;
                effectBurst.style.top = `${handRect.top}px`;
            }
        } else {
            // Fallback to screen center
            effectBurst.style.left = '50%';
            effectBurst.style.top = '50%';
        }
    },
    
    // Play sound effect
    playBloodSoakedCoinSound() {
        console.log('🎵 *metallic coin clinking mixed with ominous dripping sounds*');
    },
    
    // Add error display method
    showError(message) {
        const error = document.createElement('div');
        error.className = 'blood-soaked-coin-error';
        error.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        error.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #8b0000 0%, #dc143c 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            animation: bloodSoakedCoinError 3s ease-out forwards;
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        document.body.appendChild(error);
        
        setTimeout(() => {
            if (error.parentNode) {
                error.remove();
            }
        }, 3000);
    },
    
    // Export state for persistence
    exportArtifactState() {
        return {
            artifact: 'BloodSoakedCoin',
            version: '1.0.0'
        };
    }
};

// ===== GLOBAL UTILITY FUNCTIONS FOR BATTLE INTEGRATION =====

// Apply battle-start blood toll effects
export async function applyBloodSoakedCoinDelayedEffects(battleManager, heroSelection) {
    if (!heroSelection || !heroSelection.delayedArtifactEffects) {
        return;
    }
    
    // Find blood toll effects from BloodSoakedCoin
    const bloodTollEffects = heroSelection.delayedArtifactEffects.filter(
        effect => effect.type === 'damage_all_player_heroes' && effect.source === 'BloodSoakedCoin'
    );
    
    if (bloodTollEffects.length === 0) {
        return;
    }
    
    console.log('🩸 Applying BloodSoakedCoin toll at battle start...');
    
    // Apply blood toll to all player heroes
    await damageAllPlayerHeroes(battleManager, bloodTollEffects);
    
    // Remove the processed effects
    heroSelection.delayedArtifactEffects = heroSelection.delayedArtifactEffects.filter(
        effect => !(effect.type === 'damage_all_player_heroes' && effect.source === 'BloodSoakedCoin')
    );
    
    // Save updated state
    if (heroSelection.saveGameState) {
        await heroSelection.saveGameState();
    }
}

// Apply delayed effects from both players
export async function applyBothPlayersBloodTollEffects(hostEffects, guestEffects, battleManager) {
    console.log('🩸 Processing blood toll effects from both players...');
    
    const damagePromises = [];
    
    // Process host's delayed effects (apply to host's heroes)
    if (hostEffects && hostEffects.length > 0) {
        const hostBloodTollEffects = hostEffects.filter(
            effect => effect.type === 'damage_all_player_heroes' && effect.source === 'BloodSoakedCoin'
        );
        
        if (hostBloodTollEffects.length > 0) {
            console.log('🩸 Applying HOST BloodSoakedCoin toll...');
            damagePromises.push(damagePlayerHeroes(battleManager, hostBloodTollEffects, 'host'));
        }
    }
    
    // Process guest's delayed effects (apply to guest's heroes)
    if (guestEffects && guestEffects.length > 0) {
        const guestBloodTollEffects = guestEffects.filter(
            effect => effect.type === 'damage_all_player_heroes' && effect.source === 'BloodSoakedCoin'
        );
        
        if (guestBloodTollEffects.length > 0) {
            console.log('🩸 Applying GUEST BloodSoakedCoin toll...');
            damagePromises.push(damagePlayerHeroes(battleManager, guestBloodTollEffects, 'guest'));
        }
    }
    
    // Execute all damage/animation processes simultaneously
    if (damagePromises.length > 0) {
        await Promise.all(damagePromises);
    }
}

// Apply blood toll damage to heroes of a specific player (host or guest)
async function damagePlayerHeroes(battleManager, bloodTollEffects, playerSide) {
    // Calculate total stacks from all effects
    const totalStacks = bloodTollEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    const damagePerStack = bloodTollEffects[0]?.damageAmount || 100;
    const totalDamage = totalStacks * damagePerStack;
    
    let heroesAffected = 0;
    
    // Determine which heroes to damage based on player side
    const heroesToDamage = playerSide === 'host' 
        ? battleManager.playerHeroes 
        : battleManager.opponentHeroes;
    
    const playerName = playerSide === 'host' ? 'Host' : 'Guest';
    const logType = playerSide === 'host' ? 'error' : 'success';
    
    // Determine the correct 'side' parameter for health bar updates
    const healthBarSide = playerSide === 'host' ? 'player' : 'opponent';
    
    // Apply blood toll damage to all of this player's heroes
    const damagePromises = ['left', 'center', 'right'].map(async (position) => {
        const hero = heroesToDamage[position];
        if (hero && hero.alive && hero.currentHp > 1) {
            console.log(`🩸 Applying blood toll to ${playerName}'s ${hero.name} (id: ${hero.id || 'no-id'})`);
            
            // Calculate damage (cannot reduce below 1 HP)
            const actualDamage = Math.min(totalDamage, hero.currentHp - 1);
            
            if (actualDamage > 0) {
                // Apply damage
                hero.currentHp -= actualDamage;
                heroesAffected++;
                
                // Show blood fountain animation locally (on host)
                await showBloodFountainAnimationFixed(position, healthBarSide, actualDamage, battleManager);
                
                // Send animation message to guest
                if (battleManager.isAuthoritative && battleManager.sendBattleUpdate) {
                    battleManager.sendBattleUpdate('blood_soaked_coin_damage_animation', {
                        heroAbsoluteSide: playerSide === 'host' ? 'host' : 'guest',
                        heroPosition: position,
                        heroName: hero.name,
                        damage: actualDamage,
                        healthBarSide: healthBarSide,
                        oldHp: hero.currentHp + actualDamage, // HP before damage
                        newHp: hero.currentHp,               // HP after damage
                        maxHp: hero.maxHp,
                        timestamp: Date.now()
                    });
                }
                
                console.log(`🩸 Blood toll: ${hero.name} took ${actualDamage} damage (${totalStacks} coins × ${damagePerStack} HP)`);
                
                // Update hero health bar with correct parameters
                if (battleManager.updateHeroHealthBar) {
                    battleManager.updateHeroHealthBar(healthBarSide, position, hero.currentHp, hero.maxHp);
                } else {
                    console.warn('updateHeroHealthBar method not available on battleManager');
                }
                
                // Alternative health bar update if the above doesn't work
                if (battleManager.battleScreen && battleManager.battleScreen.updateHeroHealthBar) {
                    battleManager.battleScreen.updateHeroHealthBar(healthBarSide, position, hero.currentHp, hero.maxHp);
                }
            }
        }
    });
    
    // Wait for all damage animations to complete
    await Promise.all(damagePromises);
    
    // Add combat log message
    if (heroesAffected > 0) {
        const message = playerSide === 'host' 
            ? `🩸 Your Blood-Soaked Coins demand their toll! ${heroesAffected} Heroes lose ${totalDamage} HP from ${totalStacks} coin${totalStacks > 1 ? 's' : ''}!`
            : `🩸 Opponent's Blood-Soaked Coins demand their toll! ${heroesAffected} Heroes lose ${totalDamage} HP from ${totalStacks} coin${totalStacks > 1 ? 's' : ''}!`;
            
        battleManager.addCombatLog(message, logType);
    }
    
    // Small delay for visual effect processing
    await battleManager.delay(500);
}

// Improved blood fountain animation with better DOM selectors
async function showBloodFountainAnimationFixed(position, side, damage, battleManager) {
    // Try multiple selector strategies to find the hero element
    let heroElement = null;
    
    // Strategy 1: Try battleScreen method
    if (battleManager.battleScreen && typeof battleManager.battleScreen.getHeroElement === 'function') {
        heroElement = battleManager.battleScreen.getHeroElement(side, position);
    }
    
    // Strategy 2: Try common CSS selectors
    if (!heroElement) {
        const selectors = [
            `.${side}-${position}-hero`,
            `[data-side="${side}"][data-position="${position}"]`,
            `.hero-${side}-${position}`,
            `.${side}-hero.${position}`,
            `#${side}-${position}`,
            `.hero-container.${side} .${position}`,
            `.battle-hero[data-position="${position}"][data-side="${side}"]`
        ];
        
        for (const selector of selectors) {
            heroElement = document.querySelector(selector);
            if (heroElement) {
                console.log(`🎯 Found hero element using selector: ${selector}`);
                break;
            }
        }
    }
    
    // Strategy 3: Fallback to any hero element in the general area
    if (!heroElement) {
        heroElement = document.querySelector(`[class*="${side}"][class*="${position}"]`) ||
                    document.querySelector(`[class*="hero"][class*="${position}"]`) ||
                    document.querySelector(`.${side}-heroes .hero:nth-child(${position === 'left' ? 1 : position === 'center' ? 2 : 3})`);
    }
    
    if (!heroElement) {
        console.warn(`Could not find DOM element for ${side} ${position} hero - trying alternative approach`);
        
        // Strategy 4: Create floating animation at center of screen as last resort
        heroElement = document.body;
        showFloatingBloodAnimation(damage);
        return;
    }
    
    console.log(`🩸 Creating blood fountain on ${side} ${position} hero element:`, heroElement);
    
    // Create blood fountain effect
    const bloodFountain = document.createElement('div');
    bloodFountain.className = 'blood-fountain-effect';
    
    // Create multiple blood drops
    for (let i = 0; i < 8; i++) {
        const bloodDrop = document.createElement('div');
        bloodDrop.className = 'blood-drop';
        
        const angle = (i / 8) * 2 * Math.PI;
        const distance = 40 + Math.random() * 20;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance - 20; // Slight upward bias
        
        bloodDrop.style.cssText = `
            position: absolute;
            left: 50%;
            top: 30%;
            width: 8px;
            height: 8px;
            background: radial-gradient(circle, #8b0000 0%, #dc143c 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: bloodFountain 0.8s ease-out forwards;
            --end-x: ${endX}px;
            --end-y: ${endY}px;
            box-shadow: 0 0 6px #8b0000;
            z-index: 1000;
        `;
        
        bloodFountain.appendChild(bloodDrop);
    }
    
    // Add damage number
    const damageNumber = document.createElement('div');
    damageNumber.className = 'blood-damage-number';
    damageNumber.textContent = `-${damage}`;
    damageNumber.style.cssText = `
        position: absolute;
        left: 50%;
        top: 20%;
        transform: translateX(-50%);
        color: #8b0000;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        animation: bloodDamageFloat 1s ease-out forwards;
        z-index: 1001;
    `;
    
    bloodFountain.appendChild(damageNumber);
    
    // Position relative to hero
    bloodFountain.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999;
    `;
    
    // Add to hero element
    heroElement.style.position = 'relative';
    heroElement.appendChild(bloodFountain);
    
    // Remove after animation
    setTimeout(() => {
        if (bloodFountain && bloodFountain.parentNode) {
            bloodFountain.remove();
        }
    }, 1000);
    
    // Return promise that resolves when animation is complete
    return new Promise(resolve => setTimeout(resolve, 800));
}

// Guest handler for BloodSoakedCoin damage animations
export function handleGuestBloodSoakedCoinDamage(data, battleManager) {
    if (battleManager.isAuthoritative) return; // Only process on guest side
    
    const { heroAbsoluteSide, heroPosition, heroName, damage, healthBarSide, oldHp, newHp, maxHp } = data;
    
    // Determine local side for guest
    const myAbsoluteSide = battleManager.isHost ? 'host' : 'guest';
    const heroLocalSide = (heroAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
    
    // Update the hero's HP on guest side
    const heroes = heroLocalSide === 'player' ? battleManager.playerHeroes : battleManager.opponentHeroes;
    const hero = heroes[heroPosition];
    
    if (hero) {
        hero.currentHp = newHp;
        
        // Update the health bar
        battleManager.updateHeroHealthBar(heroLocalSide, heroPosition, newHp, maxHp);
    }
    
    // Play the blood fountain animation
    showBloodFountainAnimationFixed(heroPosition, heroLocalSide, damage, battleManager);
    
    // Add combat log entry
    const logType = heroLocalSide === 'player' ? 'error' : 'success';
    battleManager.addCombatLog(
        `🩸 ${heroName} suffers ${damage} damage from Blood-Soaked Coin toll! (${oldHp} → ${newHp} HP)`,
        logType
    );
}

// Fallback floating animation when hero element can't be found
function showFloatingBloodAnimation(damage) {
    const floatingBlood = document.createElement('div');
    floatingBlood.className = 'floating-blood-effect';
    floatingBlood.innerHTML = `
        <div class="floating-damage">🩸 -${damage} HP</div>
    `;
    
    floatingBlood.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        pointer-events: none;
        color: #8b0000;
        font-size: 32px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        animation: floatingBloodEffect 2s ease-out forwards;
    `;
    
    document.body.appendChild(floatingBlood);
    
    setTimeout(() => {
        if (floatingBlood.parentNode) {
            floatingBlood.remove();
        }
    }, 2000);
}

// Clear processed blood toll effects from Firebase
async function clearProcessedBloodTollEffects(battleManager, hostEffects, guestEffects) {
    if (!battleManager.roomManager || !battleManager.roomManager.getRoomRef()) {
        return;
    }
    
    try {
        const roomRef = battleManager.roomManager.getRoomRef();
        
        // Filter out processed BloodSoakedCoin effects
        const filteredHostEffects = hostEffects ? hostEffects.filter(
            effect => !(effect.type === 'damage_all_player_heroes' && effect.source === 'BloodSoakedCoin')
        ) : [];
        
        const filteredGuestEffects = guestEffects ? guestEffects.filter(
            effect => !(effect.type === 'damage_all_player_heroes' && effect.source === 'BloodSoakedCoin')
        ) : [];
        
        // Update Firebase with filtered effects
        await roomRef.child('gameState').update({
            hostDelayedArtifactEffects: filteredHostEffects.length > 0 ? filteredHostEffects : null,
            guestDelayedArtifactEffects: filteredGuestEffects.length > 0 ? filteredGuestEffects : null,
            bloodTollEffectsProcessedAt: Date.now()
        });
        
        console.log('🧹 Cleared processed BloodSoakedCoin effects from Firebase');
    } catch (error) {
        console.error('Error clearing processed blood toll effects:', error);
    }
}

// 🔧 FIXED: Apply damage to all player heroes (original function - backward compatibility)
async function damageAllPlayerHeroes(battleManager, bloodTollEffects) {
    // Calculate total stacks from all effects
    const totalStacks = bloodTollEffects.reduce((sum, effect) => sum + effect.stacks, 0);
    const damagePerStack = bloodTollEffects[0]?.damageAmount || 100;
    const totalDamage = totalStacks * damagePerStack;
    
    let heroesAffected = 0;
    
    // Apply damage to all player heroes
    const damagePromises = ['left', 'center', 'right'].map(async (position) => {
        const hero = battleManager.playerHeroes[position];
        if (hero && hero.alive && hero.currentHp > 1) {
            // Calculate damage (cannot reduce below 1 HP)
            const actualDamage = Math.min(totalDamage, hero.currentHp - 1);
            
            if (actualDamage > 0) {
                hero.currentHp -= actualDamage;
                heroesAffected++;
                
                // 🔧 FIX: Use improved animation function
                await showBloodFountainAnimationFixed(position, 'player', actualDamage, battleManager);
                
                console.log(`🩸 Blood toll: ${hero.name} took ${actualDamage} damage`);
                
                // 🔧 FIX: Update hero health bar with correct parameters
                if (battleManager.updateHeroHealthBar) {
                    battleManager.updateHeroHealthBar('player', position, hero.currentHp, hero.maxHp);
                }
                
                // 🔧 FIX: Alternative health bar update
                if (battleManager.battleScreen && battleManager.battleScreen.updateHeroHealthBar) {
                    battleManager.battleScreen.updateHeroHealthBar('player', position, hero.currentHp, hero.maxHp);
                }
            }
        }
    });
    
    // Wait for all animations to complete
    await Promise.all(damagePromises);
    
    // Add combat log message
    if (heroesAffected > 0) {
        battleManager.addCombatLog(
            `🩸 The Blood-Soaked Coins demand their toll! ${heroesAffected} Heroes lose ${totalDamage} HP from ${totalStacks} coin${totalStacks > 1 ? 's' : ''}!`,
            'error'
        );
    }
    
    // Small delay for visual effect processing
    await battleManager.delay(500);
}

// CSS styles for the blood-soaked coin effect
if (typeof document !== 'undefined' && !document.getElementById('bloodSoakedCoinStyles')) {
    const style = document.createElement('style');
    style.id = 'bloodSoakedCoinStyles';
    style.textContent = `
        /* Blood-Soaked Coin Effect Animation */
        .blood-soaked-coin-effect-burst {
            position: fixed;
            transform: translate(-50%, -50%);
            z-index: 10000;
            pointer-events: none;
            animation: bloodSoakedCoinEffect 3s ease-out forwards;
        }
        
        .blood-soaked-coin-content {
            background: linear-gradient(135deg, rgba(139, 0, 0, 0.95) 0%, rgba(220, 20, 60, 0.95) 100%);
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.8),
                inset 0 0 20px rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            min-width: 200px;
        }
        
        .coin-icon {
            font-size: 48px;
            margin-bottom: 10px;
            animation: coinSpin 2s ease-in-out infinite;
            filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
        }
        
        .effect-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .gold-gained {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #FFD700;
            font-weight: bold;
            font-size: 18px;
        }
        
        .blood-warning {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #FF6B6B;
            font-weight: bold;
            font-size: 14px;
            margin-top: 5px;
            animation: bloodWarningPulse 1s ease-in-out infinite;
        }
        
        .gold-icon {
            font-size: 22px;
            filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
        }
        
        .blood-icon {
            font-size: 18px;
            filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.8));
        }
        
        .effect-text {
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        .warning-text {
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        
        /* Blood Fountain Effect */
        .blood-fountain-effect {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 50;
        }
        
        .blood-drop {
            position: absolute;
            width: 8px;
            height: 8px;
            background: radial-gradient(circle, #8b0000 0%, #dc143c 100%);
            border-radius: 50%;
            box-shadow: 0 0 6px #8b0000;
        }
        
        .blood-damage-number {
            position: absolute;
            color: #8b0000;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 100;
        }
        
        @keyframes bloodSoakedCoinEffect {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3) rotate(-10deg);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1) rotate(0deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8) rotate(0deg) translateY(-30px);
            }
        }
        
        @keyframes coinSpin {
            0%, 100% {
                transform: rotateY(0deg) scale(1);
                filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
            }
            50% {
                transform: rotateY(180deg) scale(1.1);
                filter: drop-shadow(0 0 25px rgba(255, 215, 0, 1));
            }
        }
        
        @keyframes bloodWarningPulse {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.7;
                transform: scale(1.05);
            }
        }
        
        @keyframes bloodFountain {
            0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            70% {
                transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(0.8);
                opacity: 0.8;
            }
            100% {
                transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y) + 30px)) scale(0.3);
                opacity: 0;
            }
        }
        
        @keyframes bloodDamageFloat {
            0% {
                transform: translateX(-50%) translateY(0) scale(0.8);
                opacity: 0;
            }
            20% {
                transform: translateX(-50%) translateY(-10px) scale(1.2);
                opacity: 1;
            }
            100% {
                transform: translateX(-50%) translateY(-40px) scale(1);
                opacity: 0;
            }
        }
        
        @keyframes bloodSoakedCoinError {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            10% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.05);
            }
            90% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }
        }
        
        @keyframes floatingBloodEffect {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1) translateY(-30px);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8) translateY(-60px);
            }
        }
        
        .floating-damage {
            animation: pulse 0.5s ease-in-out infinite alternate;
        }
        
        @keyframes pulse {
            from { transform: scale(1); }
            to { transform: scale(1.1); }
        }
        
        /* Add cursor pointer to clickable artifact cards */
        .hand-card[data-card-name="BloodSoakedCoin"] {
            cursor: pointer;
        }
        
        .hand-card[data-card-name="BloodSoakedCoin"]:hover {
            transform: translateY(-8px);
            box-shadow: 0 8px 25px rgba(139, 0, 0, 0.4);
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}