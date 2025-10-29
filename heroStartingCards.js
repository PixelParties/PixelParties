// heroStartingCards.js - Centralized database of hero starting card sets

/**
 * Database mapping hero names to their starting card sets
 * This is the single source of truth for which cards belong to which heroes
 */
const HERO_CARD_SETS = {
    'Alice': ['CrumTheClassPet', 'DestructionMagic', 'Jiggles', 'GrinningCat', 'MoonlightButterfly', 'PhoenixBombardment', 'RoyalCorgi', 'SummoningMagic'],
    'Beato': ['MagicArts', 'ButterflyCloud', 'DivineGiftOfMagic', 'CreateIllusion', 'AntiMagicShield', 'AuroraBorealis', 'MoonlightButterfly', 'MagicLamp'],
    'Carris': ['Divinity', 'Premonition', 'BigGwen', 'TheHandsOfBigGwen', 'HatOfMadness', 'Haste', 'Slow', 'DivineGiftOfTime'],
    'Cecilia': ['CrusadersArm-Cannon', 'CrusadersCutlass', 'CrusadersFlintlock', 'CrusadersHookshot', 'Leadership', 'Navigation', 'WantedPoster', 'Wealth'],
    'Darge': ['Fighting', 'AngelfeatherArrow', 'BombArrow', 'FlameArrow', 'GoldenArrow', 'PoisonedArrow', 'RainbowsArrow', 'RainOfArrows'],
    'Gabby': ['Navigation', 'AntiIntruderSystem', 'FireBomb', 'ForcefulRevival', 'Infighting', 'Shipwrecked', 'RescueMission', 'Expedition'],
    'Ghuanjun': ['Fighting', 'Necromancy', 'BlowOfTheVenomSnake', 'FerociousTigerKick', 'StrongOxHeadbutt', 'GraveyardOfLimitedPower', 'SkullNecklace', 'PunchInTheBox'],
    'Gon': ['DecayMagic', 'BladeOfTheFrostbringer', 'ElixirOfCold', 'Cold-HeartedYuki-Onna', 'HeartOfIce', 'Icebolt', 'IcyGrave', 'SnowCannon'],
    'Heinz': ['Inventing', 'FutureTechDrone', 'FutureTechMech', 'AncientTechInfiniteEnergyCore', 'BirthdayPresent', 'FutureTechCopyDevice', 'FutureTechFists', 'FutureTechLamp'],
    'Ida': ['BottledFlame', 'BurningFinger',  'DestructionMagic', 'Fireball', 'Fireshield', 'FlameAvalanche', 'MountainTearRiver', 'VampireOnFire'],
    'Kazena': ['Adventurousness',  'SupportMagic', 'GatheringStorm', 'Haste', 'CloudPillow', 'StormRing', 'CloudInABottle', 'ElixirOfQuickness'],
    'Kyli': ['Biomancy',  'Occultism', 'MonsterInABottle', 'OverflowingChalice', 'BloodSoakedCoin', 'DoomClock', 'GraveWorm', 'TheRootOfAllEvil'],
    'Luna': ['DestructionMagic',  'Friendship', 'TearingMountain', 'MountainTearRiver', 'LunaKiai', 'PriestOfLuna', 'HeartOfTheMountain', 'DichotomyOfLunaAndTempeste'],
    'Mary': ['Charme',  'Leadership', 'CuteBird', 'CutePhoenix', 'PhoenixTackle', 'VictoryPhoenixCannon', 'CuteCrown', 'PinkSky'],
    'Medea': ['DecayMagic', 'PoisonedMeat', 'PoisonedWell', 'PoisonPollen', 'PoisonVial', 'ToxicFumes', 'ToxicTrap', 'VenomInfusion'],
    'Monia': ['CoolCheese', 'CoolnessOvercharge', 'CoolPresents', 'CrashLanding', 'GloriousRebirth', 'LifeSerum', 'TrialOfCoolness', 'UltimateDestroyerPunch'],
    'Nao': ['Friendship', 'SupportMagic', 'Heal', 'HealingMelody', 'Cure', 'HealingPotion', 'HolyCheese', 'ShieldOfLife'],
    'Nicolas': ['AlchemicJournal', 'Alchemy', 'BottledFlame', 'BottledLightning', 'BoulderInABottle', 'ExperimentalPotion', 'MonsterInABottle', 'AcidVial'],
    'Nomu': ['MagicArts', 'Training', 'Teleport', 'Teleportal', 'StaffOfTheTeleporter', 'TeleportationPowder', 'PlanetInABottle', 'SpatialCrevice'],
    'Semi': ['Adventurousness', 'ElixirOfImmortality', 'Wheels', 'HealingMelody', 'MagneticGlove', 'Stoneskin', 'TreasureChest', 'TreasureHuntersBackpack'],
    'Sid': ['MagicAmethyst', 'MagicCobalt', 'MagicEmerald', 'MagicRuby', 'MagicSapphire', 'MagicTopaz', 'Thieving', 'ThievingStrike'],
    'Tharx': ['Leadership', 'Archer', 'Cavalry', 'FieldStandard', 'FrontSoldier', 'FuriousAnger', 'GuardChange', 'TharxianHorse'],
    'Thep': ['SoulShardBa', 'SoulShardIb', 'SoulShardKa', 'SoulShardKhet', 'SoulShardRen', 'SoulShardSah', 'SoulShardSekhem', 'SoulShardShut'],
    'Toras': ['Fighting', 'HeavyHit', 'LegendarySwordOfABarbarianKing', 'SkullmaelsGreatsword', 'SwordInABottle', 'TheMastersSword', 'TheStormblade', 'TheSunSword'],
    'Vacarn': ['Necromancy', 'SkeletonArcher', 'SkeletonBard', 'SkeletonDeathKnight', 'SkeletonMage', 'SkeletonNecromancer', 'SkeletonReaper', 'SummoningMagic'],
    'Waflav': ['Cannibalism', 'Toughness', 'StormkissedWaflav', 'FlamebathedWaflav', 'ThunderstruckWaflav', 'SwampborneWaflav', 'DeepDrownedWaflav', 'CaptureNet'],
    'ZombieGabby': ['Navigation', 'AntiIntruderSystem', 'FireBomb', 'ForcefulRevival', 'Infighting', 'Shipwrecked', 'RescueMission', 'Expedition'],
};

/**
 * Get the starting card set for a hero
 * @param {string} heroName - Name of the hero
 * @returns {Array<string>} Array of card names, or empty array if hero not found
 */
export function getHeroCards(heroName) {
    return HERO_CARD_SETS[heroName] || [];
}

/**
 * Check if a hero exists in the database
 * @param {string} heroName - Name of the hero
 * @returns {boolean} True if hero exists
 */
export function hasHeroCards(heroName) {
    return heroName in HERO_CARD_SETS;
}

/**
 * Get all hero names
 * @returns {Array<string>} Array of all hero names
 */
export function getAllHeroNames() {
    return Object.keys(HERO_CARD_SETS);
}

/**
 * Get the entire hero card sets database (use sparingly)
 * Returns a reference to the actual object, not a copy, for performance
 * @returns {Object} The hero card sets object
 */
export function getHeroCardSets() {
    return HERO_CARD_SETS;
}

/**
 * Get the number of starting cards for a hero
 * @param {string} heroName - Name of the hero
 * @returns {number} Number of cards, or 0 if hero not found
 */
export function getHeroCardCount(heroName) {
    return (HERO_CARD_SETS[heroName] || []).length;
}