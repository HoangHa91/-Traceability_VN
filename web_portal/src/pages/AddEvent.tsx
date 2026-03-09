import React, { useState } from 'react';
import { Send, Info, Link as LinkIcon } from 'lucide-react';

export const AddEvent: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock API call delay
    setTimeout(() => {
      setLoading(false);
      alert('Event submitted to MoIT Validated Data Lake successfully!');
    }, 800);
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1>Log Traceability Event</h1>
        <p>Record a state, property, or ownership change per MoIT Article 5</p>
      </header>

      <div className="grid-2">
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-header">
            <h2 className="card-title">Event Details</h2>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Event Type (Bắt buộc)</label>
              <select className="form-control" required>
                <option value="STATE_CHANGE">State Change (Thay đổi trạng thái)</option>
                <option value="PROPERTY_CHANGE">Property Change (Thay đổi thuộc tính)</option>
                <option value="OWNERSHIP_CHANGE">Ownership Change (Chuyển giao quyền sở hữu)</option>
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Product ID</label>
                <select className="form-control" required>
                  <option value="">Select product...</option>
                  <option value="PROD-CF-01">PROD-CF-01 (Cà phê Raw)</option>
                  <option value="PROD-CF-02">PROD-CF-PACK (Cà phê Pack)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lot Number (Số Lô)</label>
                <input type="text" className="form-control" placeholder="e.g. LOT-2026-03" required />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Location ID</label>
                <input type="text" className="form-control" placeholder="Mã xưởng/kho" required />
              </div>
              <div className="form-group">
                <label className="form-label">Event Timestamp</label>
                <input type="datetime-local" className="form-control" required />
              </div>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '24px 0' }} />
            
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LinkIcon size={18} className="text-primary" /> Traceability Link (One-Before)
            </h3>
            
            <div className="form-group">
              <label className="form-label">Previous Traceability Code (Optional)</label>
              <input type="text" className="form-control" placeholder="Scan QR or enter MoIT Trace Code from supplier" />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Leave empty if you are the first step in the chain (Producer).
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '24px', width: '100%', padding: '14px' }} disabled={loading}>
              <Send size={18} /> {loading ? 'Validating & Submitting...' : 'Submit Validated Event'}
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ background: 'var(--bg-surface-light)' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Info className="text-warning" size={24} style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>24-Hour SLA Reminder</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  All events must be logged within 24 hours of occurrence. Events submitted after the cut-off (23:59) for an older timestamp will trigger a compliance flag.
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--bg-surface-light)' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Info className="text-primary" size={24} style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Linking Principle</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  The central MoIT system automatically builds the chain using "One step before, one step after". Provide the Previous Trace Code if you received these goods from another registered establishment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
