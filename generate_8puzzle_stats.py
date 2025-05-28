#!/usr/bin/env python3
"""
Script pour générer toutes les combinaisons possibles du 8-Puzzle,
calculer leur nombre minimum de mouvements pour la résolution,
et enregistrer la distribution des états par nombre de mouvements.

Ce script utilise une recherche en largeur (BFS) pour calculer le nombre minimal
de mouvements nécessaires pour résoudre chaque état du puzzle.
"""

import itertools
import numpy as np
import collections
import time
import json
import os
from collections import deque
from datetime import datetime

def is_solvable(state):
    """
    Vérifie si une configuration du 8-puzzle est résoluble.
    Pour le 8-puzzle, un état est résoluble si et seulement si 
    le nombre d'inversions est pair.
    """
    # Convertir l'état en une liste plate sans le zéro (case vide)
    flat_state = [x for x in state if x != 0]
    
    # Compter les inversions
    inversions = 0
    for i in range(len(flat_state)):
        for j in range(i + 1, len(flat_state)):
            if flat_state[i] > flat_state[j]:
                inversions += 1
                
    return inversions % 2 == 0

def get_neighbors(state):
    """
    Trouve tous les états voisins possibles à partir d'un état donné.
    Un voisin est obtenu en déplaçant la case vide dans une des 
    quatre directions possibles (haut, bas, gauche, droite).
    """
    neighbors = []
    
    # Convertir la liste à 1D en grille 3x3 pour faciliter le calcul des voisins
    # Utiliser des listes pour la grille, car les tuples ne sont pas modifiables
    grid = [[state[i+j] for j in range(3)] for i in range(0, 9, 3)]
    
    # Trouver la position du zéro (case vide)
    empty_pos = None
    for i in range(3):
        for j in range(3):
            if grid[i][j] == 0:
                empty_pos = (i, j)
                break
        if empty_pos:
            break
    
    # Directions possibles: haut, bas, gauche, droite
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    
    for dr, dc in directions:
        new_r, new_c = empty_pos[0] + dr, empty_pos[1] + dc
        
        # Vérifier si la nouvelle position est valide
        if 0 <= new_r < 3 and 0 <= new_c < 3:
            # Créer une copie de la grille
            new_grid = [row[:] for row in grid]
            
            # Échanger la case vide avec la case adjacente
            new_grid[empty_pos[0]][empty_pos[1]] = new_grid[new_r][new_c]
            new_grid[new_r][new_c] = 0
            
            # Convertir la grille 3x3 en liste 1D
            new_state = tuple(item for row in new_grid for item in row)
            neighbors.append(new_state)
    
    return neighbors

def generate_all_states():
    """
    Génère tous les états possibles du 8-puzzle.
    Il y a 9! arrangements possibles des chiffres 0-8,
    mais seulement la moitié sont résolubles, donc 9!/2 = 181,440 états.
    """
    # Toutes les permutations des chiffres 0-8
    all_permutations = set(itertools.permutations(range(9)))
    
    # Filtrer pour ne garder que les états résolubles
    solvable_states = set(state for state in all_permutations if is_solvable(state))
    
    print(f"Nombre total d'états possibles: {len(all_permutations)}")
    print(f"Nombre d'états résolubles: {len(solvable_states)}")
    
    return solvable_states

def calculate_min_moves():
    """
    Calcule le nombre minimum de mouvements nécessaires pour résoudre
    tous les états possibles du 8-puzzle à partir de l'état objectif.
    
    Cette fonction utilise une recherche en largeur (BFS) depuis l'état
    final et enregistre le nombre de mouvements pour atteindre chaque état.
    """
    print("Calcul du nombre minimum de mouvements pour tous les états...")
    start_time = time.time()
    
    # État objectif (puzzle résolu)
    goal_state = (1, 2, 3, 4, 5, 6, 7, 8, 0)  # Configuration standard avec la case vide à la fin
    
    # File d'attente pour BFS
    queue = deque([(goal_state, 0)])  # (état, nombre de mouvements)
    
    # Dictionnaire pour stocker le nombre minimum de mouvements pour chaque état
    min_moves = {goal_state: 0}
    
    # Compteur pour suivre la progression
    states_processed = 0
    last_report = time.time()
    
    # Parcours en largeur
    while queue:
        current_state, moves = queue.popleft()
        
        # Obtenir tous les états voisins
        for neighbor in get_neighbors(current_state):
            # Si ce voisin n'a pas encore été visité
            if neighbor not in min_moves:
                min_moves[neighbor] = moves + 1
                queue.append((neighbor, moves + 1))
        
        states_processed += 1
        # Rapport d'avancement toutes les 5 secondes
        if time.time() - last_report > 5:
            print(f"États traités: {states_processed}, file d'attente: {len(queue)}, "
                  f"états uniques: {len(min_moves)}, temps écoulé: {time.time() - start_time:.1f}s")
            last_report = time.time()
    
    end_time = time.time()
    print(f"Calcul terminé en {end_time - start_time:.2f} secondes.")
    
    # Vérifier que tous les états résolubles ont été traités
    all_solvable = generate_all_states()
    missing_states = all_solvable - set(min_moves.keys())
    
    if missing_states:
        print(f"Attention: {len(missing_states)} états résolubles n'ont pas été atteints!")
    else:
        print("Tous les états résolubles ont été traités avec succès.")
    
    return min_moves

def save_distribution(min_moves_dict, filename="8puzzle_distribution.txt"):
    """
    Analyse les données et enregistre la distribution des états
    par nombre minimum de mouvements dans un fichier.
    """
    # Compter le nombre d'états pour chaque nombre de mouvements
    move_counts = collections.Counter(min_moves_dict.values())
    
    # Déterminer le nombre maximum de mouvements
    max_moves = max(move_counts.keys())
    
    # Préparer les données pour l'enregistrement
    total_states = sum(move_counts.values())
    cumulative = 0
    
    with open(filename, 'w') as f:
        # En-tête et informations générales
        f.write(f"Distribution des états du 8-Puzzle par nombre minimum de mouvements\n")
        f.write(f"Date de génération: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Nombre total d'états: {total_states}\n")
        f.write(f"Nombre maximum de mouvements: {max_moves}\n\n")
        
        # En-tête du tableau
        f.write("| Mouvements | Nombre d'états | Pourcentage | Cumulatif |\n")
        f.write("|------------|----------------|-------------|------------|\n")
        
        # Données du tableau
        for moves in range(max_moves + 1):
            count = move_counts.get(moves, 0)
            percentage = (count / total_states) * 100
            cumulative += count
            cumulative_percentage = (cumulative / total_states) * 100
            
            f.write(f"| {moves:10d} | {count:14,d} | {percentage:11.6f}% | {cumulative_percentage:10.6f}% |\n")
    
    print(f"Distribution enregistrée dans {filename}")
    
    # Aussi enregistrer les données en JSON pour une utilisation ultérieure
    json_filename = filename.replace('.txt', '.json')
    json_data = {
        'total_states': total_states,
        'max_moves': max_moves,
        'distribution': {str(k): v for k, v in move_counts.items()}
    }
    
    with open(json_filename, 'w') as f:
        json.dump(json_data, f, separators=(',', ':'))
    
    print(f"Données JSON enregistrées dans {json_filename}")

def save_full_data(min_moves_dict, filename="8puzzle_full_data.json"):
    """
    Enregistre toutes les données complètes (état -> nombre de mouvements)
    dans un fichier JSON.
    """
    # Convertir les tuples en listes pour JSON
    json_data = {str(list(state)): moves for state, moves in min_moves_dict.items()}
    
    with open(filename, 'w') as f:
        json.dump(json_data, f, separators=(',', ':'))
    
    print(f"Données complètes enregistrées dans {filename}")

def save_moves_by_count(min_moves_dict, output_dir="assets/move_data"):
    """
    Génère un fichier JSON séparé pour chaque nombre de mouvements possible.
    Chaque fichier contient tous les états qui peuvent être résolus en exactement ce nombre de mouvements.
    
    Args:
        min_moves_dict: Dictionnaire des états avec leur nombre minimal de mouvements
        output_dir: Dossier de sortie pour les fichiers JSON
    """
    # Créer le dossier s'il n'existe pas
    os.makedirs(output_dir, exist_ok=True)
    print(f"Dossier de sortie créé: {output_dir}")
    
    # Regrouper les états par nombre de mouvements
    states_by_moves = {}
    for state, moves in min_moves_dict.items():
        if moves not in states_by_moves:
            states_by_moves[moves] = []
        states_by_moves[moves].append(list(state))
    
    # Enregistrer un fichier JSON par nombre de mouvements
    for moves, states in states_by_moves.items():
        filename = os.path.join(output_dir, f"moves_{moves}.json")
        
        # Données pour ce nombre de mouvements spécifique
        json_data = {
            'moves': moves,
            'count': len(states),
            'states': states
        }
        
        with open(filename, 'w') as f:
            json.dump(json_data, f, separators=(',', ':'))
        
        print(f"Fichier pour {moves} mouvements enregistré: {filename} ({len(states)} états)")
    
    # Créer un fichier index qui liste tous les fichiers générés
    index_data = {
        'total_files': len(states_by_moves),
        'max_moves': max(states_by_moves.keys()),
        'files': {str(moves): f"moves_{moves}.json" for moves in states_by_moves.keys()},
        'counts': {str(moves): len(states) for moves, states in states_by_moves.items()}
    }
    
    index_filename = os.path.join(output_dir, "index.json")
    with open(index_filename, 'w') as f:
        json.dump(index_data, f, separators=(',', ':'))
    
    print(f"Index des fichiers enregistré: {index_filename}")

def main():
    print("Génération des statistiques pour le 8-Puzzle")
    
    try:
        # Calculer le nombre minimum de mouvements pour tous les états
        min_moves_dict = calculate_min_moves()
        
        # Enregistrer la distribution
        save_distribution(min_moves_dict)
        
        # Générer les fichiers JSON séparés par nombre de mouvements
        print("\nGénération des fichiers JSON par nombre de mouvements...")
        save_moves_by_count(min_moves_dict)
        
        # Sauvegarder les données complètes si nécessaire
        # Note: Ce fichier peut être très volumineux
        save_decision = input("Voulez-vous enregistrer les données complètes? (o/n): ")
        if save_decision.lower() in ('o', 'oui', 'y', 'yes'):
            save_full_data(min_moves_dict)
        
    except KeyboardInterrupt:
        print("\nOpération annulée par l'utilisateur.")
    except Exception as e:
        print(f"Une erreur s'est produite: {e}")

if __name__ == "__main__":
    main()
