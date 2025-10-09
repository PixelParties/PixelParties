// globalSpellManager.js - Handles all global spells
export class GlobalSpellManager {
    constructor() {
        this.loadedSpells = new Map();
        this.guardChangeMode = false;
    }

    // Guard Change mode management
    isGuardChangeModeActive() {
        return this.guardChangeMode || false;
    }

    setGuardChangeMode(active, heroSelection = null) {
        this.guardChangeMode = active;
        
        // Add/remove body class for CSS styling
        if (typeof document !== 'undefined') {
            if (active) {
                document.body.classList.add('guard-change-active');
            } else {
                document.body.classList.remove('guard-change-active');
            }
        }
        
        // Update UI indicator
        this.updateGuardChangeModeUI();
        
        // Sync with HeroCreatureManager if available
        if (heroSelection && heroSelection.heroCreatureManager) {
            heroSelection.heroCreatureManager.setGuardChangeMode(active);
        }
        
        // If heroSelection is not provided but we have window.heroSelection, use that
        if (!heroSelection && typeof window !== 'undefined' && window.heroSelection && window.heroSelection.heroCreatureManager) {
            window.heroSelection.heroCreatureManager.setGuardChangeMode(active);
        }
    }

    clearGuardChangeMode(heroSelection = null) {
        if (this.guardChangeMode) {
            this.setGuardChangeMode(false, heroSelection);
        }
    }

    updateGuardChangeModeUI() {
        const formationHeader = document.querySelector('.team-header h2');
        if (!formationHeader) return;
        
        const existingIndicator = document.querySelector('.guard-change-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        if (this.guardChangeMode) {
            const indicator = document.createElement('span');
            indicator.className = 'guard-change-indicator';
            indicator.innerHTML = `
                <span class="guard-change-indicator-icon">🛡️</span>
                <span>Guard Change active!</span>
            `;
            formationHeader.appendChild(indicator);
        }
    }

    // Global spell detection
    isGlobalSpell(cardName, heroSelection) {
        if (!heroSelection || !heroSelection.getCardInfo) return false;
        
        const cardInfo = heroSelection.getCardInfo(cardName);
        return cardInfo && cardInfo.cardType === 'Spell' && cardInfo.global === true;
    }

    // Check if player has MagicArts level 1+ (for Teleportal action cost negation)
    hasPlayerMagicArtsLevel1Plus(heroSelection) {
        const formation = heroSelection.formationManager.getBattleFormation();
        const heroPositions = ['left', 'center', 'right'].filter(pos => 
            formation[pos] !== null && formation[pos] !== undefined
        );
        
        for (const position of heroPositions) {
            const hero = formation[position];
            if (!hero) continue;
            
            // Get hero's abilities
            const heroAbilities = heroSelection.heroAbilitiesManager.getHeroAbilities(position);
            if (!heroAbilities) continue;
            
            // Count MagicArts abilities across all zones
            let magicArtsLevel = 0;
            ['zone1', 'zone2', 'zone3'].forEach(zone => {
                if (heroAbilities[zone] && Array.isArray(heroAbilities[zone])) {
                    const zoneAbilities = heroAbilities[zone].filter(ability => ability && ability.name === 'MagicArts');
                    magicArtsLevel += zoneAbilities.length;
                }
            });
            
            // If this hero has MagicArts level 1+, return true
            if (magicArtsLevel >= 1) {
                return true;
            }
        }
        
        return false;
    }

    // Handle clicking global spells
    async handleGlobalSpellActivation(cardIndex, cardName, heroSelection) {        
        const cardInfo = heroSelection.getCardInfo(cardName);
        if (!cardInfo || !cardInfo.global) {
            console.error(`${cardName} is not a global spell`);
            return false;
        }
        
        // Check action requirements with special handling for Teleportal
        if (cardInfo.action && heroSelection.actionManager) {
            // Special case for Teleportal: skip action check if player has MagicArts 1+
            if (cardName === 'Teleportal') {
                const hasMagicArts1Plus = this.hasPlayerMagicArtsLevel1Plus(heroSelection);
                if (!hasMagicArts1Plus) {
                    // Only check for actions if MagicArts condition is not met
                    const actionCheck = heroSelection.actionManager.canPlayActionCard(cardInfo);
                    if (!actionCheck.canPlay) {
                        window.showActionError(actionCheck.reason, window.event || { clientX: 0, clientY: 0 });
                        return false;
                    }
                }
                // If hasMagicArts1Plus is true, skip the action check entirely
            } else {
                // For all other action-requiring spells, do normal check
                const actionCheck = heroSelection.actionManager.canPlayActionCard(cardInfo);
                if (!actionCheck.canPlay) {
                    window.showActionError(actionCheck.reason, window.event || { clientX: 0, clientY: 0 });
                    return false;
                }
            }
        }
        
        return await this.handleGlobalSpellClick(cardIndex, cardName, heroSelection);
    }

    async handleGlobalSpellClick(cardIndex, cardName, heroSelection) {        
        if (cardName === 'GuardChange') {
            return await this.handleGuardChangeClick(cardIndex, cardName, heroSelection);
        }
        if (cardName === 'TharxianHorse') {
            return await this.handleTharxianHorseClick(cardIndex, cardName, heroSelection);
        }
        if (cardName === 'Teleportal') {
            return await this.handleTeleportalClick(cardIndex, cardName, heroSelection);
        }
        if (cardName === 'DivineGiftOfMagic') {
            return await this.handleDivineGiftOfMagicClick(cardIndex, cardName, heroSelection);
        }
        if (cardName === 'AntiMagicShield') {
            return await this.handleAntiMagicShieldClick(cardIndex, cardName, heroSelection);
        }
        if (cardName === 'CreateIllusion') {
            return await this.handleCreateIllusionClick(cardIndex, cardName, heroSelection);
        }
        if (cardName === 'AuroraBorealis') {
            return await this.handleAuroraBorealisClick(cardIndex, cardName, heroSelection);
        }
        if (cardName === 'Expedition') {
            return await this.handleExpeditionClick(cardIndex, cardName, heroSelection);
        }
        if (cardName === 'Shipwrecked') {
            return await this.handleShipwreckedClick(cardIndex, cardName, heroSelection);
        }
        
        return false;
    }

    async handleShipwreckedClick(cardIndex, cardName, heroSelection) {
        try {
            const spell = await this.loadSpell('shipwrecked');
            if (spell && spell.handleClick) {
                const result = await spell.handleClick(cardIndex, cardName, heroSelection, this);
                return result;
            } else {
                console.error('Shipwrecked spell missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load Shipwrecked spell:', error);
            return false;
        }
    }

    async handleExpeditionClick(cardIndex, cardName, heroSelection) {
        try {
            const spell = await this.loadSpell('expedition');
            if (spell && spell.handleClick) {
                const result = await spell.handleClick(cardIndex, cardName, heroSelection, this);
                return result;
            } else {
                console.error('Expedition spell missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load Expedition spell:', error);
            return false;
        }
    }

    async handleAuroraBorealisClick(cardIndex, cardName, heroSelection) {
        try {
            const spell = await this.loadSpell('auroraBorealis');
            if (spell && spell.handleClick) {
                const result = await spell.handleClick(cardIndex, cardName, heroSelection, this);
                return result;
            } else {
                console.error('AuroraBorealis spell missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load AuroraBorealis spell:', error);
            return false;
        }
    }

    async handleCreateIllusionClick(cardIndex, cardName, heroSelection) {
        try {
            const spell = await this.loadSpell('createIllusion');
            if (spell && spell.handleClick) {
                const result = await spell.handleClick(cardIndex, cardName, heroSelection, this);
                return result;
            } else {
                console.error('CreateIllusion spell missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load CreateIllusion spell:', error);
            return false;
        }
    }

    async handleAntiMagicShieldClick(cardIndex, cardName, heroSelection) {
        try {
            const spell = await this.loadSpell('antiMagicShield');
            if (spell && spell.handleClick) {
                const result = await spell.handleClick(cardIndex, cardName, heroSelection, this);
                return result;
            } else {
                console.error('Anti-Magic Shield spell missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load Anti-Magic Shield spell:', error);
            return false;
        }
    }

    async handleDivineGiftOfMagicClick(cardIndex, cardName, heroSelection) {
        try {
            const spell = await this.loadSpell('divineGiftOfMagic');
            if (spell && spell.handleClick) {
                const result = await spell.handleClick(cardIndex, cardName, heroSelection, this);
                return result;
            } else {
                console.error('DivineGiftOfMagic spell missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load DivineGiftOfMagic spell:', error);
            return false;
        }
    }

    async handleTeleportalClick(cardIndex, cardName, heroSelection) {
        try {
            const spell = await this.loadSpell('teleportal');
            if (spell && spell.handleClick) {
                const result = await spell.handleClick(cardIndex, cardName, heroSelection, this);
                return result;
            } else {
                console.error('Teleportal spell missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load Teleportal spell:', error);
            return false;
        }
    }

    async handleGuardChangeClick(cardIndex, cardName, heroSelection) {
        try {
            const spell = await this.loadSpell('guardChange');
            if (spell && spell.handleClick) {
                const result = await spell.handleClick(cardIndex, cardName, heroSelection, this);
                return result;
            } else {
                console.error('GuardChange spell missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load GuardChange spell:', error);
            return false;
        }
    }

    async handleTharxianHorseClick(cardIndex, cardName, heroSelection) {
        try {
            const spell = await this.loadSpell('tharxianHorse');
            if (spell && spell.handleClick) {
                const result = await spell.handleClick(cardIndex, cardName, heroSelection, this);
                return result;
            } else {
                console.error('TharxianHorse spell missing handleClick method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load TharxianHorse spell:', error);
            return false;
        }
    }

    // Load spell files
    async loadSpell(moduleName) {
        if (this.loadedSpells.has(moduleName)) {
            return this.loadedSpells.get(moduleName);
        }

        try {
            const module = await import(`./Spells/${moduleName}.js`);
            const spellExportName = `${moduleName}Spell`;
            const spell = module[spellExportName];
            
            if (spell) {
                this.loadedSpells.set(moduleName, spell);
                return spell;
            } else {
                console.error(`Spell export ${spellExportName} not found in ${moduleName}.js`);
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    // Handle dragging global spells onto heroes (should show hint)
    isDraggingGlobalSpell(heroSelection) {
        if (!heroSelection.handManager || !heroSelection.handManager.isHandDragging()) {
            return false;
        }
        
        const dragState = heroSelection.handManager.getHandDragState();
        return this.isGlobalSpell(dragState.draggedCardName, heroSelection);
    }

    async handleGlobalSpellDropOnHero(targetSlot, heroSelection) {
        const dragState = heroSelection.handManager.getHandDragState();
        const spellName = dragState.draggedCardName;
        
        heroSelection.handManager.endHandCardDrag();
        
        // Handle Teleport spell specifically
        if (spellName === 'Teleport') {
            return this.handleTeleportDropOnHero(targetSlot, heroSelection, dragState);
        }
        // Handle ButterflyCloud spell specifically
        if (spellName === 'ButterflyCloud') {
            return this.handleButterflyCloudDropOnHero(targetSlot, heroSelection, dragState);
        }
        
        // Other global spells show the generic message
        this.showSpellDropResult(targetSlot, 'Global spells must be clicked to activate!', false, heroSelection);
        return false;
    }

    showSpellDropResult(heroPosition, message, success, heroSelection) {
        const teamSlot = document.querySelector(`.team-slot[data-position="${heroPosition}"]`);
        if (!teamSlot) return;
        
        const feedback = document.createElement('div');
        feedback.className = `spell-drop-feedback ${success ? 'success' : 'error'}`;
        feedback.textContent = message;
        
        feedback.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            white-space: nowrap;
            z-index: 1000;
            animation: fadeInOut 2s ease-out;
            pointer-events: none;
            background: rgba(54, 162, 235, 0.9);
            color: white;
        `;
        
        teamSlot.style.position = 'relative';
        teamSlot.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }

    async handleTeleportDropOnHero(targetSlot, heroSelection, dragState) {
        try {
            const spell = await this.loadSpell('teleport');
            if (spell && spell.handleDrop) {
                const result = await spell.handleDrop(
                    targetSlot, 
                    dragState.draggedCardIndex, 
                    dragState.draggedCardName, 
                    heroSelection, 
                    this
                );
                return result;
            } else {
                console.error('Teleport spell missing handleDrop method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load Teleport spell:', error);
            return false;
        }
    }

    async handleButterflyCloudDropOnHero(targetSlot, heroSelection, dragState) {
        try {
            const spell = await this.loadSpell('butterflyCloud');
            if (spell && spell.handleDrop) {
                const result = await spell.handleDrop(
                    targetSlot, 
                    dragState.draggedCardIndex, 
                    dragState.draggedCardName, 
                    heroSelection, 
                    this
                );
                return result;
            } else {
                console.error('ButterflyCloud spell missing handleDrop method');
                return false;
            }
        } catch (error) {
            console.error('Failed to load ButterflyCloud spell:', error);
            return false;
        }
    }

    // Save and load state
    exportGlobalSpellState() {
        return {
            guardChangeMode: this.guardChangeMode
        };
    }

    importGlobalSpellState(state) {
        if (!state) {
            return false;
        }
        
        const wasGuardChangeActive = this.guardChangeMode;
        const newGuardChangeMode = state.guardChangeMode || false;
                
        // Use setGuardChangeMode to ensure proper synchronization
        if (newGuardChangeMode !== wasGuardChangeActive) {
            this.setGuardChangeMode(newGuardChangeMode);
        } else {
            // Even if the state is the same, ensure UI is properly synced
            this.guardChangeMode = newGuardChangeMode;
            if (newGuardChangeMode) {
                this.updateGuardChangeModeUI();
                
                // Ensure body class is set
                if (typeof document !== 'undefined') {
                    document.body.classList.add('guard-change-active');
                }
                
                // Ensure HeroCreatureManager is synced
                if (typeof window !== 'undefined' && window.heroSelection && window.heroSelection.heroCreatureManager) {
                    window.heroSelection.heroCreatureManager.setGuardChangeMode(true);
                }
            }
        }
        
        return true;
    }

    reset() {
        this.guardChangeMode = false;
        this.loadedSpells.clear();
        
        // Clean up body class
        if (typeof document !== 'undefined') {
            document.body.classList.remove('guard-change-active');
        }
        
        const existingIndicator = document.querySelector('.guard-change-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
    }
}

// Create the manager instance
const globalSpellManager = new GlobalSpellManager();
export { globalSpellManager };

// Make it available globally
if (typeof window !== 'undefined') {
    window.globalSpellManager = globalSpellManager;
}

// Add the visual styles
if (typeof document !== 'undefined' && !document.getElementById('globalSpellManagerStyles')) {
    const style = document.createElement('style');
    style.id = 'globalSpellManagerStyles';
    style.textContent = `
        .guard-change-indicator {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-left: 16px;
            padding: 4px 12px;
            background: rgba(255, 193, 7, 0.2);
            border: 1px solid rgba(255, 193, 7, 0.5);
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            color: #ff6f00;
            animation: guardChangeGlow 2s ease-in-out infinite;
        }
        
        @keyframes guardChangeGlow {
            0%, 100% { 
                background: rgba(255, 193, 7, 0.2);
                border-color: rgba(255, 193, 7, 0.5);
            }
            50% { 
                background: rgba(255, 193, 7, 0.3);
                border-color: rgba(255, 193, 7, 0.7);
            }
        }
        
        .guard-change-indicator-icon {
            font-size: 16px;
        }
        
        .hand-card[data-card-type="global-spell"] {
            position: relative;
            cursor: pointer;
        }
        
        .hand-card[data-card-type="global-spell"]::before {
            content: "🌐";
            position: absolute;
            top: 5px;
            left: 5px;
            font-size: 16px;
            z-index: 10;
            text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
            filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
        }
        
        .hand-card[data-card-type="global-spell"]:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0, 123, 255, 0.3);
        }
        
        @keyframes fadeInTooltip {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(5px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        @keyframes teleportHintFade {
            0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
            20% { opacity: 1; transform: translateX(-50%) translateY(0); }
            80% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-5px); }
        }

        .teleport-hint-content {
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: center;
        }
    `;
    document.head.appendChild(style);
}