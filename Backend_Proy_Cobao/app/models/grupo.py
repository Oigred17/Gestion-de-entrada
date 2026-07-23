from sqlalchemy import Column, ForeignKey, Integer, SmallInteger, UniqueConstraint
from sqlalchemy.orm import column_property
from sqlalchemy.sql import expression

from app.database import Base


class Grupo(Base):
    __tablename__ = "grupos"
    __table_args__ = (
        UniqueConstraint("clave_grupo", "ciclo_escolar_id", name="uq_grupo_ciclo"),
    )

    id = Column(Integer, primary_key=True, index=True)
    clave_grupo = Column(SmallInteger, nullable=False)
    ciclo_escolar_id = Column(Integer, ForeignKey("ciclos_escolares.id"), nullable=False)

    # semestre se calcula automáticamente: clave_grupo / 100
    semestre = column_property(
        expression.cast(clave_grupo // 100, Integer)
    )
