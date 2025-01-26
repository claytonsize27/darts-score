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
        this.winner = null;
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
            this.moveToNextPlayer();
            this.saveGame();
            return result;
        }

        player.totalScore = newTotal;
        player.rounds.push(score);
       
        if (newTotal === this.targetScore) {
            result = this.handleWin(player);
        } else {
            this.moveToNextPlayer();
        }

        this.saveGame();
        return result;
    }

    handleWin(winner) {
        if (!this.redemptionMode) {
            this.redemptionMode = true;
            this.redemptionPlayers = this.players.filter(p =>
                !p.isEliminated &&
                p !== winner &&
                p.totalScore !== this.targetScore
            );
           
            if (this.redemptionPlayers.length > 0) {
                this.currentPlayerIndex = this.players.findIndex(p => p === this.redemptionPlayers[0]);
                return {
                    message: `${winner.name} hit ${this.targetScore}! Redemption round starts`,
                    redemption: true
                };
            } else {
                return this.handleOvertime([winner]);
            }
        } else {
            const winners = this.players.filter(p =>
                p.totalScore === this.targetScore &&
                !p.isEliminated
            );
           
            if (winners.length > 1) {
                return this.handleOvertime(winners);
            }
           
            return this.declareWinner(winner);
        }
    }

    handleOvertime(winners) {
        const previousScores = new Map();
        this.players.forEach(p => previousScores.set(p, p.totalScore));
       
        this.targetScore += 100;
        this.currentRound = 1;
        this.redemptionMode = false;

        this.players.forEach(p => {
            p.isEliminated = !winners.includes(p);
            if (!p.isEliminated) {
                p.totalScore = previousScores.get(p);
            }
        });

        this.redemptionPlayers = [];
        this.currentPlayerIndex = this.players.findIndex(p => !p.isEliminated);

        return {
            message: `OVERTIME! New target: ${this.targetScore}`,
            winners: winners.map(w => w.name)
        };
    }

    declareWinner(winner) {
        this.gameOver = true;
        this.winner = winner;
        return {
            gameOver: true,
            message: `🏆 ${winner.name} wins! 🏆`
        };
    }

    moveToNextPlayer() {
        const startIndex = this.currentPlayerIndex;
        const activePlayers = this.players.filter(p => !p.isEliminated);
       
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
           
            if (this.currentPlayerIndex === startIndex) {
                if (!this.redemptionMode) this.currentRound++;
                break;
            }
           
        } while (
            this.players[this.currentPlayerIndex].isEliminated ||
            (this.redemptionMode &&
            !this.redemptionPlayers.includes(this.players[this.currentPlayerIndex]))
        );
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
        this.redemptionPlayers = [];
        this.winner = null;
        this.saveGame();
    }

    saveGame() {
        localStorage.setItem('dartsGame', JSON.stringify({
            players: this.players,
            currentState: {
                currentPlayerIndex: this.currentPlayerIndex,
                currentRound: this.currentRound,
                targetScore: this.targetScore,
                redemptionMode: this.redemptionMode,
                redemptionPlayers: this.redemptionPlayers.map(p => this.players.indexOf(p)),
                winner: this.winner ? this.players.indexOf(this.winner) : -1
            }
        }));
    }

    loadGame() {
        const saved = localStorage.getItem('dartsGame');
        if (saved) {
            const data = JSON.parse(saved);
            this.players = data.players;
            const state = data.currentState;
           
            this.currentPlayerIndex = state.currentPlayerIndex;
            this.currentRound = state.currentRound;
            this.targetScore = state.targetScore;
            this.redemptionMode = state.redemptionMode;
            this.redemptionPlayers = state.redemptionPlayers.map(i => this.players[i]);
            this.winner = state.winner >= 0 ? this.players[state.winner] : null;
        }
    }
}

const game = new GameManager();

// UI Elements
const elements = {
    playerEntry: document.getElementById('playerEntry'),
    gameScreen: document.getElementById('gameScreen'),
    gameOver: document.getElementById('gameOver'),
    playerName: document.getElementById('playerName'),
    playerList: document.getElementById('playerList'),
    startBtn: document.querySelector('.start-btn'),
    scoreInput: document.getElementById('scoreInput'),
    currentRound: document.getElementById('currentRound'),
    targetScore: document.getElementById('targetScore'),
    currentPlayerDisplay: document.getElementById('currentPlayerDisplay'),
    scoreboard: document.getElementById('scoreboard'),
    gameMessages: document.getElementById('gameMessages'),
    winnerText: document.getElementById('winnerText')
};

// Event Listeners
elements.playerName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addPlayer();
});

// Game Functions
function addPlayer() {
    if (elements.playerName.value.trim()) {
        game.addPlayer(elements.playerName.value);
        elements.playerName.value = '';
        updatePlayerList();
        elements.startBtn.disabled = game.players.length < 2;
    }
}

function startGame() {
    elements.playerEntry.classList.add('hidden');
    elements.gameScreen.classList.remove('hidden');
    elements.gameOver.classList.add('hidden');
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
        if (result.winners) {
            showMessage(`${result.winners.join(', ')} advance to overtime!`);
        }
        if (result.gameOver) showGameOver(result.message);
    }

    elements.scoreInput.value = '';
    updateGameDisplay();
}

function updateGameDisplay() {
    elements.currentRound.textContent = game.currentRound;
    elements.targetScore.textContent = game.targetScore;

    const currentPlayer = game.players[game.currentPlayerIndex];
    elements.currentPlayerDisplay.innerHTML = `
        <h3>Current Player</h3>
        <div class="player-score ${currentPlayer.isEliminated ? 'eliminated' : ''}">
            <span>${currentPlayer.name}</span>
            <span>${currentPlayer.totalScore}</span>
        </div>
    `;

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
    elements.gameMessages.classList.remove('hidden');
    setTimeout(() => elements.gameMessages.classList.add('hidden'), 3000);
}

function showGameOver(message) {
    elements.gameScreen.classList.add('hidden');
    elements.gameOver.classList.remove('hidden');
    elements.winnerText.textContent = message;
}

function resetGame(keepPlayers) {
    game.resetGame(keepPlayers);
    elements.gameOver.classList.add('hidden');
    if (keepPlayers) {
        startGame();
    } else {
        elements.playerEntry.classList.remove('hidden');
        updatePlayerList();
    }
}

function updatePlayerList() {
    elements.playerList.innerHTML = game.players
        .map(player => `<li>${player.name}</li>`)
        .join('');
}

// Initial Load
if (game.players.length > 0) {
    if (game.gameOver) {
        showGameOver(`Winner: ${game.winner.name}`);
    } else {
        startGame();
    }
}