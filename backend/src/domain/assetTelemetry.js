function numeric(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function percentage(value) {
  const parsed = numeric(value);
  return parsed !== null && parsed >= 0 && parsed <= 100 ? parsed : null;
}
function telemetry(payload) {
  const metrics = payload.metrics || {};
  const firewall = payload.security?.firewall;
  const antivirus = payload.security?.defender;
  const uptime = numeric(metrics.uptimeHours ?? payload.uptimeHours);
  return {
    cpu: percentage(metrics.cpuUsagePercent ?? payload.cpuUsage),
    ram: percentage(metrics.ramUsagePercent ?? payload.ramUsage),
    disk: percentage(metrics.systemDiskUsagePercent ?? payload.diskUsage),
    uptime: uptime !== null && uptime >= 0 ? uptime : null,
    antivirus: antivirus ? (typeof antivirus.signaturesUpdated === 'boolean' ? antivirus.signaturesUpdated : null)
      : typeof payload.antivirusAtualizado === 'boolean' ? payload.antivirusAtualizado : null,
    firewall: firewall ? (firewall.status === 'ENABLED' ? true : firewall.status === 'DISABLED' ? false : null)
      : typeof payload.firewallEnabled === 'boolean' ? payload.firewallEnabled : null,
  };
}
module.exports = { numeric, telemetry };
