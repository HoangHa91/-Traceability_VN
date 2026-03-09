import React, { useState, useEffect } from 'react';
import { Activity, Clock, Box, CheckCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ eventsToday: 12, products: 5, compliance: 100 });

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>SME Daily Traceability Overview</p>
      </header>

      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="card-header" style={{ paddingBottom: '12px', border: 'none', marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              Events Today (since 00:00)
            </div>
            <Activity className="text-primary" size={24} />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
            {stats.eventsToday}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={14} /> Synced to Hub
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ paddingBottom: '12px', border: 'none', marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              24h SLA Compliance
            </div>
            <Clock className="text-success" size={24} />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)', marginBottom: '8px' }}>
            {stats.compliance}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            All events processed within deadline
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ paddingBottom: '12px', border: 'none', marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              Registered Products
            </div>
            <Box style={{ color: 'var(--warning)' }} size={24} />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            {stats.products}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Active on MoIT registry
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Event Submissions</h2>
          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>View All</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Trace Code</th>
                <th>Product</th>
                <th>Event Type</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>TRC-109A-48B2-998C</td>
                  <td>Cà phê Robusta (Lô L-202)</td>
                  <td>
                    <span className="badge badge-primary">STATE_CHANGE</span>
                  </td>
                  <td className="text-muted">Today, 10:45 AM</td>
                  <td>
                    <span className="badge badge-success">VALIDATED</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
