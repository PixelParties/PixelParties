// howToPlayScreen.js - How to Play screen content and functionality

export const HOW_TO_PLAY_CONTENT = {
    header: {
        title: "📖 How to Play",
        subtitle: "Build the superior Hero Party over many rounds and battles!"
    },
    sections: [
        {
            id: "victory-conditions",
            icon: "🏆",
            title: "How to Win",
            content: "Be the first player to score 10 victories in battle.",
            items: [
                { label: "Trophies:", text: "Show how many wins you have so far" },
                { label: "Lives:", text: "Show how many wins your opponent still needs" }
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
                { text: "Battle losers get +2 Gold." },
                { text: "Maximum 10 cards in hand. Drafted cards still go to your deck." },
                { text: "After battles 2 and 4: Draft new Heroes instead of single cards." },
                { text: "New Heroes add their starting cards to your deck." },
                { text: "Right-click cards or drag to discard pile to Recycle them for 2 Gold." }
            ],
        },
        {
            id: "heroes-cards",
            icon: "⚔️",
            title: "Heroes",
            content: "Your primary fighters. Each has HP, Attack, 8 starting cards, and 2 starting Abilities. Can be moved and swapped between zones.",
            image: "./Cards/Characters/Monia.png",
            items: [
                { text: "Heroes have 3 Ability slots for different Abilities." },
                { text: "Can only attach 1 Ability per Hero per turn." },
                { text: "You can press 'T' to make the Heroes' tooltips permanent while hovering over them." }
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
            items: [
                { text: "Each Spell has a School and Level requirement." },
                { text: "Heroes need matching Ability at required level to learn Spells." },
                { text: "Heroes have a certain chance to use a learned Spell instead of a basic Attack on their turn in battle." },
                { text: "The chance is rolled individually per Spell, so more Spells (including copies of the same Spell) increase the overall chance to cast. Higher-level Spells roll first and are more likely." },
                { text: "Learned Spells can be toggled to not be used/deactivated by clicking on them in the Hero's tooltip while hovering over it." },
                { text: "Magic Arts Spells: Activate directly, not added to Spellbooks." },
                { text: "Summoning Magic: Creates permanent Creatures, not added to Spellbooks." }
            ]
        },
        {
            id: "creatures",
            icon: "🦋",
            title: "Creatures",
            content: "Summoned by 'Summoning Magic' Spells. They remain with your Hero, even if the Hero is moved. In battle, all actors in a given slot (left, middle, right) act consecutively one by one before the next slot acts. Many, but not all Creatures trigger an effect on their turn in combat, their 'Action:'.",
            image: "./Cards/All/MoonlightButterfly.png"
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
            content: "Play in Area Zone. Affects both players during battle. New Areas replace old ones.",
            image: "./Icons/IconArea.png"
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
        {
            id: "getting-started",
            icon: "🚀",
            title: "Getting Started",
            items: [
                { label: "Create Party:", text: "Start new room, wait for opponent" },
                { label: "Browse Battles:", text: "Join existing rooms" },
                { label: "Username:", text: "Set display name others see" },
                { label: "Passwords:", text: "Create private rooms or join protected ones" }
            ]
        },
        {
            id: "controls-interface",
            icon: "🎮",
            title: "Controls",
            items: [
                { label: "Ready Button:", text: "Toggle ready status in lobby" },
                { label: "Surrender:", text: "Forfeit current battle" },
                { label: "Tooltips:", text: "Hover over cards for details" },
                { label: "Click on cards:", text: "Activate certain cards, like Potions or Artifacts/Spells that don't target a Hero" },
                { label: "Drag & Drop:", text: "Play cards, recycle (drop on discard pile), equip (drop on Hero)" },
                { label: "Right-click:", text: "Recycle cards for 2 Gold" }
            ]
        }
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