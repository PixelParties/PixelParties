// ./Heroes/toras.js - Toras Hero Special Abilities

/**
 * Calculate Toras's unique equipment attack bonus
 * Toras gains +10 attack for each unique equipment (duplicates don't count)
 * @param {Object} hero - The hero instance
 * @returns {number} The total attack bonus from unique equipment
 */
export function calculateTorasEquipmentBonus(hero) {
    if (!hero || hero.name !== 'Toras') {
        return 0;
    }
    
    // Get all equipment
    const equipment = hero.getEquipment ? hero.getEquipment() : hero.equipment || [];
    
    if (!equipment || equipment.length === 0) {
        return 0;
    }
    
    // Count unique equipment names
    const uniqueEquipmentNames = new Set();
    
    equipment.forEach(item => {
        const itemName = item.name || item.cardName || '';
        if (itemName) {
            uniqueEquipmentNames.add(itemName);
        }
    });
    
    // Calculate bonus: +10 per unique equipment
    const uniqueCount = uniqueEquipmentNames.size;
    const bonus = uniqueCount * 10;
    
    return bonus;
}

/**
 * Get the number of unique equipment pieces
 * @param {Object} hero - The hero instance
 * @returns {number} The number of unique equipment pieces
 */
export function getTorasUniqueEquipmentCount(hero) {
    if (!hero || hero.name !== 'Toras') {
        return 0;
    }
    
    // Get all equipment
    const equipment = hero.getEquipment ? hero.getEquipment() : hero.equipment || [];
    
    if (!equipment || equipment.length === 0) {
        return 0;
    }
    
    // Count unique equipment names
    const uniqueEquipmentNames = new Set();
    
    equipment.forEach(item => {
        const itemName = item.name || item.cardName || '';
        if (itemName) {
            uniqueEquipmentNames.add(itemName);
        }
    });
    
    return uniqueEquipmentNames.size;
}

/**
 * Get a formatted string describing Toras's equipment bonus
 * @param {number} uniqueCount - The number of unique equipment pieces
 * @returns {string} A formatted description string
 */
export function getTorasEquipmentBonusDescription(uniqueCount) {
    if (uniqueCount <= 0) {
        return '';
    }
    
    return `Toras's Mastery (+${uniqueCount * 10} ATK from ${uniqueCount} unique equipment)`;
}

/**
 * Check if a hero is Toras
 * @param {Object} hero - The hero instance or hero data
 * @returns {boolean} True if the hero is Toras
 */
export function isToras(hero) {
    return hero && hero.name === 'Toras';
}