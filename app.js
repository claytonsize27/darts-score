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
        this.initialWinners = [];
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
            player.totalScore = this.targetScore; // Lock score at target
            if (!this.redemptionMode) {
                result = this.handleInitialWin(player);
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
        this.initialWinners = [winner];
        this.redemptionPlayers = this.players.filter(p =>
            !p.isEliminated &&
            p !== winner &&
            p.totalScore !== this.targetScore
        );

        if (this.redemptionPlayers.length > 0) {
            this.currentPlayerIndex = this.players.indexOf(this.redemptionPlayers[0]);
            return {
                message: `🎯 ${winner.name} hit ${this.targetScore}! REDEMPTION ROUND STARTS 🎯`,
                redemption: true
            };
        }
        return this.handleOvertime(this.initialWinners);
    }

    handleRedemptionProgress(currentPlayer) {
        const currentIndex = this.redemptionPlayers.indexOf(currentPlayer);
        let nextIndex = currentIndex + 1;

        if (nextIndex < this.redemptionPlayers.length) {
            this.currentPlayerIndex = this.players.indexOf(this.redemptionPlayers[nextIndex]);
            return { continue: true };
        }

        const redemptionWinners = this.redemptionPlayers.filter(p =>
            p.totalScore === this.targetScore
        );

        if (redemptionWinners.length > 0) {
            const allWinners = [...this.initialWinners, ...redemptionWinners];
            const uniqueWinners = [...new Set(allWinners)];
            return this.handleOvertime(uniqueWinners);
        }

        return this.declareWinner(this.initialWinners[0]);
    }

    handleOvertime(winners) {
        const previousScores = new Map();
        winners.forEach(w => {
            previousScores.set(w, w.totalScore);
            w.totalScore = this.targetScore;
        });

        const newTarget = this.targetScore + 100;
        this.targetScore = newTarget;
        this.currentRound = 1;
        this.redemptionMode = true;
        this.initialWinners = winners;
        this.redemptionPlayers = winners.filter(p => !p.isEliminated);

        winners.forEach(w => w.totalScore = previousScores.get(w));

        if (this.redemptionPlayers.length === 0) {
            return this.declareWinner(null);
        }

        this.currentPlayerIndex = this.players.indexOf(this.redemptionPlayers[0]);

        return {
            message: `🚨 OVERTIME! New target: ${this.targetScore} - REDEMPTION ROUND STARTS 🚨`,
            winners: this.redemptionPlayers.map(p => p.name),
            gameOver: false
        };
    }

    declareWinner(winner) {
        if (!winner) {
            this.gameOver = true;
            return {
                gameOver: true,
                message: "Game Over! No winners"
            };
        }

        this.gameOver = true;
        this.winner = winner;
        return {
            gameOver: true,
            message: `🏆 ${winner.name} WINS! 🏆`
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
        this.initialWinners = [];
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
                initialWinners: this.initialWinners.map(w => this.players.indexOf(w)),
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
            this.initialWinners = (state.initialWinners || [])
                .map(i => this.players[i])
                .filter(p => p);
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
        if (result.gameOver) {
            showGameOver(result.message);
        } else if (result.redemption) {
            setTimeout(() => updateGameDisplay(), 50);
        }
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
    setTimeout(() => elements.gameMessages.classList.add('hidden'), 4000);
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