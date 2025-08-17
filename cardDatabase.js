// cardDatabase.js - Comprehensive Card Information Database

// Card database containing all card information
const CARD_DATABASE = {
    // HERO CARDS
    'Alice': {
        name: 'Alice',
        image: './Cards/Characters/Alice.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 30,
        ability1: 'DestructionMagic',
        ability2: 'SummoningMagic'
    },
    'Cecilia': {
        name: 'Cecilia',
        image: './Cards/Characters/Cecilia.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 80,
        ability1: 'Navigation',
        ability2: 'Wealth'
    },
    'Darge': {
        name: 'Darge',
        image: './Cards/Characters/Darge.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 350,
        atk: 80,
        ability1: 'Adventurousness',
        ability2: 'Fighting'
    },
    'Gon': {
        name: 'Gon',
        image: './Cards/Characters/Gon.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 40,
        ability1: 'DecayMagic',
        ability2: 'Resistance'
    },
    'Ida': {
        name: 'Ida',
        image: './Cards/Characters/Ida.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 40,
        ability1: 'DestructionMagic',
        ability2: 'DestructionMagic'
    },
    'Medea': {
        name: 'Medea',
        image: './Cards/Characters/Medea.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 40,
        ability1: 'Alchemy',
        ability2: 'DecayMagic'
    },
    'Monia': {
        name: 'Monia',
        image: './Cards/Characters/Monia.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 40,
        ability1: 'Charme',
        ability2: 'Fighting'
    },
    'Nicolas': {
        name: 'Nicolas',
        image: './Cards/Characters/Nicolas.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 40,
        ability1: 'Alchemy',
        ability2: 'Alchemy'
    },
    'Semi': {
        name: 'Semi',
        image: './Cards/Characters/Semi.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 80,
        ability1: 'Adventurousness',
        ability2: 'Adventurousness'
    },
    'Sid': {
        name: 'Sid',
        image: './Cards/Characters/Sid.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 50,
        ability1: 'Thieving',
        ability2: 'Thieving'
    },
    'Tharx': {
        name: 'Tharx',
        image: './Cards/Characters/Tharx.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 450,
        atk: 50,
        ability1: 'Leadership',
        ability2: 'Leadership'
    },
    'Toras': {
        name: 'Toras',
        image: './Cards/Characters/Toras.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 350,
        atk: 120,
        ability1: 'Fighting',
        ability2: 'Fighting'
    },
    'Vacarn': {
        name: 'Vacarn',
        image: './Cards/Characters/Vacarn.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 300,
        atk: 40,
        ability1: 'Leadership',
        ability2: 'Necromancy'
    },

    // CHARACTER-SPECIFIC CARDS - Alice's Cards
    'CrumTheClassPet': {
        name: 'CrumTheClassPet',
        image: './Cards/All/CrumTheClassPet.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 100
    },
    'DestructionMagic': {
        name: 'DestructionMagic',
        image: './Cards/All/DestructionMagic.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Jiggles': {
        name: 'Jiggles',
        image: './Cards/All/Jiggles.png',
        cardType: 'Spell',
        level: 3,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 80
    },
    'LootThePrincess': {
        name: 'LootThePrincess',
        image: './Cards/All/LootThePrincess.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },
    'MoonlightButterfly': {
        name: 'MoonlightButterfly',
        image: './Cards/All/MoonlightButterfly.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 10
    },
    'PhoenixBombardment': {
        name: 'PhoenixBombardment',
        image: './Cards/All/PhoenixBombardment.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null
    },
    'RoyalCorgi': {
        name: 'RoyalCorgi',
        image: './Cards/All/RoyalCorgi.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },
    'SummoningMagic': {
        name: 'SummoningMagic',
        image: './Cards/All/SummoningMagic.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },

    // Cecilia's Cards
    'CrusadersArm-Cannon': {
        name: 'CrusadersArm-Cannon',
        image: './Cards/All/CrusadersArm-Cannon.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'CrusadersCutlass': {
        name: 'CrusadersCutlass',
        image: './Cards/All/CrusadersCutlass.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'CrusadersFlintlock': {
        name: 'CrusadersFlintlock',
        image: './Cards/All/CrusadersFlintlock.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'CrusadersHookshot': {
        name: 'CrusadersHookshot',
        image: './Cards/All/CrusadersHookshot.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'TreasureChest': {
        name: 'TreasureChest',
        image: './Cards/All/TreasureChest.png',
        cardType: 'Artifact',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'WantedPoster': {
        name: 'WantedPoster',
        image: './Cards/All/WantedPoster.png',
        cardType: 'Artifact',
        cost: 5,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'Wealth': {
        name: 'Wealth',
        image: './Cards/All/Wealth.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },

    // Darge's Cards
    'AngelfeatherArrow': {
        name: 'AngelfeatherArrow',
        image: './Cards/All/AngelfeatherArrow.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'BombArrow': {
        name: 'BombArrow',
        image: './Cards/All/BombArrow.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'FlameArrow': {
        name: 'FlameArrow',
        image: './Cards/All/FlameArrow.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'GoldenArrow': {
        name: 'GoldenArrow',
        image: './Cards/All/GoldenArrow.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'PoisonedArrow': {
        name: 'PoisonedArrow',
        image: './Cards/All/PoisonedArrow.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'RacketArrow': {
        name: 'RacketArrow',
        image: './Cards/All/RacketArrow.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'RainbowsArrow': {
        name: 'RainbowsArrow',
        image: './Cards/All/RainbowsArrow.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'RainOfArrows': {
        name: 'RainOfArrows',
        image: './Cards/All/RainOfArrows.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },

    // Gon's Cards
    'BladeOfTheFrostbringer': {
        name: 'BladeOfTheFrostbringer',
        image: './Cards/All/BladeOfTheFrostbringer.png',
        cardType: 'Artifact',
        cost: 5,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'Cold-HeartedYuki-Onna': {
        name: 'Cold-HeartedYuki-Onna',
        image: './Cards/All/Cold-HeartedYuki-Onna.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 1
    },
    'ElixirOfCold': {
        name: 'ElixirOfCold',
        image: './Cards/All/ElixirOfCold.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'FrostRune': {
        name: 'FrostRune',
        image: './Cards/All/FrostRune.png',
        cardType: 'Spell',
        level: 3,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: 'Equip'
    },
    'HeartOfIce': {
        name: 'HeartOfIce',
        image: './Cards/All/HeartOfIce.png',
        cardType: 'Artifact',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'Icebolt': {
        name: 'Icebolt',
        image: './Cards/All/Icebolt.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },
    'IcyGrave': {
        name: 'IcyGrave',
        image: './Cards/All/IcyGrave.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },
    'SnowCannon': {
        name: 'SnowCannon',
        image: './Cards/All/SnowCannon.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: "Permanent"
    },

    // Ida's Cards
    'BottledFlame': {
        name: 'BottledFlame',
        image: './Cards/All/BottledFlame.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'BurningSkeleton': {
        name: 'BurningSkeleton',
        image: './Cards/All/BurningSkeleton.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },
    'Fireball': {
        name: 'Fireball',
        image: './Cards/All/Fireball.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null
    },
    'Fireshield': {
        name: 'Fireshield',
        image: './Cards/All/Fireshield.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: 'Equip'
    },
    'FlameAvalanche': {
        name: 'FlameAvalanche',
        image: './Cards/All/FlameAvalanche.png',
        cardType: 'Spell',
        level: 4,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null
    },
    'MountainTearRiver': {
        name: 'MountainTearRiver',
        image: './Cards/All/MountainTearRiver.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null
    },
    'VampireOnFire': {
        name: 'VampireOnFire',
        image: './Cards/All/VampireOnFire.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null
    },

    // Medea's Cards
    'DecayMagic': {
        name: 'DecayMagic',
        image: './Cards/All/DecayMagic.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'PoisonedMeat': {
        name: 'PoisonedMeat',
        image: './Cards/All/PoisonedMeat.png',
        cardType: 'Artifact',
        cost: 3,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'PoisonedWell': {
        name: 'PoisonedWell',
        image: './Cards/All/PoisonedWell.png',
        cardType: 'Spell',
        level: 3,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },
    'PoisonPollen': {
        name: 'PoisonPollen',
        image: './Cards/All/PoisonPollen.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },
    'PoisonVial': {
        name: 'PoisonVial',
        image: './Cards/All/PoisonVial.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'ToxicFumes': {
        name: 'ToxicFumes',
        image: './Cards/All/ToxicFumes.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },
    'ToxicTrap': {
        name: 'ToxicTrap',
        image: './Cards/All/ToxicTrap.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: 'Equip'
    },
    'VenomInfusion': {
        name: 'VenomInfusion',
        image: './Cards/All/VenomInfusion.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },

    // Monia's Cards
    'CoolCheese': {
        name: 'CoolCheese',
        image: './Cards/All/CoolCheese.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'CoolnessOvercharge': {
        name: 'CoolnessOvercharge',
        image: './Cards/All/CoolnessOvercharge.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: false,
        spellSchool: 'DecayMagic',
        subtype: 'Quick'
    },
    'CoolPresents': {
        name: 'CoolPresents',
        image: './Cards/All/CoolPresents.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'CrashLanding': {
        name: 'CrashLanding',
        image: './Cards/All/CrashLanding.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'GloriousRebirth': {
        name: 'GloriousRebirth',
        image: './Cards/All/GloriousRebirth.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: null
    },
    'LifeSerum': {
        name: 'LifeSerum',
        image: './Cards/All/LifeSerum.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'TrialOfCoolness': {
        name: 'TrialOfCoolness',
        image: './Cards/All/TrialOfCoolness.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: null
    },
    'UltimateDestroyerPunch': {
        name: 'UltimateDestroyerPunch',
        image: './Cards/All/UltimateDestroyerPunch.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },

    // Nicolas's Cards
    'AlchemicJournal': {
        name: 'AlchemicJournal',
        image: './Cards/All/AlchemicJournal.png',
        cardType: 'Artifact',
        cost: 8,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Alchemy': {
        name: 'Alchemy',
        image: './Cards/All/Alchemy.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'BottledLightning': {
        name: 'BottledLightning',
        image: './Cards/All/BottledLightning.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'BoulderInABottle': {
        name: 'BoulderInABottle',
        image: './Cards/All/BoulderInABottle.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'ExperimentalPotion': {
        name: 'ExperimentalPotion',
        image: './Cards/All/ExperimentalPotion.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MonsterInABottle': {
        name: 'MonsterInABottle',
        image: './Cards/All/MonsterInABottle.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'PressedSkill': {
        name: 'PressedSkill',
        image: './Cards/All/PressedSkill.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },

    // Semi's Cards
    'Adventurousness': {
        name: 'Adventurousness',
        image: './Cards/All/Adventurousness.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'ElixirOfImmortality': {
        name: 'ElixirOfImmortality',
        image: './Cards/All/ElixirOfImmortality.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'ElixirOfStrength': {
        name: 'ElixirOfStrength',
        image: './Cards/All/ElixirOfStrength.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'HealingMelody': {
        name: 'HealingMelody',
        image: './Cards/All/HealingMelody.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'SupportMagic',
        subtype: null
    },
    'MagneticGlove': {
        name: 'MagneticGlove',
        image: './Cards/All/MagneticGlove.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null,
        exclusive: true
    },
    'Stoneskin': {
        name: 'Stoneskin',
        image: './Cards/All/Stoneskin.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SupportMagic',
        subtype: 'Equip'
    },
    'TreasureHuntersBackpack': {
        name: 'TreasureHuntersBackpack',
        image: './Cards/All/TreasureHuntersBackpack.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null
    },

    // Sid's Cards
    'MagicAmethyst': {
        name: 'MagicAmethyst',
        image: './Cards/All/MagicAmethyst.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicCobalt': {
        name: 'MagicCobalt',
        image: './Cards/All/MagicCobalt.png',
        cardType: 'Artifact',
        cost: 1,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicEmerald': {
        name: 'MagicEmerald',
        image: './Cards/All/MagicEmerald.png',
        cardType: 'Artifact',
        cost: 6,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicRuby': {
        name: 'MagicRuby',
        image: './Cards/All/MagicRuby.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicSapphire': {
        name: 'MagicSapphire',
        image: './Cards/All/MagicSapphire.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicTopaz': {
        name: 'MagicTopaz',
        image: './Cards/All/MagicTopaz.png',
        cardType: 'Artifact',
        cost: 5,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Thieving': {
        name: 'Thieving',
        image: './Cards/All/Thieving.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'ThievingStrike': {
        name: 'ThievingStrike',
        image: './Cards/All/ThievingStrike.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },

    // Tharx's Cards
    'Archer': {
        name: 'Archer',
        image: './Cards/All/Archer.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },
    'Cavalry': {
        name: 'Cavalry',
        image: './Cards/All/Cavalry.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 150
    },
    'Challenge': {
        name: 'Challenge',
        image: './Cards/All/Challenge.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },
    'FieldStandard': {
        name: 'FieldStandard',
        image: './Cards/All/FieldStandard.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: 'Permanent'
    },
    'FrontSoldier': {
        name: 'FrontSoldier',
        image: './Cards/All/FrontSoldier.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },
    'FuriousAnger': {
        name: 'FuriousAnger',
        image: './Cards/All/FuriousAnger.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: 'Reaction'
    },
    'GuardChange': {
        name: 'GuardChange',
        image: './Cards/All/GuardChange.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: false,
        spellSchool: 'MagicArts',
        subtype: 'Quick',
        global: true
    },
    'TharxianHorse': {
        name: 'TharxianHorse',
        image: './Cards/All/TharxianHorse.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'MagicArts',
        subtype: null,
        global: true
    },

    // Toras's Cards
    'HeavyHit': {
        name: 'HeavyHit',
        image: './Cards/All/HeavyHit.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },
    'LegendarySwordOfABarbarianKing': {
        name: 'LegendarySwordOfABarbarianKing',
        image: './Cards/All/LegendarySwordOfABarbarianKing.png',
        cardType: 'Artifact',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'Overheat': {
        name: 'Overheat',
        image: './Cards/All/Overheat.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },
    'SkullmaelsGreatsword': {
        name: 'SkullmaelsGreatsword',
        image: './Cards/All/SkullmaelsGreatsword.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'SwordInABottle': {
        name: 'SwordInABottle',
        image: './Cards/All/SwordInABottle.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'TheMastersSword': {
        name: 'TheMastersSword',
        image: './Cards/All/TheMastersSword.png',
        cardType: 'Artifact',
        cost: 5,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'TheStormblade': {
        name: 'TheStormblade',
        image: './Cards/All/TheStormblade.png',
        cardType: 'Artifact',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'TheSunSword': {
        name: 'TheSunSword',
        image: './Cards/All/TheSunSword.png',
        cardType: 'Artifact',
        cost: 12,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },

    // Vacarn's Cards
    'Leadership': {
        name: 'Leadership',
        image: './Cards/All/Leadership.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Necromancy': {
        name: 'Necromancy',
        image: './Cards/All/Necromancy.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'SkeletonArcher': {
        name: 'SkeletonArcher',
        image: './Cards/All/SkeletonArcher.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },
    'SkeletonBard': {
        name: 'SkeletonBard',
        image: './Cards/All/SkeletonBard.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },
    'SkeletonDeathKnight': {
        name: 'SkeletonDeathKnight',
        image: './Cards/All/SkeletonDeathKnight.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },
    'SkeletonMage': {
        name: 'SkeletonMage',
        image: './Cards/All/SkeletonMage.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },
    'SkeletonNecromancer': {
        name: 'SkeletonNecromancer',
        image: './Cards/All/SkeletonNecromancer.png',
        cardType: 'Spell',
        level: 5,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },
    'SkeletonReaper': {
        name: 'SkeletonReaper',
        image: './Cards/All/SkeletonReaper.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50
    },


    // NEUTRAL CARDS
    'Charme': {
        name: 'Charme',
        image: './Cards/All/Charme.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Diplomacy': {
        name: 'Diplomacy',
        image: './Cards/All/Diplomacy.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Fighting': {
        name: 'Fighting',
        image: './Cards/All/Fighting.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicArts': {
        name: 'MagicArts',
        image: './Cards/All/MagicArts.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Navigation': {
        name: 'Navigation',
        image: './Cards/All/Navigation.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Resistance': {
        name: 'Resistance',
        image: './Cards/All/Resistance.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'SupportMagic': {
        name: 'SupportMagic',
        image: './Cards/All/SupportMagic.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Toughness': {
        name: 'Toughness',
        image: './Cards/All/Toughness.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Iceage': {
        name: 'Iceage',
        image: './Cards/All/Iceage.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },
    'Juice': {
        name: 'Juice',
        image: './Cards/All/Juice.png',
        cardType: 'Artifact',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Permanent'
    },
    'DarkGear': {
        name: 'DarkGear',
        image: './Cards/All/DarkGear.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: "Permanent"
    },
};

/**
 * Get card information by card name
 * @param {string} cardName - The name of the card to look up
 * @returns {Object|null} Card information object or null if not found
 */
export function getCardInfo(cardName) {
    if (!cardName || typeof cardName !== 'string') {
        console.warn('Invalid card name provided to getCardInfo:', cardName);
        return null;
    }

    const cardInfo = CARD_DATABASE[cardName];
    
    if (!cardInfo) {
        console.warn(`Card not found in database: ${cardName}`);
        return null;
    }

    // Base properties that all cards have
    const baseInfo = {
        name: cardInfo.name,
        image: cardInfo.image,
        cardType: cardInfo.cardType,
        cost: cardInfo.cost,
        action: cardInfo.action,
        spellSchool: cardInfo.spellSchool,
        subtype: cardInfo.subtype
    };
    
    // Only add level if it exists (for spell cards)
    if (cardInfo.level !== undefined) {
        baseInfo.level = cardInfo.level;
    }
    
    // Only add hp if it exists (for spell cards)
    if (cardInfo.hp !== undefined) {
        baseInfo.hp = cardInfo.hp;
    }
    
    // Only add global if it exists (for spell cards)
    if (cardInfo.global !== undefined) {
        baseInfo.global = cardInfo.global;
    }
    
    // Only add exclusive if it exists (for spell cards)
    if (cardInfo.exclusive !== undefined) {
        baseInfo.exclusive = cardInfo.exclusive;
    }

    // Add hero-specific properties if this is a hero card
    if (cardInfo.cardType === 'hero') {
        baseInfo.hp = cardInfo.hp;
        baseInfo.atk = cardInfo.atk;
        baseInfo.ability1 = cardInfo.ability1;
        baseInfo.ability2 = cardInfo.ability2;
    }

    return baseInfo;
}

/**
 * Get all available card names
 * @returns {string[]} Array of all card names in the database
 */
export function getAllCardNames() {
    return Object.keys(CARD_DATABASE);
}

/**
 * Check if a card exists in the database
 * @param {string} cardName - The name of the card to check
 * @returns {boolean} True if card exists, false otherwise
 */
export function cardExists(cardName) {
    return CARD_DATABASE.hasOwnProperty(cardName);
}

/**
 * Get multiple cards' information at once
 * @param {string[]} cardNames - Array of card names to look up
 * @returns {Object[]} Array of card information objects (null for cards not found)
 */
export function getMultipleCardInfo(cardNames) {
    if (!Array.isArray(cardNames)) {
        console.warn('getMultipleCardInfo expects an array of card names');
        return [];
    }

    return cardNames.map(cardName => getCardInfo(cardName));
}

/**
 * Get cards by type
 * @param {string} cardType - The type of cards to filter by
 * @returns {Object[]} Array of card information objects matching the type
 */
export function getCardsByType(cardType) {
    return Object.values(CARD_DATABASE)
        .filter(card => card.cardType === cardType)
        .map(card => ({ ...card })); // Return copies
}

/**
 * Get cards by spell school
 * @param {string} spellSchool - The spell school to filter by
 * @returns {Object[]} Array of card information objects matching the spell school
 */
export function getCardsBySpellSchool(spellSchool) {
    return Object.values(CARD_DATABASE)
        .filter(card => card.spellSchool === spellSchool)
        .map(card => ({ ...card })); // Return copies
}

/**
 * Get cards by subtype
 * @param {string} subtype - The subtype to filter by
 * @returns {Object[]} Array of card information objects matching the subtype
 */
export function getCardsBySubtype(subtype) {
    return Object.values(CARD_DATABASE)
        .filter(card => card.subtype === subtype)
        .map(card => ({ ...card })); // Return copies
}

/**
 * Get all hero cards
 * @returns {Object[]} Array of all hero card information objects
 */
export function getAllHeroes() {
    return Object.values(CARD_DATABASE)
        .filter(card => card.cardType === 'hero')
        .map(card => ({ ...card })); // Return copies
}

/**
 * Get all non-hero cards (ability cards)
 * @returns {Object[]} Array of all non-hero card information objects
 */
export function getAllAbilityCards() {
    return Object.values(CARD_DATABASE)
        .filter(card => card.cardType !== 'hero')
        .map(card => ({ ...card })); // Return copies
}

/**
 * Check if a card is a hero
 * @param {string} cardName - The name of the card to check
 * @returns {boolean} True if card is a hero, false otherwise
 */
export function isHero(cardName) {
    const cardInfo = CARD_DATABASE[cardName];
    return cardInfo && cardInfo.cardType === 'hero';
}

/**
 * Get hero by name (convenience function)
 * @param {string} heroName - The name of the hero to look up
 * @returns {Object|null} Hero information object or null if not found/not a hero
 */
export function getHeroInfo(heroName) {
    const cardInfo = getCardInfo(heroName);
    return (cardInfo && cardInfo.cardType === 'hero') ? cardInfo : null;
}

/**
 * Get database statistics
 * @returns {Object} Statistics about the card database
 */
export function getDatabaseStats() {
    const cards = Object.values(CARD_DATABASE);
    const heroes = cards.filter(card => card.cardType === 'hero');
    const abilityCards = cards.filter(card => card.cardType !== 'hero');
    const types = [...new Set(cards.map(card => card.cardType))];
    const spellSchools = [...new Set(cards.map(card => card.spellSchool))];
    const subtypes = [...new Set(cards.map(card => card.subtype))];
    const costs = [...new Set(cards.map(card => card.cost))];
    
    return {
        totalCards: cards.length,
        totalHeroes: heroes.length,
        totalAbilityCards: abilityCards.length,
        uniqueTypes: types.length,
        types: types,
        uniqueSpellSchools: spellSchools.length,
        spellSchools: spellSchools,
        uniqueSubtypes: subtypes.length,
        subtypes: subtypes,
        costs: costs,
        actionCards: cards.filter(card => card.action).length,
        nonActionCards: cards.filter(card => !card.action).length,
        heroNames: heroes.map(hero => hero.name)
    };
}

// Log database initialization
const initStats = Object.keys(CARD_DATABASE).length;
const heroCount = Object.values(CARD_DATABASE).filter(card => card.cardType === 'hero').length;
const abilityCount = initStats - heroCount;

// Export the database for debugging purposes (read-only)
export const CARD_DB_DEBUG = Object.freeze(CARD_DATABASE);