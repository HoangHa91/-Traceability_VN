import React, { useState, useRef } from 'react';
import { Send, Info, Link as LinkIcon, Upload, Download, FileText } from 'lucide-react';

export const AddEvent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock API call delay
    setTimeout(() => {
      setLoading(false);
      alert('Event submitted to MoIT Validated Data Lake successfully!');
    }, 800);
  };

  const handleDownloadTemplate = () => {
    window.open('http://localhost:8000/api/events/template', '_blank');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('http://localhost:8000/api/events/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
      } else {
        alert(`Error: ${data.detail || 'Failed to upload'}`);
      }
    } catch (err) {
      alert('Network error resolving backend. Ensure uvicorn is running.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Log Traceability Event</h1>
          <p>Record a state, property, or ownership change per MoIT Article 5</p>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--bg-surface-light)', padding: '6px', borderRadius: 'var(--radius-md)' }}>
          <button 
            onClick={() => setActiveTab('single')}
            className={`btn ${activeTab === 'single' ? 'btn-primary' : ''}`}
            style={{ padding: '8px 16px', background: activeTab === 'single' ? 'var(--primary)' : 'transparent', border: 'none' }}
          >
            Single Entry
          </button>
          <button 
            onClick={() => setActiveTab('bulk')}
            className={`btn ${activeTab === 'bulk' ? 'btn-primary' : ''}`}
            style={{ padding: '8px 16px', background: activeTab === 'bulk' ? 'var(--primary)' : 'transparent', border: 'none' }}
          >
            Bulk CSV Upload
          </button>
        </div>
      </header>

      <div className="grid-2">
        <div className="card" style={{ alignSelf: 'start' }}>
          
          {activeTab === 'single' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="card-header">
                <h2 className="card-title">Bulk CSV Upload</h2>
              </div>
              <div style={{ padding: '24px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                <FileText size={48} style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>
                  Upload a CSV file containing multiple daily events. Ensure the format perfectly matches the MoIT schema requirements.
                </p>
                
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button type="button" className="btn btn-outline" onClick={handleDownloadTemplate}>
                    <Download size={18} /> Download CSV Template
                  </button>
                  
                  <input 
                    type="file" 
                    accept=".csv" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                  />
                  <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                    <Upload size={18} /> {loading ? 'Uploading...' : 'Upload Data'}
                  </button>
                </div>
              </div>
            </>
          )}

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
