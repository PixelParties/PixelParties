// cardRewardManager.js - Enhanced with Compact Hand Display in Rewards Screen (No Scroll Fix)

import { CardPreviewManager } from './cardPreviewManager.js';
import { getCardInfo, getAllAbilityCards, getHeroInfo } from './cardDatabase.js';

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
            'Ida': ['BottledFlame', 'BurningSkeleton', 'ChaorcFriendlyFireballer', 'DestructionMagic', 'Fireball', 'Fireshield', 'FlameAvalanche', 'VampireOnFire'],
            'Medea': ['DecayMagic', 'PoisonedMeat', 'PoisonedWell', 'PoisonPollen', 'PoisonVial', 'ToxicFumes', 'ToxicTrap', 'VenomInfusion'],
            'Monia': ['CoolCheese', 'CoolnessOvercharge', 'CoolPresents', 'CrashLanding', 'GloriousRebirth', 'LifeSerum', 'TrialOfCoolness', 'UltimateDestroyerPunch'],
            'Nicolas': ['AlchemicJournal', 'Alchemy', 'BottledFlame', 'BottledLightning', 'BoulderInABottle', 'ExperimentalPotion', 'MonsterInABottle', 'PressedSkill'],
            'Semi': ['Adventurousness', 'ElixirOfImmortality', 'ElixirOfStrength', 'HealingMelody', 'MagneticGlove', 'Stoneskin', 'TreasureChest', 'TreasureHuntersBackpack'],
            'Sid': ['MagicAmethyst', 'MagicCobalt', 'MagicEmerald', 'MagicRuby', 'MagicSapphire', 'MagicTopaz', 'Thieving', 'ThievingStrike'],
            'Tharx': ['Archer', 'Cavalry', 'Challenge', 'FieldStandard', 'FrontSoldier', 'FuriousAnger', 'GuardChange', 'TharxianHorse'],
            'Toras': ['HeavyHit', 'LegendarySwordOfABarbarianKing', 'Overheat', 'SkullmaelsGreatsword', 'SwordInABottle', 'TheMastersSword', 'TheStormblade', 'TheSunSword'],
            'Vacarn': ['Necromancy', 'SkeletonArcher', 'SkeletonBard', 'SkeletonDeathKnight', 'SkeletonMage', 'SkeletonNecromancer', 'SkeletonReaper', 'SummoningMagic']
        };
        
        console.log('CardRewardManager initialized with Hero rewards and Gold display');
    }

    // Calculate and store gold breakdown for current battle result
    calculateGoldBreakdown(battleResult) {
        // If no battle result provided, try to detect it
        if (!battleResult || battleResult === undefined) {
            console.warn('⚠️ No battle result provided, attempting to detect...');
            battleResult = this.detectBattleResultFromGoldManager();
            console.log('🔍 Detected battle result:', battleResult);
        }
        
        console.log('🏆 Calculating gold breakdown for battle result:', battleResult);
        
        const breakdown = {
            baseGold: 4, // Standard base reward
            battleBonus: 0,
            wealthBonus: 0,
            wealthDetails: [],
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
                console.warn('⚠️ Unknown battle result:', battleResult, 'defaulting to participation bonus');
                breakdown.battleBonus = 1;
                break;
        }

        // Calculate wealth bonuses from current formation
        if (this.heroSelection && this.heroSelection.heroAbilitiesManager) {
            const formation = this.heroSelection.formationManager.getBattleFormation();
            console.log('💰 Checking formation for Wealth abilities:', formation);
            
            ['left', 'center', 'right'].forEach(position => {
                const hero = formation[position];
                if (hero && this.heroSelection.heroAbilitiesManager) {
                    console.log(`🦸 Checking ${hero.name} in ${position} position`);
                    const abilities = this.heroSelection.heroAbilitiesManager.getHeroAbilities(position);
                    if (abilities) {
                        let wealthLevel = 0;
                        
                        // Count Wealth abilities across all zones
                        ['zone1', 'zone2', 'zone3'].forEach(zone => {
                            if (abilities[zone] && Array.isArray(abilities[zone])) {
                                const wealthCount = abilities[zone].filter(a => a && a.name === 'Wealth').length;
                                if (wealthCount > 0) {
                                    console.log(`💎 Found ${wealthCount} Wealth abilities in ${hero.name}'s ${zone}`);
                                }
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
                            console.log(`💰 ${hero.name} contributes ${goldFromHero} gold (${wealthLevel} Wealth levels)`);
                        }
                    }
                }
            });
        } else {
            console.warn('⚠️ Hero selection or abilities manager not available for wealth calculation');
        }

        // Calculate total
        breakdown.total = breakdown.baseGold + breakdown.battleBonus + breakdown.wealthBonus;
        
        console.log('📊 Final gold breakdown:', breakdown);
        return breakdown;
    }

    // Enhanced show rewards method with gold breakdown
    async showRewardsAfterBattle(turnTracker, heroSelection, battleResult = 'victory') {
        this.heroSelection = heroSelection;
        const currentTurn = turnTracker.getCurrentTurn();
        
        // Calculate gold breakdown for this battle BEFORE generating rewards
        this.lastGoldBreakdown = this.calculateGoldBreakdown(battleResult);
        
        console.log(`Showing rewards for turn ${currentTurn} with gold breakdown:`, this.lastGoldBreakdown);
        
        // Store the gold breakdown in a local variable to ensure it's not lost
        const goldBreakdown = this.lastGoldBreakdown;
        
        // Check if this is a Hero reward turn
        const isHeroRewardTurn = currentTurn === 3 || currentTurn === 5;
        
        if (isHeroRewardTurn) {
            console.log(`Turn ${currentTurn} - Showing Hero rewards!`);
            const rewardHeroes = this.generateHeroRewards(3);
            await this.savePendingRewards(rewardHeroes, true); // true = isHeroReward
            // Pass gold breakdown directly to ensure it's available
            setTimeout(() => {
                this.lastGoldBreakdown = goldBreakdown; // Restore it before display
                this.displayHeroRewardUI(rewardHeroes, currentTurn);
            }, 100);
        } else {
            console.log(`Turn ${currentTurn} - Showing ability card rewards`);
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

    // Create gold breakdown display HTML
    createGoldBreakdownHTML() {
        console.log('🎨 Creating gold breakdown HTML. Current breakdown:', this.lastGoldBreakdown);
        
        if (!this.lastGoldBreakdown) {
            console.warn('⚠️ No gold breakdown data available!');
            return `
                <div class="gold-breakdown-container">
                    <div class="gold-breakdown-header">
                        <div class="gold-icon">💰</div>  
                        <h3>Gold Earned</h3>
                    </div>
                    <div class="gold-breakdown-content">
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
        console.log('🎨 Rendering breakdown with data:', breakdown);
        
        return `
            <div class="gold-breakdown-container">
                <div class="gold-breakdown-header">
                    <div class="gold-icon">💰</div>  
                    <h3>Gold Earned</h3>
                </div>
                
                <div class="gold-breakdown-content">
                    <!-- Base Gold -->
                    <div class="gold-line-item">
                        <span class="gold-source">Base</span>
                        <span class="gold-arrow">→</span>
                        <span class="gold-amount">${breakdown.baseGold}</span>
                    </div>
                    
                    <!-- Battle Result Bonus -->
                    <div class="gold-line-item ${breakdown.battleBonus > 1 ? 'victory-bonus' : 'participation-bonus'}">
                        <span class="gold-source">${this.getBattleResultLabel()}</span>
                        <span class="gold-arrow">→</span>
                        <span class="gold-amount">${breakdown.battleBonus}</span>
                    </div>
                    
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
                    
                    <!-- Total Line -->
                    <div class="gold-total-line">
                        <span class="gold-total-label">Total</span>
                        <span class="gold-arrow total-arrow">→</span>
                        <span class="gold-total-amount">${breakdown.total} Gold</span>
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

    // Create dedicated card preview section - UPDATED: Removed labels, made larger
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

    // UPDATED: Create normal-sized hand display section - moved below, normal card sizes
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

    // Enhanced display reward UI with dedicated tooltip area and compact hand display moved up
    displayRewardUI(rewardCards, currentTurn) {
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
                        </div>
                        
                        <div class="reward-main-content">
                            <!-- Gold Breakdown (Left) -->
                            ${this.createGoldBreakdownHTML()}
                            
                            <!-- Reward Cards (Center) -->
                            <div class="reward-cards enhanced-cards">
                                ${rewardCards.map((card, index) => this.createRewardCardHTML(card, index)).join('')}
                            </div>
                        </div>
                        
                        <!-- Hand Display Section -->
                        ${this.createHandDisplaySection()}
                    </div>
                    
                    <!-- Card Preview (Right) - NOW OUTSIDE AND TOP-ALIGNED -->
                    <div class="reward-right-section">
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
    }

    // Enhanced display Hero reward UI with dedicated tooltip area and compact hand display moved up
    displayHeroRewardUI(rewardHeroes, currentTurn) {
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
                            ${currentTurn === 2 ? '<div class="special-reward-indicator turn-2">⚔️ Turn 2 Special Reward</div>' : ''}
                            ${currentTurn === 4 ? '<div class="special-reward-indicator turn-4">🏆 Turn 4 Epic Reward</div>' : ''}
                        </div>
                        
                        <div class="reward-main-content">
                            <!-- Gold Breakdown (Left) -->
                            ${this.createGoldBreakdownHTML()}
                            
                            <!-- Hero Rewards (Center) -->
                            <div class="hero-reward-selection enhanced-hero-selection">
                                ${rewardHeroes.map((hero, index) => this.createHeroRewardHTML(hero, index)).join('')}
                            </div>
                        </div>
                        
                        <!-- MOVED DOWN: Hand Display Section -->
                        ${this.createHandDisplaySection()}
                    </div>
                    
                    <!-- Card Preview (Right) - NOW OUTSIDE AND TOP-ALIGNED -->
                    <div class="reward-right-section">
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
    }

    // Enhanced reward styles with UPDATED preview section and COMPACT hand display
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
                position: fixed;
                width: 100%;
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
            
            /* Gold Breakdown Styles - MADE NARROWER */
            .gold-breakdown-container {
                flex: 0 0 240px; /* Fixed width for gold breakdown */
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
            
            /* UPDATED: Card Preview Section (RIGHT) - No labels, larger display */
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
            
            /* NEW: NORMAL Hand Display Section Styles - MOVED DOWN AND NORMAL SIZE */
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
            
            /* NORMAL hand display overrides - SAME SIZE AS HERO SELECTION SCREEN */
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
            
            /* NORMAL SIZE hand cards for reward screen - DIRECT SIZING INSTEAD OF SCALING */
            .reward-hand-display-section-normal .hand-card {
                width: 120px !important; /* Direct width control - adjust this value */
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
                height: 168px !important; /* Direct height control - adjust this value */
                object-fit: cover !important;
                border-radius: 8px !important;
            }
            
            .reward-hand-display-section-normal .hand-card-name {
                font-size: 12px !important; /* Direct font size control - adjust this value */
                padding: 4px !important;
                line-height: 1.2 !important;
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
            }
            
            /* Keep action indicators visible in normal mode */
            .reward-hand-display-section-normal .action-indicator {
                /* Use default action indicator styles */
            }
            
            /* Existing reward card styles remain the same */
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
                margin-bottom: 15px; /* Reduced margin since hand is now above */
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
            
            .reward-footer {
                text-align: center;
            }
            
            .reward-hint {
                color: rgba(255, 255, 255, 0.6);
                font-style: italic;
            }
            
            /* Responsive Design - UPDATED with compact hand display */
            @media (max-width: 1600px) {
                .reward-container.enhanced-with-gold-and-preview {
                    max-width: 95%;
                    padding: 30px 25px;
                }
                
                .reward-card-preview-section {
                    flex: 0 0 320px; /* Reduced but still larger than before */
                }
                
                .reward-card-preview-area .preview-card-image {
                    max-width: 280px; /* Reduced but still larger */
                }
                
                /* Normal hand cards maintain their size on smaller screens */
                .reward-hand-display-section-normal .hand-cards {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
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
                
                /* Hand cards maintain normal size on medium screens */
                .reward-hand-display-section-normal .hand-cards {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                }
            }
            
            @media (max-width: 1200px) {
                .reward-main-content {
                    flex-direction: column;
                    gap: 25px;
                }
                
                .gold-breakdown-container,
                .reward-card-preview-section {
                    flex: none;
                    align-self: center;
                    max-width: 500px; /* Larger on mobile layout */
                }
                
                .reward-card-preview-area {
                    min-height: 400px; /* Maintain good size on mobile */
                }
                
                .hero-reward-selection.enhanced-hero-selection,
                .reward-cards.enhanced-cards {
                    justify-content: center;
                    flex-wrap: wrap;
                    gap: 20px;
                }
                
                /* Hand display responsive adjustments - MAINTAIN HORIZONTAL LAYOUT */
                .reward-hand-display-section-normal {
                    margin: 15px 0 10px 0;
                    padding: 12px 15px;
                }
                
                .reward-hand-display-section-normal .hand-cards {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    justify-content: center !important;
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
                    max-width: 280px; /* Still reasonably large on mobile */
                }
                
                .reward-hand-display-section-normal {
                    margin: 10px 0 8px 0;
                    padding: 10px 12px;
                }
                
                .reward-hand-display-section-normal .hand-cards {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    justify-content: center !important;
                    gap: 6px !important; /* Slightly smaller gap on mobile */
                }
                
                .reward-header h3 {
                    font-size: 1.2rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Rest of the methods remain unchanged from the original implementation...
    // [All other methods continue here - generateHeroRewards, generateRewardCards, etc.]
    
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
        
        // Get current deck contents to filter out duplicates
        const currentDeck = this.deckManager ? this.deckManager.getDeck() : [];
        const currentDeckCardNames = new Set(currentDeck.map(card => 
            typeof card === 'string' ? card : card.name
        ));
        
        console.log('Current deck cards:', Array.from(currentDeckCardNames));
        
        // Filter out cards that are already in the deck
        const availableCards = allCards.filter(card => !currentDeckCardNames.has(card.name));
        
        console.log(`Filtered cards: ${allCards.length} total -> ${availableCards.length} available (removed ${allCards.length - availableCards.length} duplicates)`);
        
        if (availableCards.length === 0) {
            console.warn('No available cards for rewards - all cards already in deck!');
            return this.generateFallbackRewards(allCards, count);
        }
        
        if (availableCards.length < count) {
            console.warn(`Only ${availableCards.length} available cards, but need ${count} rewards`);
            count = availableCards.length;
        }
        
        const rewardCards = [];
        const usedIndices = new Set();
        
        while (rewardCards.length < count && usedIndices.size < availableCards.length) {
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            
            if (!usedIndices.has(randomIndex)) {
                usedIndices.add(randomIndex);
                rewardCards.push(availableCards[randomIndex]);
            }
        }
        
        console.log('Generated filtered card rewards:', rewardCards.map(c => c.name));
        return rewardCards;
    }

    generateFallbackRewards(allCards, count) {
        console.log('Using fallback reward generation - player may have full collection');
        
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

    // Handle hero selection
    async handleHeroSelection(heroName) {
        console.log('Hero selected:', heroName);
        
        // Prevent multiple selections
        if (this.selectionMade) {
            console.log('Selection already made, ignoring');
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
            
            // Add all hero cards to deck
            let addedCardsCount = 0;
            heroCards.forEach(cardName => {
                const success = this.deckManager.addCard(cardName);
                if (success) {
                    addedCardsCount++;
                }
            });
            
            if (addedCardsCount > 0) {
                console.log(`Successfully added ${addedCardsCount} cards from ${heroName} to deck`);
                
                // Add 1 random hero card to hand
                if (this.handManager && heroCards.length > 0) {
                    const randomIndex = Math.floor(Math.random() * heroCards.length);
                    const randomCard = heroCards[randomIndex];
                    this.handManager.addCardToHand(randomCard);
                    console.log(`Added random hero card ${randomCard} to hand`);
                    
                    // Draw 1 additional card from deck
                    this.handManager.drawCards(1);
                    console.log('Drew 1 additional card from deck');
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
                            
                            console.log(`✨ Added hero ${heroName} to formation slot ${targetSlot}!`);
                            
                            // Get hero info from database for abilities initialization
                            const heroInfo = this.getHeroInfoForAbilities(heroName);
                            
                            if (heroInfo && this.heroSelection.heroAbilitiesManager) {
                                // Initialize hero abilities
                                this.heroSelection.heroAbilitiesManager.updateHeroPlacement(targetSlot, heroInfo);
                                console.log(`Initialized ${heroName} with starting abilities in slot ${targetSlot}`);
                            }
                            
                            // Initialize empty spellbook for the new hero
                            if (this.heroSelection.heroSpellbookManager) {
                                this.heroSelection.heroSpellbookManager.clearHeroSpellbook(targetSlot);
                                console.log(`Initialized empty spellbook for ${heroName} in slot ${targetSlot}`);
                            }
                            
                            heroAddedToFormation = true;
                            
                        } else {
                            console.warn(`Could not find hero data for ${heroName} in allHeroes array`);
                        }
                    } else {
                        console.warn('⚠️ No free slots available in formation for new hero - all slots occupied');
                    }
                } else {
                    console.warn('FormationManager not available, hero not added to formation');
                }
                
                // Update the battle formation UI to show the new hero
                if (heroAddedToFormation && this.heroSelection.updateBattleFormationUI) {
                    this.heroSelection.updateBattleFormationUI();
                    console.log('Updated battle formation UI to show new hero');
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
                
                // Save game state with new cards and hero
                if (this.heroSelection) {
                    await this.heroSelection.saveGameState();
                }
                
                // Reset actions for the new turn after selecting reward
                if (window.heroSelection && window.heroSelection.actionManager) {
                    window.heroSelection.actionManager.resetActions();
                    console.log('✨ Actions reset after hero reward selection');
                    
                    // Update action display immediately
                    window.heroSelection.updateActionDisplay();
                }
                
                // Send formation update to opponent AFTER adding hero
                if (heroAddedToFormation && this.heroSelection.sendFormationUpdate) {
                    await this.heroSelection.sendFormationUpdate();
                    console.log('Sent formation update to opponent with new hero');
                }
                
                // Wait a moment for visual feedback
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Close reward overlay and return to formation
                this.hideRewardOverlay();
                
                // Return to formation screen
                if (this.heroSelection) {
                    this.heroSelection.returnToFormationScreenAfterBattle();
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
            console.error('Error in handleHeroSelection:', error);
            
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

    // Handle card selection
    async handleCardSelection(cardName) {
        console.log('Card selected:', cardName);
        
        // Prevent multiple selections
        if (this.selectionMade) {
            console.log('Selection already made, ignoring');
            return;
        }
        
        // Double-check that the card isn't already in deck (safety check)
        const currentDeck = this.deckManager.getDeck();
        const currentDeckCardNames = currentDeck.map(card => 
            typeof card === 'string' ? card : card.name
        );
        
        if (currentDeckCardNames.includes(cardName)) {
            console.warn(`Card ${cardName} is already in deck, cannot add duplicate`);
            this.showErrorMessage(`You already have ${this.formatCardName(cardName)} in your deck!`);
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
            // Add the selected card to deck
            const success = this.deckManager.addCard(cardName);
            
            if (success) {
                console.log(`Successfully added ${cardName} to deck`);
                
                // Add the reward card to hand + draw 1 additional card
                if (this.handManager) {
                    this.handManager.addCardToHand(cardName);
                    console.log(`Added reward card ${cardName} to hand`);
                    
                    this.handManager.drawCards(1);
                    console.log('Drew 1 additional card from deck');
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
                
                // Save game state with new card
                if (this.heroSelection) {
                    await this.heroSelection.saveGameState();
                }
                
                // Reset actions for the new turn after selecting reward
                if (window.heroSelection && window.heroSelection.actionManager) {
                    window.heroSelection.actionManager.resetActions();
                    console.log('✨ Actions reset after card reward selection');
                    
                    // Update action display immediately
                    window.heroSelection.updateActionDisplay();
                }
                
                // Wait a moment for visual feedback
                await new Promise(resolve => setTimeout(resolve, 1000));
                
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
                console.error('Failed to add card to deck');
                
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
            console.error('Error in handleCardSelection:', error);
            
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
        
        // Re-enable body scrolling
        document.body.classList.remove('reward-overlay-active');
        
        const overlay = document.getElementById('cardRewardOverlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
        
        // Reset selection state
        this.selectionMade = false;
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
                timestamp: Date.now()
            };
            
            await roomRef.child('gameState').child(rewardKey).set(rewardData);
            console.log(`Saved pending ${isHeroReward ? 'hero' : 'card'} rewards with gold breakdown to Firebase`);
            
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
                
                // Restore gold breakdown if available
                if (pendingRewards.goldBreakdown) {
                    this.lastGoldBreakdown = pendingRewards.goldBreakdown;
                    console.log('Restored gold breakdown:', this.lastGoldBreakdown);
                }
                
                // Check if these are hero rewards or card rewards
                if (pendingRewards.isHeroReward) {
                    this.displayHeroRewardUI(pendingRewards.rewards, pendingRewards.turn || 1);
                } else {
                    // Legacy support: check if it has 'cards' property instead of 'rewards'
                    const rewards = pendingRewards.rewards || pendingRewards.cards;
                    this.displayRewardUI(rewards, pendingRewards.turn || 1);
                }
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking pending rewards:', error);
            return false;
        }
    }

    // Clear any active card rewards
    clearAnyActiveCardRewards() {
        // Re-enable body scrolling
        document.body.classList.remove('reward-overlay-active');
        
        const existingOverlay = document.getElementById('cardRewardOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Clear any tooltips
        this.cardPreviewManager.hideCardTooltip();
        
        // Reset state
        this.selectionMade = false;
        this.lastAddedRewardCard = null;
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

    // In cardRewardManager.js - Add this as a fallback method
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
}

// Export for ES6 module compatibility
export default CardRewardManager;