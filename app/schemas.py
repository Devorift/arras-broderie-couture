from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class TacheIn(BaseModel):
    num_client: Optional[str] = None
    nom_client: str = Field(min_length=1)
    prenom_client: Optional[str] = None
    date_fin: Optional[date] = None
    commentaire: Optional[str] = None


class BroderieIn(TacheIn):
    produit: Optional[str] = None
    motif: str = Field(min_length=1)
    emplacement: str = Field(min_length=1)
    couleur: str = Field(min_length=1)


class ReparationIn(TacheIn):
    marque: Optional[str] = None
    machine: str = Field(min_length=1)


class RetoucheIn(TacheIn):
    description: Optional[str] = None


class ClientIn(BaseModel):
    num_client: Optional[str] = None
    nom_client: str = Field(min_length=1)
    prenom_client: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
