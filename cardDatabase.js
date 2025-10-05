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
        ability2: 'SummoningMagic',
        tags: ["Summoner", "Damage Dealer", "Card Draw"]
    },
    'Beato': {
        name: 'Beato',
        image: './Cards/Characters/Beato.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 300,
        atk: 30,
        ability1: 'MagicArts',
        ability2: 'MagicArts',
        tags: ["High-Value", "Random", "Card Draw"]
    },
    'Carris': {
        name: 'Carris',
        image: './Cards/Characters/Carris.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 1,
        atk: 60,
        ability1: 'Divinity',
        ability2: 'Premonition',
        tags: ["Multiple Actions", "Extra Turns", "High-Risk"]
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
        ability2: 'Wealth',
        tags: ["Attacker", "Gold Generation", "Damage Dealer"]
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
        ability2: 'Fighting',
        tags: ["Attacker", "Sniper", "Damage Dealer"]
    },
    'Ghuanjun': {
        name: 'Ghuanjun',
        image: './Cards/Characters/Ghuanjun.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 80,
        ability1: 'Fighting',
        ability2: 'Necromancy',
        tags: ["Attacker", "Defensive", "Setup"]
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
        ability2: 'Resistance',
        tags: ["Support", "Disruption", "Status Effects"]
    },
    'Heinz': {
        name: 'Heinz',
        image: './Cards/Characters/Heinz.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 10,
        ability1: 'Inventing',
        ability2: 'Inventing',
        tags: ["Setup", "Summoner", "Card Draw"]
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
        ability2: 'DestructionMagic',
        tags: ["Damage Dealer", "Area Damage", "Status Effects"]
    },
    'Kazena': {
        name: 'Kazena',
        image: './Cards/Characters/Kazena.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 40,
        ability1: 'Adventurousness',
        ability2: 'SupportMagic',
        tags: ["Card Draw", "Support", "Setup"]
    },
    'Kyli': {
        name: 'Kyli',
        image: './Cards/Characters/Kyli.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 40,
        ability1: 'Biomancy',
        ability2: 'Occultism',
        tags: ["Summoner", "Setup", "Attacker"]
    },
    'Luna': {
        name: 'Luna',
        image: './Cards/Characters/Luna.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 300,
        atk: 30,
        ability1: 'DestructionMagic',
        ability2: 'Friendship',
        tags: ["Status Effects", "Area Damage", "Self-Damage"]
    },
    'Mary': {
        name: 'Mary',
        image: './Cards/Characters/Mary.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 250,
        atk: 20,
        ability1: 'Charme',
        ability2: 'Leadership',
        tags: ["Summoner", "Damage Dealer", "Late-Game"]
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
        ability2: 'DecayMagic',
        tags: ["Damage Dealer", "Status Effects", "Damage Over Time"]
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
        ability2: 'Fighting',
        tags: ["Defense", "Support", "Attacker"]
    },
    'Nao': {
        name: 'Nao',
        image: './Cards/Characters/Nao.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 30,
        ability1: 'Friendship',
        ability2: 'SupportMagic',
        tags: ["Defense", "Shield", "Support"]
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
        ability2: 'Alchemy',
        tags: ["Support", "Card Draw", "Potions"]
    },
    'Nomu': {
        name: 'Nomu',
        image: './Cards/Characters/Nomu.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 40,
        ability1: 'MagicArts',
        ability2: 'Training',
        tags: ["Support", "Card Draw", "Defense"]
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
        ability2: 'Adventurousness',
        tags: ["Support", "Gold Gain", "Card Draw"]
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
        ability2: 'Thieving',
        tags: ["Support", "Stealing", "Card Draw"]
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
        ability2: 'Leadership',
        tags: ["Defense", "Summoner", "Support"]
    },
    'Thep': {
        name: 'Thep',
        image: './Cards/Characters/Thep.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 300,
        atk: 30,
        ability1: 'Learning',
        ability2: 'MagicArts',
        tags: ["Summoner", "Utility", "Support"]
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
        ability2: 'Fighting',
        tags: ["Attacker", "Burst Damage", "Damage Dealer"]
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
        ability2: 'Necromancy',
        tags: ["Summoner", "Creature Spam", "Disruption"]
    },
    'Waflav': {
        name: 'Waflav',
        image: './Cards/Characters/Waflav.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null,
        hp: 400,
        atk: 80,
        ability1: 'Cannibalism',
        ability2: 'Toughness',
        tags: ["Attacker", "Damage Dealer", "Disruption"]
    },

    // CHARACTER-SPECIFIC CARDS - Alice's Cards
    'CrumTheClassPet': {
        name: 'CrumTheClassPet',
        image: './Cards/All/CrumTheClassPet.png',
        cardType: 'Spell',
        level: 2,
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
        hp: 80,
        physicalAttack: false
    },
    'GrinningCat': {
        name: 'GrinningCat',
        image: './Cards/All/GrinningCat.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 120,
        physicalAttack: false
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
        hp: 10,
        physicalAttack: false
    },
    'PhoenixBombardment': {
        name: 'PhoenixBombardment',
        image: './Cards/All/PhoenixBombardment.png',
        cardType: 'Spell',
        level: 1,
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
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null,
        aoe: true
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
        hp: 1,
        physicalAttack: false
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
        subtype: 'Trap'
    },
    'HeartOfIce': {
        name: 'HeartOfIce',
        image: './Cards/All/HeartOfIce.png',
        cardType: 'Artifact',
        cost: 4,
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
        hp: 50,
        physicalAttack: true
    },
    'BurningFinger': {
        name: 'BurningFinger',
        image: './Cards/All/BurningFinger.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null
    },
    'Fireball': {
        name: 'Fireball',
        image: './Cards/All/Fireball.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null,
        aoe: true
    },
    'Fireshield': {
        name: 'Fireshield',
        image: './Cards/All/Fireshield.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: 'Trap'
    },
    'FlameAvalanche': {
        name: 'FlameAvalanche',
        image: './Cards/All/FlameAvalanche.png',
        cardType: 'Spell',
        level: 4,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null,
        aoe: true
    },
    'MountainTearRiver': {
        name: 'MountainTearRiver',
        image: './Cards/All/MountainTearRiver.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null,
        aoe: true
    },
    'VampireOnFire': {
        name: 'VampireOnFire',
        image: './Cards/All/VampireOnFire.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null,
        aoe: true
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
        subtype: null,
        aoe: true
    },
    'PoisonPollen': {
        name: 'PoisonPollen',
        image: './Cards/All/PoisonPollen.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null,
        aoe: true
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
        subtype: null,
        aoe: true
    },
    'ToxicTrap': {
        name: 'ToxicTrap',
        image: './Cards/All/ToxicTrap.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: 'Trap'
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
        cost: 10,
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
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },
    'CoolPresents': {
        name: 'CoolPresents',
        image: './Cards/All/CoolPresents.png',
        cardType: 'Artifact',
        cost: 6,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'CrashLanding': {
        name: 'CrashLanding',
        image: './Cards/All/CrashLanding.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },
    'GloriousRebirth': {
        name: 'GloriousRebirth',
        image: './Cards/All/GloriousRebirth.png',
        cardType: 'Spell',
        level: 4,
        cost: 0,
        action: true,
        spellSchool: 'SupportMagic',
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
        spellSchool: 'Fighting',
        subtype: null
    },
    'UltimateDestroyerPunch': {
        name: 'UltimateDestroyerPunch',
        image: './Cards/All/UltimateDestroyerPunch.png',
        cardType: 'Spell',
        level: 1,
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
    'AcidVial': {
        name: 'AcidVial',
        image: './Cards/All/AcidVial.png',
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
        subtype: null
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
    'Wheels': {
        name: 'Wheels',
        image: './Cards/All/Wheels.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null,
        exclusive: true
    },

    // Sid's Cards
    'MagicAmethyst': {
        name: 'MagicAmethyst',
        image: './Cards/All/MagicAmethyst.png',
        cardType: 'Artifact',
        cost: 2,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicCobalt': {
        name: 'MagicCobalt',
        image: './Cards/All/MagicCobalt.png',
        cardType: 'Artifact',
        cost: 2,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicEmerald': {
        name: 'MagicEmerald',
        image: './Cards/All/MagicEmerald.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null,
        exclusive: true
    },
    'MagicRuby': {
        name: 'MagicRuby',
        image: './Cards/All/MagicRuby.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicSapphire': {
        name: 'MagicSapphire',
        image: './Cards/All/MagicSapphire.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'MagicTopaz': {
        name: 'MagicTopaz',
        image: './Cards/All/MagicTopaz.png',
        cardType: 'Artifact',
        cost: 2,
        action: false,
        spellSchool: null,
        subtype: null,
        exclusive: true
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
        hp: 50,
        physicalAttack: true
    },
    'Cavalry': {
        name: 'Cavalry',
        image: './Cards/All/Cavalry.png',
        cardType: 'Spell',
        level: 3,
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
        hp: 50,
        physicalAttack: true
    },
    'FuriousAnger': {
        name: 'FuriousAnger',
        image: './Cards/All/FuriousAnger.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
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
        cost: 10,
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
        cost: 8,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'TheStormblade': {
        name: 'TheStormblade',
        image: './Cards/All/TheStormblade.png',
        cardType: 'Artifact',
        cost: 10,
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
        hp: 50,
        physicalAttack: true
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
        hp: 50,
        physicalAttack: true
    },
    'SkeletonMage': {
        name: 'SkeletonMage',
        image: './Cards/All/SkeletonMage.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: false
    },
    'SkeletonNecromancer': {
        name: 'SkeletonNecromancer',
        image: './Cards/All/SkeletonNecromancer.png',
        cardType: 'Spell',
        level: 4,
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
        hp: 50,
        physicalAttack: true
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
    'Training': {
        name: 'Training',
        image: './Cards/All/Training.png',
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
        level: 5,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null,
        aoe: true
    },
    'Curse': {
        name: 'Curse',
        image: './Cards/All/Curse.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },
    'CrystalWell': {
        name: 'CrystalWell',
        image: './Cards/All/CrystalWell.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'MagicArts',
        subtype: 'Area'
    },
    'HandOfDeath': {
        name: 'HandOfDeath',
        image: './Cards/All/HandOfDeath.png',
        cardType: 'Spell',
        level: 3,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null
    },
    'CriticalStrike': {
        name: 'CriticalStrike',
        image: './Cards/All/CriticalStrike.png',
        cardType: 'Spell',
        level: 5,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },
    'DarkDeal': {
        name: 'DarkDeal',
        image: './Cards/All/DarkDeal.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },
    'SupplyChain': {
        name: 'SupplyChain',
        image: './Cards/All/SupplyChain.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'SupportMagic',
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
        cost: 6,
        action: false,
        spellSchool: null,
        subtype: "Permanent"
    },
    'AngryCheese': {
        name: 'AngryCheese',
        image: './Cards/All/AngryCheese.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'CuteCheese': {
        name: 'CuteCheese',
        image: './Cards/All/CuteCheese.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'HolyCheese': {
        name: 'HolyCheese',
        image: './Cards/All/HolyCheese.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'NerdyCheese': {
        name: 'NerdyCheese',
        image: './Cards/All/NerdyCheese.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'SicklyCheese': {
        name: 'SicklyCheese',
        image: './Cards/All/SicklyCheese.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'ShieldOfLife': {
        name: 'ShieldOfLife',
        image: './Cards/All/ShieldOfLife.png',
        cardType: 'Artifact',
        cost: 12,
        action: false,
        spellSchool: null,
        subtype: "Equip"
    },
    'ShieldOfDeath': {
        name: 'ShieldOfDeath',
        image: './Cards/All/ShieldOfDeath.png',
        cardType: 'Artifact',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: "Equip"
    },
    'SkeletonKingSkullmael': {
        name: 'SkeletonKingSkullmael',
        image: './Cards/All/SkeletonKingSkullmael.png',
        cardType: 'Spell',
        level: 5,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: true
    },
    'SkeletonHealer': {
        name: 'SkeletonHealer',
        image: './Cards/All/SkeletonHealer.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: true
    },
    'BlueIceDragon': {
        name: 'BlueIceDragon',
        image: './Cards/All/BlueIceDragon.png',
        cardType: 'Spell',
        level: 5,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 250,
        physicalAttack: false
    },
    'ExplodingSkull': {
        name: 'ExplodingSkull',
        image: './Cards/All/ExplodingSkull.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 1,
        physicalAttack: false
    },
    'DemonsGate': {
        name: 'DemonsGate',
        image: './Cards/All/DemonsGate.png',
        cardType: 'Spell',
        level: 6,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 250,
        physicalAttack: false
    },
    '3HeadedGiant': {
        name: '3HeadedGiant',
        image: './Cards/All/3HeadedGiant.png',
        cardType: 'Spell',
        level: 4,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 150,
        physicalAttack: true
    },


    //KAZENA
    'CloudPillow': {
        name: 'CloudPillow',
        image: './Cards/All/CloudPillow.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: "Permanent"
    },
    'StormRing': {
        name: 'StormRing',
        image: './Cards/All/StormRing.png',
        cardType: 'Artifact',
        cost: 12,
        action: false,
        spellSchool: null,
        subtype: "Permanent"
    },
    'Haste': {
        name: 'Haste',
        image: './Cards/All/Haste.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SupportMagic',
        subtype: null
    },
    'GatheringStorm': {
        name: 'GatheringStorm',
        image: './Cards/All/GatheringStorm.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: 'Area',
        aoe: true
    },
    'CloudInABottle': {
        name: 'CloudInABottle',
        image: './Cards/All/CloudInABottle.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'ElixirOfQuickness': {
        name: 'ElixirOfQuickness',
        image: './Cards/All/ElixirOfQuickness.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },


    /// HEINZ
    'Inventing': {
        name: 'Inventing',
        image: './Cards/All/Inventing.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'FutureTechDrone': {
        name: 'FutureTechDrone',
        image: './Cards/All/FutureTechDrone.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 20,
        physicalAttack: false
    },
    'FutureTechMech': {
        name: 'FutureTechMech',
        image: './Cards/All/FutureTechMech.png',
        cardType: 'Spell',
        level: 5,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 150,
        physicalAttack: false
    },
    'AncientTechInfiniteEnergyCore': {
        name: 'AncientTechInfiniteEnergyCore',
        image: './Cards/All/AncientTechInfiniteEnergyCore.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: "Equip"
    },
    'BirthdayPresent': {
        name: 'BirthdayPresent',
        image: './Cards/All/BirthdayPresent.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'FutureTechCopyDevice': {
        name: 'FutureTechCopyDevice',
        image: './Cards/All/FutureTechCopyDevice.png',
        cardType: 'Artifact',
        cost: 8,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'FutureTechFists': {
        name: 'FutureTechFists',
        image: './Cards/All/FutureTechFists.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'FutureTechLamp': {
        name: 'FutureTechLamp',
        image: './Cards/All/FutureTechLamp.png',
        cardType: 'Artifact',
        cost: 6,
        action: false,
        spellSchool: null,
        subtype: null,
        exclusive: true
    },
    'BloodSoakedCoin': {
        name: 'BloodSoakedCoin',
        image: './Cards/All/BloodSoakedCoin.png',
        cardType: 'Artifact',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },


    // KYLI
    'Occultism': {
        name: 'Occultism',
        image: './Cards/All/Occultism.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Biomancy': {
        name: 'Biomancy',
        image: './Cards/All/Biomancy.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'OverflowingChalice': {
        name: 'OverflowingChalice',
        image: './Cards/All/OverflowingChalice.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'DoomClock': {
        name: 'DoomClock',
        image: './Cards/All/DoomClock.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'MagicArts',
        subtype: 'Area'
    },
    'TheRootOfAllEvil': {
        name: 'TheRootOfAllEvil',
        image: './Cards/All/TheRootOfAllEvil.png',
        cardType: 'Spell',
        level: 6,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 200,
        physicalAttack: false
    },
    'GraveWorm': {
        name: 'GraveWorm',
        image: './Cards/All/GraveWorm.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 20,
        physicalAttack: true
    },



    // NOMU
    'PlanetInABottle': {
        name: 'PlanetInABottle',
        image: './Cards/All/PlanetInABottle.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'TeleportationPowder': {
        name: 'TeleportationPowder',
        image: './Cards/All/TeleportationPowder.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'StaffOfTheTeleporter': {
        name: 'StaffOfTheTeleporter',
        image: './Cards/All/StaffOfTheTeleporter.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Teleport': {
        name: 'Teleport',
        image: './Cards/All/Teleport.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: false,
        spellSchool: 'MagicArts',
        subtype: 'Quick',
        global: true
    },
    'Teleportal': {
        name: 'Teleportal',
        image: './Cards/All/Teleportal.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'MagicArts',
        subtype: null,
        global: true
    },
    'SpatialCrevice': {
        name: 'SpatialCrevice',
        image: './Cards/All/SpatialCrevice.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'MagicArts',
        subtype: 'Area'
    },



    // BEATO
    'ButterflyCloud': {
        name: 'ButterflyCloud',
        image: './Cards/All/ButterflyCloud.png',
        cardType: 'Spell',
        level: 3,
        cost: 0,
        action: true,
        spellSchool: 'MagicArts',
        subtype: null,
        global: true
    },
    'DivineGiftOfMagic': {
        name: 'DivineGiftOfMagic',
        image: './Cards/All/DivineGiftOfMagic.png',
        cardType: 'Spell',
        level: 9,
        cost: 0,
        action: false,
        spellSchool: 'MagicArts',
        subtype: null,
        global: true
    },
    'AntiMagicShield': {
        name: 'AntiMagicShield',
        image: './Cards/All/AntiMagicShield.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: false,
        spellSchool: 'MagicArts',
        subtype: 'Quick',
        global: true
    },
    'CreateIllusion': {
        name: 'CreateIllusion',
        image: './Cards/All/CreateIllusion.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'MagicArts',
        subtype: null,
        global: true
    },
    'AuroraBorealis': {
        name: 'AuroraBorealis',
        image: './Cards/All/AuroraBorealis.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'MagicArts',
        subtype: null,
        global: true
    },
    'MagicLamp': {
        name: 'MagicLamp',
        image: './Cards/All/MagicLamp.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },



    // WAFLAV
    'Cannibalism': {
        name: 'Cannibalism',
        image: './Cards/All/Cannibalism.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'ThunderstruckWaflav': {
        name: 'ThunderstruckWaflav',
        image: './Cards/Characters/ThunderstruckWaflav.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Ascended',
        hp: 400,
        atk: 120,
        ability1: null,
        ability2: null,
        baseHero: 'Waflav'
    },
    'SwampborneWaflav': {
        name: 'SwampborneWaflav',
        image: './Cards/Characters/SwampborneWaflav.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Ascended',
        hp: 500,
        atk: 180,
        ability1: null,
        ability2: null,
        baseHero: 'Waflav'
    },
    'FlamebathedWaflav': {
        name: 'FlamebathedWaflav',
        image: './Cards/Characters/FlamebathedWaflav.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Ascended',
        hp: 450,
        atk: 140,
        ability1: null,
        ability2: null,
        baseHero: 'Waflav'
    },
    'StormkissedWaflav': {
        name: 'StormkissedWaflav',
        image: './Cards/Characters/StormkissedWaflav.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Ascended',
        hp: 400,
        atk: 100,
        ability1: null,
        ability2: null,
        baseHero: 'Waflav'
    },
    'DeepDrownedWaflav': {
        name: 'DeepDrownedWaflav',
        image: './Cards/Characters/DeepDrownedWaflav.png',
        cardType: 'hero',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Ascended',
        hp: 550,
        atk: 180,
        ability1: null,
        ability2: null,
        baseHero: 'Waflav'
    },
    'CaptureNet': {
        name: 'CaptureNet',
        image: './Cards/All/CaptureNet.png',
        cardType: 'Artifact',
        cost: 30,
        action: false,
        spellSchool: null,
        subtype: "Equip"
    },



    // LUNA
    'Friendship': {
        name: 'Friendship',
        image: './Cards/All/Friendship.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'TearingMountain': {
        name: 'TearingMountain',
        image: './Cards/All/TearingMountain.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: 'Area',
        aoe: true
    },
    'LunaKiai': {
        name: 'LunaKiai',
        image: './Cards/All/LunaKiai.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 100,
        physicalAttack: false
    },
    'PriestOfLuna': {
        name: 'PriestOfLuna',
        image: './Cards/All/PriestOfLuna.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 20,
        physicalAttack: false
    },
    'HeartOfTheMountain': {
        name: 'HeartOfTheMountain',
        image: './Cards/All/HeartOfTheMountain.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: "Permanent"
    },
    'DichotomyOfLunaAndTempeste': {
        name: 'DichotomyOfLunaAndTempeste',
        image: './Cards/All/DichotomyOfLunaAndTempeste.png',
        cardType: 'Artifact',
        cost: 6,
        action: false,
        spellSchool: null,
        subtype: "Equip"
    },


    // GHUANJUN
    'GraveyardOfLimitedPower': {
        name: 'GraveyardOfLimitedPower',
        image: './Cards/All/GraveyardOfLimitedPower.png',
        cardType: 'Spell',
        level: 3,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: 'Area'
    },
    'BlowOfTheVenomSnake': {
        name: 'BlowOfTheVenomSnake',
        image: './Cards/All/BlowOfTheVenomSnake.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },
    'StrongOxHeadbutt': {
        name: 'StrongOxHeadbutt',
        image: './Cards/All/StrongOxHeadbutt.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },
    'FerociousTigerKick': {
        name: 'FerociousTigerKick',
        image: './Cards/All/FerociousTigerKick.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'Fighting',
        subtype: null
    },
    'SkullNecklace': {
        name: 'SkullNecklace',
        image: './Cards/All/SkullNecklace.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: "Equip"
    },
    'PunchInTheBox': {
        name: 'PunchInTheBox',
        image: './Cards/All/PunchInTheBox.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },


    //MARY
    'CuteBird': {
        name: 'CuteBird',
        image: './Cards/All/CuteBird.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 10,
        physicalAttack: false
    },
    'CutePhoenix': {
        name: 'CutePhoenix',
        image: './Cards/All/CutePhoenix.png',
        cardType: 'Spell',
        level: 3,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 10,
        physicalAttack: false
    },
    'CuteCrown': {
        name: 'CuteCrown',
        image: './Cards/All/CuteCrown.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: "Equip"
    },
    'PinkSky': {
        name: 'PinkSky',
        image: './Cards/All/PinkSky.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'SupportMagic',
        subtype: 'Area'
    },
    'PhoenixTackle': {
        name: 'PhoenixTackle',
        image: './Cards/All/PhoenixTackle.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null
    },
    'VictoryPhoenixCannon': {
        name: 'VictoryPhoenixCannon',
        image: './Cards/All/VictoryPhoenixCannon.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'DestructionMagic',
        subtype: null
    },


    // CARRIS
    'Divinity': {
        name: 'Divinity',
        image: './Cards/All/Divinity.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'Premonition': {
        name: 'Premonition',
        image: './Cards/All/Premonition.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'DivineGiftOfTime': {
        name: 'DivineGiftOfTime',
        image: './Cards/All/DivineGiftOfTime.png',
        cardType: 'Spell',
        level: 5,
        cost: 0,
        action: false,
        spellSchool: 'SupportMagic',
        subtype: 'Quick'
    },
    'BigGwen': {
        name: 'BigGwen',
        image: './Cards/All/BigGwen.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'MagicArts',
        subtype: 'Area'
    },
    'TheHandsOfBigGwen': {
        name: 'TheHandsOfBigGwen',
        image: './Cards/All/TheHandsOfBigGwen.png',
        cardType: 'Artifact',
        cost: 10,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'HatOfMadness': {
        name: 'HatOfMadness',
        image: './Cards/All/HatOfMadness.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: 'Equip'
    },
    'Slow': {
        name: 'Slow',
        image: './Cards/All/Slow.png',
        cardType: 'Spell',
        level: 0,
        cost: 0,
        action: true,
        spellSchool: 'DecayMagic',
        subtype: null
    },



    // NAO
    'Heal': {
        name: 'Heal',
        image: './Cards/All/Heal.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SupportMagic',
        subtype: null
    },
    'Cure': {
        name: 'Cure',
        image: './Cards/All/Cure.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SupportMagic',
        subtype: null
    },
    'HealingPotion': {
        name: 'HealingPotion',
        image: './Cards/All/HealingPotion.png',
        cardType: 'Potion',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },



    // THEP
    'Learning': {
        name: 'Learning',
        image: './Cards/All/Learning.png',
        cardType: 'Ability',
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'SoulShardIb': {
        name: 'SoulShardIb',
        image: './Cards/All/SoulShardIb.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: false
    },
    'SoulShardKa': {
        name: 'SoulShardKa',
        image: './Cards/All/SoulShardKa.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: false
    },
    'SoulShardKhet': {
        name: 'SoulShardKhet',
        image: './Cards/All/SoulShardKhet.png',
        cardType: 'Spell',
        level: 2,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: false
    },
    'SoulShardBa': {
        name: 'SoulShardBa',
        image: './Cards/All/SoulShardBa.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: false
    },
    'SoulShardRen': {
        name: 'SoulShardRen',
        image: './Cards/All/SoulShardRen.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: false
    },
    'SoulShardSekhem': {
        name: 'SoulShardSekhem',
        image: './Cards/All/SoulShardSekhem.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: false
    },
    'SoulShardShut': {
        name: 'SoulShardShut',
        image: './Cards/All/SoulShardShut.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: false
    },
    'SoulShardSah': {
        name: 'SoulShardSah',
        image: './Cards/All/SoulShardSah.png',
        cardType: 'Spell',
        level: 3,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 50,
        physicalAttack: false
    },




    



    // MONKEES
    'GoldenBananas': {
        name: 'GoldenBananas',
        image: './Cards/All/GoldenBananas.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null
    },
    'NonFungibleMonkee': {
        name: 'NonFungibleMonkee',
        image: './Cards/All/NonFungibleMonkee.png',
        cardType: 'Artifact',
        cost: 4,
        action: false,
        spellSchool: null,
        subtype: null,
        archetype: 'Monkees'
    },
    'CheekyMonkee': {
        name: 'CheekyMonkee',
        image: './Cards/All/CheekyMonkee.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 40,
        physicalAttack: true,
        archetype: 'Monkees'
    },
    'ResilientMonkee': {
        name: 'ResilientMonkee',
        image: './Cards/All/ResilientMonkee.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 40,
        physicalAttack: true,
        archetype: 'Monkees'
    },
    'NimbleMonkee': {
        name: 'NimbleMonkee',
        image: './Cards/All/NimbleMonkee.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 1,
        physicalAttack: true,
        archetype: 'Monkees'
    },
    'CriminalMonkee': {
        name: 'CriminalMonkee',
        image: './Cards/All/CriminalMonkee.png',
        cardType: 'Spell',
        level: 1,
        cost: 0,
        action: true,
        spellSchool: 'SummoningMagic',
        subtype: 'Creature',
        hp: 40,
        physicalAttack: true,
        archetype: 'Monkees'
    },






    // TOKENS
    'BiomancyToken': {
        name: 'BiomancyToken',
        image: './Cards/All/BiomancyToken.png',
        cardType: 'Token',
        level: 0,
        cost: 0,
        action: false,
        spellSchool: null,
        subtype: 'Creature',
        hp: 10,
        physicalAttack: true
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
    
    // Only add isPhysical if it exists (for spell cards)
    if (cardInfo.isPhysical !== undefined) {
        baseInfo.isPhysical = cardInfo.isPhysical;
    }
    
    // Only add aoe if it exists (for spell cards)
    if (cardInfo.aoe !== undefined) {
        baseInfo.aoe = cardInfo.aoe;
    }
    
    // Only add archetype if it exists
    if (cardInfo.archetype !== undefined) {
        baseInfo.archetype = cardInfo.archetype;
    }

    // Only add baseHero if it exists
    if (cardInfo.baseHero !== undefined) {
        baseInfo.baseHero = cardInfo.baseHero;
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
 * Get all non-Hero, non-Token cards
 * @returns {Object[]} Array of all non-hero, non-token card information objects
 */
export function getAllAbilityCards() {
    return Object.values(CARD_DATABASE)
        .filter(card => card.cardType !== 'hero' && card.cardType !== 'Token')
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
 * Check if a card is a token
 * @param {string} cardName - The name of the card to check
 * @returns {boolean} True if card is a token, false otherwise
 */
export function isToken(cardName) {
    const cardInfo = CARD_DATABASE[cardName];
    return cardInfo && cardInfo.cardType === 'Token';
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
    const tokens = cards.filter(card => card.cardType === 'Token');
    const abilityCards = cards.filter(card => card.cardType !== 'hero' && card.cardType !== 'Token');
    const types = [...new Set(cards.map(card => card.cardType))];
    const spellSchools = [...new Set(cards.map(card => card.spellSchool))];
    const subtypes = [...new Set(cards.map(card => card.subtype))];
    const costs = [...new Set(cards.map(card => card.cost))];
    
    return {
        totalCards: cards.length,
        totalHeroes: heroes.length,
        totalTokens: tokens.length,
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

/**
 * Get cards by multiple filter criteria
 * @param {Object} filters - Object containing filter criteria
 * @param {string} [filters.cardType] - Card type to filter by
 * @param {string} [filters.spellSchool] - Spell school to filter by
 * @param {string} [filters.subtype] - Subtype to filter by
 * @param {number} [filters.level] - Spell level to filter by
 * @param {boolean} [filters.action] - Whether card requires action
 * @param {number} [filters.cost] - Cost to filter by
 * @param {boolean} [filters.global] - Whether spell is global
 * @param {boolean} [filters.aoe] - Whether spell is AoE
 * @returns {Object[]} Array of card information objects matching all filters
 */
export function getCardsByFilters(filters = {}) {
    return Object.values(CARD_DATABASE)
        .filter(card => {
            // Check each filter criterion
            if (filters.cardType !== undefined && card.cardType !== filters.cardType) {
                return false;
            }
            if (filters.spellSchool !== undefined && card.spellSchool !== filters.spellSchool) {
                return false;
            }
            if (filters.subtype !== undefined && card.subtype !== filters.subtype) {
                return false;
            }
            if (filters.level !== undefined && card.level !== filters.level) {
                return false;
            }
            if (filters.action !== undefined && card.action !== filters.action) {
                return false;
            }
            if (filters.cost !== undefined && card.cost !== filters.cost) {
                return false;
            }
            if (filters.global !== undefined && card.global !== filters.global) {
                return false;
            }
            if (filters.aoe !== undefined && card.aoe !== filters.aoe) {
                return false;
            }
            
            return true;
        })
        .map(card => ({ ...card })); // Return copies
}

/**
 * Get all MagicArts spell cards
 * Convenience function for getting all spells with spellSchool: 'MagicArts'
 * @returns {Object[]} Array of MagicArts spell card information objects
 */
export function getMagicArtsSpells() {
    return getCardsByFilters({
        cardType: 'Spell',
        spellSchool: 'MagicArts'
    });
}

/**
 * Get all spell cards of a specific school
 * @param {string} spellSchool - The spell school to filter by
 * @returns {Object[]} Array of spell card information objects
 */
export function getSpellsBySchool(spellSchool) {
    return getCardsByFilters({
        cardType: 'Spell',
        spellSchool: spellSchool
    });
}

// Log database initialization
const initStats = Object.keys(CARD_DATABASE).length;
const heroCount = Object.values(CARD_DATABASE).filter(card => card.cardType === 'hero').length;
const tokenCount = Object.values(CARD_DATABASE).filter(card => card.cardType === 'Token').length;
const abilityCount = initStats - heroCount - tokenCount;

// Export the database for debugging purposes (read-only)
export const CARD_DB_DEBUG = Object.freeze(CARD_DATABASE);