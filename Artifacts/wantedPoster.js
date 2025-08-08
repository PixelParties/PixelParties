
// Record kill with visual feedback and handle Wanted Poster logic
export function recordKillWithVisualFeedback(battleManager, attacker, target, targetType) {
    if (!battleManager || !attacker || !target) {
        console.error('Invalid parameters for kill recording');
        return;
    }
    
    // Always record the kill in the kill tracker
    // NOTE: This happens when the target's HP drops to 0, regardless of revival
    const killRecord = battleManager.killTracker.recordKill(attacker, target, targetType);
    
    // Check if attacker has Wanted Poster equipped
    const hasWantedPoster = battleManager.killTracker.hasWantedPoster(attacker);
    
    if (hasWantedPoster) {
        // Handle Wanted Poster logic (counting the kill)
        battleManager.killTracker.handleWantedPosterKill(attacker, killRecord);
        
        // Add visual feedback for Wanted Poster
        createWantedPosterVisualEffect(attacker, battleManager);
    }
    
    return killRecord;
}

// Create visual effect for Wanted Poster activation
function createWantedPosterVisualEffect(hero, battleManager) {
    const heroElement = battleManager.getHeroElement(hero.side, hero.position);
    if (!heroElement) return;
    
    // Get current kill count and poster count
    const killCount = battleManager.killTracker.getKillCount(hero.side, hero.position);
    const posterCount = getWantedPosterCount(hero);
    const effectiveKills = Math.min(killCount, 5);
    const goldPerKill = 2 * posterCount;
    
    // Create bounty notification
    const bountyEffect = document.createElement('div');
    bountyEffect.className = 'wanted-poster-bounty-effect';
    bountyEffect.innerHTML = `
        <div class="bounty-icon">📜</div>
        <div class="bounty-text">+${goldPerKill} Gold!</div>
        <div class="bounty-count">${effectiveKills}/5</div>
    `;
    
    bountyEffect.style.cssText = `
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #333;
        padding: 6px 12px;
        border-radius: 12px;
        font-weight: bold;
        font-size: 13px;
        z-index: 1000;
        animation: bountyFloat 2s ease-out forwards;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: none;
    `;
    
    heroElement.style.position = 'relative';
    heroElement.appendChild(bountyEffect);
    
    // Remove after animation
    setTimeout(() => {
        if (bountyEffect.parentNode) {
            bountyEffect.remove();
        }
    }, 2000);
    
    // Add glow effect to hero
    const heroCard = heroElement.querySelector('.battle-hero-card, .hero-card');
    if (heroCard) {
        heroCard.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
        heroCard.style.transition = 'box-shadow 0.5s ease';
        
        setTimeout(() => {
            heroCard.style.boxShadow = '';
        }, 1000);
    }
}

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
            
            // FIXED: Only use the correct side for this hero's kills
            // Strategy 1: Use the provided side (this is the correct approach)
            rawKills = killTracker.getKillCount(side, position);
            
            // REMOVED: Strategy 2 fallback that was incorrectly attributing opponent kills
            // The previous code was checking the opposite side if no kills were found,
            // which caused heroes with no kills to get credit for opponent kills in the same position
            
            // Strategy 3: If hero has absoluteSide property, try using that for more robust lookup
            // BUT only if it matches the expected side to avoid cross-attribution
            if (rawKills === 0 && hero.absoluteSide && killTracker.getKillCountByAbsoluteSide) {
                // Only use absoluteSide if it's consistent with our side perspective
                const expectedAbsoluteSide = side === 'player' ? 
                    (window.battleManager?.isHost ? 'host' : 'guest') :
                    (window.battleManager?.isHost ? 'guest' : 'host');
                
                if (hero.absoluteSide === expectedAbsoluteSide) {
                    rawKills = killTracker.getKillCountByAbsoluteSide(hero.absoluteSide, position);
                    
                    if (rawKills > 0) {
                        console.log(`🎯 Found ${rawKills} kills for ${hero.name} using absoluteSide: ${hero.absoluteSide}`);
                    }
                }
            }
            
            // Strategy 4: Hero name search - only as last resort and with additional validation
            if (rawKills === 0 && killTracker.getAllKillsForHero) {
                const allKills = killTracker.getAllKillsForHero(hero.name, position);
                // Additional validation: ensure these kills actually belong to this hero's side
                const validKills = allKills.filter(kill => {
                    // Only count kills where the attacker is actually this hero
                    return kill.attackerSide === side && kill.attackerPosition === position;
                });
                rawKills = validKills.length;
                
                if (rawKills > 0) {
                    console.log(`🔍 Found ${rawKills} validated kills for ${hero.name} via hero name search`);
                }
            }
            
            const effectiveKillsPerPoster = Math.min(rawKills, 5);
            
            // Calculate gold bonus: 2 gold per kill per poster
            const goldPerKill = 2;
            const heroBonus = effectiveKillsPerPoster * goldPerKill * wantedPosterCount;
            
            // Get revival statistics for enhanced details
            const revivedKills = killTracker.getRevivedKillCount ? 
                killTracker.getRevivedKillCount(side, position) : 0;
            const permanentKills = killTracker.getPermanentKillCount ? 
                killTracker.getPermanentKillCount(side, position) : rawKills;
            
            if (heroBonus > 0) {
                bonusData.totalBonus += heroBonus;
                bonusData.details.push({
                    heroName: hero.name,
                    position: position,
                    posterCount: wantedPosterCount,
                    killCount: rawKills,
                    effectiveKills: effectiveKillsPerPoster,
                    goldBonus: heroBonus,
                    maxPossible: 10 * wantedPosterCount, // Max 10 gold per poster
                    // Enhanced tracking
                    revivedKills: revivedKills,
                    permanentKills: permanentKills,
                    killsCountRevived: revivedKills > 0 // Flag if any kills were revived
                });
                
                console.log(`💰 ${hero.name} Wanted Poster bonus: ${heroBonus} gold (${effectiveKillsPerPoster} kills × ${wantedPosterCount} posters, ${revivedKills} revived)`);
            } else if (wantedPosterCount > 0) {
                // This is now correct behavior - heroes with posters but no kills get no bonus
                console.log(`📜 ${hero.name} has ${wantedPosterCount} Wanted Poster(s) but no kills - no bonus awarded`);
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
            
            // NEW: Enhanced tooltip with revival information
            let killBreakdown = '';
            if (detail.killsCountRevived) {
                killBreakdown = ` (${detail.permanentKills} permanent, ${detail.revivedKills} revived)`;
            }
            
            html += `
                <div class="wanted-poster-detail-line" title="Total kills: ${detail.killCount}${killBreakdown}">
                    <span class="hero-name">${detail.heroName}</span>
                    <span class="poster-info">
                        ${detail.killCount} kill${detail.killCount !== 1 ? 's' : ''}${cappedText} 
                        × ${detail.posterCount} poster${detail.posterCount !== 1 ? 's' : ''}
                        ${detail.killsCountRevived ? '💀✨' : ''}
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
            cursor: help;
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
        
        /* NEW: Enhanced visual effects for Wanted Poster bounty */
        @keyframes bountyFloat {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(10px) scale(0.5);
            }
            20% {
                opacity: 1;
                transform: translateX(-50%) translateY(-15px) scale(1.1);
            }
            50% {
                opacity: 1;
                transform: translateX(-50%) translateY(-20px) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) translateY(-35px) scale(0.8);
            }
        }
        
        .wanted-poster-bounty-effect {
            user-select: none;
        }
        
        .wanted-poster-bounty-effect .bounty-icon {
            font-size: 16px;
            animation: bountyIconSpin 0.5s ease-out;
        }
        
        .wanted-poster-bounty-effect .bounty-text {
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        .wanted-poster-bounty-effect .bounty-count {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 11px;
            border: 1px solid rgba(0, 0, 0, 0.2);
        }
        
        @keyframes bountyIconSpin {
            0% { transform: rotate(-10deg); }
            50% { transform: rotate(10deg); }
            100% { transform: rotate(0deg); }
        }
    `;
}

// Calculate total Wanted Poster gold bonus for a hero (for battleManager integration)
export function calculateWantedPosterBonus(hero, battleManager) {
    if (!hero || !battleManager || !battleManager.killTracker) {
        return 0;
    }
    
    return battleManager.killTracker.getWantedPosterBonus(hero.side, hero.position);
}

// Get Wanted Poster statistics for a hero (enhanced with revival tracking)
export function getWantedPosterStats(hero, battleManager) {
    if (!hero || !battleManager || !battleManager.killTracker) {
        return {
            totalKills: 0,
            effectiveKills: 0,
            posterCount: 0,
            goldBonus: 0,
            maxBonus: 0,
            revivedKills: 0,
            permanentKills: 0
        };
    }
    
    const killTracker = battleManager.killTracker;
    const totalKills = killTracker.getKillCount(hero.side, hero.position);
    const effectiveKills = Math.min(totalKills, 5);
    const posterCount = killTracker.getWantedPosterCount(hero);
    const goldBonus = effectiveKills * 2 * posterCount;
    const maxBonus = 5 * 2 * posterCount;
    
    // NEW: Enhanced tracking with revival statistics
    const revivedKills = killTracker.getRevivedKillCount ? 
        killTracker.getRevivedKillCount(hero.side, hero.position) : 0;
    const permanentKills = killTracker.getPermanentKillCount ? 
        killTracker.getPermanentKillCount(hero.side, hero.position) : totalKills;
    
    return {
        totalKills,
        effectiveKills,
        posterCount,
        goldBonus,
        maxBonus,
        revivedKills,
        permanentKills,
        // Additional helper properties
        hasRevivedKills: revivedKills > 0,
        killsAtCap: totalKills >= 5,
        bonusPercentOfMax: maxBonus > 0 ? Math.round((goldBonus / maxBonus) * 100) : 0
    };
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

// NEW: Get detailed kill breakdown for a hero (useful for debugging and displays)
export function getDetailedKillBreakdown(hero, battleManager) {
    if (!hero || !battleManager || !battleManager.killTracker) {
        return {
            allKills: [],
            heroKills: [],
            creatureKills: [],
            revivedTargets: [],
            permanentKills: []
        };
    }
    
    const kills = battleManager.killTracker.getKills(hero.side, hero.position);
    
    return {
        allKills: kills,
        heroKills: kills.filter(k => k.targetType === 'hero'),
        creatureKills: kills.filter(k => k.targetType === 'creature'),
        revivedTargets: kills.filter(k => k.wasRevived),
        permanentKills: kills.filter(k => !k.wasRevived),
        // Summary counts
        totalCount: kills.length,
        heroCount: kills.filter(k => k.targetType === 'hero').length,
        creatureCount: kills.filter(k => k.targetType === 'creature').length,
        revivedCount: kills.filter(k => k.wasRevived).length,
        permanentCount: kills.filter(k => !k.wasRevived).length
    };
}

// NEW: Generate detailed tooltip text for Wanted Poster bonuses
export function generateWantedPosterTooltip(hero, battleManager) {
    const stats = getWantedPosterStats(hero, battleManager);
    const breakdown = getDetailedKillBreakdown(hero, battleManager);
    
    if (stats.posterCount === 0) {
        return 'No Wanted Posters equipped';
    }
    
    let tooltip = `Wanted Poster Bonus:\n`;
    tooltip += `• ${stats.posterCount} poster${stats.posterCount !== 1 ? 's' : ''} equipped\n`;
    tooltip += `• ${stats.totalKills} total kill${stats.totalKills !== 1 ? 's' : ''} (cap: 5)\n`;
    
    if (stats.hasRevivedKills) {
        tooltip += `• ${stats.permanentKills} permanent, ${stats.revivedKills} revived\n`;
        tooltip += `• Revived kills still count for bounty!\n`;
    }
    
    tooltip += `• Current bonus: ${stats.goldBonus}/${stats.maxBonus} gold\n`;
    
    if (breakdown.heroCount > 0) {
        tooltip += `• Hero kills: ${breakdown.heroCount}\n`;
    }
    if (breakdown.creatureCount > 0) {
        tooltip += `• Creature kills: ${breakdown.creatureCount}\n`;
    }
    
    if (stats.killsAtCap) {
        tooltip += `\n⚠ Kill bonus maxed out (5/5)`;
    } else {
        const remaining = 5 - stats.effectiveKills;
        tooltip += `\n📈 ${remaining} more kill${remaining !== 1 ? 's' : ''} for max bonus`;
    }
    
    return tooltip;
}

// Inject CSS for Wanted Poster effects (call this when module loads)
function injectWantedPosterCSS() {
    if (document.getElementById('wantedPosterStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'wantedPosterStyles';
    style.textContent = getWantedPosterStyles();
    document.head.appendChild(style);
}

// Initialize styles when module loads
if (typeof document !== 'undefined') {
    injectWantedPosterCSS();
}

// Default export with all functions
export default {
    recordKillWithVisualFeedback,
    calculateFormationWantedPosterBonuses,
    generateWantedPosterBonusHTML,
    getWantedPosterStyles,
    calculateWantedPosterBonus,
    getWantedPosterStats,
    heroHasWantedPoster,
    getWantedPosterCount,
    getDetailedKillBreakdown,
    generateWantedPosterTooltip
};