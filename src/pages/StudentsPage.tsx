import { useState, useRef } from "react";
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
import { students, type Student } from "../data/mockData";
import { generateStudentListPDF } from "../utils/generateStudentListPDF";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const mockHistory = [
  { date: "2026-07-13", entry: "08:02", exit: "16:30" },
  { date: "2026-07-12", entry: "07:58", exit: "16:25" },
  { date: "2026-07-11", entry: "08:05", exit: "16:35" },
  { date: "2026-07-10", entry: "08:00", exit: "16:28" },
  { date: "2026-07-09", entry: "07:55", exit: "16:32" },
  { date: "2026-07-08", entry: "08:10", exit: "16:20" },
  { date: "2026-07-07", entry: "08:03", exit: "16:27" },
];

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([
    "Grupo A",
    "Activo",
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
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
  const [uploadPreview, setUploadPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredStudents = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.nombre.toLowerCase().includes(q) ||
      s.numControl.toLowerCase().includes(q) ||
      s.grupo.toLowerCase().includes(q)
    );
  });

  const uniqueGroups = Array.from(new Set(students.map((s) => s.grupo))).sort();

  const handleExportPDF = () => {
    const toExport =
      exportGroupId === "all"
        ? filteredStudents
        : students.filter((s) => s.grupo === exportGroupId);
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

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (student: Student) => {
    setEditName(student.nombre);
    setEditControl(student.numControl);
    setEditGrupo(student.grupo);
    setEditCapacitacion(student.capacitacion);
    setEditTurno(student.turno);
    setEditCurp(student.curp || "GARC080315HDFRRL09");
    setEditFechaNacimiento(student.fechaNacimiento || "15/03/2008");
    setEditTipoSangre(student.tipoSangre || "O+");
    setEditDomicilio(student.domicilio || "Av. Insurgentes Sur 1234, Col. Del Valle, CDMX");
    setEditTelefonoTutor(student.telefonoTutor);
    setEditCorreoTutor(student.tutor + "@email.com");
    setSelectedStudent(student);
    setShowConfirmEdit(true);
  };

  const confirmEdit = () => {
    setShowConfirmEdit(false);
    setPanelMode("edit");
  };

  const handleSaveEdit = () => {
    setPanelMode("view");
    showToast("Datos del alumno actualizados correctamente");
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

  const handleConfirmSaveAndClose = () => {
    setShowConfirmClose(false);
    setPanelMode("view");
    setSelectedStudent(null);
    showToast("Datos del alumno actualizados correctamente");
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

  const handleSaveNewStudent = () => {
    if (!newName.trim() || !newControl.trim() || !newGrupo.trim()) {
      showToast("Nombre, numero de control y grupo son obligatorios", "error");
      return;
    }
    const newId = Math.max(...students.map((s) => s.id), 0) + 1;
    students.push({
      id: newId,
      nombre: newName.trim(),
      numControl: newControl.trim(),
      grupo: newGrupo.trim(),
      capacitacion: newCapacitacion.trim(),
      cohorte: newCohorte.trim(),
      tutor: newTutor.trim(),
      telefonoTutor: newTelefonoTutor.trim(),
      curp: newCurp.trim(),
      fechaNacimiento: newFechaNacimiento.trim(),
      tipoSangre: newTipoSangre.trim(),
      numAfiliacion: newNumAfiliacion.trim(),
      domicilio: newDomicilio.trim(),
      estado: "Activo",
      foto: "",
      turno: newTurno,
    });
    setShowNewStudentModal(false);
    showToast(`Alumno "${newName.trim()}" agregado correctamente`);
    resetNewStudentForm();
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Nombre", "No. Control", "Grupo", "Capacitacion", "Cohorte",
      "Turno", "CURP", "Fecha Nacimiento", "Tipo de Sangre",
      "Num Afiliacion", "Domicilio", "Tutor", "Telefono Tutor",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alumnos");
    XLSX.writeFile(wb, "plantilla_alumnos.xlsx");
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
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        if (jsonData.length < 2) {
          setUploadError("El archivo esta vacio o no tiene datos");
          setUploadFile(null);
          return;
        }
        const headers = jsonData[0].map((h) => String(h || ""));
        const rows = jsonData.slice(1).filter((row) => row.some((cell) => cell !== undefined && cell !== ""));
        setUploadPreview({ headers, rows: rows as string[][] });
      } catch {
        setUploadError("Error al leer el archivo. Verifique el formato.");
        setUploadFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmUpload = () => {
    if (!uploadPreview) return;
    const headerMap: Record<string, keyof Student> = {};
    const requiredFields = ["Nombre", "No. Control", "Grupo"];
    uploadPreview.headers.forEach((h, i) => {
      const normalized = h.toLowerCase().trim();
      if (normalized.includes("nombre")) headerMap[i] = "nombre";
      else if (normalized.includes("control")) headerMap[i] = "numControl";
      else if (normalized.includes("grupo")) headerMap[i] = "grupo";
      else if (normalized.includes("capacitacion")) headerMap[i] = "capacitacion";
      else if (normalized.includes("cohorte")) headerMap[i] = "cohorte";
      else if (normalized.includes("turno")) headerMap[i] = "turno";
      else if (normalized.includes("curp")) headerMap[i] = "curp";
      else if (normalized.includes("nacimiento")) headerMap[i] = "fechaNacimiento";
      else if (normalized.includes("sangre")) headerMap[i] = "tipoSangre";
      else if (normalized.includes("afiliacion")) headerMap[i] = "numAfiliacion";
      else if (normalized.includes("domicilio")) headerMap[i] = "domicilio";
      else if (normalized.includes("tutor") && !normalized.includes("telefono")) headerMap[i] = "tutor";
      else if (normalized.includes("telefono")) headerMap[i] = "telefonoTutor";
    });
    const missingHeaders = requiredFields.filter((f) => !Object.values(headerMap).includes(f as keyof Student));
    if (missingHeaders.length > 0) {
      showToast(`Faltan columnas requeridas: ${missingHeaders.join(", ")}`, "error");
      return;
    }
    let added = 0;
    const baseId = Math.max(...students.map((s) => s.id), 0);
    uploadPreview.rows.forEach((row, idx) => {
      const nombre = row[Object.keys(headerMap).find((k) => headerMap[Number(k)] === "nombre") as unknown as number] || "";
      const numControl = row[Object.keys(headerMap).find((k) => headerMap[Number(k)] === "numControl") as unknown as number] || "";
      const grupo = row[Object.keys(headerMap).find((k) => headerMap[Number(k)] === "grupo") as unknown as number] || "";
      if (!nombre || !numControl || !grupo) return;
      const getField = (field: keyof Student): string => {
        const idx = Object.keys(headerMap).find((k) => headerMap[Number(k)] === field);
        return idx !== undefined ? String(row[Number(idx)] || "") : "";
      };
      students.push({
        id: baseId + idx + 1,
        nombre: String(nombre),
        numControl: String(numControl),
        grupo: String(grupo),
        capacitacion: getField("capacitacion"),
        cohorte: getField("cohorte"),
        tutor: getField("tutor"),
        telefonoTutor: getField("telefonoTutor"),
        curp: getField("curp"),
        fechaNacimiento: getField("fechaNacimiento"),
        tipoSangre: getField("tipoSangre"),
        numAfiliacion: getField("numAfiliacion"),
        domicilio: getField("domicilio"),
        estado: "Activo",
        foto: "",
        turno: (getField("turno") as "Matutino" | "Vespertino") || "Matutino",
      });
      added++;
    });
    setShowNewStudentModal(false);
    showToast(`${added} alumno(s) importado(s) correctamente`);
    resetNewStudentForm();
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
          <button
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
            }}
          >
            <Filter size={16} />
            Filtrar
          </button>
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
                    {student.nombre}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      fontFamily: "monospace",
                      color: "#EB2466",
                    }}
                  >
                    {student.numControl}
                  </td>
                  <td style={{ padding: "12px" }}>{student.grupo}</td>
                  <td style={{ padding: "12px" }}>{student.capacitacion}</td>
                  <td style={{ padding: "12px" }}>{student.tutor}</td>
                  <td style={{ padding: "12px" }}>{student.telefonoTutor}</td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          student.estado === "Activo" ? "#FEEBEE" : "#F0EFEF",
                        color:
                          student.estado === "Activo" ? "#0F8122" : "#5F5657",
                      }}
                    >
                      {student.estado}
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
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          color: "#85787A",
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
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1C1819" }}>{selectedStudent.nombre}</div>
                <div style={{ fontSize: 16, fontFamily: "monospace", color: "#EB2466", marginTop: 2 }}>{selectedStudent.numControl}</div>
                <div style={{ fontSize: 13, color: "#5F5657", marginTop: 2 }}>Grupo: {selectedStudent.grupo}</div>
              </div>
              {panelMode === "view" && (
                <button onClick={() => {
                  setEditName(selectedStudent.nombre);
                  setEditControl(selectedStudent.numControl);
                  setEditGrupo(selectedStudent.grupo);
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
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Grupo</span><div style={{ fontWeight: 500 }}>{selectedStudent.grupo}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Capacitacion</span><div style={{ fontWeight: 500 }}>{selectedStudent.capacitacion}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Turno</span><div style={{ fontWeight: 500 }}>{selectedStudent.turno}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Estado</span><div><span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: selectedStudent.estado === "Activo" ? "#FEEBEE" : "#F0EFEF", color: selectedStudent.estado === "Activo" ? "#0F8122" : "#5F5657" }}>{selectedStudent.estado}</span></div></div>
                  </div>
                </div>
                <div style={{ padding: "0 32px", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Informacion personal</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 14 }}>
                    <div style={{ gridColumn: "span 2" }}><span style={{ color: "#5F5657", fontSize: 12 }}>CURP</span><div style={{ fontWeight: 500, fontFamily: "monospace" }}>{selectedStudent.curp || "GARC080315HDFRRL09"}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Fecha de nacimiento</span><div style={{ fontWeight: 500 }}>{selectedStudent.fechaNacimiento || "15/03/2008"}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Tipo de sangre</span><div style={{ fontWeight: 500 }}>{selectedStudent.tipoSangre || "O+"}</div></div>
                  </div>
                </div>
                <div style={{ padding: "0 32px", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Contacto</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 14 }}>
                    <div style={{ gridColumn: "span 2" }}><span style={{ color: "#5F5657", fontSize: 12 }}>Domicilio</span><div style={{ fontWeight: 500 }}>{selectedStudent.domicilio || "Av. Insurgentes Sur 1234, Col. Del Valle, CDMX"}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Telefono tutor</span><div style={{ fontWeight: 500 }}>{selectedStudent.telefonoTutor}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Correo tutor</span><div style={{ fontWeight: 500 }}>{selectedStudent.tutor + "@email.com"}</div></div>
                  </div>
                </div>
                <div style={{ padding: "0 32px", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Credencial NFC</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 14 }}>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Chip ID</span><div style={{ fontWeight: 500, fontFamily: "monospace" }}>{`NFC-${String(selectedStudent.id).padStart(4, "0")}`}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Fecha asignacion</span><div style={{ fontWeight: 500 }}>{"01/09/2025"}</div></div>
                    <div><span style={{ color: "#5F5657", fontSize: 12 }}>Estado</span><div><span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: "#FEEBEE", color: "#0F8122" }}>{"Activo"}</span></div></div>
                  </div>
                </div>
                <div style={{ padding: "0 32px", marginBottom: 32 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#EB2466", textTransform: "uppercase", marginBottom: 12, letterSpacing: 0.5 }}>Historial</h3>
                  <div style={{ border: "1px solid #F0EFEF", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#FFFFFF" }}>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#5F5657" }}>Fecha</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#5F5657" }}>Entrada</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#5F5657" }}>Salida</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockHistory.map((entry) => (
                          <tr key={entry.date} style={{ borderTop: "1px solid #F0EFEF" }}>
                            <td style={{ padding: "8px 12px" }}>{entry.date}</td>
                            <td style={{ padding: "8px 12px", color: "#0F8122" }}>{entry.entry}</td>
                            <td style={{ padding: "8px 12px", color: "#AB1748" }}>{entry.exit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                      <input type="text" value={editGrupo} onChange={(e) => setEditGrupo(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, fontWeight: 500, marginTop: 4, fontFamily: "var(--font-sans)" }} />
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
                  const count = students.filter((s) => s.grupo === g).length;
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
              Desea editar los datos del alumno <strong style={{ color: "#1C1819" }}>{selectedStudent.nombre}</strong>?
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
          onClick={() => { setShowNewStudentModal(false); resetNewStudentForm(); }}
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
                onClick={() => { setShowNewStudentModal(false); resetNewStudentForm(); }}
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
                      <input type="text" value={newGrupo} onChange={(e) => setNewGrupo(e.target.value)} placeholder="Ej: Grupo A" style={{ width: "100%", padding: "8px 10px", border: "1px solid #CAC6C7", borderRadius: 6, fontSize: 14, marginTop: 4, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
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
                    onClick={() => { setShowNewStudentModal(false); resetNewStudentForm(); }}
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
                  <strong>Formato requerido:</strong> El archivo debe contener columnas: <strong>Nombre</strong>, <strong>No. Control</strong>, <strong>Grupo</strong> (obligatorias), y opcionales: Capacitacion, Cohorte, Turno, CURP, Fecha Nacimiento, Tipo de Sangre, Num Afiliacion, Domicilio, Tutor, Telefono Tutor.
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
                      Vista previa ({uploadPreview.rows.length} registros):
                    </div>
                    <div style={{ border: "1px solid #F0EFEF", borderRadius: 8, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: "#F0EFEF" }}>
                            {uploadPreview.headers.map((h, i) => (
                              <th key={i} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "#5F5657", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {uploadPreview.rows.slice(0, 5).map((row, i) => (
                            <tr key={i} style={{ borderTop: "1px solid #F0EFEF", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                              {row.map((cell, j) => (
                                <td key={j} style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{String(cell || "")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {uploadPreview.rows.length > 5 && (
                      <div style={{ fontSize: 12, color: "#85787A", marginTop: 4 }}>
                        ... y {uploadPreview.rows.length - 5} registros mas
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { setShowNewStudentModal(false); resetNewStudentForm(); }}
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
                    onClick={handleConfirmUpload}
                    disabled={!uploadPreview}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: 8,
                      background: uploadPreview ? "linear-gradient(135deg, #EB2466, #AB1748)" : "#CAC6C7",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: uploadPreview ? "pointer" : "not-allowed",
                      fontFamily: "var(--font-sans)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Upload size={16} />
                    Importar alumnos
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
