from sqlalchemy import Column, Date, ForeignKey, Integer, Text

from app.database import Base


class Retardo(Base):
    __tablename__ = "retardos"

    id_retardo = Column(Integer, primary_key=True, index=True)
    id_alumno = Column(Integer, ForeignKey("alumnos.id_alumno"), nullable=False)
    fecha = Column(Date, nullable=False)
    minutos_retardo = Column(Integer, nullable=False)
    observaciones = Column(Text, nullable=True)
