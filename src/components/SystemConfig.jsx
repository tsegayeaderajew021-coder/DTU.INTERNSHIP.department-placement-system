import React, { useState } from 'react';

const SystemConfig = () => {
  const [autoBackup, setAutoBackup] = useState(true);
  const [securityMonitoring, setSecurityMonitoring] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleBackup = () => {
    alert('Database backup process started.');
  };

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="card summary-card shadow-sm">
          <div className="card-body">
            <h4 className="card-title mb-3">System Configuration & Backup</h4>
            <p className="text-muted mb-4">
              Configure system settings, schedule backups, and monitor security compliance.
            </p>
            <div className="mb-4">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoBackup"
                  checked={autoBackup}
                  onChange={() => setAutoBackup(prev => !prev)}
                />
                <label className="form-check-label" htmlFor="autoBackup">
                  Automatic daily backup
                </label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="securityMonitoring"
                  checked={securityMonitoring}
                  onChange={() => setSecurityMonitoring(prev => !prev)}
                />
                <label className="form-check-label" htmlFor="securityMonitoring">
                  Security monitoring alerts
                </label>
              </div>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="maintenanceMode"
                  checked={maintenanceMode}
                  onChange={() => setMaintenanceMode(prev => !prev)}
                />
                <label className="form-check-label" htmlFor="maintenanceMode">
                  Maintenance mode
                </label>
              </div>
            </div>
            <div className="mb-3">
              <button type="button" className="btn btn-outline-primary me-3" onClick={handleBackup}>
                Run Backup Now
              </button>
              <span className="text-muted">Last backup: 10 minutes ago</span>
            </div>
            <div className="alert alert-info mb-0">
              Security status is currently <strong>{securityMonitoring ? 'enabled' : 'disabled'}</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
