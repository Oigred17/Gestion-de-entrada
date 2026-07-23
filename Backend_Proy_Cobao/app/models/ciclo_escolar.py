from sqlalchemy import Boolean, Column, Date, Integer, String

from app.database import Base


class CicloEscolar(Base):
    __tablename__ = "ciclos_escolares"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(20), unique=True, nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    activo = Column(Boolean, nullable=False, default=False)
