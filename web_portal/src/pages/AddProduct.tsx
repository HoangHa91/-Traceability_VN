import React, { useState, useRef } from 'react';
import { PackagePlus, Info, Upload, Download, FileText } from 'lucide-react';

export const AddProduct: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('bulk');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock API call delay
    setTimeout(() => {
      setLoading(false);
      alert('Single product registration not implemented in MVP yet. Please use Bulk Upload.');
    }, 800);
  };

  const handleDownloadTemplate = () => {
    window.open('http://localhost:8000/api/products/template', '_blank');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('http://localhost:8000/api/products/bulk', {
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
          <h1>Register New Product</h1>
          <p>Add products to the MoIT catalog manually or via bulk CSV upload</p>
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
                <h2 className="card-title">Product Details</h2>
              </div>
              
              <form onSubmit={handleSubmitSingle}>
                <div className="form-group">
                  <label className="form-label">Product Code</label>
                  <input type="text" className="form-control" placeholder="e.g. PROD-123" required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input type="text" className="form-control" placeholder="Tên sản phẩm" required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" required>
                    <option value="">Select category...</option>
                    <option value="Nông sản">Nông sản</option>
                    <option value="Chế biến">Chế biến</option>
                    <option value="Thủy sản">Thủy sản</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '24px', width: '100%', padding: '14px' }} disabled={loading}>
                  <PackagePlus size={18} /> {loading ? 'Registering...' : 'Register Product'}
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
                  Upload a CSV file containing multiple products. Ensure the format matches the MoIT schema requirements (product_code, name, category).
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
              <Info className="text-primary" size={24} style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Registration Info</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Products must be registered before you can log traceability events for them. Ensure your Product Codes exactly match what you will use in your event submissions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
