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
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Changé à false pour un meilleur contrôle
                devicePixelRatio: 2, // Améliore la netteté sur écrans haute résolution
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Nombre de coups joués'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Coups minimum restants'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Progression vers la solution'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Coups restants: ${context.parsed.y}`;
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
        this.movesData.push({
            movesPlayed,
            minMovesRemaining
        });

        // Limiter le nombre de points sur le graphique pour éviter les lags
        const maxDataPoints = 50;
        if (this.chart.data.labels.length > maxDataPoints) {
            // Garder seulement les points les plus récents
            this.chart.data.labels = this.chart.data.labels.slice(-maxDataPoints);
            this.chart.data.datasets[0].data = this.chart.data.datasets[0].data.slice(-maxDataPoints);
            this.movesData = this.movesData.slice(-maxDataPoints);
        }

        // Update chart data
        this.chart.data.labels.push(movesPlayed);
        this.chart.data.datasets[0].data.push(minMovesRemaining);
        
        // Désactiver l'animation pour une mise à jour plus rapide
        this.chart.options.animation = false;
        
        // Utiliser requestAnimationFrame pour la mise à jour du graphique
        requestAnimationFrame(() => {
            this.chart.update('none'); // Mode 'none' pour une mise à jour instantanée
        });
    }

    resetChart() {
        // Clear the data
        this.movesData = [];
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        
        // Update chart
        this.chart.update();
    }
}
