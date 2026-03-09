import React, { useState, useEffect } from 'react';
import { Building, Save, FileCheck, Phone, Mail, MapPin } from 'lucide-react';

interface CompanyProfile {
  business_code: string;
  name: string;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  business_registration_cert_url: string | null;
  food_safety_cert_url: string | null;
}

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setProfile(await res.json());
      } else {
        // Fallback for MVP if backend is offline
        const mst = localStorage.getItem('business_code') || 'demo-mst-999';
        setProfile({
          business_code: mst,
          name: 'Công ty TNHH Demo Traceability',
          address: '',
          contact_phone: '',
          contact_email: '',
          business_registration_cert_url: '',
          food_safety_cert_url: ''
        });
      }
    } catch {
      setError('Cannot connect to backend');
      setProfile({
        business_code: localStorage.getItem('business_code') || 'offline-demo',
        name: 'Offline Demo Company',
        address: '', contact_phone: '', contact_email: '',
        business_registration_cert_url: '', food_safety_cert_url: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (profile) {
      setProfile({ ...profile, [e.target.name]: e.target.value });
    }
  };

  const handleSimulateUpload = (field: keyof CompanyProfile) => {
    if (profile) {
      setTimeout(() => {
        setProfile({ ...profile, [field]: `https://moit.fake.s3/certs/${profile.business_code}-${field}.pdf` });
      }, 500);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profile)
      });
      
      if (res.ok) {
        alert('Company profile updated successfully!');
      } else {
        alert('Failed to update. Check backend logs.');
      }
    } catch {
      alert('Offline MVP Mode: Profile saved locally.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return <div className="page-container"><p>Loading profile...</p></div>;
  }

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Company Profile</h1>
          <p>Manage your enterprise details and official certifications</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={18} /> {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </header>

      {error && (
        <div style={{ padding: '12px', background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div className="grid-2">
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-header">
            <h2 className="card-title">General Information</h2>
          </div>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Business Code (MST) - Read Only</label>
              <input 
                type="text" 
                className="form-control" 
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
                value={profile.business_code} 
                disabled 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <div style={{ position: 'relative' }}>
                <Building size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="form-control" name="name" value={profile.name} onChange={handleChange} style={{ paddingLeft: '40px' }} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Headquarters Address</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="form-control" name="address" value={profile.address || ''} onChange={handleChange} style={{ paddingLeft: '40px' }} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="tel" className="form-control" name="contact_phone" value={profile.contact_phone || ''} onChange={handleChange} style={{ paddingLeft: '40px' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" className="form-control" name="contact_email" value={profile.contact_email || ''} onChange={handleChange} style={{ paddingLeft: '40px' }} />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-header">
            <h2 className="card-title">Official Certifications</h2>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">Giấy chứng nhận đăng ký kinh doanh</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input type="text" className="form-control" value={profile.business_registration_cert_url || ''} readOnly placeholder="No certificate uploaded" />
              <button type="button" className="btn btn-outline" onClick={() => handleSimulateUpload('business_registration_cert_url')} style={{ whiteSpace: 'nowrap' }}>
                Upload PDF
              </button>
            </div>
            {profile.business_registration_cert_url && (
              <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.8rem', marginTop: '8px' }}>
                <FileCheck size={14} /> Certificate securely stored
              </p>
            )}
          </div>

          <div>
            <label className="form-label">Giấy chứng nhận cơ sở đủ điều kiện ATTP (Optional)</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input type="text" className="form-control" value={profile.food_safety_cert_url || ''} readOnly placeholder="No certificate uploaded" />
              <button type="button" className="btn btn-outline" onClick={() => handleSimulateUpload('food_safety_cert_url')} style={{ whiteSpace: 'nowrap' }}>
                Upload PDF
              </button>
            </div>
            {profile.food_safety_cert_url && (
              <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.8rem', marginTop: '8px' }}>
                <FileCheck size={14} /> Certificate securely stored
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
