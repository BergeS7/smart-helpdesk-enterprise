/**
 * Responsabilidade: Serviço de domínio de asset schema; concentra regras reutilizáveis fora da camada HTTP.
 */
const pool = require("../config/database");
async function ensureAssetSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ativos (
      id BIGSERIAL PRIMARY KEY, device_id VARCHAR(100) UNIQUE NOT NULL, token_hash CHAR(64) NOT NULL,
      patrimonio VARCHAR(100), hostname VARCHAR(255) NOT NULL, serial_number VARCHAR(255), municipio VARCHAR(150), unidade VARCHAR(255),
      latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, ip VARCHAR(100), mac VARCHAR(100), usuario VARCHAR(255),
      sistema_operacional VARCHAR(255), processador VARCHAR(255), ram_total NUMERIC(10,2), armazenamento VARCHAR(255),
      antivirus_atualizado BOOLEAN, agente_versao VARCHAR(50), status VARCHAR(20) DEFAULT 'online',
      cpu_usage NUMERIC(6,2), ram_usage NUMERIC(6,2), disk_usage NUMERIC(6,2), ultimo_heartbeat TIMESTAMPTZ,
      uptime_hours NUMERIC(12,2), last_boot TIMESTAMPTZ, firewall_enabled BOOLEAN, network_type VARCHAR(80), link_speed VARCHAR(80),
      criado_em TIMESTAMPTZ DEFAULT NOW(), atualizado_em TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS uptime_hours NUMERIC(12,2);
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS last_boot TIMESTAMPTZ;
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS firewall_enabled BOOLEAN;
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS network_type VARCHAR(80);
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS link_speed VARCHAR(80);
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS inventory_json JSONB;
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS schema_version INTEGER;
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS ultimo_inventario TIMESTAMPTZ;
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS fabricante VARCHAR(255);
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS modelo VARCHAR(255);
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS os_build VARCHAR(80);
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS ram_total_bytes BIGINT;
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS storage_total_bytes BIGINT;
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS storage_free_bytes BIGINT;
    ALTER TABLE ativos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_ativos_usuario_id ON ativos(usuario_id);
    UPDATE ativos a
       SET usuario_id = u.id
      FROM usuarios u
     WHERE a.usuario_id IS NULL
       AND COALESCE(u.status, 'ativo') = 'ativo'
       AND (
         LOWER(COALESCE(a.usuario, '')) = LOWER(u.email)
         OR LOWER(COALESCE(a.usuario, '')) = LOWER(u.nome)
         OR LOWER(REGEXP_REPLACE(COALESCE(a.usuario, ''), '^.*[\\\\/]', '')) = LOWER(SPLIT_PART(u.email, '@', 1))
       );
    CREATE OR REPLACE FUNCTION validar_avaliacao_chamado() RETURNS trigger AS $$
    DECLARE solicitante INTEGER; tecnico INTEGER; equipe INTEGER; estado TEXT; ativo BIGINT; autorizado BOOLEAN;
    BEGIN
      SELECT usuario_id,responsavel_id,team_id,status,ativo_id INTO solicitante,tecnico,equipe,estado,ativo FROM chamados WHERE id=NEW.ticket_id;
      IF estado IS NULL THEN RAISE EXCEPTION 'Chamado da avaliação não encontrado'; END IF;
      IF estado NOT IN ('RESOLVED','CLOSED','CANCELED') THEN RAISE EXCEPTION 'Somente chamados finalizados podem ser avaliados'; END IF;
      IF NEW.client_id IS NULL AND NEW.source <> 'legacy_migration' THEN RAISE EXCEPTION 'Usuário da avaliação é obrigatório'; END IF;
      IF NEW.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM solicitante THEN
        SELECT EXISTS (SELECT 1 FROM ativos a JOIN usuarios u ON u.id=NEW.client_id WHERE a.id=ativo AND (a.usuario_id=NEW.client_id OR LOWER(COALESCE(a.usuario,''))=LOWER(u.email) OR LOWER(COALESCE(a.usuario,''))=LOWER(u.nome) OR LOWER(REGEXP_REPLACE(COALESCE(a.usuario,''), '^.*[\\/]', ''))=LOWER(SPLIT_PART(u.email,'@',1)))) INTO autorizado;
        IF NOT COALESCE(autorizado,FALSE) THEN RAISE EXCEPTION 'A avaliação deve pertencer ao solicitante ou ao usuário vinculado ao ativo'; END IF;
      END IF;
      NEW.technician_id:=tecnico; NEW.team_id:=equipe; RETURN NEW;
    END $$ LANGUAGE plpgsql;
    CREATE TABLE IF NOT EXISTS ativo_snapshots (
      id BIGSERIAL PRIMARY KEY, ativo_id BIGINT NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
      report_id VARCHAR(128) NOT NULL, coletado_em TIMESTAMPTZ NOT NULL,
      schema_version INTEGER NOT NULL, agente_versao VARCHAR(50), inventory_json JSONB NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(ativo_id,report_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ativo_snapshots_data ON ativo_snapshots(ativo_id,coletado_em DESC);
    CREATE TABLE IF NOT EXISTS ativo_alteracoes (
      id BIGSERIAL PRIMARY KEY, ativo_id BIGINT NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
      snapshot_id BIGINT REFERENCES ativo_snapshots(id) ON DELETE CASCADE, categoria VARCHAR(30) NOT NULL,
      campo VARCHAR(120) NOT NULL, valor_anterior JSONB, valor_novo JSONB, severidade VARCHAR(20) NOT NULL,
      detectado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), reconhecida BOOLEAN NOT NULL DEFAULT FALSE,
      reconhecida_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, reconhecida_em TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_ativo_alteracoes_filtro ON ativo_alteracoes(ativo_id,categoria,severidade,detectado_em DESC);
    CREATE TABLE IF NOT EXISTS ativo_alertas (
      id BIGSERIAL PRIMARY KEY, ativo_id BIGINT NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
      codigo VARCHAR(160) NOT NULL, categoria VARCHAR(30) NOT NULL, titulo VARCHAR(255) NOT NULL,
      mensagem TEXT, severidade VARCHAR(20) NOT NULL, ativo BOOLEAN NOT NULL DEFAULT TRUE,
      detectado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reconhecido BOOLEAN NOT NULL DEFAULT FALSE, UNIQUE(ativo_id,codigo)
    );
    CREATE INDEX IF NOT EXISTS idx_ativo_alertas_ativos ON ativo_alertas(ativo_id,ativo,severidade);
    CREATE TABLE IF NOT EXISTS ativo_metricas (
      id BIGSERIAL PRIMARY KEY, ativo_id BIGINT NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
      cpu_usage NUMERIC(6,2), ram_usage NUMERIC(6,2), disk_usage NUMERIC(6,2), coletado_em TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ativo_metricas_ativo_data ON ativo_metricas(ativo_id, coletado_em DESC);
    ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_id BIGINT;
    ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_hostname VARCHAR(255);
    ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_patrimonio VARCHAR(100);
    ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_municipio VARCHAR(150);
    ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ativo_unidade VARCHAR(255);
    CREATE INDEX IF NOT EXISTS idx_chamados_ativo ON chamados(ativo_id);
    CREATE INDEX IF NOT EXISTS idx_chamados_ativo_local ON chamados(ativo_municipio, ativo_unidade);
    CREATE TABLE IF NOT EXISTS ativo_unidades (
      id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, municipio VARCHAR(150) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL,
      rede_prefixo VARCHAR(100), ativa BOOLEAN DEFAULT TRUE, UNIQUE(nome, municipio)
    );
    UPDATE ativo_unidades SET ativa = FALSE;
    INSERT INTO ativo_unidades(nome,municipio,latitude,longitude,ativa) VALUES
      ('Maranhão Motos - Santa Inês','Santa Inês',-3.6667,-45.3800,TRUE),
      ('Maranhão Motos - Santa Luzia do Tide','Santa Luzia do Tide',-3.4578,-45.7089,TRUE),
      ('Maranhão Motos - Bom Jardim','Bom Jardim',-3.5417,-45.6060,TRUE),
      ('Maranhão Motos - Pio XII','Pio XII',-3.8910,-45.1690,TRUE),
      ('Maranhão Motos - Brejo de Areia','Brejo de Areia',-4.3340,-45.5820,TRUE),
      ('Maranhão Motos - Alto Alegre do Pindaré','Alto Alegre do Pindaré',-3.6660,-45.8420,TRUE),
      ('Maranhão Motos - Vitória do Mearim','Vitória do Mearim',-3.4620,-44.8700,TRUE),
      ('Maranhão Motos - Luís Domingues','Luís Domingues',-1.2740,-45.8680,TRUE),
      ('Maranhão Motos - Amapá do Maranhão','Amapá do Maranhão',-1.6750,-46.0030,TRUE),
      ('Maranhão Motos - Carutapera','Carutapera',-1.1960,-46.0210,TRUE),
      ('Maranhão Motos - Bela Vista do Maranhão','Bela Vista do Maranhão',-3.7260,-45.3070,TRUE),
      ('Maranhão Motos - Satubinha','Satubinha',-4.0500,-45.2440,TRUE),
      ('Maranhão Motos - Tufilândia','Tufilândia',-3.6740,-45.6230,TRUE),
      ('Maranhão Motos - Altamira do Maranhão','Altamira do Maranhão',-4.1650,-45.4700,TRUE),
      ('Maranhão Motos - Buriticupu','Buriticupu',-4.3230,-46.4400,TRUE),
      ('Maranhão Motos - Igarapé do Meio','Igarapé do Meio',-3.6570,-45.2110,TRUE),
      ('Maranhão Motos - Godofredo Viana','Godofredo Viana',-1.4040,-45.7790,TRUE),
      ('Maranhão Motos - Boa Vista do Gurupi','Boa Vista do Gurupi',-1.7950,-46.3000,TRUE),
      ('Maranhão Motos - Maracaçumé','Maracaçumé',-2.0430,-45.9590,TRUE),
      ('Maranhão Motos - Santa Luzia do Paruá','Santa Luzia do Paruá',-2.5110,-45.7800,TRUE),
      ('Maranhão Motos - Governador Nunes Freire','Governador Nunes Freire',-2.1280,-45.8770,TRUE),
      ('Maranhão Motos - Cândido Mendes','Cândido Mendes',-1.4460,-45.7160,TRUE),
      ('Maranhão Motos - Monção','Monção',-3.4910,-45.2510,TRUE),
      ('Maranhão Motos - Pindaré-Mirim','Pindaré-Mirim',-3.6080,-45.3420,TRUE),
      ('Maranhão Motos - Junco do Maranhão','Junco do Maranhão',-1.8380,-46.0890,TRUE),
      ('Maranhão Motos - São João do Carú','São João do Carú',-3.5500,-46.2500,TRUE),
      ('Maranhão Motos - Presidente Médici','Presidente Médici',-2.3890,-45.8200,TRUE)
    ON CONFLICT(nome,municipio) DO UPDATE SET
      latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,ativa=TRUE;
    UPDATE chamados c SET
      ativo_hostname=COALESCE(c.ativo_hostname,a.hostname),
      ativo_patrimonio=COALESCE(c.ativo_patrimonio,a.patrimonio,a.serial_number,a.device_id),
      ativo_municipio=COALESCE(c.ativo_municipio,a.municipio),
      ativo_unidade=COALESCE(c.ativo_unidade,a.unidade)
    FROM ativos a WHERE c.ativo_id=a.id;
  `);
}
module.exports = { ensureAssetSchema };
