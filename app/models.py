from datetime import datetime
from sqlalchemy import Column, Date, DateTime, Integer, String, Text
from .database import Base


class Client(Base):
    __tablename__ = "client"
    id = Column(Integer, primary_key=True, index=True)
    num_client = Column(String, unique=True, nullable=True)
    nom_client = Column(String, nullable=False)
    prenom_client = Column(String, nullable=True)
    telephone = Column(String, nullable=True)
    email = Column(String, nullable=True)


class TacheBase:
    """Colonnes communes aux trois types de tâches."""
    id = Column(Integer, primary_key=True, index=True)
    num_client = Column(String, nullable=True)
    nom_client = Column(String, nullable=False)
    prenom_client = Column(String, nullable=True)
    date_creation = Column(DateTime, default=datetime.now, nullable=False)
    date_fin = Column(Date, nullable=True)
    commentaire = Column(Text, nullable=True)


class Broderie(TacheBase, Base):
    __tablename__ = "broderie"
    produit = Column(String, nullable=True)
    motif = Column(String, nullable=False)
    emplacement = Column(String, nullable=False)
    couleur = Column(String, nullable=False)


class Reparation(TacheBase, Base):
    __tablename__ = "reparation"
    marque = Column(String, nullable=True)
    machine = Column(String, nullable=False)


class Retouche(TacheBase, Base):
    __tablename__ = "retouche"
    # Structure à définir plus tard : champ libre en attendant.
    description = Column(Text, nullable=True)
