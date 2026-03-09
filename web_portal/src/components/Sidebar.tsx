import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Activity, LogOut } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      position: 'fixed',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 10
    }}>
      <div style={{ marginBottom: '40px', padding: '0 12px' }}>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--primary)' }}>🏛️</span> MoIT Portal
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>SME Traceability Node</p>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavLink 
          to="/" 
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
            borderRadius: 'var(--radius-sm)', textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--primary-glow)' : 'transparent',
            fontWeight: isActive ? 600 : 500,
            transition: 'all var(--transition-fast)'
          })}
        >
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>

        <NavLink 
          to="/products" 
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
            borderRadius: 'var(--radius-sm)', textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--primary-glow)' : 'transparent',
            fontWeight: isActive ? 600 : 500,
            transition: 'all var(--transition-fast)'
          })}
        >
          <Package size={20} /> Products
        </NavLink>

        <NavLink 
          to="/add-event" 
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
            borderRadius: 'var(--radius-sm)', textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--primary-glow)' : 'transparent',
            fontWeight: isActive ? 600 : 500,
            transition: 'all var(--transition-fast)'
          })}
        >
          <Activity size={20} /> Log Event
        </NavLink>
      </nav>

      <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)' }}>
        <button 
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
            width: '100%', background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 500
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--danger)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <LogOut size={20} /> Logout
        </button>
      </div>
    </aside>
  );
};
