import React, { useEffect, useState } from 'react';
import api from '../../services/api.js';

const EMPTY_STATUS = { type: '', message: '' };

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(EMPTY_STATUS);
  const [error, setError] = useState('');

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('api/admin/get_admin_reports.php');
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load reports.');
      setReports(Array.isArray(response.data.reports) ? response.data.reports : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const sendMessage = async (event) => {
    event.preventDefault();
    setStatus(EMPTY_STATUS);
    const trimmedMessage = message.trim();
    const trimmedSubject = subject.trim();

    if (!trimmedMessage) {
      setStatus({ type: 'danger', message: 'Write a message before sending.' });
      return;
    }
    if (trimmedMessage.length > 10000) {
      setStatus({ type: 'danger', message: 'The message must be 10,000 characters or fewer.' });
      return;
    }

    setSending(true);
    try {
      const response = await api.post('api/admin/send_message.php', {
        subject: trimmedSubject,
        message: trimmedMessage,
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to send message.');
      setSubject('');
      setMessage('');
      setStatus({ type: 'success', message: response.data.message || 'Message sent to the Registrar.' });
      await loadReports();
    } catch (requestError) {
      setStatus({ type: 'danger', message: requestError.response?.data?.message || requestError.message || 'Unable to send message.' });
    } finally {
      setSending(false);
    }
  };

  const deleteReport = async (reportId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const response = await api.post('api/admin/delete_report.php', { report_id: reportId });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to delete message.');
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch (requestError) {
      setStatus({ type: 'danger', message: requestError.response?.data?.message || requestError.message || 'Unable to delete message.' });
    }
  };

  const markRead = async (report) => {
    if (report.is_read || report.direction !== 'received') return;
    try {
      await api.post('api/admin/mark_report_read.php', { report_id: report.id });
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, is_read: 1 } : item));
    } catch (requestError) {
      setStatus({ type: 'danger', message: requestError.response?.data?.message || 'Unable to update message status.' });
    }
  };

  const unreadCount = reports.filter((report) => report.direction === 'received' && !Number(report.is_read)).length;

  return (
    <section className="card analytics-card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h3 className="card-title mb-1">Reports Communication Hub</h3>
            <p className="text-muted mb-0">Send messages to and manage communication with the Registrar.</p>
          </div>
          <span className="badge bg-primary">{unreadCount} unread</span>
        </div>

        {status.message && <div className={`alert alert-${status.type}`} role="status">{status.message}</div>}

        <form className="border rounded p-3 mb-4" onSubmit={sendMessage}>
          <h5 className="mb-3">New message to Registrar</h5>
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="admin-report-subject">Subject</label>
            <input id="admin-report-subject" className="form-control" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength="180" disabled={sending} placeholder="Optional subject" />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="admin-report-message">Message</label>
            <textarea id="admin-report-message" className="form-control" rows="4" value={message} onChange={(event) => setMessage(event.target.value)} maxLength="10000" disabled={sending} placeholder="Write your message" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending...' : 'Send to Registrar'}</button>
        </form>

        <h5 className="mb-3">Conversation history</h5>
        {loading && <div className="alert alert-info">Loading messages...</div>}
        {!loading && error && <div className="alert alert-danger">{error}</div>}
        {!loading && !error && reports.length === 0 && <div className="alert alert-light border">No messages yet.</div>}
        {!loading && !error && reports.length > 0 && (
          <div className="list-group">
            {reports.map((report) => (
              <article key={report.id} className={`list-group-item ${report.direction === 'received' && !Number(report.is_read) ? 'fw-semibold' : ''}`} onClick={() => markRead(report)}>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <span className={`badge ${report.direction === 'received' ? 'bg-success' : 'bg-secondary'} me-2`}>{report.direction === 'received' ? 'From Registrar' : 'Sent to Registrar'}</span>
                    {report.title && <strong>{report.title}</strong>}
                  </div>
                  <small className="text-muted text-nowrap">{report.created_at}</small>
                </div>
                <p className="mb-2 mt-2">{report.message}</p>
                {report.file_url && (
                  <a className="btn btn-sm btn-outline-primary me-2" href={report.file_url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                    Open attachment
                  </a>
                )}
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={(event) => { event.stopPropagation(); deleteReport(report.id); }}>Delete</button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminReports;