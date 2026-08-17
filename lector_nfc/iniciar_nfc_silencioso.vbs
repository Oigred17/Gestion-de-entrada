' COBAO NFC - arranque oculto de la estacion de entrada.
' No muestra ventana. Lee nfc_url.txt y ejecuta nfc_reader.exe.
' Para inicio automatico: ejecuta una vez instalar_inicio_automatico.bat

Option Explicit

Dim fso, shell, dir, urlFile, exePath, url, line, ts

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

dir = fso.GetParentFolderName(WScript.ScriptFullName)
exePath = dir & "\nfc_reader.exe"
urlFile = dir & "\nfc_url.txt"
url = "http://localhost:8000/api/v1/nfc/scan"

If Not fso.FileExists(exePath) Then
  WScript.Quit 1
End If

If fso.FileExists(urlFile) Then
  Set ts = fso.OpenTextFile(urlFile, 1)
  If Not ts.AtEndOfStream Then
    line = Trim(ts.ReadLine)
    If Len(line) > 0 Then url = line
  End If
  ts.Close
End If

shell.CurrentDirectory = dir
' 0 = ventana oculta, False = no esperar a que termine
shell.Run """" & exePath & """ --url """ & url & """", 0, False
