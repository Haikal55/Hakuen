import React, { useState, useEffect } from 'react';
import { PieChartIcon, Trash2, Plus, Layout, X, Download, Save, BarChart3, LineChart as LineChartIcon, ArrowLeft, Edit2 } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, 
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { THEME_COLORS, type Chart, type ChartData } from './App';
import type { User } from './App';
import { api } from './api';
import html2pdf from 'html2pdf.js';

export interface Dashboard {
  id: string;
  title: string;
  charts: Chart[];
  createdAt: string;
}

export default function VisualizerWidget({ currentUser }: { currentUser: User }) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);
  
  // Builder State
  const [isBuildingChart, setIsBuildingChart] = useState(false);
  const [builderType, setBuilderType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [builderTitle, setBuilderTitle] = useState('My New Chart');
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [builderData, setBuilderData] = useState<{id: string, name: string, value: string}[]>([
    { id: 'row-1', name: 'Category A', value: '100' },
    { id: 'row-2', name: 'Category B', value: '250' },
    { id: 'row-3', name: 'Category C', value: '150' },
  ]);

  useEffect(() => {
    if (currentUser) {
      api.getData(currentUser.id, 'visualizerDashboards', []).then(data => {
        if (data.length === 0) {
          const demoDashboard: Dashboard = {
            id: 'demo-dashboard-1',
            title: 'Q3 Financial Overview (Demo)',
            createdAt: new Date().toISOString(),
            charts: [
              {
                id: 'chart-1', type: 'line', title: 'Monthly Revenue Growth',
                data: [{ name: 'Jan', value: 12000 }, { name: 'Feb', value: 19000 }, { name: 'Mar', value: 15000 }, { name: 'Apr', value: 22000 }, { name: 'May', value: 28000 }, { name: 'Jun', value: 32000 }]
              },
              {
                id: 'chart-2', type: 'pie', title: 'Revenue by Region',
                data: [{ name: 'North America', value: 45 }, { name: 'Europe', value: 25 }, { name: 'Asia', value: 20 }, { name: 'Others', value: 10 }]
              },
              {
                id: 'chart-3', type: 'bar', title: 'Operating Expenses',
                data: [{ name: 'Marketing', value: 8000 }, { name: 'R&D', value: 15000 }, { name: 'Servers', value: 3000 }, { name: 'Office', value: 5000 }]
              }
            ]
          };
          setDashboards([demoDashboard]);
          setActiveDashboardId(demoDashboard.id);
          api.setData(currentUser.id, 'visualizerDashboards', [demoDashboard]);
        } else {
          setDashboards(data);
          if (!activeDashboardId) {
            setActiveDashboardId(data[0].id);
          }
        }
      });
    }
  }, [currentUser]);

  const saveDashboards = async (newDashboards: Dashboard[]) => {
    setDashboards(newDashboards);
    if (currentUser) {
      await api.setData(currentUser.id, 'visualizerDashboards', newDashboards);
    }
  };

  const handleCreateDashboard = () => {
    const newDashboard: Dashboard = {
      id: Date.now().toString(),
      title: 'New Dashboard',
      charts: [],
      createdAt: new Date().toISOString()
    };
    saveDashboards([...dashboards, newDashboard]);
    setActiveDashboardId(newDashboard.id);
  };

  const handleDeleteDashboard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDashboards = dashboards.filter(d => d.id !== id);
    saveDashboards(newDashboards);
    if (activeDashboardId === id) {
      setActiveDashboardId(newDashboards.length > 0 ? newDashboards[0].id : null);
    }
  };

  const activeDashboard = dashboards.find(d => d.id === activeDashboardId);

  const setChartsForActiveDashboard = (charts: Chart[]) => {
    if (!activeDashboard) return;
    const updatedDashboard = { ...activeDashboard, charts };
    const newDashboards = dashboards.map(d => d.id === activeDashboard.id ? updatedDashboard : d);
    saveDashboards(newDashboards);
  };

  const handleExportPDF = () => {
    const element = document.getElementById('dashboard-canvas');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `${activeDashboard?.title || 'Dashboard'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#121212' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    (html2pdf() as any).set(opt).from(element).save();
  };

  // --- BUILDER FUNCTIONS ---
  const handleOpenBuilder = () => {
    setEditingChartId(null);
    setBuilderTitle('My New Chart');
    setBuilderType('bar');
    setBuilderData([
      { id: Date.now().toString() + '-1', name: 'Category A', value: '100' },
      { id: Date.now().toString() + '-2', name: 'Category B', value: '250' },
      { id: Date.now().toString() + '-3', name: 'Category C', value: '150' },
    ]);
    setIsBuildingChart(true);
  };

  const handleEditChart = (chart: Chart) => {
    setEditingChartId(chart.id);
    setBuilderTitle(chart.title);
    setBuilderType(chart.type as 'bar' | 'pie' | 'line');
    setBuilderData(chart.data.map((d, i) => ({
      id: Date.now().toString() + '-' + i,
      name: d.name,
      value: String(d.value)
    })));
    setIsBuildingChart(true);
  };

  const handleAddDataRow = () => {
    setBuilderData([...builderData, { id: Date.now().toString(), name: `Item ${builderData.length + 1}`, value: '0' }]);
  };

  const handleRemoveDataRow = (id: string) => {
    setBuilderData(builderData.filter(r => r.id !== id));
  };

  const handleUpdateDataRow = (id: string, field: 'name' | 'value', val: string) => {
    setBuilderData(builderData.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const handleSaveBuiltChart = () => {
    if (!activeDashboard) return;
    
    // Parse values to numbers
    const parsedData: ChartData[] = builderData.map(r => ({
      name: r.name || 'Unnamed',
      value: parseFloat(r.value) || 0
    }));

    const newChart: Chart = {
      id: editingChartId || Date.now().toString(),
      type: builderType,
      title: builderTitle || 'Untitled Chart',
      data: parsedData
    };

    if (editingChartId) {
      setChartsForActiveDashboard(activeDashboard.charts.map(c => c.id === editingChartId ? newChart : c));
    } else {
      setChartsForActiveDashboard([...activeDashboard.charts, newChart]);
    }
    setIsBuildingChart(false);
  };

  const parsedPreviewData = builderData.map(r => ({
    name: r.name || 'Unnamed',
    value: parseFloat(r.value) || 0
  }));

  const COLORS = THEME_COLORS;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--heading)' }}>{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ margin: 0, color: p.color || 'var(--accent)', fontSize: '14px' }}>
              {p.name}: <span style={{ fontWeight: 600 }}>{p.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChartCanvas = (type: string, data: any[]) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="#555" tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#555" tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="value" name="Value" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        ) : type === 'pie' ? (
          <RechartsPieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Tooltip content={<CustomTooltip />} />
            <Pie data={data} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={2} dataKey="value" stroke="none">
              {data.map((_entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
          </RechartsPieChart>
        ) : (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="#555" tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#555" tick={{ fill: '#888', fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" name="Value" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--panel)', stroke: 'var(--accent)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--accent)' }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    );
  };

  if (isBuildingChart) {
    return (
      <div className="builder-layout">
        {/* Editor Panel (Left) */}
        <div className="builder-sidebar">
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="icon-btn" onClick={() => setIsBuildingChart(false)} title="Cancel">
              <ArrowLeft size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--heading)' }}>Chart Builder</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>CHART TITLE</label>
              <input 
                type="text" 
                value={builderTitle}
                onChange={(e) => setBuilderTitle(e.target.value)}
                placeholder="e.g. Monthly Revenue"
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--fg)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>CHART TYPE</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[
                  { id: 'bar', icon: BarChart3, label: 'Bar' },
                  { id: 'line', icon: LineChartIcon, label: 'Line' },
                  { id: 'pie', icon: PieChartIcon, label: 'Pie' },
                ].map(type => {
                  const Icon = type.icon;
                  return (
                    <button 
                      key={type.id}
                      onClick={() => setBuilderType(type.id as any)}
                      style={{ 
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                        padding: '16px', borderRadius: '12px', border: `1px solid ${builderType === type.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: builderType === type.id ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--bg)',
                        color: builderType === type.id ? 'var(--accent)' : 'var(--muted)',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <Icon size={24} />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>DATA POINTS</label>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', padding: '0 8px', fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
                  <div style={{ flex: 1 }}>Category (X)</div>
                  <div style={{ flex: 1 }}>Value (Y)</div>
                  <div style={{ width: '32px' }}></div>
                </div>
                {builderData.map((row, idx) => (
                  <div key={row.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={row.name}
                      onChange={(e) => handleUpdateDataRow(row.id, 'name', e.target.value)}
                      placeholder={`Category ${idx + 1}`}
                      style={{ flex: 1, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--fg)', fontSize: '13px', outline: 'none' }}
                    />
                    <input 
                      type="number" 
                      value={row.value}
                      onChange={(e) => handleUpdateDataRow(row.id, 'value', e.target.value)}
                      placeholder="0"
                      style={{ flex: 1, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--fg)', fontSize: '13px', outline: 'none' }}
                    />
                    <button 
                      className="icon-btn" 
                      onClick={() => handleRemoveDataRow(row.id)}
                      disabled={builderData.length <= 1}
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: builderData.length <= 1 ? 'var(--border)' : '#ef4444' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleAddDataRow}
                style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
              >
                <Plus size={16} /> Add Data Point
              </button>
            </div>
          </div>

          <div style={{ padding: '24px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600, display: 'flex', justifyContent: 'center', gap: '8px' }}
              onClick={handleSaveBuiltChart}
            >
              <Save size={18} /> Save Chart to Dashboard
            </button>
          </div>
        </div>

        {/* Preview Panel (Right/Top) */}
        <div className="builder-main" style={{ alignItems: 'center', justifyContent: 'center', padding: '32px', background: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)' }}>
          <div style={{ width: '100%', maxWidth: '700px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h2 style={{ textAlign: 'center', margin: '0 0 24px 0', fontSize: '20px', fontWeight: 700, color: 'var(--heading)', fontFamily: 'Outfit' }}>
              {builderTitle || 'Untitled Chart'}
            </h2>
            <div style={{ height: '340px' }}>
              {renderChartCanvas(builderType, parsedPreviewData)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="viz-layout">
      
      {/* Sidebar */}
      <div className="viz-sidebar">
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layout size={18} color="var(--accent)" /> Data Sources
          </h2>
          <button className="icon-btn" onClick={handleCreateDashboard} title="New Dashboard">
            <Plus size={18} />
          </button>
        </div>
        <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
          {dashboards.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginTop: '20px' }}>
              No dashboards yet. Create one to start visualizing.
            </div>
          ) : (
            dashboards.map(d => (
              <div 
                key={d.id}
                onClick={() => setActiveDashboardId(d.id)}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginBottom: '8px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: activeDashboardId === d.id ? 'var(--accent)' : 'transparent',
                  color: activeDashboardId === d.id ? '#000' : 'var(--fg)',
                  transition: 'all 0.2s',
                  fontWeight: activeDashboardId === d.id ? 600 : 400
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <PieChartIcon size={16} opacity={0.7} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.title}
                  </span>
                </div>
                <button 
                  onClick={(e) => handleDeleteDashboard(d.id, e)}
                  style={{ background: 'none', border: 'none', color: activeDashboardId === d.id ? 'rgba(0,0,0,0.5)' : 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="viz-main">
        {!activeDashboard ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>
            <PieChartIcon size={64} opacity={0.2} style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--heading)' }}>Analytics Studio</h3>
            <p style={{ margin: 0, fontSize: '14px', maxWidth: '300px' }}>Select a data source from the sidebar or create a new dashboard to begin.</p>
            <button className="btn btn-primary" style={{ marginTop: '24px', padding: '10px 20px' }} onClick={handleCreateDashboard}>
              <Plus size={16} /> Create Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Top Bar */}
            <div className="viz-top-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '600px' }}>
                <input 
                  type="text"  
                  className="viz-title-input"
                  value={activeDashboard.title}
                  onChange={(e) => {
                    const newDashboards = dashboards.map(d => d.id === activeDashboard.id ? { ...d, title: e.target.value } : d);
                    saveDashboards(newDashboards);
                  }}
                  title="Rename Dashboard"
                />
                <Edit2 size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={handleExportPDF} disabled={activeDashboard.charts.length === 0}>
                  <Download size={16} /> Export PDF
                </button>
                <button className="btn btn-primary" style={{ padding: '8px 16px', fontWeight: 600 }} onClick={handleOpenBuilder}>
                  <Plus size={16} /> Add Chart
                </button>
              </div>
            </div>

            {/* Grid Canvas */}
            <div id="dashboard-canvas" className="viz-canvas">
              {activeDashboard.charts.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', textAlign: 'center' }}>
                  <div style={{ padding: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', marginBottom: '24px' }}>
                    <Layout size={48} opacity={0.3} />
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--heading)', fontSize: '20px' }}>Empty Canvas</h3>
                  <p style={{ margin: 0, fontSize: '14px', maxWidth: '400px', lineHeight: 1.6 }}>Click "Add Chart" to open the Chart Builder and manually create your first visualization.</p>
                </div>
              ) : (
                <div className="viz-grid">
                  {activeDashboard.charts.map((chart: any, chartIdx: number) => {
                    const { type, title, data, id } = chart;
                    return (
                      <div key={id || chartIdx} className="viz-chart-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--heading)', fontFamily: 'Outfit' }}>{title}</h2>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleEditChart(chart)}
                              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--muted)', cursor: 'pointer', padding: '6px', transition: 'all 0.2s' }}
                              title="Edit Chart"
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => setChartsForActiveDashboard(activeDashboard.charts.filter((_, idx) => idx !== chartIdx))}
                              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--muted)', cursor: 'pointer', padding: '6px', transition: 'all 0.2s' }}
                              title="Remove Chart"
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        
                        <div style={{ flex: 1, minHeight: 0 }}>
                          {renderChartCanvas(type, data)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
