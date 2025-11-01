// cardPreviewManager.js - Enhanced with Reward Screen Dedicated Tooltip Support (Fixed Layout) and Deck Tooltip Positioning

export class CardPreviewManager {
    constructor() {
        this.cardPreviewVisible = false;
        this.currentlyPreviewedCharacter = null;
    }

    // Helper function to convert spaced names to camelCase for file paths
    normalizeCardName(cardName) {
        if (!cardName) return cardName;
        
        // If it already looks like a file path or doesn't contain spaces, return as-is
        if (cardName.includes('/') || cardName.includes('.') || !cardName.includes(' ')) {
            return cardName;
        }
        
        // Convert "Soul Shard Sah" to "SoulShardSah"
        return cardName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    // Helper function to get the correct card image path
    getCardImagePath(cardName, cardType = 'ability') {
        const normalizedName = this.normalizeCardName(cardName);
        
        // Handle different card types
        if (cardType === 'character') {
            return `./Cards/Characters/${normalizedName}.png`;
        } else {
            return `./Cards/All/${normalizedName}.png`;
        }
    }

    // Enhanced showCardTooltip with reward screen detection and deck card positioning
    showCardTooltip(cardData, cardElement) {
        // Normalize the image path if it's a card name
        if (cardData.imagePath && !cardData.imagePath.includes('/')) {
            cardData.imagePath = this.getCardImagePath(cardData.imagePath, cardData.cardType);
        } else if (cardData.cardName) {
            // If cardName is provided separately, use it to construct the path
            cardData.imagePath = this.getCardImagePath(cardData.cardName, cardData.cardType);
        }
        
        // Check if we're in the singleplayer lobby
        const lobbyTooltipContent = document.getElementById('lobbyTooltipContent');
        if (lobbyTooltipContent) {
            this.showLobbyTooltip(cardData, lobbyTooltipContent);
            return;
        }
        
        // Check if we're in reward screen first
        const isRewardScreen = document.getElementById('cardRewardOverlay');
        
        if (isRewardScreen) {
            this.showRewardScreenPreview(cardData);
            return;
        }
        
        // Check if we're in team building phase (battle formation screen)
        const isDeckTooltip = document.getElementById('deckTooltipAnchor');
        const isTeamBuilding = document.querySelector('.team-building-container');
        
        if (isDeckTooltip && isTeamBuilding) {
            // Check if this is a deck card specifically
            const isDeckCard = cardElement && cardElement.closest('.deck-grid-container');
            
            // Apply deck card specific positioning
            if (isDeckCard) {
                // Deck cards: far to the left (30% + base offset)
                isDeckTooltip.style.setProperty('right', 'calc(50px + 30vw)', 'important');
            } else {
                // Hand/Hero cards: slightly to the left (5% + base offset)
                isDeckTooltip.style.setProperty('right', 'calc(50px + 3.4vw)', 'important');
            }
            
            // Use the dedicated deck tooltip container
            this.showDeckTooltip(cardData);
            return;
        }
        
        // Continue with original floating tooltip logic for other screens
        let tooltipContainer = document.getElementById('cardTooltipContainer');
        if (!tooltipContainer) {
            tooltipContainer = document.createElement('div');
            tooltipContainer.id = 'cardTooltipContainer';
            tooltipContainer.className = 'card-tooltip-container';
            tooltipContainer.style.background = 'transparent';
            tooltipContainer.style.border = 'none';
            tooltipContainer.style.padding = '0';
            tooltipContainer.style.margin = '0';
            document.body.appendChild(tooltipContainer);
        } else {
            tooltipContainer.style.background = 'transparent';
            tooltipContainer.style.border = 'none';
            tooltipContainer.style.padding = '0';
            tooltipContainer.style.margin = '0';
        }

        // Set appropriate z-index for battle screen
        const isBattleScreen = document.getElementById('battleArena');
        if (isBattleScreen) {
            tooltipContainer.style.zIndex = '10000';
        } else {
            tooltipContainer.style.zIndex = '3000';
        }

        // Check if this is a character card with stats
        const isCharacterWithStats = cardData.cardType === 'character' && cardData.heroStats;
        const isCreatureWithStats = cardData.cardType === 'creature' && cardData.creatureStats;

        // Build the card HTML with sprite-positioned stats
        let cardHTML = `
            <div class="large-card-tooltip ${isCharacterWithStats ? 'character-with-stats' : ''}">
                <div class="tooltip-image-container">
                    <img src="${cardData.imagePath}" 
                        alt="${cardData.displayName}" 
                        class="large-card-image"
                        style="transform: scale(1.5); transform-origin: center;"
                        onerror="this.src='./Cards/placeholder.png'">
        `;
        
        // Add hero stats positioned on the sprite if available
        if (isCharacterWithStats) {
            const stats = cardData.heroStats;
            cardHTML += `
                    <div class="tooltip-sprite-stats">
                        <div class="tooltip-sprite-stat hp-stat">
                            <span class="stat-value">${stats.currentHp}</span>
                        </div>
                        <div class="tooltip-sprite-stat attack-stat">
                            <span class="stat-value">${stats.attack}</span>
                        </div>
                    </div>
            `;
        }

        if (isCreatureWithStats) {
            const stats = cardData.creatureStats;
            cardHTML += `
                    <div class="tooltip-sprite-stats">
                        <div class="tooltip-sprite-stat hp-stat" style="left: 130px;">
                            <span class="stat-value">${stats.maxHp}</span>
                        </div>
                    </div>
            `;
        }
        
        cardHTML += `
                </div>
                <div class="card-tooltip-name">${cardData.displayName}</div>
            </div>
        `;

        // Set content
        tooltipContainer.innerHTML = cardHTML;
        tooltipContainer.style.display = 'block';
        tooltipContainer.style.position = 'fixed';

        // Wait for next frame to ensure rendering
        requestAnimationFrame(() => {
            const tooltipContent = tooltipContainer.querySelector('.large-card-tooltip');
            this.positionCardTooltipFixed(tooltipContainer, tooltipContent);
        });
        
        // Get the tooltip content element
        const tooltipContent = tooltipContainer.querySelector('.large-card-tooltip');
        
        // Force layout recalculation before positioning
        const deckColumn = document.querySelector('.team-building-right');
        if (deckColumn) {
            // Force the browser to recalculate all layout
            deckColumn.offsetWidth; // Force reflow
            deckColumn.getBoundingClientRect(); // Force bounds calculation
        }
        
        // Position the tooltip
        this.positionCardTooltipFixed(tooltipContainer, tooltipContent);
    }

    showLobbyTooltip(cardData, lobbyTooltipContent) {
        // Hide placeholder
        const placeholder = document.getElementById('lobbyTooltipPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Check if this is a character card with stats
        const isCharacterWithStats = cardData.cardType === 'character' && cardData.heroStats;
        const isCreatureWithStats = cardData.cardType === 'creature' && cardData.creatureStats;

        // Build the card HTML with sprite-positioned stats
        let cardHTML = `
            <div class="large-card-tooltip ${isCharacterWithStats ? 'character-with-stats' : ''}">
                <div class="tooltip-image-container">
                    <img src="${cardData.imagePath}" 
                        alt="${cardData.displayName}" 
                        class="large-card-image"
                        style="transform: scale(1.5); transform-origin: center;"
                        onerror="this.src='./Cards/placeholder.png'">
        `;
        
        // Add hero stats positioned on the sprite if available
        if (isCharacterWithStats) {
            const stats = cardData.heroStats;
            cardHTML += `
                    <div class="tooltip-sprite-stats">
                        <div class="tooltip-sprite-stat hp-stat">
                            <span class="stat-value">${stats.currentHp}</span>
                        </div>
                        <div class="tooltip-sprite-stat attack-stat">
                            <span class="stat-value">${stats.attack}</span>
                        </div>
                    </div>
            `;
        }

        if (isCreatureWithStats) {
            const stats = cardData.creatureStats;
            cardHTML += `
                    <div class="tooltip-sprite-stats">
                        <div class="tooltip-sprite-stat hp-stat" style="left: 130px;">
                            <span class="stat-value">${stats.maxHp}</span>
                        </div>
                    </div>
            `;
        }
        
        cardHTML += `
                </div>
                <div class="card-tooltip-name">${cardData.displayName}</div>
            </div>
        `;

        // Set content
        lobbyTooltipContent.innerHTML = cardHTML;
    }

    showDeckTooltip(cardData) {
        const tooltipContent = document.getElementById('deckTooltipContent');
        if (!tooltipContent) {
            return;
        }
        
        // Check if this is a character card with stats
        const isCharacterWithStats = cardData.cardType === 'character' && cardData.heroStats;
        const isCreatureWithStats = cardData.cardType === 'creature' && cardData.creatureStats;

        // Build the card HTML with sprite-positioned stats
        let cardHTML = `
            <div class="large-card-tooltip ${isCharacterWithStats ? 'character-with-stats' : ''}">
                <div class="tooltip-image-container">
                    <img src="${cardData.imagePath}" 
                        alt="${cardData.displayName}" 
                        class="large-card-image"
                        onerror="this.src='./Cards/placeholder.png'">
        `;
        
        // Add hero stats positioned on the sprite if available
        if (isCharacterWithStats) {
            const stats = cardData.heroStats;
            cardHTML += `
                    <div class="tooltip-sprite-stats">
                        <div class="tooltip-sprite-stat hp-stat">
                            <span class="stat-value">${stats.currentHp}</span>
                        </div>
                        <div class="tooltip-sprite-stat attack-stat">
                            <span class="stat-value">${stats.attack}</span>
                        </div>
                    </div>
            `;
        }

        if (isCreatureWithStats) {
            const stats = cardData.creatureStats;
            cardHTML += `
                    <div class="tooltip-sprite-stats">
                        <div class="tooltip-sprite-stat hp-stat" style="left: 130px;">
                            <span class="stat-value">${stats.maxHp}</span>
                        </div>
                    </div>
            `;
        }
        
        cardHTML += `
                </div>
                <div class="card-tooltip-name">${cardData.displayName}</div>
            </div>
        `;
        
        tooltipContent.innerHTML = cardHTML;
        tooltipContent.style.display = 'flex';
    }

    forceLayoutRecalculation() {
        const deckColumn = document.querySelector('.team-building-right');
        if (deckColumn) {
            // Force the browser to recalculate layout
            deckColumn.style.display = 'none';
            deckColumn.offsetHeight; // Force reflow
            deckColumn.style.display = '';
        }
    }

    // Show preview in dedicated reward screen area with stable layout
     showRewardScreenPreview(cardData) {
        const previewArea = document.getElementById('rewardCardPreview');
        if (!previewArea) {
            console.warn('Reward card preview area not found!');
            return;
        }
        
        // Find or create the stable container
        let stableContainer = previewArea.querySelector('.stable-preview-container');
        if (!stableContainer) {
            // Create stable container that maintains consistent size
            stableContainer = document.createElement('div');
            stableContainer.className = 'stable-preview-container';
            
            // Set fixed dimensions to match the parent container
            stableContainer.style.cssText = `
                width: 100%;
                height: 100%;
                min-height: 500px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            `;
            
            previewArea.innerHTML = '';
            previewArea.appendChild(stableContainer);
        }
        
        // Update only the content inside the stable container
        stableContainer.innerHTML = `
            <div class="preview-card-display">
                <img src="${cardData.imagePath}" 
                     alt="${cardData.displayName}" 
                     class="preview-card-image"
                     onerror="this.src='./Cards/placeholder.png'"
                     style="max-width: 340px; max-height: 85%; object-fit: contain;">
            </div>
        `;
    }

    // FIXED: Hide reward screen preview with stable layout
    hideRewardScreenPreview() {
        const previewArea = document.getElementById('rewardCardPreview');
        if (!previewArea) return;
        
        // Find the stable container
        let stableContainer = previewArea.querySelector('.stable-preview-container');
        if (!stableContainer) {
            // Create stable container if it doesn't exist
            stableContainer = document.createElement('div');
            stableContainer.className = 'stable-preview-container';
            
            stableContainer.style.cssText = `
                width: 100%;
                height: 100%;
                min-height: 500px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            `;
            
            previewArea.innerHTML = '';
            previewArea.appendChild(stableContainer);
        }
        
        // Update only the content inside the stable container
        stableContainer.innerHTML = `
            <div class="preview-placeholder">
                <div class="preview-icon" style="font-size: 48px; margin-bottom: 10px; opacity: 0.7;">👁️</div>
                <p style="font-size: 14px; margin: 0; font-style: italic; color: rgba(255, 255, 255, 0.6);">Hover over any card to preview</p>
            </div>
        `;
    }

    // Enhanced hideCardTooltip with reward screen support and deck positioning reset
    hideCardTooltip() {
        // Check if we're in the singleplayer lobby
        const lobbyTooltipContent = document.getElementById('lobbyTooltipContent');
        if (lobbyTooltipContent) {
            // Show placeholder again
            const placeholder = document.getElementById('lobbyTooltipPlaceholder');
            if (placeholder) {
                placeholder.style.display = 'block';
            }
            // Clear the tooltip content except the placeholder
            const cardTooltip = lobbyTooltipContent.querySelector('.large-card-tooltip');
            if (cardTooltip) {
                cardTooltip.remove();
            }
            return;
        }
        
        // Check if we're in reward screen first
        const isRewardScreen = document.getElementById('cardRewardOverlay');
        
        if (isRewardScreen) {
            this.hideRewardScreenPreview();
            return;
        }
        
        // Reset deck tooltip positioning when hiding (default to hand/hero positioning)
        const isDeckTooltip = document.getElementById('deckTooltipAnchor');
        if (isDeckTooltip) {
            isDeckTooltip.style.setProperty('right', 'calc(50px + 5vw)', 'important');
        }
        
        // Hide deck tooltip if it exists
        const deckTooltip = document.getElementById('deckTooltipContent');
        if (deckTooltip) {
            deckTooltip.style.display = 'none';
        }
        
        // Continue with original logic for other screens
        const tooltipContainer = document.getElementById('cardTooltipContainer');
        if (tooltipContainer) {
            tooltipContainer.style.display = 'none';
        }
    }

    // Positioning logic that uses actual measurements
    positionCardTooltipFixed(tooltipContainer, tooltipContent) {
        // Get actual tooltip dimensions after rendering
        const tooltipRect = tooltipContent.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width || 300;
        const tooltipHeight = tooltipRect.height || 420;

        // Check if we're in the battle screen (but not reward screen)
        const isBattleScreen = document.getElementById('battleArena') && !document.getElementById('cardRewardOverlay');
        
        if (isBattleScreen) {
            // Battle screen positioning
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            const battleInterfacePanel = document.querySelector('.battle-interface-panel');
            let finalX, finalY;
            
            if (battleInterfacePanel) {
                const panelRect = battleInterfacePanel.getBoundingClientRect();
                finalX = panelRect.left + 20;
                finalY = Math.max(20, (viewportHeight / 2) - (tooltipHeight / 2));
                
                if (finalX + tooltipWidth > panelRect.right - 20) {
                    finalX = panelRect.right - tooltipWidth - 20;
                }
                
                if (finalY + tooltipHeight > viewportHeight - 20) {
                    finalY = viewportHeight - tooltipHeight - 20;
                }
                if (finalY < 20) {
                    finalY = 20;
                }
            } else {
                finalX = Math.max(20, viewportWidth * 0.75 - (tooltipWidth / 2));
                finalY = Math.max(20, (viewportHeight / 2) - (tooltipHeight / 2));
            }
            
            this.applyTooltipStylesFixed(tooltipContent, finalX, finalY, false);
        } else {
            // Check if we're in singleplayer lobby
            const isSingleplayerLobby = document.getElementById('singleplayerLobby');
            
            if (isSingleplayerLobby) {
                // Position on the right side for singleplayer lobby
                const finalX = window.innerWidth - tooltipWidth - 50;  // 50px from right edge
                const finalY = 200;
                this.applyTooltipStylesFixed(tooltipContent, finalX, finalY, false);
            } else {
                // Regular game positioning - near deck area
                this.positionTooltipForGameScreenFixed(tooltipContent, tooltipWidth, tooltipHeight);
            }
        }
    }

    // position tooltip for battle screen with measured dimensions
    positionTooltipForGameScreenFixed(tooltipContent, tooltipWidth, tooltipHeight) {
        const deckColumn = document.querySelector('.team-building-right');
        if (!deckColumn) {
            this.positionTooltipFallbackFixed(tooltipContent, tooltipWidth, tooltipHeight);
            return;
        }

        const tooltipContainer = tooltipContent.parentElement || tooltipContent;
        const isBattleFormation = document.querySelector('.team-building-container') !== null;
        
        if (isBattleFormation) {
            // Try using offset properties instead of getBoundingClientRect
            const parent = deckColumn.offsetParent || document.body;
            let left = deckColumn.offsetLeft;
            let top = deckColumn.offsetTop;
            
            // Walk up the offset parent chain to get absolute position
            let element = deckColumn;
            while (element.offsetParent && element.offsetParent !== document.body) {
                element = element.offsetParent;
                left += element.offsetLeft;
                top += element.offsetTop;
            }
            
            const width = deckColumn.offsetWidth;
            const height = deckColumn.offsetHeight;
            
            if (width === 0 || left === 0) {
                // Still invalid, use fallback
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                const finalX = viewportWidth * 0.75 - (tooltipWidth / 2);
                const finalY = viewportHeight * 0.5 - (tooltipHeight / 2);
                
                this.applyTooltipPositioning(tooltipContainer, tooltipContent, 
                    Math.max(20, Math.min(finalX, viewportWidth - tooltipWidth - 20)),
                    Math.max(20, Math.min(finalY, viewportHeight - tooltipHeight - 20))
                );
            } else {
                // Use offset-based positioning
                const deckCenterX = left + (width / 2);
                const deckCenterY = top + (height / 2);
                
                const finalX = deckCenterX;
                const finalY = deckCenterY - height/5;
                
                this.applyTooltipPositioning(tooltipContainer, tooltipContent, finalX, Math.max(20, finalY));
            }
        } else {
            // Original positioning for other screens
            const deckRect = deckColumn.getBoundingClientRect();
            const centerX = deckRect.left + (deckColumn.offsetWidth / 2);
            const finalX = centerX - (tooltipWidth / 2) + 5;
            const finalY = deckRect.top - tooltipHeight + 650;
            
            this.applyTooltipStylesFixed(tooltipContent, 
                Math.max(20, Math.min(finalX, window.innerWidth - tooltipWidth - 20)),
                Math.max(20, Math.min(finalY, window.innerHeight - tooltipHeight - 20)),
                false
            );
        }
    }

    applyTooltipPositioning(container, content, x, y) {
        if (container && container.id === 'cardTooltipContainer') {
            // Ensure container has no background
            container.style.background = 'transparent';
            container.style.border = 'none';
            container.style.padding = '0';
            container.style.margin = '0';
            container.style.width = 'auto';
            container.style.height = 'auto';
            
            // Position the container
            container.style.position = 'fixed';
            container.style.left = Math.floor(x) + 'px';
            container.style.top = Math.floor(y) + 'px';
            container.style.transform = 'none';
            
            // Ensure content is relatively positioned within container
            content.style.position = 'relative';
            content.style.left = '0';
            content.style.top = '0';
            content.style.transform = 'none';
        }
    }

    // Fallback positioning with measured dimensions
    positionTooltipFallbackFixed(tooltipContent, tooltipWidth, tooltipHeight) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const finalX = Math.max(20, (viewportWidth / 2) - (tooltipWidth / 2));
        const finalY = Math.max(20, (viewportHeight / 2) - (tooltipHeight / 2.5));

        this.applyTooltipStylesFixed(tooltipContent, finalX, finalY, false);
    }

    // FIXED apply tooltip styles without changing dimensions
    applyTooltipStylesFixed(tooltipContent, x, y, isRewardScreen = false) {
        // First ensure the container (parent) has no background
        const tooltipContainer = tooltipContent.parentElement;
        if (tooltipContainer && tooltipContainer.id === 'cardTooltipContainer') {
            tooltipContainer.style.background = 'transparent';
            tooltipContainer.style.border = 'none';
            tooltipContainer.style.padding = '0';
            tooltipContainer.style.margin = '0';
        }
        
        tooltipContent.style.position = 'fixed';
        tooltipContent.style.left = x + 'px';
        tooltipContent.style.top = y + 'px';
        tooltipContent.style.zIndex = isRewardScreen ? '10001' : '9999'; // Higher z-index for reward screen
        tooltipContent.style.pointerEvents = 'none';
        
        // Apply consistent styling without changing dimensions
        tooltipContent.style.background = 'rgba(0, 0, 0, 0.95)';
        tooltipContent.style.border = '2px solid #555';
        tooltipContent.style.borderRadius = '12px';
        tooltipContent.style.padding = '15px';
        tooltipContent.style.textAlign = 'center';
        tooltipContent.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.8)';
        tooltipContent.style.backdropFilter = 'blur(10px)';
        
        // Remove any width constraints that might cause resizing
        tooltipContent.style.maxWidth = 'none';
        tooltipContent.style.width = 'auto';
        tooltipContent.style.height = 'auto';
        
        // Style the tooltip name
        const tooltipName = tooltipContent.querySelector('.card-tooltip-name');
        if (tooltipName) {
            tooltipName.style.color = '#fff';
            tooltipName.style.fontSize = '16px';
            tooltipName.style.fontWeight = 'bold';
            tooltipName.style.marginTop = '10px';
            tooltipName.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        }
    }

    // Legacy method kept for compatibility (delegates to new method)
    positionCardTooltip(tooltipContainer) {
        const tooltipContent = tooltipContainer.querySelector('.large-card-tooltip');
        if (!tooltipContent) return;
        
        // Force measurement and use new positioning logic
        tooltipContent.offsetHeight; // Force reflow
        this.positionCardTooltipFixed(tooltipContainer, tooltipContent);
    }

    // Comprehensive tooltip cleanup - removes ALL possible tooltips
    clearAllTooltips() {
        // Clear deck tooltip
        const deckTooltip = document.getElementById('deckTooltipContent');
        if (deckTooltip) {
            deckTooltip.style.display = 'none';
            deckTooltip.innerHTML = '';
        }
        
        // Clear reward screen preview if present
        this.hideRewardScreenPreview();
        
        // Clear main card tooltip container
        const tooltipContainer = document.getElementById('cardTooltipContainer');
        if (tooltipContainer) {
            tooltipContainer.style.display = 'none';
            tooltipContainer.remove();
        }
        
        // Clear any floating card tooltips with class
        const floatingTooltips = document.querySelectorAll('.large-card-tooltip, .card-tooltip-container');
        floatingTooltips.forEach(tooltip => {
            tooltip.remove();
        });
        
        // Clear any battle card preview tooltips
        const battleTooltips = document.querySelectorAll('.preview-card-display, .battle-card-tooltip');
        battleTooltips.forEach(tooltip => {
            tooltip.remove();
        });
        
        // Clear any card preview content
        const previewColumns = document.querySelectorAll('.card-preview-column');
        previewColumns.forEach(column => {
            const previews = column.querySelectorAll('.card-preview-content');
            previews.forEach(preview => {
                if (preview.querySelector('.large-card-tooltip')) {
                    preview.remove();
                }
            });
        });
        
        // Reset any hover states that might be stuck
        const hoveredCards = document.querySelectorAll('.hand-card-hover, .preview-card:hover');
        hoveredCards.forEach(card => {
            card.classList.remove('hand-card-hover');
            card.style.transform = '';
            card.style.zIndex = '';
        });
        
        // Clear any positioned elements that might be tooltips
        const allFixed = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');
        allFixed.forEach(element => {
            // Check if it's likely a tooltip based on high z-index and content
            const style = window.getComputedStyle(element);
            const zIndex = parseInt(style.zIndex);
            if (zIndex > 1000 && (
                element.textContent.includes('card') ||
                element.querySelector('img[src*="/Cards/"]') ||
                element.classList.contains('tooltip') ||
                element.id.includes('tooltip') ||
                element.id.includes('preview')
            )) {
                element.remove();
            }
        });
        
        // Reset card preview state
        this.cardPreviewVisible = false;
        this.currentlyPreviewedCharacter = null;
    }

    // Show card preview for character in right sidebar
    showCharacterPreview(character, characterCardsOrFunction, formatCardNameFunction) {
        const characterName = character.name;
        
        // Determine if we received an object or a function
        let cards;
        if (typeof characterCardsOrFunction === 'function') {
            // It's a function - call it with the hero name
            cards = characterCardsOrFunction(characterName);
        } else if (typeof characterCardsOrFunction === 'object') {
            // It's an object - access it like before
            cards = characterCardsOrFunction[characterName];
        } else {
            console.warn(`Invalid characterCards parameter type: ${typeof characterCardsOrFunction}`);
            return;
        }
        
        if (!cards || cards.length === 0) {
            console.warn(`No cards found for character: ${characterName}`);
            return;
        }

        // Check if this character is already being previewed
        if (this.currentlyPreviewedCharacter && this.currentlyPreviewedCharacter.id === character.id) {
            return;
        }

        // Show new character's cards
        this.cardPreviewVisible = true;
        this.currentlyPreviewedCharacter = character;
        
        const previewColumn = document.querySelector('.card-preview-column');
        if (previewColumn) {
            const cardGrid = this.createCardGrid(character, cards, formatCardNameFunction);
            previewColumn.innerHTML = cardGrid;
        }
    }

    // Hide card preview and show placeholder
    hideCardPreview() {
        this.cardPreviewVisible = false;
        this.currentlyPreviewedCharacter = null;
        
        this.hideCardTooltip();
        
        const previewColumn = document.querySelector('.card-preview-column');
        if (previewColumn) {
            previewColumn.innerHTML = `
                <div class="card-preview-placeholder">
                    <div class="preview-icon">🃏</div>
                    <div>Hover over a character to toggle their cards</div>
                </div>
            `;
        }
    }

    // Create 3x3 card grid HTML
    createCardGrid(character, cards, formatCardNameFunction) {
        const characterName = character.name;
        const characterCardPath = `./Cards/Characters/${character.filename}`;
        
        const gridPositions = [
            cards[0] || null,           // Top left
            'CHARACTER_CARD',           // Top middle (character card)
            cards[1] || null,           // Top right
            cards[2] || null,           // Middle left
            cards[3] || null,           // Middle center
            cards[4] || null,           // Middle right
            cards[5] || null,           // Bottom left
            cards[6] || null,           // Bottom center
            cards[7] || null            // Bottom right
        ];

        let gridHTML = `
            <div class="card-preview-content">
                <div class="card-preview-header">
                    <h3>🃏 ${characterName}'s Cards</h3>
                </div>
                <div class="card-grid">
        `;

        gridPositions.forEach((item, index) => {
            if (item === 'CHARACTER_CARD') {
                const cardData = {
                    imagePath: characterCardPath,
                    displayName: characterName,
                    cardType: 'character'
                };
                const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
                
                gridHTML += `
                    <div class="card-slot character-card-slot">
                        <img src="${characterCardPath}" 
                             alt="${characterName}" 
                             class="preview-card character-preview-card"
                             onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                             onmouseleave="window.hideCardTooltip()"
                             onerror="this.src='./Cards/placeholder.png'">
                        <div class="card-name">${characterName}</div>
                    </div>
                `;
            } else if (item) {
                // Normalize the card name to camelCase for the file path
                const normalizedCardName = this.normalizeCardName(item);
                const cardPath = `./Cards/All/${normalizedCardName}.png`;
                const cardDisplayName = formatCardNameFunction(item);
                const cardData = {
                    imagePath: cardPath,
                    displayName: cardDisplayName,
                    cardType: 'ability'
                };
                const cardDataJson = JSON.stringify(cardData).replace(/"/g, '&quot;');
                
                gridHTML += `
                    <div class="card-slot">
                        <img src="${cardPath}" 
                             alt="${cardDisplayName}" 
                             class="preview-card"
                             onmouseenter="window.showCardTooltip('${cardDataJson}', this)"
                             onmouseleave="window.hideCardTooltip()"
                             onerror="this.src='./Cards/placeholder.png'">
                        <div class="card-name">${cardDisplayName}</div>
                    </div>
                `;
            } else {
                gridHTML += `
                    <div class="card-slot empty-slot">
                        <div class="empty-card">Empty</div>
                    </div>
                `;
            }
        });

        gridHTML += `
                </div>
            </div>
        `;

        return gridHTML;
    }

    // Get current preview state
    isPreviewVisible() {
        return this.cardPreviewVisible;
    }

    getCurrentlyPreviewedCharacter() {
        return this.currentlyPreviewedCharacter;
    }

    // Reset to initial state
    reset() {
        this.clearAllTooltips();
        this.hideCardPreview();
    }
}