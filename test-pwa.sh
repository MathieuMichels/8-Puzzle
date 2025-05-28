#!/bin/bash

# Script de test pour la PWA 8-Puzzle
echo "=== Test de la PWA 8-Puzzle ==="
echo

# Vérifier que les fichiers essentiels existent
echo "1. Vérification des fichiers essentiels:"
files=(
    "index.html"
    "manifest.json"
    "service-worker.js"
    "assets/css/style.css"
    "assets/js/script.js"
    "assets/js/chart.js"
    "logo.svg"
    "icons/icon-192x192.svg"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ✗ $file (MANQUANT)"
    fi
done

echo

# Vérifier la syntaxe JSON du manifeste
echo "2. Validation du manifeste:"
if command -v python3 &> /dev/null; then
    if python3 -m json.tool manifest.json > /dev/null 2>&1; then
        echo "   ✓ manifest.json est valide"
    else
        echo "   ✗ manifest.json contient des erreurs"
    fi
else
    echo "   ! Python3 non disponible pour validation JSON"
fi

echo

# Vérifier la syntaxe JavaScript du service worker
echo "3. Vérification du Service Worker:"
if command -v node &> /dev/null; then
    if node -c service-worker.js 2>/dev/null; then
        echo "   ✓ service-worker.js syntaxe valide"
    else
        echo "   ✗ service-worker.js contient des erreurs de syntaxe"
    fi
else
    echo "   ! Node.js non disponible pour validation JavaScript"
fi

echo

# Vérifier les données de mouvements
echo "4. Vérification des données de mouvements:"
move_files_count=$(find assets/move_data -name "moves_*.json" 2>/dev/null | wc -l)
echo "   → $move_files_count fichiers de données trouvés"

if [ -f "assets/move_data/index.json" ]; then
    echo "   ✓ index.json présent"
else
    echo "   ✗ index.json manquant"
fi

echo

# Test du serveur local
echo "5. Instructions pour tester la PWA:"
echo "   1. Démarrer le serveur: python3 -m http.server 8080"
echo "   2. Ouvrir http://localhost:8080 dans le navigateur"
echo "   3. Ouvrir les outils de développement (F12)"
echo "   4. Vérifier l'onglet 'Application' > 'Service Workers'"
echo "   5. Tester le mode hors ligne dans l'onglet 'Network'"
echo "   6. Utiliser test-pwa.html pour des tests détaillés"

echo
echo "=== Fin du test ==="
