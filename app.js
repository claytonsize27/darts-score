class GameManager {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.currentRound = 1;
        this.targetScore = 301;
        this.originalTarget = 301;
        this.gameOver = false;
        this.redemptionMode = false;
        this.redemptionPlayers = [];
        this.loadGame();
    }

    addPlayer(name) {
        this.players.push({
            name: name.trim(),
            totalScore: 0,
            rounds: [],
            isEliminated: false
        });
        this.saveGame();
    }

    submitScore(score) {
        const player = this.players[this.currentPlayerIndex];
        if (player.isEliminated) return;

        const newTotal = player.totalScore + score;
        let result = {};

        if (newTotal > this.targetScore) {
            result = { bust: true, message: "BUST! Score reset" };
        } else {
            player.totalScore = newTotal;
            player.rounds.push(score);
           
            if (newTotal === this.targetScore) {
                result = this.handleWin(player);
            } else {
                this.moveToNextPlayer();
            }
        }

        this.saveGame();
        return result;
    }

    handleWin(winner) {
        if (!this.redemptionMode) {
            this.redemptionMode = true;
            this.redemptionPlayers = this.players.filter(p => !p.isEliminated && p !== winner);
            return {
                message: `${winner.name} hit 301! Redemption round starts`,
                redemption: true
            };
        } else {
            this.redemptionPlayers = this.redemptionPlayers.filter(p => p !== winner);
            if (this.redemptionPlayers.length === 0) {
                return this.handleOvertime();
            }
        }
        return {};
    }

    handleOvertime() {
        this.targetScore += 100;
        this.currentRound = 1;
        this.redemptionMode = false;
        this.players.forEach(p => p.isEliminated = p.totalScore !== this.targetScore);
        return {
            message: `OVERTIME! New target: ${this.targetScore}`
        };
    }

    moveToNextPlayer() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].isEliminated);
       
        if (this.currentPlayerIndex === 0) this.currentRound++;
    }

    resetGame(keepPlayers) {
        if (keepPlayers) {
            this.players = this.players.map(p => ({
                ...p,
                totalScore: 0,
                rounds: [],
                isEliminated: false
            }));
        } else {
            this.players = [];
        }
        this.currentPlayerIndex = 0;
        this.currentRound = 1;
        this.targetScore = this.originalTarget;
        this.gameOver = false;
        this.redemptionMode = false;
        this.saveGame();
    }

    saveGame() {
        localStorage.setItem('dartsGame', JSON.stringify({
            players: this.players,
            currentState: {
                currentPlayerIndex: this.currentPlayerIndex,
                currentRound: this.currentRound,
                targetScore: this.targetScore,
                redemptionMode: this.redemptionMode
            }
        }));
    }

    loadGame() {
        const saved = localStorage.getItem('dartsGame');
        if (saved) {
            const data = JSON.parse(saved);
            this.players = data.players;
            Object.assign(this, data.currentState);
        }
    }
}

// UI Controller
const game = new GameManager();

// DOM Elements
const elements = {
    playerList: document.getElementById('playerList'),
    scoreInput: document.getElementById('scoreInput'),
    currentRound: document.getElementById('currentRound'),
    targetScore: document.getElementById('targetScore'),
    currentPlayerDisplay: document.getElementById('currentPlayerDisplay'),
    scoreboard: document.getElementById('scoreboard'),
    gameMessages: document.getElementById('gameMessages')
};

// Event Listeners
document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addPlayer();
});

// Game Functions
function addPlayer() {
    const nameInput = document.getElementById('playerName');
    if (nameInput.value.trim()) {
        game.addPlayer(nameInput.value);
        nameInput.value = '';
        updatePlayerList();
        document.querySelector('.start-btn').disabled = game.players.length < 1;
    }
}

function startGame() {
    document.getElementById('playerEntry').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    updateGameDisplay();
}

function submitScore() {
    const score = parseInt(elements.scoreInput.value);
    if (isNaN(score) || score < 0) return;

    const result = game.submitScore(score);
   
    if (result.bust) {
        showMessage(result.message, true);
        elements.scoreInput.classList.add('bust');
        setTimeout(() => elements.scoreInput.classList.remove('bust'), 500);
    } else if (result.message) {
        showMessage(result.message);
        if (result.redemption) startRedemptionRound();
    }

    elements.scoreInput.value = '';
    updateGameDisplay();
}

function updateGameDisplay() {
    elements.currentRound.textContent = game.currentRound;
    elements.targetScore.textContent = game.targetScore;
   
    // Current Player Display
    const currentPlayer = game.players[game.currentPlayerIndex];
    elements.currentPlayerDisplay.innerHTML = `
        <h3>Current Player</h3>
        <div class="player-score">
            <span>${currentPlayer.name}</span>
            <span>${currentPlayer.totalScore}</span>
        </div>
    `;

    // Scoreboard
    elements.scoreboard.innerHTML = game.players
        .map(player => `
            <div class="player-score ${player.isEliminated ? 'eliminated' : ''}">
                <span>${player.name}</span>
                <span>${player.totalScore}</span>
            </div>
        `).join('');
}

function showMessage(text, isError = false) {
    elements.gameMessages.textContent = text;
    elements.gameMessages.style.color = isError ? '#ff3b30' : '#007AFF';
    setTimeout(() => elements.gameMessages.textContent = '', 3000);
}

// Initialize UI
function updatePlayerList() {
    elements.playerList.innerHTML = game.players
        .map(player => `<li>${player.name}</li>`)
        .join('');
}

// Load existing game on start
if (game.players.length > 0) {
    startGame();
} else {
    document.getElementById('loading').remove();
}