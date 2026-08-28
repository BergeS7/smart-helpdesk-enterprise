/**
 * Consolida as rotinas legadas que alteravam o schema depois que o Express já
 * estava aceitando tráfego. Cada rotina é idempotente e passa a ser registrada
 * pelo node-pg-migrate como uma única etapa de compatibilidade.
 */
exports.up = async () => {
  const { ensureAssetSchema } = require("../src/services/assetSchemaService");
  const { ensurePrioritySchema } = require("../src/services/prioritySchemaService");
  const { ensurePermissionSchema } = require("../src/services/permissionService");
  const { ensurePrivacyComplianceSchema } = require("../src/services/privacyComplianceService");
  const { ensureSlaPauseSchema } = require("../src/services/slaPauseSchemaService");
  const { ensureEmailVerificationSchema } = require("../src/services/emailVerificationSchemaService");

  await ensureAssetSchema();
  await ensurePrioritySchema();
  await ensurePermissionSchema();
  await ensureSlaPauseSchema();
  await ensureEmailVerificationSchema();
  await ensurePrivacyComplianceSchema();
};

// Migração de consolidação não remove dados nem tabelas em rollback.
exports.down = () => {};

