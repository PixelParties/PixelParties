// howToPlayScreen.js - How to Play screen content and functionality

export const HOW_TO_PLAY_CONTENT = {
    header: {
        title: "📖 How to Play",
        subtitle: "Build the superior Hero Party over multiple rounds and battles!"
    },
    sections: [
        {
            id: "victory-conditions",
            icon: "🏆",
            title: "How to Win",
            highlight: {
                label: "Win Condition:",
                text: "First to 10 victories wins the match!"
            },
            items: [
                { label: "Trophies:", text: "Show how many wins you have so far" },
                { label: "Lives:", text: "Show how many wins your opponent still needs" }
            ]
        },
        {
            id: "controls-interface",
            icon: "🎮",
            title: "Controls",
            items: [
                { label: "Ready Button:", text: "Toggle ready status in lobby" },
                { label: "Surrender:", text: "Forfeit the entire game" },
                { label: "Tooltips:", text: "Hover over cards for details" },
                { label: "Click on cards:", text: "Activate certain cards, like Potions or Artifacts/Spells that don't target a Hero" },
                { label: "Drag & Drop:", text: "Play cards, recycle (drop on discard pile), equip (drop on Hero)" },
                { label: "Right-click:", text: "Recycle cards for 2 Gold" }
            ]
        },
        {
            id: "game-flow",
            icon: "🔄",
            title: "Game Flow",
            items: [
                { text: "Choose your first Hero from 3 options. Each Hero brings 8 starting cards." },
                { text: "Play cards in the Formation Screen, then battle when ready." },
                { text: "Battles play out automatically." },
                { text: "After each battle: gain Gold, draw a card, draft 1 from 3 options." },
                { text: "Spend Gold to reroll draft options." },
                { text: "Battle losers earn +2 Gold." },
                { text: "After battles 2 and 4: Draft new Heroes instead of single cards." },
                { text: "New Heroes add their starting cards to your deck." },
                { text: "Right-click cards or drag to discard pile to recycle them for 2 Gold." }
            ],
            highlight: {
                label: "Hand Limit:",
                text: "Maximum 10 cards in hand. Can't draw any more cards while at cap! Drafted cards still go to your deck even when at max."
            }
        },
        {
            id: "heroes-cards",
            icon: "⚔️",
            title: "Heroes",
            content: "Your primary fighters. Each has HP, Attack, 8 starting cards, and 2 starting Abilities. Can be moved and swapped between zones.",
            image: "./Cards/Characters/Monia.png",
            highlight: {
                label: "Important:",
                text: "Press 'T' to make Hero tooltips permanent while hovering over them."
            },
            items: [
                { text: "Heroes have 3 Ability slots for different Abilities." },
                { text: "Can only attach 1 Ability per Hero per turn." },
                { text: "Each individual Ability can be leveled infinitely over the course of the game." }
            ]
        },
        {
            id: "abilities-cards",
            icon: "✨",
            title: "Abilities",
            content: "Permanent (mostly passive) effects for Heroes. Stack multiple copies to level them up infinitely. Effects scale with level.",
            image: "./Cards/All/DestructionMagic.png",
            highlight: {
                label: "Limit:",
                text: "Only 1 Ability can be attached to each Hero per turn."
            }
        },
        {
            id: "spells-cards",
            icon: "🔮",
            title: "Spells",
            content: "Actions Heroes can take. Most Spells cost 1 Action and are learned by dragging onto Heroes.",
            image: "./Cards/All/FlameAvalanche.png",
            highlight: {
                label: "Learning Requirement:",
                text: "Heroes must have the matching Ability at the required level to learn or use Spells out of combat."
            },
            items: [
                { text: "Each Spell has a School and Level requirement." },
                { text: "Heroes have a certain chance to use a learned Spell instead of a basic Attack on their turn in battle (even if the Hero does not have the necessary Ability at the required level)." },
                { text: "The chance is rolled individually per Spell, so more Spells (including copies of the same Spell) increase the overall chance to cast. Higher-level Spells roll first and are more likely." },
                { text: "Learned Spells can be toggled to not be used/deactivated by clicking on them in the Hero's tooltip while hovering over it. This requires the tooltip to have been make permanent with 'T'!" },
                { text: "Magic Arts Spells: Activate directly, not added to Spellbooks." },
                { text: "Summoning Magic: Creates permanent Creatures, not added to Spellbooks." }
            ]
        },
        {
            id: "creatures",
            icon: "🦋",
            title: "Creatures",
            content: "Summoned by 'Summoning Magic' Spells. They remain with your Hero, even if the Hero is moved. Many, but not all Creatures trigger an effect on their turn in combat: Their 'Action:' effect.",
            image: "./Cards/All/MoonlightButterfly.png",
            highlight: {
                label: "Turn Order:",
                text: "All actors in a slot (left, middle, right) act consecutively before the next slot acts."
            }
        },
        {
            id: "artifacts-cards",
            icon: "💎",
            title: "Artifacts",
            content: "One-time use cards that cost Gold to activate. Range from permanent battle buffs to Hero Equipment to one-and-done effects, like drawing cards.",
            image: "./Cards/All/Wheels.png"
        },
        {
            id: "potions-cards",
            icon: "🧪",
            title: "Potions",
            content: "One-time use cards that cost no Gold and auto-draw a replacement card when used.",
            image: "./Cards/All/BottledLightning.png",
            highlight: {
                label: "Auto-Replace:",
                text: "Using a Potion automatically draws a replacement card."
            },
            items: [
                { text: "Limited uses per turn (increase with Alchemy Ability)" }
            ]
        },
        {
            id: "ascended-heroes",
            icon: "🌟",
            title: "Ascended Heroes",
            content: "Evolved forms of Heroes. Drag onto base Hero when conditions are met.",
            image: "./Cards/All/StormkissedWaflav.png",
            highlight: {
                label: "Inheritance:",
                text: "Keeps all Spells, Equips, and Creatures. Replaces base Hero's effect with new one."
            }
        },
        {
            id: "equips-subtype",
            icon: "🛡️",
            title: "Equips",
            content: "Drag onto Heroes for permanent buffs.",
            image: "./Icons/IconEquip.png"
        },
        {
            id: "areas-subtype",
            icon: "🗺️",
            title: "Areas",
            content: "Play in the Area Zone. Affects both players during battle. New Areas replace old ones.",
            image: "./Icons/IconArea.png"
        },
        {
            id: "traps-subtype",
            icon: "🪤",
            title: "Traps",
            content: "Set traps around the user that harm enemies attacking it.",
            image: "./Icons/IconTrap.png"
        },
        {
            id: "quick-subtype",
            icon: "⚡",
            title: "Quick Spells",
            content: "Don't cost Actions. Can be used when no Actions available.",
            image: "./Icons/IconQuick.png"
        },
        {
            id: "resources",
            icon: "💰",
            title: "Resources",
            highlight: {
                label: "Loser Bonus:",
                text: "Battle losers earn +2 Gold (6 total instead of 4)."
            },
            items: [
                { label: "Gold:", text: "Earned after every battle, spent on Artifacts and rerolls. Default 4 Gold per turn, +2 for losing a battle. Many effects generate Gold." },
                { label: "Potions:", text: "Number of Potions you have left to use this turn. By default 1 Potion max per turn, increased with the Alchemy Ability." },
                { label: "Actions:", text: "Spent to use Non-Quick Spells. Usually, you only get 1 per turn." }
            ]
        },
        {
            id: "permanents",
            icon: "📜",
            title: "Permanents",
            content: "Some effects give you permanent boosts for all subsequent battles. A list of what 'Permanent effects' you have active can be seen by hovering over the 📜 icon next to your resources."
        },
    ]
};

export function generateHowToPlayContent() {
    const content = HOW_TO_PLAY_CONTENT;
    
    // Generate header HTML
    const headerHTML = `
        <div class="how-to-play-header">
            <h2 class="how-to-play-title">${content.header.title}</h2>
            <p class="how-to-play-subtitle">${content.header.subtitle}</p>
        </div>
    `;
    
    // Generate sections HTML
    const sectionsHTML = content.sections.map(section => {
        let sectionContent = `
            <div class="guide-section">
                <h3>${section.icon} ${section.title}</h3>
                ${section.image ? `<img src="${section.image}" alt="${section.title} example" class="guide-section-image" onerror="this.style.display='none'">` : ''}
        `;
        
        // Add main content if exists
        if (section.content) {
            sectionContent += `<p>${section.content}</p>`;
        }
        
        // Add highlight box if exists
        if (section.highlight) {
            sectionContent += `
                <div class="highlight-box">
                    <strong>${section.highlight.label}</strong> ${section.highlight.text}
                </div>
            `;
        }
        
        // Add list items if exists
        if (section.items) {
            sectionContent += '<ul>';
            section.items.forEach(item => {
                if (item.label) {
                    sectionContent += `<li><strong>${item.label}</strong> ${item.text}</li>`;
                } else {
                    sectionContent += `<li>${item.text}</li>`;
                }
            });
            sectionContent += '</ul>';
        }
        
        sectionContent += '</div>';
        return sectionContent;
    }).join('');
    
    return `
        <button id="backFromHowToPlayBtn" class="anchored-back-button">← Back to Main Menu</button>
        ${headerHTML}
        <div class="how-to-play-content">
            ${sectionsHTML}
        </div>
    `;
}

export function initializeHowToPlayScreen() {
    const howToPlayScreen = document.getElementById('howToPlayScreen');
    if (!howToPlayScreen) {
        console.error('How to Play screen element not found');
        return;
    }
    
    // Generate and insert content
    howToPlayScreen.innerHTML = generateHowToPlayContent();
    
    // Set up event listener for back button
    const backButton = document.getElementById('backFromHowToPlayBtn');
    if (backButton) {
        backButton.addEventListener('click', () => {
            hideHowToPlayScreen();
        });
    }
    
    // Set up card image tooltips (only for ./Cards images, not ./Icons)
    setupCardImageTooltips();
}

// Add tooltip functionality for card images
function setupCardImageTooltips() {
    const cardImages = document.querySelectorAll('.guide-section-image[src*="/Cards/"]');
    
    cardImages.forEach(img => {
        img.addEventListener('mouseenter', (e) => showCardImageTooltip(e.target));
        img.addEventListener('mouseleave', hideCardImageTooltip);
    });
}

function showCardImageTooltip(imgElement) {
    // Remove any existing tooltip
    hideCardImageTooltip();
    
    // Create tooltip container
    const tooltip = document.createElement('div');
    tooltip.id = 'howToPlayCardTooltip';
    tooltip.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #00ffff;
        border-radius: 12px;
        padding: 15px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        max-width: 350px;
        text-align: center;
    `;
    
    // Create large image
    const largeImg = document.createElement('img');
    largeImg.src = imgElement.src;
    largeImg.alt = imgElement.alt;
    largeImg.style.cssText = `
        max-width: 320px;
        max-height: 400px;
        object-fit: contain;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        border-radius: 8px;
    `;
    
    // Create title
    const title = document.createElement('div');
    title.textContent = imgElement.alt.replace(' example', '');
    title.style.cssText = `
        color: #00ffff;
        font-size: 16px;
        font-weight: bold;
        margin-top: 10px;
        text-shadow: 0 0 5px #00ffff;
    `;
    
    tooltip.appendChild(largeImg);
    tooltip.appendChild(title);
    document.body.appendChild(tooltip);
}

function hideCardImageTooltip() {
    const existingTooltip = document.getElementById('howToPlayCardTooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
}

export function showHowToPlayScreen() {
    const howToPlayScreen = document.getElementById('howToPlayScreen');
    const menu = document.getElementById('menu');
    
    if (howToPlayScreen && menu) {
        menu.classList.add('hidden');
        howToPlayScreen.classList.remove('hidden');
        
        // Scroll to top of the content
        howToPlayScreen.scrollTop = 0;
    }
}

export function hideHowToPlayScreen() {
    const howToPlayScreen = document.getElementById('howToPlayScreen');
    const menu = document.getElementById('menu');
    
    if (howToPlayScreen && menu) {
        howToPlayScreen.classList.add('hidden');
        menu.classList.remove('hidden');
    }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHowToPlayScreen);
    } else {
        // DOM already loaded
        initializeHowToPlayScreen();
    }
}