$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '../SmartHelpDeskAgent.ps1'
$tokens=$null; $errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $source),[ref]$tokens,[ref]$errors)
if($errors.Count){throw ($errors.Message -join '; ')}
# Importa somente funções: não coleta inventário real, não registra tarefa e não envia dados.
foreach($name in @('Normalize-ServerUrl','Get-CpuUsage','Safe')) {
 $definition=$ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true)
 . ([scriptblock]::Create($definition.Extent.Text))
}
function Write-Log {}
function Write-Status {}
function Assert-Equal($Actual,$Expected,$Message){if($Actual -ne $Expected){throw "$Message`: esperado=$Expected recebido=$Actual"}}
function Assert-Throws([scriptblock]$Action){$failed=$false;try{&$Action|Out-Null}catch{$failed=$true};if(!$failed){throw 'Era esperado um erro'}}
Assert-Equal (Normalize-ServerUrl 'https://example.test/suporte/api/assets/') 'https://example.test/suporte/api/assets' 'URL com subdiretorio'
Assert-Equal (Normalize-ServerUrl 'https://example.test/api/assets') 'https://example.test/api/assets' 'URL sem subdiretorio'
Assert-Throws {Normalize-ServerUrl 'https://example.test/login'}
Assert-Throws {Normalize-ServerUrl 'https://user:secret@example.test/api/assets'}
Assert-Throws {Normalize-ServerUrl 'https://example.test/api/assets?token=secret'}
function Get-CimInstance { [pscustomobject]@{PercentProcessorTime=37.5} }
Assert-Equal (Get-CpuUsage) 37.5 'CPU medida'
function Get-CimInstance { throw 'WMI indisponivel' }
Assert-Equal (Get-CpuUsage) $null 'CPU desconhecida'

$configFile=Join-Path ([IO.Path]::GetTempPath()) ('shd-agent-test-'+[guid]::NewGuid()+'.json')
@{serverUrl='https://old.example.test/api/assets';token='TEST-ONLY';municipio='A';unidade='B';latitude=1;longitude=1}|ConvertTo-Json|Set-Content -LiteralPath $configFile
$text=Get-Content -LiteralPath $source -Raw
$configBlock=[regex]::Match($text,'(?s)\$config=if\(Test-Path \$ConfigFile\).*?\$inventory=Get-Inventory').Value
if(!$configBlock){throw 'Bloco de configuracao nao encontrado'}
function Get-Inventory { @{} }
$ServerUrl='https://new.example.test/api/assets';$Install=$true;$EnrollmentKey='TEST-INVITE';$Municipio='A';$Unidade='B';$Latitude=1;$Longitude=1;$AllowInsecureHttp=$false
. ([scriptblock]::Create($configBlock))
Assert-Equal $ServerUrl 'https://new.example.test/api/assets' 'Reinstalacao respeita servidor informado'
$Install=$false
Assert-Throws { . ([scriptblock]::Create($configBlock)) }
$ServerUrl=''
. ([scriptblock]::Create($configBlock))
Assert-Equal $ServerUrl 'https://old.example.test/api/assets' 'Execucao agendada usa cadastro salvo'
Remove-Item -LiteralPath $configFile
Write-Host 'OK: URL, CPU, coleta indisponivel, reinstalacao e cadastro salvo.'
