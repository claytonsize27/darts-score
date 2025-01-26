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
        this.currentRedemptionIndex = 0;
        this.initialWinner = null;
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
            result.message = `${player.name} hit ${this.targetScore}!`;
            if (!this.redemptionMode) {
                result = this.handleInitialWin(player);
            } else {
                player.totalScore = this.targetScore; // Force exact score display
            }
        }

        if (this.redemptionMode) {
            result = this.handleRedemptionProgress(player);
        } else {
            this.moveToNextPlayer();
        }

        this.saveGame();
        return result;
    }

    handleInitialWin(winner) {
        this.redemptionMode = true;
        this.initialWinner = winner;
        this.redemptionPlayers = this.players.filter(p =>
            !p.isEliminated &&
            p !== winner &&
            p.totalScore !== this.targetScore
        );
        this.currentRedemptionIndex = 0;

        if (this.redemptionPlayers.length > 0) {
            this.currentPlayerIndex = this.players.findIndex(p => p === this.redemptionPlayers[0]);
            return {
                message: `${winner.name} hit ${this.targetScore}! Redemption round starts`,
                redemption: true
            };
        }
        return this.handleOvertime([winner]);
    }

    handleRedemptionProgress(currentPlayer) {
        let result = {};
       
        if (currentPlayer.totalScore === this.targetScore) {
            currentPlayer.totalScore = this.targetScore; // Force update
        }

        this.currentRedemptionIndex++;
       
        if (this.currentRedemptionIndex < this.redemptionPlayers.length) {
            this.currentPlayerIndex = this.players.findIndex(
                p => p === this.redemptionPlayers[this.currentRedemptionIndex]
            );
        } else {
            const redemptionWinners = this.players.filter(p =>
                p.totalScore === this.targetScore &&
                !p.isEliminated
            );
            const allWinners = [this.initialWinner, ...redemptionWinners];
            const uniqueWinners = [...new Set(allWinners)];

            if (uniqueWinners.length > 1) {
                result = this.handleOvertime(uniqueWinners);
            } else {
                result = this.declareWinner(uniqueWinners[0]);
            }
        }
        return result;
    }

    handleOvertime(winners) {
        const previousScores = new Map();
        winners.forEach(w => {
            previousScores.set(w, w.totalScore);
            w.totalScore = this.targetScore; // Maintain exact score display
        });

        this.targetScore += 100;
        this.currentRound = 1;
        this.redemptionMode = false;
        this.redemptionPlayers = [];

        this.players.forEach(p => {
            p.isEliminated = !winners.includes(p);
            if (!p.isEliminated) {
                p.totalScore = previousScores.get(p);
            }
        });

        const activePlayers = this.players.filter(p => !p.isEliminated);
        this.currentPlayerIndex = activePlayers.length > 0 ?
            this.players.findIndex(p => p === activePlayers[0]) : 0;

        return {
            message: `OVERTIME! New target: ${this.targetScore}`,
            winners: winners.map(w => w.name),
            gameOver: false
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
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            if (this.currentPlayerIndex === startIndex) this.currentRound++;
        } while (this.players[this.currentPlayerIndex].isEliminated);
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
        this.initialWinner = null;
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
                initialWinner: this.initialWinner ? this.players.indexOf(this.initialWinner) : -1,
                winner: this.winner ? this.players.indexOf(this.winner) : -1
            }
        }));
    }

    loadGame() {
        const saved = localStorage.getItem('dartsGame');
        if (saved) {
            const data = JSON.parse(saved);
            this.players = data.players || [];
            const state = data.currentState || {};
           
            this.currentPlayerIndex = state.currentPlayerIndex || 0;
            this.currentRound = state.currentRound || 1;
            this.targetScore = state.targetScore || 301;
            this.redemptionMode = state.redemptionMode || false;
            this.redemptionPlayers = (state.redemptionPlayers || [])
                .map(i => this.players[i])
                .filter(p => p);
            this.initialWinner = state.initialWinner >= 0 ?
                this.players[state.initialWinner] : null;
            this.winner = state.winner >= 0 ?
                this.players[state.winner] : null;
        }
    }
}

// UI Controller
const game = new GameManager();

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

elements.playerName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addPlayer();
});

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
            setTimeout(() => {
                showMessage(`${result.winners.join(', ')} advance to overtime!`);
                updateGameDisplay();
            }, 50);
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
    if (currentPlayer) {
        elements.currentPlayerDisplay.innerHTML = `
            <h3>Current Player</h3>
            <div class="player-score ${currentPlayer.isEliminated ? 'eliminated' : ''}">
                <span>${currentPlayer.name}</span>
                <span>${currentPlayer.totalScore}</span>
            </div>
        `;
    }

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
        showGameOver(game.winner ? `Winner: ${game.winner.name}` : "Game Over");
    } else {
        startGame();
    }
} else {
    document.getElementById('loading').remove();
}