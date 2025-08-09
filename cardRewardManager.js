// cardRewardManager.js - Enhanced with Improved Redraw Button and Gold Display System

import { CardPreviewManager } from './cardPreviewManager.js';
import { getCardInfo, getAllAbilityCards, getHeroInfo } from './cardDatabase.js';
import { killTracker } from './killTracker.js';


import { calculateFormationWantedPosterBonuses, generateWantedPosterBonusHTML, getWantedPosterStyles } from './Artifacts/wantedPoster.js';

import ThievingManager from './Abilities/thieving.js';

export class CardRewardManager {
    constructor(deckManager, handManager, goldManager) {
        this.deckManager = deckManager;
        this.handManager = handManager;
        this.goldManager = goldManager;
        this.selectionMade = false;
        this.lastAddedRewardCard = null;
        this.heroSelection = null; // Set when showing rewards
        this.cardPreviewManager = new CardPreviewManager();
        
        // Store gold breakdown for display
        this.lastGoldBreakdown = null;
        
        // Initialize thieving manager
        this.thievingManager = new ThievingManager();
        
        // Define all available heroes and their card sets
        this.allHeroes = [
            { name: 'Alice', image: './Cards/Characters/Alice.png' },
            { name: 'Cecilia', image: './Cards/Characters/Cecilia.png' },
            { name: 'Darge', image: './Cards/Characters/Darge.png' },
            { name: 'Gon', image: './Cards/Characters/Gon.png' },
            { name: 'Ida', image: './Cards/Characters/Ida.png' },
            { name: 'Medea', image: './Cards/Characters/Medea.png' },
            { name: 'Monia', image: './Cards/Characters/Monia.png' },
            { name: 'Nicolas', image: './Cards/Characters/Nicolas.png' },
            { name: 'Semi', image: './Cards/Characters/Semi.png' },
            { name: 'Sid', image: './Cards/Characters/Sid.png' },
            { name: 'Tharx', image: './Cards/Characters/Tharx.png' },
            { name: 'Toras', image: './Cards/Characters/Toras.png' },
            { name: 'Vacarn', image: './Cards/Characters/Vacarn.png' }
        ];
        
        this.heroCardSets = {
            'Alice': ['CrumTheClassPet', 'DestructionMagic', 'Jiggles', 'LootThePrincess', 'MoonlightButterfly', 'PhoenixBombardment', 'RoyalCorgi', 'SummoningMagic'],
            'Cecilia': ['CrusadersArm-Cannon', 'CrusadersCutlass', 'CrusadersFlintlock', 'CrusadersHookshot', 'Leadership', 'TreasureChest', 'WantedPoster', 'Wealth'],
            'Darge': ['AngelfeatherArrow', 'BombArrow', 'FlameArrow', 'GoldenArrow', 'PoisonedArrow', 'RacketArrow', 'RainbowsArrow', 'RainOfArrows'],
            'Gon': ['BladeOfTheFrostbringer', 'Clone', 'Cold-HeartedYuki-Onna', 'FrostRune', 'HeartOfIce', 'Icebolt', 'IcyGrave', 'SnowCannon'],
            'Ida': ['BottledFlame', 'BurningSkeleton', 'MountainTearRiver', 'DestructionMagic', 'Fireball', 'Fireshield', 'FlameAvalanche', 'VampireOnFire'],
            'Medea': ['DecayMagic', 'PoisonedMeat', 'PoisonedWell', 'PoisonPollen', 'PoisonVial', 'ToxicFumes', 'ToxicTrap', 'VenomInfusion'],
            'Monia': ['CoolCheese', 'CoolnessOvercharge', 'CoolPresents', 'CrashLanding', 'GloriousRebirth', 'LifeSerum', 'TrialOfCoolness', 'UltimateDestroyerPunch'],
            'Nicolas': ['AlchemicJournal', 'Alchemy', 'BottledFlame', 'BottledLightning', 'BoulderInABottle', 'ExperimentalPotion', 'MonsterInABottle', 'PressedSkill'],
            'Semi': ['Adventurousness', 'ElixirOfImmortality', 'ElixirOfStrength', 'HealingMelody', 'MagneticGlove', 'Stoneskin', 'TreasureChest', 'TreasureHuntersBackpack'],
            'Sid': ['MagicAmethyst', 'MagicCobalt', 'MagicEmerald', 'MagicRuby', 'MagicSapphire', 'MagicTopaz', 'Thieving', 'ThievingStrike'],
            'Tharx': ['Archer', 'Cavalry', 'Challenge', 'FieldStandard', 'FrontSoldier', 'FuriousAnger', 'GuardChange', 'TharxianHorse'],
            'Toras': ['HeavyHit', 'LegendarySwordOfABarbarianKing', 'Overheat', 'SkullmaelsGreatsword', 'SwordInABottle', 'TheMastersSword', 'TheStormblade', 'TheSunSword'],
            'Vacarn': ['Necromancy', 'SkeletonArcher', 'SkeletonBard', 'SkeletonDeathKnight', 'SkeletonMage', 'SkeletonNecromancer', 'SkeletonReaper', 'SummoningMagic']
        };

        // Redraw system
        this.redrawCost = 1; // Starting cost
        this.totalRedraws = 0; // Track total redraws this session
        this.currentRewardCards = []; // Store current rewards for redraw
        this.currentRewardType = null; // 'cards' or 'heroes'
        this.isRedrawing = false; // Prevent multiple redraws at once

        // View mode system
        this.viewMode = 'rewards'; // 'rewards' or 'battlefield'

        console.log('CardRewardManager initialized with enhanced redraw, gold display, and Thieving system');
    }

    // Calculate and store gold breakdown for current battle result
    calculateGoldBreakdown(battleResult) {
        if (!battleResult || battleResult === undefined) {
            battleResult = this.detectBattleResultFromGoldManager();
        }
        
        const breakdown = {
            baseGold: 4,
            battleBonus: 0,
            wealthBonus: 0,
            wealthDetails: [],
            semiBonus: 0,
            thievingGained: 0,
            thievingLost: 0,
            thievingDetails: [],
            wantedPosterBonus: 0,
            wantedPosterDetails: [],
            total: 0
        };

        // Calculate battle result bonus
        switch (battleResult) {
            case 'victory':
                breakdown.battleBonus = 0;
                break;
            case 'defeat':
                breakdown.battleBonus = 2;
                break;
            case 'draw':
                breakdown.battleBonus = 1;
                break;
            default:
                breakdown.battleBonus = 1;
                break;
        }

        // Calculate wealth bonuses from current formation
        if (this.heroSelection && this.heroSelection.heroAbilitiesManager) {
            const formation = this.heroSelection.formationManager.getBattleFormation();
            
            ['left', 'center', 'right'].forEach(position => {
                const hero = formation[position];
                if (hero && this.heroSelection.heroAbilitiesManager) {
                    const abilities = this.heroSelection.heroAbilitiesManager.getHeroAbilities(position);
                    if (abilities) {
                        let wealthLevel = 0;
                        
                        // Count Wealth abilities across all zones
                        ['zone1', 'zone2', 'zone3'].forEach(zone => {
                            if (abilities[zone] && Array.isArray(abilities[zone])) {
                                const wealthCount = abilities[zone].filter(a => a && a.name === 'Wealth').length;
                                wealthLevel += wealthCount;
                            }
                        });
                        
                        if (wealthLevel > 0) {
                            const goldFromHero = wealthLevel * 4; // 4 gold per Wealth level
                            breakdown.wealthBonus += goldFromHero;
                            breakdown.wealthDetails.push({
                                heroName: hero.name,
                                level: wealthLevel,
                                gold: goldFromHero
                            });
                        }
                    }
                }
            });
        }

        // Check for Semi hero bonus
        if (this.heroSelection && this.heroSelection.formationManager) {
            const formation = this.heroSelection.formationManager.getBattleFormation();
            
            // Check if any hero in the formation is Semi
            const hasSemi = ['left', 'center', 'right'].some(position => {
                const hero = formation[position];
                return hero && hero.name === 'Semi';
            });
            
            if (hasSemi) {
                breakdown.semiBonus = 6;
            }
        }

        // Calculate thieving effects
        const thievingResult = this.thievingManager.calculateForRewards(this.heroSelection, this.goldManager);
        breakdown.thievingGained = thievingResult.thievingGained;
        breakdown.thievingLost = thievingResult.thievingLost;
        breakdown.thievingDetails = thievingResult.thievingDetails;

        // Calculate Wanted Poster bonuses using the module
        if (this.heroSelection && this.heroSelection.heroEquipmentManager) {
            const formation = this.heroSelection.formationManager.getBattleFormation();
            
            // Ensure we're passing the correct side ('player' for our heroes)
            const wantedPosterData = calculateFormationWantedPosterBonuses(
                formation,
                this.heroSelection.heroEquipmentManager,
                'player'  // Always 'player' since we're calculating our own rewards
            );
            
            breakdown.wantedPosterBonus = wantedPosterData.totalBonus;
            breakdown.wantedPosterDetails = wantedPosterData.details;
            
            // Log for debugging
            if (wantedPosterData.totalBonus > 0) {
                console.log('💰 Wanted Poster bonuses calculated:', wantedPosterData);
            }
        }
        
        // Calculate total
        breakdown.total = breakdown.baseGold + breakdown.battleBonus + breakdown.wealthBonus + 
                        breakdown.semiBonus + breakdown.thievingGained - breakdown.thievingLost +
                        breakdown.wantedPosterBonus;
        
        return breakdown;
    }

    // Enhanced show rewards method with gold breakdown
    async showRewardsAfterBattle(turnTracker, heroSelection, battleResult = 'victory') {
        // Reset redraw cost for new reward session
        this.redrawCost = 1;

        this.heroSelection = heroSelection;
        const currentTurn = turnTracker.getCurrentTurn();
        
        // IMPORTANT: Set game phase to Reward when showing rewards
        await this.heroSelection.setGamePhase('Reward');
        
        // Calculate gold breakdown for this battle BEFORE generating rewards
        this.lastGoldBreakdown = this.calculateGoldBreakdown(battleResult);
        
        // Store the gold breakdown in a local variable to ensure it's not lost
        const goldBreakdown = this.lastGoldBreakdown;
        
        // Check if this is a Hero reward turn
        const isHeroRewardTurn = currentTurn === 3 || currentTurn === 5;
        
        if (isHeroRewardTurn) {
            const rewardHeroes = this.generateHeroRewards(3);
            await this.savePendingRewards(rewardHeroes, true); // true = isHeroReward
            // Pass gold breakdown directly to ensure it's available
            setTimeout(() => {
                this.lastGoldBreakdown = goldBreakdown; // Restore it before display
                this.displayHeroRewardUI(rewardHeroes, currentTurn);
            }, 100);
        } else {
            const rewardCards = this.generateRewardCards(3);
            await this.savePendingRewards(rewardCards, false); // false = not hero reward
            // Pass gold breakdown directly to ensure it's available
            setTimeout(() => {
                this.lastGoldBreakdown = goldBreakdown; // Restore it before display
                this.displayRewardUI(rewardCards, currentTurn);
            }, 100);
        }
        
        return true;
    }

    // Create gold breakdown display HTML with total gold display - FIXED with debug logging
    createGoldBreakdownHTML() {
        if (!this.lastGoldBreakdown) {
            return `
                <div class="gold-breakdown-container">
                    <div class="gold-breakdown-header">
                        <div class="gold-icon">💰</div>  
                        <h3>Gold Earned</h3>
                    </div>
                    <div class="gold-breakdown-content-scrollable">
                        <div class="gold-line-item">
                            <span class="gold-source">No data available</span>
                            <span class="gold-arrow">→</span>
                            <span class="gold-amount">0</span>
                        </div>
                    </div>
                </div>
            `;
        }

        const breakdown = this.lastGoldBreakdown;
        
        // Calculate current total gold (current + pending - redraws)
        const currentGold = this.goldManager.getPlayerGold();
        const pendingGold = breakdown.total - (breakdown.redrawDeduction || 0);
        const totalGold = currentGold + pendingGold;
        
        return `
            <div class="gold-breakdown-container">
                <div class="gold-breakdown-header">
                    <div class="gold-icon">💰</div>  
                    <h3>Battle Rewards</h3>
                </div>
                
                <!-- SCROLLABLE CONTENT: Individual gold contributors -->
                <div class="gold-breakdown-content-scrollable">
                    <!-- Base Gold -->
                    <div class="gold-line-item">
                        <span class="gold-source">Base Reward</span>
                        <span class="gold-arrow">→</span>
                        <span class="gold-amount">${breakdown.baseGold}</span>
                    </div>
                    
                    <!-- Battle Result Bonus -->
                    <div class="gold-line-item ${breakdown.battleBonus > 1 ? 'victory-bonus' : 'participation-bonus'}">
                        <span class="gold-source">${this.getBattleResultLabel()}</span>
                        <span class="gold-arrow">→</span>
                        <span class="gold-amount">${breakdown.battleBonus}</span>
                    </div>
                    
                    <!-- Semi Hero Bonus -->
                    ${breakdown.semiBonus > 0 ? `
                        <div class="gold-line-item semi-bonus">
                            <span class="gold-source">Semi Effect</span>
                            <span class="gold-arrow">→</span>
                            <span class="gold-amount">${breakdown.semiBonus}</span>
                        </div>
                    ` : ''}
                    
                    <!-- Wealth Bonus Section -->
                    ${breakdown.wealthBonus > 0 ? `
                        <div class="gold-line-item wealth-bonus">
                            <span class="gold-source">Wealth (${breakdown.wealthDetails.reduce((sum, detail) => sum + detail.level, 0)} levels)</span>
                            <span class="gold-arrow">→</span>
                            <span class="gold-amount">${breakdown.wealthBonus}</span>
                        </div>
                        
                        <!-- Wealth Details -->
                        <div class="wealth-details">
                            ${breakdown.wealthDetails.map(detail => `
                                <div class="wealth-detail-line">
                                    <span class="hero-name">${detail.heroName}</span>
                                    <span class="wealth-level">${detail.level} ${detail.level === 1 ? 'level' : 'levels'}</span>
                                    <span class="wealth-gold">+${detail.gold}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <!-- Thieving Section -->
                    ${this.thievingManager.generateBreakdownHTML({
                        thievingGained: breakdown.thievingGained,
                        thievingLost: breakdown.thievingLost,
                        thievingDetails: breakdown.thievingDetails
                    })}

                    <!-- Wanted Poster Section (THIS IS THE KEY PART) -->
                    ${generateWantedPosterBonusHTML({ 
                        totalBonus: breakdown.wantedPosterBonus, 
                        details: breakdown.wantedPosterDetails 
                    })}
                    
                    <!-- Redraw Deduction (if any) -->
                    ${breakdown.redrawDeduction > 0 ? `
                        <div class="gold-line-item redraw-deduction">
                            <span class="gold-source">Redraws Used</span>
                            <span class="gold-arrow">→</span>
                            <span class="gold-amount">-${breakdown.redrawDeduction}</span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- FIXED TOTALS: Battle Total (non-scrollable) -->
                <div class="gold-breakdown-totals">
                    <div class="gold-total-line">
                        <span class="gold-total-label">Battle Total</span>
                        <span class="gold-arrow total-arrow">→</span>
                        <span class="gold-total-amount">${pendingGold} Gold</span>
                    </div>
                </div>
                
                <!-- Your Total Gold Display (non-scrollable) -->
                <div class="total-gold-display">
                    <div class="total-gold-header">
                        <span class="total-gold-icon">🏆</span>
                        <span class="total-gold-label">Your Total Gold</span>
                    </div>
                    <div class="total-gold-amount" id="totalGoldAmount">${totalGold}</div>
                    <div class="total-gold-breakdown">
                        <span class="current-gold">Current: ${currentGold}</span>
                        <span class="plus-sign">+</span>
                        <span class="pending-gold">Battle: ${pendingGold}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Helper to get battle result label
    getBattleResultLabel() {
        if (!this.lastGoldBreakdown) return 'Battle';
        
        const bonus = this.lastGoldBreakdown.battleBonus;
        if (bonus >= 2) return 'Loss';
        if (bonus === 1) return 'Draw';
        return 'Battle';
    }

    // Create view battlefield button HTML
    createViewBattlefieldButtonHTML() {
        const isShowingRewards = this.viewMode === 'rewards';
        const buttonText = isShowingRewards ? 'View Battlefield' : 'View Rewards';
        const buttonIcon = isShowingRewards ? '🔍' : '🎁';
        
        return `
            <div class="view-battlefield-button-container">
                <button class="view-battlefield-button" onclick="window.toggleRewardView()" id="viewToggleButton">
                    <span class="view-button-icon">${buttonIcon}</span>
                    <span class="view-button-text">${buttonText}</span>
                </button>
            </div>
        `;
    }

    // Enhanced redraw button HTML
    createRedrawButtonHTML() {
        const currentGold = this.goldManager.getPlayerGold();
        const pendingGold = this.lastGoldBreakdown ? (this.lastGoldBreakdown.total - (this.lastGoldBreakdown.redrawDeduction || 0)) : 0;
        const totalAvailableGold = currentGold + pendingGold;
        const canAfford = totalAvailableGold >= this.redrawCost;
        
        return `
            <div class="enhanced-redraw-container">
                <button class="enhanced-redraw-button ${!canAfford ? 'disabled' : ''}" 
                        onclick="window.handleRewardRedraw()"
                        ${!canAfford ? 'disabled' : ''}>
                    <div class="redraw-button-inner">
                        <div class="redraw-icon-container">
                            <span class="redraw-icon">🔄</span>
                        </div>
                        <div class="redraw-content">
                            <div class="redraw-title">Redraw Options</div>
                            <div class="redraw-subtitle">Get new ${this.currentRewardType === 'heroes' ? 'heroes' : 'cards'}</div>
                        </div>
                        <div class="redraw-cost-container">
                            <div class="cost-label">Cost</div>
                            <div class="cost-amount">
                                <span class="gold-icon">💰</span>
                                <span class="cost-number">${this.redrawCost}</span>
                            </div>
                        </div>
                    </div>
                </button>
                ${!canAfford ? `
                    <div class="redraw-insufficient-funds">
                        <span class="warning-icon">⚠️</span>
                        Need ${this.redrawCost - totalAvailableGold} more gold
                    </div>
                ` : `
                `}
            </div>
        `;
    }

    // Create dedicated card preview section
    createCardPreviewSection() {
        return `
            <div class="reward-card-preview-section">
                <div class="reward-card-preview-area" id="rewardCardPreview">
                    <div class="preview-placeholder">
                        <div class="preview-icon">👁️</div>
                        <p>Hover over any card to preview</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Create normal-sized hand display section
    createHandDisplaySection() {
        if (!this.handManager) {
            return '<div class="reward-hand-placeholder">Hand not available</div>';
        }

        // Use the same format card name function that heroSelection uses
        const formatCardName = this.heroSelection ? 
            (cardName) => this.heroSelection.formatCardName(cardName) :
            (cardName) => this.formatCardName(cardName);

        // Create hand display using the same method as team building screen
        const handDisplay = this.handManager.createHandDisplay(formatCardName);
        
        return `
            <div class="reward-hand-display-section-normal">
                <div class="reward-hand-content-normal">
                    ${handDisplay}
                </div>
            </div>
        `;
    }

    // Updated handleRedraw method to work with total gold - FIXED double deduction and timing
    async handleRedraw() {
        if (this.isRedrawing || this.selectionMade) {
            return;
        }
        
        // Calculate total available gold
        const currentGold = this.goldManager.getPlayerGold();
        const pendingGold = this.lastGoldBreakdown ? (this.lastGoldBreakdown.total - (this.lastGoldBreakdown.redrawDeduction || 0)) : 0;
        const totalAvailableGold = currentGold + pendingGold;
        
        if (totalAvailableGold < this.redrawCost) {
            this.showRedrawError(`Not enough gold! Need ${this.redrawCost} gold.`);
            return;
        }
        
        this.isRedrawing = true;
        
        // Show total gold change animation BEFORE making changes
        this.showTotalGoldChange(-this.redrawCost);
        
        // Deduct from current gold first, then from pending
        let goldToDeductFromCurrent = Math.min(currentGold, this.redrawCost);
        let goldToDeductFromPending = this.redrawCost - goldToDeductFromCurrent;
        
        // Update current gold if needed
        if (goldToDeductFromCurrent > 0) {
            const newGoldAmount = currentGold - goldToDeductFromCurrent;
            this.goldManager.setPlayerGold(newGoldAmount, 'redraw');
        }
        
        // Update pending gold ONLY if we needed to use pending gold
        if (goldToDeductFromPending > 0 && this.lastGoldBreakdown) {
            // Only track redraw deduction for the amount taken from pending gold
            this.lastGoldBreakdown.redrawDeduction = (this.lastGoldBreakdown.redrawDeduction || 0) + goldToDeductFromPending;
        }
        
        // Generate new rewards
        let newRewards;
        if (this.currentRewardType === 'heroes') {
            newRewards = this.generateHeroRewards(3);
        } else {
            newRewards = this.generateRewardCards(3);
        }
        
        // Update current rewards
        this.currentRewardCards = newRewards;
        
        // Animate the redraw
        await this.animateRedraw();
        
        // Update the display
        if (this.currentRewardType === 'heroes') {
            this.updateHeroRewardDisplay(newRewards);
        } else {
            this.updateCardRewardDisplay(newRewards);
        }
        
        // Increment redraw cost
        this.redrawCost++;
        this.totalRedraws++;
        
        // Update both gold breakdown and redraw button
        this.updateGoldBreakdownAfterRedraw();
        this.updateRedrawButton();
        
        // Save the pending rewards with the new cards
        await this.savePendingRewards(newRewards, this.currentRewardType === 'heroes');
        
        if (this.heroSelection) {
            await this.heroSelection.saveGameState();
        }
        
        this.isRedrawing = false;
    }

    // New method to show total gold change animation - FIXED calculation
    showTotalGoldChange(amount) {
        const totalGoldElement = document.getElementById('totalGoldAmount');
        if (!totalGoldElement) return;
        
        // Get the current total that's displayed
        const currentDisplayedTotal = parseInt(totalGoldElement.textContent) || 0;
        const newTotal = currentDisplayedTotal + amount;
        
        // Create change indicator
        const changeIndicator = document.createElement('div');
        changeIndicator.className = 'total-gold-change-indicator';
        changeIndicator.textContent = `${amount}`;
        changeIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            right: -80px;
            transform: translateY(-50%);
            color: ${amount < 0 ? '#ff6b6b' : '#4caf50'};
            font-size: 24px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            animation: totalGoldChangeSlide 2s ease-out forwards;
            z-index: 101;
        `;
        
        totalGoldElement.style.position = 'relative';
        totalGoldElement.appendChild(changeIndicator);
        
        // Flash the total gold number
        totalGoldElement.style.animation = 'totalGoldFlash 0.6s ease-out';
        setTimeout(() => {
            totalGoldElement.style.animation = '';
        }, 600);
        
        // Animate the number change to the new total
        this.animateTotalGoldCounter(totalGoldElement, newTotal);
        
        setTimeout(() => {
            changeIndicator.remove();
        }, 2000);
    }

    // Animate total gold counter
    animateTotalGoldCounter(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const difference = targetValue - startValue;
        const duration = 800;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (difference * easeOut));
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = targetValue;
            }
        };
        
        animate();
    }

    // Enhanced display reward UI with enhanced redraw button integration
    displayRewardUI(rewardCards, currentTurn) {
        // Store current rewards and type
        this.currentRewardCards = rewardCards;
        this.currentRewardType = 'cards';
        
        // Remove any existing reward overlay
        this.clearAnyActiveCardRewards();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'cardRewardOverlay';
        overlay.className = 'card-reward-overlay';
        overlay.innerHTML = `
            <div class="reward-container enhanced-with-gold-and-preview">
                <div class="reward-content-wrapper">
                    <div class="reward-left-section">
                        <div class="reward-header">
                            <h2>🎉 Battle Rewards</h2>
                            <p>Choose one card to add to your deck (Turn ${currentTurn})</p>
                            ${this.createViewBattlefieldButtonHTML()}
                        </div>
                        
                        <div class="reward-main-content toggleable-content">
                            <!-- Gold Breakdown with integrated redraw button -->
                            <div class="gold-and-redraw-section">
                                ${this.createGoldBreakdownHTML()}
                                ${this.createRedrawButtonHTML()}
                            </div>
                            
                            <!-- Reward Cards (Center) -->
                            <div class="reward-cards enhanced-cards" id="rewardCardsContainer">
                                ${rewardCards.map((card, index) => this.createRewardCardHTML(card, index)).join('')}
                            </div>
                        </div>
                        
                        <!-- Hand Display Section -->
                        <div class="toggleable-content">
                            ${this.createHandDisplaySection()}
                        </div>
                    </div>
                    
                    <!-- Card Preview (Right) -->
                    <div class="reward-right-section toggleable-content">
                        ${this.createCardPreviewSection()}
                    </div>
                </div>
            </div>
        `;
        
        // Add styles if not already present
        this.ensureRewardStyles();
        
        // Prevent body scrolling
        document.body.classList.add('reward-overlay-active');
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Add click handlers and tooltip functionality
        rewardCards.forEach((card, index) => {
            const cardElement = overlay.querySelector(`[data-reward-index="${index}"]`);
            if (cardElement) {
                // Click handler for selection
                cardElement.addEventListener('click', () => this.handleCardSelection(card.name));
                
                // Enhanced tooltip handlers for dedicated preview area
                const cardImage = cardElement.querySelector('.reward-card-image');
                if (cardImage) {
                    // Prepare card data for tooltip
                    const cardData = {
                        imagePath: card.image,
                        displayName: this.formatCardName(card.name),
                        cardType: card.cardType
                    };
                    
                    cardImage.addEventListener('mouseenter', () => {
                        this.cardPreviewManager.showCardTooltip(cardData, cardImage);
                    });
                    
                    cardImage.addEventListener('mouseleave', () => {
                        this.cardPreviewManager.hideCardTooltip();
                    });
                }
            }
        });
        
        // Animate in
        overlay.style.animation = 'fadeIn 0.3s ease-out';
        
        // Set up global toggle function
        this.setupGlobalToggleFunction();
    }

    // Enhanced display Hero reward UI with enhanced redraw button integration
    displayHeroRewardUI(rewardHeroes, currentTurn) {
        // Store current rewards and type
        this.currentRewardCards = rewardHeroes;
        this.currentRewardType = 'heroes';
        
        // Remove any existing reward overlay
        this.clearAnyActiveCardRewards();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'cardRewardOverlay';
        overlay.className = 'card-reward-overlay';
        overlay.innerHTML = `
            <div class="reward-container enhanced-with-gold-and-preview" data-reward-type="hero">
                <div class="reward-content-wrapper">
                    <div class="reward-left-section">
                        <div class="reward-header">
                            <h2>🦸 Epic Hero Rewards!</h2>
                            <p>Choose one Hero to join your roster (Turn ${currentTurn})</p>
                            ${currentTurn === 3 ? '<div class="special-reward-indicator turn-3">⚔️ Turn 3 Special Reward</div>' : ''}
                            ${currentTurn === 5 ? '<div class="special-reward-indicator turn-5">🏆 Turn 5 Epic Reward</div>' : ''}
                            ${this.createViewBattlefieldButtonHTML()}
                        </div>
                        
                        <div class="reward-main-content toggleable-content">
                            <!-- Gold Breakdown with integrated redraw button -->
                            <div class="gold-and-redraw-section">
                                ${this.createGoldBreakdownHTML()}
                                ${this.createRedrawButtonHTML()}
                            </div>
                            
                            <!-- Hero Rewards (Center) -->
                            <div class="hero-reward-selection enhanced-hero-selection">
                                ${rewardHeroes.map((hero, index) => this.createHeroRewardHTML(hero, index)).join('')}
                            </div>
                        </div>
                        
                        <!-- Hand Display Section -->
                        <div class="toggleable-content">
                            ${this.createHandDisplaySection()}
                        </div>
                    </div>
                    
                    <!-- Card Preview (Right) -->
                    <div class="reward-right-section toggleable-content">
                        ${this.createCardPreviewSection()}
                    </div>
                </div>
            </div>
        `;
        
        // Add styles if not already present
        this.ensureRewardStyles();
        
        // Prevent body scrolling
        document.body.classList.add('reward-overlay-active');
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Add click handlers and tooltip functionality
        rewardHeroes.forEach((hero, index) => {
            const heroElement = overlay.querySelector(`[data-reward-index="${index}"]`);
            if (heroElement) {
                // Click handler for selection
                heroElement.addEventListener('click', () => this.handleHeroSelection(hero.name));
                
                // Enhanced tooltip handlers for dedicated preview area
                const heroImage = heroElement.querySelector('.hero-card-image');
                if (heroImage) {
                    // Prepare hero data for tooltip
                    const heroData = {
                        imagePath: hero.image,
                        displayName: hero.name,
                        cardType: 'character'
                    };
                    
                    heroImage.addEventListener('mouseenter', () => {
                        this.cardPreviewManager.showCardTooltip(heroData, heroImage);
                    });
                    
                    heroImage.addEventListener('mouseleave', () => {
                        this.cardPreviewManager.hideCardTooltip();
                    });
                }
            }
        });
        
        // Animate in
        overlay.style.animation = 'fadeIn 0.3s ease-out';
        
        // Set up global toggle function
        this.setupGlobalToggleFunction();
    }

    // Toggle between rewards view and battlefield view
    async toggleRewardView() {
        const previousMode = this.viewMode;
        this.viewMode = this.viewMode === 'rewards' ? 'battlefield' : 'rewards';
        
        console.log(`🔄 Toggling view from ${previousMode} to ${this.viewMode}`);
        
        // Update button
        this.updateViewToggleButton();
        
        // Toggle visibility of reward elements
        const toggleableElements = document.querySelectorAll('.toggleable-content');
        const overlay = document.getElementById('cardRewardOverlay');
        
        if (this.viewMode === 'battlefield') {
            console.log('🔍 Switching to battlefield view...');
            
            // Hide reward elements and make overlay transparent
            toggleableElements.forEach(el => {
                el.style.display = 'none';
            });
            if (overlay) {
                overlay.classList.add('battlefield-mode');
            }
            
            // ✅ ENHANCED: Try to show battle arena with recovery
            const battleArena = document.getElementById('battleArena');
            if (battleArena) {
                battleArena.style.display = 'block';
                console.log('🔍 Battle arena found and shown for battlefield view');
                console.log('🔍 Battle arena innerHTML length:', battleArena.innerHTML.length);
                console.log('🔍 Battle arena classes:', battleArena.className);
            } else {
                console.warn('⚠️ Battle arena not found - attempting recovery...');
                console.log('🔍 Available elements with battle-related IDs:');
                ['battleArena', 'gameScreen', 'battleField', 'battle-arena'].forEach(id => {
                    const element = document.getElementById(id);
                    console.log(`🔍 ${id}:`, element ? 'EXISTS' : 'NOT FOUND');
                });
                
                // Try to find battle arena by class name
                const battleArenaByClass = document.querySelector('.battle-arena');
                if (battleArenaByClass) {
                    console.log('🔍 Found battle arena by class name');
                    battleArenaByClass.style.display = 'block';
                } else {
                    console.log('🔍 No battle arena found by class name either');
                    
                    // ✅ NEW: Attempt to recover by initializing battle screen
                    const recoverySuccess = await this.attemptBattleScreenRecovery();
                    
                    if (recoverySuccess) {
                        const recoveredArena = document.getElementById('battleArena');
                        if (recoveredArena) {
                            recoveredArena.style.display = 'block';
                            console.log('✅ Battle screen recovery successful!');
                        } else {
                            console.error('❌ Battle screen recovery failed - no arena found after recovery');
                            this.showBattleViewError();
                        }
                    } else {
                        console.error('❌ Could not recover battle screen');
                        this.showBattleViewError();
                    }
                }
            }
            
        } else {
            console.log('🎁 Switching to rewards view...');
            
            // Show reward elements and restore overlay
            toggleableElements.forEach(el => {
                el.style.display = '';
            });
            if (overlay) {
                overlay.classList.remove('battlefield-mode');
            }
            
            // Hide the battle arena
            const battleArena = document.getElementById('battleArena');
            if (battleArena) {
                battleArena.style.display = 'none';
                console.log('🎁 Battle arena hidden for rewards view');
            } else {
                console.log('🎁 No battle arena to hide (not found)');
            }
        }
        
        // Save the view mode state
        this.saveViewModeState();
        
        console.log(`✅ Successfully switched to ${this.viewMode} view`);
    }

    // Attempt to recover battle screen when missing
    async attemptBattleScreenRecovery() {
        console.log('🔧 Attempting to recover missing battle screen...');
        
        if (!this.heroSelection) {
            console.error('❌ No heroSelection available for recovery');
            return false;
        }
        
        try {
            // Use the same method we added for ensuring battle screen initialization
            const recoverySuccess = await this.ensureBattleScreenInitialized(this.heroSelection);
            
            if (recoverySuccess) {
                console.log('✅ Battle screen recovery completed');
                return true;
            } else {
                console.error('❌ Battle screen recovery failed');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error during battle screen recovery:', error);
            return false;
        }
    }

    // Show user-friendly error for battle view
    showBattleViewError() {
        // Switch back to rewards view
        this.viewMode = 'rewards';
        this.updateViewToggleButton();
        
        // Show reward elements again
        const toggleableElements = document.querySelectorAll('.toggleable-content');
        const overlay = document.getElementById('cardRewardOverlay');
        
        toggleableElements.forEach(el => {
            el.style.display = '';
        });
        if (overlay) {
            overlay.classList.remove('battlefield-mode');
        }
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'battle-view-error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <div class="error-text">
                    <h4>Battlefield View Unavailable</h4>
                    <p>The battle view isn't available right now. This can happen after reconnecting to the game.</p>
                    <p>You can still select your reward cards normally.</p>
                </div>
                <button class="error-close-btn" onclick="this.parentElement.parentElement.remove()">Got it</button>
            </div>
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 20px;
            border-radius: 12px;
            z-index: 10001;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            max-width: 400px;
            animation: fadeIn 0.3s ease-out;
        `;
        
        // Add styles for error content
        const errorStyle = document.createElement('style');
        errorStyle.textContent = `
            .error-content {
                display: flex;
                align-items: flex-start;
                gap: 15px;
            }
            .error-icon {
                font-size: 24px;
                flex-shrink: 0;
            }
            .error-text h4 {
                margin: 0 0 10px 0;
                font-size: 16px;
            }
            .error-text p {
                margin: 0 0 8px 0;
                font-size: 14px;
                line-height: 1.4;
            }
            .error-close-btn {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 10px;
                transition: background 0.2s ease;
            }
            .error-close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
        `;
        
        document.head.appendChild(errorStyle);
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
            if (errorStyle.parentElement) {
                errorStyle.remove();
            }
        }, 10000);
    }
    
    // Update the view toggle button text and icon
    updateViewToggleButton() {
        const button = document.getElementById('viewToggleButton');
        if (!button) return;
        
        const isShowingRewards = this.viewMode === 'rewards';
        const buttonText = isShowingRewards ? 'View Battlefield' : 'View Rewards';
        const buttonIcon = isShowingRewards ? '🔍' : '🎁';
        
        const iconElement = button.querySelector('.view-button-icon');
        const textElement = button.querySelector('.view-button-text');
        
        if (iconElement) iconElement.textContent = buttonIcon;
        if (textElement) textElement.textContent = buttonText;
    }
    
    // Set up global toggle function for button
    setupGlobalToggleFunction() {
        // Store reference to this instance for global access
        if (typeof window !== 'undefined') {
            window.toggleRewardView = () => {
                this.toggleRewardView();
            };
        }
    }

    // Apply battlefield mode without toggling (for restoration)
    applyBattlefieldMode() {
        if (this.viewMode !== 'battlefield') {
            console.log('🔍 Not applying battlefield mode - current mode is:', this.viewMode);
            return;
        }
        
        console.log('🔍 Applying battlefield mode from saved state...');
        
        // Update button
        this.updateViewToggleButton();
        
        // Hide reward elements and make overlay transparent
        const toggleableElements = document.querySelectorAll('.toggleable-content');
        const overlay = document.getElementById('cardRewardOverlay');
        
        console.log('🔍 Found', toggleableElements.length, 'toggleable elements to hide');
        
        toggleableElements.forEach(el => {
            el.style.display = 'none';
        });
        
        if (overlay) {
            overlay.classList.add('battlefield-mode');
            console.log('🔍 Added battlefield-mode class to overlay');
        } else {
            console.warn('⚠️ Reward overlay not found when applying battlefield mode');
        }
        
        // Show the battle arena for battlefield mode
        const battleArena = document.getElementById('battleArena');
        if (battleArena) {
            battleArena.style.display = 'block';
            console.log('✅ Applied battlefield mode - battle arena shown');
            console.log('🔍 Battle arena innerHTML length:', battleArena.innerHTML.length);
        } else {
            console.warn('⚠️ Battle arena not found when applying battlefield mode');
            console.log('🔍 Searching for battle arena alternatives...');
            
            // Search for battle arena by class
            const battleArenaByClass = document.querySelector('.battle-arena');
            if (battleArenaByClass) {
                battleArenaByClass.id = 'battleArena'; // Ensure it has the right ID
                battleArenaByClass.style.display = 'block';
                console.log('✅ Found and showed battle arena by class name');
            } else {
                console.error('❌ No battle arena found by ID or class name');
                
                // List all elements that might be the battle arena
                const gameScreen = document.getElementById('gameScreen');
                if (gameScreen) {
                    console.log('🔍 Children of gameScreen:', 
                        Array.from(gameScreen.children).map(child => ({
                            tagName: child.tagName,
                            id: child.id,
                            className: child.className,
                            display: child.style.display
                        }))
                    );
                }
            }
        }
        
        console.log('✅ Battlefield mode application completed');
    }

    // Save view mode state to local storage and pending rewards
    async saveViewModeState() {
        // Save to local storage for immediate persistence
        try {
            localStorage.setItem('rewardViewMode', this.viewMode);
        } catch (error) {
            console.warn('Could not save view mode to localStorage:', error);
        }
        
        // Save to Firebase with pending rewards
        if (this.heroSelection && this.heroSelection.roomManager) {
            try {
                const roomRef = this.heroSelection.roomManager.getRoomRef();
                if (!roomRef) return;
                
                const isHost = this.heroSelection.isHost;
                const rewardKey = isHost ? 'hostPendingRewards' : 'guestPendingRewards';
                
                // Update the viewMode in existing pending rewards
                await roomRef.child('gameState').child(rewardKey).child('viewMode').set(this.viewMode);
                console.log(`Saved view mode "${this.viewMode}" to Firebase`);
                
            } catch (error) {
                console.warn('Could not save view mode to Firebase:', error);
            }
        }
    }
    
    // Restore view mode state
    restoreViewModeState() {
        // Try to restore from local storage first
        try {
            const savedMode = localStorage.getItem('rewardViewMode');
            if (savedMode && (savedMode === 'rewards' || savedMode === 'battlefield')) {
                this.viewMode = savedMode;
                console.log(`Restored view mode "${this.viewMode}" from localStorage`);
            }
        } catch (error) {
            console.warn('Could not restore view mode from localStorage:', error);
        }
        
        // Apply the restored view mode
        if (this.viewMode === 'battlefield') {
            // Delay to ensure DOM is ready
            setTimeout(() => {
                this.toggleRewardView();
            }, 100);
        }
    }

    // Enhanced reward styles with updated redraw button and total gold display
    ensureRewardStyles() {
        if (document.getElementById('cardRewardStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'cardRewardStyles';
        style.textContent = `
            .card-reward-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
            }
            
            /* Prevent body scrolling when reward overlay is active */
            body.reward-overlay-active {
                overflow: hidden !important;
            }
            
            /* Battlefield mode - make overlay completely transparent and hide reward elements */
            .card-reward-overlay.battlefield-mode {
                background: transparent !important;
                backdrop-filter: none !important;
                pointer-events: none !important; /* Allow clicking through to battlefield */
            }
            
            .card-reward-overlay.battlefield-mode .reward-container {
                pointer-events: auto !important; /* Keep button clickable */
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }
            
            /* Hide only the text content in reward header, keep the button container */
            .card-reward-overlay.battlefield-mode .reward-header h2,
            .card-reward-overlay.battlefield-mode .reward-header p,
            .card-reward-overlay.battlefield-mode .special-reward-indicator {
                display: none !important;
            }
            
            /* Keep the reward header container visible but transparent */
            .card-reward-overlay.battlefield-mode .reward-header {
                background: transparent !important;
                pointer-events: none !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            
            /* Hide the main reward content sections */
            .card-reward-overlay.battlefield-mode .reward-main-content,
            .card-reward-overlay.battlefield-mode .reward-hand-display-section-normal,
            .card-reward-overlay.battlefield-mode .reward-right-section {
                opacity: 0 !important;
                pointer-events: none !important;
                position: absolute !important;
                top: -9999px !important;
            }
            
            /* Ensure the view button container remains visible and clickable */
            .card-reward-overlay.battlefield-mode .view-battlefield-button-container {
                pointer-events: auto !important;
                display: block !important;
                position: fixed !important;
                z-index: 10002 !important;
            }
            
            .reward-container.enhanced-with-gold-and-preview {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 3px solid #667eea;
                border-radius: 20px;
                padding: 40px;
                max-width: 1600px; /* INCREASED to accommodate preview area */
                width: 98%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
                max-height: 95vh;
                overflow: hidden; /* Changed from overflow-y: auto to prevent scrolling */
                display: flex;
                flex-direction: column;
            }
            
            .reward-container[data-reward-type="hero"].enhanced-with-gold-and-preview {
                border: 3px solid rgba(40, 167, 69, 0.6);
                background: linear-gradient(135deg, rgba(40, 167, 69, 0.02), rgba(32, 201, 151, 0.02));
                max-width: 1800px; /* EXTRA WIDTH for hero rewards with preview */
            }
            
            .reward-content-wrapper {
                display: flex;
                gap: 25px;
                height: 100%;
            }
            
            .reward-left-section {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            .reward-main-content {
                display: flex;
                gap: 25px; /* Reduced gap to fit 3 sections */
                align-items: flex-start;
                margin-bottom: 30px;
                justify-content: space-between;
                flex: 1;
                min-height: 0; /* Allow flexbox to shrink */
                overflow: hidden;
            }
            
            /* Gold and Redraw Section Layout */
            .gold-and-redraw-section {
                flex: 0 0 320px; /* Increased width to accommodate larger redraw button */
                display: flex;
                flex-direction: column;
                gap: 0; /* Remove gap since redraw button is now inside gold container */
            }
            
            /* Gold Breakdown Styles */
            .gold-breakdown-container {
                background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1));
                border: 2px solid rgba(255, 193, 7, 0.4);
                border-radius: 15px;
                padding: 18px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 25px rgba(255, 193, 7, 0.2);
            }
            
            .gold-breakdown-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 18px;
                padding-bottom: 12px;
                border-bottom: 2px solid rgba(255, 193, 7, 0.3);
            }
            
            .gold-breakdown-header .gold-icon {
                font-size: 24px;
                animation: goldIconFloat 3s ease-in-out infinite;
            }
            
            .gold-breakdown-header h3 {
                margin: 0;
                font-size: 1.3rem;
                font-weight: 800;
                color: #ffd700;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            }
            
            .gold-breakdown-content {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .gold-line-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 10px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 193, 7, 0.2);
                transition: all 0.3s ease;
            }
            
            .gold-line-item:hover {
                background: rgba(255, 193, 7, 0.1);
                border-color: rgba(255, 193, 7, 0.4);
                transform: translateX(3px);
            }
            
            .gold-line-item.victory-bonus {
                background: rgba(76, 175, 80, 0.1);
                border-color: rgba(76, 175, 80, 0.4);
            }
            
            .gold-line-item.participation-bonus {
                background: rgba(102, 126, 234, 0.1);
                border-color: rgba(102, 126, 234, 0.4);
            }
            
            .gold-line-item.wealth-bonus {
                background: rgba(156, 39, 176, 0.1);
                border-color: rgba(156, 39, 176, 0.4);
            }

            .gold-line-item.semi-bonus {
                background: rgba(64, 224, 208, 0.1);  /* Turquoise background for Semi */
                border-color: rgba(64, 224, 208, 0.4);
            }
            
            .gold-line-item.redraw-deduction {
                background: rgba(255, 107, 107, 0.1);
                border-color: rgba(255, 107, 107, 0.4);
            }
            
            .gold-line-item.redraw-deduction .gold-amount {
                color: #ff6b6b;
            }
            
            .gold-source {
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
                font-size: 0.9rem;
            }
            
            .gold-arrow {
                color: rgba(255, 193, 7, 0.8);
                font-weight: bold;
                font-size: 1rem;
            }
            
            .gold-amount {
                font-weight: 700;
                color: #ffd700;
                font-size: 0.95rem;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            /* Wealth Details */
            .wealth-details {
                margin-left: 12px;
                padding-left: 12px;
                border-left: 2px solid rgba(156, 39, 176, 0.3);
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .wealth-detail-line {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 3px 6px;
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(156, 39, 176, 0.05);
                border-radius: 4px;
            }
            
            .hero-name {
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .wealth-level {
                font-size: 0.75rem;
                color: rgba(156, 39, 176, 0.8);
            }
            
            .wealth-gold {
                font-weight: 600;
                color: #ffd700;
            }
            
            /* Total Line */
            .gold-total-line {
                margin-top: 12px;
                padding: 10px 12px;
                background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2));
                border: 2px solid rgba(255, 193, 7, 0.6);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);
            }
            
            .gold-total-label {
                font-size: 1rem;
                font-weight: 800;
                color: #fff;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .total-arrow {
                font-size: 1.2rem;
                color: #ffd700;
            }
            
            .gold-total-amount {
                font-size: 1.1rem;
                font-weight: 900;
                color: #ffd700;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            }
            
            /* Total Gold Display Styles */
            .total-gold-display {
                margin-top: 20px;
                padding: 15px;
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 193, 7, 0.15));
                border: 2px solid rgba(255, 215, 0, 0.6);
                border-radius: 12px;
                backdrop-filter: blur(10px);
                box-shadow: 0 6px 20px rgba(255, 215, 0, 0.25);
            }
            
            .total-gold-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .total-gold-icon {
                font-size: 20px;
                animation: goldIconFloat 3s ease-in-out infinite;
            }
            
            .total-gold-label {
                font-size: 14px;
                font-weight: bold;
                color: #fff;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .total-gold-amount {
                font-size: 32px;
                font-weight: 900;
                color: #ffd700;
                text-align: center;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                position: relative;
                margin-bottom: 8px;
            }
            
            .total-gold-breakdown {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
            }
            
            .current-gold,
            .pending-gold {
                padding: 2px 6px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
            }
            
            .plus-sign {
                color: #4caf50;
                font-weight: bold;
                font-size: 14px;
            }
            
            /* Enhanced Redraw Button Styles */
            .enhanced-redraw-container {
                margin-top: 15px;
                width: 100%;
            }
            
            .enhanced-redraw-button {
                width: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 0;
                border-radius: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                position: relative;
                overflow: hidden;
                min-height: 80px;
            }
            
            .enhanced-redraw-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.6s ease;
            }
            
            .enhanced-redraw-button:hover:not(.disabled)::before {
                left: 100%;
            }
            
            .enhanced-redraw-button:hover:not(.disabled) {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(102, 126, 234, 0.5);
                background: linear-gradient(135deg, #7c8cff 0%, #8b5fbf 100%);
            }
            
            .enhanced-redraw-button:active:not(.disabled) {
                transform: translateY(0);
            }
            
            .enhanced-redraw-button.disabled {
                background: linear-gradient(135deg, #636e72 0%, #2d3436 100%);
                cursor: not-allowed;
                opacity: 0.7;
                box-shadow: 0 4px 15px rgba(99, 110, 114, 0.3);
            }
            
            .redraw-button-inner {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                position: relative;
                z-index: 1;
            }
            
            .redraw-icon-container {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 48px;
                height: 48px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                backdrop-filter: blur(10px);
            }
            
            .redraw-icon {
                font-size: 24px;
                animation: none;
                transition: transform 0.3s ease;
            }
            
            .enhanced-redraw-button:hover:not(.disabled) .redraw-icon {
                animation: spin 1s ease-in-out;
                transform: scale(1.1);
            }
            
            .redraw-content {
                flex: 1;
                text-align: center;
                margin: 0 16px;
            }
            
            .redraw-title {
                font-size: 18px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                margin-bottom: 4px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .redraw-subtitle {
                font-size: 12px;
                opacity: 0.9;
                font-weight: normal;
                text-transform: none;
                letter-spacing: 0.5px;
            }
            
            .redraw-cost-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            
            .cost-label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
                opacity: 0.8;
                font-weight: 600;
            }
            
            .cost-amount {
                display: flex;
                align-items: center;
                gap: 6px;
                background: rgba(0, 0, 0, 0.3);
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 16px;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .cost-amount .gold-icon {
                font-size: 18px;
                filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.6));
            }
            
            .cost-number {
                font-weight: 900;
                font-size: 18px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
            
            .redraw-insufficient-funds {
                margin-top: 12px;
                padding: 8px 12px;
                background: rgba(244, 67, 54, 0.15);
                border: 1px solid rgba(244, 67, 54, 0.4);
                border-radius: 8px;
                color: #ff6b6b;
                font-size: 14px;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .redraw-hint-success {
                margin-top: 12px;
                padding: 8px 12px;
                background: rgba(76, 175, 80, 0.15);
                border: 1px solid rgba(76, 175, 80, 0.4);
                border-radius: 8px;
                color: #4caf50;
                font-size: 14px;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .warning-icon,
            .hint-icon {
                font-size: 16px;
            }
            
            /* Enhanced Card Layout - CENTER SECTION */
            .reward-cards.enhanced-cards {
                flex: 1; /* Take available space between gold and preview */
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: nowrap;
                min-width: 0;
                max-width: none;
            }
            
            .hero-reward-selection.enhanced-hero-selection {
                flex: 1; /* Take available space between gold and preview */
                display: flex;
                gap: 12px;
                justify-content: center;
                align-items: flex-start;
                flex-wrap: nowrap;
                min-width: 0;
                max-width: none;
            }
            
            /* Card Preview Section (RIGHT) */
            .reward-card-preview-section {
                flex: 0 0 380px; /* INCREASED width from 280px to 380px */
                background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.05) 0%, 
                    rgba(102, 126, 234, 0.1) 100%);
                border: 2px solid rgba(102, 126, 234, 0.3);
                border-radius: 15px;
                padding: 8px; /* REDUCED padding to maximize card space */
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
            }
            
            .reward-card-preview-area {
                flex: 1;
                display: flex;
                align-items: flex-start; /* CHANGED from center to flex-start */
                justify-content: center;
                padding-top: 0%; 
                border-radius: 10px;
                background: linear-gradient(135deg, 
                    rgba(0, 0, 0, 0.2) 0%, 
                    rgba(0, 0, 0, 0.1) 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                min-height: 500px; /* INCREASED from 400px to 500px */
            }
            
            .reward-card-preview-area .preview-placeholder {
                text-align: center;
                color: rgba(255, 255, 255, 0.6);
                padding: 20px;
            }
            
            .reward-card-preview-area .preview-icon {
                font-size: 48px;
                margin-bottom: 10px;
                opacity: 0.7;
            }
            
            .reward-card-preview-area .preview-placeholder p {
                font-size: 14px;
                margin: 0;
                font-style: italic;
            }
            
            .reward-card-preview-area .preview-card-display {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 8px; /* REDUCED padding to maximize card size */
                justify-content: center;
            }
            
            .reward-card-preview-area .preview-card-image {
                width: 100%;
                max-width: 340px; /* INCREASED from 240px to 340px */
                height: auto;
                max-height: 85%; /* INCREASED from 70% to 85% */
                object-fit: contain;
                border-radius: 15px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
                border: 3px solid rgba(102, 126, 234, 0.6);
                transition: transform 0.2s ease;
            }
            
            .reward-card-preview-area .preview-card-image:hover {
                transform: scale(1.02);
            }
            
            /* NORMAL Hand Display Section Styles */
            .reward-hand-display-section-normal {
                margin: 20px 0 15px 0; /* Position after main content */
                padding: 15px 20px; /* Normal padding */
                background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.03) 0%, 
                    rgba(76, 175, 80, 0.08) 100%);
                border: 2px solid rgba(76, 175, 80, 0.3); /* Normal border */
                border-radius: 15px; /* Normal border radius */
                backdrop-filter: blur(10px);
            }
            
            .reward-hand-content-normal {
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            /* NORMAL hand display overrides */
            .reward-hand-display-section-normal .hand-display-container {
                width: 100%;
                max-width: none;
                margin: 0;
            }
            
            .reward-hand-display-section-normal .hand-container {
                background: rgba(0, 0, 0, 0.2); /* Normal transparency */
                border: 1px solid rgba(76, 175, 80, 0.2);
                border-radius: 10px; /* Normal border radius */
                padding: 15px; /* Normal padding */
                margin: 0;
            }
            
            .reward-hand-display-section-normal .hand-cards {
                display: flex !important; /* Force horizontal layout */
                flex-direction: row !important; /* Ensure row direction */
                justify-content: center !important;
                align-items: center !important;
                gap: 8px !important; /* Normal gap between cards */
                flex-wrap: wrap !important; /* Allow wrapping if needed */
            }
            
            /* NORMAL SIZE hand cards for reward screen */
            .reward-hand-display-section-normal .hand-card {
                width: 120px !important; /* Direct width control */
                height: auto !important;
                min-width: 120px !important;
                max-width: 120px !important;
                opacity: 0.9;
                transition: all 0.3s ease;
                margin: 0 4px; /* Small margin between cards */
                display: inline-block !important;
                flex-shrink: 0;
            }
            
            .reward-hand-display-section-normal .hand-card:hover {
                opacity: 1;
                transform: translateY(-5px); /* Only lift on hover, no scaling */
                box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
                z-index: 10;
            }
            
            .reward-hand-display-section-normal .hand-card-image {
                width: 100% !important;
                height: 168px !important; /* Direct height control */
                object-fit: cover !important;
                border-radius: 8px !important;
            }
            
            .reward-hand-display-section-normal .hand-card-name {
                font-size: 12px !important; /* Direct font size control */
                padding: 4px !important;
                line-height: 1.2 !important;
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
            }
            
            /* Existing reward card styles */
            .reward-card {
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(102, 126, 234, 0.3);
                border-radius: 15px;
                padding: 18px;
                transition: all 0.3s ease;
                cursor: pointer;
                flex: 1;
                max-width: 240px;
                min-width: 200px;
            }
            
            .reward-card:hover {
                transform: translateY(-10px);
                border-color: rgba(102, 126, 234, 0.8);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            }
            
            .reward-card-inner {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
            }
            
            .reward-card-image, .hero-card-image {
                width: 160px;
                height: 224px;
                object-fit: cover;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .reward-card-image:hover, .hero-card-image:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 12px rgba(102, 126, 234, 0.5);
            }
            
            .hero-card-image {
                border: 2px solid rgba(40, 167, 69, 0.3);
            }
            
            .hero-card-image:hover {
                border-color: rgba(40, 167, 69, 0.6);
                box-shadow: 0 6px 12px rgba(40, 167, 69, 0.5);
            }
            
            .reward-card-info {
                text-align: center;
                color: white;
            }
            
            .reward-card-name {
                font-size: 1.1rem;
                margin: 0 0 5px 0;
                color: #fff;
            }
            
            .reward-card-type {
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.7);
                margin: 0;
            }
            
            .ability-hint {
                color: #6c757d;
                font-size: 13px;
                font-style: italic;
                margin-top: 4px;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .ability-hint::before {
                content: '⚡';
                font-style: normal;
                color: #ffc107;
            }
            
            .reward-card-button {
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                border: none;
                padding: 10px 25px;
                border-radius: 25px;
                font-size: 0.95rem;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .reward-card-button:hover:not(:disabled) {
                transform: scale(1.05);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.6);
            }
            
            .reward-container[data-reward-type="hero"] .reward-card {
                border-color: rgba(40, 167, 69, 0.3);
                flex: 1;
                max-width: 220px;
                min-width: 180px;
            }
            
            .reward-container[data-reward-type="hero"] .reward-card:hover {
                border-color: rgba(40, 167, 69, 0.8);
                box-shadow: 0 10px 30px rgba(40, 167, 69, 0.4);
            }
            
            .reward-container[data-reward-type="hero"] .reward-card-button {
                background: linear-gradient(45deg, #28a745, #20c997);
            }
            
            .reward-container[data-reward-type="hero"] .reward-card-button:hover:not(:disabled) {
                box-shadow: 0 5px 15px rgba(40, 167, 69, 0.6);
            }
            
            .reward-card-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .reward-card-button.selected {
                background: linear-gradient(45deg, #4caf50, #66bb6a);
            }
            
            .selection-success {
                animation: successPulse 0.5s ease-out;
            }
            
            .reward-header {
                text-align: center;
                margin-bottom: 15px;
                position: relative;
            }
            
            .reward-header h2 {
                font-size: 2.3rem;
                margin: 0 0 10px 0;
                background: linear-gradient(45deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .reward-container[data-reward-type="hero"] .reward-header h2 {
                background: linear-gradient(45deg, #28a745, #20c997, #17a2b8);
                background-size: 300% 300%;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: gradientShift 3s ease-in-out infinite;
            }
            
            .reward-header p {
                font-size: 1.1rem;
                color: rgba(255, 255, 255, 0.8);
            }
            
            /* View Battlefield Button Styles - Centered between hero rows */
            .view-battlefield-button-container {
                position: fixed;
                top: 2%;
                left: 9.5%;
                z-index: 10001;  /* Ensure it's above the overlay */
            }
            
            .view-battlefield-button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 25px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 160px;
                justify-content: center;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.2);
            }
            
            .view-battlefield-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
                background: linear-gradient(135deg, #7c8cff 0%, #8b5fbf 100%);
                border-color: rgba(255, 255, 255, 0.4);
            }
            
            .view-battlefield-button:active {
                transform: translateY(0);
            }
            
            .view-button-icon {
                font-size: 16px;
                transition: transform 0.3s ease;
            }
            
            .view-battlefield-button:hover .view-button-icon {
                transform: scale(1.1);
            }
            
            .view-button-text {
                text-transform: uppercase;
                letter-spacing: 0.5px;
                transition: all 0.3s ease;
            }
            
            /* Battlefield mode specific button styling */
            .card-reward-overlay.battlefield-mode .view-battlefield-button {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
            }
            
            .card-reward-overlay.battlefield-mode .view-battlefield-button:hover {
                background: linear-gradient(135deg, #32cc52 0%, #26d9a8 100%);
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.6);
            }
            
            .special-reward-indicator {
                position: absolute;
                top: 15px;
                right: 15px;
                background: var(--warning-gradient);
                color: white;
                padding: 8px 16px;
                border-radius: var(--radius-large);
                font-size: 14px;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                box-shadow: 0 4px 15px rgba(255, 193, 7, 0.4);
                animation: pulse 2s ease-in-out infinite;
                z-index: 10;
            }
            
            /* Total Gold Change Animation */
            @keyframes totalGoldChangeSlide {
                0% { 
                    opacity: 0; 
                    transform: translateY(-50%) translateX(-20px) scale(0.8); 
                }
                25% { 
                    opacity: 1; 
                    transform: translateY(-50%) translateX(0px) scale(1.2); 
                }
                75% { 
                    opacity: 1; 
                    transform: translateY(-50%) translateX(0px) scale(1); 
                }
                100% { 
                    opacity: 0; 
                    transform: translateY(-50%) translateX(20px) scale(0.9); 
                }
            }
            
            @keyframes totalGoldFlash {
                0% { transform: scale(1); color: #ffd700; }
                50% { transform: scale(1.1); color: #ff6b6b; }
                100% { transform: scale(1); color: #ffd700; }
            }
            
            /* Animations */
            @keyframes goldIconFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                33% { transform: translateY(-3px) rotate(2deg); }
                66% { transform: translateY(3px) rotate(-2deg); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @keyframes successPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            @keyframes gradientShift {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .reward-footer {
                text-align: center;
            }
            
            .reward-hint {
                color: rgba(255, 255, 255, 0.6);
                font-style: italic;
            }
            
            /* Remove the old separate redraw button positioning */
            .reward-main-content + .redraw-button-container {
                display: none;
            }
            
            /* Responsive Design */
            @media (max-width: 1600px) {
                .reward-container.enhanced-with-gold-and-preview {
                    max-width: 95%;
                    padding: 30px 25px;
                }
                
                .reward-card-preview-section {
                    flex: 0 0 320px;
                }
                
                .reward-card-preview-area .preview-card-image {
                    max-width: 280px;
                }
                
                .gold-and-redraw-section {
                    flex: 0 0 300px;
                }
                
                .enhanced-redraw-button {
                    min-height: 70px;
                }
                
                .redraw-title {
                    font-size: 16px;
                }
                
                .total-gold-amount {
                    font-size: 28px;
                }
                
                .view-battlefield-button {
                    padding: 10px 16px;
                    font-size: 13px;
                    min-width: 140px;
                }
            }
            
            @media (max-width: 1400px) {
                .reward-card-preview-section {
                    flex: 0 0 280px;
                }
                
                .reward-card-preview-area .preview-card-image {
                    max-width: 240px;
                }
                
                .reward-card-image, .hero-card-image {
                    width: 140px;
                    height: 196px;
                }
                
                .gold-and-redraw-section {
                    flex: 0 0 280px;
                }
                
                .enhanced-redraw-button {
                    min-height: 65px;
                }
                
                .redraw-title {
                    font-size: 15px;
                }
                
                .total-gold-amount {
                    font-size: 26px;
                }
                
                .view-battlefield-button {
                    padding: 8px 14px;
                    font-size: 12px;
                    min-width: 130px;
                }
            }
            
            @media (max-width: 1200px) {
                .reward-main-content {
                    flex-direction: column;
                    gap: 25px;
                }
                
                .gold-breakdown-container,
                .reward-card-preview-section,
                .gold-and-redraw-section {
                    flex: none;
                    align-self: center;
                    max-width: 500px;
                }
                
                .reward-card-preview-area {
                    min-height: 400px;
                }
                
                .hero-reward-selection.enhanced-hero-selection,
                .reward-cards.enhanced-cards {
                    justify-content: center;
                    flex-wrap: wrap;
                    gap: 20px;
                    margin-left: 0;
                }
                
                .enhanced-redraw-button {
                    min-height: 75px;
                }
                
                .redraw-title {
                    font-size: 16px;
                }
                
                .total-gold-amount {
                    font-size: 30px;
                }
                
                .view-battlefield-button-container {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10001;
                }
                
                .view-battlefield-button {
                    padding: 8px 14px;
                    font-size: 12px;
                    min-width: 130px;
                }
            }
            
            @media (max-width: 768px) {
                .reward-card-image, .hero-card-image {
                    width: 120px;
                    height: 168px;
                }
                
                .reward-card-preview-section {
                    padding: 8px;
                }
                
                .reward-card-preview-area {
                    min-height: 350px;
                }
                
                .reward-card-preview-area .preview-card-image {
                    max-width: 280px;
                }
                
                .enhanced-redraw-button {
                    min-height: 80px;
                }
                
                .redraw-button-inner {
                    padding: 12px 16px;
                }
                
                .redraw-title {
                    font-size: 15px;
                }
                
                .redraw-subtitle {
                    font-size: 11px;
                }
                
                .total-gold-amount {
                    font-size: 28px;
                }
                
                .total-gold-breakdown {
                    font-size: 11px;
                }
                
                .view-battlefield-button {
                    padding: 10px 16px;
                    font-size: 13px;
                    min-width: 150px;
                }
                
                .view-button-text {
                    font-size: 12px;
                }
            }
        `;

        // Add Wanted Poster styles
        style.textContent += getWantedPosterStyles();
        
        document.head.appendChild(style);
    }

    // Add animation method
    async animateRedraw() {
        const cards = document.querySelectorAll('.reward-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('redrawing');
            }, index * 10);
        });
        
        await new Promise(resolve => setTimeout(resolve, 20));
        
        cards.forEach(card => {
            card.classList.remove('redrawing');
        });
    }

    updateCardRewardDisplay(newCards) {
        const container = document.getElementById('rewardCardsContainer');
        if (container) {
            container.innerHTML = newCards.map((card, index) => 
                this.createRewardCardHTML(card, index)
            ).join('');
            
            // Re-attach event listeners
            this.attachRewardCardListeners(newCards);
        }
    }

    attachRewardCardListeners(rewardCards) {
        rewardCards.forEach((card, index) => {
            const cardElement = document.querySelector(`[data-reward-index="${index}"]`);
            if (cardElement) {
                // Click handler for selection
                cardElement.addEventListener('click', () => this.handleCardSelection(card.name));
                
                // Enhanced tooltip handlers for dedicated preview area
                const cardImage = cardElement.querySelector('.reward-card-image');
                if (cardImage) {
                    // Prepare card data for tooltip
                    const cardData = {
                        imagePath: card.image,
                        displayName: this.formatCardName(card.name),
                        cardType: card.cardType
                    };
                    
                    cardImage.addEventListener('mouseenter', () => {
                        this.cardPreviewManager.showCardTooltip(cardData, cardImage);
                    });
                    
                    cardImage.addEventListener('mouseleave', () => {
                        this.cardPreviewManager.hideCardTooltip();
                    });
                }
            }
        });
    }

    attachHeroRewardListeners(rewardHeroes) {
        rewardHeroes.forEach((hero, index) => {
            const heroElement = document.querySelector(`[data-reward-index="${index}"]`);
            if (heroElement) {
                // Click handler for selection
                heroElement.addEventListener('click', () => this.handleHeroSelection(hero.name));
                
                // Enhanced tooltip handlers for dedicated preview area
                const heroImage = heroElement.querySelector('.hero-card-image');
                if (heroImage) {
                    // Prepare hero data for tooltip
                    const heroData = {
                        imagePath: hero.image,
                        displayName: hero.name,
                        cardType: 'character'
                    };
                    
                    heroImage.addEventListener('mouseenter', () => {
                        this.cardPreviewManager.showCardTooltip(heroData, heroImage);
                    });
                    
                    heroImage.addEventListener('mouseleave', () => {
                        this.cardPreviewManager.hideCardTooltip();
                    });
                }
            }
        });
    }

    updateHeroRewardDisplay(newHeroes) {
        const container = document.querySelector('.hero-reward-selection');
        if (container) {
            container.innerHTML = newHeroes.map((hero, index) => 
                this.createHeroRewardHTML(hero, index)
            ).join('');
            
            // Re-attach event listeners
            this.attachHeroRewardListeners(newHeroes);
        }
    }

    // Show redraw error
    showRedrawError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'redraw-error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 10001;
            animation: shake 0.5s ease-in-out;
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 2000);
    }

    // Update gold breakdown and total gold display after redraw
    updateGoldBreakdownAfterRedraw() {
        const goldBreakdownContainer = document.querySelector('.gold-breakdown-container');
        if (goldBreakdownContainer) {
            // Replace the entire gold breakdown with updated values
            goldBreakdownContainer.outerHTML = this.createGoldBreakdownHTML();
        }
        
        // Also update the main gold display if it exists
        const goldNumberElement = document.querySelector('.player-gold-number');
        if (goldNumberElement) {
            goldNumberElement.textContent = this.goldManager.getPlayerGold();
        }
    }

    // Update redraw button after use
    updateRedrawButton() {
        const buttonContainer = document.querySelector('.enhanced-redraw-container');
        if (buttonContainer) {
            buttonContainer.outerHTML = this.createRedrawButtonHTML();
        }
    }

    // Reset redraw cost when starting new reward session
    resetRedrawCost() {
        this.redrawCost = 1;
    }
    
    generateHeroRewards(count = 3) {
        // Get heroes that the player doesn't already have in formation
        const currentFormation = this.heroSelection.formationManager.getBattleFormation();
        const usedHeroNames = Object.values(currentFormation)
            .filter(hero => hero !== null)
            .map(hero => hero.name);
        
        console.log('Heroes already in formation:', usedHeroNames);
        
        // Filter out already used heroes
        const availableHeroes = this.allHeroes.filter(hero => !usedHeroNames.includes(hero.name));
        
        console.log(`Filtered heroes: ${this.allHeroes.length} total -> ${availableHeroes.length} available`);
        
        if (availableHeroes.length === 0) {
            console.warn('No available heroes for rewards - all heroes already in formation!');
            return [];
        }
        
        if (availableHeroes.length < count) {
            console.warn(`Only ${availableHeroes.length} available heroes, but need ${count} rewards`);
            count = availableHeroes.length;
        }
        
        const rewardHeroes = [];
        const usedIndices = new Set();
        
        while (rewardHeroes.length < count) {
            const randomIndex = Math.floor(Math.random() * availableHeroes.length);
            
            if (!usedIndices.has(randomIndex)) {
                usedIndices.add(randomIndex);
                rewardHeroes.push(availableHeroes[randomIndex]);
            }
        }
        
        console.log('Generated filtered hero rewards:', rewardHeroes.map(h => h.name));
        return rewardHeroes;
    }

    generateRewardCards(count = 3) {
        const allCards = getAllAbilityCards();
        
        // Get current deck contents
        const currentDeck = this.deckManager ? this.deckManager.getDeck() : [];
        const currentDeckCardNames = currentDeck.map(card => 
            typeof card === 'string' ? card : card.name
        );
        
        console.log('Current deck cards:', currentDeckCardNames);
        
        // Separate cards by type and whether they're in deck
        const abilityCards = allCards.filter(card => card.cardType === 'Ability');
        const spellCards = allCards.filter(card => card.cardType === 'Spell');
        const otherCards = allCards.filter(card => 
            card.cardType !== 'Ability' && 
            card.cardType !== 'Spell' && 
            card.cardType !== 'hero'
        ); // Artifacts, Potions, etc.
        
        const abilityCardsInDeck = abilityCards.filter(card => currentDeckCardNames.includes(card.name));
        const abilityCardsNotInDeck = abilityCards.filter(card => !currentDeckCardNames.includes(card.name));
        
        const spellCardsInDeck = spellCards.filter(card => currentDeckCardNames.includes(card.name));
        const spellCardsNotInDeck = spellCards.filter(card => !currentDeckCardNames.includes(card.name));
        
        const otherCardsInDeck = otherCards.filter(card => currentDeckCardNames.includes(card.name));
        const otherCardsNotInDeck = otherCards.filter(card => !currentDeckCardNames.includes(card.name));
        
        console.log(`Available cards - Abilities: ${abilityCards.length} (${abilityCardsInDeck.length} in deck), Spells: ${spellCards.length} (${spellCardsInDeck.length} in deck), Others: ${otherCards.length} (${otherCardsInDeck.length} in deck)`);
        
        const rewardCards = [];
        
        // First card: Always an Ability
        const firstCard = this.selectCardByType(abilityCardsInDeck, abilityCardsNotInDeck, 'Ability');
        if (firstCard) {
            rewardCards.push(firstCard);
            console.log(`First reward (Ability): ${firstCard.name}`);
        }
        
        // Second card: Always a Spell
        const secondCard = this.selectCardByType(spellCardsInDeck, spellCardsNotInDeck, 'Spell');
        if (secondCard) {
            rewardCards.push(secondCard);
            console.log(`Second reward (Spell): ${secondCard.name}`);
        }
        
        // Third card: Anything except Ability, Spell, or Hero (so Artifacts, Potions, etc.)
        const thirdCard = this.selectCardByType(otherCardsInDeck, otherCardsNotInDeck, 'Other');
        if (thirdCard) {
            rewardCards.push(thirdCard);
            console.log(`Third reward (${thirdCard.cardType}): ${thirdCard.name}`);
        }
        
        // Fallback: if we don't have enough cards, fill with random available cards
        while (rewardCards.length < count && allCards.length > 0) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            if (!rewardCards.some(card => card.name === randomCard.name)) {
                rewardCards.push(randomCard);
                console.log(`Fallback reward: ${randomCard.name}`);
            }
        }
        
        console.log('Generated reward cards with new specific ratios:', rewardCards.map(c => `${c.name} (${c.cardType})`));
        return rewardCards;
    }

    // Helper method to select card based on 1/3 existing, 2/3 new ratio
    selectCardByType(cardsInDeck, cardsNotInDeck, typeName) {
        // 1/3 chance for existing card, 2/3 chance for new card
        const useExistingCard = Math.random() < (1/3);
        
        let selectedCard = null;
        
        if (useExistingCard && cardsInDeck.length > 0) {
            // Pick random card from deck
            const randomIndex = Math.floor(Math.random() * cardsInDeck.length);
            selectedCard = cardsInDeck[randomIndex];
            console.log(`Selected existing ${typeName}: ${selectedCard.name}`);
        } else if (cardsNotInDeck.length > 0) {
            // Pick random card not in deck
            const randomIndex = Math.floor(Math.random() * cardsNotInDeck.length);
            selectedCard = cardsNotInDeck[randomIndex];
            console.log(`Selected new ${typeName}: ${selectedCard.name}`);
        } else if (cardsInDeck.length > 0) {
            // Fallback: pick from existing cards if no new cards available
            const randomIndex = Math.floor(Math.random() * cardsInDeck.length);
            selectedCard = cardsInDeck[randomIndex];
            console.log(`Selected existing ${typeName} (fallback): ${selectedCard.name}`);
        }
        
        return selectedCard;
    }

    generateFallbackRewards(allCards, count) {
        console.log('Using fallback reward generation');
        
        const rewardCards = [];
        const usedIndices = new Set();
        
        const maxCards = Math.min(count, allCards.length);
        
        while (rewardCards.length < maxCards) {
            const randomIndex = Math.floor(Math.random() * allCards.length);
            
            if (!usedIndices.has(randomIndex)) {
                usedIndices.add(randomIndex);
                rewardCards.push(allCards[randomIndex]);
            }
        }
        
        return rewardCards;
    }

    createHeroRewardHTML(hero, index) {
        const heroCards = this.heroCardSets[hero.name] || [];
        
        return `
            <div class="reward-card" data-reward-index="${index}">
                <div class="reward-card-inner">
                    <img src="${hero.image}" 
                         alt="${hero.name}" 
                         class="hero-card-image"
                         onerror="this.src='./Cards/Characters/placeholder.png'">
                    <div class="reward-card-info">
                        <h3 class="reward-card-name">${hero.name}</h3>
                        <p class="reward-card-type">Hero Character</p>
                        <div class="ability-hint">⚡ Adds ${heroCards.length} cards to your deck</div>
                    </div>
                    <button class="reward-card-button" data-hero-name="${hero.name}">
                        Recruit Hero
                    </button>
                </div>
            </div>
        `;
    }

    createRewardCardHTML(card, index) {
        const formattedName = this.formatCardName(card.name);
        
        return `
            <div class="reward-card" data-reward-index="${index}">
                <div class="reward-card-inner">
                    <img src="${card.image}" 
                         alt="${formattedName}" 
                         class="reward-card-image"
                         onerror="this.src='./Cards/placeholder.png'">
                    <div class="reward-card-info">
                        <h3 class="reward-card-name">${formattedName}</h3>
                        <p class="reward-card-type">${card.cardType}</p>
                    </div>
                    <button class="reward-card-button" data-card-name="${card.name}">
                        Add to Deck
                    </button>
                </div>
            </div>
        `;
    }

    // Handle hero selection - REMOVED duplicate restriction, allows duplicates
    async handleHeroSelection(heroName) {
        // Prevent multiple selections
        if (this.selectionMade) {
            return;
        }
        
        this.selectionMade = true;
        
        // Disable all hero buttons to prevent double-clicks
        const allButtons = document.querySelectorAll('.reward-card-button');
        allButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
        
        try {
            // Get hero's card set
            const heroCards = this.heroCardSets[heroName];
            if (!heroCards || heroCards.length === 0) {
                throw new Error(`No cards found for hero: ${heroName}`);
            }
            
            // Add all hero cards to deck (USING addCardReward to allow duplicates)
            let addedCardsCount = 0;
            heroCards.forEach(cardName => {
                const success = this.deckManager.addCardReward(cardName);  // CHANGED: Allow duplicates
                if (success) {
                    addedCardsCount++;
                }
            });
            
            if (addedCardsCount > 0) {
                this.awardCalculatedGold();
                
                // Add 1 random hero card to hand
                if (this.handManager && heroCards.length > 0) {
                    const randomIndex = Math.floor(Math.random() * heroCards.length);
                    const randomCard = heroCards[randomIndex];
                    this.handManager.addCardToHand(randomCard);
                    
                    // Draw 1 additional card from deck
                    this.handManager.drawCards(1);
                }
                
                // Add the hero to the leftmost free slot in battle formation
                let targetSlot = null;
                let heroAddedToFormation = false;
                
                if (this.heroSelection && this.heroSelection.formationManager) {
                    const formation = this.heroSelection.formationManager.getBattleFormation();

                    // Find leftmost free slot
                    if (!formation.left) {
                        targetSlot = 'left';
                    } else if (!formation.center) {
                        targetSlot = 'center';
                    } else if (!formation.right) {
                        targetSlot = 'right';
                    }

                    if (targetSlot) {
                        // Find the hero from the reward selection to get the image
                        const rewardHero = this.allHeroes.find(h => h.name === heroName);
                        
                        if (rewardHero) {
                            // Create hero object for formation
                            const heroForFormation = {
                                id: Date.now() + Math.floor(Math.random() * 1000),
                                name: heroName,
                                image: rewardHero.image,
                                filename: `${heroName}.png`
                            };
                            
                            // Add hero directly to formation
                            formation[targetSlot] = heroForFormation;
                            this.heroSelection.formationManager.battleFormation[targetSlot] = heroForFormation;
                            
                            // Get hero info from database for abilities initialization
                            const heroInfo = this.getHeroInfoForAbilities(heroName);
                            
                            if (heroInfo && this.heroSelection.heroAbilitiesManager) {
                                // Initialize hero abilities
                                this.heroSelection.heroAbilitiesManager.updateHeroPlacement(targetSlot, heroInfo);
                                
                                if (this.heroSelection.potionHandler) {
                                    this.heroSelection.potionHandler.updateAlchemyBonuses(this.heroSelection);
                                    console.log('🧪 Updated potion bonuses after adding new hero with abilities');
                                }
                            }
                            
                            // Initialize empty spellbook for the new hero
                            if (this.heroSelection.heroSpellbookManager) {
                                this.heroSelection.heroSpellbookManager.clearHeroSpellbook(targetSlot);
                            }
                            
                            heroAddedToFormation = true;
                        }
                    }
                }
                
                // Update the battle formation UI to show the new hero
                if (heroAddedToFormation && this.heroSelection.updateBattleFormationUI) {
                    this.heroSelection.updateBattleFormationUI();
                }
                
                // Store info about the added hero
                this.lastAddedRewardCard = `${heroName} (Hero)`;
                
                // Visual feedback on selected hero
                const selectedButton = document.querySelector(`.reward-card-button[data-hero-name="${heroName}"]`);
                if (selectedButton) {
                    selectedButton.classList.add('selected');
                    selectedButton.innerHTML = '<div class="selection-success">✓ Hero Recruited!</div>';
                    
                    // Animate the selection
                    const selectedCard = selectedButton.closest('.reward-card');
                    if (selectedCard) {
                        selectedCard.style.transform = 'scale(1.1)';
                        selectedCard.style.boxShadow = '0 0 30px rgba(76, 175, 80, 0.8)';
                        
                        setTimeout(() => {
                            selectedCard.style.transform = 'scale(1)';
                        }, 300);
                    }
                }
                
                // Clear pending rewards from Firebase
                await this.clearPendingRewards();
                
                // NEW: Clear final battle state
                await this.clearFinalBattleState();
                
                // Save game state with new cards and hero
                if (this.heroSelection) {
                    await this.heroSelection.saveGameState();
                }
                
                // Reset actions for the new turn after selecting reward
                if (window.heroSelection && window.heroSelection.actionManager) {
                    window.heroSelection.actionManager.resetActions();
                    
                    // Update action display immediately
                    window.heroSelection.updateActionDisplay();
                }
                
                // Wait a moment for visual feedback
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // IMPORTANT: Set game phase back to Formation before closing
                await this.heroSelection.setGamePhase('Formation');
                
                // Close reward overlay and return to formation
                this.hideRewardOverlay();
                
                // Return to formation screen
                if (this.heroSelection) {
                    this.heroSelection.returnToFormationScreenAfterBattle();
                }
                
                // Send formation update to opponent AFTER adding hero
                if (heroAddedToFormation && this.heroSelection.sendFormationUpdate) {
                    await this.heroSelection.sendFormationUpdate();
                }
                
                // Send sync message to opponent
                if (this.heroSelection && this.heroSelection.gameDataSender) {
                    this.heroSelection.gameDataSender('hero_reward_selected', {
                        heroName: heroName,
                        cardsAdded: addedCardsCount,
                        heroAddedToFormation: heroAddedToFormation,
                        formationSlot: targetSlot,
                        message: `Opponent recruited ${heroName}!`,
                        timestamp: Date.now()
                    });
                }
                
            } else {
                throw new Error(`Failed to add any cards from ${heroName} to deck`);
            }
            
        } catch (error) {
            // Re-enable selection on error
            this.selectionMade = false;
            
            // Re-enable buttons
            allButtons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
            
            // Show error message
            this.showErrorMessage(`Error recruiting ${heroName}. Please try again.`);
        }
    }

    // Handle card selection - REMOVED duplicate restriction, allows duplicates
    async handleCardSelection(cardName) {
        // Prevent multiple selections
        if (this.selectionMade) {
            return;
        }
        
        this.selectionMade = true;
        
        // Disable all card buttons to prevent double-clicks
        const allButtons = document.querySelectorAll('.reward-card-button');
        allButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
        
        try {
            // Add the selected card to deck (USING addCardReward to allow duplicates)
            const success = this.deckManager.addCardReward(cardName);  // CHANGED: Allow duplicates
            
            if (success) {
                this.awardCalculatedGold();
                
                // Add the reward card to hand + draw 1 additional card
                if (this.handManager) {
                    this.handManager.addCardToHand(cardName);
                    this.handManager.drawCards(1);
                }
                
                // Store the last added card for UI highlighting
                this.lastAddedRewardCard = cardName;
                
                // Visual feedback on selected card
                const selectedButton = document.querySelector(`.reward-card-button[data-card-name="${cardName}"]`);
                if (selectedButton) {
                    selectedButton.classList.add('selected');
                    selectedButton.innerHTML = '<div class="selection-success">✓ Added to Deck!</div>';
                    
                    // Animate the selection
                    const selectedCard = selectedButton.closest('.reward-card');
                    if (selectedCard) {
                        selectedCard.style.transform = 'scale(1.1)';
                        selectedCard.style.boxShadow = '0 0 30px rgba(76, 175, 80, 0.8)';
                        
                        setTimeout(() => {
                            selectedCard.style.transform = 'scale(1)';
                        }, 300);
                    }
                }
                
                // Clear pending rewards from Firebase
                await this.clearPendingRewards();
                
                // NEW: Clear final battle state
                await this.clearFinalBattleState();
                
                // Save game state with new card
                if (this.heroSelection) {
                    await this.heroSelection.saveGameState();
                }
                
                // Reset actions for the new turn after selecting reward
                if (window.heroSelection && window.heroSelection.actionManager) {
                    window.heroSelection.actionManager.resetActions();
                    
                    // Update action display immediately
                    window.heroSelection.updateActionDisplay();
                }
                
                // Wait a moment for visual feedback
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // IMPORTANT: Set game phase back to Formation before closing
                await this.heroSelection.setGamePhase('Formation');
                
                // Close reward overlay and return to formation
                this.hideRewardOverlay();
                
                // Return to formation screen
                if (this.heroSelection) {
                    this.heroSelection.returnToFormationScreenAfterBattle();
                }
                
                // Send sync message to opponent
                if (this.heroSelection && this.heroSelection.gameDataSender) {
                    this.heroSelection.gameDataSender('reward_bonus_draw', {
                        message: 'Opponent selected their reward card',
                        timestamp: Date.now()
                    });
                }
                
            } else {
                // Re-enable selection on failure
                this.selectionMade = false;
                
                // Show error message
                this.showErrorMessage('Failed to add card to deck. Please try again.');
                
                // Re-enable buttons after delay
                setTimeout(() => {
                    allButtons.forEach(btn => {
                        btn.disabled = false;
                        btn.style.opacity = '1';
                        btn.style.cursor = 'pointer';
                    });
                }, 2000);
            }
            
        } catch (error) {
            // Re-enable selection on error
            this.selectionMade = false;
            
            // Re-enable buttons
            allButtons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
            
            // Show error message
            this.showErrorMessage('An error occurred. Please try again.');
        }
    }

    // Helper method to get hero info for abilities initialization
    getHeroInfoForAbilities(heroName) {
        // Try multiple sources to get hero info
        let heroInfo = null;
        
        // Method 1: Try heroAbilitiesManager's getHeroInfo
        if (this.heroSelection && this.heroSelection.heroAbilitiesManager && 
            this.heroSelection.heroAbilitiesManager.getHeroInfo) {
            heroInfo = this.heroSelection.heroAbilitiesManager.getHeroInfo(heroName);
        }
        
        // Method 2: Try global getHeroInfo function
        if (!heroInfo && typeof window !== 'undefined' && window.getHeroInfo) {
            heroInfo = window.getHeroInfo(heroName);
        }
        
        // Method 3: Try heroSelection's getCardInfo method
        if (!heroInfo && this.heroSelection && this.heroSelection.getCardInfo) {
            const cardInfo = this.heroSelection.getCardInfo(heroName);
            if (cardInfo && cardInfo.cardType === 'hero') {
                heroInfo = cardInfo;
            }
        }
        
        // Method 4: Try importing from cardDatabase if available
        if (!heroInfo && typeof window !== 'undefined' && window.getCardInfo) {
            const cardInfo = window.getCardInfo(heroName);
            if (cardInfo && (cardInfo.cardType === 'hero' || cardInfo.cardType === 'character')) {
                heroInfo = cardInfo;
            }
        }
        
        if (heroInfo) {
            console.log(`Found hero info for ${heroName}:`, heroInfo);
        } else {
            console.warn(`Could not find hero info for ${heroName} - abilities may not be initialized`);
        }
        
        return heroInfo;
    }

    // Show error message
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'reward-error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-size: 18px;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 2000);
    }

    // Hide reward overlay
    hideRewardOverlay() {
        // Clear any active tooltips
        this.cardPreviewManager.hideCardTooltip();
        
        // Clean up global toggle function
        if (typeof window !== 'undefined') {
            window.toggleRewardView = null;
        }
        
        // Clear view mode from localStorage
        try {
            localStorage.removeItem('rewardViewMode');
        } catch (error) {
            console.warn('Could not clear view mode from localStorage:', error);
        }
        
        // Hide battle arena if it was shown during battlefield view
        const battleArena = document.getElementById('battleArena');
        if (battleArena) {
            battleArena.style.display = 'none';
            console.log('🎁 Hidden battle arena when closing reward overlay');
        }
        
        // Show surrender button when returning to formation
        this.showSurrenderButtonOnReturn();
        
        // Re-enable body scrolling
        document.body.classList.remove('reward-overlay-active');
        
        const overlay = document.getElementById('cardRewardOverlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
        
        // Reset selection state and view mode
        this.selectionMade = false;
        this.viewMode = 'rewards';
    }

    // Show surrender button when returning from reward screen
    showSurrenderButtonOnReturn() {
        // Method 1: Use battle screen static method if available
        if (typeof window !== 'undefined' && window.BattleScreen && window.BattleScreen.showSurrenderButton) {
            window.BattleScreen.showSurrenderButton();
            console.log('🛡️ Showed surrender button via BattleScreen static method');
            return;
        }
        
        // Method 2: Use heroSelection's battle screen instance
        if (this.heroSelection && this.heroSelection.battleScreen && 
            typeof this.heroSelection.battleScreen.showSurrenderButton === 'function') {
            this.heroSelection.battleScreen.showSurrenderButton();
            console.log('🛡️ Showed surrender button via heroSelection battle screen');
            return;
        }
        
        // Method 3: Direct DOM manipulation as fallback
        document.body.classList.remove('battle-active');
        const surrenderButton = document.querySelector('.surrender-button');
        if (surrenderButton) {
            surrenderButton.style.display = '';
            console.log('🛡️ Showed surrender button via direct DOM manipulation');
        } else {
            console.warn('⚠️ Surrender button not found when trying to show it');
        }
    }


    // Save pending rewards to Firebase (updated to handle hero rewards and gold breakdown)
    async savePendingRewards(rewards, isHeroReward = false) {
        if (!this.heroSelection || !this.heroSelection.roomManager) {
            console.log('No room manager available to save rewards');
            return;
        }
        
        try {
            const roomRef = this.heroSelection.roomManager.getRoomRef();
            if (!roomRef) return;
            
            const isHost = this.heroSelection.isHost;
            const rewardKey = isHost ? 'hostPendingRewards' : 'guestPendingRewards';
            const currentTurn = this.heroSelection.getTurnTracker().getCurrentTurn();
            
            const rewardData = {
                rewards: rewards,
                turn: currentTurn,
                isHeroReward: isHeroReward,
                goldBreakdown: this.lastGoldBreakdown, // Include gold breakdown
                // Add redraw state
                redrawCost: this.redrawCost,
                totalRedraws: this.totalRedraws,
                // Add view mode state
                viewMode: this.viewMode,
                timestamp: Date.now()
            };
            
            await roomRef.child('gameState').child(rewardKey).set(rewardData);
            console.log(`Saved pending ${isHeroReward ? 'hero' : 'card'} rewards with gold breakdown and redraw state to Firebase`);
            
        } catch (error) {
            console.error('Error saving pending rewards:', error);
        }
    }

    // Check and restore pending rewards (updated to handle gold breakdown)
    async checkAndRestorePendingRewards(heroSelection) {
        this.heroSelection = heroSelection;
        
        if (!heroSelection || !heroSelection.roomManager) {
            console.log('No room manager available to check rewards');
            return false;
        }
        
        try {
            const roomRef = heroSelection.roomManager.getRoomRef();
            if (!roomRef) return false;
            
            const isHost = heroSelection.isHost;
            const rewardKey = isHost ? 'hostPendingRewards' : 'guestPendingRewards';
            
            const snapshot = await roomRef.child('gameState').child(rewardKey).once('value');
            const pendingRewards = snapshot.val();
            
            if (pendingRewards && pendingRewards.rewards && pendingRewards.rewards.length > 0) {
                console.log('Found pending rewards:', pendingRewards);
                
                // ✅ CRITICAL FIX: Initialize battle screen BEFORE restoring rewards
                console.log('🔥 Ensuring battle screen is initialized for reward restoration...');
                const battleScreenInitialized = await this.ensureBattleScreenInitialized(heroSelection);
                if (!battleScreenInitialized) {
                    console.warn('⚠️ Failed to initialize battle screen for reward restoration');
                    // Still show rewards but warn user that battlefield view may not work
                } else {
                    console.log('✅ Battle screen successfully initialized for reward restoration');
                }
                
                // Restore gold breakdown if available
                if (pendingRewards.goldBreakdown) {
                    this.lastGoldBreakdown = pendingRewards.goldBreakdown;
                    console.log('Restored gold breakdown:', this.lastGoldBreakdown);
                }
                
                // Restore redraw state
                if (pendingRewards.redrawCost !== undefined) {
                    this.redrawCost = pendingRewards.redrawCost;
                    this.totalRedraws = pendingRewards.totalRedraws || 0;
                    console.log('Restored redraw state:', { redrawCost: this.redrawCost, totalRedraws: this.totalRedraws });
                }
                
                // Restore view mode state
                if (pendingRewards.viewMode) {
                    this.viewMode = pendingRewards.viewMode;
                    console.log('Restored view mode:', this.viewMode);
                } else {
                    // Fallback to localStorage
                    this.restoreViewModeState();
                }
                
                // Check if these are hero rewards or card rewards
                if (pendingRewards.isHeroReward) {
                    this.displayHeroRewardUI(pendingRewards.rewards, pendingRewards.turn || 1);
                } else {
                    // Legacy support: check if it has 'cards' property instead of 'rewards'
                    const rewards = pendingRewards.rewards || pendingRewards.cards;
                    this.displayRewardUI(rewards, pendingRewards.turn || 1);
                }
                
                // Restore view mode after UI is displayed
                if (this.viewMode === 'battlefield' && battleScreenInitialized) {
                    setTimeout(() => {
                        this.applyBattlefieldMode();
                    }, 100);
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking pending rewards:', error);
            return false;
        }
    }

    // Ensure battle screen is initialized for reward reconnection
    async ensureBattleScreenInitialized(heroSelection) {
        console.log('🔥 Ensuring battle screen is initialized for reward reconnection...');
        
        try {
            // Check if we have the required data
            if (!heroSelection.selectedCharacter || !heroSelection.opponentSelectedCharacter) {
                console.warn('⚠️ Missing character data for battle screen initialization');
                return false;
            }
            
            const playerFormation = heroSelection.formationManager.getBattleFormation();
            const opponentFormation = heroSelection.formationManager.getOpponentBattleFormation();
            
            if (!playerFormation || !opponentFormation) {
                console.warn('⚠️ Missing formation data for battle screen initialization');
                return false;
            }
            
            // Check if battle screen already exists and is properly initialized
            const existingBattleArena = document.getElementById('battleArena');
            if (existingBattleArena && existingBattleArena.innerHTML.trim() !== '') {
                console.log('✅ Battle arena already exists and has content');
                existingBattleArena.style.display = 'none'; // Ensure it's hidden initially
                
                // Wait a bit to ensure DOM is ready
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Try to load final battle state for existing arena
                const finalBattleState = await this.loadFinalBattleStateForViewing();
                if (finalBattleState && heroSelection.battleScreen && heroSelection.battleScreen.battleManager) {
                    await heroSelection.battleScreen.battleManager.restoreFinalBattleState(finalBattleState);
                }
                
                return true;
            }
            
            console.log('🎮 Initializing battle screen for reward reconnection...');
            
            // Initialize battle screen if not already done
            if (!heroSelection.battleScreen) {
                const { BattleScreen } = await import('./battleScreen.js');
                heroSelection.battleScreen = new BattleScreen();
            }
            
            // Try normal initialization first
            let battleInitialized = heroSelection.initBattleScreen();
            
            if (battleInitialized && heroSelection.battleScreen) {
                console.log('🏗️ Creating battle screen HTML...');
                heroSelection.battleScreen.createBattleScreen();
                
                // Wait for DOM to be ready
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const battleArena = document.getElementById('battleArena');
                if (battleArena) {
                    battleArena.style.display = 'none'; // Hide initially
                    
                    // After successful initialization, try to load final battle state
                    const finalBattleState = await this.loadFinalBattleStateForViewing();
                    if (finalBattleState && heroSelection.battleScreen.battleManager) {
                        await heroSelection.battleScreen.battleManager.restoreFinalBattleState(finalBattleState);
                    }
                    
                    console.log('✅ Battle screen initialized successfully for reward reconnection');
                    return true;
                } else {
                    console.error('❌ Battle arena not found after initialization');
                    battleInitialized = false;
                }
            }
            
            // Fallback: Manual battle screen setup
            if (!battleInitialized) {
                console.log('🔧 Attempting manual battle screen setup...');
                return await this.manualBattleScreenSetup(heroSelection);
            }
            
            return battleInitialized;
            
        } catch (error) {
            console.error('❌ Error ensuring battle screen initialization:', error);
            return false;
        }
    }

    // Load final battle state for viewing
    async loadFinalBattleStateForViewing() {
        if (!this.heroSelection || !this.heroSelection.roomManager || !this.heroSelection.roomManager.getRoomRef()) {
            return null;
        }
        
        try {
            const snapshot = await this.heroSelection.roomManager.getRoomRef()
                .child('gameState')
                .child('finalBattleState')
                .once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error loading final battle state:', error);
            return null;
        }
    }

    // Clear final battle state after reward selection
    async clearFinalBattleState() {
        if (!this.heroSelection || !this.heroSelection.roomManager || !this.heroSelection.roomManager.getRoomRef()) {
            return;
        }
        
        try {
            await this.heroSelection.roomManager.getRoomRef()
                .child('gameState')
                .child('finalBattleState')
                .remove();
            console.log('🧹 Cleared final battle state after reward selection');
        } catch (error) {
            console.error('Error clearing final battle state:', error);
        }
    }

    // Manual battle screen setup as fallback
    async manualBattleScreenSetup(heroSelection) {
        try {
            console.log('🔧 Manual battle screen setup starting...');
            
            // Get all required data
            const playerAbilities = {
                left: heroSelection.heroAbilitiesManager.getHeroAbilities('left'),
                center: heroSelection.heroAbilitiesManager.getHeroAbilities('center'),
                right: heroSelection.heroAbilitiesManager.getHeroAbilities('right')
            };
            
            const playerSpellbooks = {
                left: heroSelection.heroSpellbookManager.getHeroSpellbook('left'),
                center: heroSelection.heroSpellbookManager.getHeroSpellbook('center'),
                right: heroSelection.heroSpellbookManager.getHeroSpellbook('right')
            };
            
            const playerCreatures = {
                left: heroSelection.heroCreatureManager.getHeroCreatures('left'),
                center: heroSelection.heroCreatureManager.getHeroCreatures('center'),
                right: heroSelection.heroCreatureManager.getHeroCreatures('right')
            };
            
            // Initialize battle screen manually
            heroSelection.battleScreen.init(
                heroSelection.isHost,
                heroSelection.formationManager.getBattleFormation(),
                heroSelection.formationManager.getOpponentBattleFormation(),
                heroSelection.gameDataSender,
                heroSelection.roomManager,
                heroSelection.lifeManager,
                heroSelection.goldManager,
                heroSelection.turnTracker,
                heroSelection.roomManager,
                playerAbilities,
                heroSelection.opponentAbilitiesData,
                playerSpellbooks,
                heroSelection.opponentSpellbooksData,
                heroSelection.actionManager,
                playerCreatures,
                heroSelection.opponentCreaturesData
            );
            
            // Create battle screen HTML manually
            heroSelection.battleScreen.createBattleScreen();
            
            // Verify it was created
            const battleArena = document.getElementById('battleArena');
            if (battleArena) {
                battleArena.style.display = 'none'; // Hide initially
                console.log('✅ Manual battle screen setup successful');
                return true;
            } else {
                console.error('❌ Manual battle screen setup failed - no arena created');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error in manual battle screen setup:', error);
            return false;
        }
    }

    // Clear any active card rewards
    clearAnyActiveCardRewards() {
        // Re-enable body scrolling
        document.body.classList.remove('reward-overlay-active');
        
        // Clean up global toggle function
        if (typeof window !== 'undefined') {
            window.toggleRewardView = null;
        }
        
        // Clear view mode from localStorage
        try {
            localStorage.removeItem('rewardViewMode');
        } catch (error) {
            console.warn('Could not clear view mode from localStorage:', error);
        }
        
        const existingOverlay = document.getElementById('cardRewardOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Clear any tooltips
        this.cardPreviewManager.hideCardTooltip();
        
        // Reset state
        this.selectionMade = false;
        this.lastAddedRewardCard = null;
        this.viewMode = 'rewards';
    }

    // Get last added reward card (for UI highlighting)
    getLastAddedRewardCard() {
        return this.lastAddedRewardCard;
    }

    // Clear last added reward card
    clearLastAddedRewardCard() {
        this.lastAddedRewardCard = null;
    }

    // Format card name for display
    formatCardName(cardName) {
        return cardName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Handle opponent hero selection notification
    handleOpponentHeroSelection(heroSelection, data) {
        console.log(`Opponent recruited ${data.heroName}!`);
        
        // Show visual notification
        const notification = document.createElement('div');
        notification.className = 'opponent-hero-notification';
        notification.textContent = `🦸 ${data.message} (+${data.cardsAdded} cards)`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Handle opponent bonus card draw notification
    handleOpponentBonusCardDraw(heroSelection) {
        console.log('Opponent selected their reward card');
        
        const notification = document.createElement('div');
        notification.className = 'opponent-reward-notification';
        notification.textContent = '🎯 Opponent selected their reward card!';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(102, 126, 234, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Clear pending rewards from Firebase
    async clearPendingRewards() {
        if (!this.heroSelection || !this.heroSelection.roomManager) {
            console.log('No room manager available to clear rewards');
            return;
        }
        
        try {
            const roomRef = this.heroSelection.roomManager.getRoomRef();
            if (!roomRef) return;
            
            const isHost = this.heroSelection.isHost;
            const rewardKey = isHost ? 'hostPendingRewards' : 'guestPendingRewards';
            
            await roomRef.child('gameState').child(rewardKey).remove();
            console.log('Cleared pending rewards from Firebase');
            
        } catch (error) {
            console.error('Error clearing pending rewards:', error);
        }
    }

    // Fallback method to detect battle result from gold manager
    detectBattleResultFromGoldManager() {
        if (!this.heroSelection || !this.heroSelection.goldManager) {
            return 'victory'; // Default fallback
        }
        
        // Check the most recent gold change in the gold manager
        const goldData = this.heroSelection.goldManager.exportGoldData();
        const recentGoldChange = goldData.lastGoldChange || 0;
        
        // If they got 6+ gold recently, likely victory (4 base + 2 victory)
        // If they got 5 gold recently, likely defeat/draw (4 base + 1 participation)
        if (recentGoldChange >= 6) {
            return 'victory';
        } else if (recentGoldChange >= 5) {
            return 'defeat'; // or 'draw', both give same bonus
        }
        
        return 'victory'; // Default fallback
    }

    // Award the calculated gold to the player
    awardCalculatedGold() {
        if (!this.lastGoldBreakdown) {
            console.error('No gold breakdown available to award');
            return false;
        }
        
        const totalGold = this.lastGoldBreakdown.total - (this.lastGoldBreakdown.redrawDeduction || 0);
        
        if (this.goldManager && totalGold !== 0) { // Allow negative total from thieving
            // Apply the net gold effect (could be negative if opponent stole more than you gained)
            if (totalGold > 0) {
                this.goldManager.awardGold(totalGold, false, 'battle_reward');
            } else if (totalGold < 0) {
                // If total is negative due to thieving, subtract the gold
                this.goldManager.subtractPlayerGold(Math.abs(totalGold));
            }
            
            console.log(`✅ Applied ${totalGold} net gold change to player from battle rewards (including thieving)`);
            
            // NEW: Send thieving update to opponent
            if (this.lastGoldBreakdown.thievingDetails) {
                this.thievingManager.sendThievingUpdate(
                    this.lastGoldBreakdown.thievingDetails,
                    this.heroSelection ? this.heroSelection.gameDataSender : null
                );
            }
            
            // Send gold update to opponent so they know how much we got
            if (this.heroSelection && this.heroSelection.gameDataSender) {
                this.heroSelection.gameDataSender('opponent_gold_awarded', {
                    goldAmount: totalGold,
                    breakdown: this.lastGoldBreakdown,
                    timestamp: Date.now()
                });
            }
            
            return true;
        }
        
        return false;
    }

    handleOpponentThievingEffects(thievingData) {
        this.thievingManager.handleOpponentEffects(thievingData, this.goldManager);
    }

    cacheOpponentDataForRewards(opponentFormation, opponentAbilities) {
        if (this.heroSelection) {
            this.heroSelection.cachedOpponentData = {
                opponentFormation: opponentFormation,
                opponentAbilities: opponentAbilities
            };
            console.log('📦 Cached opponent data for thieving calculations');
        }
    }
}

if (typeof window !== 'undefined') {
    window.handleRewardRedraw = function() {
        const overlay = document.getElementById('cardRewardOverlay');
        if (overlay && window.heroSelection && window.heroSelection.cardRewardManager) {
            window.heroSelection.cardRewardManager.handleRedraw();
        }
    };
}

// Export for ES6 module compatibility
export default CardRewardManager;
