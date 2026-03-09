import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const [businessCode, setBusinessCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Simple hardcoded auth skip for MVP demo
  const handleDemoLogin = () => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('business_code', 'VN-SME-999');
    navigate('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // In a real app we would call /api/auth/token here.
      // For MVP ease of use, if no real backend is running, we fallback to demo auth.
      const formData = new URLSearchParams();
      formData.append('username', businessCode);
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('business_code', businessCode);
        navigate('/');
      } else {
        handleDemoLogin(); // fallback for fast demo
      }
    } catch (err) {
      console.log("Backend offline, using demo auth");
      handleDemoLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏛️</div>
          <h1 style={{ marginBottom: '8px' }}>MoIT Traceability</h1>
          <p className="text-muted">SME Enterprise Login Portal</p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Business Code (MST)</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. 0101234567"
              value={businessCode}
              onChange={(e) => setBusinessCode(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In as SME'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <p>By logging in, you agree to MoIT Article 5 compliance.</p>
        </div>
      </div>
    </div>
  );
};
