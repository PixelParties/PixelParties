// cardRewardManager.js - Enhanced with Improved Redraw Button and Gold Display System

import { CardPreviewManager } from './cardPreviewManager.js';
import { getCardInfo, getAllAbilityCards, getHeroInfo } from './cardDatabase.js';
import { killTracker } from './killTracker.js';
import CharmeManager from './Abilities/charme.js';
import { SidHeroEffect } from './Heroes/sid.js';
import { CardRewardGenerator } from './cardRewardGenerator.js';

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

        // Initialize card reward generator
        this.cardRewardGenerator = new CardRewardGenerator();

        this.sidHeroEffect = null;
        
        // Define all available heroes and their card sets
        this.allHeroes = [
            { name: 'Alice', image: './Cards/Characters/Alice.png' },
            { name: 'Beato', image: './Cards/Characters/Beato.png' },
            { name: 'Cecilia', image: './Cards/Characters/Cecilia.png' },
            { name: 'Darge', image: './Cards/Characters/Darge.png' },
            { name: 'Gon', image: './Cards/Characters/Gon.png' },
            { name: 'Heinz', image: './Cards/Characters/Heinz.png' },
            { name: 'Ida', image: './Cards/Characters/Ida.png' },
            { name: 'Kazena', image: './Cards/Characters/Kazena.png' },
            { name: 'Kyli', image: './Cards/Characters/Kyli.png' },
            { name: 'Luna', image: './Cards/Characters/Luna.png' },
            { name: 'Medea', image: './Cards/Characters/Medea.png' },
            { name: 'Monia', image: './Cards/Characters/Monia.png' },
            { name: 'Nicolas', image: './Cards/Characters/Nicolas.png' },
            { name: 'Nomu', image: './Cards/Characters/Nomu.png' },
            { name: 'Semi', image: './Cards/Characters/Semi.png' },
            { name: 'Sid', image: './Cards/Characters/Sid.png' },
            { name: 'Tharx', image: './Cards/Characters/Tharx.png' },
            { name: 'Toras', image: './Cards/Characters/Toras.png' },
            { name: 'Vacarn', image: './Cards/Characters/Vacarn.png' },
            { name: 'Waflav', image: './Cards/Characters/Waflav.png' }
        ];
        
        this.heroCardSets = {
            'Alice': ['CrumTheClassPet', 'DestructionMagic', 'Jiggles', 'GrinningCat', 'MoonlightButterfly', 'PhoenixBombardment', 'RoyalCorgi', 'SummoningMagic'],
            'Beato': ['MagicArts', 'ButterflyCloud', 'DivineGiftOfMagic', 'CreateIllusion', 'AntiMagicShield', 'AuroraBorealis', 'MoonlightButterfly', 'MagicLamp'],
            'Cecilia': ['CrusadersArm-Cannon', 'CrusadersCutlass', 'CrusadersFlintlock', 'CrusadersHookshot', 'Leadership', 'Navigation', 'WantedPoster', 'Wealth'],
            'Darge': ['AngelfeatherArrow', 'BombArrow', 'FlameArrow', 'GoldenArrow', 'PoisonedArrow', 'Fighting', 'RainbowsArrow', 'RainOfArrows'],
            'Gon': ['BladeOfTheFrostbringer', 'ElixirOfCold', 'Cold-HeartedYuki-Onna', 'DecayMagic', 'HeartOfIce', 'Icebolt', 'IcyGrave', 'SnowCannon'],
            'Heinz': ['Inventing', 'FutureTechDrone', 'FutureTechMech', 'AncientTechInfiniteEnergyCore', 'BirthdayPresent', 'FutureTechFists', 'FutureTechLamp', 'FutureTechCopyDevice'],
            'Ida': ['BottledFlame', 'BurningFinger', 'MountainTearRiver', 'DestructionMagic', 'Fireball', 'Fireshield', 'FlameAvalanche', 'VampireOnFire'],
            'Kazena': ['Adventurousness',  'SupportMagic', 'GatheringStorm', 'Haste', 'CloudPillow', 'StormRing', 'CloudInABottle', 'ElixirOfQuickness'],
            'Kyli': ['Biomancy',  'Occultism', 'MonsterInABottle', 'OverflowingChalice', 'BloodSoakedCoin', 'DoomClock', 'GraveWorm', 'TheRootOfAllEvil'],
            'Luna': ['DestructionMagic',  'Friendship', 'TearingMountain', 'MountainTearRiver', 'LunaKiai', 'PriestOfLuna', 'HeartOfTheMountain', 'DichotomyOfLunaAndTempeste'],
            'Medea': ['DecayMagic', 'PoisonedMeat', 'PoisonedWell', 'PoisonPollen', 'PoisonVial', 'ToxicFumes', 'ToxicTrap', 'VenomInfusion'],
            'Monia': ['CoolCheese', 'CoolnessOvercharge', 'CoolPresents', 'CrashLanding', 'GloriousRebirth', 'LifeSerum', 'TrialOfCoolness', 'UltimateDestroyerPunch'],
            'Nicolas': ['AlchemicJournal', 'Alchemy', 'BottledFlame', 'BottledLightning', 'BoulderInABottle', 'ExperimentalPotion', 'MonsterInABottle', 'AcidVial'],
            'Nomu': ['MagicArts', 'Training', 'Teleport', 'Teleportal', 'StaffOfTheTeleporter', 'TeleportationPowder', 'PlanetInABottle', 'SpatialCrevice'],
            'Semi': ['Adventurousness', 'ElixirOfImmortality', 'Wheels', 'HealingMelody', 'MagneticGlove', 'Stoneskin', 'TreasureChest', 'TreasureHuntersBackpack'],
            'Sid': ['MagicAmethyst', 'MagicCobalt', 'MagicEmerald', 'MagicRuby', 'MagicSapphire', 'MagicTopaz', 'Thieving', 'ThievingStrike'],
            'Tharx': ['Leadership', 'Archer', 'Cavalry', 'FieldStandard', 'FrontSoldier', 'FuriousAnger', 'GuardChange', 'TharxianHorse'],
            'Toras': ['Fighting', 'HeavyHit', 'LegendarySwordOfABarbarianKing', 'SkullmaelsGreatsword', 'SwordInABottle', 'TheMastersSword', 'TheStormblade', 'TheSunSword'],
            'Vacarn': ['Necromancy', 'SkeletonArcher', 'SkeletonBard', 'SkeletonDeathKnight', 'SkeletonMage', 'SkeletonNecromancer', 'SkeletonReaper', 'SummoningMagic'],
            'Waflav': ['Cannibalism', 'Toughness', 'StormkissedWaflav', 'FlamebathedWaflav', 'ThunderstruckWaflav', 'SwampborneWaflav', 'DeepDrownedWaflav', 'CaptureNet']
        };

        // Redraw system
        this.redrawCost = 1; // Starting cost
        this.totalRedraws = 0; // Track total redraws this session
        this.currentRewardCards = []; // Store current rewards for redraw
        this.currentRewardType = null; // 'cards' or 'heroes'
        this.isRedrawing = false; // Prevent multiple redraws at once

        // View mode system
        this.viewMode = 'rewards'; // 'rewards' or 'battlefield'

        // Initialize Charme manager
        this.charmeManager = new CharmeManager();
        this.charmeManager.init(this);
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
            swordBonuses: [],
            sapphireBonus: 0,  
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
        }

        // Calculate Magic Sapphire bonus
        if (this.heroSelection && this.heroSelection.magicSapphiresUsed) {
            breakdown.sapphireBonus = this.heroSelection.magicSapphiresUsed;
        }
        
        // Calculate LegendarySwordOfABarbarianKing bonuses
        if (this.heroSelection && this.heroSelection.heroEquipmentManager) {
            const formation = this.heroSelection.formationManager.getBattleFormation();
            
            ['left', 'center', 'right'].forEach(position => {
                const hero = formation[position];
                if (hero) {
                    // Get equipment for this hero
                    const equipment = this.heroSelection.heroEquipmentManager.getHeroEquipment(position);
                    
                    // Count LegendarySwordOfABarbarianKing
                    const swordCount = equipment ? equipment.filter(item => 
                        item && (item.name === 'LegendarySwordOfABarbarianKing' || item.cardName === 'LegendarySwordOfABarbarianKing')
                    ).length : 0;
                    
                    if (swordCount > 0) {
                        // Get kill count for this hero
                        const killCount = killTracker.getKillCount('player', position);
                        
                        if (killCount > 0) {
                            // Calculate bonuses: swordCount * killCount * 1 attack, * 3 HP
                            const attackGain = swordCount * killCount * 1;
                            const hpGain = swordCount * killCount * 3;
                            
                            breakdown.swordBonuses.push({
                                heroName: hero.name,
                                position: position,
                                swordCount: swordCount,
                                killCount: killCount,
                                attackGain: attackGain,
                                hpGain: hpGain
                            });
                        }
                    }
                }
            });
        }
        
        // Calculate total
        breakdown.total = breakdown.baseGold + breakdown.battleBonus + breakdown.wealthBonus + 
                        breakdown.semiBonus + breakdown.thievingGained - breakdown.thievingLost +
                        breakdown.wantedPosterBonus + breakdown.sapphireBonus;
        
        return breakdown;
    }

    // Enhanced show rewards method with gold breakdown
    async showRewardsAfterBattle(turnTracker, heroSelection, battleResult = 'victory') {
        // Reset redraw cost for new reward session
        this.redrawCost = 1;

        this.heroSelection = heroSelection;
        const currentTurn = turnTracker.getCurrentTurn();
        
        // Set game phase to Reward when showing rewards
        await this.heroSelection.setGamePhase('Reward');
        
        // Calculate gold breakdown for this battle BEFORE generating rewards
        this.lastGoldBreakdown = this.calculateGoldBreakdown(battleResult);
        
        // Store the gold breakdown in a local variable to ensure it's not lost
        const goldBreakdown = this.lastGoldBreakdown;

        // Charme counters
        this.charmeManager.setCharmeCounters(heroSelection);

        // Sid card theft
        let sidTheftData = null;

        // Check formation
        const formation = heroSelection.formationManager.getBattleFormation();

        const hasSid = ['left', 'center', 'right'].some(position => {
            const hero = formation[position];
            const isSid = hero && hero.name === 'Sid';
            return isSid;
        });

        if (hasSid) {            
            try {
                // Import Sid effect if not already loaded
                if (!this.sidHeroEffect) {
                    const module = await import('./Heroes/sid.js');
                    this.sidHeroEffect = module.sidHeroEffect || new module.SidHeroEffect();
                }
                
                // Perform card theft
                sidTheftData = await this.sidHeroEffect.performCardTheft(heroSelection, this);
                
                if (sidTheftData) {
                    // Refresh display if already shown
                    const breakdownContainer = document.querySelector('.gold-breakdown-container');
                    if (breakdownContainer) {
                        breakdownContainer.outerHTML = this.createGoldBreakdownHTML();
                    }
                }
            } catch (error) {
                // Silent error handling
            }
        }

        // Use cached Royal Corgi bonus cards (calculated before cleanup reset counters)
        let royalCorgiBonusCards = this.cachedRoyalCorgiBonusCards || 0;
        
        // Clear the cached value to prevent reuse
        this.cachedRoyalCorgiBonusCards = 0;

        // Add bonus cards to hand if any
        if (royalCorgiBonusCards > 0 && this.handManager) {
            this.handManager.drawCards(royalCorgiBonusCards);
            
            // Show notification
            const notification = document.createElement('div');
            notification.textContent = `Royal Corgi bonus: +${royalCorgiBonusCards} cards!`;
            notification.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 215, 0, 0.9);
                color: black;
                padding: 15px 25px;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        let kazenaBonusCards = 0;
        if (window.kazenaEffect) {
            kazenaBonusCards = window.kazenaEffect.calculateKazenaBonusCards(heroSelection);
        }

        // Add bonus cards to hand if any
        if (kazenaBonusCards > 0 && this.handManager) {
            this.handManager.drawCards(kazenaBonusCards);
            
            // Show notification
            const notification = document.createElement('div');
            notification.textContent = `Kazena bonus: +${kazenaBonusCards} cards!`;
            notification.style.cssText = `
                position: fixed;
                top: 25%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(135, 206, 235, 0.9);
                color: black;
                padding: 15px 25px;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        // Check for Birthday Present bonus cards from opponent
        let birthdayPresentBonusCards = 0;

        // Use the correct field name and add fallback
        const opponentCounter = heroSelection.opponentCounters?.birthdayPresent || 
                       heroSelection.opponentBirthdayPresentCounterData || 0;

        if (opponentCounter > 0) {
            birthdayPresentBonusCards = opponentCounter;
                        
            // Add bonus cards to hand
            if (this.handManager) {
                this.handManager.drawCards(birthdayPresentBonusCards);
                
                // Show notification
                const notification = document.createElement('div');
                notification.textContent = `Birthday Present bonus: +${birthdayPresentBonusCards} cards!`;
                notification.style.cssText = `
                    position: fixed;
                    top: 30%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(255, 192, 203, 0.9);
                    color: black;
                    padding: 15px 25px;
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: bold;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease-out;
                `;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => notification.remove(), 300);
                }, 3000);
            }
            
            // Clear the counter since it's been used
            if (heroSelection.playerCounters) {
                heroSelection.playerCounters.birthdayPresent = 0;
            }
            
            if (heroSelection.opponentCounters) {
                heroSelection.opponentCounters.birthdayPresent = 0;
            }
            
            // Store this for the breakdown display
            this.birthdayPresentBonusCards = birthdayPresentBonusCards;
        }
        
        // Check if this is a Hero reward turn
        const isHeroRewardTurn = currentTurn === 3 || currentTurn === 5;
        
        if (isHeroRewardTurn) {
            const rewardHeroes = this.generateHeroRewards(3);
            
            // TIMING FIX: Save pending rewards AFTER all bonus cards have been added to hand
            await this.savePendingRewards(rewardHeroes, true); // true = isHeroReward
            
            // Pass gold breakdown directly to ensure it's available
            setTimeout(() => {
                this.lastGoldBreakdown = goldBreakdown; // Restore it before display
                this.displayHeroRewardUI(rewardHeroes, currentTurn);
            }, 100);
        } else {
            const rewardCards = this.generateRewardCards(3);
            
            // TIMING FIX: Save pending rewards AFTER all bonus cards have been added to hand
            await this.savePendingRewards(rewardCards, false); // false = not hero reward
            
            // Pass gold breakdown directly to ensure it's available
            setTimeout(() => {
                this.lastGoldBreakdown = goldBreakdown; // Restore it before display
                this.displayRewardUI(rewardCards, currentTurn);
            }, 100);
        }
        
        return true;
    }

    // Create gold breakdown display HTML with total gold display
    createGoldBreakdownHTML() {
        if (!this.lastGoldBreakdown) {
            return `
                <div class="gold-breakdown-container">
                    <div class="gold-breakdown-header">
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

                    <!-- Wanted Poster Section -->
                    ${generateWantedPosterBonusHTML({ 
                        totalBonus: breakdown.wantedPosterBonus, 
                        details: breakdown.wantedPosterDetails 
                    })}

                    <!-- Magic Sapphire Section -->
                    ${breakdown.sapphireBonus > 0 ? `
                        <div class="gold-line-item sapphire-bonus">
                            <span class="gold-source">Magic Sapphires (${breakdown.sapphireBonus} used)</span>
                            <span class="gold-arrow">→</span>
                            <span class="gold-amount">${breakdown.sapphireBonus}</span>
                        </div>
                    ` : ''}

                    <!-- Kazena Section -->
                    ${(() => {
                        if (window.kazenaEffect && this.heroSelection) {
                            const kazenaBonusCards = window.kazenaEffect.calculateKazenaBonusCards(this.heroSelection);
                            
                            if (kazenaBonusCards > 0) {
                                return `
                                    <div class="gold-line-item kazena-bonus">
                                        <span class="gold-source">Kazena Winds (${kazenaBonusCards} bonus cards)</span>
                                        <span class="gold-arrow">→</span>
                                        <span class="gold-amount">Cards</span>
                                    </div>
                                `;
                            }
                        }
                        return '';
                    })()}

                    <!-- Birthday Present Section -->
                    ${(() => {
                        if (this.birthdayPresentBonusCards && this.birthdayPresentBonusCards > 0) {
                            return `
                                <div class="gold-line-item birthday-present-bonus">
                                    <span class="gold-source">Presents from your opponent (${this.birthdayPresentBonusCards} bonus cards)</span>
                                    <span class="gold-arrow">→</span>
                                    <span class="gold-amount">Cards</span>
                                </div>
                            `;
                        }
                        return '';
                    })()}

                    <!-- Sid Card Theft Section -->
                    ${(() => {                        
                        if (this.sidHeroEffect && this.heroSelection && this.heroSelection.formationManager) {
                            const formation = this.heroSelection.formationManager.getBattleFormation();
                            const hasSid = ['left', 'center', 'right'].some(position => 
                                formation[position] && formation[position].name === 'Sid'
                            );
                            const html = this.sidHeroEffect.generateStolenCardsHTML(hasSid);
                            return html;
                        }
                        return '';
                    })()}
                    
                    <!-- Legendary Sword Bonuses Section -->
                    ${breakdown.swordBonuses && breakdown.swordBonuses.length > 0 ? `
                        <div class="sword-bonuses-section-header">
                            <div class="gold-line-item sword-bonuses-header-item">
                                <span class="gold-source">
                                    Legendary Sword Bonuses
                                </span>
                                <span class="gold-arrow">→</span>
                                <span class="gold-amount">Stats</span>
                            </div>
                        </div>
                        
                        <!-- Individual Sword Bonus Lines -->
                        ${breakdown.swordBonuses.map(bonus => `
                            <div class="sword-bonus-detail-line">
                                <div class="sword-hero-info">
                                    <span class="sword-hero-name">${bonus.heroName}</span>
                                    <span class="sword-calculation">${bonus.swordCount} Sword${bonus.swordCount > 1 ? 's' : ''} × ${bonus.killCount} kills</span>
                                </div>
                                <div class="sword-gains">
                                    <span class="attack-gain">+${bonus.attackGain} ATK</span>
                                    <span class="hp-gain">+${bonus.hpGain} HP</span>
                                </div>
                            </div>
                        `).join('')}
                    ` : ''}
                    
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
        const buttonIcon = isShowingRewards ? '⚔️' : '🪙';
        
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
        
        // Use Charme manager to get effective cost
        const effectiveRedrawCost = this.charmeManager.getEffectiveRedrawCost(this.redrawCost);
        const canAfford = totalAvailableGold >= effectiveRedrawCost;
        
        return `
            <div class="enhanced-redraw-container">
                <button class="enhanced-redraw-button ${!canAfford ? 'disabled' : ''}" 
                        onclick="window.handleRewardRedraw()"
                        ${!canAfford ? 'disabled' : ''}>
                    ${this.charmeManager.createCharmeCountersHTML()}
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
                                ${this.charmeManager.createRedrawCostHTML(this.redrawCost)}
                            </div>
                        </div>
                    </div>
                </button>
                ${!canAfford && !this.charmeManager.shouldRedrawBeFree() ? `
                    <div class="redraw-insufficient-funds">
                        <span class="warning-icon">⚠️</span>
                        Need ${this.redrawCost - totalAvailableGold} more gold
                    </div>
                ` : ''}
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

    // Updated handleRedraw method to work with total gold
    async handleRedraw() {
        if (this.isRedrawing || this.selectionMade) {
            return;
        }
        
        // Get effective cost from Charme manager
        const effectiveRedrawCost = this.charmeManager.getEffectiveRedrawCost(this.redrawCost);
        
        // Calculate total available gold
        const currentGold = this.goldManager.getPlayerGold();
        const pendingGold = this.lastGoldBreakdown ? (this.lastGoldBreakdown.total - (this.lastGoldBreakdown.redrawDeduction || 0)) : 0;
        const totalAvailableGold = currentGold + pendingGold;
        
        if (totalAvailableGold < this.redrawCost) {
            this.showRedrawError(`Not enough gold! Need ${this.redrawCost} gold.`);
            return;
        }
        
        this.isRedrawing = true;
        
         // Handle payment - either use Charme counter or gold
        if (this.charmeManager.shouldRedrawBeFree()) {
            // Use Charme counter
            this.charmeManager.consumeCharmeCounter();
        } else {
            // Use gold (existing logic)
            this.showTotalGoldChange(-effectiveRedrawCost);
            
            let goldToDeductFromCurrent = Math.min(currentGold, effectiveRedrawCost);
            let goldToDeductFromPending = effectiveRedrawCost - goldToDeductFromCurrent;
            
            if (goldToDeductFromCurrent > 0) {
                const newGoldAmount = currentGold - goldToDeductFromCurrent;
                this.goldManager.setPlayerGold(newGoldAmount, 'redraw');
            }
            
            if (goldToDeductFromPending > 0 && this.lastGoldBreakdown) {
                this.lastGoldBreakdown.redrawDeduction = (this.lastGoldBreakdown.redrawDeduction || 0) + goldToDeductFromPending;
            }
            
            // Only increment redraw cost if not using Charme counters
            this.redrawCost++;
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

    // New method to show total gold change animation
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
                            <h2>⚔️ Battle Rewards</h2>
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
                            <h2>Hero Reward!</h2>
                            <p>Choose one Hero to join your roster (Turn ${currentTurn})</p>
                            ${currentTurn === 3 ? '<div class="special-reward-indicator turn-3"> Turn 3 Special Reward</div>' : ''}
                            ${currentTurn === 5 ? '<div class="special-reward-indicator turn-5"> Turn 5 Epic Reward</div>' : ''}
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
        
        // Update button
        this.updateViewToggleButton();
        
        // Toggle visibility of reward elements
        const toggleableElements = document.querySelectorAll('.toggleable-content');
        const overlay = document.getElementById('cardRewardOverlay');
        
        if (this.viewMode === 'battlefield') {
            // Hide reward elements and make overlay transparent
            toggleableElements.forEach(el => {
                el.style.display = 'none';
            });
            if (overlay) {
                overlay.classList.add('battlefield-mode');
            }
            
            // Try to show battle arena with recovery
            const battleArena = document.getElementById('battleArena');
            if (battleArena) {
                battleArena.style.display = 'block';
            } else {
                // Try to find battle arena by class name
                const battleArenaByClass = document.querySelector('.battle-arena');
                if (battleArenaByClass) {
                    battleArenaByClass.style.display = 'block';
                } else {
                    // Attempt to recover by initializing battle screen
                    const recoverySuccess = await this.attemptBattleScreenRecovery();
                    
                    if (recoverySuccess) {
                        const recoveredArena = document.getElementById('battleArena');
                        if (recoveredArena) {
                            recoveredArena.style.display = 'block';
                        } else {
                            this.showBattleViewError();
                        }
                    } else {
                        this.showBattleViewError();
                    }
                }
            }
            
        } else {
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
            }
        }
        
        // Save the view mode state
        this.saveViewModeState();
    }

    // Attempt to recover battle screen when missing
    async attemptBattleScreenRecovery() {
        if (!this.heroSelection) {
            return false;
        }
        
        try {
            // Use the same method we added for ensuring battle screen initialization
            const recoverySuccess = await this.ensureBattleScreenInitialized(this.heroSelection);
            
            if (recoverySuccess) {
                return true;
            } else {
                return false;
            }
            
        } catch (error) {
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
        const buttonIcon = isShowingRewards ? '⚔️' : '🪙';
        
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
            return;
        }
        
        // Update button
        this.updateViewToggleButton();
        
        // Hide reward elements and make overlay transparent
        const toggleableElements = document.querySelectorAll('.toggleable-content');
        const overlay = document.getElementById('cardRewardOverlay');
        
        toggleableElements.forEach(el => {
            el.style.display = 'none';
        });
        
        if (overlay) {
            overlay.classList.add('battlefield-mode');
        }
        
        // Show the battle arena for battlefield mode
        const battleArena = document.getElementById('battleArena');
        if (battleArena) {
            battleArena.style.display = 'block';
        } else {
            // Search for battle arena by class
            const battleArenaByClass = document.querySelector('.battle-arena');
            if (battleArenaByClass) {
                battleArenaByClass.id = 'battleArena'; // Ensure it has the right ID
                battleArenaByClass.style.display = 'block';
            }
        }
    }

    // Save view mode state to local storage and pending rewards
    async saveViewModeState() {
        // Save to local storage for immediate persistence
        try {
            localStorage.setItem('rewardViewMode', this.viewMode);
        } catch (error) {
            // Silent error handling
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
                
            } catch (error) {
                // Silent error handling
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
            }
        } catch (error) {
            // Silent error handling
        }
        
        // Apply the restored view mode
        if (this.viewMode === 'battlefield') {
            // Delay to ensure DOM is ready
            setTimeout(() => {
                this.toggleRewardView();
            }, 100);
        }
    }

    // Enhanced reward styles - now loads CSS file and adds dynamic styles
    ensureRewardStyles() {
        // Check if CSS file link already exists
        if (document.getElementById('rewardStyles')) return;
        
        // Create link to external CSS file
        const cssLink = document.createElement('link');
        cssLink.id = 'rewardStyles';
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = './CSS/rewards.css';
        document.head.appendChild(cssLink);
        
        // Add dynamic styles from other modules
        const dynamicStyle = document.createElement('style');
        dynamicStyle.id = 'rewardDynamicStyles';
        dynamicStyle.textContent = '';
        
        // Add Wanted Poster styles
        dynamicStyle.textContent += getWantedPosterStyles();
        
        // Add Sid Hero styles
        dynamicStyle.textContent += SidHeroEffect.getSidStyles();
        
        // Add Charme Manager styles
        dynamicStyle.textContent += CharmeManager.getCharmeStyles();
        
        document.head.appendChild(dynamicStyle);
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
        
        // Get base hero names from any Ascended heroes currently in formation
        const currentBaseHeroNames = Object.values(currentFormation)
            .filter(hero => hero !== null)
            .map(hero => {
                const heroInfo = this.heroSelection.getCardInfo(hero.name);
                if (heroInfo && heroInfo.subtype === 'Ascended' && heroInfo.baseHero) {
                    return heroInfo.baseHero;
                }
                return null;
            })
            .filter(baseHero => baseHero !== null);
        
        // Filter out already used heroes and their base forms
        const availableHeroes = this.allHeroes.filter(hero => {
            // Skip if hero is already in formation
            if (usedHeroNames.includes(hero.name)) {
                return false;
            }
            
            // Skip if hero's base form is already in play as an Ascended version
            if (currentBaseHeroNames.includes(hero.name)) {
                return false;
            }
            
            // Check if hero has "Ascended" subtype and exclude it
            const heroInfo = this.heroSelection.getCardInfo(hero.name);
            if (heroInfo && heroInfo.subtype === 'Ascended') {
                return false;
            }
            
            return true;
        });
        
        if (availableHeroes.length === 0) {
            return [];
        }
        
        if (availableHeroes.length < count) {
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
        
        return rewardHeroes;
    }

    generateRewardCards(count = 3) {
        // Use the card reward generator with player counters for Monkee support
        const playerCounters = this.heroSelection?.playerCounters || { goldenBananas: 0 };
        return this.cardRewardGenerator.generateRewardCards(this.deckManager, playerCounters, count);
    }

    createHeroRewardHTML(hero, index) {
        const heroCards = this.heroCardSets[hero.name] || [];
        
        // Add tags HTML using the existing tagsManager
        const tagsHTML = window.tagsManager ? 
            window.tagsManager.createTagsHTML(hero.name, {
                size: 'small',
                layout: 'horizontal',
                animated: true
            }) : '';
        
        return `
            <div class="reward-card hero-reward-card" data-reward-index="${index}">
                <div class="reward-card-inner">
                    <div class="reward-hero-image-container">
                        <img src="${hero.image}" 
                             alt="${hero.name}" 
                             class="hero-card-image"
                             onerror="this.src='./Cards/Characters/placeholder.png'">
                        ${tagsHTML}
                    </div>
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
                const success = this.deckManager.addCardReward(cardName);
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

                // Reset Kazena
                if (window.kazenaEffect) {
                    window.kazenaEffect.clearAllKazenaCounters(heroSelection);
                }
                this.kazenaReconnectionCards = null;

                
                // Clear pending rewards from Firebase
                await this.clearPendingRewards();
                
                // Clear final battle state
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

    // Handle card selection
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
            const success = this.deckManager.addCardReward(cardName);
            
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
                
                // Clear final battle state
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

                if (window.kazenaEffect) {
                    window.kazenaEffect.clearAllKazenaCounters(heroSelection);
                }
                this.kazenaReconnectionCards = null;
                
                // Wait a moment for visual feedback
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Set game phase back to Formation before closing
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
            // Silent error handling
        }
        
        // Hide battle arena if it was shown during battlefield view
        const battleArena = document.getElementById('battleArena');
        if (battleArena) {
            battleArena.style.display = 'none';
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
            return;
        }
        
        // Method 2: Use heroSelection's battle screen instance
        if (this.heroSelection && this.heroSelection.battleScreen && 
            typeof this.heroSelection.battleScreen.showSurrenderButton === 'function') {
            this.heroSelection.battleScreen.showSurrenderButton();
            return;
        }
        
        // Method 3: Direct DOM manipulation as fallback
        document.body.classList.remove('battle-active');
        const surrenderButton = document.querySelector('.surrender-button');
        if (surrenderButton) {
            surrenderButton.style.display = '';
        }
    }

    // Save pending rewards to Firebase (updated to handle hero rewards and gold breakdown)
    async savePendingRewards(rewards, isHeroReward = false) {
        if (!this.heroSelection || !this.heroSelection.roomManager) {
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
                goldBreakdown: this.lastGoldBreakdown,
                redrawCost: this.redrawCost,
                totalRedraws: this.totalRedraws,
                charmeState: this.charmeManager.exportCharmeState(),
                viewMode: this.viewMode,
                // *** NEW: Save current hand state including bonus cards ***
                handState: this.handManager ? this.handManager.exportHand() : null,
                timestamp: Date.now()
            };
            
            await roomRef.child('gameState').child(rewardKey).set(rewardData);
            
        } catch (error) {
            // Silent error handling
        }
    }

    // Check and restore pending rewards (updated to handle gold breakdown)
    async checkAndRestorePendingRewards(heroSelection) {
        this.heroSelection = heroSelection;
        
        if (!heroSelection || !heroSelection.roomManager) {
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
                // Initialize battle screen BEFORE restoring rewards
                const battleScreenInitialized = await this.ensureBattleScreenInitialized(heroSelection);
                if (!battleScreenInitialized) {
                    // Still show rewards but warn user that battlefield view may not work
                }
                
                // *** Restore hand state if available ***
                if (pendingRewards.handState && this.handManager) {
                    const handRestored = this.handManager.importHand(pendingRewards.handState);
                    if (handRestored) {
                        // Silent success
                    }
                }
                
                // Restore gold breakdown if available
                if (pendingRewards.goldBreakdown) {
                    this.lastGoldBreakdown = pendingRewards.goldBreakdown;
                }
                
                // Restore redraw state
                if (pendingRewards.redrawCost !== undefined) {
                    this.redrawCost = pendingRewards.redrawCost;
                    this.totalRedraws = pendingRewards.totalRedraws || 0;
                }
                
                // Restore view mode state
                if (pendingRewards.viewMode) {
                    this.viewMode = pendingRewards.viewMode;
                } else {
                    // Fallback to localStorage
                    this.restoreViewModeState();
                }

                // Restore Charme state
                if (pendingRewards.charmeState) {
                    this.charmeManager.importCharmeState(pendingRewards.charmeState, heroSelection);
                } else {
                    // Backward compatibility - recalculate
                    this.charmeManager.importCharmeState(null, heroSelection);
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
            return false;
        }
    }

    // Ensure battle screen is initialized for reward reconnection
    async ensureBattleScreenInitialized(heroSelection) {
        try {
            // Check if we have the required data
            if (!heroSelection.selectedCharacter || !heroSelection.opponentSelectedCharacter) {
                return false;
            }
            
            const playerFormation = heroSelection.formationManager.getBattleFormation();
            const opponentFormation = heroSelection.formationManager.getOpponentBattleFormation();
            
            if (!playerFormation || !opponentFormation) {
                return false;
            }
            
            // Check if battle screen already exists and is properly initialized
            const existingBattleArena = document.getElementById('battleArena');
            if (existingBattleArena && existingBattleArena.innerHTML.trim() !== '') {
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
            
            // Initialize battle screen if not already done
            if (!heroSelection.battleScreen) {
                const { BattleScreen } = await import('./battleScreen.js');
                heroSelection.battleScreen = new BattleScreen();
            }
            
            // Try normal initialization first
            let battleInitialized = heroSelection.initBattleScreen();
            
            if (battleInitialized && heroSelection.battleScreen) {
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
                    
                    return true;
                } else {
                    battleInitialized = false;
                }
            }
            
            // Fallback: Manual battle screen setup
            if (!battleInitialized) {
                return await this.manualBattleScreenSetup(heroSelection);
            }
            
            return battleInitialized;
            
        } catch (error) {
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
        } catch (error) {
            // Silent error handling
        }
    }

    // Manual battle screen setup as fallback
    async manualBattleScreenSetup(heroSelection) {
        try {
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
                return true;
            } else {
                return false;
            }
            
        } catch (error) {
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
            // Silent error handling
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

    async handleOpponentSidTheft(data, heroSelection) {
        if (!this.sidHeroEffect) {
            // Import if not loaded
            import('./Heroes/sid.js').then(({ sidHeroEffect }) => {
                this.sidHeroEffect = sidHeroEffect;
                this.sidHeroEffect.handleOpponentTheft(data, heroSelection);
                
                // UPDATE: Refresh reward screen hand display after theft
                setTimeout(() => {
                    this.updateRewardScreenHandDisplay();
                }, 100);
            });
        } else {
            await this.sidHeroEffect.handleOpponentTheft(data, heroSelection);
            
            // UPDATE: Refresh reward screen hand display after theft
            setTimeout(() => {
                this.updateRewardScreenHandDisplay();
            }, 100);
        }
    }

    updateRewardScreenHandDisplay() {
        const rewardHandSection = document.querySelector('.reward-hand-display-section-normal');
        if (rewardHandSection && this.heroSelection && this.heroSelection.handManager) {
            // Recreate the hand display section with current hand
            const updatedHandDisplay = this.createHandDisplaySection();
            rewardHandSection.outerHTML = updatedHandDisplay;
        }
    }

    // Handle opponent bonus card draw notification
    handleOpponentBonusCardDraw(heroSelection) {
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
            return;
        }
        
        try {
            const roomRef = this.heroSelection.roomManager.getRoomRef();
            if (!roomRef) return;
            
            const isHost = this.heroSelection.isHost;
            const rewardKey = isHost ? 'hostPendingRewards' : 'guestPendingRewards';
            
            await roomRef.child('gameState').child(rewardKey).remove();
            
        } catch (error) {
            // Silent error handling
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
            return false;
        }
        
        const totalGold = this.lastGoldBreakdown.total - (this.lastGoldBreakdown.redrawDeduction || 0);
        
        if (this.goldManager && totalGold !== 0) {
            // Apply the net gold effect (could be negative if opponent stole more than you gained)
            if (totalGold > 0) {
                this.goldManager.awardGold(totalGold, false, 'battle_reward');
            } else if (totalGold < 0) {
                // If total is negative due to thieving, subtract the gold
                this.goldManager.subtractPlayerGold(Math.abs(totalGold));
            }
            
            // Send thieving update to opponent
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
        }
        
        // Apply LegendarySwordOfABarbarianKing bonuses
        if (this.lastGoldBreakdown.swordBonuses && this.lastGoldBreakdown.swordBonuses.length > 0) {
            this.applySwordBonuses(this.lastGoldBreakdown.swordBonuses);
        }
        
        return totalGold !== 0;
    }

    applySwordBonuses(swordBonuses) {
        if (!this.heroSelection || !this.heroSelection.formationManager) {
            return;
        }
        
        const formation = this.heroSelection.formationManager.getBattleFormation();
        
        swordBonuses.forEach(bonus => {
            const hero = formation[bonus.position];
            if (hero) {
                // Add permanent stat bonuses to the hero
                if (typeof hero.addPermanentStatBonuses === 'function') {
                    hero.addPermanentStatBonuses(bonus.attackGain, bonus.hpGain);
                } else {
                    // Fallback: directly add to hero properties
                    if (hero.attackBonusses === undefined) hero.attackBonusses = 0;
                    if (hero.hpBonusses === undefined) hero.hpBonusses = 0;
                    
                    hero.attackBonusses += bonus.attackGain;
                    hero.hpBonusses += bonus.hpGain;
                }
            }
        });
        
        // Refresh hero stats to reflect the new bonuses
        if (this.heroSelection.refreshHeroStats) {
            this.heroSelection.refreshHeroStats();
        }
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