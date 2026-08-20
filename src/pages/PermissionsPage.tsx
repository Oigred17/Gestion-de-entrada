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
  Copy,
  Loader2,
} from "lucide-react";
import { alumnosApi, permisosApi, usuariosApi } from "../api";
import type { UserRole } from "../App";
import Loader from "../components/Loader";
import type { Permiso, Alumno } from "../types";
import { useAuth } from "../context/AuthContext";
import { toastSuccess, toastError } from "@/lib/toast";
import { normalizeText } from "@/lib/normalizeText";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const TABS = ["Todos", "Pendientes", "Aprobados", "Rechazados", "Vencidos", "Utilizados"] as const;
type TabType = (typeof TABS)[number];

function displayEstado(permiso: Permiso): Permiso["estado"] {
  if (permiso.estado === "Pendiente" && permiso.fecha_salida) {
    const fechaSalida = new Date(permiso.fecha_salida);
    if (fechaSalida.getTime() < Date.now()) return "Vencido";
  }
  return permiso.estado;
}

interface PermissionsPageProps {
  role: UserRole;
}

export default function PermissionsPage({ role }: PermissionsPageProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPermission, setSelectedPermission] = useState<Permiso | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usuariosMap, setUsuariosMap] = useState<Record<number, string>>({});

  const [newAlumnoSearch, setNewAlumnoSearch] = useState("");
  const [newAlumno, setNewAlumno] = useState<Alumno | null>(null);
  const [newFechaSalida, setNewFechaSalida] = useState("");
  const [newMotivo, setNewMotivo] = useState("");
  const [newNotificar, setNewNotificar] = useState(false);
  const [saving, setSaving] = useState(false);

  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [permissions, setPermissions] = useState<Permiso[]>([]);
  const [confirm, setConfirm] = useState<{ title: string; message: string; confirmLabel: string; run: () => Promise<void> } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([permisosApi.getAll(), alumnosApi.getAll()])
      .then(([p, a]) => {
        setPermissions(p);
        setAlumnos(a);
      })
      .then(() => usuariosApi.getAll().then(u => {
        const map: Record<number, string> = {};
        for (const usr of u) {
          if (usr.id) map[usr.id] = `${usr.nombre} ${usr.apellido_paterno} ${usr.apellido_materno}`;
        }
        setUsuariosMap(map);
      }).catch(() => {}))
      .catch(() => toastError("Error", "No se pudieron cargar los permisos"))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const nombreCompleto = (permiso: Permiso) =>
    permiso.alumno
      ? `${permiso.alumno.nombre} ${permiso.alumno.apellido_paterno} ${permiso.alumno.apellido_materno}`
      : `Alumno #${permiso.id_alumno}`;

  const getUsuarioNombre = (id: number) => usuariosMap[id] || '---';

  const filteredPermissions = permissions.filter((p) => {
    const estado = displayEstado(p);
    const q = normalizeText(search);
    const matchesSearch =
      !search ||
      normalizeText(nombreCompleto(p)).includes(q) ||
      normalizeText(p.alumno?.matricula ?? "").includes(q) ||
      normalizeText(p.alumno?.grupo ?? "").includes(q) ||
      normalizeText(p.motivo).includes(q);

    const matchesTab =
      activeTab === "Todos" ||
      (activeTab === "Pendientes" && estado === "Pendiente") ||
      (activeTab === "Aprobados" && estado === "Aprobado") ||
      (activeTab === "Rechazados" && estado === "Rechazado") ||
      (activeTab === "Vencidos" && estado === "Vencido") ||
      (activeTab === "Utilizados" && estado === "Utilizado");

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
      Utilizados: "Utilizado",
    };
    return permissions.filter((p) => displayEstado(p) === map[tab]).length;
  };

  const filteredAlumnos = alumnos.filter(
    (s) =>
      (s.estatus ?? "Activo").toLowerCase() === "activo" &&
      (normalizeText(`${s.nombre} ${s.apellido_paterno} ${s.apellido_materno}`).includes(normalizeText(newAlumnoSearch)) ||
        normalizeText(s.matricula).includes(normalizeText(newAlumnoSearch)))
  );

  const estadoBadge = (estado: Permiso["estado"]) => {
    const styles: Record<string, { bg: string; color: string }> = {
      Pendiente: { bg: "#FEEBEE", color: "#1792AB" },
      Aprobado: { bg: "#E8F5E9", color: "#0F8122" },
      Rechazado: { bg: "#FEEBEE", color: "#AB1748" },
      Vencido: { bg: "#F5F5F5", color: "#5F5657" },
      Utilizado: { bg: "#E8F5E9", color: "#0F8122" },
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

  const performSetEstado = async (permiso: Permiso, estado: string) => {
    try {
      const updated = await permisosApi.update(permiso.id, { estado });
      setPermissions((prev) => prev.map((p) => (p.id === permiso.id ? updated : p)));
      if (selectedPermission?.id === permiso.id) setSelectedPermission(updated);
      toastSuccess(
        estado === "Aprobado" ? "Permiso aprobado" : "Permiso rechazado",
        estado === "Aprobado"
          ? `Código generado: ${updated.codigo_autorizacion ?? ""}`
          : undefined
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toastError("No se pudo actualizar", err.response?.data?.detail || "Ocurrió un error");
    }
  };

  const setEstado = (permiso: Permiso, estado: string) => {
    const esAprobado = estado === "Aprobado";
    setConfirm({
      title: esAprobado ? "Aprobar permiso" : "Rechazar permiso",
      message: `¿Seguro que deseas ${esAprobado ? "aprobar" : "rechazar"} el permiso de ${nombreCompleto(permiso)}? Ingrese su contraseña para confirmar.`,
      confirmLabel: esAprobado ? "Aprobar" : "Rechazar",
      run: () => performSetEstado(permiso, estado),
    });
  };

  const copyCode = (codigo: string) => {
    navigator.clipboard?.writeText(codigo).then(
      () => toastSuccess("Código copiado"),
      () => toastError("No se pudo copiar el código")
    );
  };

  const handleSaveNew = async () => {
    if (!newAlumno || !newMotivo) {
      toastError("Faltan datos", "Selecciona un alumno y escribe el motivo");
      return;
    }
    if (!user?.id) {
      toastError("Sesion invalida", "Vuelve a iniciar sesion");
      return;
    }
    setSaving(true);
    try {
      const nuevo = await permisosApi.create({
        id_alumno: newAlumno.id,
        motivo: newMotivo,
        fecha_salida: newFechaSalida ? new Date(newFechaSalida).toISOString() : undefined,
        notificar_tutor: newNotificar,
        id_usuario_registro: user.id,
      });
      setPermissions((prev) => [nuevo, ...prev]);
      setShowNewModal(false);
      setNewAlumnoSearch("");
      setNewAlumno(null);
      setNewFechaSalida("");
      setNewMotivo("");
      setNewNotificar(false);
      toastSuccess("Permiso creado", `Permiso solicitado para ${nombreCompleto(nuevo)}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toastError("No se pudo crear", err.response?.data?.detail || "Ocurrió un error");
    } finally {
      setSaving(false);
    }
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
              placeholder="Buscar por nombre, matrícula o grupo"
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
        {loading ? (
          <Loader message="Cargando permisos..." height={220} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {["#", "Alumno", "Grupo", "Fecha de salida", "Motivo", "Solicitado por", "Estado", "Acciones"].map(
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
                      <td style={{ fontWeight: 500 }}>{nombreCompleto(perm)}</td>
                      <td>{perm.alumno?.grupo ?? "---"}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={14} color="#85787A" />
                          {perm.fecha_salida ? new Date(perm.fecha_salida).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "No definida"}
                        </span>
                      </td>
                      <td>{perm.motivo}</td>
                      <td style={{ fontSize: 13, color: '#5F5657' }}>{getUsuarioNombre(perm.id_usuario_registro)}</td>
                      <td>{estadoBadge(displayEstado(perm))}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="table-action"
                            onClick={() => setSelectedPermission(perm)}
                            title="Ver detalle"
                          >
                            <Eye size={18} />
                          </button>
                          {displayEstado(perm) === "Pendiente" && (
                            <button
                              className="table-action"
                              style={{ color: "#0F8122" }}
                              onClick={() => setEstado(perm, "Aprobado")}
                              title="Aprobar"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          {displayEstado(perm) === "Pendiente" && (
                            <button
                              className="table-action"
                              style={{ color: "#AB1748" }}
                              onClick={() => setEstado(perm, "Rechazado")}
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
                      colSpan={8}
                      style={{ padding: 40, textAlign: "center", color: "#85787A" }}
                    >
                      No se encontraron permisos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Panel de detalle de permiso */}
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
                {estadoBadge(displayEstado(selectedPermission))}
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
                  <div style={{ fontWeight: 500 }}>{nombreCompleto(selectedPermission)}</div>
                </div>
                <div>
                  <span style={{ color: "#5F5657" }}>No. Control</span>
                  <div style={{ fontWeight: 500, fontFamily: "monospace", color: "#EB2466" }}>
                    {selectedPermission.alumno?.matricula ?? "---"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#5F5657" }}>Grupo</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.alumno?.grupo ?? "---"}</div>
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
                <div>
                  <span style={{ color: "#5F5657" }}>Fecha de salida</span>
                  <div style={{ fontWeight: 500 }}>
                    {selectedPermission.fecha_salida
                      ? new Date(selectedPermission.fecha_salida).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })
                      : "No definida"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#5F5657" }}>Fecha de solicitud</span>
                  <div style={{ fontWeight: 500 }}>
                    {selectedPermission.fecha_solicitud
                      ? new Date(selectedPermission.fecha_solicitud).toLocaleDateString("es-MX")
                      : "---"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#5F5657" }}>Motivo</span>
                  <div style={{ fontWeight: 500 }}>{selectedPermission.motivo}</div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#5F5657" }}>Solicitado por</span>
                  <div style={{ fontWeight: 500 }}>{getUsuarioNombre(selectedPermission.id_usuario_registro)}</div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#5F5657" }}>Notificar a tutor</span>
                  <div style={{ fontWeight: 500 }}>
                    {selectedPermission.notificar_tutor ? "Si" : "No"}
                  </div>
                </div>
              </div>
            </div>

            {/* Muestra del codigo de aprobacion */}
            {selectedPermission.codigo_autorizacion && (
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
                  Código de autorización
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
                        Presentar este código en control de acceso
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
                    {selectedPermission.codigo_autorizacion}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8 }}>
                    <button className="btn btn--secondary btn--sm" onClick={() => copyCode(selectedPermission.codigo_autorizacion!)}>
                      <Copy size={14} /> Copiar
                    </button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Clock size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    <span style={{ fontSize: 12, color: "#5F5657" }}>
                      {selectedPermission.fecha_salida
                        ? `Valido solo para ${new Date(selectedPermission.fecha_salida).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}`
                        : "Sin fecha de salida definida"}
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
                  <div style={{ fontWeight: 500 }}>
                    {selectedPermission.alumno?.tutor_nombre ?? "No registrado"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#5F5657" }}>Teléfono</span>
                  <div style={{ fontWeight: 500 }}>
                    {selectedPermission.alumno?.tutor_telefono ?? "No registrado"}
                  </div>
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
                      placeholder="Buscar por nombre o matrícula..."
                      value={newAlumno ? `${newAlumno.nombre} ${newAlumno.apellido_paterno} - ${newAlumno.matricula}` : newAlumnoSearch}
                      onChange={(e) => {
                        setNewAlumnoSearch(e.target.value);
                        setNewAlumno(null);
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
                              setNewAlumno(s);
                              setNewAlumnoSearch(`${s.nombre} ${s.apellido_paterno} - ${s.matricula}`);
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
                            <div style={{ fontWeight: 500 }}>
                              {s.nombre} {s.apellido_paterno} {s.apellido_materno}
                            </div>
                            <div style={{ fontSize: 12, color: "#5F5657", fontFamily: "monospace" }}>
                              {s.matricula} | {s.id_grupo ? `Grupo ${s.id_grupo}` : "Sin grupo"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 16 }}>
                  <div className="input-group">
                    <label>Fecha y hora de salida</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={newFechaSalida}
                      onChange={(e) => setNewFechaSalida(e.target.value)}
                    />
                  </div>
                </div>

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
                    value={user ? `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}` : (role === 'Directivo' ? 'Directivo' : 'Prefectura')}
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
                  disabled={saving || !newAlumno || !newMotivo}
                >
                  {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  {saving ? "Guardando..." : "Guardar permiso"}
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
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <ConfirmPasswordModal
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.run ?? (() => {})}
      />
    </div>
  );
}
