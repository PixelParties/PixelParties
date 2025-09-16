// Spells/teleport.js - Teleport Global Spell Implementation
// Replaces a Hero with a different one while preserving spells, artifacts, and creatures

export const teleportSpell = {
    name: 'Teleport',
    
    // ===== RECONNECTION HANDLER =====
    // Main method for reconnectionManager.js to call
    async handleReconnection(heroSelection, speedAdjustedDelay = 500) {
        // Check if there's an active teleport state that needs restoration
        if (!heroSelection.teleportState) {
            return false; // No teleport state to restore
        }
        
        // Validate the teleport state
        const teleportState = heroSelection.teleportState;
        if (!this.validateTeleportState(teleportState)) {
            this.clearTeleportState(heroSelection);
            await heroSelection.saveGameState();
            return false;
        }
        
        // Schedule the restoration after UI settles
        setTimeout(async () => {
            try {
                const restored = this.importTeleportState(
                    teleportState,
                    heroSelection,
                    heroSelection.globalSpellManager
                );
                
                if (!restored) {
                    this.clearTeleportState(heroSelection);
                    await heroSelection.saveGameState();
                }
                
            } catch (error) {
                this.clearTeleportState(heroSelection);
                await heroSelection.saveGameState();
            }
        }, speedAdjustedDelay);
        
        return true; // Indicates teleport state was present and handled
    },
    
    // Validate teleport state structure
    validateTeleportState(teleportState) {
        if (!teleportState || !teleportState.isActive) {
            return false;
        }
        
        if (!teleportState.heroOptions || !Array.isArray(teleportState.heroOptions) || 
            teleportState.heroOptions.length === 0) {
            return false;
        }
        
        if (teleportState.cardIndex === undefined || !teleportState.heroPosition) {
            return false;
        }
        
        return true;
    },
    
    // ===== CORE TELEPORT FUNCTIONALITY =====
    
    // Check if the spell can be activated on a specific hero
    canActivateOnHero(heroSelection, heroPosition) {
        const result = { canActivate: false, reason: '', heroName: '' };
        
        // Get Teleport card info from database
        const teleportInfo = heroSelection.getCardInfo('Teleport');
        if (!teleportInfo) {
            result.reason = 'Teleport spell info not found in database!';
            return result;
        }
        
        const requiredSpellSchool = teleportInfo.spellSchool;
        const requiredLevel = teleportInfo.level;
        
        // Check if there's a hero in the target position
        const formation = heroSelection.formationManager.getBattleFormation();
        const targetHero = formation[heroPosition];
        
        if (!targetHero) {
            result.reason = 'Cannot teleport an empty slot!';
            return result;
        }
        
        // Check if ANY hero has the required spell school at required level
        const heroPositions = ['left', 'center', 'right'].filter(pos => 
            formation[pos] !== null && formation[pos] !== undefined
        );
        
        let canCast = false;
        let castingHeroName = '';
        
        for (const position of heroPositions) {
            const hero = formation[position];
            if (!hero) continue;
            
            // Get hero's abilities
            const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
            if (!heroAbilities) continue;
            
            // Count spell school abilities across all zones
            let spellSchoolLevel = 0;
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                    heroAbilities[zone].forEach(ability => {
                        if (ability && ability.name === requiredSpellSchool) {
                            spellSchoolLevel++;
                        }
                    });
                }
            });
            
            if (spellSchoolLevel >= requiredLevel) {
                canCast = true;
                castingHeroName = hero.name;
                break;
            }
        }
        
        if (!canCast) {
            const formattedSpellSchool = heroSelection.formatCardName ? 
                heroSelection.formatCardName(requiredSpellSchool) : requiredSpellSchool;
            result.reason = `No Hero has ${formattedSpellSchool} at level ${requiredLevel} or higher to cast Teleport!`;
            return result;
        }
        
        // Check if there are any heroes available to teleport to
        const availableHeroes = this.getAvailableHeroesForTeleport(heroSelection);
        if (availableHeroes.length === 0) {
            result.reason = 'No other Heroes available for teleportation!';
            return result;
        }
        
        result.canActivate = true;
        result.heroName = castingHeroName;
        result.targetHeroName = targetHero.name;
        return result;
    },
    
    // Get list of heroes not currently in the player's formation
    getAvailableHeroesForTeleport(heroSelection) {
        const formation = heroSelection.formationManager.getBattleFormation();
        const currentHeroNames = Object.values(formation)
            .filter(hero => hero !== null)
            .map(hero => hero.name);
        
        // Get base hero names from any Ascended heroes currently in formation
        const currentBaseHeroNames = Object.values(formation)
            .filter(hero => hero !== null)
            .map(hero => {
                const heroInfo = heroSelection.getCardInfo(hero.name);
                if (heroInfo && heroInfo.subtype === 'Ascended' && heroInfo.baseHero) {
                    return heroInfo.baseHero;
                }
                return null;
            })
            .filter(baseHero => baseHero !== null);

        // Get all available heroes excluding current ones and Ascended heroes
        return heroSelection.allCharacters.filter(hero => {
            // Skip if hero is already in formation
            if (currentHeroNames.includes(hero.name)) {
                return false;
            }
            
            // Skip if hero's base form is already in play as an Ascended version
            if (currentBaseHeroNames.includes(hero.name)) {
                return false;
            }
            
            // Check if hero has "Ascended" subtype
            const heroInfo = heroSelection.getCardInfo(hero.name);
            if (heroInfo && heroInfo.subtype === 'Ascended') {
                return false;
            }
            
            return true;
        });
    },
    
    // Calculate the highest MagicArts level among all current heroes
    calculateMagicArtsLevel(heroSelection) {
        const formation = heroSelection.formationManager.getBattleFormation();
        let highestMagicArts = 0;
        
        ['left', 'center', 'right'].forEach(position => {
            const hero = formation[position];
            if (!hero) return;
            
            const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
            if (!heroAbilities) return;
            
            let magicArtsLevel = 0;
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                    heroAbilities[zone].forEach(ability => {
                        if (ability && ability.name === 'MagicArts') {
                            magicArtsLevel++;
                        }
                    });
                }
            });
            
            highestMagicArts = Math.max(highestMagicArts, magicArtsLevel);
        });
        
        return Math.min(3, Math.max(1, highestMagicArts)); // Minimum of 1, maximum of 3
    },
    
    // Show hero selection overlay
    showHeroSelection(heroSelection, cardIndex, heroPosition, globalSpellManager) {
        return new Promise((resolve) => {
            const availableHeroes = this.getAvailableHeroesForTeleport(heroSelection);
            const selectionCount = this.calculateMagicArtsLevel(heroSelection);
            
            // Shuffle available heroes and take the required count
            const shuffledHeroes = [...availableHeroes].sort(() => Math.random() - 0.5);
            const heroOptions = shuffledHeroes.slice(0, Math.min(selectionCount, availableHeroes.length));
            
            // Get target hero name for persistence
            const formation = heroSelection.formationManager.getBattleFormation();
            const targetHero = formation[heroPosition];
            const targetHeroName = targetHero ? targetHero.name : null;
            
            // If only 1 option, skip the menu and teleport immediately
            if (heroOptions.length === 1) {
                resolve({
                    success: true,
                    selectedHero: heroOptions[0],
                    wasImmediate: true
                });
                return;
            }
            
            // Multiple options available, show selection UI
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'teleport-selection-overlay';
            overlay.innerHTML = this.createSelectionHTML(heroOptions, heroSelection);
            
            // Set up event handlers FIRST
            this.setupSelectionHandlers(overlay, heroOptions, heroSelection, resolve, cardIndex, heroPosition, globalSpellManager, targetHeroName);
            
            document.body.appendChild(overlay);
            
            // NOW save the teleport state after context is fully established
            this.saveTeleportState(heroSelection);
            heroSelection.saveGameState().then(() => {
                // State saved successfully
            }).catch(error => {
                // Error saving state
            });
            
            // Animate in
            requestAnimationFrame(() => {
                overlay.classList.add('visible');
            });
        });
    },
    
    // Create the selection HTML similar to initial hero selection
    createSelectionHTML(heroOptions, heroSelection) {
        const heroCardsHTML = heroOptions.map((hero, index) => {
            const cardData = {
                imagePath: hero.image,
                displayName: hero.name,
                cardType: 'character'
            };
            const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
            
            // Add tags if available
            const tagsHTML = window.tagsManager ? 
                window.tagsManager.createTagsHTML(hero.name, {
                    size: 'small',
                    layout: 'horizontal',
                    animated: true
                }) : '';
            
            return `
                <div class="teleport-hero-card character-card character-selectable" 
                    data-hero-index="${index}"
                    data-character-name="${hero.name}"
                    onmouseenter="window.teleportSpell.showHeroPreview(${index})"
                    onclick="window.teleportSpell.selectHero(${index})">
                    <div class="character-image-container">
                        <img src="${hero.image}" 
                            alt="${hero.name}" 
                            class="character-image"
                            onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                            onmouseleave="window.hideCardTooltip()"
                            onerror="this.src='./Cards/Characters/placeholder.png'">
                        ${tagsHTML}
                    </div>
                    <div class="character-name">${hero.name}</div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="teleport-selection-content">
                <div class="teleport-selection-left">
                <div class="teleport-header">
                        <h2>Choose Teleport Destination</h2>
                        <p>Select which Hero to replace the current one with!</p>
                        <p class="teleport-hint">MagicArts Level determines available options (max 3)</p>
                    </div>
                    
                    <div class="teleport-hero-grid">
                        ${heroCardsHTML}
                    </div>
                </div>
                
                <div class="teleport-preview-column">
                    <div class="teleport-preview-placeholder">
                        <div class="preview-icon">Hover over a Hero to preview their starting deck</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Set up event handlers for the selection overlay
    setupSelectionHandlers(overlay, heroOptions, heroSelection, resolve, cardIndex, heroPosition, globalSpellManager, targetHeroName) {
        // Store context for global access - NOW WITH TARGET HERO NAME
        window.teleportSpell.currentSelection = {
            overlay,
            heroOptions,
            heroSelection,
            resolve,
            cardIndex,
            heroPosition,
            globalSpellManager,
            targetHeroName  // NOW INCLUDED
        };
        
        // Add body class for CSS fallback and tooltip elevation
        document.body.classList.add('teleport-active');
        
        // Monitor for tooltips and ensure they have proper z-index
        this.monitorTooltips();
    },
    
    // Monitor and elevate tooltips
    monitorTooltips() {
        // Create a mutation observer to watch for tooltip creation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this is a tooltip container
                        if (node.id === 'cardTooltipContainer' || 
                            node.classList?.contains('card-tooltip-container') ||
                            node.classList?.contains('large-card-tooltip')) {
                            node.style.zIndex = '10005';
                        }
                        
                        // Check for tooltip children
                        const tooltips = node.querySelectorAll?.('#cardTooltipContainer, .card-tooltip-container, .large-card-tooltip, #deckTooltipContent');
                        tooltips?.forEach(tooltip => {
                            tooltip.style.zIndex = '10005';
                        });
                    }
                });
            });
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Store observer for cleanup
        window.teleportSpell.tooltipObserver = observer;
        
        // Also immediately elevate any existing tooltips
        this.elevateExistingTooltips();
    },
    
    // Elevate existing tooltips
    elevateExistingTooltips() {
        const existingTooltips = document.querySelectorAll('#cardTooltipContainer, .card-tooltip-container, .large-card-tooltip, #deckTooltipContent');
        existingTooltips.forEach(tooltip => {
            tooltip.style.zIndex = '10005';
        });
    },
    
    // Show preview of a hero's starting deck
    showHeroPreview(heroIndex) {
        const context = window.teleportSpell.currentSelection;
        if (!context) return;
        
        const hero = context.heroOptions[heroIndex];
        const heroSelection = context.heroSelection;
        
        // Get hero's starting cards
        const heroCards = heroSelection.characterCards[hero.name] || [];
        
        // Create deck preview HTML
        const deckHTML = heroCards.map(cardName => {
            const formattedName = heroSelection.formatCardName ? 
                heroSelection.formatCardName(cardName) : cardName;
            
            const cardInfo = heroSelection.getCardInfo ? heroSelection.getCardInfo(cardName) : null;
            const cardData = {
                imagePath: `./Cards/All/${cardName}.png`,
                displayName: formattedName,
                cardType: cardInfo ? cardInfo.cardType : 'unknown'
            };
            const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
            
            return `
                <div class="teleport-deck-card">
                    <img src="./Cards/All/${cardName}.png" 
                        alt="${formattedName}"
                        class="deck-card-image"
                        onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                        onmouseleave="window.hideCardTooltip()"
                        onerror="this.src='./Cards/placeholder.png'">
                    <div class="deck-card-name">${formattedName}</div>
                </div>
            `;
        }).join('');
        
        const previewColumn = context.overlay.querySelector('.teleport-preview-column');
        previewColumn.innerHTML = `
            <div class="teleport-deck-preview">
                <h3>${hero.name}'s Starting Deck</h3>
                <div class="teleport-deck-grid">
                    ${deckHTML}
                </div>
            </div>
        `;
    },
    
    // Handle hero selection
    selectHero(heroIndex) {
        const context = window.teleportSpell.currentSelection;
        if (!context) return;
        
        const selectedHero = context.heroOptions[heroIndex];
        
        // Clean up overlay
        this.cleanupSelection();
        
        // CLEAR TELEPORT STATE
        this.clearTeleportState(context.heroSelection);
        
        // Resolve with the selected hero
        context.resolve({
            success: true,
            selectedHero: selectedHero
        });
    },
    
    // Clean up the selection overlay
    cleanupSelection() {
        const context = window.teleportSpell.currentSelection;
        if (!context) return;
        
        // Clean up tooltip monitoring
        if (window.teleportSpell.tooltipObserver) {
            window.teleportSpell.tooltipObserver.disconnect();
            delete window.teleportSpell.tooltipObserver;
        }
        
        // Remove body class
        document.body.classList.remove('teleport-active');
        
        const overlay = context.overlay;
        overlay.classList.remove('visible');
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 300);
        
        // Clear global context
        window.teleportSpell.currentSelection = null;
    },
    
    // Activate the spell on a specific hero position
    async activate(heroSelection, cardIndex, heroPosition, globalSpellManager) {
        // Check if can activate on this hero
        const canActivateResult = this.canActivateOnHero(heroSelection, heroPosition);
        if (!canActivateResult.canActivate) {
            return {
                success: false,
                message: canActivateResult.reason,
                consumed: false
            };
        }
        
        try {
            // Show hero selection overlay
            const selectionResult = await this.showHeroSelection(heroSelection, cardIndex, heroPosition, globalSpellManager);

            if (!selectionResult.success) {
                return {
                    success: false,
                    message: 'No hero selected',
                    consumed: false
                };
            }
            
            const newHero = selectionResult.selectedHero;
            
            // Start the teleportation process
            await this.performTeleportation(heroSelection, heroPosition, newHero);
            
            // Remove the spell from hand
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            if (!removedCard) {
                return {
                    success: false,
                    message: 'Failed to remove card from hand',
                    consumed: false
                };
            }
            
            // Consume action if required
            const cardInfo = heroSelection.getCardInfo('Teleport');
            if (cardInfo && cardInfo.action && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
            }

            // Increment teleports counter
            if (heroSelection.playerCounters) {
                heroSelection.playerCounters.teleports = (heroSelection.playerCounters.teleports || 0) + 1;
            }

            // Update displays
            heroSelection.updateHandDisplay();
            
            if (heroSelection.updateActionDisplay) {
                heroSelection.updateActionDisplay();
            }
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send formation update to opponent
            await heroSelection.sendFormationUpdate();
            
            const message = selectionResult.wasImmediate ? 
            `${canActivateResult.heroName} cast Teleport! ${canActivateResult.targetHeroName} was immediately replaced by ${newHero.name}!` :
            `${canActivateResult.heroName} cast Teleport! ${canActivateResult.targetHeroName} was replaced by ${newHero.name}!`;

        return {
            success: true,
            message: message,
            consumed: true
        };
            
        } catch (error) {
            return {
                success: false,
                message: 'Failed to activate Teleport',
                consumed: false
            };
        }
    },
    
    // Perform the actual teleportation with animation
    async performTeleportation(heroSelection, heroPosition, newHero) {
        // Get the hero slot element for animation
        const heroSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        const heroCard = heroSlot ? heroSlot.querySelector('.character-card') : null;
        
        if (heroCard) {
            // Start the dark energy animation
            this.playTeleportAnimation(heroCard);
            
            // Wait 0.1 seconds before replacing the hero
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Replace the hero while preserving abilities count, spells, artifacts, and creatures
        await this.replaceHeroWithAbilityPreservation(heroSelection, heroPosition, newHero);
        
        // Update the UI immediately
        heroSelection.updateBattleFormationUI();
        
        // Refresh hero stats
        setTimeout(() => {
            heroSelection.refreshHeroStats();
        }, 50);
    },
    
    // Replace hero while preserving total ability count and other assets
    async replaceHeroWithAbilityPreservation(heroSelection, heroPosition, newHero) {
        // 1. Count current total abilities
        const currentAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(heroPosition);
        let totalAbilityCount = 0;
        
        if (currentAbilities) {
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (currentAbilities[zone] && Array.isArray(currentAbilities[zone])) {
                    totalAbilityCount += currentAbilities[zone].length;
                }
            });
        }
        
        // 2. Get new hero info from database
        const newHeroInfo = heroSelection.getCardInfo(newHero.name);
        if (!newHeroInfo || newHeroInfo.cardType !== 'hero') {
            throw new Error(`Invalid hero data for ${newHero.name}`);
        }
        
        // 3. Get the old hero before replacement for deck modifications
        const formation = heroSelection.formationManager.getBattleFormation();
        const oldHero = formation[heroPosition];
        const oldHeroName = oldHero.name;
        const newHeroName = newHero.name;
        
        // 4. DECK MODIFICATIONS - Remove old hero's starting cards
        const oldHeroCards = heroSelection.characterCards[oldHeroName];
        if (oldHeroCards && Array.isArray(oldHeroCards)) {
            let removedCards = [];
            oldHeroCards.forEach(cardName => {
                // Check if the card exists in the deck before trying to remove it
                if (heroSelection.deckManager.hasCard(cardName)) {
                    const removed = heroSelection.deckManager.removeCard(cardName);
                    if (removed) {
                        removedCards.push(cardName);
                    }
                }
            });
        }
        
        // 5. Add new hero's starting cards to deck
        const newHeroCards = heroSelection.characterCards[newHeroName];
        if (newHeroCards && Array.isArray(newHeroCards)) {
            let addedCards = [];
            newHeroCards.forEach(cardName => {
                const added = heroSelection.deckManager.addCard(cardName);
                if (added) {
                    addedCards.push(cardName);
                }
            });
        }
        
        // 6. Update formation with new hero (preserving all non-ability data)
        // Create new hero object with preserved data
        const updatedHero = {
            ...newHero,
            // Preserve any additional data that might exist
            burningFingerStack: oldHero.burningFingerStack || 0,
            attackBonusses: oldHero.attackBonusses || 0,
            hpBonusses: oldHero.hpBonusses || 0,
            deathCounters: oldHero.deathCounters || 0
        };
        
        // Update the formation
        heroSelection.formationManager.battleFormation[heroPosition] = updatedHero;
        
        // 7. Clear old abilities and set new starting abilities
        heroSelection.heroAbilitiesManager.clearHeroAbilities(heroPosition);
        heroSelection.heroAbilitiesManager.initializeHeroStartingAbilities(heroPosition, newHeroInfo);
        
        // 8. Distribute remaining abilities
        const startingAbilitiesCount = 2; // Heroes always start with 2 abilities
        const remainingAbilitiesToDistribute = totalAbilityCount - startingAbilitiesCount;
        
        if (remainingAbilitiesToDistribute > 0) {
            await this.distributeRemainingAbilities(heroSelection, heroPosition, newHeroInfo, remainingAbilitiesToDistribute);
        }
        
        // 9. Update deck display to reflect changes
        if (typeof heroSelection.updateDeckDisplay === 'function') {
            heroSelection.updateDeckDisplay();
        }
    },
    
    // Distribute remaining abilities by randomly incrementing starting abilities
    async distributeRemainingAbilities(heroSelection, heroPosition, heroInfo, remainingCount) {
        const startingAbilities = [heroInfo.ability1, heroInfo.ability2];
        
        for (let i = 0; i < remainingCount; i++) {
            // Pick a random starting ability to increment
            const randomAbility = startingAbilities[Math.floor(Math.random() * startingAbilities.length)];
            
            // Get the ability info
            const abilityInfo = heroSelection.getCardInfo(randomAbility);
            if (abilityInfo) {
                // Find which zone this ability is in
                const abilityZone = heroSelection.heroAbilitiesManager.findAbilityZone(heroPosition, randomAbility);
                if (abilityZone) {
                    // Add another copy to the same zone
                    heroSelection.heroAbilitiesManager.addAbilityToZone(heroPosition, abilityZone, abilityInfo, true);
                }
            }
        }
    },
    
    // Play the dark energy teleportation animation
    playTeleportAnimation(heroCardElement) {
        // Create animation overlay
        const animationOverlay = document.createElement('div');
        animationOverlay.className = 'teleport-animation-overlay';
        
        // Create multiple energy particles for effect
        const particleCount = 12;
        let particlesHTML = '';
        
        for (let i = 0; i < particleCount; i++) {
            const delay = (i * 0.1).toFixed(1);
            const rotation = (i * 30).toString();
            particlesHTML += `
                <div class="teleport-particle" style="
                    animation-delay: ${delay}s;
                    transform: rotate(${rotation}deg);
                "></div>
            `;
        }
        
        animationOverlay.innerHTML = `
            <div class="teleport-energy-core"></div>
            ${particlesHTML}
            <div class="teleport-vortex"></div>
        `;
        
        // Position overlay to cover the hero card
        heroCardElement.style.position = 'relative';
        heroCardElement.appendChild(animationOverlay);
        
        // Remove animation after completion
        setTimeout(() => {
            if (animationOverlay.parentNode) {
                animationOverlay.remove();
            }
        }, 2000);
    },
    
    // Handle drop activation (called by GlobalSpellManager)
    async handleDrop(heroPosition, cardIndex, cardName, heroSelection, globalSpellManager) {
        const result = await this.activate(heroSelection, cardIndex, heroPosition, globalSpellManager);
        
        // Show visual feedback
        if (result.success) {
            showTeleportSuccess(result.message);
        } else {
            showTeleportError(result.message);
        }
        
        return result.success;
    },

    // ===== PERSISTENCE METHODS =====

    // Export teleport selection state for persistence
    exportTeleportState() {
        const context = window.teleportSpell.currentSelection;
        if (!context) {
            return null;
        }
        
        return {
            isActive: true,
            heroOptions: context.heroOptions,
            cardIndex: context.cardIndex,
            heroPosition: context.heroPosition,
            selectionCount: this.calculateMagicArtsLevel(context.heroSelection),
            targetHeroName: context.targetHeroName || null,
            timestamp: Date.now()
        };
    },

    // Import teleport selection state for persistence
    importTeleportState(teleportState, heroSelection, globalSpellManager) {
        if (!this.validateTeleportState(teleportState)) {
            return false;
        }
        
        // Restore the teleport selection overlay
        this.restoreTeleportSelection(teleportState, heroSelection, globalSpellManager);
        return true;
    },

    // Restore teleport selection overlay from saved state
    restoreTeleportSelection(teleportState, heroSelection, globalSpellManager) {
        // Create overlay directly with saved data
        const overlay = document.createElement('div');
        overlay.className = 'teleport-selection-overlay visible'; // Add 'visible' class immediately
        overlay.innerHTML = this.createSelectionHTML(teleportState.heroOptions, heroSelection);
        
        // Set up event handlers with saved context
        const mockResolve = (result) => {
            if (result.success) {
                this.completeTeleportFromReconnection(
                    heroSelection, 
                    teleportState.cardIndex, 
                    teleportState.heroPosition, 
                    result.selectedHero,
                    globalSpellManager
                );
            } else {
                // Handle cancellation
                this.clearTeleportState(heroSelection);
                heroSelection.saveGameState();
            }
        };
        
        this.setupSelectionHandlers(
            overlay, 
            teleportState.heroOptions, 
            heroSelection, 
            mockResolve, 
            teleportState.cardIndex, 
            teleportState.heroPosition, 
            globalSpellManager,
            teleportState.targetHeroName
        );
        
        document.body.appendChild(overlay);
    },

    // Complete teleport from reconnection
    async completeTeleportFromReconnection(heroSelection, cardIndex, heroPosition, selectedHero, globalSpellManager) {
        try {
            // Perform the teleportation
            await this.performTeleportation(heroSelection, heroPosition, selectedHero);
            
            // Remove the spell from hand
            const removedCard = heroSelection.handManager.removeCardFromHandByIndex(cardIndex);
            
            // Consume action if required
            const cardInfo = heroSelection.getCardInfo('Teleport');
            if (cardInfo && cardInfo.action && heroSelection.actionManager) {
                heroSelection.actionManager.consumeAction();
            }
            
            // Update displays
            heroSelection.updateHandDisplay();
            if (heroSelection.updateActionDisplay) {
                heroSelection.updateActionDisplay();
            }
            
            // Clear teleport state
            this.clearTeleportState(heroSelection);
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send formation update
            await heroSelection.sendFormationUpdate();
            
            // Show success message
            const message = `Teleport completed! Hero replaced by ${selectedHero.name}!`;
            showTeleportSuccess(message);
            
        } catch (error) {
            this.clearTeleportState(heroSelection);
            showTeleportError('Failed to complete teleport after reconnection');
        }
    },

    // Clear teleport state
    clearTeleportState(heroSelection) {
        // Clear the global selection context
        window.teleportSpell.currentSelection = null;
        
        // Clear teleport state in heroSelection for saving
        if (heroSelection) {
            heroSelection.teleportState = null;
        }
    },

    // Save teleport state to heroSelection for persistence
    saveTeleportState(heroSelection) {
        if (heroSelection) {
            const exportedState = this.exportTeleportState();
            
            if (exportedState) {
                heroSelection.teleportState = exportedState;
            }
        }
    },
};

// ===== VISUAL FEEDBACK FUNCTIONS =====

function showTeleportSuccess(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'teleport-success-popup';
    feedbackDiv.innerHTML = `
        <div class="teleport-success-content">
            <span class="teleport-success-icon">&#x1f300;</span>
            <span class="teleport-success-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #9c27b0 0%, #3f51b5 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10;
        pointer-events: none;
        animation: teleportSuccessBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(156, 39, 176, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'teleportSuccessFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3000);
}

function showTeleportError(message) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'teleport-error-popup';
    feedbackDiv.innerHTML = `
        <div class="teleport-error-content">
            <span class="teleport-error-icon">&#x26a0;&#xfe0f;</span>
            <span class="teleport-error-text">${message}</span>
        </div>
    `;
    
    feedbackDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 30%;
        transform: translateX(-50%);
        background: rgba(244, 67, 54, 0.95);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10;
        pointer-events: none;
        animation: teleportErrorBounce 0.6s ease-out;
        box-shadow: 0 4px 20px rgba(244, 67, 54, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    setTimeout(() => {
        feedbackDiv.style.animation = 'teleportErrorFade 0.4s ease-out forwards';
        setTimeout(() => feedbackDiv.remove(), 400);
    }, 3000);
}

// ===== CSS STYLES =====

// Add CSS animations and styles
if (typeof document !== 'undefined' && !document.getElementById('teleportSpellStyles')) {
    const style = document.createElement('style');
    style.id = 'teleportSpellStyles';
    style.textContent = `
        /* Teleport Selection Overlay */
        .teleport-selection-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            z-index: 9000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .teleport-selection-overlay.visible {
            opacity: 1;
        }
        
        /* Automatically elevate any tooltips when teleport overlay is present */
        .teleport-selection-overlay ~ #cardTooltipContainer,
        .teleport-selection-overlay ~ .card-tooltip-container,
        .teleport-selection-overlay ~ .large-card-tooltip {
            z-index: 10005 !important;
        }

        /* Also handle tooltips that might be direct children of body */
        body:has(.teleport-selection-overlay) #cardTooltipContainer,
        body:has(.teleport-selection-overlay) .card-tooltip-container,
        body:has(.teleport-selection-overlay) .large-card-tooltip {
            z-index: 10005 !important;
        }

        /* Fallback for browsers that don't support :has() */
        .teleport-active #cardTooltipContainer,
        .teleport-active .card-tooltip-container,
        .teleport-active .large-card-tooltip {
            z-index: 10005 !important;
        }

        /* Ensure deck tooltips also work */
        .teleport-selection-overlay ~ #deckTooltipContent,
        body:has(.teleport-selection-overlay) #deckTooltipContent,
        .teleport-active #deckTooltipContent {
            z-index: 10005 !important;
        }
        
        .teleport-selection-content {
            display: flex;
            width: 90%;
            max-width: 1200px;
            height: 80%;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(248, 249, 250, 0.05));
            backdrop-filter: blur(15px);
            border-radius: 20px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            overflow: hidden;
        }
        
        .teleport-selection-left {
            flex: 1;
            padding: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .teleport-preview-column {
            width: 500px;
            padding: 40px;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1));
            backdrop-filter: blur(15px);
            border-left: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        /* Header */
        .teleport-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .teleport-header h2 {
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 15px;
            background: linear-gradient(45deg, #9c27b0, #3f51b5);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: var(--shadow-glow);
            letter-spacing: 1px;
        }
        
        .teleport-header p {
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            font-size: 1.2rem;
            color: rgba(255, 255, 255, 0.9);
            margin: 8px 0;
            letter-spacing: 0.5px;
        }
        
        .teleport-hint {
            color: #9c27b0 !important;
            font-weight: 600;
        }
        
        /* Hero Grid */
        .teleport-hero-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
            width: 100%;
            max-width: 500px;
        }
        
        .teleport-hero-card {
            transition: all 0.3s ease;
            cursor: pointer;
            border: 2px solid rgba(156, 39, 176, 0.3);
            min-height: 380px;
            max-height: 380px;
            padding: 8px;
        }
        
        .teleport-hero-card .character-image-container {
            height: 360px;
            margin-bottom: 8px;
        }
        
        .teleport-hero-card .character-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .teleport-hero-card .character-name {
            font-size: 0.9rem;
            margin: 0;
            padding: 4px 0;
        }
        
        .teleport-hero-card .card-tags-container {
            position: absolute;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1;
            margin: 0;
            padding: 0 4px;
            max-width: calc(100% - 16px);
            pointer-events: none;
        }
        
        .teleport-hero-card .card-tag {
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 10px;
            padding: 2px 4px;
            min-width: auto;
            max-width: none;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 
                0 2px 8px rgba(0, 0, 0, 0.6),
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .teleport-hero-card:hover {
            transform: translateY(-4px) scale(1.02);
            border-color: rgba(156, 39, 176, 0.6);
            box-shadow: 0 8px 20px rgba(156, 39, 176, 0.4);
        }
        
        .teleport-hero-card:hover .card-tag {
            background: rgba(0, 0, 0, 0.9);
            transform: translateY(-1px) scale(1.02);
            box-shadow: 
                0 4px 12px rgba(0, 0, 0, 0.7),
                inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }
        
        .teleport-hero-card.selected {
            border-color: #9c27b0;
            background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(63, 81, 181, 0.15));
            box-shadow: 0 6px 18px rgba(156, 39, 176, 0.5);
        }
        
        /* Preview Placeholder */
        .teleport-preview-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 300px;
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
        }
        
        .teleport-preview-placeholder .preview-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        
        /* Deck Preview */
        .teleport-deck-preview h3 {
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            font-size: 1.5rem;
            color: #9c27b0;
            margin-bottom: 20px;
            text-align: center;
            letter-spacing: 0.5px;
        }
        
        .teleport-deck-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .teleport-deck-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 8px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .teleport-deck-card:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .deck-card-image {
            width: 100%;
            height: 140px;
            object-fit: cover;
            border-radius: 4px;
            margin-bottom: 8px;
        }
        
        .deck-card-name {
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            font-size: 0.8rem;
            color: white;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        
        .deck-summary {
            text-align: center;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
            padding: 10px;
            background: rgba(156, 39, 176, 0.1);
            border-radius: 6px;
            border: 1px solid rgba(156, 39, 176, 0.3);
            letter-spacing: 0.5px;
        }
        
        /* Teleport Animation Overlay */
        .teleport-animation-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 5;
            border-radius: 8px;
            overflow: hidden;
        }
        
        /* Central energy core */
        .teleport-energy-core {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, #e1bee7 0%, #9c27b0 50%, #4a148c 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: teleportCoreGlow 1.5s ease-in-out;
            box-shadow: 
                0 0 20px #9c27b0,
                0 0 40px #673ab7,
                inset 0 0 10px #4a148c;
        }
        
        /* Energy particles */
        .teleport-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 4px;
            height: 4px;
            background: #e1bee7;
            border-radius: 50%;
            animation: teleportParticle 1.2s ease-out;
            box-shadow: 0 0 6px #9c27b0;
        }
        
        /* Vortex effect */
        .teleport-vortex {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100%;
            height: 100%;
            background: conic-gradient(
                from 0deg,
                transparent 0deg,
                rgba(156, 39, 176, 0.3) 90deg,
                rgba(63, 81, 181, 0.3) 180deg,
                transparent 270deg,
                transparent 360deg
            );
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: teleportVortex 1.5s ease-in-out;
        }
        
        /* Animations */
        @keyframes teleportCoreGlow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            10% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 1;
                box-shadow: 
                    0 0 30px #9c27b0,
                    0 0 60px #673ab7,
                    inset 0 0 15px #4a148c;
            }
            100% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
        }
        
        @keyframes teleportParticle {
            0% {
                transform: translate(-50%, -50%) rotate(0deg) translateX(0px);
                opacity: 0;
            }
            20% {
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) rotate(0deg) translateX(60px);
                opacity: 0;
            }
        }
        
        @keyframes teleportVortex {
            0% {
                transform: translate(-50%, -50%) rotate(0deg) scale(0);
                opacity: 0;
            }
            20% {
                opacity: 0.6;
            }
            100% {
                transform: translate(-50%, -50%) rotate(720deg) scale(2);
                opacity: 0;
            }
        }
        
        /* Success popup animations */
        @keyframes teleportSuccessBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes teleportSuccessFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Error popup animations */
        @keyframes teleportErrorBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(20px) scale(0.8);
            }
            60% {
                opacity: 1;
                transform: translateX(-50%) translateY(-5px) scale(1.05);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        
        @keyframes teleportErrorFade {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
        }
        
        /* Popup content styling */
        .teleport-success-content,
        .teleport-error-content {
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: center;
        }
        
        .teleport-success-icon,
        .teleport-error-icon {
            font-size: 20px;
        }
        
        .teleport-success-text,
        .teleport-error-text {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .teleport-selection-content {
                flex-direction: column;
                width: 95%;
                height: 90%;
            }
            
            .teleport-preview-column {
                width: 100%;
                max-height: 40%;
            }
            
            .teleport-hero-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }
            
            .teleport-deck-grid {
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 10px;
            }
            
            .deck-card-image {
                height: 100px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.teleportSpell = teleportSpell;
}