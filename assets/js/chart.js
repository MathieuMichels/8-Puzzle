class PuzzleChart {
    constructor() {
        this.movesData = [];
        this.chart = null;
        this.initChart();
        
        window.addEventListener('resize', () => this.resizeChart());
    }

    initChart() {
        const ctx = document.getElementById('movesChart').getContext('2d');
        
        this.adjustCanvasResolution(ctx.canvas);
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Minimum moves remaining',
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
                            text: 'Number of moves played',
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
                            text: 'Minimum moves remaining',
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
                        text: 'Progress towards solution',
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
                                return `Move #${context[0].label}`;
                            },
                            label: function(context) {
                                return `Moves remaining: ${context.parsed.y}`;
                            },
                            afterLabel: function(context) {
                                const index = context.dataIndex;
                                const dataset = context.chart.data.datasets[0];
                                
                                if (index > 0 && dataset.data[0] > 0) {
                                    const progressPercent = Math.round((1 - dataset.data[index] / dataset.data[0]) * 100);
                                    return `Progress: ${progressPercent}%`;
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
    
    adjustCanvasResolution(canvas) {
        const ctx = canvas.getContext('2d');
        const container = canvas.parentNode;
        const containerStyle = window.getComputedStyle(container);
        
        const containerWidth = parseInt(containerStyle.width, 10) - 
            (parseInt(containerStyle.paddingLeft, 10) + 
            parseInt(containerStyle.paddingRight, 10));
        
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = containerWidth * dpr;
        canvas.height = (containerWidth * 0.6) * dpr;
        
        ctx.scale(dpr, dpr);
    }
    
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
        if (minMovesRemaining > 0) {
        this.movesData.push({
            movesPlayed,
            minMovesRemaining
        });}

        this.chart.data.labels = this.movesData.map((move, index) => index + 1);
        this.chart.data.datasets[0].data = this.movesData.map(move => move.minMovesRemaining);
        
        const initialMinMoves = this.movesData.length > 0 
            ? this.movesData[0].minMovesRemaining 
            : minMovesRemaining;
            
        this.updateDifficultyLabel(initialMinMoves);
        
        this.chart.options.animation = false;
        
        requestAnimationFrame(() => {
            this.chart.update('none');
        });
    }
    
    updateDifficultyLabel(minMoves) {
        let difficultyLevel = "";
        let difficultyColor = "";
        
        if (minMoves < 5) {
            difficultyLevel = "Very Easy";
            difficultyColor = "rgba(46, 204, 113, 1)";
        } else if (minMoves < 10) {
            difficultyLevel = "Easy";
            difficultyColor = "rgba(52, 152, 219, 1)";
        } else if (minMoves < 15) {
            difficultyLevel = "Medium";
            difficultyColor = "rgba(241, 196, 15, 1)";
        } else if (minMoves < 20) {
            difficultyLevel = "Hard";
            difficultyColor = "rgba(230, 126, 34, 1)";
        } else if (minMoves < 25) {
            difficultyLevel = "Very Hard";
            difficultyColor = "rgba(231, 76, 60, 1)";
        } else {
            difficultyLevel = "Extreme";
            difficultyColor = "rgba(142, 68, 173, 1)";
        }
        
        this.chart.options.plugins.title.text = `Progress towards solution (Difficulty: ${difficultyLevel})`;
        this.chart.options.plugins.title.color = difficultyColor;
    }

    resetChart() {
        this.movesData = [];
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        
        this.chart.options.plugins.title.text = 'Progress towards solution';
        this.chart.options.plugins.title.color = undefined;
        
        this.chart.update();
    }
}
