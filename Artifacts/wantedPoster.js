// ./Artifacts/wantedPoster.js - Wanted Poster Artifact Implementation

// Calculate Wanted Poster bonuses for all heroes in formation
export function calculateFormationWantedPosterBonuses(formation, heroEquipmentManager, side) {
    const bonusData = {
        totalBonus: 0,
        details: []
    };
    
    // Get the kill tracker instance
    const killTracker = window.killTracker || (window.battleManager && window.battleManager.killTracker);
    if (!killTracker) {
        console.log('Kill tracker not available for Wanted Poster calculation');
        return bonusData;
    }
    
    // Check each hero position
    ['left', 'center', 'right'].forEach(position => {
        const hero = formation[position];
        if (!hero) return;
        
        // Get equipment for this hero
        const equipment = heroEquipmentManager ? 
            heroEquipmentManager.getHeroEquipment(position) : [];
        
        // Count Wanted Poster copies
        const wantedPosterCount = equipment.filter(item => 
            item && (item.name === 'WantedPoster' || item.cardName === 'WantedPoster')
        ).length;
        
        if (wantedPosterCount > 0) {
            let rawKills = 0;
            
            // ENHANCED: Use multiple strategies to find kills
            // Strategy 1: Use the provided side
            rawKills = killTracker.getKillCount(side, position);
            
            // Strategy 2: If no kills found, try opposite side (P2P perspective issue)
            if (rawKills === 0) {
                const oppositeSide = side === 'player' ? 'opponent' : 'player';
                rawKills = killTracker.getKillCount(oppositeSide, position);
                
                if (rawKills > 0) {
                    console.log(`🔄 Found ${rawKills} kills for ${hero.name} on ${oppositeSide} side instead of ${side} side`);
                }
            }
            
            // Strategy 3: If hero has absoluteSide property, try using that for more robust lookup
            if (rawKills === 0 && hero.absoluteSide && killTracker.getKillCountByAbsoluteSide) {
                rawKills = killTracker.getKillCountByAbsoluteSide(hero.absoluteSide, position);
                
                if (rawKills > 0) {
                    console.log(`🎯 Found ${rawKills} kills for ${hero.name} using absoluteSide: ${hero.absoluteSide}`);
                }
            }
            
            // Strategy 4: Last resort - search all sides for this hero's kills
            if (rawKills === 0 && killTracker.getAllKillsForHero) {
                const allKills = killTracker.getAllKillsForHero(hero.name, position);
                rawKills = allKills.length;
                
                if (rawKills > 0) {
                    console.log(`🔍 Found ${rawKills} kills for ${hero.name} via hero name search`);
                }
            }
            
            const effectiveKillsPerPoster = Math.min(rawKills, 5);
            
            // Calculate gold bonus: 2 gold per kill per poster
            const goldPerKill = 2;
            const heroBonus = effectiveKillsPerPoster * goldPerKill * wantedPosterCount;
            
            if (heroBonus > 0) {
                bonusData.totalBonus += heroBonus;
                bonusData.details.push({
                    heroName: hero.name,
                    position: position,
                    posterCount: wantedPosterCount,
                    killCount: rawKills,
                    effectiveKills: effectiveKillsPerPoster,
                    goldBonus: heroBonus,
                    maxPossible: 10 * wantedPosterCount // Max 10 gold per poster
                });
                
                console.log(`💰 ${hero.name} Wanted Poster bonus: ${heroBonus} gold (${effectiveKillsPerPoster} kills × ${wantedPosterCount} posters)`);
            } else if (wantedPosterCount > 0) {
                // Debug: Log when we have posters but no kills found
                console.log(`🔍 DEBUG: ${hero.name} has ${wantedPosterCount} Wanted Poster(s) but 0 kills found on any side`);
            }
        }
    });
    
    return bonusData;
}

// Generate HTML for Wanted Poster bonus display in gold breakdown
export function generateWantedPosterBonusHTML(bonusData) {
    if (!bonusData || bonusData.totalBonus <= 0) {
        return '';
    }
    
    let html = `
        <div class="gold-line-item wanted-poster-bonus">
            <span class="gold-source">Wanted Posters</span>
            <span class="gold-arrow">→</span>
            <span class="gold-amount">${bonusData.totalBonus}</span>
        </div>
    `;
    
    // Add details for each hero
    if (bonusData.details && bonusData.details.length > 0) {
        html += '<div class="wanted-poster-details">';
        
        bonusData.details.forEach(detail => {
            const cappedText = detail.killCount > 5 ? ` (capped at 5)` : '';
            html += `
                <div class="wanted-poster-detail-line">
                    <span class="hero-name">${detail.heroName}</span>
                    <span class="poster-info">
                        ${detail.killCount} kill${detail.killCount !== 1 ? 's' : ''}${cappedText} 
                        × ${detail.posterCount} poster${detail.posterCount !== 1 ? 's' : ''}
                    </span>
                    <span class="poster-gold">+${detail.goldBonus}</span>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    return html;
}

// Get styles for Wanted Poster display
export function getWantedPosterStyles() {
    return `
        .gold-line-item.wanted-poster-bonus {
            background: rgba(139, 69, 19, 0.15);
            border-color: rgba(160, 82, 45, 0.4);
        }
        
        .wanted-poster-details {
            margin-left: 12px;
            padding-left: 12px;
            border-left: 2px solid rgba(160, 82, 45, 0.3);
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-top: 8px;
        }
        
        .wanted-poster-detail-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 8px;
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.85);
            background: rgba(139, 69, 19, 0.08);
            border-radius: 4px;
            border: 1px solid rgba(160, 82, 45, 0.2);
        }
        
        .wanted-poster-detail-line .hero-name {
            font-weight: 600;
            color: rgba(255, 215, 0, 0.9);
            min-width: 80px;
        }
        
        .wanted-poster-detail-line .poster-info {
            flex: 1;
            text-align: center;
            font-size: 0.8rem;
            color: rgba(210, 180, 140, 0.9);
            font-style: italic;
        }
        
        .wanted-poster-detail-line .poster-gold {
            font-weight: 700;
            color: #ffd700;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
            min-width: 40px;
            text-align: right;
        }
        
        /* Add wanted poster icon animation */
        .gold-line-item.wanted-poster-bonus::before {
            content: '📜';
            position: absolute;
            left: -25px;
            font-size: 18px;
            animation: wantedPosterFloat 3s ease-in-out infinite;
        }
        
        @keyframes wantedPosterFloat {
            0%, 100% { 
                transform: translateY(0px) rotate(-5deg); 
            }
            50% { 
                transform: translateY(-3px) rotate(5deg); 
            }
        }
    `;
}

// Record kill with visual feedback for Wanted Poster
export function recordKillWithVisualFeedback(battleManager, attacker, target, targetType) {
    // Record the kill
    const killRecord = battleManager.killTracker.recordKill(attacker, target, targetType);
    
    // Check if attacker has Wanted Poster
    const equipment = attacker.equipment || attacker.getEquipment?.() || [];
    const posterCount = equipment.filter(item => 
        item && (item.name === 'WantedPoster' || item.cardName === 'WantedPoster')
    ).length;
    
    if (posterCount > 0) {
        const killCount = battleManager.killTracker.getKillCount(attacker.side, attacker.position);
        
        if (killCount <= 5) {
            // Create bounty notification
            createBountyNotification(battleManager, attacker, killCount, posterCount);
        } else {
            // Already at max kills - just log it
            battleManager.addCombatLog(
                `📜 ${attacker.name} scored another kill, but bounty is already maxed (5/5 kills)`,
                attacker.side === 'player' ? 'info' : 'info'
            );
        }
    }
    
    return killRecord;
}

// Create visual bounty notification
function createBountyNotification(battleManager, attacker, killCount, posterCount) {
    const heroElement = battleManager.getHeroElement(attacker.side, attacker.position);
    if (!heroElement) return;
    
    const goldPerKill = 2 * posterCount;
    const notification = document.createElement('div');
    notification.className = 'bounty-notification';
    notification.innerHTML = `
        <div class="bounty-icon">📜</div>
        <div class="bounty-text">+${goldPerKill} Gold!</div>
        <div class="bounty-count">${killCount}/5</div>
    `;
    
    notification.style.cssText = `
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #333;
        padding: 4px 12px;
        border-radius: 12px;
        font-weight: bold;
        font-size: 14px;
        z-index: 500;
        animation: bountyPop 1s ease-out forwards;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    
    heroElement.appendChild(notification);
    
    // Remove after animation
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 1000);
    
    // Ensure CSS exists
    ensureBountyNotificationCSS();
    
    // Log to combat log
    const currentBonus = Math.min(killCount, 5) * 2 * posterCount;
    const maxBonus = 10 * posterCount;
    battleManager.addCombatLog(
        `📜 ${attacker.name} scored a bounty kill! (${Math.min(killCount, 5)}/5 kills, +${currentBonus}/${maxBonus} gold)`,
        attacker.side === 'player' ? 'success' : 'info'
    );
}

// Add CSS for bounty notifications
function ensureBountyNotificationCSS() {
    if (document.getElementById('bountyNotificationCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'bountyNotificationCSS';
    style.textContent = `
        @keyframes bountyPop {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(10px) scale(0.5);
            }
            50% {
                opacity: 1;
                transform: translateX(-50%) translateY(-15px) scale(1.1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-30px) scale(0.9);
            }
        }
        
        .bounty-notification .bounty-icon {
            font-size: 16px;
        }
        
        .bounty-notification .bounty-text {
            font-size: 12px;
        }
        
        .bounty-notification .bounty-count {
            background: rgba(0, 0, 0, 0.2);
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 11px;
        }
    `;
    
    document.head.appendChild(style);
}

// Check if a hero has Wanted Poster equipped (utility function)
export function heroHasWantedPoster(hero) {
    const equipment = hero.equipment || hero.getEquipment?.() || [];
    return equipment.some(item => 
        item && (item.name === 'WantedPoster' || item.cardName === 'WantedPoster')
    );
}

// Get Wanted Poster count for a hero
export function getWantedPosterCount(hero) {
    const equipment = hero.equipment || hero.getEquipment?.() || [];
    return equipment.filter(item => 
        item && (item.name === 'WantedPoster' || item.cardName === 'WantedPoster')
    ).length;
}