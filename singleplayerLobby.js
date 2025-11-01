// singleplayerLobby.js - Singleplayer Lobby Configuration Screen

import { getAllHeroes } from './cardDatabase.js';
import { CardPreviewManager } from './cardPreviewManager.js';

export class SingleplayerLobby {
    constructor() {
        this.humanPlayer = null;
        this.cpuPlayers = [];
        this.maxPlayers = 8; // 1 human + 7 CPU
        this.currentPopupPlayer = null;
        this.availableHeroes = [];
        this.cardPreviewManager = new CardPreviewManager();
        
        // Initialize available heroes (non-unobtainable, non-Ascended)
        this.initializeAvailableHeroes();
    }

    initializeAvailableHeroes() {
        const allHeroes = getAllHeroes();
        this.availableHeroes = allHeroes.filter(hero => 
            !hero.unobtainable && hero.subtype !== 'Ascended'
        );
    }

    /**
     * Show the singleplayer lobby screen
     * @param {string} username - The human player's username
     * @param {Function} onStart - Callback when game starts with (humanStartingHero, cpuPlayersConfig)
     * @param {Function} onExit - Callback when user exits lobby
     */
    show(username, onStart, onExit) {
        this.humanPlayer = {
            username: username,
            chosenStartingHero: '', // Empty string means random
            isHuman: true
        };

        // Initialize with one CPU player
        this.cpuPlayers = [{
            username: 'CPU 1',
            chosenStartingHero: '',
            difficulty: 'Normal',
            isHuman: false
        }];

        this.onStartCallback = onStart;
        this.onExitCallback = onExit;

        // Create and show the lobby UI
        this.createLobbyUI();
    }

    createLobbyUI() {
        // Create main lobby container
        const lobbyContainer = document.createElement('div');
        lobbyContainer.id = 'singleplayerLobby';
        lobbyContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 20px;
            box-sizing: border-box;
        `;

        // Title
        const title = document.createElement('h1');
        title.textContent = 'Singleplayer Setup';
        title.style.cssText = `
            color: #fff;
            font-size: 2.5em;
            margin-bottom: 30px;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        `;
        lobbyContainer.appendChild(title);

        // Players container
        const playersContainer = document.createElement('div');
        playersContainer.id = 'lobbyPlayersContainer';
        playersContainer.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            min-width: 600px;
            max-width: 800px;
            max-height: 60vh;
            overflow-y: auto;
            margin-bottom: 20px;
        `;
        lobbyContainer.appendChild(playersContainer);

        // Render all players
        this.renderPlayers(playersContainer);

        // Add CPU button
        const addCPUBtn = document.createElement('button');
        addCPUBtn.id = 'addCPUBtn';
        addCPUBtn.textContent = 'Add CPU Player';
        addCPUBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 1.2em;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 20px;
            transition: background 0.3s;
        `;
        addCPUBtn.onmouseover = () => addCPUBtn.style.background = '#45a049';
        addCPUBtn.onmouseout = () => addCPUBtn.style.background = '#4CAF50';
        addCPUBtn.onclick = () => this.addCPUPlayer(playersContainer);
        
        // Hide button if at max players
        if (this.cpuPlayers.length >= this.maxPlayers - 1) {
            addCPUBtn.style.display = 'none';
        }
        
        lobbyContainer.appendChild(addCPUBtn);

        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 20px;
            align-items: center;
        `;

        // Exit button
        const exitBtn = document.createElement('button');
        exitBtn.textContent = 'Exit';
        exitBtn.style.cssText = `
            background: #f44336;
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 1.3em;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.3s;
        `;
        exitBtn.onmouseover = () => exitBtn.style.background = '#da190b';
        exitBtn.onmouseout = () => exitBtn.style.background = '#f44336';
        exitBtn.onclick = () => this.exitLobby();
        buttonsContainer.appendChild(exitBtn);

        // Start button
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start Game';
        startBtn.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 1.3em;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.3s;
        `;
        startBtn.onmouseover = () => startBtn.style.background = '#0b7dda';
        startBtn.onmouseout = () => startBtn.style.background = '#2196F3';
        startBtn.onclick = () => this.startGame();
        buttonsContainer.appendChild(startBtn);

        lobbyContainer.appendChild(buttonsContainer);

        // Add to document
        document.body.appendChild(lobbyContainer);

        // Add escape key listener for closing popups
        this.escapeKeyListener = (e) => {
            if (e.key === 'Escape') {
                this.closeHeroPopup();
            }
        };
        document.addEventListener('keydown', this.escapeKeyListener);
    }

    renderPlayers(container) {
        container.innerHTML = '';

        // Render human player
        const humanRow = this.createPlayerRow(this.humanPlayer, -1);
        container.appendChild(humanRow);

        // Render CPU players
        this.cpuPlayers.forEach((cpu, index) => {
            const cpuRow = this.createPlayerRow(cpu, index);
            container.appendChild(cpuRow);
        });
    }

    createPlayerRow(player, index) {
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex;
            align-items: center;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            margin-bottom: 10px;
            gap: 15px;
        `;

        // Username
        const username = document.createElement('div');
        username.textContent = player.username;
        username.style.cssText = `
            color: #fff;
            font-size: 1.2em;
            min-width: 150px;
            font-weight: bold;
        `;
        row.appendChild(username);

        // Hero icon box
        const heroBox = this.createHeroBox(player, index);
        row.appendChild(heroBox);

        // Difficulty dropdown (CPU only)
        if (!player.isHuman) {
            const difficultySelect = document.createElement('select');
            difficultySelect.style.cssText = `
                padding: 8px 12px;
                font-size: 1em;
                border-radius: 5px;
                border: 2px solid #4CAF50;
                background: #2a2a3e;
                color: #fff;
                cursor: pointer;
                margin-left: 15px;
            `;
            
            ['Easy', 'Normal', 'Hard'].forEach(diff => {
                const option = document.createElement('option');
                option.value = diff;
                option.textContent = diff;
                if (diff === player.difficulty) {
                    option.selected = true;
                }
                difficultySelect.appendChild(option);
            });

            difficultySelect.onchange = (e) => {
                player.difficulty = e.target.value;
            };

            row.appendChild(difficultySelect);

            // Spacer to push remove button to the right
            const spacer = document.createElement('div');
            spacer.style.flex = '1';
            row.appendChild(spacer);

            // Remove button (only if more than 1 CPU)
            if (this.cpuPlayers.length > 1) {
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '✕';
                removeBtn.style.cssText = `
                    width: 35px;
                    height: 35px;
                    border-radius: 50%;
                    background: #f44336;
                    color: white;
                    border: none;
                    font-size: 1.3em;
                    cursor: pointer;
                    transition: background 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                removeBtn.onmouseover = () => removeBtn.style.background = '#da190b';
                removeBtn.onmouseout = () => removeBtn.style.background = '#f44336';
                removeBtn.onclick = () => this.removeCPUPlayer(index);
                row.appendChild(removeBtn);
            }
        }

        return row;
    }

    createHeroBox(player, index) {
        const box = document.createElement('div');
        box.style.cssText = `
            width: 60px;
            height: 60px;
            border: 3px solid ${player.chosenStartingHero ? '#4CAF50' : '#888'};
            border-radius: 8px;
            background: #1a1a2e;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        `;

        box.onmouseover = () => {
            box.style.transform = 'scale(1.1)';
            box.style.borderColor = '#4CAF50';
        };
        box.onmouseout = () => {
            box.style.transform = 'scale(1)';
            box.style.borderColor = player.chosenStartingHero ? '#4CAF50' : '#888';
        };

        if (player.chosenStartingHero) {
            // Show hero sprite
            const heroInfo = this.availableHeroes.find(h => h.name === player.chosenStartingHero);
            if (heroInfo) {
                const img = document.createElement('img');
                img.src = heroInfo.image;
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                `;
                
                // Add hover preview for hero card
                img.onmouseenter = () => {
                    const cardData = {
                        imagePath: heroInfo.image,
                        displayName: heroInfo.name,
                        cardType: 'character'
                    };
                    this.cardPreviewManager.showCardTooltip(cardData, img);
                };
                
                img.onmouseleave = () => {
                    this.cardPreviewManager.hideCardTooltip();
                };
                
                box.appendChild(img);
            }
        } else {
            // Show question mark
            const qmark = document.createElement('div');
            qmark.textContent = '?';
            qmark.style.cssText = `
                font-size: 2em;
                color: #888;
                font-weight: bold;
            `;
            box.appendChild(qmark);
        }

        box.onclick = () => this.showHeroPopup(player, index);

        return box;
    }

    showHeroPopup(player, index) {
        this.currentPopupPlayer = { player, index };

        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.id = 'heroSelectionPopup';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2500;
        `;

        // Create popup content
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: #2a2a3e;
            border-radius: 15px;
            padding: 30px;
            max-width: 90%;
            width: 600px;
            max-height: 80%;
            overflow-y: auto;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = 'Select Starting Hero';
        title.style.cssText = `
            color: #fff;
            margin-bottom: 20px;
            text-align: center;
        `;
        popup.appendChild(title);

        // Heroes grid
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(6, 80px);
            gap: 15px;
            justify-content: center;
        `;

        // Add question mark option first
        const randomBox = this.createHeroOption(null, player.chosenStartingHero === '');
        grid.appendChild(randomBox);

        // Add all available heroes
        this.availableHeroes.forEach(hero => {
            const isSelected = player.chosenStartingHero === hero.name;
            const heroBox = this.createHeroOption(hero, isSelected);
            grid.appendChild(heroBox);
        });

        popup.appendChild(grid);
        overlay.appendChild(popup);

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                this.closeHeroPopup();
            }
        };

        document.body.appendChild(overlay);
    }

    createHeroOption(hero, isSelected) {
        const box = document.createElement('div');
        box.style.cssText = `
            width: 80px;
            height: 80px;
            border: 3px solid ${isSelected ? '#FFD700' : '#4CAF50'};
            border-radius: 8px;
            background: ${isSelected ? 'rgba(100, 100, 100, 0.5)' : '#1a1a2e'};
            cursor: ${isSelected ? 'default' : 'pointer'};
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
            opacity: ${isSelected ? '0.5' : '1'};
        `;

        if (!isSelected) {
            box.onmouseover = () => {
                box.style.transform = 'scale(1.1)';
                box.style.borderColor = '#FFD700';
            };
            box.onmouseout = () => {
                box.style.transform = 'scale(1)';
                box.style.borderColor = '#4CAF50';
            };
        }

        if (hero) {
            // Hero sprite
            const img = document.createElement('img');
            img.src = hero.image;
            img.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
            `;
            box.appendChild(img);

            // Add hover preview for hero card (not for question mark)
            img.onmouseenter = () => {
                const cardData = {
                    imagePath: hero.image,
                    displayName: hero.name,
                    cardType: 'character'
                };
                this.cardPreviewManager.showCardTooltip(cardData, img);
            };
            
            img.onmouseleave = () => {
                this.cardPreviewManager.hideCardTooltip();
            };

            // Hero name tooltip
            const tooltip = document.createElement('div');
            tooltip.textContent = hero.name;
            tooltip.style.cssText = `
                position: absolute;
                bottom: -25px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 0.8em;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
                z-index: 10;
            `;
            box.appendChild(tooltip);

            box.onmouseover = () => {
                if (!isSelected) {
                    box.style.transform = 'scale(1.1)';
                    box.style.borderColor = '#FFD700';
                    tooltip.style.opacity = '1';
                }
            };
            box.onmouseout = () => {
                if (!isSelected) {
                    box.style.transform = 'scale(1)';
                    box.style.borderColor = '#4CAF50';
                    tooltip.style.opacity = '0';
                }
            };

            if (!isSelected) {
                box.onclick = () => this.selectHero(hero.name);
            }
        } else {
            // Question mark (random) - NO hover preview
            const qmark = document.createElement('div');
            qmark.textContent = '?';
            qmark.style.cssText = `
                font-size: 2.5em;
                color: #888;
                font-weight: bold;
            `;
            box.appendChild(qmark);

            if (!isSelected) {
                box.onclick = () => this.selectHero('');
            }
        }

        return box;
    }

    selectHero(heroName) {
        if (this.currentPopupPlayer) {
            this.currentPopupPlayer.player.chosenStartingHero = heroName;
            this.closeHeroPopup();
            
            // Re-render players to update the UI
            const container = document.getElementById('lobbyPlayersContainer');
            if (container) {
                this.renderPlayers(container);
            }
        }
    }

    closeHeroPopup() {
        const popup = document.getElementById('heroSelectionPopup');
        if (popup) {
            popup.remove();
        }
        this.currentPopupPlayer = null;
        
        // Clean up any card tooltips
        this.cardPreviewManager.hideCardTooltip();
    }

    addCPUPlayer(container) {
        if (this.cpuPlayers.length >= this.maxPlayers - 1) {
            return;
        }

        const newCPU = {
            username: `CPU ${this.cpuPlayers.length + 1}`,
            chosenStartingHero: '',
            difficulty: 'Normal',
            isHuman: false
        };

        this.cpuPlayers.push(newCPU);
        this.renderPlayers(container);

        // Update add button visibility
        const addBtn = document.getElementById('addCPUBtn');
        if (addBtn && this.cpuPlayers.length >= this.maxPlayers - 1) {
            addBtn.style.display = 'none';
        }
    }

    removeCPUPlayer(index) {
        if (this.cpuPlayers.length <= 1) {
            return; // Can't remove the last CPU
        }

        this.cpuPlayers.splice(index, 1);

        // Renumber remaining CPUs
        this.cpuPlayers.forEach((cpu, i) => {
            cpu.username = `CPU ${i + 1}`;
        });

        // Re-render
        const container = document.getElementById('lobbyPlayersContainer');
        if (container) {
            this.renderPlayers(container);
        }

        // Update add button visibility
        const addBtn = document.getElementById('addCPUBtn');
        if (addBtn && this.cpuPlayers.length < this.maxPlayers - 1) {
            addBtn.style.display = 'block';
        }
    }

    exitLobby() {
        // Clean up all data
        this.humanPlayer = null;
        this.cpuPlayers = [];
        this.currentPopupPlayer = null;
        
        // Clean up UI
        this.cleanup();
        
        // Call the exit callback to return to main menu
        if (this.onExitCallback) {
            this.onExitCallback();
        }
    }

    startGame() {
        // Clean up
        this.cleanup();

        // Prepare configuration
        const config = {
            humanStartingHero: this.humanPlayer.chosenStartingHero,
            cpuPlayers: this.cpuPlayers.map(cpu => ({
                startingHero: cpu.chosenStartingHero,
                difficulty: cpu.difficulty
            }))
        };

        // Call the callback
        if (this.onStartCallback) {
            this.onStartCallback(config);
        }
    }

    cleanup() {
        // Remove lobby UI
        const lobby = document.getElementById('singleplayerLobby');
        if (lobby) {
            lobby.remove();
        }

        // Remove popup if open
        this.closeHeroPopup();

        // Remove escape key listener
        if (this.escapeKeyListener) {
            document.removeEventListener('keydown', this.escapeKeyListener);
        }
        
        // Clean up any card tooltips
        this.cardPreviewManager.hideCardTooltip();
    }
}