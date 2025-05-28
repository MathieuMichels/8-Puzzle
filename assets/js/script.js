// Global variable for the chart - declare it before any usage
let puzzleChart;

class PuzzleGame {
    constructor() {
        this.grid = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // 0 represents empty space
        this.goalState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
        this.moves = 0;
        this.minMoves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.issolving = false;
        this.solvingInterval = null;
        this.solutionCache = new Map(); // Cache pour stocker les solutions calculées
        
        // Ajuster la grille en fonction de la taille de l'écran
        this.resizeGrid();
        window.addEventListener('resize', () => this.resizeGrid());
        
        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        this.renderGrid();
        this.updateMoveCount();
        this.startTimer();
        this.updateMinMovesCount();
    }

    setupEventListeners() {
        document.getElementById('shuffleBtn').addEventListener('click', () => this.shufflePuzzle());
        document.getElementById('solveBtn').addEventListener('click', () => this.solvePuzzle());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopSolving());
    }

    renderGrid() {
        const gridElement = document.getElementById('puzzleGrid');
        gridElement.innerHTML = '';
        
        // Déterminer la taille des tuiles en fonction de la taille de la grille
        const gridWidth = gridElement.clientWidth;
        const tileSize = (gridWidth / 3) - 10; // 10px est la valeur du gap
        const gap = 10;

        this.grid.forEach((value, index) => {
            if (value === 0) return; // Skip empty space
            
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = value;
            tile.dataset.value = value;
            tile.dataset.index = index;
            
            // Calculate position
            const row = Math.floor(index / 3);
            const col = index % 3;
            const x = col * (tileSize + gap);
            const y = row * (tileSize + gap);
            
            // Appliquer la taille calculée
            tile.style.width = `${tileSize}px`;
            tile.style.height = `${tileSize}px`;
            tile.style.left = `${x}px`;
            tile.style.top = `${y}px`;
            tile.style.transform = `translate(0, 0)`;
            
            // Add click functionality
            tile.addEventListener('click', () => {
                if (!this.issolving) {
                    this.moveTile(index);
                }
            });
            
            gridElement.appendChild(tile);
        });
    }
    
    resizeGrid() {
        const gridElement = document.getElementById('puzzleGrid');
        if (!gridElement) return;
        
        // Ajuster la hauteur pour correspondre à la largeur (carré)
        const width = gridElement.clientWidth;
        gridElement.style.height = `${width}px`;
        
        // Redessiner la grille avec les nouvelles dimensions
        if (this.grid) {
            this.renderGrid();
        }
    }

    moveTile(index) {
        if (this.isCanMove(index)) {
            const emptyIndex = this.grid.indexOf(0);
            
            // Swap tiles
            [this.grid[index], this.grid[emptyIndex]] = [this.grid[emptyIndex], this.grid[index]];
            
            this.moves++;
            this.updateMoveCount();
            this.renderGrid();
            
            // Highlight moved tile briefly
            setTimeout(() => {
                const movedTile = document.querySelector(`[data-value="${this.grid[emptyIndex]}"]`);
                if (movedTile) {
                    movedTile.classList.add('highlight');
                    setTimeout(() => movedTile.classList.remove('highlight'), 600);
                }
            }, 100);

            this.checkWin();
            
            // Exécuter les calculs potentiellement lourds de façon asynchrone
            setTimeout(() => {
                this.updateMinMovesCount();
                this.updateChartData();
            }, 0);
        }
    }

    isCanMove(index) {
        const emptyIndex = this.grid.indexOf(0);
        const row = Math.floor(index / 3);
        const col = index % 3;
        const emptyRow = Math.floor(emptyIndex / 3);
        const emptyCol = emptyIndex % 3;

        return (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
                (Math.abs(col - emptyCol) === 1 && row === emptyRow);
    }

    shufflePuzzle() {
        this.stopSolving();
        
        // Generate a solvable random state
        do {
            this.grid = [...this.goalState];
            for (let i = this.grid.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.grid[i], this.grid[j]] = [this.grid[j], this.grid[i]];
            }
        } while (!this.isSolvable() || this.isWon());

        this.moves = 0;
        this.updateMoveCount();
        this.renderGrid();
        this.updateStatus("Puzzle mélangé ! Résolvez-le en cliquant sur les tuiles.");
        this.startTimer();
        
        // Calcul asynchrone après le mélange
        setTimeout(() => {
            this.updateMinMovesCount();
            if (typeof puzzleChart !== 'undefined') {
                puzzleChart.resetChart();
                this.updateChartData();
            }
        }, 0);
    }

    isSolvable() {
        let inversions = 0;
        const flatGrid = this.grid.filter(x => x !== 0);
        
        for (let i = 0; i < flatGrid.length - 1; i++) {
            for (let j = i + 1; j < flatGrid.length; j++) {
                if (flatGrid[i] > flatGrid[j]) {
                    inversions++;
                }
            }
        }
        
        return inversions % 2 === 0;
    }

    checkWin() {
        if (this.isWon()) {
            this.stopTimer();
            this.updateStatus("🎉 Félicitations ! Puzzle résolu !", "success");
        }
    }

    isWon() {
        return JSON.stringify(this.grid) === JSON.stringify(this.goalState);
    }

    solvePuzzle() {
        if (this.isWon()) {
            this.updateStatus("Le puzzle est déjà résolu !", "success");
            return;
        }

        this.issolving = true;
        this.updateStatus("🤖 Résolution en cours...", "solving");
        
        const solution = this.aStar();
        if (solution) {
            this.animateSolution(solution);
        } else {
            this.updateStatus("Impossible de résoudre ce puzzle.");
            this.issolving = false;
        }
    }

    // Méthode optimisée pour calculer le minimum de coups
    calculateMinMoves() {
        if (this.isWon()) {
            return 0;
        }
        
        // Utiliser une clé unique pour le cache basée sur l'état actuel
        const stateKey = JSON.stringify(this.grid);
        
        // Vérifier si nous avons déjà calculé la solution pour cet état
        if (this.solutionCache.has(stateKey)) {
            return this.solutionCache.get(stateKey);
        }
        
        // Limiter la profondeur de recherche pour une exécution plus rapide
        const solution = this.aStarLimited(25); // Limite à 25 mouvements maximum
        const moveCount = solution ? solution.length : 0;
        
        // Mettre en cache le résultat
        this.solutionCache.set(stateKey, moveCount);
        
        return moveCount;
    }
    
    // Version plus rapide et limitée de l'algorithme A*
    aStarLimited(maxDepth) {
        const openSet = [{state: [...this.grid], path: [], f: 0, g: 0}];
        const closedSet = new Set();
        let nodesExplored = 0;
        const maxNodes = 5000; // Limite du nombre de nœuds à explorer

        while (openSet.length > 0 && nodesExplored < maxNodes) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            nodesExplored++;

            if (JSON.stringify(current.state) === JSON.stringify(this.goalState)) {
                return current.path;
            }
            
            // Ne pas explorer trop profondément
            if (current.g >= maxDepth) continue;

            closedSet.add(JSON.stringify(current.state));

            const neighbors = this.getNeighbors(current.state);
            for (const neighbor of neighbors) {
                const stateStr = JSON.stringify(neighbor.state);
                if (closedSet.has(stateStr)) continue;

                const g = current.g + 1;
                const h = this.manhattanDistance(neighbor.state);
                const f = g + h;

                // Simplifier la recherche pour améliorer les performances
                const existingNodeIndex = openSet.findIndex(node => JSON.stringify(node.state) === stateStr);
                if (existingNodeIndex !== -1 && g < openSet[existingNodeIndex].g) {
                    openSet[existingNodeIndex].g = g;
                    openSet[existingNodeIndex].f = f;
                    openSet[existingNodeIndex].path = [...current.path, neighbor.move];
                } else if (existingNodeIndex === -1) {
                    openSet.push({
                        state: neighbor.state,
                        path: [...current.path, neighbor.move],
                        f: f,
                        g: g
                    });
                }
            }
        }
        
        // Si on ne trouve pas de solution complète, utiliser une estimation
        if (openSet.length > 0) {
            return openSet[0].path;
        }
        
        return null;
    }

    aStar() {
        const openSet = [{state: [...this.grid], path: [], f: 0, g: 0}];
        const closedSet = new Set();

        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();

            if (JSON.stringify(current.state) === JSON.stringify(this.goalState)) {
                return current.path;
            }

            closedSet.add(JSON.stringify(current.state));

            const neighbors = this.getNeighbors(current.state);
            for (const neighbor of neighbors) {
                const stateStr = JSON.stringify(neighbor.state);
                if (closedSet.has(stateStr)) continue;

                const g = current.g + 1;
                const h = this.manhattanDistance(neighbor.state);
                const f = g + h;

                const existingNode = openSet.find(node => JSON.stringify(node.state) === stateStr);
                if (!existingNode || g < existingNode.g) {
                    if (existingNode) {
                        existingNode.g = g;
                        existingNode.f = f;
                        existingNode.path = [...current.path, neighbor.move];
                    } else {
                        openSet.push({
                            state: neighbor.state,
                            path: [...current.path, neighbor.move],
                            f: f,
                            g: g
                        });
                    }
                }
            }
        }
        return null;
    }

    getNeighbors(state) {
        const neighbors = [];
        const emptyIndex = state.indexOf(0);
        const moves = [
            {index: emptyIndex - 3, move: emptyIndex - 3}, // Up
            {index: emptyIndex + 3, move: emptyIndex + 3}, // Down
            {index: emptyIndex % 3 !== 0 ? emptyIndex - 1 : -1, move: emptyIndex - 1}, // Left
            {index: emptyIndex % 3 !== 2 ? emptyIndex + 1 : -1, move: emptyIndex + 1}  // Right
        ];

        for (const move of moves) {
            if (move.index >= 0 && move.index < 9) {
                const newState = [...state];
                [newState[emptyIndex], newState[move.index]] = [newState[move.index], newState[emptyIndex]];
                neighbors.push({state: newState, move: move.move});
            }
        }

        return neighbors;
    }

    manhattanDistance(state) {
        let distance = 0;
        for (let i = 0; i < 9; i++) {
            if (state[i] !== 0) {
                const currentRow = Math.floor(i / 3);
                const currentCol = i % 3;
                const goalIndex = this.goalState.indexOf(state[i]);
                const goalRow = Math.floor(goalIndex / 3);
                const goalCol = goalIndex % 3;
                distance += Math.abs(currentRow - goalRow) + Math.abs(currentCol - goalCol);
            }
        }
        return distance;
    }

    animateSolution(solution) {
        let step = 0;
        
        this.solvingInterval = setInterval(() => {
            if (step >= solution.length || !this.issolving) {
                this.stopSolving();
                if (step >= solution.length) {
                    this.updateStatus("🎉 Puzzle résolu automatiquement !", "success");
                    this.stopTimer();
                }
                return;
            }

            const moveIndex = solution[step];
            this.moveTile(moveIndex);
            step++;
        }, 500);
    }

    stopSolving() {
        this.issolving = false;
        if (this.solvingInterval) {
            clearInterval(this.solvingInterval);
            this.solvingInterval = null;
        }
        if (!this.isWon()) {
            this.updateStatus("Résolution arrêtée.");
        }
    }

    updateMinMovesCount() {
        // Utiliser requestAnimationFrame pour s'assurer que l'UI est mise à jour avant le calcul
        requestAnimationFrame(() => {
            this.minMoves = this.calculateMinMoves();
            document.getElementById('minMoves').textContent = this.minMoves;
        });
    }
    
    updateChartData() {
        // Mettre à jour le graphique de façon non-bloquante
        if (typeof puzzleChart !== 'undefined') {
            requestAnimationFrame(() => {
                puzzleChart.updateChart(this.moves, this.minMoves);
            });
        }
    }

    updateMoveCount() {
        document.getElementById('moveCount').textContent = this.moves;
    }

    startTimer() {
        this.startTime = Date.now();
        this.updateTimer();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimer() {
        if (!this.startTime) return;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    }

    updateStatus(message, type = '') {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }
}

// Initialize the game and chart when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const game = new PuzzleGame();
    // Initialize the chart after the game
    puzzleChart = new PuzzleChart();
    // Add initial data point
    game.updateChartData();
});