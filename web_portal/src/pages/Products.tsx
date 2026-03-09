import React, { useState } from 'react';
import { PackagePlus, Search } from 'lucide-react';

export const Products: React.FC = () => {
  const [products, setProducts] = useState([
    { id: '1', code: 'PROD-CF-01', name: 'Cà phê Robusta (Hạt)', category: 'Nông sản' },
    { id: '2', code: 'PROD-CF-02', name: 'Cà phê Arabica (Hạt)', category: 'Nông sản' },
    { id: '3', code: 'PROD-CF-PACK', name: 'Cà phê hòa tan 3in1', category: 'Chế biến' },
  ]);

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Products Catalog</h1>
          <p>Register and manage your products for traceability</p>
        </div>
        <button className="btn btn-primary">
          <PackagePlus size={18} /> New Product
        </button>
      </header>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-control" placeholder="Search products..." style={{ paddingLeft: '40px' }} />
            </div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>MoIT DB ID</th>
              <th>Product Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>uid-{p.id}-x9...</td>
                <td style={{ fontWeight: 600 }}>{p.code}</td>
                <td>{p.name}</td>
                <td><span className="badge badge-warning">{p.category}</span></td>
                <td>
                  <button className="btn-icon">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
