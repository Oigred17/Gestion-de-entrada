import { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Lock,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Check,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { alumnosApi, gruposApi, ciclosApi } from "../api";
import type { Alumno, Grupo } from "../types";
import { generateStudentListPDF } from "../utils/generateStudentListPDF";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function StudentsPage() {
  const [alumnosData, setAlumnosData] = useState<Alumno[]>([]);
  const [gruposMap, setGruposMap] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedStudent, setSelectedStudent] = useState<Alumno | null>(
    null
  );
  const [panelMode, setPanelMode] = useState<"view" | "edit">("view");
  const [editName, setEditName] = useState("");
  const [editControl, setEditControl] = useState("");
  const [editGrupo, setEditGrupo] = useState("");
  const [editCapacitacion, setEditCapacitacion] = useState("");
  const [editTurno, setEditTurno] = useState("");
  const [editCurp, setEditCurp] = useState("");
  const [editFechaNacimiento, setEditFechaNacimiento] = useState("");
  const [editTipoSangre, setEditTipoSangre] = useState("");
  const [editDomicilio, setEditDomicilio] = useState("");
  const [editTutorNombre, setEditTutorNombre] = useState("");
  const [editTelefonoTutor, setEditTelefonoTutor] = useState("");
  const [editCorreoTutor, setEditCorreoTutor] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportGroupId, setExportGroupId] = useState<string>("all");
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [newStudentMode, setNewStudentMode] = useState<"upload" | "manual">("manual");
  const [newName, setNewName] = useState("");
  const [newControl, setNewControl] = useState("");
  const [newGrupo, setNewGrupo] = useState("");
  const [newCapacitacion, setNewCapacitacion] = useState("");
  const [newTurno, setNewTurno] = useState<"Matutino" | "Vespertino">("Matutino");
  const [newCurp, setNewCurp] = useState("");
  const [newFechaNacimiento, setNewFechaNacimiento] = useState("");
  const [newTipoSangre, setNewTipoSangre] = useState("");
  const [newDomicilio, setNewDomicilio] = useState("");
  const [newTelefonoTutor, setNewTelefonoTutor] = useState("");
  const [newTutor, setNewTutor] = useState("");
  const [newNumAfiliacion, setNewNumAfiliacion] = useState("");
  const [newCohorte, setNewCohorte] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<{ sheet: string; headers: string[]; rows: string[][] }[] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; success: number; failed: number; done: boolean; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAlumnos();
  }, []);

  const fetchAlumnos = async () => {
    try {
      const [data, grupos] = await Promise.all([alumnosApi.getAll(), gruposApi.getAll()]);
      setAlumnosData(data);
      const map: Record<number, string> = {};
      for (const g of grupos) {
        if (g.id) map[g.id] = g.nombre;
      }
      setGruposMap(map);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast("Error al cargar los alumnos", "error");
    }
  };

  useEffect(() => {
    if (!showFilterDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterDropdown]);

  const getGrupoName = (id_grupo?: number | null): string => {
    return id_grupo ? (gruposMap[id_grupo] || String(id_grupo)) : 'Sin grupo';
  };

  const uniqueGroups = Array.from(new Set(alumnosData.map((s) => getGrupoName(s.id_grupo)))).sort();

  const gruposList = Object.entries(gruposMap)
    .map(([id, nombre]) => ({ id: Number(id), nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const filteredStudents = alumnosData.filter((s) => {
    const nombreCompleto = `${s.nombre} ${s.apellido_paterno} ${s.apellido_materno}`.trim();
    if (search) {
      const q = search.toLowerCase();
      const matchSearch =
        nombreCompleto.toLowerCase().includes(q) ||
        s.matricula.toLowerCase().includes(q) ||
        getGrupoName(s.id_grupo).toLowerCase().includes(q);
      if (!matchSearch) return false;
    }
    if (activeFilters.length > 0) {
      const matchFilters = activeFilters.every((f) => {
        if (uniqueGroups.includes(f)) return getGrupoName(s.id_grupo) === f;
        if (f === "Activo") return s.estatus === "Activo";
        if (f === "Inactivo") return s.estatus !== "Activo";
        if (f === "Matutino" || f === "Vespertino") return s.turno === f;
        return true;
      });
      if (!matchFilters) return false;
    }
    return true;
  });

  const handleExportPDF = () => {
    const toExport =
      exportGroupId === "all"
        ? filteredStudents
        : alumnosData.filter((s) => getGrupoName(s.id_grupo) === exportGroupId);
    const label = exportGroupId === "all" ? "general" : `grupo_${exportGroupId}`;
    generateStudentListPDF({
      students: toExport,
      groupName: label,
    });
    setShowExportModal(false);
  };

  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const removeFilter = (filter: string) => {
    setActiveFilters((prev) => prev.filter((f) => f !== filter));
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]);
    setCurrentPage(1);
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (student: Alumno) => {
    const nombreCompleto = `${student.nombre} ${student.apellido_paterno} ${student.apellido_materno}`.trim();
    setEditName(nombreCompleto);
    setEditControl(student.matricula);
    setEditGrupo(student.id_grupo?.toString() || '');
    setEditCapacitacion(student.capacitacion || '');
    setEditTurno(student.turno || '');
    setEditCurp(student.curp || '');
    setEditFechaNacimiento(student.fecha_nacimiento || '');
    setEditTipoSangre(student.tipo_sangre || '');
    setEditDomicilio(student.direccion || '');
    setEditTutorNombre(student.tutor_nombre || '');
    setEditTelefonoTutor(student.tutor_telefono || '');
    setEditCorreoTutor('');
    setSelectedStudent(student);
    setShowConfirmEdit(true);
  };

  const confirmEdit = () => {
    setShowConfirmEdit(false);
    setPanelMode("edit");
  };

  const handleSaveEdit = async () => {
    if (!selectedStudent) return;
    try {
      const nameParts = editName.split(' ');
      await alumnosApi.update(selectedStudent.id, {
        matricula: editControl,
        nombre: nameParts[0] || '',
        apellido_paterno: nameParts[1] || '',
        apellido_materno: nameParts.slice(2).join(' ') || '',
        telefono: editTelefonoTutor,
        direccion: editDomicilio,
        curp: editCurp,
        tipo_sangre: editTipoSangre,
        capacitacion: editCapacitacion,
        turno: editTurno,
        fecha_nacimiento: editFechaNacimiento,
        tutor_nombre: editTutorNombre,
        id_grupo: editGrupo ? Number(editGrupo) : undefined,
      });
      setPanelMode("view");
      showToast("Datos del alumno actualizados correctamente");
      fetchAlumnos();
    } catch (error) {
      showToast("Error al actualizar el alumno", "error");
    }
  };

  const handleClosePanel = () => {
    if (panelMode === "edit") {
      setShowConfirmClose(true);
    } else {
      setSelectedStudent(null);
      setPanelMode("view");
    }
  };

  const handleDiscardEdit = () => {
    setShowConfirmClose(false);
    setPanelMode("view");
    setSelectedStudent(null);
  };

  const handleConfirmSaveAndClose = async () => {
    if (!selectedStudent) return;
    try {
      const nameParts = editName.split(' ');
      await alumnosApi.update(selectedStudent.id, {
        matricula: editControl,
        nombre: nameParts[0] || '',
        apellido_paterno: nameParts[1] || '',
        apellido_materno: nameParts.slice(2).join(' ') || '',
        telefono: editTelefonoTutor,
        direccion: editDomicilio,
        curp: editCurp,
        tipo_sangre: editTipoSangre,
        capacitacion: editCapacitacion,
        turno: editTurno,
        fecha_nacimiento: editFechaNacimiento,
        tutor_nombre: editTutorNombre,
        id_grupo: editGrupo ? Number(editGrupo) : undefined,
      });
      setShowConfirmClose(false);
      setPanelMode("view");
      setSelectedStudent(null);
      showToast("Datos del alumno actualizados correctamente");
      fetchAlumnos();
    } catch (error) {
      setShowConfirmClose(false);
      showToast("Error al actualizar el alumno", "error");
    }
  };

  const resetNewStudentForm = () => {
    setNewName("");
    setNewControl("");
    setNewGrupo("");
    setNewCapacitacion("");
    setNewTurno("Matutino");
    setNewCurp("");
    setNewFechaNacimiento("");
    setNewTipoSangre("");
    setNewDomicilio("");
    setNewTelefonoTutor("");
    setNewTutor("");
    setNewNumAfiliacion("");
    setNewCohorte("");
    setUploadFile(null);
    setUploadPreview(null);
    setUploadError(null);
  };

  const handleOpenNewStudent = () => {
    resetNewStudentForm();
    setNewStudentMode("manual");
    setShowNewStudentModal(true);
  };

  const handleSaveNewStudent = async () => {
    if (!newName.trim() || !newControl.trim() || !newGrupo.trim()) {
      showToast("Nombre, numero de control y grupo son obligatorios", "error");
      return;
    }
    try {
      const nameParts = newName.trim().split(' ');
      await alumnosApi.create({
        matricula: newControl.trim(),
        nombre: nameParts[0] || '',
        apellido_paterno: nameParts[1] || '',
        apellido_materno: nameParts.slice(2).join(' ') || '',
        telefono: newTelefonoTutor.trim(),
        direccion: newDomicilio.trim(),
        curp: newCurp.trim(),
        tipo_sangre: newTipoSangre.trim(),
        capacitacion: newCapacitacion.trim(),
        turno: newTurno,
        cohorte: newCohorte.trim(),
        fecha_nacimiento: newFechaNacimiento.trim(),
        tutor_nombre: newTutor.trim(),
        nss: newNumAfiliacion.trim(),
        id_grupo: newGrupo.trim() ? Number(newGrupo.trim()) : undefined,
      });
      setShowNewStudentModal(false);
      showToast(`Alumno "${newName.trim()}" agregado correctamente`);
      resetNewStudentForm();
      fetchAlumnos();
    } catch (error) {
      showToast("Error al crear el alumno", "error");
    }
  };

  const handleToggleEstatus = async (student: Alumno) => {
    const nuevoEstatus = student.estatus === "Activo" ? "Inactivo" : "Activo";
    try {
      await alumnosApi.update(student.id, { estatus: nuevoEstatus });
      showToast(nuevoEstatus === "Activo" ? "Alumno reactivado" : "Alumno dado de baja");
      fetchAlumnos();
    } catch (error) {
      showToast("Error al cambiar el estado del alumno", "error");
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "NOMBRE DEL ESTUDIANTE", "MATRICULA", "GRUPO",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alumnos");
    XLSX.writeFile(wb, "plantilla_alumnos.xlsx");
  };

  const findHeaderRow = (data: (string | undefined)[][]): { headerRowIdx: number; colMap: Record<string, number> } | null => {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const colMap: Record<string, number> = {};
      for (let j = 0; j < row.length; j++) {
        const val = String(row[j] || "").toLowerCase().trim();
        if (val.includes("nombre")) colMap.nombre = j;
        if (val.includes("matricula") || val.includes("matr")) colMap.matricula = j;
        if (val === "grupo" || val === "grupo " || val.match(/^grupo/i)) colMap.grupo = j;
      }
      if (colMap.nombre !== undefined && colMap.matricula !== undefined && colMap.grupo !== undefined) {
        return { headerRowIdx: i, colMap };
      }
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadPreview(null);
    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xls") && !file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
      setUploadError("Formato no valido. Use archivos .xls, .xlsx o .csv");
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetsData: { sheet: string; headers: string[]; rows: string[][] }[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as (string | undefined)[][];
          if (jsonData.length < 2) continue;
          const found = findHeaderRow(jsonData);
          if (!found) continue;
          const rawHeaders = jsonData[found.headerRowIdx];
          const headers = [
            String(rawHeaders[found.colMap.nombre] || "NOMBRE DEL ESTUDIANTE"),
            String(rawHeaders[found.colMap.matricula] || "MATRICULA"),
            String(rawHeaders[found.colMap.grupo] || "GRUPO"),
          ];
          const rows: string[][] = [];
          for (let r = found.headerRowIdx + 1; r < jsonData.length; r++) {
            const row = jsonData[r];
            if (!row) continue;
            const name = String(row[found.colMap.nombre] || "").trim();
            const matricula = String(row[found.colMap.matricula] || "").trim();
            const grupo = String(row[found.colMap.grupo] || "").trim();
            if (!name || !matricula || matricula === "nan" || matricula === "NaN" || /^\d+\.\d+$/.test(matricula)) continue;
            rows.push([name, matricula, grupo]);
          }
          if (rows.length > 0) {
            sheetsData.push({ sheet: sheetName, headers, rows });
          }
        }
        if (sheetsData.length === 0) {
          setUploadError("No se encontraron datos validos en ninguna hoja. Busque columnas: NOMBRE, MATRICULA, GRUPO.");
          setUploadFile(null);
          return;
        }
        setUploadPreview(sheetsData);
      } catch {
        setUploadError("Error al leer el archivo. Verifique el formato.");
        setUploadFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const resolveGroupId = async (claveGrupo: number, groups: Grupo[]): Promise<number | null> => {
    const existing = groups.find((g) => g.clave_grupo === claveGrupo);
    if (existing) return existing.id;
    try {
      const ciclos = await ciclosApi.getAll();
      const cicloActivo = ciclos.find((c) => c.estatus === "Activo") || ciclos[0];
      const newGroup = await gruposApi.create({
        nombre: String(claveGrupo),
        clave_grupo: claveGrupo,
        ciclo_escolar_id: cicloActivo?.id,
      });
      groups.push(newGroup);
      return newGroup.id;
    } catch {
      return null;
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadPreview) return;
    let allRows: { name: string; matricula: string; grupo: string }[] = [];
    for (const sheet of uploadPreview) {
      for (const row of sheet.rows) {
        allRows.push({ name: row[0], matricula: row[1], grupo: row[2] });
      }
    }
    const total = allRows.length;
    if (total === 0) {
      showToast("No hay registros para importar", "error");
      return;
    }
    let groups: Grupo[] = [];
    try {
      groups = await gruposApi.getAll();
    } catch {
      showToast("Error al cargar grupos", "error");
      return;
    }
    let added = 0;
    let failed = 0;
    const errors: string[] = [];
    setUploadProgress({ current: 0, total, success: 0, failed: 0, done: false, errors: [] });
    for (let i = 0; i < allRows.length; i++) {
      const { name: nombreCompleto, matricula, grupo: grupoStr } = allRows[i];
      const nameParts = nombreCompleto.replace(/\\n/g, " ").replace(/\s+/g, " ").trim().split(' ');
      let id_grupo: number | undefined;
      const claveGrupo = Number(grupoStr);
      if (!isNaN(claveGrupo) && grupoStr.trim()) {
        const resolved = await resolveGroupId(claveGrupo, groups);
        if (resolved !== null) id_grupo = resolved;
      }
      try {
        await alumnosApi.create({
          matricula: matricula.trim(),
          nombre: nameParts[0] || '',
          apellido_paterno: nameParts[1] || '',
          apellido_materno: nameParts.slice(2).join(' ') || '',
          id_grupo,
        });
        added++;
      } catch (err: unknown) {
        failed++;
        let msg = "Error desconocido";
        if (err && typeof err === "object" && "response" in err) {
          const axErr = err as { response?: { status?: number; data?: { detail?: unknown } } };
          const detail = axErr.response?.data?.detail;
          if (typeof detail === "string") msg = detail;
          else if (Array.isArray(detail) && detail.length > 0) {
            msg = detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join("; ");
          } else if (detail) msg = JSON.stringify(detail);
          else msg = `Error HTTP ${axErr.response?.status || "desconocido"}`;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        errors.push(`Fila ${i + 1} (${matricula || "?"}): ${msg}`);
      }
      setUploadProgress({ current: i + 1, total, success: added, failed, done: false, errors: [...errors] });
    }
    setUploadProgress((prev) => prev ? { ...prev, done: true, errors: [...errors] } : null);
    showToast(`${added} alumno(s) importado(s)${failed > 0 ? ` (${failed} fallidos)` : ""}`);
    fetchAlumnos();
  };

  return (
    <div className="students-page">

      <div
        style={{
          background: "#fff",
          height: 72,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 16,
          borderBottom: "1px solid #CAC6C7",
        }}
      >
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              maxWidth: 400,
              width: "100%",
            }}
          >
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
              style={{
                width: "100%",
                padding: "10px 12px 10px 40px",
                border: "1px solid #CAC6C7",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div ref={filterRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              border: activeFilters.length > 0 ? "1px solid #EB2466" : "1px solid #CAC6C7",
              borderRadius: 8,
              background: activeFilters.length > 0 ? "#FEEBEE" : "#fff",
              fontSize: 14,
              cursor: "pointer",
              color: activeFilters.length > 0 ? "#EB2466" : "#1C1819",
              fontWeight: activeFilters.length > 0 ? 600 : 400,
              transition: "all 150ms",
            }}
          >
            <Filter size={16} />
            Filtrar
            {activeFilters.length > 0 && (
              <span style={{ background: "#EB2466", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 12, fontWeight: 600 }}>
                {activeFilters.length}
              </span>
            )}
          </button>
          {showFilterDropdown && (
            <div style={{
              position: "absolute", top: "100%", right: 0, marginTop: 6,
              background: "#fff", border: "none", borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)", zIndex: 50, width: 260, overflow: "hidden",
            }}>
              <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #F0EFEF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1C1819" }}>Filtros</span>
                {activeFilters.length > 0 && (
                  <button onClick={() => { setActiveFilters([]); }} style={{
                    border: "none", background: "none", color: "#AB1748", fontSize: 12, cursor: "pointer", fontWeight: 600, padding: 0,
                  }}>
                    Limpiar todo
                  </button>
                )}
              </div>

              <div style={{ padding: "12px 16px 8px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#85787A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Grupo</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {uniqueGroups.map((g) => {
                    const active = activeFilters.includes(g);
                    return (
                      <button key={g} onClick={() => {
                        toggleFilter(g);
                      }} style={{
                        padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: "pointer",
                        border: active ? "1px solid #EB2466" : "1px solid #E5E3E4",
                        background: active ? "#EB2466" : "#fff",
                        color: active ? "#fff" : "#5F5657",
                        transition: "all 120ms",
                      }}>
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: "8px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#85787A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Estado</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Activo", "Inactivo"].map((e) => {
                    const active = activeFilters.includes(e);
                    return (
                      <button key={e} onClick={() => {
                        toggleFilter(e);
                      }} style={{
                        padding: "5px 14px", borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: "pointer",
                        border: active ? "1px solid #EB2466" : "1px solid #E5E3E4",
                        background: active ? "#EB2466" : "#fff",
                        color: active ? "#fff" : "#5F5657",
                        transition: "all 120ms",
                      }}>
                        {e}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: "8px 16px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#85787A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Turno</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Matutino", "Vespertino"].map((t) => {
                    const active = activeFilters.includes(t);
                    return (
                      <button key={t} onClick={() => {
                        toggleFilter(t);
                      }} style={{
                        padding: "5px 14px", borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: "pointer",
                        border: active ? "1px solid #EB2466" : "1px solid #E5E3E4",
                        background: active ? "#EB2466" : "#fff",
                        color: active ? "#fff" : "#5F5657",
                        transition: "all 120ms",
                      }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              border: "1px solid #CAC6C7",
              borderRadius: 8,
              background: "#fff",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            <Download size={16} />
            Exportar PDF
          </button>
          <button
            onClick={handleOpenNewStudent}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              border: "none",
              borderRadius: 8,
              background: "#EB2466",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Nuevo alumno
          </button>
        </div>
      </div>


      {activeFilters.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 24px",
            flexWrap: "wrap",
          }}
        >
          {activeFilters.map((filter) => (
            <span
              key={filter}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 16,
                background: "#FEEBEE",
                color: "#EB2466",
                fontSize: 13,
                fontWeight: 500,
                cursor: "default",
              }}
            >
              {filter}
              <X
                size={14}
                style={{ cursor: "pointer" }}
                onClick={() => removeFilter(filter)}
              />
            </span>
          ))}
        </div>
      )}


      <div style={{ padding: "0 24px", overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#EB2466", color: "#fff" }}>
              {[
                "#",
                "Nombre",
                "No. Control",
                "Grupo",
                "Capacitacion",
                "Tutor",
                "Telefono",
                "Estado",
                "Acciones",
              ].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "14px 12px",
                    textAlign: "left",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.map((student, idx) => {
              const rowIdx = (currentPage - 1) * rowsPerPage + idx;
              const nombreCompleto = `${student.nombre} ${student.apellido_paterno} ${student.apellido_materno}`.trim();
              return (
                <tr
                  key={student.id}
                  style={{
                    background: rowIdx % 2 === 0 ? "#fff" : "#F0EFEF",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#CAC6C7")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      rowIdx % 2 === 0 ? "#fff" : "#F0EFEF")
                  }
                >
                  <td style={{ padding: "12px" }}>{rowIdx + 1}</td>
                  <td style={{ padding: "12px", fontWeight: 500 }}>
                    {nombreCompleto}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      fontFamily: "monospace",
                      color: "#EB2466",
                    }}
                  >
                    {student.matricula}
                  </td>
                  <td style={{ padding: "12px" }}>{getGrupoName(student.id_grupo)}</td>
                  <td style={{ padding: "12px" }}>{student.capacitacion || '---'}</td>
                  <td style={{ padding: "12px" }}>{student.tutor_nombre || '---'}</td>
                  <td style={{ padding: "12px" }}>{student.tutor_telefono || '---'}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          student.estatus === "Activo" ? "#FEEBEE" : "#F0EFEF",
                        color:
                          student.estatus === "Activo" ? "#0F8122" : "#5F5657",
                      }}
                    >
                      {student.estatus === "Activo" ? 'Activo' : 'De baja'}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setSelectedStudent(student)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          color: "#85787A",
                        }}
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          color: "#85787A",
                        }}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleToggleEstatus(student)}
                        title={student.estatus === "Activo" ? "Dar de baja" : "Reactivar"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          color: student.estatus === "Activo" ? "#85787A" : "#0F8122",
                        }}
                      >
                        <Lock size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedStudents.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#85787A",
                  }}
                >
                  No se encontraron alumnos
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
          Mostrando {paginatedStudents.length} de {filteredStudents.length}{" "}
          alumnos
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
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              if (totalPages <= 5) return true;
              if (p === 1 || p === totalPages) return true;
              if (Math.abs(p - currentPage) <= 1) return true;
              return false;
            })
            .reduce<(number | string)[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) {
                acc.push("...");
              }
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              typeof p === "string" ? (
                <span
                  key={`ellipsis-${i}`}
                  style={{ padding: "0 6px", color: "#85787A" }}
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    border:
                      p === currentPage ? "1px solid #EB2466" : "1px solid #CAC6C7",
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
                currentPage === totalPages || totalPages === 0
                  ? "default"
                  : "pointer",
              color:
                currentPage === totalPages || totalPages === 0 ? "#CAC6C7" : "#5F5657",
            }}
          >
            <ChevronRight size={16} />
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


      {selectedStudent && !showConfirmEdit && (
        <>
          <div
            onClick={handleClosePanel}
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
              animation: "slideInRight 0.3s ease",
            }}
          >

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px 0", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {panelMode === "view" ? "Detalle del Alumno" : "Editar Alumno"}
              </h2>
              <button
                onClick={handleClosePanel}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#85787A", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Foto y nombre */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 32px 24px", borderBottom: "1px solid #F0EFEF", marginBottom: 24 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F0EFEF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <User size={36} color="#85787A" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1C1819" }}>{`${selectedStudent.nombre} ${selectedStudent.apellido_paterno} ${selectedStudent.apellido_materno}`}</div>
                <div style={{ fontSize: 16, fontFamily: "monospace", color: "#EB2466", marginTop: 2 }}>{selectedStudent.matricula}</div>
                <div style={{ fontSize: 13, color: "#5F5657", marginTop: 2 }}>Grupo: {getGrupoName(selectedStudent.id_grupo)}</div>
              </div>
              {panelMode === "view" && (
                <button onClick={() => {
                  setEditName(`${selectedStudent.nombre} ${selectedStudent.apellido_paterno} ${selectedStudent.apellido_materno}`.trim());
                  setEditControl(selectedStudent.matricula);
                  setEditGrupo(selectedStudent.id_grupo?.toString() || '');
                  setEditCapacitacion(selectedStudent.capacitacion || '');
                  setEditTurno(selectedStudent.turno || '');
                  setEditCurp(selectedStudent.curp || '');
                  setEditFechaNacimiento(selectedStudent.fecha_nacimiento || '');
                  setEditTipoSangre(selectedStudent.tipo_sangre || '');
                  setEditDomicilio(selectedStudent.direccion || '');
                  setEditTutorNombre(selectedStudent.tutor_nombre || '');
                  setEditTelefonoTutor(selectedStudent.tutor_telefono || '');
                  setPanelMode("edit");
                }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", borderRadius: 8, background: "#AB1748", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  <Edit size={14} /> Editar
                </button>
              )}
              {panelMode === "edit" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={handleSaveEdit} style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", border: "none", borderRadius: 8, background: "#0F8122", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    <Check size={14} /> Guardar
                  </button>
                  <button onClick={() => setPanelMode("view")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", border: "1px solid #CAC6C7", borderRadius: 8, background: "#fff", color: "#5F5657", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    <X size={14} /> Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* ===== MODO VER ===== */}
            {panelMode === "view" && (
              <>
                <div style={{ padding: "0 32px", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Informacion general</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 14 }}>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Grupo</span><div style={{ fontWeight: 500 }}>{getGrupoName(selectedStudent.id_grupo)}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Capacitacion</span><div style={{ fontWeight: 500 }}>{selectedStudent.capacitacion || '---'}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Cohorte</span><div style={{ fontWeight: 500 }}>{selectedStudent.cohorte || '---'}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Turno</span><div style={{ fontWeight: 500 }}>{selectedStudent.turno || '---'}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Estado</span><div><span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: selectedStudent.estatus === "Activo" ? "#FEEBEE" : "#F0EFEF", color: selectedStudent.estatus === "Activo" ? "#0F8122" : "#5F5657" }}>{selectedStudent.estatus}</span></div></div>
                  </div>
                </div>
                <div style={{ padding: "0 32px", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Datos personales</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 14 }}>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>CURP</span><div style={{ fontWeight: 500, fontFamily: "monospace", fontSize: 13 }}>{selectedStudent.curp || '---'}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>NSS</span><div style={{ fontWeight: 500, fontFamily: "monospace", fontSize: 13 }}>{selectedStudent.nss || '---'}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Fecha de nacimiento</span><div style={{ fontWeight: 500 }}>{selectedStudent.fecha_nacimiento || '---'}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Tipo de sangre</span><div style={{ fontWeight: 500 }}>{selectedStudent.tipo_sangre || '---'}</div></div>
                  </div>
                </div>
                <div style={{ padding: "0 32px", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Contacto</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 14 }}>
                    <div style={{ gridColumn: "span 2" }}><span style={{ color: "#5F5657", fontSize: 12 }}>Direccion</span><div style={{ fontWeight: 500 }}>{selectedStudent.direccion || '---'}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Tutor</span><div style={{ fontWeight: 500 }}>{selectedStudent.tutor_nombre || '---'}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Telefono tutor</span><div style={{ fontWeight: 500 }}>{selectedStudent.tutor_telefono || '---'}</div></div>
                  </div>
                </div>
              </>
            )}

            {/* ===== MODO EDITAR ===== */}
            {panelMode === "edit" && (
              <>
                <div style={{ padding: "0 32px", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Informacion general</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 14 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Nombre</span>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>No. Control</span>
                      <input type="text" value={editControl} onChange={(e) => setEditControl(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "monospace" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Grupo</span>
                      <select value={editGrupo} onChange={(e) => setEditGrupo(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)", background: "#fff" }}>
                        <option value="">Sin grupo</option>
                        {gruposList.map((g) => (
                          <option key={g.id} value={g.id}>{g.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Capacitacion</span>
                      <input type="text" value={editCapacitacion} onChange={(e) => setEditCapacitacion(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Turno</span>
                      <input type="text" value={editTurno} onChange={(e) => setEditTurno(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
                    </div>
                  </div>
                </div>
                <div style={{ padding: "0 32px", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Informacion personal</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 14 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>CURP</span>
                      <input type="text" value={editCurp} onChange={(e) => setEditCurp(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "monospace" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Fecha de nacimiento</span>
                      <input type="text" value={editFechaNacimiento} onChange={(e) => setEditFechaNacimiento(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Tipo de sangre</span>
                      <input type="text" value={editTipoSangre} onChange={(e) => setEditTipoSangre(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
                    </div>
                  </div>
                </div>
                <div style={{ padding: "0 32px", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Contacto</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 14 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Domicilio</span>
                      <input type="text" value={editDomicilio} onChange={(e) => setEditDomicilio(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Nombre tutor</span>
                      <input type="text" value={editTutorNombre} onChange={(e) => setEditTutorNombre(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Telefono tutor</span>
                      <input type="text" value={editTelefonoTutor} onChange={(e) => setEditTelefonoTutor(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Correo tutor</span>
                      <input type="text" value={editCorreoTutor} onChange={(e) => setEditCorreoTutor(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}


      {showExportModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              width: 460,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1C1819", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <Download size={22} color="#EB2466" />
                Exportar lista de alumnos
              </h2>
              <button
                onClick={() => setShowExportModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#85787A" }}
              >
                <X size={22} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: "#5F5657", marginBottom: 20 }}>
              Selecciona el grupo para generar la lista de alumnos en PDF.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#5F5657", display: "block", marginBottom: 8 }}>
                Grupo
              </label>
              <select
                value={exportGroupId}
                onChange={(e) => setExportGroupId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #CAC6C7",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                  background: "#fff",
                  outline: "none",
                }}
              >
                <option value="all">Todos los alumnos ({filteredStudents.length})</option>
                {uniqueGroups.map((g) => {
                  const count = alumnosData.filter((s) => getGrupoName(s.id_grupo) === g).length;
                  return (
                    <option key={g} value={g}>
                      Grupo {g} ({count} alumnos)
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ padding: "12px 16px", borderRadius: 8, background: "#F0EFEF", marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "#5F5657" }}>
                <strong>Archivo:</strong> {exportGroupId === "all" ? "lista_alumnos_general.pdf" : `lista_grupo_${exportGroupId}.pdf`}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #CAC6C7",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleExportPDF}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #EB2466, #AB1748)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Download size={16} />
                Generar PDF
              </button>
            </div>
          </div>
        </div>
      )}


      {showConfirmClose && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1002,
          }}
          onClick={() => setShowConfirmClose(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              width: 420,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1C1819", margin: 0 }}>
                Cambios sin guardar
              </h2>
              <button
                onClick={() => setShowConfirmClose(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#85787A" }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: "#5F5657", lineHeight: 1.6, marginBottom: 24 }}>
              Hay cambios sin guardar. Desea guardar los cambios antes de cerrar?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={handleDiscardEdit}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #CAC6C7",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                No guardar
              </button>
              <button
                onClick={handleConfirmSaveAndClose}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #EB2466, #AB1748)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Check size={16} />
                Guardar y cerrar
              </button>
            </div>
          </div>
        </div>
      )}


      {showConfirmEdit && selectedStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
          }}
          onClick={() => setShowConfirmEdit(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              width: 420,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1C1819", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <Edit size={20} color="#EB2466" />
                Editar alumno
              </h2>
              <button
                onClick={() => setShowConfirmEdit(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#85787A" }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: "#5F5657", lineHeight: 1.6, marginBottom: 24 }}>
              Desea editar los datos del alumno <strong style={{ color: "#1C1819" }}>{`${selectedStudent.nombre} ${selectedStudent.apellido_paterno} ${selectedStudent.apellido_materno}`.trim()}</strong>?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirmEdit(false)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #CAC6C7",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmEdit}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #EB2466, #AB1748)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Edit size={16} />
                Editar
              </button>
            </div>
          </div>
        </div>
      )}


      {showNewStudentModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => { setShowNewStudentModal(false); resetNewStudentForm(); setUploadProgress(null); }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              width: newStudentMode === "upload" ? 600 : 520,
              maxWidth: "90vw",
              maxHeight: "90vh",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1C1819", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <Plus size={22} color="#EB2466" />
                Nuevo alumno
              </h2>
              <button
                onClick={() => { setShowNewStudentModal(false); resetNewStudentForm(); setUploadProgress(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#85787A" }}
              >
                <X size={22} />
              </button>
            </div>


            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <button
                onClick={() => { setNewStudentMode("manual"); resetNewStudentForm(); }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 16px",
                  border: newStudentMode === "manual" ? "2px solid #EB2466" : "1px solid #CAC6C7",
                  borderRadius: 10,
                  background: newStudentMode === "manual" ? "#FEEBEE" : "#fff",
                  color: newStudentMode === "manual" ? "#EB2466" : "#5F5657",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <User size={18} />
                Agregar manualmente
              </button>
              <button
                onClick={() => { setNewStudentMode("upload"); resetNewStudentForm(); }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 16px",
                  border: newStudentMode === "upload" ? "2px solid #EB2466" : "1px solid #CAC6C7",
                  borderRadius: 10,
                  background: newStudentMode === "upload" ? "#FEEBEE" : "#fff",
                  color: newStudentMode === "upload" ? "#EB2466" : "#5F5657",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <FileSpreadsheet size={18} />
                Subir archivo .xls
              </button>
            </div>


            {newStudentMode === "manual" && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Informacion general</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", fontSize: 14 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Nombre *</span>
                      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre completo" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>No. Control *</span>
                      <input type="text" value={newControl} onChange={(e) => setNewControl(e.target.value)} placeholder="Ej: 2024001" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "monospace", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Grupo *</span>
                      <select value={newGrupo} onChange={(e) => setNewGrupo(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", background: "#fff", boxSizing: "border-box" }}>
                        <option value="">Selecciona un grupo</option>
                        {gruposList.map((g) => (
                          <option key={g.id} value={g.id}>{g.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Capacitacion</span>
                      <input type="text" value={newCapacitacion} onChange={(e) => setNewCapacitacion(e.target.value)} placeholder="Ej: Desarrollo web" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Cohorte</span>
                      <input type="text" value={newCohorte} onChange={(e) => setNewCohorte(e.target.value)} placeholder="Ej: 2025" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Turno</span>
                      <select value={newTurno} onChange={(e) => setNewTurno(e.target.value as "Matutino" | "Vespertino")} style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", background: "#fff", boxSizing: "border-box" }}>
                        <option value="Matutino">Matutino</option>
                        <option value="Vespertino">Vespertino</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Informacion personal</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", fontSize: 14 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>CURP</span>
                      <input type="text" value={newCurp} onChange={(e) => setNewCurp(e.target.value)} placeholder="18 caracteres" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "monospace", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Fecha de nacimiento</span>
                      <input type="text" value={newFechaNacimiento} onChange={(e) => setNewFechaNacimiento(e.target.value)} placeholder="DD/MM/AAAA" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Tipo de sangre</span>
                      <input type="text" value={newTipoSangre} onChange={(e) => setNewTipoSangre(e.target.value)} placeholder="Ej: O+" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Num. Afiliacion</span>
                      <input type="text" value={newNumAfiliacion} onChange={(e) => setNewNumAfiliacion(e.target.value)} placeholder="Ej: 12345" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "monospace", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Contacto</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", fontSize: 14 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Domicilio</span>
                      <input type="text" value={newDomicilio} onChange={(e) => setNewDomicilio(e.target.value)} placeholder="Direccion completa" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Nombre tutor</span>
                      <input type="text" value={newTutor} onChange={(e) => setNewTutor(e.target.value)} placeholder="Nombre del tutor" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <span style={{ color: "#5F5657", fontSize: 12 }}>Telefono tutor</span>
                      <input type="text" value={newTelefonoTutor} onChange={(e) => setNewTelefonoTutor(e.target.value)} placeholder="10 digitos" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { setShowNewStudentModal(false); resetNewStudentForm(); setUploadProgress(null); }}
                    style={{
                      padding: "10px 20px",
                      border: "1px solid #CAC6C7",
                      borderRadius: 8,
                      background: "#fff",
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveNewStudent}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #EB2466, #AB1748)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Check size={16} />
                    Guardar alumno
                  </button>
                </div>
              </>
            )}

            {/* Modo carga de archivo .xls */}
            {newStudentMode === "upload" && (
              <>
                <div style={{ padding: "12px 16px", borderRadius: 8, background: "#F0EFEF", marginBottom: 20, fontSize: 13, color: "#5F5657", lineHeight: 1.6 }}>
                  <strong>Formato requerido:</strong> El archivo debe contener columnas: <strong>NOMBRE DEL ESTUDIANTE</strong>, <strong>MATRICULA</strong>, <strong>GRUPO</strong>. Soporta archivos con multiples hojas (cada hoja = un grupo). Compatible con los formatos de LISTAS CAPACITACIÓN y LISTAS PROPEDEUTICO.
                </div>

                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <button
                    onClick={handleDownloadTemplate}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 16px",
                      border: "1px solid #EB2466",
                      borderRadius: 8,
                      background: "#FEEBEE",
                      color: "#EB2466",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Download size={16} />
                    Descargar plantilla .xlsx
                  </button>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed #CAC6C7",
                    borderRadius: 12,
                    padding: "32px 24px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: uploadFile ? "#FEEBEE" : "#FAFAFA",
                    borderColor: uploadError ? "#AB1748" : uploadFile ? "#EB2466" : "#CAC6C7",
                    marginBottom: 16,
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <Upload size={32} color={uploadError ? "#AB1748" : "#85787A"} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1C1819", marginBottom: 4 }}>
                    {uploadFile ? uploadFile.name : "Arrastra un archivo o haz clic para seleccionar"}
                  </div>
                  <div style={{ fontSize: 12, color: "#85787A" }}>
                    Formatos soportados: .xls, .xlsx, .csv
                  </div>
                </div>

                {uploadError && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FDE8EE", color: "#AB1748", fontSize: 13, marginBottom: 16 }}>
                    {uploadError}
                  </div>
                )}

                {uploadPreview && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#5F5657", marginBottom: 8 }}>
                      Vista previa ({uploadPreview.reduce((acc, s) => acc + s.rows.length, 0)} registros en {uploadPreview.length} hoja(s)):
                    </div>
                    {uploadPreview.map((sheet, si) => (
                      <div key={si} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#EB2466", marginBottom: 4 }}>
                          {sheet.sheet} ({sheet.rows.length} registros)
                        </div>
                        <div style={{ border: "1px solid #F0EFEF", borderRadius: 8, overflow: "hidden", maxHeight: 150, overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: "#F0EFEF" }}>
                                {sheet.headers.map((h, i) => (
                                  <th key={i} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "#5F5657", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sheet.rows.slice(0, 3).map((row, i) => (
                                <tr key={i} style={{ borderTop: "1px solid #F0EFEF", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                                  {row.map((cell, j) => (
                                    <td key={j} style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{String(cell || "")}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {sheet.rows.length > 3 && (
                          <div style={{ fontSize: 11, color: "#85787A", marginTop: 2 }}>
                            ... y {sheet.rows.length - 3} registros mas
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {uploadProgress && (
                  <div style={{ marginBottom: 20, padding: 16, border: "1px solid #F0EFEF", borderRadius: 8, background: "#FAFAFA" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#5F5657", marginBottom: 8 }}>
                      <span>
                        {uploadProgress.done
                          ? uploadProgress.failed === 0
                            ? "Importacion completa"
                            : `Importacion completa (${uploadProgress.failed} fallidos)`
                          : `Subiendo ${uploadProgress.current} de ${uploadProgress.total}...`}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        {uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}%
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 8, background: "#E0E0E0", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%`,
                          height: "100%",
                          background: uploadProgress.done
                            ? uploadProgress.failed === 0
                              ? "#0F8122"
                              : "linear-gradient(135deg, #EB2466, #AB1748)"
                            : "linear-gradient(135deg, #EB2466, #AB1748)",
                          borderRadius: 4,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#85787A", marginTop: 8 }}>
                      <span style={{ color: "#0F8122" }}>{uploadProgress.success} exitosos</span>
                      {uploadProgress.failed > 0 && <span style={{ color: "#AB1748" }}>{uploadProgress.failed} fallidos</span>}
                    </div>
                    {uploadProgress.done && uploadProgress.errors.length > 0 && (
                      <div style={{ marginTop: 10, maxHeight: 120, overflowY: "auto", fontSize: 11, color: "#AB1748", background: "#FFF0F3", padding: 8, borderRadius: 6 }}>
                        {uploadProgress.errors.map((e, i) => (
                          <div key={i} style={{ marginBottom: 2 }}>{e}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { setShowNewStudentModal(false); resetNewStudentForm(); setUploadProgress(null); }}
                    disabled={!!uploadProgress && !uploadProgress.done}
                    style={{
                      padding: "10px 20px",
                      border: "1px solid #CAC6C7",
                      borderRadius: 8,
                      background: "#fff",
                      fontSize: 14,
                      cursor: uploadProgress && !uploadProgress.done ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-sans)",
                      opacity: uploadProgress && !uploadProgress.done ? 0.5 : 1,
                    }}
                  >
                    {uploadProgress && !uploadProgress.done ? "Subiendo..." : uploadProgress?.done ? "Cerrar" : "Cancelar"}
                  </button>
                  <button
                    onClick={handleConfirmUpload}
                    disabled={!uploadPreview || (!!uploadProgress && !uploadProgress.done)}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: 8,
                      background: uploadPreview && !(uploadProgress && !uploadProgress.done) ? "linear-gradient(135deg, #EB2466, #AB1748)" : "#CAC6C7",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: uploadPreview && !(uploadProgress && !uploadProgress.done) ? "pointer" : "not-allowed",
                      fontFamily: "var(--font-sans)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Upload size={16} />
                    {uploadProgress && !uploadProgress.done ? "Importando..." : "Importar alumnos"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 20px",
            borderRadius: 8,
            background: toast.type === "success" ? "#0F8122" : toast.type === "error" ? "#AB1748" : "#5F5657",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            zIndex: 2000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {toast.message}
        </div>
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
