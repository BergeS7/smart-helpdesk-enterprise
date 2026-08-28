# Instalação do agente Smart HelpDesk

## Pré-requisitos

- Executar o PowerShell como administrador no computador que será mapeado.
- Confirmar município, unidade, latitude e longitude corretos.
- No Smart HelpDesk, abrir **Ativos → Gerar convite do agente**. O convite é de uso único e expira em duas horas.

## Instalação

Copie `agent/SmartHelpDeskAgent.ps1` para o computador e execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\SmartHelpDeskAgent.ps1" `
  -ServerUrl "http://192.168.10.54:8090/api/assets" `
  -EnrollmentKey "COLE_O_CONVITE_AQUI" `
  -Municipio "MUNICIPIO_CONFIRMADO" `
  -Unidade "UNIDADE_CONFIRMADA" `
  -Latitude LATITUDE_CONFIRMADA `
  -Longitude LONGITUDE_CONFIRMADA `
  -Install `
  -AllowInsecureHttp
```

`-AllowInsecureHttp` deve ser usado apenas enquanto o servidor estiver acessível por HTTP na rede interna. Remova essa opção quando HTTPS estiver configurado.

## Verificação

Após a instalação:

1. Confirme a tarefa agendada **SmartHelpDesk Agent** no Agendador de Tarefas.
2. Consulte `%ProgramData%\SmartHelpDeskAgent\agent.log` e procure `stage=report status=OK`.
3. Abra **Ativos** no sistema e confirme hostname, usuário, município, unidade e horário do inventário.
4. Abra o equipamento e valide os números de série da memória e dos discos.

O arquivo `%ProgramData%\SmartHelpDeskAgent\agent.json` contém a credencial do equipamento e é limitado a `SYSTEM` e administradores locais.
