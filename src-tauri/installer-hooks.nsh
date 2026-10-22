; Wersje 1.x (przed przejściem na Tauri) instalowały się do %LOCALAPPDATA%\Programs\messy.
; Po instalacji nowej wersji usuwamy tamtą po cichu, żeby nie było dwóch Messy w zasobniku.
!macro NSIS_HOOK_POSTINSTALL
	IfFileExists "$LOCALAPPDATA\Programs\messy\Uninstall Messy.exe" 0 +2
		ExecWait '"$LOCALAPPDATA\Programs\messy\Uninstall Messy.exe" /S'
!macroend
