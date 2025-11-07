// riffel.js - Riffel Hero Effect Management System

import { getCardInfo } from '../cardDatabase.js';
import { graveyardManager } from '../graveyard.js';

export class RiffelEffectManager {
    constructor() {
        this.riffelUsedThisTurn = false;
        
        console.log('RiffelEffectManager initialized');
    }

    // Check if Riffel effect can be used
    canUseRiffelEffect() {
        // Check if already used this turn
        if (this.riffelUsedThisTurn) {
            return {
                canUse: false,
                reason: 'already_used',
                message: 'You can only use this effect once per turn!'
            };
        }

        // Check if there are any Equip artifacts in the graveyard
        const equipArtifacts = this.getEquipArtifactsInGraveyard();
        if (equipArtifacts.length === 0) {
            return {
                canUse: false,
                reason: 'no_equips',
                message: 'There are no Equips in your discard pile!'
            };
        }

        return {
            canUse: true,
            reason: null,
            message: null
        };
    }

    // Get all Equip artifacts currently in graveyard
    getEquipArtifactsInGraveyard() {
        const graveyard = graveyardManager.getGraveyard();
        const equipArtifacts = [];

        for (const cardName of graveyard) {
            const cardInfo = getCardInfo(cardName);
            if (cardInfo && cardInfo.cardType === 'Artifact' && cardInfo.subtype === 'Equip') {
                equipArtifacts.push(cardName);
            }
        }

        return equipArtifacts;
    }

    // Get a random Equip artifact from the graveyard
    getRandomEquipFromGraveyard() {
        const equipArtifacts = this.getEquipArtifactsInGraveyard();
        
        if (equipArtifacts.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * equipArtifacts.length);
        return equipArtifacts[randomIndex];
    }

    // Remove one copy of a specific card from the graveyard
    removeCardFromGraveyard(cardName) {
        const graveyard = graveyardManager.graveyard;
        const index = graveyard.indexOf(cardName);
        
        if (index !== -1) {
            graveyard.splice(index, 1);
            return true;
        }
        
        return false;
    }

    // Use Riffel effect (add random Equip from graveyard to hero, mark as used)
    async useRiffelEffect(heroSelection, heroPosition) {
        if (!heroSelection || !heroPosition) {
            return false;
        }

        // Double-check we can use the effect
        const canUse = this.canUseRiffelEffect();
        if (!canUse.canUse) {
            return false;
        }

        try {
            // Get random Equip from graveyard
            const randomEquip = this.getRandomEquipFromGraveyard();
            
            if (!randomEquip) {
                this.showRiffelEffectError('No Equips found in discard pile!');
                return false;
            }

            // Get the hero equipment manager
            const heroEquipmentManager = heroSelection.heroEquipmentManager;
            if (!heroEquipmentManager) {
                this.showRiffelEffectError('Equipment manager not available!');
                return false;
            }

            // Validate hero position
            if (!['left', 'center', 'right'].includes(heroPosition)) {
                this.showRiffelEffectError('Invalid hero position!');
                return false;
            }

            // Check if there's a hero at this position
            const formation = heroSelection.formationManager.getBattleFormation();
            const hero = formation[heroPosition];
            if (!hero) {
                this.showRiffelEffectError('No hero at this position!');
                return false;
            }

            // Get artifact info
            const artifactInfo = getCardInfo(randomEquip);
            if (!artifactInfo) {
                this.showRiffelEffectError('Invalid artifact!');
                return false;
            }

            // Add artifact directly to hero's equipment array (bypassing cost checks)
            const equipmentEntry = {
                name: randomEquip,
                cardName: randomEquip,
                cost: 0, // No cost for Riffel effect
                image: artifactInfo.image || `./Cards/All/${randomEquip}.png`,
                equippedAt: Date.now(),
                source: 'Riffel' // Mark as from Riffel effect
            };

            heroEquipmentManager.heroEquipment[heroPosition].push(equipmentEntry);
            console.log(`⚔️ Riffel equipped ${randomEquip} to ${heroPosition} hero (no cost)`);

            // Trigger equipment change callbacks for special artifacts
            if (randomEquip === 'AncientTechInfiniteEnergyCore' && window.ancientTechInfiniteEnergyCoreEffect) {
                window.ancientTechInfiniteEnergyCoreEffect.onEquipmentChange();
            }
            if (randomEquip === 'SkullNecklace' && window.skullNecklaceEffect) {
                window.skullNecklaceEffect.onEquipmentChange();
            }
            if (randomEquip === 'FutureTechGun' && window.futureTechGunEffect) {
                window.futureTechGunEffect.onEquipmentChange();
            }
            if (randomEquip === 'FutureTechLaserCannon' && window.futureTechLaserCannonEffect) {
                window.futureTechLaserCannonEffect.onEquipmentChange();
            }

            // Trigger equipment change callback
            if (heroEquipmentManager.onEquipmentChangeCallback) {
                heroEquipmentManager.onEquipmentChangeCallback({
                    type: 'artifact_equipped',
                    heroPosition,
                    artifactName: randomEquip,
                    hero: hero
                });
            }

            // Remove the card from graveyard
            const removed = this.removeCardFromGraveyard(randomEquip);
            
            if (!removed) {
                this.showRiffelEffectError('Failed to remove Equip from graveyard!');
                return false;
            }

            // Mark as used this turn
            this.riffelUsedThisTurn = true;
            
            // Show success message
            this.showRiffelEffectSuccess(randomEquip);
            
            // Update displays
            if (heroSelection.updateEquipmentDisplay) {
                heroSelection.updateEquipmentDisplay();
            }
            
            // Save game state
            await heroSelection.saveGameState();
            
            // Send update to opponent
            if (heroSelection.gameDataSender) {
                heroSelection.gameDataSender('riffel_effect_used', {
                    equipObtained: randomEquip,
                    heroPosition: heroPosition,
                    timestamp: Date.now()
                });
            }
            
            console.log(`⚔️ Riffel effect used: Retrieved ${randomEquip} from graveyard and equipped to ${heroPosition} hero`);
            return true;
            
        } catch (error) {
            console.error('Error using Riffel effect:', error);
            return false;
        }
    }

    // Show Riffel effect dialog
    showRiffelDialog(heroSelection, heroPosition) {
        const canUse = this.canUseRiffelEffect();

        if (!canUse.canUse) {
            // Show error message
            this.showRiffelEffectError(canUse.message);
            return;
        }

        // Get count of Equips in graveyard
        const equipCount = this.getEquipArtifactsInGraveyard().length;

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.id = 'riffelEffectDialog';
        overlay.className = 'riffel-effect-overlay';
        overlay.innerHTML = `
            <div class="riffel-dialog-container">
                <div class="riffel-dialog-content">
                    <div class="riffel-dialog-header">
                        <div class="riffel-icon">⚔️</div>
                        <h3>Riffel's Salvage</h3>
                    </div>
                    <div class="riffel-dialog-body">
                        <p>Retrieve a random <span class="equip-text">Equip</span> from your discard pile and equip it to this hero?</p>
                        <div class="equip-count">
                            <span class="count-icon">🃏</span>
                            <span>Equips in discard pile: ${equipCount}</span>
                        </div>
                    </div>
                    <div class="riffel-dialog-buttons">
                        <button class="riffel-btn riffel-btn-no" onclick="window.closeRiffelDialog()">
                            <span class="btn-icon">❌</span>
                            <span>No</span>
                        </button>
                        <button class="riffel-btn riffel-btn-yes" onclick="window.confirmRiffelEffect()">
                            <span class="btn-icon">✨</span>
                            <span>Yes</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles if not already present
        this.ensureRiffelDialogStyles();

        // Prevent body scrolling
        document.body.classList.add('riffel-dialog-active');

        // Add to body
        document.body.appendChild(overlay);

        // Animate in
        overlay.style.animation = 'fadeIn 0.3s ease-out';

        // Store reference for the confirm handler
        overlay.dataset.heroPosition = heroPosition;

        // Set up global handlers
        window.closeRiffelDialog = () => {
            this.closeRiffelDialog();
        };

        window.confirmRiffelEffect = async () => {
            const dialog = document.getElementById('riffelEffectDialog');
            if (dialog) {
                const heroPos = dialog.dataset.heroPosition;
                await this.useRiffelEffect(heroSelection, heroPos);
                this.closeRiffelDialog();
            }
        };
    }

    // Close Riffel effect dialog
    closeRiffelDialog() {
        const overlay = document.getElementById('riffelEffectDialog');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                overlay.remove();
                document.body.classList.remove('riffel-dialog-active');
            }, 300);
        }

        // Clean up global handlers
        delete window.closeRiffelDialog;
        delete window.confirmRiffelEffect;
    }

    // Show success message
    showRiffelEffectSuccess(equipName) {
        const formatCardName = (cardName) => {
            return cardName
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim();
        };

        const formattedName = formatCardName(equipName);
        const message = document.createElement('div');
        message.className = 'riffel-effect-message riffel-success';
        message.innerHTML = `
            <div class="success-content">
                <span class="success-icon">⚔️</span>
                <span>Equipped ${formattedName}!</span>
            </div>
        `;

        document.body.appendChild(message);

        // Animate in
        message.style.animation = 'riffelSuccessBounce 0.5s ease-out';

        // Remove after delay
        setTimeout(() => {
            message.style.animation = 'riffelSuccessFade 0.5s ease-out';
            setTimeout(() => message.remove(), 500);
        }, 2000);
    }

    // Show error message
    showRiffelEffectError(errorText) {
        const message = document.createElement('div');
        message.className = 'riffel-effect-message riffel-error';
        message.innerHTML = `
            <div class="error-content">
                <span class="error-icon">❌</span>
                <span>${errorText}</span>
            </div>
        `;

        document.body.appendChild(message);

        // Animate in
        message.style.animation = 'riffelErrorShake 0.5s ease-out';

        // Remove after delay
        setTimeout(() => {
            message.style.animation = 'riffelErrorFade 0.5s ease-out';
            setTimeout(() => message.remove(), 500);
        }, 2000);
    }

    // Ensure dialog styles are present
    ensureRiffelDialogStyles() {
        if (document.getElementById('riffelDialogStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'riffelDialogStyles';
        style.textContent = `
            .riffel-effect-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                backdrop-filter: blur(5px);
            }
            
            body.riffel-dialog-active {
                overflow: hidden;
            }
            
            .riffel-dialog-container {
                position: relative;
                width: 90%;
                max-width: 450px;
            }
            
            .riffel-dialog-content {
                background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
                border: 3px solid #c0c0c0;
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 10px 50px rgba(0, 0, 0, 0.9);
            }
            
            .riffel-dialog-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }
            
            .riffel-icon {
                font-size: 32px;
                animation: riffelIconFloat 3s ease-in-out infinite;
            }
            
            .riffel-dialog-header h3 {
                margin: 0;
                font-size: 1.8rem;
                color: #c0c0c0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            }
            
            .riffel-dialog-body {
                text-align: center;
                margin-bottom: 25px;
            }
            
            .riffel-dialog-body p {
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.9);
                margin: 0 0 15px 0;
                line-height: 1.4;
            }
            
            .equip-text {
                color: #ffa500;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            .equip-count {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(255, 165, 0, 0.1);
                border: 1px solid rgba(255, 165, 0, 0.3);
                border-radius: 8px;
                padding: 8px 16px;
                margin: 0 auto;
                max-width: 250px;
            }
            
            .equip-count .count-icon {
                font-size: 18px;
                filter: drop-shadow(0 0 4px rgba(255, 165, 0, 0.6));
            }
            
            .riffel-dialog-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            
            .riffel-btn {
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 100px;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            }
            
            .riffel-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            }
            
            .riffel-btn:active {
                transform: translateY(0);
            }
            
            .riffel-btn-no {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            }
            
            .riffel-btn-no:hover {
                background: linear-gradient(135deg, #e94560 0%, #d42c40 100%);
                box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
            }
            
            .riffel-btn-yes {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            }
            
            .riffel-btn-yes:hover {
                background: linear-gradient(135deg, #32cc52 0%, #26d9a8 100%);
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
            }
            
            .btn-icon {
                font-size: 18px;
            }

            .riffel-effect-message {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
                border: 3px solid;
                border-radius: 15px;
                padding: 20px 30px;
                font-size: 1.3rem;
                font-weight: bold;
                z-index: 100001;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.9);
                pointer-events: none;
            }

            .riffel-success {
                border-color: #28a745;
                color: #28a745;
            }

            .riffel-error {
                border-color: #dc3545;
                color: #dc3545;
            }
            
            /* Animations */
            @keyframes riffelIconFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                33% { transform: translateY(-3px) rotate(2deg); }
                66% { transform: translateY(3px) rotate(-2deg); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.9); }
            }
            
            @keyframes riffelSuccessBounce {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                60% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            
            @keyframes riffelSuccessFade {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
            
            @keyframes riffelErrorShake {
                0%, 100% { transform: translate(-50%, -50%); }
                25% { transform: translate(-52%, -50%); }
                75% { transform: translate(-48%, -50%); }
            }
            
            @keyframes riffelErrorFade {
                from { opacity: 1; transform: translate(-50%, -50%); }
                to { opacity: 0; transform: translate(-50%, -50%) translateY(-10px); }
            }
            
            .success-content,
            .error-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .success-icon,
            .error-icon {
                font-size: 20px;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Reset Riffel effect usage (called at start of new turn)
    resetForNewTurn() {
        this.riffelUsedThisTurn = false;
        console.log('⚔️ Riffel effect usage reset for new turn');
    }

    // Export Riffel effect state for saving
    exportRiffelState() {
        return {
            riffelUsedThisTurn: this.riffelUsedThisTurn,
            timestamp: Date.now()
        };
    }

    // Import Riffel effect state for loading
    importRiffelState(stateData) {
        if (!stateData || typeof stateData !== 'object') {
            console.error('Invalid Riffel state data provided');
            return false;
        }

        if (typeof stateData.riffelUsedThisTurn === 'boolean') {
            this.riffelUsedThisTurn = stateData.riffelUsedThisTurn;
            console.log(`⚔️ Riffel effect state restored: used=${this.riffelUsedThisTurn}`);
            return true;
        }

        return false;
    }

    // Reset all state (for new game)
    reset() {
        this.riffelUsedThisTurn = false;
        console.log('⚔️ Riffel effect manager reset for new game');
    }

    // Get current state for debugging
    getState() {
        return {
            riffelUsedThisTurn: this.riffelUsedThisTurn
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.RiffelEffectManager = RiffelEffectManager;
}

export default RiffelEffectManager;