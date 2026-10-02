from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

BASE_DIR = Path(__file__).parent
app = FastAPI(title="Atelier")


def to_dict(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def make_router(name: str, Model, Schema) -> APIRouter:
    """CRUD générique : GET / POST / PUT / DELETE sur /api/<name>."""
    router = APIRouter(prefix=f"/api/{name}", tags=[name])

    @router.get("")
    def list_items(db: Session = Depends(get_db)):
        return [to_dict(o) for o in db.query(Model).order_by(Model.id.desc()).all()]

    @router.post("", status_code=201)
    def create_item(payload: Schema, db: Session = Depends(get_db)):
        obj = Model(**payload.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return to_dict(obj)

    @router.put("/{item_id}")
    def update_item(item_id: int, payload: Schema, db: Session = Depends(get_db)):
        obj = db.get(Model, item_id)
        if not obj:
            raise HTTPException(404, "Élément introuvable")
        for key, value in payload.model_dump().items():
            setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        return to_dict(obj)

    @router.delete("/{item_id}", status_code=204)
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        obj = db.get(Model, item_id)
        if not obj:
            raise HTTPException(404, "Élément introuvable")
        db.delete(obj)
        db.commit()

    return router


TYPES = {
    "broderie": (models.Broderie, schemas.BroderieIn),
    "reparation": (models.Reparation, schemas.ReparationIn),
    "retouche": (models.Retouche, schemas.RetoucheIn),
}
for _name, (_model, _schema) in TYPES.items():
    app.include_router(make_router(_name, _model, _schema))
app.include_router(make_router("clients", models.Client, schemas.ClientIn))


def details(kind: str, o) -> str:
    if kind == "broderie":
        parts = [o.produit, o.motif, o.emplacement, o.couleur]
    elif kind == "reparation":
        parts = [o.marque, o.machine]
    else:
        parts = [o.description]
    return " · ".join(p for p in parts if p)


SORTABLE = {"type", "id", "num_client", "nom_client", "prenom_client",
            "date_creation", "date_fin", "details", "commentaire"}


@app.get("/api/taches", tags=["taches"])
def all_tasks(
    type_: Optional[str] = Query(None, alias="type"),
    sort: str = "date_creation",
    order: str = "desc",
    db: Session = Depends(get_db),
):
    """Toutes les tâches, filtrables par type et triables sur n'importe quelle colonne."""
    if sort not in SORTABLE:
        raise HTTPException(400, f"Tri impossible sur '{sort}'")
    if type_ and type_ not in TYPES:
        raise HTTPException(400, f"Type inconnu : '{type_}'")

    rows = []
    for kind, (Model, _) in TYPES.items():
        if type_ and kind != type_:
            continue
        for o in db.query(Model).all():
            rows.append({
                "type": kind, "id": o.id, "num_client": o.num_client,
                "nom_client": o.nom_client, "prenom_client": o.prenom_client,
                "date_creation": o.date_creation, "date_fin": o.date_fin,
                "details": details(kind, o), "commentaire": o.commentaire,
            })

    filled = [r for r in rows if r[sort] not in (None, "")]
    empty = [r for r in rows if r[sort] in (None, "")]
    filled.sort(key=lambda r: r[sort].lower() if isinstance(r[sort], str) else r[sort],
                reverse=(order == "desc"))
    return filled + empty  # les valeurs vides restent toujours en bas


app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(BASE_DIR / "static" / "index.html")
