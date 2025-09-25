// ./Spells/supplyChain.js - Supply Chain Spell Implementation

export class SupplyChainSpell {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.spellName = 'SupplyChain';
        this.displayName = 'Supply Chain';
    }

    // ============================================
    // SPELL CASTING CHECKS
    // ============================================

    // Check if the spell can be cast (usage tracking)
    canCast(caster) {
        // Get all copies of Supply Chain for this hero
        const supplyChainSpells = caster.getAllSpells().filter(spell => spell.name === this.spellName);
        
        // Check if any copy is still available for use
        const hasAvailableCopy = supplyChainSpells.some(spell => {
            const usedCount = spell.usedInBattle || 0;
            return usedCount === 0; // Each copy can only be used once
        });
        
        if (!hasAvailableCopy) {
            return false;
        }
        
        return true;
    }

    // ============================================
    // CORE SPELL EXECUTION
    // ============================================

    // Execute Supply Chain spell effect
    async executeSpell(caster, spell) {       
        // Mark this specific spell copy as used
        this.markSpellAsUsed(caster, spell);
        
        // Log the spell effect
        this.logSpellEffect(caster);
        
        // Play supply chain animation
        await this.playSupplyChainAnimation(caster);
        
        // Grant post-battle card bonus
        this.grantCardBonus(caster);
    }

    // ============================================
    // USAGE TRACKING
    // ============================================

    // Mark a specific spell copy as used
    markSpellAsUsed(caster, spellToMark) {
        const allSpells = caster.getAllSpells();
        
        // Find the first unused copy of Supply Chain and mark it as used
        for (let i = 0; i < allSpells.length; i++) {
            const spell = allSpells[i];
            if (spell.name === this.spellName) {
                const usedCount = spell.usedInBattle || 0;
                if (usedCount === 0) {
                    // Mark this copy as used
                    spell.usedInBattle = 1;
                    break;
                }
            }
        }
    }

    // ============================================
    // CARD BONUS SYSTEM
    // ============================================

    // Grant post-battle card bonus
    grantCardBonus(caster) {
        const battleManager = this.battleManager;
        const casterSide = caster.side;
        
        // Update battleManager counters instead of heroSelection
        if (casterSide === 'player') {
            if (!battleManager.playerCounters.supplyChain) {
                battleManager.playerCounters.supplyChain = 0;
            }
            battleManager.playerCounters.supplyChain += 1;
        } else {
            if (!battleManager.opponentCounters.supplyChain) {
                battleManager.opponentCounters.supplyChain = 0;
            }
            battleManager.opponentCounters.supplyChain += 1;
        }
        
        // Send update to opponent
        this.battleManager.sendBattleUpdate('supply_chain_bonus', {
            casterName: caster.name,
            casterAbsoluteSide: caster.absoluteSide,
            casterPosition: caster.position,
            bonusCards: 1,
            totalBonusCards: casterSide === 'player' ? 
                battleManager.playerCounters.supplyChain : 
                battleManager.opponentCounters.supplyChain,
            timestamp: Date.now()
        });
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    // Play supply chain animation
    async playSupplyChainAnimation(caster) {        
        // Ensure CSS exists
        this.ensureSupplyChainCSS();
        
        const casterElement = this.battleManager.getHeroElement(caster.side, caster.position);
        if (!casterElement) return;
        
        // Create supply chain visual effect
        await this.createSupplyChainEffect(casterElement);
        
        // Cleanup
        this.cleanupSupplyChainEffects();
    }

    // Create supply chain visual effect
    async createSupplyChainEffect(casterElement) {
        const rect = casterElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Create main supply chain container
        const supplyContainer = document.createElement('div');
        supplyContainer.className = 'supply-chain-container';
        supplyContainer.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            transform: translate(-50%, -50%);
            z-index: 500;
            pointer-events: none;
        `;
        
        // Create supply boxes flowing in a chain
        for (let i = 0; i < 5; i++) {
            const supplyBox = document.createElement('div');
            supplyBox.className = 'supply-chain-box';
            supplyBox.innerHTML = '📦';
            
            const angle = (i / 5) * Math.PI * 2;
            const radius = 40;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            supplyBox.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                transform: translate(-50%, -50%);
                font-size: 24px;
                opacity: 0;
                animation: supplyChainFlow ${this.battleManager.getSpeedAdjustedDelay(1200)}ms ease-out forwards;
                animation-delay: ${this.battleManager.getSpeedAdjustedDelay(i * 100)}ms;
            `;
            
            supplyContainer.appendChild(supplyBox);
        }
        
        // Create central card symbol
        const cardSymbol = document.createElement('div');
        cardSymbol.className = 'supply-chain-card';
        cardSymbol.innerHTML = '🃏';
        cardSymbol.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            transform: translate(-50%, -50%);
            font-size: 32px;
            opacity: 0;
            animation: supplyChainCard ${this.battleManager.getSpeedAdjustedDelay(1000)}ms ease-out forwards;
            animation-delay: ${this.battleManager.getSpeedAdjustedDelay(300)}ms;
            filter: drop-shadow(0 0 8px rgba(0, 150, 255, 0.8));
        `;
        
        supplyContainer.appendChild(cardSymbol);
        document.body.appendChild(supplyContainer);
        
        // Remove after animation completes
        setTimeout(() => {
            if (supplyContainer && supplyContainer.parentNode) {
                supplyContainer.remove();
            }
        }, this.battleManager.getSpeedAdjustedDelay(1500));
        
        await this.battleManager.delay(800);
    }

    // Clean up any remaining supply chain effects
    cleanupSupplyChainEffects() {
        const supplyEffects = document.querySelectorAll('.supply-chain-container, .supply-chain-box, .supply-chain-card');
        supplyEffects.forEach(effect => effect.remove());
    }

    // Ensure CSS animations exist for supply chain effects
    ensureSupplyChainCSS() {
        if (document.getElementById('supplyChainSpellCSS')) return;
        
        const style = document.createElement('style');
        style.id = 'supplyChainSpellCSS';
        style.textContent = `
            @keyframes supplyChainFlow {
                0% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                }
                50% { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
                }
                100% { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8) rotate(360deg);
                }
            }
            
            @keyframes supplyChainCard {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.3);
                }
                50% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1.3);
                }
                100% { 
                    opacity: 0.8; 
                    transform: translate(-50%, -50%) scale(1.1);
                }
            }
            
            /* Enhanced visual effects */
            .supply-chain-container,
            .supply-chain-box,
            .supply-chain-card {
                will-change: transform, opacity;
            }
        `;
        
        document.head.appendChild(style);
    }

    // ============================================
    // BATTLE LOG
    // ============================================

    // Log the spell effect to battle log
    logSpellEffect(caster) {
        const casterSide = caster.side;
        const logType = casterSide === 'player' ? 'success' : 'error';
        
        // Main spell effect log
        this.battleManager.addCombatLog(
            `📦 ${this.displayName} secures future supplies! +1 card after battle`,
            logType
        );
    }

    // ============================================
    // GUEST-SIDE HANDLING
    // ============================================

    // Handle supply chain bonus on guest side
    handleGuestSupplyChainBonus(data) {
        const { casterName, bonusCards, totalBonusCards } = data;
        const myAbsoluteSide = this.battleManager.isHost ? 'host' : 'guest';
        const casterLocalSide = (data.casterAbsoluteSide === myAbsoluteSide) ? 'player' : 'opponent';
        const logType = casterLocalSide === 'player' ? 'success' : 'error';
        
        // Add to battle log
        this.battleManager.addCombatLog(
            `📦 ${casterName}'s Supply Chain secures future supplies! +${bonusCards} card after battle`,
            logType
        );
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    // Check if this spell module handles the given spell
    canHandle(spellName) {
        return spellName === this.spellName;
    }

    // Get spell information
    getSpellInfo() {
        return {
            name: this.spellName,
            displayName: this.displayName,
            description: 'Grants 1 bonus card after battle. Each copy usable once per battle.',
            effectFormula: '+1 card after battle per cast',
            targetType: 'self',
            spellSchool: 'SupportMagic',
            usageLimit: 'Once per copy per battle'
        };
    }

    // Cleanup (called when battle ends)
    cleanup() {
        this.cleanupSupplyChainEffects();
        
        // Remove CSS if needed
        const css = document.getElementById('supplyChainSpellCSS');
        if (css) css.remove();
    }
}

// Export for use in spell system
export default SupplyChainSpell;