// cardRewardGenerator.js - Card Reward Generation Logic with Monkee Support and Ascended Heroes

import { getAllAbilityCards, getCardInfo } from './cardDatabase.js';

export class CardRewardGenerator {
    constructor() {
        // Cards that should NEVER be offered as rewards
        // To exclude additional cards, simply add their names to this array
        this.excludedCards = [
            'Divinity'
            // Add more card names here as needed
        ];
    }

    /**
     * Generate reward cards with Monkee archetype support and Ascended Heroes
     * @param {Object} deckManager - The deck manager instance
     * @param {Object} playerCounters - Player counters including goldenBananas
     * @param {number} count - Number of cards to generate (default 3)
     * @param {Object} heroSelection - Hero selection manager for checking owned heroes
     * @returns {Array} Array of selected reward cards
     */
    generateRewardCards(deckManager, playerCounters, count = 3, heroSelection = null) {
        const allCards = getAllAbilityCards();
        
        // EXCLUDE FORBIDDEN CARDS - These cards can never be offered as rewards
        const availableCards = allCards.filter(card => 
            !this.excludedCards.includes(card.name) && 
            !card.unobtainable
        );
        
        // Get current deck contents
        const currentDeck = deckManager ? deckManager.getDeck() : [];
        const currentDeckCardNames = currentDeck.map(card => 
            typeof card === 'string' ? card : card.name
        );

        // Check goldenBananas counter
        const goldenBananasCount = playerCounters?.goldenBananas || 0;
        
        // Filter out Monkee cards if goldenBananas is 0
        let filteredCards = availableCards;
        if (goldenBananasCount === 0) {
            filteredCards = availableCards.filter(card => card.archetype !== 'Monkees');
        }

        // Get eligible Ascended Heroes for this player
        const eligibleAscendedHeroes = this.getEligibleAscendedHeroes(heroSelection);

        // Separate cards by type from filtered pool
        const abilityCards = filteredCards.filter(card => card.cardType === 'Ability');
        const spellCards = filteredCards.filter(card => card.cardType === 'Spell');
        const otherCards = filteredCards.filter(card => 
            card.cardType !== 'Ability' && 
            card.cardType !== 'Spell' && 
            card.cardType !== 'hero'
        ); // Artifacts, Potions, etc.

        // Add eligible Ascended Heroes to the "other" pool
        const otherCardsWithAscended = [...otherCards, ...eligibleAscendedHeroes];

        // Separate by whether they're in deck
        const abilityCardsInDeck = abilityCards.filter(card => currentDeckCardNames.includes(card.name));
        const abilityCardsNotInDeck = abilityCards.filter(card => !currentDeckCardNames.includes(card.name));
        
        const spellCardsInDeck = spellCards.filter(card => currentDeckCardNames.includes(card.name));
        const spellCardsNotInDeck = spellCards.filter(card => !currentDeckCardNames.includes(card.name));
        
        const otherCardsInDeck = otherCardsWithAscended.filter(card => currentDeckCardNames.includes(card.name));
        const otherCardsNotInDeck = otherCardsWithAscended.filter(card => !currentDeckCardNames.includes(card.name));

        const rewardCards = [];

        // Check for Monkee bonus if goldenBananas > 0
        let forceMonkeeSpell = false;
        let forceMonkeeOther = false;
        
        if (goldenBananasCount > 0) {
            const monkeeChance = 1 - Math.pow(0.9, goldenBananasCount);
            
            if (Math.random() < monkeeChance) {
                // Randomly decide which slots to force (middle and/or right)
                const forceMiddle = Math.random() < 0.5;
                const forceRight = Math.random() < 0.5;
                
                // Ensure at least one is forced if the chance succeeded
                if (!forceMiddle && !forceRight) {
                    if (Math.random() < 0.5) {
                        forceMonkeeSpell = true;
                    } else {
                        forceMonkeeOther = true;
                    }
                } else {
                    forceMonkeeSpell = forceMiddle;
                    forceMonkeeOther = forceRight;
                }
            }
        }

        // First card: Always an Ability
        const firstCard = this.selectCardByType(abilityCardsInDeck, abilityCardsNotInDeck, 'Ability');
        if (firstCard) {
            rewardCards.push(firstCard);
        }

        // Second card: Spell (possibly forced Monkee)
        let secondCard = null;
        if (forceMonkeeSpell) {
            secondCard = this.selectMonkeeOrGoldenBananas(availableCards, 'Spell');
        }
        if (!secondCard) {
            secondCard = this.selectCardByType(spellCardsInDeck, spellCardsNotInDeck, 'Spell');
        }
        if (secondCard) {
            rewardCards.push(secondCard);
        }

        // Third card: Other (possibly forced Monkee, can include Ascended Heroes)
        let thirdCard = null;
        if (forceMonkeeOther) {
            thirdCard = this.selectMonkeeOrGoldenBananas(availableCards, 'Other');
        }
        if (!thirdCard) {
            thirdCard = this.selectCardByType(otherCardsInDeck, otherCardsNotInDeck, 'Other');
        }
        if (thirdCard) {
            rewardCards.push(thirdCard);
        }

        // Fallback: if we don't have enough cards, fill with random available cards
        while (rewardCards.length < count && filteredCards.length > 0) {
            const randomCard = filteredCards[Math.floor(Math.random() * filteredCards.length)];
            if (!rewardCards.some(card => card.name === randomCard.name)) {
                rewardCards.push(randomCard);
            }
        }

        return rewardCards;
    }

    /**
     * Get Ascended Heroes that the player is eligible for based on owned base heroes
     * @param {Object} heroSelection - Hero selection manager
     * @returns {Array} Array of eligible Ascended Hero cards
     */
    getEligibleAscendedHeroes(heroSelection) {
        if (!heroSelection || !heroSelection.formationManager) {
            return [];
        }

        // Get all heroes in player's formation
        const formation = heroSelection.formationManager.getBattleFormation();
        const ownedHeroNames = ['left', 'center', 'right']
            .map(position => formation[position])
            .filter(hero => hero !== null)
            .map(hero => hero.name);

        // Get all Ascended Heroes from the database
        const allCards = getAllAbilityCards();
        const ascendedHeroes = allCards.filter(card => 
            card.cardType === 'hero' && 
            card.subtype === 'Ascended' &&
            card.baseHero !== undefined
        );

        // Filter to only those whose baseHero is owned
        const eligibleAscended = ascendedHeroes.filter(ascendedHero => 
            ownedHeroNames.includes(ascendedHero.baseHero)
        );

        return eligibleAscended;
    }

    /**
     * Select card based on 1/3 existing, 2/3 new ratio
     * @param {Array} cardsInDeck - Cards already in player's deck
     * @param {Array} cardsNotInDeck - Cards not in player's deck
     * @param {string} typeName - Type name for debugging
     * @returns {Object|null} Selected card or null
     */
    selectCardByType(cardsInDeck, cardsNotInDeck, typeName) {
        // 1/3 chance for existing card, 2/3 chance for new card
        const useExistingCard = Math.random() < (1/3);
        
        let selectedCard = null;
        
        if (useExistingCard && cardsInDeck.length > 0) {
            // Pick random card from deck
            const randomIndex = Math.floor(Math.random() * cardsInDeck.length);
            selectedCard = cardsInDeck[randomIndex];
        } else if (cardsNotInDeck.length > 0) {
            // Pick random card not in deck
            const randomIndex = Math.floor(Math.random() * cardsNotInDeck.length);
            selectedCard = cardsNotInDeck[randomIndex];
        } else if (cardsInDeck.length > 0) {
            // Fallback: pick from existing cards if no new cards available
            const randomIndex = Math.floor(Math.random() * cardsInDeck.length);
            selectedCard = cardsInDeck[randomIndex];
        }
        
        return selectedCard;
    }

    /**
     * Select a Monkee archetype card or GoldenBananas card
     * @param {Array} allCards - All available cards to choose from
     * @param {string} preferredType - Preferred card type ('Spell' or 'Other')
     * @returns {Object|null} Selected Monkee/GoldenBananas card or null
     */
    selectMonkeeOrGoldenBananas(allCards, preferredType) {
        // Get Monkee cards that match the preferred type
        let monkeeCards = allCards.filter(card => 
            card.archetype === 'Monkees' && this.matchesCardType(card, preferredType)
        );
        
        // Get GoldenBananas if it matches the preferred type
        const goldenBananasCard = allCards.find(card => 
            card.name === 'GoldenBananas' && this.matchesCardType(card, preferredType)
        );
        
        // Build eligible cards list
        const eligibleCards = [...monkeeCards];
        if (goldenBananasCard) {
            eligibleCards.push(goldenBananasCard);
        }
        
        // If no cards match the preferred type, try any Monkee cards + GoldenBananas
        if (eligibleCards.length === 0) {
            monkeeCards = allCards.filter(card => card.archetype === 'Monkees');
            const goldenBananas = allCards.find(card => card.name === 'GoldenBananas');
            
            if (monkeeCards.length > 0) {
                eligibleCards.push(...monkeeCards);
            }
            if (goldenBananas) {
                eligibleCards.push(goldenBananas);
            }
        }
        
        if (eligibleCards.length > 0) {
            const randomIndex = Math.floor(Math.random() * eligibleCards.length);
            return eligibleCards[randomIndex];
        }
        
        return null;
    }

    /**
     * Check if a card matches the expected type category
     * @param {Object} card - Card to check
     * @param {string} expectedType - Expected type ('Spell' or 'Other')
     * @returns {boolean} True if card matches the type
     */
    matchesCardType(card, expectedType) {
        if (expectedType === 'Spell') {
            return card.cardType === 'Spell';
        } else if (expectedType === 'Other') {
            return card.cardType !== 'Ability' && 
                   card.cardType !== 'Spell' && 
                   card.cardType !== 'hero';
        }
        return false;
    }
}

export default CardRewardGenerator;