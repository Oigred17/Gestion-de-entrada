Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
sPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run chr(34) & sPath & "\iniciar_nfc.bat" & chr(34), 0
Set WshShell = Nothing
Set fso = Nothing
