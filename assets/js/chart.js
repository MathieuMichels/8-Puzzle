class PuzzleChart {
    constructor() {
        this.movesData = [];
        this.chart = null;
        this.initChart();
        
        // Ajouter un écouteur pour redimensionner le graphique quand la fenêtre change de taille
        window.addEventListener('resize', () => this.resizeChart());
    }

    initChart() {
        const ctx = document.getElementById('movesChart').getContext('2d');
        
        // Correction de la résolution du canvas pour éviter le flou
        this.adjustCanvasResolution(ctx.canvas);
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Coups minimum restants',
                        data: [],
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 2,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Nombre de coups joués',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Coups minimum restants',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Progression vers la solution',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 14
                        },
                        callbacks: {
                            title: function(context) {
                                return `Coup #${context[0].label}`;
                            },
                            label: function(context) {
                                return `Coups restants: ${context.parsed.y}`;
                            },
                            afterLabel: function(context) {
                                const index = context.dataIndex;
                                const dataset = context.chart.data.datasets[0];
                                
                                // Afficher la progression en pourcentage
                                if (index > 0 && dataset.data[0] > 0) {
                                    const progressPercent = Math.round((1 - dataset.data[index] / dataset.data[0]) * 100);
                                    return `Progression: ${progressPercent}%`;
                                }
                                return '';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000
                }
            }
        });
    }
    
    // Ajuster la résolution du canvas pour éviter le flou
    adjustCanvasResolution(canvas) {
        // Obtenir le contexte de rendu et la taille d'affichage
        const ctx = canvas.getContext('2d');
        const container = canvas.parentNode;
        const containerStyle = window.getComputedStyle(container);
        
        // Obtenir la largeur du conteneur (moins le padding)
        const containerWidth = parseInt(containerStyle.width, 10) - 
            (parseInt(containerStyle.paddingLeft, 10) + 
            parseInt(containerStyle.paddingRight, 10));
        
        // Définir les dimensions du canvas à la taille du conteneur
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        // Améliorer la résolution en multipliant par le ratio de pixels de l'appareil
        const dpr = window.devicePixelRatio || 1;
        canvas.width = containerWidth * dpr;
        canvas.height = (containerWidth * 0.6) * dpr; // Ratio hauteur/largeur de 0.6
        
        // Mettre à l'échelle le contexte
        ctx.scale(dpr, dpr);
    }
    
    // Redimensionner le graphique quand la taille de la fenêtre change
    resizeChart() {
        if (this.chart) {
            const canvas = this.chart.canvas;
            if (canvas) {
                this.adjustCanvasResolution(canvas);
                this.chart.resize();
            }
        }
    }

    updateChart(movesPlayed, minMovesRemaining) {
        // Store the data
        if (minMovesRemaining > 0) {
        this.movesData.push({
            movesPlayed,
            minMovesRemaining
        });}

        // Toujours afficher l'historique complet
        // Reconstruire le graphique à chaque mise à jour avec des indices commençant à 1
        this.chart.data.labels = this.movesData.map((move, index) => index + 1); // Commencer à 1 au lieu de 0
        this.chart.data.datasets[0].data = this.movesData.map(move => move.minMovesRemaining);
        
        // Afficher le niveau de difficulté dans le titre du graphique
        const initialMinMoves = this.movesData.length > 0 
            ? this.movesData[0].minMovesRemaining 
            : minMovesRemaining;
            
        this.updateDifficultyLabel(initialMinMoves);
        
        // Désactiver l'animation pour une mise à jour plus rapide
        this.chart.options.animation = false;
        
        // Utiliser requestAnimationFrame pour la mise à jour du graphique
        requestAnimationFrame(() => {
            this.chart.update('none'); // Mode 'none' pour une mise à jour instantanée
        });
    }
    
    // Nouvelle méthode pour déterminer et afficher le niveau de difficulté
    updateDifficultyLabel(minMoves) {
        let difficultyLevel = "";
        let difficultyColor = "";
        
        // Déterminer le niveau de difficulté en fonction du nombre minimal de coups
        if (minMoves < 5) {
            difficultyLevel = "Très facile";
            difficultyColor = "rgba(46, 204, 113, 1)"; // Vert
        } else if (minMoves < 10) {
            difficultyLevel = "Facile";
            difficultyColor = "rgba(52, 152, 219, 1)"; // Bleu
        } else if (minMoves < 15) {
            difficultyLevel = "Moyen";
            difficultyColor = "rgba(241, 196, 15, 1)"; // Jaune
        } else if (minMoves < 20) {
            difficultyLevel = "Difficile";
            difficultyColor = "rgba(230, 126, 34, 1)"; // Orange
        } else if (minMoves < 25) {
            difficultyLevel = "Très difficile";
            difficultyColor = "rgba(231, 76, 60, 1)"; // Rouge
        } else {
            difficultyLevel = "Extrême";
            difficultyColor = "rgba(142, 68, 173, 1)"; // Violet
        }
        
        // Mettre à jour le titre du graphique avec le niveau de difficulté
        this.chart.options.plugins.title.text = `Progression vers la solution (Difficulté: ${difficultyLevel})`;
        this.chart.options.plugins.title.color = difficultyColor;
    }

    resetChart() {
        // Clear the data
        this.movesData = [];
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        
        // Réinitialiser le titre du graphique
        this.chart.options.plugins.title.text = 'Progression vers la solution';
        this.chart.options.plugins.title.color = undefined;
        
        // Update chart
        this.chart.update();
    }
}
