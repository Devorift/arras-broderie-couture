# Atelier

Gestion des tâches Broderie / Réparation / Retouche (FastAPI + SQLite).

## Lancer avec Docker
    docker compose up --build
Ouvrir http://localhost:8000 (documentation API : http://localhost:8000/docs).
La base est stockée dans `./data/atelier.db`.

## Lancer sans Docker
    pip install -r requirements.txt
    uvicorn app.main:app --reload
