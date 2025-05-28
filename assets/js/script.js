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
        this.stateCache = new Map(); // Cache pour stocker les états intermédiaires
        this.pathCache = new Map(); // Cache pour les chemins partiels
        this.globalNodeCounter = 0; // Compteur global de nœuds explorés
        this.patternDatabase = {}; // Base de données de motifs pour l'heuristique
        
        // Construire la base de données de motifs (précalculs pour heuristique)
        this.buildPatternDatabase();
        
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
            // et avec un délai pour assurer que l'UI a bien le temps de se mettre à jour
            setTimeout(() => {
                console.group(`Analyse après mouvement (coup #${this.moves})`);
                console.log(`Total des nœuds explorés depuis le début: ${this.globalNodeCounter}`);
                this.updateMinMovesCount();
                this.updateChartData();
                console.groupEnd();
            }, 50); // Petit délai pour s'assurer que le rendu est terminé
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

    // Nouvelle méthode pour construire une base de données de motifs
    buildPatternDatabase() {
        // Groupes de tuiles pour l'heuristique de disjoint pattern database
        const group1 = [1, 2, 3, 4]; // Premier groupe de tuiles
        const group2 = [5, 6, 7, 8]; // Second groupe de tuiles
        
        this.patternDatabase = {
            group1: this.precomputePatternCosts(group1),
            group2: this.precomputePatternCosts(group2)
        };
        
        console.log("Base de données de motifs construite pour améliorer l'heuristique");
    }
    
    // Précompute les coûts minimums pour un groupe de tuiles
    precomputePatternCosts(tiles) {
        const db = new Map();
        // Positions cibles des tuiles dans le puzzle résolu
        const goalPositions = {};
        for (let i = 0; i < this.goalState.length; i++) {
            const value = this.goalState[i];
            if (tiles.includes(value)) {
                goalPositions[value] = i;
            }
        }
        
        // Simplification: stockons juste quelques patterns clés au lieu de calculer tous les patterns possibles
        // Ce serait plus efficace avec une vraie base de données de patterns complète
        return {
            goalPositions,
            getPatternDistance: (state) => {
                let distance = 0;
                for (const tile of tiles) {
                    const currentPos = state.indexOf(tile);
                    if (currentPos !== -1 && goalPositions[tile] !== undefined) {
                        // Calcul de la distance de Manhattan pour cette tuile
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

    // Heuristique simplifiée utilisant uniquement la distance de Manhattan
    enhancedHeuristic(state) {
        // Distance de Manhattan standard, simple et efficace
        return this.manhattanDistance(state);
    }
    
    // Détecte les conflits linéaires où deux tuiles sont sur leur bonne ligne/colonne
    // mais l'une bloque l'autre
    countLinearConflicts(state) {
        let conflicts = 0;
        
        // Vérifier les conflits sur les lignes
        for (let row = 0; row < 3; row++) {
            conflicts += this.findConflictsInLine(state, row, true);
        }
        
        // Vérifier les conflits sur les colonnes
        for (let col = 0; col < 3; col++) {
            conflicts += this.findConflictsInLine(state, col, false);
        }
        
        return conflicts;
    }
    
    findConflictsInLine(state, lineIndex, isRow) {
        const tilesInLine = [];
        
        // Collecter les tuiles sur cette ligne ou colonne
        for (let i = 0; i < 3; i++) {
            const index = isRow ? lineIndex * 3 + i : i * 3 + lineIndex;
            const tile = state[index];
            if (tile !== 0) {
                const goalIndex = this.goalState.indexOf(tile);
                const goalLineIndex = isRow ? Math.floor(goalIndex / 3) : goalIndex % 3;
                
                // Garder seulement les tuiles qui appartiennent à cette ligne/colonne dans l'état final
                if (goalLineIndex === lineIndex) {
                    tilesInLine.push({
                        tile,
                        currentPos: i,
                        goalPos: isRow ? goalIndex % 3 : Math.floor(goalIndex / 3)
                    });
                }
            }
        }
        
        // Compter les conflits (chaque paire de tuiles qui se croisent)
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
    
    // Version optimisée de A* qui garantit toujours la solution optimale
    aStarOptimal() {
        console.time("A* Optimal");
        
        // Utiliser une clé unique pour l'état actuel
        const initialStateStr = JSON.stringify(this.grid);
        
        // Vérifier en premier si l'état est déjà dans le cache
        if (this.solutionCache.has(initialStateStr)) {
            const cachedPathLength = this.solutionCache.get(initialStateStr);
            
            // Si c'est un état final, retourner un chemin vide
            if (cachedPathLength === 0) {
                console.timeEnd("A* Optimal");
                return { path: [], nodesExplored: 0, complete: true, duration: 0 };
            }
            
            console.log(`État trouvé dans le cache avec distance ${cachedPathLength}`);
            
            // Vérifier s'il y a un chemin connu vers l'objectif
            for (const [endState, pathData] of this.pathCache.entries()) {
                if (pathData.states.has(initialStateStr)) {
                    // S'il s'agit d'un chemin vers l'état final
                    if (endState === JSON.stringify(this.goalState)) {
                        // Exécuter un A* strict mais avec limite de recherche 
                        // basée sur la distance déjà connue
                        const knownDistance = pathData.stateToDistance.get(initialStateStr);
                        const exactPath = this.reconstructPathFromCache(initialStateStr, endState, knownDistance);
                        
                        if (exactPath && exactPath.path) {
                            console.log(`Chemin optimal reconstruit depuis le cache: ${exactPath.path.length} coups`);
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
        
        // Paramètres pour un A* complet et optimal
        const maxExplorationTime = 60000; // 60 secondes maximum
        
        // Utiliser un tableau de priorité pour openSet avec une fonction de comparaison optimisée
        const openSet = new TinyQueue([{ 
            state: [...this.grid], 
            path: [], 
            g: 0,
            h: this.manhattanDistance(this.grid),
            f: this.manhattanDistance(this.grid)
        }], (a, b) => {
            // Priorité par f, puis par h en cas d'égalité (tie-breaking)
            if (a.f !== b.f) return a.f - b.f;
            return a.h - b.h;  // Préférer les états plus proches du but
        });
        
        // Map pour stocker les meilleurs g-scores trouvés pour chaque état
        const gScores = new Map();
        gScores.set(initialStateStr, 0);
        
        // Set pour marquer les états complètement explorés
        const closedSet = new Set();
        
        let nodesExplored = 0;
        const startTime = performance.now();

        // Algorithme A* optimisé avec garantie d'optimalité
        while (openSet.length > 0) {
            // Vérifier périodiquement le temps écoulé
            if (nodesExplored % 5000 === 0 && performance.now() - startTime > maxExplorationTime) {
                console.warn(`Calcul interrompu après ${((performance.now() - startTime)/1000).toFixed(1)} secondes`);
                console.timeEnd("A* Optimal");
                return null; // Pas de solution approximative autorisée pour garantir l'optimalité
            }
            
            // Extraire le nœud avec la plus petite valeur f
            const current = openSet.pop();
            nodesExplored++;
            this.globalNodeCounter++;
            
            const currentStateStr = JSON.stringify(current.state);
            
            // Si on a atteint l'état final, construire le chemin complet
            if (currentStateStr === JSON.stringify(this.goalState)) {
                const duration = performance.now() - startTime;
                console.log(`Solution optimale trouvée en ${duration.toFixed(2)} ms: ${current.path.length} coups, ${nodesExplored} nœuds`);
                console.timeEnd("A* Optimal");
                
                // Mettre à jour les caches avec la solution trouvée
                this.updateCaches(current.path);
                
                return { 
                    path: current.path, 
                    nodesExplored,
                    complete: true,
                    duration
                };
            }
            
            // Si cet état est déjà complètement exploré, passer au suivant
            if (closedSet.has(currentStateStr)) continue;
            closedSet.add(currentStateStr);
            
            // Explorer tous les états voisins possibles
            const neighbors = this.getNeighbors(current.state);
            
            for (const neighbor of neighbors) {
                const neighborStr = JSON.stringify(neighbor.state);
                
                // Calculer le nouveau coût g pour ce voisin
                const tentativeG = current.g + 1;
                
                // Vérifier si on a trouvé un meilleur chemin vers ce voisin
                if (!gScores.has(neighborStr) || tentativeG < gScores.get(neighborStr)) {
                    // Mettre à jour le meilleur coût connu
                    gScores.set(neighborStr, tentativeG);
                    
                    // Calculer l'heuristique
                    const h = this.manhattanDistance(neighbor.state);
                    
                    // Ajouter à la file de priorité
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
        
        console.log(`A* a exploré ${nodesExplored} nœuds sans trouver de solution`);
        console.timeEnd("A* Optimal");
        return null;
    }
    
    // Nouvelle méthode pour reconstruire un chemin exact depuis le cache
    reconstructPathFromCache(startStateStr, endStateStr, knownDistance) {
        console.log(`Reconstruction du chemin optimal de distance ${knownDistance}...`);
        
        const startState = JSON.parse(startStateStr);
        const endState = JSON.parse(endStateStr);
        const startTime = performance.now();
        
        // Utiliser un A* strict limité par la distance connue
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
            
            // Si on a trouvé l'état final
            if (currentStateStr === endStateStr) {
                const duration = performance.now() - startTime;
                console.log(`Chemin reconstruit en ${duration.toFixed(2)}ms, ${nodesExplored} nœuds explorés`);
                return {
                    path: current.path,
                    nodesExplored,
                    duration
                };
            }
            
            // Ne pas explorer si le chemin est déjà plus long que connu
            if (current.g > knownDistance) continue;
            
            // Ne pas réexplorer des états
            if (closedSet.has(currentStateStr)) continue;
            closedSet.add(currentStateStr);
            
            const neighbors = this.getNeighbors(current.state);
            for (const neighbor of neighbors) {
                const neighborStr = JSON.stringify(neighbor.state);
                
                // Coût pour atteindre ce voisin
                const tentativeG = current.g + 1;
                
                // Ne pas explorer des chemins trop longs ou déjà explorés avec un meilleur coût
                if (tentativeG > knownDistance || 
                   (gScores.has(neighborStr) && gScores.get(neighborStr) <= tentativeG)) {
                    continue;
                }
                
                // Mettre à jour le meilleur chemin vers ce voisin
                gScores.set(neighborStr, tentativeG);
                
                // Calculer l'heuristique
                const h = this.manhattanDistance(neighbor.state);
                
                // Ajouter à la file de priorité
                openSet.push({
                    state: neighbor.state,
                    path: [...current.path, neighbor.move],
                    g: tentativeG,
                    h: h,
                    f: tentativeG + h
                });
            }
        }
        
        return null; // Impossible de reconstruire le chemin
    }
    
    // Méthode pour mettre à jour tous les caches
    updateCaches(path) {
        if (!path || path.length === 0) return;
        
        // Mettre à jour le cache de solution
        const initialStateStr = JSON.stringify(this.grid);
        this.solutionCache.set(initialStateStr, path.length);
        
        // Mettre à jour les états intermédiaires
        this.updateIntermediateStates(path);
    }

    // Méthode garantissant le calcul du nombre minimal de coups
    calculateMinMoves() {
        // Rendre cette opération asynchrone pour ne pas bloquer l'UI
        return new Promise(resolve => {
            setTimeout(() => {
                if (this.isWon()) {
                    resolve(0);
                    return;
                }
                
                // ID unique pour les métriques
                const timerId = `A* Calculation-${Date.now()}`;
                console.time(timerId);
                const startTime = performance.now();
                
                // Utiliser une clé unique pour l'état actuel
                const stateKey = JSON.stringify(this.grid);
                
                // Vérifier d'abord le cache
                if (this.solutionCache.has(stateKey)) {
                    const solution = this.solutionCache.get(stateKey);
                    const endTime = performance.now();
                    console.log(`Solution optimale récupérée du cache en ${(endTime - startTime).toFixed(2)} ms (${solution} coups)`);
                    console.timeEnd(timerId);
                    resolve(solution);
                    return;
                }
                
                // Si pas dans le cache, exécuter l'algorithme A* optimal
                console.log("Recherche de solution optimale...");
                
                // Utiliser l'algorithme A* strict pour garantir l'optimalité
                const result = this.findOptimalSolution();
                const endTime = performance.now();
                const duration = (endTime - startTime).toFixed(2);
                
                if (!result || !result.path) {
                    console.warn(`Échec de recherche après ${duration} ms - puzzle non résolvable ou trop complexe`);
                    console.timeEnd(timerId);
                    
                    // Dans le cas d'un échec, on utilise l'heuristique comme approximation
                    // mais on marque clairement que ce n'est pas optimal
                    const estimatedMoves = this.manhattanDistance(this.grid);
                    console.log(`Valeur heuristique utilisée: ${estimatedMoves} (non optimale!)`);
                    resolve(estimatedMoves);
                    return;
                }
                
                // Stocker la solution dans le cache
                const moveCount = result.path.length;
                this.solutionCache.set(stateKey, moveCount);
                
                // Mettre à jour les états intermédiaires pour les futures recherches
                this.updateIntermediateStates(result.path);
                
                console.log(`Solution optimale confirmée: ${moveCount} coups, ${result.nodesExplored} nœuds explorés`);
                console.timeEnd(timerId);
                
                // Retourner le nombre exact de mouvements
                resolve(moveCount);
            }, 0);
        });
    }
    
    // Méthode dédiée pour trouver la solution optimale garantie
    findOptimalSolution() {
        // Cette méthode utilise IDA* (Iterative Deepening A*) qui garantit
        // de trouver le chemin optimal tout en utilisant moins de mémoire
        
        // État initial
        const initialState = [...this.grid];
        const initialStateStr = JSON.stringify(initialState);
        
        // Calculer l'heuristique initiale (distance minimale théorique)
        const h0 = this.manhattanDistance(initialState);
        
        if (h0 === 0) return { path: [], nodesExplored: 0 }; // Déjà résolu
        
        let bound = h0; // Limite initiale = valeur de l'heuristique
        let nodesExplored = 0;
        const maxIterations = 100; // Sécurité contre les boucles infinies
        
        // Méthode récursive pour la recherche en profondeur limitée
        const search = (state, g, bound, path, visited) => {
            nodesExplored++;
            
            const f = g + this.manhattanDistance(state);
            
            // Si le coût estimé dépasse la limite actuelle, retourner ce coût
            if (f > bound) return { cost: f, path: null };
            
            // Si on a trouvé l'état final, retourner le chemin
            if (JSON.stringify(state) === JSON.stringify(this.goalState)) {
                return { cost: g, path: [...path] };
            }
            
            // Marquer cet état comme visité
            visited.add(JSON.stringify(state));
            
            let min = Infinity;
            const neighbors = this.getNeighbors(state);
            
            // Explorer tous les voisins dans l'ordre
            for (const neighbor of neighbors) {
                const neighborStr = JSON.stringify(neighbor.state);
                
                // Ne pas revisiter des états
                if (visited.has(neighborStr)) continue;
                
                // Effectuer la recherche récursive
                const result = search(
                    neighbor.state, 
                    g + 1,
                    bound, 
                    [...path, neighbor.move],
                    new Set(visited)
                );
                
                // Si on a trouvé une solution, la retourner immédiatement
                if (result.path) return result;
                
                // Sinon, mettre à jour le coût minimal
                min = Math.min(min, result.cost);
            }
            
            // Retourner le coût minimal trouvé pour la prochaine itération
            return { cost: min, path: null };
        };
        
        // Iterative deepening A*
        for (let i = 0; i < maxIterations; i++) {
            console.log(`Recherche avec limite ${bound}...`);
            
            const visited = new Set([initialStateStr]);
            const result = search(initialState, 0, bound, [], visited);
            
            // Si on a trouvé une solution
            if (result.path) {
                return { path: result.path, nodesExplored };
            }
            
            // Si aucune solution n'existe
            if (result.cost === Infinity) {
                return null;
            }
            
            // Augmenter la limite pour la prochaine itération
            bound = result.cost;
        }
        
        return null; // Pas trouvé de solution après maxIterations
    }
    
    // Nouvelle méthode pour élaguer les branches peu prometteuses
    canSafePrune(current, g, h) {
        // Si nous avons déjà trouvé un chemin vers l'état final, on peut élaguer tous les chemins
        // qui seraient évidemment plus longs
        if (this.solutionCache.has(JSON.stringify(this.goalState))) {
            const knownOptimalLength = this.solutionCache.get(JSON.stringify(this.goalState));
            
            // Si le coût estimé est déjà supérieur au meilleur connu, inutile d'explorer
            if (g + h > knownOptimalLength) {
                return true;
            }
        }
        
        // Autres critères d'élagage qu'on pourrait ajouter:
        // - Détection de cycles (revenir à un état déjà visité)
        // - Détection de mouvements qui défont le mouvement précédent
        // - Élagage basé sur des heuristiques supplémentaires
        
        return false;
    }
    
    // Mise à jour pour utiliser l'heuristique améliorée
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

    // Nouvelle méthode pour trouver un chemin partiel entre deux états connus
    findPartialPath(startStateStr, endStateStr) {
        const startState = JSON.parse(startStateStr);
        const endState = JSON.parse(endStateStr);
        
        // Recherche dirigée uniquement vers l'état final connu
        // Utiliser une file de priorité pour plus d'efficacité
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
        
        // Limite augmentée pour s'assurer de trouver une solution
        const explorationLimit = 5000;
        
        while (openSet.length > 0 && nodesExplored < explorationLimit) {
            const current = openSet.pop();
            nodesExplored++;
            
            const currentStateStr = JSON.stringify(current.state);
            const currentH = this.calculateDifference(current.state, endState);
            
            // Garder trace du meilleur état trouvé
            if (currentH < bestH) {
                bestH = currentH;
                bestNode = current;
            }
            
            // Si on a trouvé l'état final, retourner immédiatement
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
                // Utiliser la distance de Manhattan comme heuristique
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
        
        // Si on n'a pas trouvé l'état final, retourner le meilleur chemin trouvé
        console.log(`Chemin partiel : recherche a exploré ${nodesExplored} nœuds, meilleure distance: ${bestH}`);
        if (bestNode) {
            return { 
                path: bestNode.path, 
                nodesExplored,
                partial: true,
                heuristicDistance: bestH
            };
        }
        
        // Fallback si aucune solution n'a été trouvée
        return { path: [], nodesExplored: 0, partial: true };
    }
    
    // Calcule la différence entre deux états en utilisant la distance de Manhattan
    calculateDifference(state1, state2) {
        let totalDiff = 0;
        
        // Pour chaque tuile
        for (let i = 0; i < state1.length; i++) {
            const tile = state1[i];
            if (tile !== 0) {  // On ignore le trou
                // Trouver la position de cette tuile dans l'état 2
                const pos1 = i;
                const pos2 = state2.indexOf(tile);
                
                if (pos2 !== -1) {
                    // Calculer la distance de Manhattan entre les deux positions
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

    // Méthode pour mettre à jour les états intermédiaires
    updateIntermediateStates(path) {
        if (!path || path.length === 0) return;
        
        const goalStateStr = JSON.stringify(this.goalState);
        
        // Préparer les structures pour le cache
        const states = new Set();
        const stateToDistance = new Map();
        let currentState = [...this.grid];
        
        // État initial
        states.add(JSON.stringify(currentState));
        stateToDistance.set(JSON.stringify(currentState), path.length);
        
        // Parcourir le chemin pour calculer tous les états intermédiaires
        for (let i = 0; i < path.length; i++) {
            const moveIndex = path[i];
            const emptyIndex = currentState.indexOf(0);
            
            // Effectuer le mouvement
            [currentState[emptyIndex], currentState[moveIndex]] = 
                [currentState[moveIndex], currentState[emptyIndex]];
            
            // Calculer la distance restante vers l'objectif
            const remainingDistance = path.length - (i + 1);
            const stateStr = JSON.stringify(currentState);
            
            // Mettre en cache l'état et sa distance
            states.add(stateStr);
            stateToDistance.set(stateStr, remainingDistance);
            
            // Mettre en cache directement pour les recherches futures
            this.solutionCache.set(stateStr, remainingDistance);
        }
        
        // Stocker le chemin complet dans le cache
        this.pathCache.set(goalStateStr, {
            path: path,
            states: states,
            stateToDistance: stateToDistance
        });
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
            console.group("Analyse du puzzle mélangé");
            this.updateMinMovesCount();
            if (typeof puzzleChart !== 'undefined') {
                puzzleChart.resetChart();
                this.updateChartData();
            }
            console.groupEnd();
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
        
        console.time("Solve Puzzle");
        console.group("Solve Puzzle");
        const startSolveTime = performance.now();
        
        const solution = this.aStar();
        
        const endSolveTime = performance.now();
        console.log(`Solution trouvée en ${(endSolveTime - startSolveTime).toFixed(2)} ms (${solution ? solution.length : 'aucune'} coups)`);
        console.timeEnd("Solve Puzzle");
        console.groupEnd();
        
        if (solution) {
            this.animateSolution(solution);
            // Mettre à jour notre cache de chemins
            this.updatePathCache({ path: solution });
        } else {
            this.updateStatus("Impossible de résoudre ce puzzle.");
            this.issolving = false;
        }
    }

    // Version optimisée de A* garantissant l'optimalité
    aStar() {
        // Utiliser une file de priorité pour efficacité
        const openSet = new TinyQueue([{
            state: [...this.grid], 
            path: [], 
            f: 0, 
            g: 0
        }], (a, b) => {
            // Priorité par f, puis par h (en cas d'égalité)
            if (a.f !== b.f) return a.f - b.f;
            return a.h - b.h;  // Tie-breaking: préférer les états plus proches du but
        });
        
        // Map pour suivre les états dans openSet avec leurs coûts
        const gScores = new Map(); // État -> g-score
        gScores.set(JSON.stringify(this.grid), 0);
        
        // Set pour les états fermés
        const closedSet = new Set();
        let nodesExplored = 0;
        
        // Pour garantir l'optimalité, on n'impose pas de limite de nœuds
        // mais on surveille le temps d'exécution
        const startTime = performance.now();
        const timeLimit = 30000; // 30 secondes maximum
        
        console.log("Recherche de solution optimale...");

        while (openSet.length > 0) {
            // Vérifier le temps écoulé périodiquement
            if (nodesExplored % 1000 === 0) {
                if (performance.now() - startTime > timeLimit) {
                    console.warn("Limite de temps atteinte, impossible de trouver la solution optimale");
                    return null;
                }
            }
            
            const current = openSet.pop();
            nodesExplored++;
            
            const currentStateStr = JSON.stringify(current.state);
            
            // Si on a trouvé l'état final
            if (currentStateStr === JSON.stringify(this.goalState)) {
                console.log(`Solution optimale trouvée! ${current.path.length} coups, ${nodesExplored} nœuds explorés`);
                return current.path;
            }
            
            // Ne pas réexplorer les états déjà fermés
            if (closedSet.has(currentStateStr)) continue;
            closedSet.add(currentStateStr);

            // Génération de tous les mouvements possibles
            const neighbors = this.getNeighbors(current.state);
            
            for (const neighbor of neighbors) {
                const neighborStr = JSON.stringify(neighbor.state);
                
                // Coût jusqu'à ce voisin
                const tentativeG = current.g + 1;
                
                // Si on a trouvé un meilleur chemin vers cet état
                if (!gScores.has(neighborStr) || tentativeG < gScores.get(neighborStr)) {
                    // Calculer l'heuristique une seule fois
                    const h = this.manhattanDistance(neighbor.state);
                    
                    // Mettre à jour le gScore
                    gScores.set(neighborStr, tentativeG);
                    
                    // Ajouter à openSet avec les valeurs mises à jour
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
        
        console.log(`A* a exploré ${nodesExplored} nœuds sans trouver de solution`);
        return null; // Aucune solution trouvée
    }

    getNeighbors(state) {
        const neighbors = [];
        const emptyIndex = state.indexOf(0);
        
        // Directions de déplacement possibles (HAUT, BAS, GAUCHE, DROITE)
        const directions = [
            {index: emptyIndex - 3, move: emptyIndex - 3}, // UP
            {index: emptyIndex + 3, move: emptyIndex + 3}, // DOWN
            {index: emptyIndex % 3 !== 0 ? emptyIndex - 1 : -1, move: emptyIndex - 1}, // LEFT
            {index: emptyIndex % 3 !== 2 ? emptyIndex + 1 : -1, move: emptyIndex + 1}  // RIGHT
        ];

        // Générer tous les états voisins valides
        for (const dir of directions) {
            if (dir.index >= 0 && dir.index < 9) {
                const newState = [...state];
                // Effectuer le déplacement de la tuile
                [newState[emptyIndex], newState[dir.index]] = [newState[dir.index], newState[emptyIndex]];
                
                // Calculer l'heuristique pour ce nouvel état
                const h = this.manhattanDistance(newState);
                
                // Ajouter ce voisin à la liste
                neighbors.push({
                    state: newState, 
                    move: dir.move,
                    h: h
                });
            }
        }
        
        // Ne pas trier les voisins pour garantir l'optimalité
        // Le tri pourrait fausser l'ordre d'exploration optimal
        
        return neighbors;
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
        // Utiliser Promise pour s'assurer que l'UI est mise à jour avant le calcul
        requestAnimationFrame(async () => {
            this.minMoves = await this.calculateMinMoves();
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

// Implémentation minimaliste de file de priorité pour optimiser l'accès à OpenSet
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

    // Ajout d'une méthode pour vérifier si un état est présent avec un meilleur g
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