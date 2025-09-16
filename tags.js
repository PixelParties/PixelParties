// tags.js - Generic tag display system for cards

export class TagsManager {
    constructor() {
        // Color scheme for different tag categories
        this.tagColorMap = {
            // Combat/Damage tags
            'Attacker': '#e74c3c',
            'Damage Dealer': '#c0392b', 
            'Burst Damage': '#e67e22',
            'Area Damage': '#d35400',
            'Damage Over Time': '#8e44ad',
            'Sniper': '#2c3e50',
            
            // Support/Utility tags
            'Support': '#27ae60',
            'Defense': '#16a085',
            'Setup': '#3498db',
            'Card Draw': '#2980b9',
            'Healing': '#1abc9c',
            
            // Summoning/Creatures tags
            'Summoner': '#f39c12',
            'Creature Spam': '#e67e22',
            
            // Economic tags
            'Gold Generation': '#f1c40f',
            'Gold Gain': '#f39c12',
            'Stealing': '#9b59b6',
            'Potions': '#e91e63',
            
            // Value/Quality tags
            'High-Value': '#ffd700',
            'Random': '#9c27b0',
            
            // Status/Control tags
            'Status Effects': '#8e44ad',
            'Incapacitation': '#9b59b6',
            'Disruption': '#e91e63',
            
            // NEW: Timing/Power Curve tags
            'Late Game Scaling': '#6b46c1',  // Deep purple for long-term growth
            'Strong Early': '#f97316'       // Bright orange for immediate impact
        };
        
        // Default color for unrecognized tags
        this.defaultTagColor = '#7f8c8d';
        
        this.stylesInitialized = false;
    }

    /**
     * Get tags for any card using the existing card database
     * @param {string} cardName - Name of the card
     * @returns {Array} Array of tag strings
     */
    async getCardTags(cardName) {
        // Use direct access if available (set by heroSelection)
        if (this.getCardInfo) {
            const cardInfo = this.getCardInfo(cardName);
            return cardInfo?.tags || [];
        }
        
        // Use existing infrastructure to get card info
        if (window.heroSelection && window.heroSelection.getCardInfo) {
            const cardInfo = window.heroSelection.getCardInfo(cardName);
            return cardInfo?.tags || [];
        }
        
        // Try to import cardDatabase directly (ES6 modules)
        try {
            const { getCardInfo } = await import('./cardDatabase.js');
            const cardInfo = getCardInfo(cardName);
            return cardInfo?.tags || [];
        } catch (error) {
            console.warn('Could not access card database for tags:', error);
            return [];
        }
    }

    /**
     * Create HTML for displaying all tags of a card
     * @param {string} cardName - Name of the card
     * @param {Object} options - Display options
     * @param {string} options.size - 'small', 'medium', or 'large'
     * @param {string} options.layout - 'horizontal' or 'vertical'
     * @param {boolean} options.animated - Whether to include animations
     * @returns {string} HTML string for the tags container
     */
    createTagsHTML(cardName, options = {}) {
        // For characters, we can hardcode the tags or use a sync lookup
        const characterTags = this.getCharacterTagsSync(cardName);
        
        if (!characterTags || characterTags.length === 0) {
            return '';
        }

        this.initializeStyles();

        const {
            size = 'medium',
            layout = 'horizontal',
            animated = true
        } = options;

        const containerClass = `card-tags-container ${layout} ${size} ${animated ? 'animated' : ''}`;
        
        const tagsHTML = characterTags.map((tag, index) => 
            this.createSingleTagHTML(tag, { ...options, animationDelay: index * 100 })
        ).join('');

        return `
            <div class="${containerClass}">
                ${tagsHTML}
            </div>
        `;
    }

    // Add sync character tags lookup
    getCharacterTagsSync(cardName) {
        // Since this is for character selection, we can define character tags directly
        const characterTagsMap = {
            'Alice': ['Summoner', 'Damage Dealer', 'Card Draw'],
            'Beato': ['High-Value', 'Random', 'Card Draw'],
            'Cecilia': ['Attacker', 'Gold Generation', 'Damage Dealer'],
            'Darge': ['Attacker', 'Sniper', 'Damage Dealer'],
            'Gon': ['Support', 'Disruption', 'Status Effects'],
            'Heinz': ['Setup', 'Summoner', 'Card Draw', 'Late Game Scaling'],
            'Ida': ['Damage Dealer', 'Area Damage', 'Status Effects'],
            'Kazena': ['Card Draw', 'Support', 'Setup'],
            'Kyli': ['Summoner', 'Setup', 'Attacker', 'Potions', 'Late Game Scaling'],
            'Medea': ['Damage Dealer', 'Status Effects', 'Damage Over Time'],
            'Monia': ['Defense', 'Support', 'Attacker'],
            'Nicolas': ['Support', 'Card Draw', 'Potions', 'Strong Early'],
            'Nomu': ['Support', 'Card Draw', 'Defense'],
            'Semi': ['Support', 'Gold Generation', 'Card Draw'],
            'Sid': ['Support', 'Disruption', 'Card Draw'],
            'Tharx': ['Defense', 'Summoner', 'Support'],
            'Toras': ['Attacker', 'Burst Damage', 'Damage Dealer', 'Strong Early'],
            'Vacarn': ['Summoner', 'Creature Spam', 'Disruption'],
            'Waflav': ['Attacker', 'Damage Dealer', 'Late Game Scaling']
        };
        
        return characterTagsMap[cardName] || [];
    }

    /**
     * Create HTML for a single tag
     * @param {string} tagText - The tag text
     * @param {Object} options - Display options
     * @returns {string} HTML string for the tag
     */
    createSingleTagHTML(tagText, options = {}) {
        const { 
            size = 'medium',
            animated = true,
            animationDelay = 0
        } = options;

        const tagClass = this.getTagClass(tagText);
        const tagColor = this.getTagColor(tagText);
        const sizeClass = `tag-${size}`;
        const animatedClass = animated ? 'tag-animated' : '';
        
        // Get appropriate emoji for the tag
        const emoji = this.getTagEmoji(tagText);
        const displayText = emoji ? `${emoji} ${tagText}` : tagText;
        
        const style = `
            background-color: ${tagColor};
            ${animated ? `animation-delay: ${animationDelay}ms;` : ''}
        `;

        return `
            <span class="card-tag ${tagClass} ${sizeClass} ${animatedClass}" 
                style="${style}"
                data-tag="${tagText}"
                title="${tagText}">
                ${displayText}
            </span>
        `;
    }

    /**
     * Get appropriate emoji for a tag
     * @param {string} tagText - The tag text
     * @returns {string} Emoji for the tag
     */
    getTagEmoji(tagText) {
        const emojiMap = {
            // Combat/Damage tags
            'Attacker': '⚔️',
            'Damage Dealer': '💥',
            'Burst Damage': '🔥',
            'Area Damage': '💣',
            'Damage Over Time': '🩸',
            'Sniper': '🎯',
            
            // Support/Utility tags
            'Support': '🛡️',
            'Defense': '🏰',
            'Setup': '🔧',
            'Card Draw': '📚',
            'Healing': '❤️',
            
            // Summoning/Creatures tags
            'Summoner': '🌟',
            'Creature Spam': '🐾',
            
            // Economic tags
            'Gold Generation': '💰',
            'Gold Gain': '🪙',
            'Stealing': '🔓',
            'Potions': '🧪',
            
            // Value/Quality tags
            'High-Value': '💎',
            'Random': '🎲',
            
            // Status/Control tags
            'Status Effects': '✨',
            'Incapacitation': '😵',
            'Disruption': '⚡',
            
            // NEW: Timing/Power Curve tags
            'Late Game Scaling': '📈',  // Chart showing growth over time
            'Strong Early': '🌅'       // Sunrise representing early advantage
        };
        
        return emojiMap[tagText] || '';
    }

    /**
     * Get CSS class name for a tag
     * @param {string} tagText - The tag text
     * @returns {string} CSS class name
     */
    getTagClass(tagText) {
        return `tag-${tagText.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    }

    /**
     * Get color for a tag
     * @param {string} tagText - The tag text
     * @returns {string} Hex color code
     */
    getTagColor(tagText) {
        return this.tagColorMap[tagText] || this.defaultTagColor;
    }

    /**
     * Initialize CSS styles for tags (only once)
     */
    initializeStyles() {
        if (this.stylesInitialized || typeof document === 'undefined') {
            return;
        }

        // Check if styles already exist
        if (document.getElementById('cardTagsStyles')) {
            this.stylesInitialized = true;
            return;
        }

        const styleSheet = document.createElement('style');
        styleSheet.id = 'cardTagsStyles';
        styleSheet.textContent = this.getTagsCSS();
        document.head.appendChild(styleSheet);
        
        this.stylesInitialized = true;
    }

    /**
     * Get the CSS styles for tags
     * @returns {string} CSS string
     */
    getTagsCSS() {
        return `
            /* Card Tags Container */
            .card-tags-container {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                margin-top: 8px;
                padding: 0 4px;
            }

            .card-tags-container.horizontal {
                flex-direction: row;
            }

            .card-tags-container.vertical {
                flex-direction: column;
                align-items: stretch;
            }

            .card-tags-container.small {
                gap: 2px;
                margin-top: 4px;
            }

            .card-tags-container.large {
                gap: 6px;
                margin-top: 12px;
            }

            /* Individual Tag Styling */
            .card-tag {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-family: 'Pixel Intv', 'Courier New', monospace, sans-serif;
                font-weight: bold;
                color: white;
                text-align: center;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
                border: 1px solid rgba(255, 255, 255, 0.3);
                box-shadow: 
                    0 2px 4px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
                cursor: default;
                user-select: none;
                transition: all 0.2s ease;
                white-space: nowrap;
                
                /* Uniform sizing - sized for longest tag "Damage Over Time" */
                min-width: 140px;
                max-width: 140px;
                font-size: 11px;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Size variants */
            .card-tag.tag-small {
                min-width: 120px;
                max-width: 120px;
                padding: 3px 6px;
                font-size: 10px;
                border-radius: 10px;
            }

            .card-tag.tag-large {
                min-width: 160px;
                max-width: 160px;
                padding: 6px 12px;
                font-size: 12px;
                border-radius: 14px;
            }

            /* Hover effects */
            .card-tag:hover {
                transform: translateY(-1px) scale(1.05);
                box-shadow: 
                    0 4px 8px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
                border-color: rgba(255, 255, 255, 0.5);
            }

            /* Animation for tags */
            .card-tag.tag-animated {
                opacity: 0;
                transform: translateY(10px) scale(0.8);
                animation: tagFadeIn 0.4s ease-out forwards;
            }

            @keyframes tagFadeIn {
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            /* Pulsing animation for special emphasis */
            @keyframes tagPulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.05);
                }
            }

            .card-tag.tag-pulse {
                animation: tagPulse 2s ease-in-out infinite;
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .card-tag {
                    min-width: 100px;
                    max-width: 100px;
                    font-size: 10px;
                    padding: 3px 6px;
                }

                .card-tag.tag-small {
                    min-width: 80px;
                    max-width: 80px;
                    font-size: 9px;
                }

                .card-tag.tag-large {
                    min-width: 120px;
                    max-width: 120px;
                    font-size: 11px;
                }

                .card-tags-container {
                    gap: 3px;
                    margin-top: 6px;
                }
            }

            @media (max-width: 480px) {
                .card-tag {
                    min-width: 90px;
                    max-width: 90px;
                    font-size: 9px;
                    padding: 2px 4px;
                }
            }

            /* Special tag type styling - can be extended */
            .card-tag.tag-damage-dealer {
                background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
            }

            .card-tag.tag-summoner {
                background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%);
            }

            .card-tag.tag-support {
                background: linear-gradient(135deg, #16a085 0%, #27ae60 100%);
            }

            .card-tag.tag-attacker {
                background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
            }

            /* NEW: Special styling for power curve tags */
            .card-tag.tag-late-game-scaling {
                background: linear-gradient(135deg, #6b46c1 0%, #8b5cf6 100%);
                position: relative;
                overflow: hidden;
            }

            .card-tag.tag-late-game-scaling::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                animation: lateGameShimmer 3s ease-in-out infinite;
            }

            .card-tag.tag-strong-early {
                background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
                animation: earlyGamePulse 2s ease-in-out infinite;
            }

            /* Animations for new tags */
            @keyframes lateGameShimmer {
                0%, 100% {
                    left: -100%;
                }
                50% {
                    left: 100%;
                }
            }

            @keyframes earlyGamePulse {
                0%, 100% {
                    box-shadow: 
                        0 2px 4px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
                }
                50% {
                    box-shadow: 
                        0 4px 12px rgba(249, 115, 22, 0.6),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3);
                }
            }

            /* Accessibility improvements */
            .card-tag:focus {
                outline: 2px solid rgba(255, 255, 255, 0.8);
                outline-offset: 2px;
            }

            /* Print styles */
            @media print {
                .card-tag {
                    color: black !important;
                    background: white !important;
                    border: 1px solid black !important;
                    box-shadow: none !important;
                    text-shadow: none !important;
                }
            }
        `;
    }

    /**
     * Add tags to an existing character card element
     * @param {HTMLElement} cardElement - The character card element
     * @param {string} cardName - Name of the card
     * @param {Object} options - Display options
     */
    addTagsToElement(cardElement, cardName, options = {}) {
        if (!cardElement) return;

        const tagsHTML = this.createTagsHTML(cardName, options);
        if (!tagsHTML) return;

        // Find a good place to insert the tags (after character name or at end)
        const characterName = cardElement.querySelector('.character-name');
        if (characterName) {
            characterName.insertAdjacentHTML('afterend', tagsHTML);
        } else {
            cardElement.insertAdjacentHTML('beforeend', tagsHTML);
        }
    }

    /**
     * Remove tags from a character card element
     * @param {HTMLElement} cardElement - The character card element
     */
    removeTagsFromElement(cardElement) {
        if (!cardElement) return;

        const tagsContainer = cardElement.querySelector('.card-tags-container');
        if (tagsContainer) {
            tagsContainer.remove();
        }
    }

    /**
     * Update tags on an existing element
     * @param {HTMLElement} cardElement - The character card element
     * @param {string} cardName - Name of the card
     * @param {Object} options - Display options
     */
    updateTagsOnElement(cardElement, cardName, options = {}) {
        this.removeTagsFromElement(cardElement);
        this.addTagsToElement(cardElement, cardName, options);
    }
}

// Create singleton instance
export const tagsManager = new TagsManager();

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.tagsManager = tagsManager;
}

export default tagsManager;