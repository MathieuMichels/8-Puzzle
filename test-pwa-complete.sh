#!/bin/bash

echo "🧪 Test PWA 8-Puzzle - Version 1.4.0"
echo "======================================"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📂 Vérification des fichiers...${NC}"

# Vérifier les fichiers essentiels
files=("index.html" "service-worker.js" "manifest.json" "assets/css/style.css" "assets/js/script.js")

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ✅ $file"
    else
        echo -e "  ${RED}❌ $file manquant${NC}"
    fi
done

echo ""
echo -e "${BLUE}🔍 Vérification du contenu...${NC}"

# Vérifier le Service Worker
if grep -q "8puzzle-cache-v6" service-worker.js; then
    echo -e "  ✅ Version cache correcte (v6)"
else
    echo -e "  ${RED}❌ Version cache incorrecte${NC}"
fi

if grep -q "1.4.0" service-worker.js; then
    echo -e "  ✅ Version app correcte (1.4.0)"
else
    echo -e "  ${RED}❌ Version app incorrecte${NC}"
fi

# Vérifier le manifeste
if grep -q "1.4.0" manifest.json; then
    echo -e "  ✅ Version manifeste correcte (1.4.0)"
else
    echo -e "  ${RED}❌ Version manifeste incorrecte${NC}"
fi

# Vérifier l'enregistrement SW dans index.html
if grep -q "serviceWorker.register" index.html; then
    echo -e "  ✅ Enregistrement Service Worker présent"
else
    echo -e "  ${RED}❌ Enregistrement Service Worker manquant${NC}"
fi

echo ""
echo -e "${BLUE}🌐 Test serveur local...${NC}"

# Démarrer le serveur en arrière-plan s'il n'est pas déjà lancé
if ! pgrep -f "python3 -m http.server" > /dev/null; then
    echo "  📡 Démarrage du serveur local..."
    python3 -m http.server 8000 > /dev/null 2>&1 &
    sleep 2
fi

# Tester la disponibilité
if curl -s http://localhost:8000 > /dev/null; then
    echo -e "  ✅ Serveur local accessible"
else
    echo -e "  ${RED}❌ Serveur local inaccessible${NC}"
fi

# Tester les ressources essentielles
resources=("/" "/service-worker.js" "/manifest.json" "/assets/css/style.css")

for resource in "${resources[@]}"; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000$resource")
    if [ "$http_code" = "200" ]; then
        echo -e "  ✅ $resource (HTTP $http_code)"
    else
        echo -e "  ${RED}❌ $resource (HTTP $http_code)${NC}"
    fi
done

echo ""
echo -e "${BLUE}📱 URLs de test disponibles:${NC}"
echo "  🌐 Application: http://localhost:8000"
echo "  🧪 Test PWA: http://localhost:8000/test-pwa.html"
echo "  🔧 Test SW Simple: http://localhost:8000/test-sw-simple.html"

echo ""
echo -e "${YELLOW}📋 Instructions de test:${NC}"
echo "1. Ouvrez http://localhost:8000 dans Chrome/Firefox"
echo "2. Ouvrez les DevTools (F12) > Console"
echo "3. Vérifiez les messages de Service Worker"
echo "4. Onglet Application/Storage > Service Workers"
echo "5. Testez l'installation PWA (icône + dans la barre d'adresse)"
echo "6. Testez le mode offline (DevTools > Network > Offline)"

echo ""
echo -e "${GREEN}✅ Script de test terminé!${NC}"
