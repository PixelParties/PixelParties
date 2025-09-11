// areaHandler.js - Area Card Management Module with Smart Counter Display Updates and MagicArts Integration
export class AreaHandler {
    constructor() {
        this.areaCard = null;
        this.opponentAreaCard = null;
        this.heroSelection = null;
        
        // Add state tracking for smart updates
        this.lastAreaCardState = null;
        this.lastCounterValues = {};
    }

    init(heroSelection) {
        this.heroSelection = heroSelection;
        this.setupGlobalFunctions();
    }

    setupGlobalFunctions() {
        if (typeof window !== 'undefined') {
            window.onAreaSlotDragOver = (event) => this.onAreaSlotDragOver(event);
            window.onAreaSlotDragEnter = (event) => this.onAreaSlotDragEnter(event);
            window.onAreaSlotDragLeave = (event) => this.onAreaSlotDragLeave(event);
            window.onAreaSlotDrop = (event) => this.onAreaSlotDrop(event);
            window.onAreaCardDragStart = (event, cardDataJson) => this.onAreaCardDragStart(event, cardDataJson);
            window.onAreaCardDragEnd = (event) => this.onAreaCardDragEnd(event);
        }
    }

    // Generate a state hash for comparison
    generateAreaStateHash(areaCard) {
        if (!areaCard) return null;
        
        return {
            name: areaCard.name,
            stormCounters: areaCard.stormCounters || 0,
            doomCounters: areaCard.doomCounters || 0,
            // Add other counter types as needed
        };
    }

    // Check if area card or counters have changed
    hasAreaChanged() {
        const currentState = this.generateAreaStateHash(this.areaCard);
        
        // Compare with last known state
        if (!this.lastAreaCardState && !currentState) {
            return false; // Both null, no change
        }
        
        if (!this.lastAreaCardState || !currentState) {
            return true; // One is null, other isn't - change detected
        }
        
        // Deep comparison - only trigger if meaningful changes
        const hasRealChange = (
            this.lastAreaCardState.name !== currentState.name ||
            Math.abs((this.lastAreaCardState.doomCounters || 0) - (currentState.doomCounters || 0)) > 0
        );        
        return hasRealChange;
    }

    // Update the cached state
    updateCachedState() {
        this.lastAreaCardState = this.generateAreaStateHash(this.areaCard);
    }

    // Smart update that only regenerates when necessary
    smartUpdateAreaDisplay() {
        const hasChanged = this.hasAreaChanged();
        
        if (!hasChanged) {
            return false;
        }
                
        // Perform full slot update
        const success = this.updateAreaSlotDisplay();
        
        if (success) {
            // Update cached state after successful update
            this.updateCachedState();
        }
        
        return success;
    }

    // Lightweight counter-only update
    updateCountersOnly() {        
        const playerAreaSlot = document.getElementById('player-area-slot');
        if (!playerAreaSlot) return false;
        
        const currentArea = this.getAreaCard();
        if (!currentArea) {
            // No area card, remove any existing counters
            this.removeExistingCounters(playerAreaSlot);
            return false;
        }
        
        // Remove existing counters
        this.removeExistingCounters(playerAreaSlot);
        
        // Create new counter if needed
        const counterElement = this.createAreaCounterDisplay(currentArea);
        
        if (counterElement) {
            const areaCardContainer = playerAreaSlot.querySelector('.area-card');
            if (areaCardContainer) {
                areaCardContainer.style.position = 'relative';
                areaCardContainer.style.overflow = 'visible';
                areaCardContainer.appendChild(counterElement);
                
                requestAnimationFrame(() => {
                    counterElement.classList.add('counter-appeared');
                });
            }
        }
        
        return true;
    }

    isAreaCard(cardName) {
        if (!this.heroSelection) return false;
        const cardInfo = this.heroSelection.getCardInfo(cardName);
        return cardInfo && cardInfo.subtype === 'Area';
    }

    getAreaCard() { return this.areaCard; }
    setAreaCard(card) { this.areaCard = card; }
    clearAreaCard() { this.areaCard = null; }

    createAreaSlotHTML() {
        const areaCard = this.getAreaCard();
        const slotClass = areaCard ? 'area-slot filled' : 'area-slot empty';
        const areaCardHTML = areaCard ? this.createAreaCardHTML(areaCard) : 
            '<div class="area-placeholder"><div class="area-globe">🌍</div><div class="area-label">Area</div></div>';
        
        return `
            <div class="${slotClass}" id="player-area-slot" data-slot-type="area"
                ondragover="window.onAreaSlotDragOver(event)"
                ondrop="window.onAreaSlotDrop(event)"
                ondragleave="window.onAreaSlotDragLeave(event)"
                ondragenter="window.onAreaSlotDragEnter(event)">
                ${areaCardHTML}
            </div>
        `;
    }

    createAreaCardHTML(areaCard) {
        const cardData = {
            imagePath: areaCard.image,
            displayName: this.formatCardName(areaCard.name),
            cardType: 'area'
        };
        const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
        
        return `
            <div class="area-card" data-area-card="${areaCard.name}" draggable="true"
                ondragstart="window.onAreaCardDragStart(event, '${JSON.stringify(areaCard).replace(/"/g, '&quot;')}')"
                ondragend="window.onAreaCardDragEnd(event)"
                onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                onmouseleave="window.hideCardTooltip()">
                <div class="area-card-image-container">
                    <img src="${areaCard.image}" alt="${areaCard.name}" class="area-card-image"
                        onerror="this.src='./Cards/placeholder.png'">
                </div>
            </div>
        `;
    }

    formatCardName(cardName) {
        return cardName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

    // Drag and drop handlers
    onAreaSlotDragOver(event) {
        if (this.heroSelection?.handManager?.isHandDragging()) {
            const dragState = this.heroSelection.handManager.getHandDragState();
            if (this.isAreaCard(dragState.draggedCardName)) {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.classList.add('area-drop-ready');
                return;
            }
        }
        event.currentTarget.classList.add('area-drop-invalid');
    }

    onAreaSlotDragEnter(event) {
        // Similar logic to drag over
    }

    onAreaSlotDragLeave(event) {
        const slot = event.currentTarget;
        const rect = slot.getBoundingClientRect();
        const x = event.clientX, y = event.clientY, margin = 10;
        
        if (x < rect.left - margin || x > rect.right + margin || y < rect.top - margin || y > rect.bottom + margin) {
            slot.classList.remove('area-drop-ready', 'area-drop-invalid');
        }
    }

    onAreaCardDragStart(event, cardDataJson) {
        // Handle existing area card dragging
        try {
            const cardData = JSON.parse(cardDataJson.replace(/&quot;/g, '"'));
            event.dataTransfer.setData('application/x-area-card', cardDataJson);
            event.target.closest('.area-card').classList.add('area-card-dragging');
        } catch (error) {
            event.preventDefault();
        }
    }

    onAreaCardDragEnd(event) {
        document.querySelectorAll('.area-card-dragging').forEach(el => el.classList.remove('area-card-dragging'));
        document.querySelectorAll('.area-slot').forEach(slot => {
            slot.classList.remove('area-drop-ready', 'area-drop-invalid');
        });
    }

    async handleAreaCardDrop(cardName, cardIndex) {
        if (!this.heroSelection) {
            this.showAreaDropResult('Invalid drop!', false);
            this.heroSelection.handManager.endHandCardDrag();
            return false;
        }

        const cardInfo = this.heroSelection.getCardInfo(cardName);
        if (!cardInfo) {
            this.showAreaDropResult('Invalid area card!', false);
            this.heroSelection.handManager.endHandCardDrag();
            return false;
        }

        
        const canUseCheck = this.canAnyHeroUseAreaSpell(cardName);
        if (!canUseCheck.canUse) {
            const formattedSpellSchool = this.formatCardName(canUseCheck.spellSchool);
            const formattedSpellName = this.formatCardName(cardName);
            const errorMessage = `No hero can use ${formattedSpellName}! Requires ${formattedSpellSchool} level ${canUseCheck.requiredLevel}+.`;
            
            this.showAreaDropResult(errorMessage, false);
            this.heroSelection.handManager.endHandCardDrag();
            return false;
        }

        // Check if replacing an existing area card
        const isReplacement = this.areaCard !== null;
        const previousAreaName = isReplacement ? this.areaCard.name : null;

        // Create new area card object
        const newAreaCard = {
            name: cardName,
            image: cardInfo.image || `./Cards/Areas/${cardName}.png`,
            cost: cardInfo.cost || 0,
            effects: cardInfo.effects || []
        };

        // Initialize GatheringStorm with counters
        if (cardName === 'GatheringStorm') {
            if (isReplacement && previousAreaName === 'GatheringStorm' && this.areaCard.stormCounters) {
                newAreaCard.stormCounters = this.areaCard.stormCounters;
            } else {
                import('../Spells/gatheringStorm.js').then(({ initializeGatheringStormArea }) => {
                    initializeGatheringStormArea(newAreaCard);
                }).catch(error => {
                    newAreaCard.stormCounters = 1;
                });
                newAreaCard.stormCounters = 1;
            }
        }
        // Initialize DoomClock with counters
        if (cardName === 'DoomClock') {
            if (isReplacement && previousAreaName === 'DoomClock' && this.areaCard.doomCounters !== undefined) {
                newAreaCard.doomCounters = this.areaCard.doomCounters;
            } else {
                import('../Spells/doomClock.js').then(({ initializeDoomClockArea }) => {
                    initializeDoomClockArea(newAreaCard);
                }).catch(error => {
                    newAreaCard.doomCounters = 0;
                });
                newAreaCard.doomCounters = 0;
            }
        }

        // Reset CrystalWell when new area is placed
        if (cardName === 'CrystalWell') {
            const { crystalWellManager } = await import('../Spells/crystalWell.js');
            crystalWellManager.resetForNewCrystalWell();
        }

        if (cardName === 'SpatialCrevice') {
            // SpatialCrevice doesn't need special initialization like counters
            import('../Spells/spatialCrevice.js').then(({ initializeSpatialCreviceArea }) => {
                initializeSpatialCreviceArea(newAreaCard);
            }).catch(error => {
                console.error('Error initializing SpatialCrevice:', error);
            });
        }

        // Handle action costs
        if (cardInfo.action && this.heroSelection.actionManager) {
            const actionCheck = this.heroSelection.actionManager.canPlayActionCard(cardInfo);
            if (!actionCheck.canPlay) {
                this.heroSelection.handManager.endHandCardDrag();
                return false;
            }
            this.heroSelection.actionManager.consumeAction();
        }

        // Set the new area card
        this.setAreaCard(newAreaCard);

        // Remove card from hand
        this.heroSelection.handManager.removeCardFromHandByIndex(cardIndex);

        // Update area slot display FIRST - this is definitely a change, so use full update
        this.updateAreaSlotDisplay();
        this.updateCachedState(); // Update cache after successful drop

        // Now call other updates
        this.heroSelection.updateHandDisplay();
        this.heroSelection.updateActionDisplay();
        this.heroSelection.updateBattleFormationUI();

        // Generate success message
        const formattedName = this.formatCardName(cardName);
        let successMessage;
        
        if (isReplacement) {
            const previousFormatted = this.formatCardName(previousAreaName);
            if (previousAreaName === cardName) {
                if (cardName === 'GatheringStorm') {
                    successMessage = `${formattedName} replaced with a fresh copy! (${newAreaCard.stormCounters}x power)`;
                } else {
                    successMessage = `${formattedName} replaced with a fresh copy!`;
                }
            } else {
                if (cardName === 'GatheringStorm') {
                    successMessage = `${previousFormatted} replaced with ${formattedName}! (${newAreaCard.stormCounters}x power)`;
                } else {
                    successMessage = `${previousFormatted} replaced with ${formattedName}!`;
                }
            }
        } else {
            if (cardName === 'GatheringStorm') {
                successMessage = `${formattedName} placed! (${newAreaCard.stormCounters}x power)`;
            } else {
                successMessage = `${formattedName} placed!`;
            }
        }
        
        this.showAreaDropResult(successMessage, true);

        await this.heroSelection.saveGameState();
        await this.heroSelection.sendFormationUpdate();

        // MagicArts redraw integration: Check for MagicArts redraw after successful area placement
        try {
            // Import the MagicArts redraw system
            if (typeof window !== 'undefined' && window.magicArtsRedraw) {
                // Use the existing global MagicArts redraw system
                const redrawSuccess = await window.magicArtsRedraw.handleMagicArtsRedraw(cardName, this.heroSelection);
                if (redrawSuccess) {
                    console.log(`MagicArts redraw triggered for area spell: ${cardName}`);
                }
            } else {
                // Fallback: try to import the module
                const { magicArtsRedraw } = await import('../Abilities/magicArts.js');
                const redrawSuccess = await magicArtsRedraw.handleMagicArtsRedraw(cardName, this.heroSelection);
                if (redrawSuccess) {
                    console.log(`MagicArts redraw triggered for area spell: ${cardName}`);
                }
            }
        } catch (error) {
            console.error('Error processing MagicArts redraw for area spell:', error);
            // Don't fail the area placement if MagicArts processing fails
        }

        this.heroSelection.handManager.endHandCardDrag();

        return true;
    }

    // Check if any hero can use this area spell
    canAnyHeroUseAreaSpell(areaCardName) {
        if (!this.heroSelection) return false;
        
        const cardInfo = this.heroSelection.getCardInfo(areaCardName);
        if (!cardInfo || cardInfo.cardType !== 'Spell' || cardInfo.subtype !== 'Area') {
            return false;
        }
        
        const formation = this.heroSelection.formationManager.getBattleFormation();
        const spellSchool = cardInfo.spellSchool;
        const requiredLevel = cardInfo.level || 0;
        
        // Check each hero position
        for (const position of ['left', 'center', 'right']) {
            const hero = formation[position];
            if (!hero) continue;
            
            // Count spell school abilities for this hero
            const heroAbilities = this.heroSelection.heroAbilitiesManager.getHeroAbilities(position);
            let totalSpellSchoolLevel = 0;
            
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (heroAbilities && heroAbilities[zone]) {
                    heroAbilities[zone].forEach(ability => {
                        if (ability && ability.name === spellSchool) {
                            totalSpellSchoolLevel++;
                        }
                    });
                }
            });
            
            // If this hero meets the requirements, area spell can be used
            if (totalSpellSchoolLevel >= requiredLevel) {
                return {
                    canUse: true,
                    heroName: hero.name,
                    heroPosition: position,
                    hasLevel: totalSpellSchoolLevel,
                    needsLevel: requiredLevel
                };
            }
        }
        
        // No hero can use this area spell
        return {
            canUse: false,
            spellSchool: spellSchool,
            requiredLevel: requiredLevel
        };
    }

    async onAreaSlotDrop(event) {
        event.preventDefault();
        const slot = event.currentTarget;
        slot.classList.remove('area-drop-ready', 'area-drop-invalid');
        
        if (this.heroSelection?.handManager?.isHandDragging()) {
            const dragState = this.heroSelection.handManager.getHandDragState();
            if (this.isAreaCard(dragState.draggedCardName)) {
                return await this.handleAreaCardDrop(dragState.draggedCardName, dragState.draggedCardIndex);
            }
        }
        return false;
    }

    // Updated area slot display method with smart update integration
    updateAreaSlotDisplay() {
        // Find the correct parent container
        const teamSlotsContainer = document.querySelector('.team-slots-container');
        const heroSlotsContainer = document.querySelector('.hero-slots-container');
        
        if (!teamSlotsContainer) {
            console.error('Team slots container not found');
            return false;
        }

        // Find existing area slot by ID and verify its location
        let existingAreaSlot = document.getElementById('player-area-slot');
        
        if (existingAreaSlot) {
            // Check if it's in the wrong container and fix it
            if (heroSlotsContainer && heroSlotsContainer.contains(existingAreaSlot)) {
                console.warn('Area slot found in hero container - moving to correct location');
                
                // Remove from wrong location and recreate in correct location
                existingAreaSlot.remove();
                existingAreaSlot = null;
            } else if (!teamSlotsContainer.contains(existingAreaSlot)) {
                console.warn('Area slot not in team container - moving to correct location');
                
                // Move to correct location
                teamSlotsContainer.insertBefore(existingAreaSlot, teamSlotsContainer.firstChild);
            }
        }

        // Create or update area slot
        if (!existingAreaSlot) {
            // Recreate area slot in correct container
            const areaSlotHTML = this.createAreaSlotHTML();
            teamSlotsContainer.insertAdjacentHTML('afterbegin', areaSlotHTML);
            existingAreaSlot = document.getElementById('player-area-slot');
            
            // Force counter update for new slot
            setTimeout(() => this.updateCountersOnly(), 50);
        } else {
            // Update existing area slot content
            const areaCard = this.getAreaCard();
            const newSlotClass = areaCard ? 'area-slot filled' : 'area-slot empty';
            const newAreaCardHTML = areaCard ? this.createAreaCardHTML(areaCard) : 
                '<div class="area-placeholder"><div class="area-globe">🌍</div><div class="area-label">Area</div></div>';

            
            // Log before innerHTML replacement
            const hadCounters = existingAreaSlot.querySelectorAll('.area-counter-bubble').length > 0;
            if (hadCounters) {
                console.error('⚠️ About to replace innerHTML of slot that has counters!');
            }
            
            existingAreaSlot.className = newSlotClass;
            existingAreaSlot.setAttribute('data-slot-type', 'area');
            existingAreaSlot.innerHTML = newAreaCardHTML;
            
            // Restore event handlers
            existingAreaSlot.ondragover = (event) => window.onAreaSlotDragOver(event);
            existingAreaSlot.ondrop = (event) => window.onAreaSlotDrop(event);
            existingAreaSlot.ondragleave = (event) => window.onAreaSlotDragLeave(event);
            existingAreaSlot.ondragenter = (event) => window.onAreaSlotDragEnter(event);
        
            if (hadCounters) {
                console.error('💥 innerHTML replaced - counters lost!');
            }
            
            // Update counters only (don't call updateAreaDisplay to avoid removing counters)
            setTimeout(() => this.updateCountersOnly(), 50);
        }

        return true;
    }

    // Completely redesigned counter display system
    createAreaCounterDisplay(areaCard) {
        if (!areaCard) return null;

        let counterData = null;

        // Determine counter data based on area card type
        if (areaCard.name === 'GatheringStorm' && areaCard.stormCounters > 1) {
            counterData = {
                type: 'storm',
                value: `x${areaCard.stormCounters}`,
                className: 'area-counter-storm',
                color: '#4a90e2',
                shadowColor: '74, 144, 226'
            };
        } else if (areaCard.name === 'DoomClock') {
            const doomCounters = areaCard.doomCounters || 0;
            counterData = {
                type: 'doom',
                value: `${doomCounters}`,
                className: 'area-counter-doom',
                color: doomCounters >= 10 ? '#FF0000' : doomCounters >= 8 ? '#DC143C' : '#8B0000',
                shadowColor: doomCounters >= 10 ? '255, 0, 0' : doomCounters >= 8 ? '220, 20, 60' : '139, 0, 0'
            };
        }

        if (!counterData) return null;

        // Create the counter element with enhanced positioning
        const counterElement = document.createElement('div');
        counterElement.className = `area-counter-bubble ${counterData.className}`;
        counterElement.setAttribute('data-counter-type', counterData.type);
        counterElement.textContent = counterData.value;

        // Apply comprehensive styling for proper positioning and appearance
        counterElement.style.cssText = `
            position: absolute;
            top: -12px;
            right: -12px;
            min-width: 28px;
            min-height: 28px;
            background: linear-gradient(135deg, ${counterData.color} 0%, ${this.darkenColor(counterData.color, 0.2)} 100%);
            color: white;
            border: 3px solid rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            font-size: 12px;
            font-weight: 900;
            z-index: 1000;
            box-shadow: 
                0 4px 12px rgba(${counterData.shadowColor}, 0.6),
                inset 0 1px 0 rgba(255, 255, 255, 0.4),
                0 0 0 1px rgba(0, 0, 0, 0.2);
            text-shadow: 
                1px 1px 2px rgba(0, 0, 0, 0.8),
                0 0 8px rgba(${counterData.shadowColor}, 0.8);
            letter-spacing: 0.5px;
            animation: counterPulse 3s ease-in-out infinite;
            pointer-events: none;
            user-select: none;
            transform-origin: center center;
            white-space: nowrap;
            overflow: visible;
        `;

        return counterElement;
    }

    // Helper method to darken a color
    darkenColor(color, amount) {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const rgb = [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16)
            ];
            const darkened = rgb.map(c => Math.max(0, Math.floor(c * (1 - amount))));
            return `#${darkened.map(c => c.toString(16).padStart(2, '0')).join('')}`;
        }
        return color;
    }

    // Enhanced area display update method - now smarter about when to remove counters
    updateAreaDisplay() {
        // Find the PLAYER'S area slot specifically using unique ID
        const playerAreaSlot = document.getElementById('player-area-slot');
        if (!playerAreaSlot) {
            console.warn('Player area slot not found for counter display update');
            return;
        }
        
        const currentArea = this.getAreaCard();
        
        if (!currentArea) {
            // Remove counters only if no area card
            this.removeExistingCounters(playerAreaSlot);
            return;
        }

        // Check if counter already exists and is correct
        const existingCounter = playerAreaSlot.querySelector('.area-counter-bubble');
        const counterElement = this.createAreaCounterDisplay(currentArea);
        
        if (counterElement) {
            // Only remove and recreate if the counter content would be different
            if (!existingCounter || existingCounter.textContent !== counterElement.textContent) {
                this.removeExistingCounters(playerAreaSlot);
                
                const areaCardContainer = playerAreaSlot.querySelector('.area-card');
                if (areaCardContainer) {
                    // Ensure the container has relative positioning
                    areaCardContainer.style.position = 'relative';
                    areaCardContainer.style.overflow = 'visible';
                    
                    // Append the counter to the area card container
                    areaCardContainer.appendChild(counterElement);
                    
                    // Add a brief animation for new counters
                    requestAnimationFrame(() => {
                        counterElement.classList.add('counter-appeared');
                    });
                } else {
                    console.warn('Area card container not found for counter positioning');
                }
            }
        } else {
            // No counter needed, remove any existing ones
            this.removeExistingCounters(playerAreaSlot);
        }
    }

    // Remove existing counter displays
    removeExistingCounters(areaSlot) {
        if (!areaSlot) return;
        
        const existingCounters = areaSlot.querySelectorAll('.area-counter-bubble, .storm-counter-display, .doom-counter-display');
        existingCounters.forEach(counter => counter.remove());
    }

    // Force counter update (useful for external calls)
    forceCounterUpdate() {
        setTimeout(() => {
            this.updateCountersOnly();
        }, 100);
    }

    showAreaDropResult(message, success) {
        const areaSlot = document.getElementById('player-area-slot');
        if (!areaSlot) return;
        
        const feedback = document.createElement('div');
        feedback.className = `area-drop-feedback ${success ? 'success' : 'error'}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: absolute; top: -40px; left: 50%; transform: translateX(-50%);
            padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: bold;
            z-index: 1000; animation: fadeInOut 2s ease-out; pointer-events: none;
            ${success ? 'background: rgba(76, 175, 80, 0.9); color: white;' : 'background: rgba(244, 67, 54, 0.9); color: white;'}
        `;
        
        areaSlot.style.position = 'relative';
        areaSlot.appendChild(feedback);
        setTimeout(() => feedback.remove(), 2000);
    }

    isDraggingAreaCard() {
        if (!this.heroSelection?.handManager?.isHandDragging()) return false;
        const dragState = this.heroSelection.handManager.getHandDragState();
        return this.isAreaCard(dragState.draggedCardName);
    }

    // State management
    exportAreaState() {
        return { areaCard: this.areaCard, opponentAreaCard: this.opponentAreaCard };
    }

    importAreaState(areaState) {
        if (!areaState) return false;
        this.areaCard = areaState.areaCard || null;
        this.opponentAreaCard = areaState.opponentAreaCard || null;
        
        // Update cached state after import
        this.updateCachedState();
        
        // Force counter update after state import (for reconnection)
        setTimeout(() => {
            this.updateCountersOnly();
        }, 200);
        
        return true;
    }

    reset() {
        this.areaCard = null;
        this.opponentAreaCard = null;
        // Reset state tracking
        this.lastAreaCardState = null;
        this.lastCounterValues = {};
    }

    getFormationUpdateData() {
        return { areaCard: this.areaCard };
    }

    handleFormationUpdateReceived(data) {
        if (data.areaCard) {
            this.opponentAreaCard = data.areaCard;
        }
        
        // Use smart update for network updates
        this.smartUpdateAreaDisplay();
    }

    getBattleInitData() {
        return { playerAreaCard: this.areaCard, opponentAreaCard: this.opponentAreaCard };
    }
}

// Enhanced CSS injection with proper counter styling
if (typeof document !== 'undefined' && !document.getElementById('areaStyles')) {
    const style = document.createElement('style');
    style.id = 'areaStyles';
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
            20% { opacity: 1; transform: translateX(-50%) translateY(0); }
            80% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }

        /* Enhanced area counter bubble styling */
        .area-counter-bubble {
            position: absolute !important;
            top: -12px !important;
            right: -12px !important;
            z-index: 1000 !important;
            min-width: 28px !important;
            min-height: 28px !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif !important;
            font-weight: 900 !important;
            pointer-events: none !important;
            user-select: none !important;
            white-space: nowrap !important;
            overflow: visible !important;
            transform-origin: center center !important;
        }

        .area-counter-bubble.counter-appeared {
            animation: counterAppear 0.5s ease-out;
        }

        @keyframes counterAppear {
            0% {
                opacity: 0;
                transform: scale(0.3) rotate(-180deg);
            }
            70% {
                opacity: 1;
                transform: scale(1.2) rotate(0deg);
            }
            100% {
                opacity: 1;
                transform: scale(1) rotate(0deg);
            }
        }

        @keyframes counterPulse {
            0%, 100% { 
                transform: scale(1);
                filter: brightness(1);
            }
            50% { 
                transform: scale(1.1);
                filter: brightness(1.2);
            }
        }

        /* Specific styling for storm counters */
        .area-counter-storm {
            animation: counterPulse 3s ease-in-out infinite;
        }

        /* Specific styling for doom counters with urgency indicators */
        .area-counter-doom {
            animation: counterPulse 2s ease-in-out infinite;
        }

        /* Enhanced positioning context for area cards */
        .area-card {
            position: relative !important;
            overflow: visible !important;
        }

        .area-card-image-container {
            position: relative !important;
            overflow: visible !important;
        }

        /* Ensure area slot doesn't clip counters */
        .area-slot {
            overflow: visible !important;
        }

        .area-slot.filled {
            overflow: visible !important;
        }

        /* Make sure team slots container allows overflow for counters */
        .team-slots-container {
            overflow: visible !important;
        }

        /* Responsive adjustments for counters */
        @media (max-width: 768px) {
            .area-counter-bubble {
                min-width: 24px !important;
                min-height: 24px !important;
                font-size: 10px !important;
                top: -10px !important;
                right: -10px !important;
            }
        }

        @media (max-width: 480px) {
            .area-counter-bubble {
                min-width: 20px !important;
                min-height: 20px !important;
                font-size: 9px !important;
                top: -8px !important;
                right: -8px !important;
            }
        }
    `;
    document.head.appendChild(style);
}


if (typeof document !== 'undefined') {
    // Create a mutation observer to track area counter removals
    const areaObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // Check if any area counter was removed
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList && node.classList.contains('area-counter-bubble')) {
                            console.error('🔥 AREA COUNTER REMOVED FROM DOM!', {
                                removedCounter: node,
                                counterText: node.textContent,
                                parentElement: mutation.target,
                                stackTrace: new Error().stack
                            });
                        }
                        
                        // Also check if a container with counters was removed
                        const childCounters = node.querySelectorAll && node.querySelectorAll('.area-counter-bubble');
                        if (childCounters && childCounters.length > 0) {
                            console.error('🔥 CONTAINER WITH COUNTERS REMOVED!', {
                                removedContainer: node,
                                childCounters: childCounters.length,
                                parentElement: mutation.target,
                                stackTrace: new Error().stack
                            });
                        }
                    }
                });
            }
        });
    });
    
    // Start observing when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            areaObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    } else {
        areaObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

export default AreaHandler;