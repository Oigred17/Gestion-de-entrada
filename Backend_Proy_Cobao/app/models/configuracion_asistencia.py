from sqlalchemy import Column, SmallInteger, Time

from app.database import Base


class ConfiguracionAsistencia(Base):
    __tablename__ = "configuracion_asistencia"

    id = Column(SmallInteger, primary_key=True, default=1)
    hora_entrada_limite = Column(Time, nullable=False, server_default="07:00:00")
    minutos_tolerancia = Column(SmallInteger, nullable=False, server_default="10")
    segundos_antirebote = Column(SmallInteger, nullable=False, server_default="15")
