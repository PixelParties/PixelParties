// cardLibrary.js - Card Library screen content and functionality

import { getAllCardNames, getCardInfo } from './cardDatabase.js';

// Card class ordering configuration
const CARD_CLASS_ORDER = [
    { type: 'hero', subtype: null, name: 'Base Heroes' },
    { type: 'hero', subtype: 'Ascended', name: 'Ascended Heroes' },
    { type: 'Ability', name: 'Abilities' },
    { type: 'Spell', spellSchool: 'SummoningMagic', name: 'Summoning Magic' },
    { type: 'Spell', spellSchool: 'DestructionMagic', name: 'Destruction Magic' },
    { type: 'Spell', spellSchool: 'DecayMagic', name: 'Decay Magic' },
    { type: 'Spell', spellSchool: 'SupportMagic', name: 'Support Magic' },
    { type: 'Spell', spellSchool: 'MagicArts', name: 'Magic Arts' },
    { type: 'Spell', spellSchool: 'Fighting', name: 'Fighting' },
    { type: 'Artifact', name: 'Artifacts' },
    { type: 'Potion', name: 'Potions' },
    { type: 'other', name: 'Other Cards' }
];

/**
 * Organize all cards into classes according to the specified order
 * @returns {Array} Array of card classes with their cards
 */
function organizeCards() {
    const allCardNames = getAllCardNames();
    const cardClasses = [];
    
    // Initialize each class
    CARD_CLASS_ORDER.forEach(classConfig => {
        cardClasses.push({
            ...classConfig,
            cards: []
        });
    });
    
    // Categorize each card
    allCardNames.forEach(cardName => {
        const cardInfo = getCardInfo(cardName);
        if (!cardInfo) return;
        
        let assigned = false;
        
        // Check each class in order
        for (const cardClass of cardClasses) {
            if (cardBelongsToClass(cardInfo, cardClass)) {
                cardClass.cards.push(cardInfo);
                assigned = true;
                break;
            }
        }
        
        // If not assigned to any specific class, put in "Other"
        if (!assigned) {
            const otherClass = cardClasses.find(c => c.type === 'other');
            if (otherClass) {
                otherClass.cards.push(cardInfo);
            }
        }
    });
    
    // Sort cards within each class alphabetically
    cardClasses.forEach(cardClass => {
        cardClass.cards.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Filter out empty classes
    return cardClasses.filter(cardClass => cardClass.cards.length > 0);
}

/**
 * Check if a card belongs to a specific class
 * @param {Object} cardInfo - Card information
 * @param {Object} classConfig - Class configuration
 * @returns {boolean} Whether the card belongs to this class
 */
function cardBelongsToClass(cardInfo, classConfig) {
    // Handle "Other" class
    if (classConfig.type === 'other') {
        return false; // Will be handled as fallback
    }
    
    // Check card type
    if (cardInfo.cardType !== classConfig.type) {
        return false;
    }
    
    // For heroes, check subtype
    if (classConfig.type === 'hero') {
        if (classConfig.subtype === null) {
            // Base heroes (no Ascended subtype)
            return !cardInfo.subtype || cardInfo.subtype !== 'Ascended';
        } else {
            // Ascended heroes
            return cardInfo.subtype === classConfig.subtype;
        }
    }
    
    // For spells, check spell school
    if (classConfig.type === 'Spell') {
        return cardInfo.spellSchool === classConfig.spellSchool;
    }
    
    // For other types, just match the type
    return true;
}

/**
 * Generate card wall HTML
 * @param {Array} cardClasses - Organized card classes
 * @returns {string} HTML string for the card wall
 */
function generateCardWallHTML(cardClasses) {
    let html = '';
    
    cardClasses.forEach(cardClass => {
        if (cardClass.cards.length === 0) return;
        
        html += `
            <div class="card-class-section">
                <h3 class="card-class-title">${cardClass.name} (${cardClass.cards.length})</h3>
                <div class="card-wall">
        `;
        
        cardClass.cards.forEach(card => {
            html += `
                <div class="card-wall-item" data-card-name="${card.name}">
                    <img src="${card.image}" alt="${card.name}" class="card-wall-image" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="card-wall-placeholder" style="display: none;">
                        <span class="card-wall-name">${card.name}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    return html;
}

/**
 * Generate the complete card library content
 * @returns {string} Complete HTML for the card library screen
 */
export function generateCardLibraryContent() {
    const cardClasses = organizeCards();
    const totalCards = cardClasses.reduce((sum, cardClass) => sum + cardClass.cards.length, 0);
    
    const headerHTML = `
        <div class="card-library-sticky-header">
            <button id="backFromCardLibraryBtn" class="anchored-back-button">← Back to Main Menu</button>
            <div class="card-library-header">
                <h2 class="card-library-title">📚 Card Library</h2>
                <p class="card-library-subtitle">Browse all ${totalCards} cards in the game</p>
            </div>
        </div>
    `;
    
    const cardWallHTML = generateCardWallHTML(cardClasses);
    
    return `
        ${headerHTML}
        <div class="card-library-scrollable-content">
            ${cardWallHTML}
        </div>
    `;
}

/**
 * Initialize the card library screen
 */
export function initializeCardLibraryScreen() {
    const cardLibraryScreen = document.getElementById('cardLibraryScreen');
    if (!cardLibraryScreen) {
        console.error('Card Library screen element not found');
        return;
    }
    
    // Generate and insert content
    cardLibraryScreen.innerHTML = generateCardLibraryContent();
    
    // Set up event listener for back button
    const backButton = document.getElementById('backFromCardLibraryBtn');
    if (backButton) {
        backButton.addEventListener('click', () => {
            hideCardLibraryScreen();
        });
    }
    
    // Set up card hover tooltips
    setupCardTooltips();
}

/**
 * Set up hover tooltips for cards in the library
 */
function setupCardTooltips() {
    const cardItems = document.querySelectorAll('.card-wall-item');
    
    cardItems.forEach(item => {
        item.addEventListener('mouseenter', (e) => showCardLibraryTooltip(e.currentTarget));
        item.addEventListener('mouseleave', hideCardLibraryTooltip);
    });
}

/**
 * Convert camelCase text to spaced words
 * @param {string} text - The camelCase text to convert
 * @returns {string} Text with spaces between words
 */
function camelCaseToSpaced(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text
        // Insert space before capital letters that follow lowercase letters
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Handle cases like "HTMLParser" -> "HTML Parser"
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
}

/**
 * Show tooltip for a card in the library
 * @param {HTMLElement} cardElement - The card element being hovered
 */
function showCardLibraryTooltip(cardElement) {
    // Remove any existing tooltip
    hideCardLibraryTooltip();
    
    const cardName = cardElement.dataset.cardName;
    const cardInfo = getCardInfo(cardName);
    
    if (!cardInfo) return;
    
    // Create tooltip container
    const tooltip = document.createElement('div');
    tooltip.id = 'cardLibraryTooltip';
    tooltip.style.cssText = `
        position: fixed;
        top: 170px;
        right: 10px;
        z-index: 10000;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #00ffff;
        border-radius: 12px;
        padding: 15px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        max-width: 350px;
        color: white;
    `;
    
    // Create large image
    const largeImg = document.createElement('img');
    largeImg.src = cardInfo.image;
    largeImg.alt = cardInfo.name;
    largeImg.style.cssText = `
        max-width: 352px;
        max-height: 440px;
        object-fit: contain;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        border-radius: 4px;
        display: block;
        margin: 0 auto;
    `;
    
    // Create info section
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'margin-top: 15px; text-align: center;';
    
    let infoHTML = `
        <div style="color: #00ffff; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
            ${camelCaseToSpaced(cardInfo.name)}
        </div>
        <div style="color: #88ccff; font-size: 14px; margin-bottom: 5px;">
            Type: ${cardInfo.cardType}
        </div>
    `;
    
    // Add type-specific information
    if (cardInfo.cardType === 'hero') {
        infoHTML += `
            <div style="color: #ffcc88; font-size: 12px;">
                HP: ${cardInfo.hp} | ATK: ${cardInfo.atk}
            </div>
        `;
        if (cardInfo.subtype) {
            infoHTML += `<div style="color: #ff88cc; font-size: 12px;">Subtype: ${camelCaseToSpaced(cardInfo.subtype)}</div>`;
        }
    } else if (cardInfo.cardType === 'Spell') {
        if (cardInfo.spellSchool) {
            infoHTML += `<div style="color: #ccff88; font-size: 12px;">School: ${camelCaseToSpaced(cardInfo.spellSchool)}</div>`;
        }
        if (cardInfo.level !== undefined) {
            infoHTML += `<div style="color: #ffcc88; font-size: 12px;">Level: ${cardInfo.level}</div>`;
        }
    } else if (cardInfo.cardType === 'Artifact') {
        infoHTML += `<div style="color: #ffcc88; font-size: 12px;">Cost: ${cardInfo.cost} Gold</div>`;
    }
    
    if (cardInfo.subtype && cardInfo.cardType !== 'hero') {
        infoHTML += `<div style="color: #ff88cc; font-size: 12px;">Subtype: ${camelCaseToSpaced(cardInfo.subtype)}</div>`;
    }
    
    infoDiv.innerHTML = infoHTML;
    
    tooltip.appendChild(largeImg);
    tooltip.appendChild(infoDiv);
    document.body.appendChild(tooltip);
}

/**
 * Hide the card library tooltip
 */
function hideCardLibraryTooltip() {
    const existingTooltip = document.getElementById('cardLibraryTooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
}

/**
 * Show the card library screen
 */
export function showCardLibraryScreen() {
    const cardLibraryScreen = document.getElementById('cardLibraryScreen');
    const menu = document.getElementById('menu');
    
    if (cardLibraryScreen && menu) {
        menu.classList.add('hidden');
        cardLibraryScreen.classList.remove('hidden');
        
        // Scroll to top of the scrollable content
        const scrollableContent = cardLibraryScreen.querySelector('.card-library-scrollable-content');
        if (scrollableContent) {
            scrollableContent.scrollTop = 0;
        }
    }
}

/**
 * Hide the card library screen
 */
export function hideCardLibraryScreen() {
    const cardLibraryScreen = document.getElementById('cardLibraryScreen');
    const menu = document.getElementById('menu');
    
    if (cardLibraryScreen && menu) {
        cardLibraryScreen.classList.add('hidden');
        menu.classList.remove('hidden');
    }
    
    // Clean up any tooltips
    hideCardLibraryTooltip();
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCardLibraryScreen);
    } else {
        // DOM already loaded
        initializeCardLibraryScreen();
    }
}