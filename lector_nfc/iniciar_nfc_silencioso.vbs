' Arranca el lector NFC sin ventana negra.
' Usa la misma carpeta que este .vbs (y nfc_url.txt si existe).
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
bat = fso.GetParentFolderName(WScript.ScriptFullName) & "\iniciar_nfc.bat"
WshShell.Run chr(34) & bat & chr(34), 0
Set WshShell = Nothing
Set fso = Nothing
