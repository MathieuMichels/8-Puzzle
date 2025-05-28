let puzzleChart;

class PuzzleGame {
    constructor() {
        this.grid = [1, 2, 3, 4, 5, 6, 7, 8, 0];
        this.goalState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
        this.moves = 0;
        this.minMoves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.issolving = false;
        this.solvingInterval = null;
        this.solutionCache = new Map();
        this.stateCache = new Map();
        this.pathCache = new Map();
        this.globalNodeCounter = 0;
        this.patternDatabase = {};
        
        this.loadMovesCache();
        this.buildPatternDatabase();
        this.resizeGrid();
        window.addEventListener('resize', () => this.resizeGrid());
        this.initializeGame();
        this.setupEventListeners();
    }
    
    static movesCache = {};
    
    loadMovesCache() {
        try {
            const cachedData = localStorage.getItem('puzzleMovesCache');
            if (cachedData) {
                PuzzleGame.movesCache = JSON.parse(cachedData);
                console.log(`Cache loaded with ${Object.keys(PuzzleGame.movesCache).length} configuration files`);
            }
        } catch (error) {
            console.warn("Unable to load cache from localStorage:", error);
            PuzzleGame.movesCache = {};
        }
    }
    
    saveMovesCache() {
        try {
            localStorage.setItem('puzzleMovesCache', JSON.stringify(PuzzleGame.movesCache));
            console.log(`Cache saved with ${Object.keys(PuzzleGame.movesCache).length} configuration files`);
        } catch (error) {
            console.warn("Unable to save cache to localStorage:", error);
        }
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
        
        const difficultySelect = document.getElementById('difficulty');
        const customMovesContainer = document.getElementById('customMovesContainer');
        
        const toggleCustomMovesVisibility = () => {
            if (difficultySelect.value === 'custom') {
                customMovesContainer.style.display = 'block';
            } else {
                customMovesContainer.style.display = 'none';
            }
        };
        
        toggleCustomMovesVisibility();
        
        difficultySelect.addEventListener('change', (e) => {
            console.log(`Difficulty level changed: ${e.target.value}`);
            toggleCustomMovesVisibility();
        });
    }    renderGrid() {
        const gridElement = document.getElementById('puzzleGrid');
        gridElement.innerHTML = '';
        
        const gridWidth = gridElement.clientWidth;
        const tileSize = (gridWidth / 3) - 10;
        const gap = 10;

        this.grid.forEach((value, index) => {
            if (value === 0) return;

            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = value;
            tile.dataset.value = value;
            tile.dataset.index = index;
            
            const row = Math.floor(index / 3);
            const col = index % 3;
            const x = col * (tileSize + gap);
            const y = row * (tileSize + gap);
            
            tile.style.width = `${tileSize}px`;
            tile.style.height = `${tileSize}px`;
            tile.style.left = `${x}px`;
            tile.style.top = `${y}px`;
            tile.style.transform = `translate(0, 0)`;
            
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
        
        const width = gridElement.clientWidth;
        gridElement.style.height = `${width}px`;
        
        if (this.grid) {
            this.renderGrid();
        }
    }

    moveTile(index) {
        if (this.isCanMove(index)) {
            const emptyIndex = this.grid.indexOf(0);
            
            [this.grid[index], this.grid[emptyIndex]] = [this.grid[emptyIndex], this.grid[index]];
            
            this.moves++;
            this.updateMoveCount();
            this.renderGrid();
            
            setTimeout(() => {
                const movedTile = document.querySelector(`[data-value="${this.grid[emptyIndex]}"]`);
                if (movedTile) {
                    movedTile.classList.add('highlight');
                    setTimeout(() => movedTile.classList.remove('highlight'), 600);
                }
            }, 100);

            this.checkWin();
            
            setTimeout(() => {
                console.group(`Analysis after move (move #${this.moves})`);
                console.log(`Total nodes explored since start: ${this.globalNodeCounter}`);
                this.updateMinMovesCount();
                this.updateChartData();
                console.groupEnd();
            }, 50);
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

    buildPatternDatabase() {
        const group1 = [1, 2, 3, 4];
        const group2 = [5, 6, 7, 8];
        
        this.patternDatabase = {
            group1: this.precomputePatternCosts(group1),
            group2: this.precomputePatternCosts(group2)
        };
        
        console.log("Pattern database built to improve heuristic");
    }
    
    precomputePatternCosts(tiles) {
        const db = new Map();
        const goalPositions = {};
        for (let i = 0; i < this.goalState.length; i++) {
            const value = this.goalState[i];
            if (tiles.includes(value)) {
                goalPositions[value] = i;
            }
        }
        
        return {
            goalPositions,
            getPatternDistance: (state) => {
                let distance = 0;
                for (const tile of tiles) {
                    const currentPos = state.indexOf(tile);
                    if (currentPos !== -1 && goalPositions[tile] !== undefined) {
                        const currentRow = Math.floor(currentPos / 3);
                        const currentCol = currentPos % 3;
                        const goalPos = goalPositions[tile];
                        const goalRow = Math.floor(goalPos / 3);
                        const goalCol = goalPos % 3;
                        distance += Math.abs(currentRow - goalRow) + Math.abs(currentCol - goalCol);
                    }
                }
                return distance;
            }
        };
    }

    enhancedHeuristic(state) {
        return this.manhattanDistance(state);
    }
    
    countLinearConflicts(state) {
        let conflicts = 0;
        
        for (let row = 0; row < 3; row++) {
            conflicts += this.findConflictsInLine(state, row, true);
        }
        
        for (let col = 0; col < 3; col++) {
            conflicts += this.findConflictsInLine(state, col, false);
        }
        
        return conflicts;
    }
    
    findConflictsInLine(state, lineIndex, isRow) {
        const tilesInLine = [];
        
        for (let i = 0; i < 3; i++) {
            const index = isRow ? lineIndex * 3 + i : i * 3 + lineIndex;
            const tile = state[index];
            if (tile !== 0) {
                const goalIndex = this.goalState.indexOf(tile);
                const goalLineIndex = isRow ? Math.floor(goalIndex / 3) : goalIndex % 3;
                
                if (goalLineIndex === lineIndex) {
                    tilesInLine.push({
                        tile,
                        currentPos: i,
                        goalPos: isRow ? goalIndex % 3 : Math.floor(goalIndex / 3)
                    });
                }
            }
        }
        
        let conflicts = 0;
        for (let i = 0; i < tilesInLine.length; i++) {
            for (let j = i + 1; j < tilesInLine.length; j++) {
                if ((tilesInLine[i].currentPos < tilesInLine[j].currentPos &&
                     tilesInLine[i].goalPos > tilesInLine[j].goalPos) ||
                    (tilesInLine[i].currentPos > tilesInLine[j].currentPos &&
                     tilesInLine[i].goalPos < tilesInLine[j].goalPos)) {
                    conflicts++;
                }
            }
        }
        
        return conflicts;
    }
    
    aStarOptimal() {
        console.time("A* Optimal");
        
        const initialStateStr = JSON.stringify(this.grid);
        
        if (this.solutionCache.has(initialStateStr)) {
            const cachedPathLength = this.solutionCache.get(initialStateStr);
            
            if (cachedPathLength === 0) {
                console.timeEnd("A* Optimal");
                return { path: [], nodesExplored: 0, complete: true, duration: 0 };
            }
            
            console.log(`State found in cache with distance ${cachedPathLength}`);
            
            for (const [endState, pathData] of this.pathCache.entries()) {
                if (pathData.states.has(initialStateStr)) {
                    if (endState === JSON.stringify(this.goalState)) {
                        const knownDistance = pathData.stateToDistance.get(initialStateStr);
                        const exactPath = this.reconstructPathFromCache(initialStateStr, endState, knownDistance);
                        
                        if (exactPath && exactPath.path) {
                            console.log(`Optimal path reconstructed from cache: ${exactPath.path.length} moves`);
                            console.timeEnd("A* Optimal");
                            return {
                                path: exactPath.path,
                                nodesExplored: exactPath.nodesExplored,
                                complete: true,
                                duration: exactPath.duration || 0
                            };
                        }
                    }
                }
            }
        }
        
        const maxExplorationTime = 60000;
        
        const openSet = new TinyQueue([{ 
            state: [...this.grid], 
            path: [], 
            g: 0,
            h: this.manhattanDistance(this.grid),
            f: this.manhattanDistance(this.grid)
        }], (a, b) => {
            if (a.f !== b.f) return a.f - b.f;
            return a.h - b.h;
        });
        
        const gScores = new Map();
        gScores.set(initialStateStr, 0);
        
        const closedSet = new Set();
        
        let nodesExplored = 0;
        const startTime = performance.now();

        while (openSet.length > 0) {
            if (nodesExplored % 5000 === 0 && performance.now() - startTime > maxExplorationTime) {
                console.warn(`Calculation interrupted after ${((performance.now() - startTime)/1000).toFixed(1)} seconds`);
                console.timeEnd("A* Optimal");
                return null;
            }
            
            const current = openSet.pop();
            nodesExplored++;
            this.globalNodeCounter++;
            
            const currentStateStr = JSON.stringify(current.state);
            
            if (currentStateStr === JSON.stringify(this.goalState)) {
                const duration = performance.now() - startTime;
                console.log(`Optimal solution found in ${duration.toFixed(2)} ms: ${current.path.length} moves, ${nodesExplored} nodes`);
                console.timeEnd("A* Optimal");
                
                this.updateCaches(current.path);
                
                return { 
                    path: current.path, 
                    nodesExplored,
                    complete: true,
                    duration
                };
            }
            
            if (closedSet.has(currentStateStr)) continue;
            closedSet.add(currentStateStr);
            
            const neighbors = this.getNeighbors(current.state);
            
            for (const neighbor of neighbors) {
                const neighborStr = JSON.stringify(neighbor.state);
                
                const tentativeG = current.g + 1;
                
                if (!gScores.has(neighborStr) || tentativeG < gScores.get(neighborStr)) {
                    gScores.set(neighborStr, tentativeG);
                    
                    const h = this.manhattanDistance(neighbor.state);
                    
                    openSet.push({
                        state: neighbor.state,
                        path: [...current.path, neighbor.move],
                        g: tentativeG,
                        h: h,
                        f: tentativeG + h
                    });
                }
            }
        }
        
        console.log(`A* explored ${nodesExplored} nodes without finding a solution`);
        console.timeEnd("A* Optimal");
        return null;
    }
    
    reconstructPathFromCache(startStateStr, endStateStr, knownDistance) {
        console.log(`Reconstructing optimal path of distance ${knownDistance}...`);
        
        const startState = JSON.parse(startStateStr);
        const endState = JSON.parse(endStateStr);
        const startTime = performance.now();
        
        const openSet = new TinyQueue([{
            state: startState,
            path: [],
            g: 0,
            h: this.manhattanDistance(startState),
            f: this.manhattanDistance(startState)
        }], (a, b) => a.f - b.f);
        
        const gScores = new Map();
        gScores.set(startStateStr, 0);
        
        const closedSet = new Set();
        let nodesExplored = 0;
        
        while (openSet.length > 0) {
            const current = openSet.pop();
            nodesExplored++;
            
            const currentStateStr = JSON.stringify(current.state);
            
            if (currentStateStr === endStateStr) {
                const duration = performance.now() - startTime;
                console.log(`Path reconstructed in ${duration.toFixed(2)}ms, ${nodesExplored} nodes explored`);
                return {
                    path: current.path,
                    nodesExplored,
                    duration
                };
            }
            
            if (current.g > knownDistance) continue;
            
            if (closedSet.has(currentStateStr)) continue;
            closedSet.add(currentStateStr);
            
            const neighbors = this.getNeighbors(current.state);
            for (const neighbor of neighbors) {
                const neighborStr = JSON.stringify(neighbor.state);
                
                const tentativeG = current.g + 1;
                
                if (tentativeG > knownDistance || 
                   (gScores.has(neighborStr) && gScores.get(neighborStr) <= tentativeG)) {
                    continue;
                }
                
                gScores.set(neighborStr, tentativeG);
                
                const h = this.manhattanDistance(neighbor.state);
                
                openSet.push({
                    state: neighbor.state,
                    path: [...current.path, neighbor.move],
                    g: tentativeG,
                    h: h,
                    f: tentativeG + h
                });
            }
        }
        
        return null;
    }
    
    updateCaches(path) {
        if (!path || path.length === 0) return;
        
        const initialStateStr = JSON.stringify(this.grid);
        this.solutionCache.set(initialStateStr, path.length);
        
        this.updateIntermediateStates(path);
    }

    calculateMinMoves() {
        return new Promise(resolve => {
            setTimeout(() => {
                if (this.isWon()) {
                    resolve(0);
                    return;
                }
                
                const timerId = `A* Calculation-${Date.now()}`;
                console.time(timerId);
                const startTime = performance.now();
                
                const stateKey = JSON.stringify(this.grid);
                
                if (this.solutionCache.has(stateKey)) {
                    const solution = this.solutionCache.get(stateKey);
                    const endTime = performance.now();
                    console.log(`Optimal solution retrieved from cache in ${(endTime - startTime).toFixed(2)} ms (${solution} moves)`);
                    console.timeEnd(timerId);
                    resolve(solution);
                    return;
                }
                
                console.log("Searching for optimal solution...");
                
                const result = this.findOptimalSolution();
                const endTime = performance.now();
                const duration = (endTime - startTime).toFixed(2);
                
                if (!result || !result.path) {
                    console.warn(`Search failed after ${duration} ms - puzzle unsolvable or too complex`);
                    console.timeEnd(timerId);
                    
                    const estimatedMoves = this.manhattanDistance(this.grid);
                    console.log(`Heuristic value used: ${estimatedMoves} (not optimal!)`);
                    resolve(estimatedMoves);
                    return;
                }
                
                const moveCount = result.path.length;
                this.solutionCache.set(stateKey, moveCount);
                
                this.updateIntermediateStates(result.path);
                
                console.log(`Optimal solution confirmed: ${moveCount} moves, ${result.nodesExplored} nodes explored`);
                console.timeEnd(timerId);
                
                resolve(moveCount);
            }, 0);
        });
    }
    
    findOptimalSolution() {
        const initialState = [...this.grid];
        const initialStateStr = JSON.stringify(initialState);
        
        const h0 = this.manhattanDistance(initialState);
        
        if (h0 === 0) return { path: [], nodesExplored: 0 };
        
        let bound = h0;
        let nodesExplored = 0;
        const maxIterations = 100;
        
        const search = (state, g, bound, path, visited) => {
            nodesExplored++;
            
            const f = g + this.manhattanDistance(state);
            
            if (f > bound) return { cost: f, path: null };
            
            if (JSON.stringify(state) === JSON.stringify(this.goalState)) {
                return { cost: g, path: [...path] };
            }
            
            visited.add(JSON.stringify(state));
            
            let min = Infinity;
            const neighbors = this.getNeighbors(state);
            
            for (const neighbor of neighbors) {
                const neighborStr = JSON.stringify(neighbor.state);
                
                if (visited.has(neighborStr)) continue;
                
                const result = search(
                    neighbor.state, 
                    g + 1,
                    bound, 
                    [...path, neighbor.move],
                    new Set(visited)
                );
                
                if (result.path) return result;
                
                min = Math.min(min, result.cost);
            }
            
            return { cost: min, path: null };
        };
        
        for (let i = 0; i < maxIterations; i++) {
            console.log(`Searching with bound ${bound}...`);
            
            const visited = new Set([initialStateStr]);
            const result = search(initialState, 0, bound, [], visited);
            
            if (result.path) {
                return { path: result.path, nodesExplored };
            }
            
            if (result.cost === Infinity) {
                return null;
            }
            
            bound = result.cost;
        }
        
        return null;
    }
    
    canSafePrune(current, g, h) {
        if (this.solutionCache.has(JSON.stringify(this.goalState))) {
            const knownOptimalLength = this.solutionCache.get(JSON.stringify(this.goalState));
            
            if (g + h > knownOptimalLength) {
                return true;
            }
        }
        
        return false;
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

    findPartialPath(startStateStr, endStateStr) {
        const startState = JSON.parse(startStateStr);
        const endState = JSON.parse(endStateStr);
        
        const openSet = new TinyQueue([{ 
            state: startState, 
            path: [], 
            g: 0, 
            f: 0 
        }], (a, b) => a.f - b.f);
        
        const closedSet = new Set();
        let nodesExplored = 0;
        let bestNode = null;
        let bestH = Infinity;
        
        const explorationLimit = 5000;
        
        while (openSet.length > 0 && nodesExplored < explorationLimit) {
            const current = openSet.pop();
            nodesExplored++;
            
            const currentStateStr = JSON.stringify(current.state);
            const currentH = this.calculateDifference(current.state, endState);
            
            if (currentH < bestH) {
                bestH = currentH;
                bestNode = current;
            }
            
            if (currentStateStr === endStateStr) {
                return { path: current.path, nodesExplored };
            }
            
            if (closedSet.has(currentStateStr)) continue;
            closedSet.add(currentStateStr);
            
            const neighbors = this.getNeighbors(current.state);
            for (const neighbor of neighbors) {
                const neighborStateStr = JSON.stringify(neighbor.state);
                if (closedSet.has(neighborStateStr)) continue;
                
                const g = current.g + 1;
                const h = this.manhattanDistance(neighbor.state);
                const f = g + h;
                
                openSet.push({
                    state: neighbor.state,
                    path: [...current.path, neighbor.move],
                    g: g,
                    f: f
                });
            }
        }
        
        console.log(`Partial path: search explored ${nodesExplored} nodes, best distance: ${bestH}`);
        if (bestNode) {
            return { 
                path: bestNode.path, 
                nodesExplored,
                partial: true,
                heuristicDistance: bestH
            };
        }
        
        return { path: [], nodesExplored: 0, partial: true };
    }
    
    calculateDifference(state1, state2) {
        let totalDiff = 0;
        
        for (let i = 0; i < state1.length; i++) {
            const tile = state1[i];
            if (tile !== 0) {
                const pos1 = i;
                const pos2 = state2.indexOf(tile);
                
                if (pos2 !== -1) {
                    const row1 = Math.floor(pos1 / 3);
                    const col1 = pos1 % 3;
                    const row2 = Math.floor(pos2 / 3);
                    const col2 = pos2 % 3;
                    
                    totalDiff += Math.abs(row1 - row2) + Math.abs(col1 - col2);
                }
            }
        }
        
        return totalDiff;
    }

    updateIntermediateStates(path) {
        if (!path || path.length === 0) return;
        
        const goalStateStr = JSON.stringify(this.goalState);
        
        const states = new Set();
        const stateToDistance = new Map();
        let currentState = [...this.grid];
        
        states.add(JSON.stringify(currentState));
        stateToDistance.set(JSON.stringify(currentState), path.length);
        
        for (let i = 0; i < path.length; i++) {
            const moveIndex = path[i];
            const emptyIndex = currentState.indexOf(0);
            
            [currentState[emptyIndex], currentState[moveIndex]] = 
                [currentState[moveIndex], currentState[emptyIndex]];
            
            const remainingDistance = path.length - (i + 1);
            const stateStr = JSON.stringify(currentState);
            
            states.add(stateStr);
            stateToDistance.set(stateStr, remainingDistance);
            
            this.solutionCache.set(stateStr, remainingDistance);
        }
        
        this.pathCache.set(goalStateStr, {
            path: path,
            states: states,
            stateToDistance: stateToDistance
        });
    }

    shufflePuzzle() {
        this.stopSolving();
        
        const difficultySelect = document.getElementById('difficulty');
        const selectedDifficulty = difficultySelect.value;
        
        console.log(`Generating puzzle with difficulty: ${selectedDifficulty}`);
        
        if (typeof puzzleChart !== 'undefined') {
            puzzleChart.resetChart();
        }
        
        this.updateStatus("Generating puzzle...");
        
        if (selectedDifficulty === 'custom') {
            const customMovesInput = document.getElementById('customMoves');
            const customMoves = parseInt(customMovesInput.value);
            
            if (isNaN(customMoves) || customMoves < 0 || customMoves > 31) {
                this.updateStatus("Please enter a valid number of moves (0-31)");
                return;
            }
            
            this.loadPuzzleFromJSON(customMoves, `Custom mode (${customMoves} moves)`);
            return;
        }
        
        if (selectedDifficulty === 'random') {
            this.randomMixPuzzle(200);
            this.finalizePuzzleGeneration("Random");
            return;
        }
        
        const difficultyRange = this.getDifficultyRange(selectedDifficulty);
        
        let loaded = false;
        
        let possibleMoves = [];
        for (let moves = difficultyRange.min; moves <= difficultyRange.max && moves <= 31; moves++) {
            possibleMoves.push(moves);
        }
        
        possibleMoves = this.shuffleArray(possibleMoves);
        
        for (const moves of possibleMoves) {
            loaded = this.loadPuzzleFromJSON(moves, difficultyRange.label);
            if (loaded) break;
        }
        
        if (!loaded) {
            console.log("Unable to load configuration from JSON files. Using classic shuffle method.");
            this.generatePuzzleWithDifficultyClassic(selectedDifficulty);
        }
    }
    
    loadPuzzleFromJSON(moves, difficultyLabel) {
        try {
            const filePath = `assets/move_data/moves_${moves}.json`;
            
            if (PuzzleGame.movesCache[moves]) {
                const puzzleState = PuzzleGame.movesCache[moves];
                this.grid = puzzleState;
                this.renderGrid();
                
                this.minMoves = moves;
                document.getElementById('minMoves').textContent = this.minMoves;
                this.finalizePuzzleGeneration(difficultyLabel);
                
                console.log(`Configuration loaded from cache (${moves} moves)`);
                return true;
            }
            
            const xhr = new XMLHttpRequest();
            xhr.open('GET', filePath, false);
            xhr.send(null);
            
            if (xhr.status === 200) {
                const puzzleData = JSON.parse(xhr.responseText);
                
                if (puzzleData && puzzleData.states && puzzleData.states.length > 0) {
                    const randomIndex = Math.floor(Math.random() * puzzleData.states.length);
                    const puzzleState = puzzleData.states[randomIndex];
                    
                    this.grid = puzzleState;
                    this.renderGrid();
                    
                    this.minMoves = puzzleData.moves;
                    document.getElementById('minMoves').textContent = this.minMoves;
                    this.finalizePuzzleGeneration(difficultyLabel);
                    
                    PuzzleGame.movesCache[moves] = puzzleState;
                    this.saveMovesCache();
                    
                    console.log(`Configuration loaded from ${filePath} (${puzzleData.moves} moves)`);
                    return true;
                }
            }
            
            console.log(`Unable to load or parse file ${filePath}`);
            return false;
        } catch (error) {
            console.error("Error loading configuration:", error);
            return false;
        }
    }
    
    generatePuzzleWithDifficultyClassic(selectedDifficulty) {
        const difficultyRange = this.getDifficultyRange(selectedDifficulty);
        let minMovesTarget = { min: difficultyRange.min, max: difficultyRange.max };
        
        const maxAttempts = 100;
        let attempts = 0;
        let puzzleFound = false;
        
        const generatePuzzleWithDifficulty = async () => {
            let valid = false;
            
            while (!valid && attempts < maxAttempts) {
                attempts++;
                console.log(`Attempt ${attempts}/${maxAttempts} to generate ${selectedDifficulty} difficulty puzzle...`);
                
                this.randomMixPuzzle(100);
                
                let minMoves = await this.updateMinMovesCount(true);
                console.log(`Generated puzzle with ${minMoves} minimum moves`);
                
                if (minMoves >= minMovesTarget.min && minMoves <= minMovesTarget.max) {
                    console.log(`${selectedDifficulty} difficulty puzzle found directly (${minMoves} minimum moves)`);
                    valid = true;
                } 
                else if (minMoves > minMovesTarget.max) {
                    console.log(`Puzzle too difficult (${minMoves} moves), partial resolution...`);
                    
                    valid = await this.partiallyResolvePuzzle(minMoves, minMovesTarget);
                }
                else {
                    console.log(`Puzzle too easy (${minMoves} moves), trying again...`);
                }
            }
            
            if (valid) {
                console.log(`${selectedDifficulty} difficulty puzzle generated successfully`);
                if (difficultySelect.value !== selectedDifficulty) {
                    difficultySelect.value = selectedDifficulty;
                }
            } else {
                console.log(`Generation failed after ${maxAttempts} attempts.`);
                this.updateStatus(`Puzzle shuffled! Approximate difficulty after ${maxAttempts} attempts.`);
            }
            
            this.finalizePuzzleGeneration(difficultyRange.label);
        };
        
        generatePuzzleWithDifficulty();
    }
    
    async partiallyResolvePuzzle(currentMinMoves, targetDifficulty) {
        console.log(`Partial resolution: from ${currentMinMoves} moves to ${targetDifficulty.min}-${targetDifficulty.max} moves`);
        
        const solution = this.aStar();
        
        if (!solution) {
            console.log("Unable to calculate solution for this puzzle");
            return false;
        }
        
        const targetMoves = Math.max(0, currentMinMoves - Math.ceil((targetDifficulty.min + targetDifficulty.max) / 2));
        console.log(`Applying ${targetMoves} moves from solution...`);
        
        let currentState = [...this.grid];
        for (let i = 0; i < targetMoves && i < solution.length; i++) {
            const moveIndex = solution[i];
            const emptyIndex = currentState.indexOf(0);
            [currentState[emptyIndex], currentState[moveIndex]] = [currentState[moveIndex], currentState[emptyIndex]];
        }
        
        this.grid = currentState;
        this.renderGrid();
        
        const newMinMoves = await this.updateMinMovesCount(true);
        console.log(`After partial resolution: ${newMinMoves} minimum moves`);
        
        const isValidDifficulty = newMinMoves >= targetDifficulty.min && newMinMoves <= targetDifficulty.max;
        if (isValidDifficulty) {
            this.minMoves = newMinMoves;
            document.getElementById('minMoves').textContent = this.minMoves;
        }
        
        return isValidDifficulty;
    }
    
    randomMixPuzzle(moves) {
        this.grid = [...this.goalState];
        
        console.log(`Applying ${moves} random moves...`);
        
        let lastMove = -1;
        
        for (let i = 0; i < moves; i++) {
            const emptyIndex = this.grid.indexOf(0);
            const possibleMoves = [];
            
            if (emptyIndex >= 3) possibleMoves.push(emptyIndex - 3);
            if (emptyIndex < 6) possibleMoves.push(emptyIndex + 3);
            if (emptyIndex % 3 !== 0) possibleMoves.push(emptyIndex - 1);
            if (emptyIndex % 3 !== 2) possibleMoves.push(emptyIndex + 1);
            
            const filteredMoves = possibleMoves.filter(move => move !== lastMove);
            
            const validMoves = filteredMoves.length > 0 ? filteredMoves : possibleMoves;
            
            const randomIndex = Math.floor(Math.random() * validMoves.length);
            const moveIndex = validMoves[randomIndex];
            
            [this.grid[emptyIndex], this.grid[moveIndex]] = [this.grid[moveIndex], this.grid[emptyIndex]];
            
            lastMove = moveIndex;
        }
        
        if (this.isWon()) {
            if (this.grid[0] !== 0 && this.grid[1] !== 0) {
                [this.grid[0], this.grid[1]] = [this.grid[1], this.grid[0]];
            } else if (this.grid[1] !== 0 && this.grid[2] !== 0) {
                [this.grid[1], this.grid[2]] = [this.grid[2], this.grid[1]];
            }
        }
        
        if (!this.isSolvable()) {
            if (this.grid[0] !== 0 && this.grid[1] !== 0) {
                [this.grid[0], this.grid[1]] = [this.grid[1], this.grid[0]];
            } else if (this.grid[1] !== 0 && this.grid[2] !== 0) {
                [this.grid[1], this.grid[2]] = [this.grid[2], this.grid[1]];
            }
        }
        
        this.renderGrid();
    }
    
    finalizePuzzleGeneration(difficultyLabel) {
        this.moves = 0;
        this.updateMoveCount();
        this.updateChartData();
        this.updateStatus(`Puzzle shuffled! Difficulty: ${difficultyLabel}`);
        this.startTimer();
    }
    
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
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
            this.updateStatus("🎉 Congratulations! Puzzle solved!", "success");
        }
    }

    isWon() {
        return JSON.stringify(this.grid) === JSON.stringify(this.goalState);
    }

    solvePuzzle() {
        if (this.isWon()) {
            this.updateStatus("The puzzle is already solved!", "success");
            return;
        }

        this.issolving = true;
        this.updateStatus("🤖 Solving in progress...", "solving");
        
        console.time("Solve Puzzle");
        console.group("Solve Puzzle");
        const startSolveTime = performance.now();
        
        const solution = this.aStar();
        
        const endSolveTime = performance.now();
        console.log(`Solution found in ${(endSolveTime - startSolveTime).toFixed(2)} ms (${solution ? solution.length : 'none'} moves)`);
        console.timeEnd("Solve Puzzle");
        console.groupEnd();
        
        if (solution) {
            this.animateSolution(solution);
            this.updatePathCache({ path: solution });
        } else {
            this.updateStatus("Unable to solve this puzzle.");
            this.issolving = false;
        }
    }

    aStar() {
        const openSet = new TinyQueue([{
            state: [...this.grid], 
            path: [], 
            f: 0, 
            g: 0
        }], (a, b) => {
            if (a.f !== b.f) return a.f - b.f;
            return a.h - b.h;
        });
        
        const gScores = new Map();
        gScores.set(JSON.stringify(this.grid), 0);
        
        const closedSet = new Set();
        let nodesExplored = 0;
        
        const startTime = performance.now();
        const timeLimit = 30000;
        
        console.log("Searching for optimal solution...");

        while (openSet.length > 0) {
            if (nodesExplored % 1000 === 0) {
                if (performance.now() - startTime > timeLimit) {
                    console.warn("Time limit reached, unable to find optimal solution");
                    return null;
                }
            }
            
            const current = openSet.pop();
            nodesExplored++;
            
            const currentStateStr = JSON.stringify(current.state);
            
            if (currentStateStr === JSON.stringify(this.goalState)) {
                console.log(`Optimal solution found! ${current.path.length} moves, ${nodesExplored} nodes explored`);
                return current.path;
            }
            
            if (closedSet.has(currentStateStr)) continue;
            closedSet.add(currentStateStr);

            const neighbors = this.getNeighbors(current.state);
            
            for (const neighbor of neighbors) {
                const neighborStr = JSON.stringify(neighbor.state);
                
                const tentativeG = current.g + 1;
                
                if (!gScores.has(neighborStr) || tentativeG < gScores.get(neighborStr)) {
                    const h = this.manhattanDistance(neighbor.state);
                    
                    gScores.set(neighborStr, tentativeG);
                    
                    openSet.push({
                        state: neighbor.state,
                        path: [...current.path, neighbor.move],
                        g: tentativeG,
                        h: h,
                        f: tentativeG + h
                    });
                }
            }
        }
        
        console.log(`A* explored ${nodesExplored} nodes without finding a solution`);
        return null;
    }

    getNeighbors(state) {
        const neighbors = [];
        const emptyIndex = state.indexOf(0);
        
        const directions = [
            {index: emptyIndex - 3, move: emptyIndex - 3}, // UP
            {index: emptyIndex + 3, move: emptyIndex + 3}, // DOWN
            {index: emptyIndex % 3 !== 0 ? emptyIndex - 1 : -1, move: emptyIndex - 1}, // LEFT
            {index: emptyIndex % 3 !== 2 ? emptyIndex + 1 : -1, move: emptyIndex + 1}  // RIGHT
        ];

        for (const dir of directions) {
            if (dir.index >= 0 && dir.index < 9) {
                const newState = [...state];
                [newState[emptyIndex], newState[dir.index]] = [newState[dir.index], newState[emptyIndex]];
                
                const h = this.manhattanDistance(newState);
                
                neighbors.push({
                    state: newState, 
                    move: dir.move,
                    h: h
                });
            }
        }
        
        return neighbors;
    }

    animateSolution(solution) {
        let step = 0;
        
        this.solvingInterval = setInterval(() => {
            if (step >= solution.length || !this.issolving) {
                this.stopSolving();
                if (step >= solution.length) {
                    this.updateStatus("🎉 Puzzle solved automatically!", "success");
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

    updateMinMovesCount(skipDifficultyUpdate = false) {
        return new Promise(resolve => {
            requestAnimationFrame(async () => {
                this.minMoves = await this.calculateMinMoves();
                document.getElementById('minMoves').textContent = this.minMoves;
                
                if (this.minMoves > 0 && !skipDifficultyUpdate) {
                    const difficultyLevel = this.getDifficultyLevelFromMoves(this.minMoves);
                    const difficultySelect = document.getElementById('difficulty');
                    
                    if (difficultySelect.value !== difficultyLevel) {
                        console.log(`Updating difficulty level: ${difficultyLevel} (${this.minMoves} moves)`);
                        difficultySelect.value = difficultyLevel;
                    }
                }
                resolve(this.minMoves);
            });
        });
    }
    
    updateChartData() {
        if (typeof puzzleChart !== 'undefined') {
            requestAnimationFrame(() => {
                document.getElementById('minMoves').textContent = this.minMoves;
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

    getDifficultyRange(difficultyLevel) {
        switch (difficultyLevel) {
            case 'very-easy': return { min: 1, max: 4, label: "Very Easy" };
            case 'easy': return { min: 5, max: 9, label: "Easy" };
            case 'medium': return { min: 10, max: 14, label: "Medium" };
            case 'hard': return { min: 15, max: 19, label: "Hard" };
            case 'very-hard': return { min: 20, max: 24, label: "Very Hard" };
            case 'extreme': return { min: 25, max: 50, label: "Extreme" };
            default: return { min: 0, max: Infinity, label: "Random" };
        }
    }

    getDifficultyLevelFromMoves(moves) {
        if (moves < 5) return "very-easy";
        if (moves < 10) return "easy";
        if (moves < 15) return "medium";
        if (moves < 20) return "hard";
        if (moves < 25) return "very-hard";
        return "extreme";
    }
}

class TinyQueue {
    constructor(data = [], compare = (a, b) => a - b) {
        this.data = data;
        this.length = this.data.length;
        this.compare = compare;

        if (this.length > 0) {
            for (let i = (this.length >> 1) - 1; i >= 0; i--) this._down(i);
        }
    }

    push(item) {
        this.data.push(item);
        this.length++;
        this._up(this.length - 1);
    }

    pop() {
        if (this.length === 0) return undefined;

        const top = this.data[0];
        const bottom = this.data.pop();
        this.length--;

        if (this.length > 0) {
            this.data[0] = bottom;
            this._down(0);
        }

        return top;
    }

    peek() {
        return this.data[0];
    }

    contains(state, g, stateToString = JSON.stringify) {
        const stateStr = typeof state === 'string' ? state : stateToString(state);
        for (let i = 0; i < this.length; i++) {
            if (stateToString(this.data[i].state) === stateStr && this.data[i].g <= g) {
                return true;
            }
        }
        return false;
    }

    _up(pos) {
        const {data, compare} = this;
        const item = data[pos];

        while (pos > 0) {
            const parent = (pos - 1) >> 1;
            const current = data[parent];
            if (compare(item, current) >= 0) break;
            data[pos] = current;
            pos = parent;
        }

        data[pos] = item;
    }

    _down(pos) {
        const {data, compare} = this;
        const halfLength = this.length >> 1;
        const item = data[pos];

        while (pos < halfLength) {
            let left = (pos << 1) + 1;
            let best = data[left];
            const right = left + 1;

            if (right < this.length && compare(data[right], best) < 0) {
                left = right;
                best = data[right];
            }
            if (compare(best, item) >= 0) break;

            data[pos] = best;
            pos = left;
        }

        data[pos] = item;
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