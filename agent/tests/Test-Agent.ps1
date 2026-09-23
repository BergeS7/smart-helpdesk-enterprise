$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '../SmartHelpDeskAgent.ps1'
$tokens=$null; $errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $source),[ref]$tokens,[ref]$errors)
if($errors.Count){throw ($errors.Message -join '; ')}
# Importa somente funções: não coleta inventário real, não registra tarefa e não envia dados.
foreach($name in @('Normalize-ServerUrl','Get-CpuUsage','Safe','Compare-AgentVersion','Test-UpdateSignature')) {
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

# Atualizacao assinada: so a chave privada correspondente produz pacote aceito.
Assert-Equal (Compare-AgentVersion '2.10.0' '2.9.0') 1 'Versao numerica'
Assert-Equal (Compare-AgentVersion '2.2.0' '2.2.0') 0 'Mesma versao'
$key=New-Object Security.Cryptography.RSACryptoServiceProvider(3072);$other=New-Object Security.Cryptography.RSACryptoServiceProvider(3072)
$package=[Text.Encoding]::UTF8.GetBytes('PK-pacote-de-teste')
$sha=[BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($package)).Replace('-','').ToLowerInvariant()
function Sign($Rsa,$Version){[Convert]::ToBase64String($Rsa.SignData([Text.Encoding]::UTF8.GetBytes("SmartHelpDeskAgent-update|$Version|$sha"),[Security.Cryptography.HashAlgorithmName]::SHA256,[Security.Cryptography.RSASignaturePadding]::Pkcs1))}
$public=$key.ToXmlString($false)
Assert-Equal (Test-UpdateSignature $package '2.3.0' $sha (Sign $key '2.3.0') $public) $true 'Pacote assinado aceito'
Assert-Equal (Test-UpdateSignature $package '2.3.0' $sha (Sign $other '2.3.0') $public) $false 'Chave diferente recusada'
Assert-Equal (Test-UpdateSignature $package '9.9.9' $sha (Sign $key '2.3.0') $public) $false 'Assinatura de outra versao recusada'
$tampered=[byte[]]$package.Clone();$tampered[3]=0
Assert-Equal (Test-UpdateSignature $tampered '2.3.0' $sha (Sign $key '2.3.0') $public) $false 'Pacote alterado recusado'
Assert-Equal (Test-UpdateSignature $package '2.3.0' $sha 'nao-e-base64' $public) $false 'Assinatura invalida recusada'
Write-Host 'OK: URL, CPU, coleta indisponivel, reinstalacao, cadastro salvo e atualizacao assinada.'
