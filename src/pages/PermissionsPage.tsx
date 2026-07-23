import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Eye,
  Check,
  X as XIcon,
  Clock,
  FileText,
  Calendar,
  Repeat,
} from "lucide-react";
import { alumnosApi } from "../api";
import type { UserRole } from "../App";

type DiaSemana = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado';

interface AlumnoData {
  id: number;
  matricula: string;
  nombreCompleto: string;
  grupo: string;
  activo: boolean;
  tutorNombre: string;
  tutorTelefono: string;
  capacitacion: string;
  turno: string;
}

interface Permission {
  id: number;
  alumno: AlumnoData;
  fecha: string;
  esVariosDias?: boolean;
  diasSemana?: DiaSemana[];
  horaSalida: string;
  motivo: string;
  solicitadoPor: string;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Vencido';
  codigo?: string;
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const TABS = ["Todos", "Pendientes", "Aprobados", "Rechazados", "Vencidos"] as const;
type TabType = (typeof TABS)[number];

const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getSolicitadoPor(role: UserRole): string {
  return role === 'Directivo' ? 'Directivo (Lic. Fabian Ocampo)' : 'Prefecto (Vigilancia)';
}

interface PermissionsPageProps {
  role: UserRole;
}

export default function PermissionsPage({ role }: PermissionsPageProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [newAlumnoSearch, setNewAlumnoSearch] = useState("");
  const [newAlumno, setNewAlumno] = useState<string>("");
  const [newEsVariosDias, setNewEsVariosDias] = useState(false);
  const [newFecha, setNewFecha] = useState("");
  const [newDiasSemana, setNewDiasSemana] = useState<DiaSemana[]>([]);
  const [newHora, setNewHora] = useState("");
  const [newMotivo, setNewMotivo] = useState("");
  const [newNotificar, setNewNotificar] = useState(false);

  const [alumnos, setAlumnos] = useState<AlumnoData[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    const fetchAlumnos = async () => {
      try {
        const data = await alumnosApi.getAll();
        const mapped: AlumnoData[] = data.map(a => ({
          id: a.id,
          matricula: a.matricula,
          nombreCompleto: `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`,
          grupo: a.grupo_id ? `Grupo ${a.grupo_id}` : 'Sin grupo',
          activo: a.estatus === 'activo',
          tutorNombre: 'No disponible',
          tutorTelefono: 'No disponible',
          capacitacion: 'No disponible',
          turno: 'No disponible',
        }));
        setAlumnos(mapped);
      } catch (error) {
        console.error('Error fetching alumnos:', error);
      }
    };
    fetchAlumnos();
  }, []);

  const solicitadoPor = getSolicitadoPor(role);

  const filteredPermissions = permissions.filter((p) => {
    const matchesSearch =
      !search ||
      p.alumno.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
      p.alumno.matricula.toLowerCase().includes(search.toLowerCase()) ||
      p.alumno.grupo.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      activeTab === "Todos" ||
      (activeTab === "Pendientes" && p.estado === "Pendiente") ||
      (activeTab === "Aprobados" && p.estado === "Aprobado") ||
      (activeTab === "Rechazados" && p.estado === "Rechazado") ||
      (activeTab === "Vencidos" && p.estado === "Vencido");

    return matchesSearch && matchesTab;
  });

  const totalPages = Math.ceil(filteredPermissions.length / rowsPerPage);
  const paginatedPermissions = filteredPermissions.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const tabCount = (tab: TabType) => {
    if (tab === "Todos") return permissions.length;
    const map: Record<string, string> = {
      Pendientes: "Pendiente",
      Aprobados: "Aprobado",
      Rechazados: "Rechazado",
      Vencidos: "Vencido",
    };
    return permissions.filter((p) => p.estado === map[tab]).length;
  };

  const filteredAlumnos = alumnos.filter(
    (s) =>
      s.activo &&
      (s.nombreCompleto.toLowerCase().includes(newAlumnoSearch.toLowerCase()) ||
        s.matricula.toLowerCase().includes(newAlumnoSearch.toLowerCase()))
  );

  const estadoBadge = (estado: Permission["estado"]) => {
    const styles: Record<string, { bg: string; color: string }> = {
      Pendiente: { bg: "#FEEBEE", color: "#1792AB" },
      Aprobado: { bg: "#E8F5E9", color: "#0F8122" },
      Rechazado: { bg: "#FEEBEE", color: "#AB1748" },
      Vencido: { bg: "#F5F5F5", color: "#5F5657" },
    };
    const s = styles[estado] || styles.Pendiente;
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          background: s.bg,
          color: s.color,
        }}
      >
        {estado}
      </span>
    );
  };

  const handleApprove = (perm: Permission) => {
    const code = generateCode();
    const updated = { ...perm, estado: "Aprobado" as const, codigo: code };
    setSelectedPermission(updated);
  };

  const toggleDia = (dia: DiaSemana) => {
    setNewDiasSemana(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const handleSaveNew = () => {
    if (!newAlumno || !newHora || !newMotivo) return;
    if (!newEsVariosDias && !newFecha) return;
    if (newEsVariosDias && newDiasSemana.length === 0) return;
    const foundStudent = alumnos.find(s => s.nombreCompleto === newAlumno) ?? alumnos[0];
    const newPermission: Permission = {
      id: Date.now(),
      alumno: foundStudent,
      fecha: newEsVariosDias ? `Se repite: ${newDiasSemana.join(', ')}` : newFecha,
      ...(newEsVariosDias && { esVariosDias: true, diasSemana: newDiasSemana }),
      horaSalida: newHora,
      motivo: newMotivo,
      solicitadoPor,
      estado: "Pendiente",
    };
    setPermissions(prev => [...prev, newPermission]);
    setShowNewModal(false);
    setNewAlumno("");
    setNewAlumnoSearch("");
    setNewEsVariosDias(false);
    setNewFecha("");
    setNewDiasSemana([]);
    setNewHora("");
    setNewMotivo("");
    setNewNotificar(false);
  };

  const handleReject = (perm: Permission) => {
    const updated = { ...perm, estado: "Rechazado" as const };
    setSelectedPermission(updated);
  };

  return (
    <div>
      <div
        style={{
          background: "#fff",
          height: 72,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 16,
          borderBottom: "1px solid #CAC6C7",
          borderRadius: "12px 12px 0 0",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", maxWidth: 400, width: "100%" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#85787A",
              }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, matricula o grupo"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="input input--search"
              style={{ fontSize: 14, height: 40 }}
            />
          </div>
        </div>

        <button
          className="btn btn--primary btn--sm"
          onClick={() => setShowNewModal(true)}
        >
          <Plus size={16} />
          Nuevo permiso
        </button>
      </div>

      <div className="filter-tabs" style={{ padding: "12px 24px 0" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`filter-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
          >
            {tab}
            <span className="filter-tab-count">{tabCount(tab)}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: "0 24px", overflowX: "auto" }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {["#", "Alumno", "Grupo", "Fecha / Dias", "Hora Salida", "Motivo", "Solicitado por", "Estado", "Acciones"].map(
                  (col) => (
                    <th key={col}>{col}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedPermissions.map((perm, idx) => {
                const rowIdx = (currentPage - 1) * rowsPerPage + idx;
                return (
                  <tr key={perm.id}>
                    <td>{rowIdx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{perm.alumno.nombreCompleto}</td>
                    <td>{perm.alumno.grupo}</td>
                    <td>
                      {perm.esVariosDias && perm.diasSemana ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Repeat size={14} color="#EB2466" />
                          <span>{perm.diasSemana.join(', ')}</span>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={14} color="#85787A" />
                          {perm.fecha}
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: "monospace", color: "#EB2466" }}>
                      {perm.horaSalida}
                    </td>
                    <td>{perm.motivo}</td>
                    <td>{perm.solicitadoPor}</td>
                    <td>{estadoBadge(perm.estado)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="table-action"
                          onClick={() => setSelectedPermission(perm)}
                          title="Ver detalle"
                        >
                          <Eye size={18} />
                        </button>
                        {perm.estado === "Pendiente" && (
                          <button
                            className="table-action"
                            style={{ color: "#0F8122" }}
                            onClick={() => handleApprove(perm)}
                            title="Aprobar"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {perm.estado === "Pendiente" && (
                          <button
                            className="table-action"
                            style={{ color: "#AB1748" }}
                            onClick={() => handleReject(perm)}
                            title="Rechazar"
                          >
                            <XIcon size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedPermissions.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={{ padding: 40, textAlign: "center", color: "#85787A" }}
                  >
                    No se encontraron permisos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          fontSize: 14,
          color: "#5F5657",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span>
          Mostrando {paginatedPermissions.length} de {filteredPermissions.length} permisos
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              background: "none",
              border: "1px solid #CAC6C7",
              borderRadius: 6,
              padding: "6px 8px",
              cursor: currentPage === 1 ? "default" : "pointer",
              color: currentPage === 1 ? "#CAC6C7" : "#5F5657",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              if (totalPages <= 5) return true;
              if (p === 1 || p === totalPages) return true;
              if (Math.abs(p - currentPage) <= 1) return true;
              return false;
            })
            .reduce<(number | string)[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              typeof p === "string" ? (
                <span key={`ellipsis-${i}`} style={{ padding: "0 6px", color: "#85787A" }}>
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    border: p === currentPage ? "1px solid #EB2466" : "1px solid #CAC6C7",
                    borderRadius: 6,
                    padding: "6px 12px",
                    background: p === currentPage ? "#EB2466" : "#fff",
                    color: p === currentPage ? "#fff" : "#5F5657",
                    cursor: "pointer",
                    fontWeight: p === currentPage ? 600 : 400,
                  }}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            style={{
              background: "none",
              border: "1px solid #CAC6C7",
              borderRadius: 6,
              padding: "6px 8px",
              cursor:
                currentPage === totalPages || totalPages === 0 ? "default" : "pointer",
              color:
                currentPage === totalPages || totalPages === 0 ? "#CAC6C7" : "#5F5657",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Filas por pagina:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              padding: "6px 8px",
              border: "1px solid #CAC6C7",
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            {ROWS_PER_PAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Modal de detalle de permiso */}
      {selectedPermission && (
        <>
          <div
            onClick={() => setSelectedPermission(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: 480,
              height: "100vh",
              background: "#fff",
              zIndex: 1000,
              boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
              overflowY: "auto",
              padding: 32,
              animation: "slideInRight 0.3s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                Detalle del Permiso
              </h2>
              <button
                onClick={() => setSelectedPermission(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#85787A",
                  padding: 4,
                }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: "#5F5657", fontWeight: 500 }}>Estado</span>
              <div style={{ marginTop: 4 }}>
                {estadoBadge(selectedPermission.estado)}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#EB2466",
                  textTransform: "uppercase",
                  marginBottom: 12,
                  letterSpacing: 0.5,
                }}
              >
                Alumno
              </h3>
              <div style={{ fontSize: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#5F5657" }}>Nombre</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.alumno.nombreCompleto}</div>
                </div>
                <div>
                  <span style={{ color: "#5F5657" }}>No. Control</span>
                  <div style={{ fontWeight: 500, fontFamily: "monospace", color: "#EB2466" }}>
                    {selectedPermission.alumno.matricula}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#5F5657" }}>Grupo</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.alumno.grupo}</div>
                </div>
                <div>
                  <span style={{ color: "#5F5657" }}>Capacitacion</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.alumno.capacitacion}</div>
                </div>
                <div>
                  <span style={{ color: "#5F5657" }}>Turno</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.alumno.turno}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#EB2466",
                  textTransform: "uppercase",
                  marginBottom: 12,
                  letterSpacing: 0.5,
                }}
              >
                Datos del permiso
              </h3>
              <div style={{ fontSize: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                {selectedPermission.esVariosDias && selectedPermission.diasSemana ? (
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#5F5657" }}>Dias que se repite</span>
                    <div style={{ fontWeight: 500, display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {selectedPermission.diasSemana.map(dia => (
                        <span key={dia} style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          background: '#FEEBEE',
                          color: '#EB2466',
                        }}>
                          {dia}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: "#5F5657" }}>Fecha</span>
                    <div style={{ fontWeight: 500 }}>{selectedPermission.fecha}</div>
                  </div>
                )}
                <div>
                  <span style={{ color: "#5F5657" }}>Hora salida</span>
                  <div style={{ fontWeight: 500, fontFamily: "monospace", color: "#EB2466" }}>
                    {selectedPermission.horaSalida}
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#5F5657" }}>Motivo</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.motivo}</div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#5F5657" }}>Solicitado por</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.solicitadoPor}</div>
                </div>
              </div>
            </div>

            {/* Muestra del codigo de aprobacion */}
            {selectedPermission.estado === "Aprobado" && selectedPermission.codigo && (
              <div style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#EB2466",
                    textTransform: "uppercase",
                    marginBottom: 12,
                    letterSpacing: 0.5,
                  }}
                >
                  Codigo de aprobacion
                </h3>
                <div
                  style={{
                    background: "#DCF5FF",
                    border: "2px solid #1792AB",
                    borderRadius: 12,
                    padding: "20px 24px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#1792AB", marginBottom: 8, fontWeight: 600 }}>
                    Presentar este codigo en control de acceso
                  </div>
                  <div
                    style={{
                      fontFamily: "'Roboto Mono', monospace",
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#1792AB",
                      letterSpacing: 6,
                    }}
                  >
                    {selectedPermission.codigo}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Clock size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    <span style={{ fontSize: 12, color: "#5F5657" }}>
                      {selectedPermission.esVariosDias && selectedPermission.diasSemana
                        ? `Valido los dias: ${selectedPermission.diasSemana.join(', ')}`
                        : `Valido solo para la fecha ${selectedPermission.fecha}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#EB2466",
                  textTransform: "uppercase",
                  marginBottom: 12,
                  letterSpacing: 0.5,
                }}
              >
                Contacto del tutor
              </h3>
              <div style={{ fontSize: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                <div>
                  <span style={{ color: "#5F5657" }}>Tutor</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.alumno.tutorNombre}</div>
                </div>
                <div>
                  <span style={{ color: "#5F5657" }}>Telefono</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.alumno.tutorTelefono}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de nuevo permiso */}
      {showNewModal && (
        <>
          <div
            onClick={() => setShowNewModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 999,
            }}
          />
          <div className="modal-backdrop" style={{ zIndex: 1000 }}>
            <div className="modal" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                  <FileText size={20} color="#EB2466" />
                  Nuevo permiso de salida
                </h3>
                <button
                  className="modal-close"
                  onClick={() => setShowNewModal(false)}
                >
                  <XIcon size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label>Alumno</label>
                  <div className="relative">
                    <Search
                      size={18}
                      className="input-icon"
                    />
                    <input
                      type="text"
                      className="input input--search"
                      placeholder="Buscar por nombre o matricula..."
                      value={newAlumnoSearch}
                      onChange={(e) => {
                        setNewAlumnoSearch(e.target.value);
                        setNewAlumno("");
                      }}
                    />
                    {newAlumnoSearch && !newAlumno && filteredAlumnos.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          background: "#fff",
                          border: "1px solid #CAC6C7",
                          borderRadius: 8,
                          maxHeight: 200,
                          overflowY: "auto",
                          zIndex: 10,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      >
                        {filteredAlumnos.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setNewAlumno(s.nombreCompleto);
                              setNewAlumnoSearch(`${s.nombreCompleto} - ${s.matricula}`);
                            }}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid #F0EFEF",
                              fontSize: 14,
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#FEEBEE")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "#fff")
                            }
                          >
                            <div style={{ fontWeight: 500 }}>{s.nombreCompleto}</div>
                            <div style={{ fontSize: 12, color: "#5F5657", fontFamily: "monospace" }}>
                              {s.matricula} | Grupo {s.grupo}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label className="field-label">Tipo de permiso</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => { setNewEsVariosDias(false); setNewDiasSemana([]); }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: !newEsVariosDias ? '2px solid #EB2466' : '2px solid #CAC6C7',
                        background: !newEsVariosDias ? '#FEEBEE' : '#F0EFEF',
                        cursor: 'pointer',
                        fontWeight: !newEsVariosDias ? 600 : 400,
                        fontSize: 14,
                        color: '#1C1819',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 150ms',
                      }}
                    >
                      <Calendar size={16} color={!newEsVariosDias ? '#EB2466' : '#85787A'} />
                      Por dia
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewEsVariosDias(true); setNewFecha(""); }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: newEsVariosDias ? '2px solid #EB2466' : '2px solid #CAC6C7',
                        background: newEsVariosDias ? '#FEEBEE' : '#F0EFEF',
                        cursor: 'pointer',
                        fontWeight: newEsVariosDias ? 600 : 400,
                        fontSize: 14,
                        color: '#1C1819',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 150ms',
                      }}
                    >
                      <Repeat size={16} color={newEsVariosDias ? '#EB2466' : '#85787A'} />
                      Varios dias
                    </button>
                  </div>
                </div>

                {!newEsVariosDias ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div className="input-group">
                      <label>Fecha</label>
                      <input
                        type="date"
                        className="input"
                        value={newFecha}
                        onChange={(e) => setNewFecha(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>Hora de salida</label>
                      <input
                        type="time"
                        className="input"
                        value={newHora}
                        onChange={(e) => setNewHora(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <div className="input-group" style={{ marginBottom: 12 }}>
                      <label>Selecciona los dias que se repite el permiso</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                        {DIAS_SEMANA.map(dia => {
                          const selected = newDiasSemana.includes(dia);
                          return (
                            <button
                              key={dia}
                              type="button"
                              onClick={() => toggleDia(dia)}
                              style={{
                                padding: '10px 8px',
                                borderRadius: 8,
                                border: selected ? '2px solid #EB2466' : '1.5px solid #CAC6C7',
                                background: selected ? '#FEEBEE' : '#fff',
                                color: selected ? '#EB2466' : '#5F5657',
                                fontWeight: selected ? 600 : 400,
                                fontSize: 13,
                                cursor: 'pointer',
                                transition: 'all 150ms',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              {dia}
                            </button>
                          );
                        })}
                      </div>
                      {newEsVariosDias && newDiasSemana.length === 0 && (
                        <span style={{ fontSize: 12, color: '#AB1748', marginTop: 4, display: 'block' }}>
                          Selecciona al menos un dia
                        </span>
                      )}
                    </div>
                    <div className="input-group">
                      <label>Hora de salida</label>
                      <input
                        type="time"
                        className="input"
                        value={newHora}
                        onChange={(e) => setNewHora(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label>Motivo</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="Describe el motivo del permiso..."
                    value={newMotivo}
                    onChange={(e) => setNewMotivo(e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label>Solicitado por</label>
                  <input
                    type="text"
                    className="input"
                    value={solicitadoPor}
                    readOnly
                    style={{ background: '#F0EFEF', color: '#5F5657', cursor: 'not-allowed' }}
                  />
                </div>

                <label className="checkbox-group" style={{ marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={newNotificar}
                    onChange={(e) => setNewNotificar(e.target.checked)}
                  />
                  <span style={{ fontSize: 14, color: "#5F5657" }}>Notificar a tutor</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={handleSaveNew}
                  disabled={!newAlumno || !newHora || !newMotivo || (!newEsVariosDias && !newFecha) || (newEsVariosDias && newDiasSemana.length === 0)}
                >
                  <Check size={16} />
                  Guardar permiso
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
