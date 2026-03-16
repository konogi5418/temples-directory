import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Branch { id: string; name: string; }
interface Temple { id: string; name: string; region: string; postal_code?: string; address?: string; phone?: string; fax?: string; priest_name: string; is_church: boolean; branches: Branch[]; }
interface Department { id: string; name: string; phone: string; ip_phone: string; fax: string; extension: string; sort_order: number; }

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'temples' | 'departments'>('temples');
  
  const [temples, setTemples] = useState<Temple[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriestName, setEditPriestName] = useState('');
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDept, setNewDept] = useState<Partial<Department>>({ name: '', phone: '', ip_phone: '', fax: '', extension: '', sort_order: 0 });
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptData, setEditDeptData] = useState<Partial<Department>>({});

  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  // --- ダッシュボード用の検索State ---
  const [searchQueryTemple, setSearchQueryTemple] = useState('');
  const [searchQueryDept, setSearchQueryDept] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deptFileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const fetchTemples = async () => {
    const { data } = await supabase.from('temples').select('*');
    const sortedData = (data || []).sort((a, b) => {
      const idA = a.branches && a.branches.length > 0 ? a.branches[0].id : '9999';
      const idB = b.branches && b.branches.length > 0 ? b.branches[0].id : '9999';
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });
    setTemples(sortedData);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('sort_order', { ascending: true });
    setDepartments(data || []);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'last_updated').single();
    if (data) setLastUpdated(data.value);
  };

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }
      setLoading(true);
      await Promise.all([fetchTemples(), fetchDepartments(), fetchSettings()]);
      setLoading(false);
    };
    checkAuthAndFetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const handleSaveLastUpdated = async () => {
    try {
      const { error } = await supabase.from('app_settings').upsert({ key: 'last_updated', value: lastUpdated });
      if (error) throw error;
      alert('名簿の更新日を保存しました。');
    } catch (err: any) {
      alert(`保存エラー: ${err.message}`);
    }
  };

  const handleDeleteTemple = async (id: string, name: string) => { if (!window.confirm(`「${name || '空白のレコード'}」を削除しますか？`)) return; const { error } = await supabase.from('temples').delete().eq('id', id); if (!error) setTemples(temples.filter(t => t.id !== id)); };
  const startEditing = (id: string, currentName: string) => { setEditingId(id); setEditPriestName(currentName || ''); };
  const savePriestName = async (id: string) => { const { error } = await supabase.from('temples').update({ priest_name: editPriestName }).eq('id', id); if (!error) { setTemples(temples.map(t => t.id === id ? { ...t, priest_name: editPriestName } : t)); setEditingId(null); } };
  const handleAddDepartment = async (e: React.FormEvent) => { e.preventDefault(); if (!newDept.name) return alert('部署名は必須です'); try { setLoading(true); const { error } = await supabase.from('departments').insert([newDept]); if (error) throw error; setNewDept({ name: '', phone: '', ip_phone: '', fax: '', extension: '', sort_order: 0 }); fetchDepartments(); } catch (err: any) { alert(`追加エラー: ${err.message}`); } finally { setLoading(false); } };
  const handleDeleteDepartment = async (id: string, name: string) => { if (!window.confirm(`部署「${name}」を削除しますか？`)) return; const { error } = await supabase.from('departments').delete().eq('id', id); if (!error) fetchDepartments(); };
  const updateDeptSortOrder = async (id: string, newOrder: number) => { await supabase.from('departments').update({ sort_order: newOrder }).eq('id', id); fetchDepartments(); };
  const startEditingDept = (dept: Department) => { setEditingDeptId(dept.id); setEditDeptData(dept); };
  const cancelEditingDept = () => { setEditingDeptId(null); setEditDeptData({}); };
  const saveDepartment = async (id: string) => { try { setLoading(true); const { error } = await supabase.from('departments').update({ name: editDeptData.name, phone: editDeptData.phone, ip_phone: editDeptData.ip_phone, fax: editDeptData.fax, extension: editDeptData.extension, sort_order: editDeptData.sort_order }).eq('id', id); if (error) throw error; fetchDepartments(); setEditingDeptId(null); } catch (err: any) { alert(`更新エラー: ${err.message}`); } finally { setLoading(false); } };
  
  const parseCSVRow = (str: string) => { const result = []; let curVal = ''; let inQuotes = false; for (let i = 0; i < str.length; i++) { if (inQuotes) { if (str[i] === '"') { if (str[i + 1] === '"') { curVal += '"'; i++; } else { inQuotes = false; } } else { curVal += str[i]; } } else { if (str[i] === '"') { inQuotes = true; } else if (str[i] === ',') { result.push(curVal); curVal = ''; } else { curVal += str[i]; } } } result.push(curVal); return result; };
  const handleExportCSV = () => { const headers = ['id', 'name', 'region', 'postal_code', 'address', 'phone', 'fax', 'priest_name', 'is_church', 'branches']; const csvRows = temples.map(t => { const branchesStr = t.branches ? t.branches.map(b => `${b.id}:${b.name}`).join('|') : ''; return [ t.id, `"${(t.name || '').replace(/"/g, '""')}"`, `"${(t.region || '').replace(/"/g, '""')}"`, `"${(t.postal_code || '').replace(/"/g, '""')}"`, `"${(t.address || '').replace(/"/g, '""')}"`, `"${(t.phone || '').replace(/"/g, '""')}"`, `"${(t.fax || '').replace(/"/g, '""')}"`, `"${(t.priest_name || '').replace(/"/g, '""')}"`, t.is_church ? 'TRUE' : 'FALSE', `"${branchesStr.replace(/"/g, '""')}"` ].join(','); }); const csvContent = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n'); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'temples_backup.csv'); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (!window.confirm('寺院のCSVデータでデータベースを更新します。よろしいですか？')) { if (fileInputRef.current) fileInputRef.current.value = ''; return; } const reader = new FileReader(); reader.onload = async (event) => { try { setLoading(true); const text = event.target?.result as string; const rows = text.split(/\r?\n/).filter(row => row.trim() !== ''); const headers = parseCSVRow(rows[0]).map(h => h.trim()); const newData = rows.slice(1).map(row => { const values = parseCSVRow(row); const temple: any = {}; headers.forEach((header, index) => { const val = values[index] !== undefined ? values[index].trim() : ''; if (header === 'id') { if (val) temple.id = val; } else if (header === 'branches') { temple.branches = val ? val.split('|').map(b => { const [id, name] = b.split(':'); return { id: id || '', name: name || '' }; }) : []; } else if (header === 'is_church') { temple.is_church = (val.toUpperCase() === 'TRUE'); } else { temple[header] = val; } }); return temple; }); const toUpdate = newData.filter(d => d.id); const toInsert = newData.filter(d => !d.id); if (toUpdate.length > 0) { const { error } = await supabase.from('temples').upsert(toUpdate); if (error) throw error; } if (toInsert.length > 0) { const { error } = await supabase.from('temples').insert(toInsert); if (error) throw error; } alert('寺院のインポートが完了しました。'); fetchTemples(); } catch (err: any) { alert(`エラー: ${err.message}`); } finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; } }; reader.readAsText(file); };
  const handleExportDepartmentsCSV = () => { const headers = ['id', 'name', 'phone', 'ip_phone', 'fax', 'extension', 'sort_order']; const csvRows = departments.map(d => { return [ d.id, `"${(d.name || '').replace(/"/g, '""')}"`, `"${(d.phone || '').replace(/"/g, '""')}"`, `"${(d.ip_phone || '').replace(/"/g, '""')}"`, `"${(d.fax || '').replace(/"/g, '""')}"`, `"${(d.extension || '').replace(/"/g, '""')}"`, d.sort_order ].join(','); }); const csvContent = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n'); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'departments_backup.csv'); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const handleImportDepartmentsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (!window.confirm('部署のCSVデータでデータベースを更新します。よろしいですか？')) { if (deptFileInputRef.current) deptFileInputRef.current.value = ''; return; } const reader = new FileReader(); reader.onload = async (event) => { try { setLoading(true); const text = event.target?.result as string; const rows = text.split(/\r?\n/).filter(row => row.trim() !== ''); const headers = parseCSVRow(rows[0]).map(h => h.trim()); const newData = rows.slice(1).map(row => { const values = parseCSVRow(row); const dept: any = {}; headers.forEach((header, index) => { const val = values[index] !== undefined ? values[index].trim() : ''; if (header === 'id') { if (val) dept.id = val; } else if (header === 'sort_order') { dept.sort_order = parseInt(val, 10) || 0; } else { dept[header] = val; } }); return dept; }); const toUpdate = newData.filter(d => d.id); const toInsert = newData.filter(d => !d.id); if (toUpdate.length > 0) { const { error } = await supabase.from('departments').upsert(toUpdate); if (error) throw error; } if (toInsert.length > 0) { const { error } = await supabase.from('departments').insert(toInsert); if (error) throw error; } alert('部署データのインポートが完了しました。'); fetchDepartments(); } catch (err: any) { alert(`エラー: ${err.message}`); } finally { setLoading(false); if (deptFileInputRef.current) deptFileInputRef.current.value = ''; } }; reader.readAsText(file); };

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>;

  // --- 検索による絞り込み処理 ---
  const filteredTemples = temples.filter(t => {
    if (!searchQueryTemple) return true;
    const q = searchQueryTemple.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.region && t.region.toLowerCase().includes(q)) ||
      (t.priest_name && t.priest_name.toLowerCase().includes(q))
    );
  });

  const filteredDepartments = departments.filter(d => {
    if (!searchQueryDept) return true;
    const q = searchQueryDept.toLowerCase();
    return (
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.phone && d.phone.includes(q)) ||
      (d.extension && d.extension.includes(q))
    );
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1>管理者ダッシュボード</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>ログアウト</button>
      </div>

      <div style={{ background: '#e9ecef', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '16px' }}>名簿の公開更新日:</strong>
        <input type="date" value={lastUpdated} onChange={(e) => setLastUpdated(e.target.value)} style={{ padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <button onClick={handleSaveLastUpdated} style={{ padding: '8px 16px', background: '#343a40', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>日付を保存する</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('temples')} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: activeTab === 'temples' ? '#0056b3' : '#f8f9fa', color: activeTab === 'temples' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '4px' }}>
          寺院データ管理
        </button>
        <button onClick={() => setActiveTab('departments')} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: activeTab === 'departments' ? '#0056b3' : '#f8f9fa', color: activeTab === 'departments' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '4px' }}>
          総本山 部署データ管理
        </button>
      </div>

      {activeTab === 'temples' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleExportCSV} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>↓ CSV出力</button>
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>↑ CSV読込</button>
              <button onClick={() => navigate('/admin/add')} style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ 新規寺院追加</button>
            </div>
            {/* --- 寺院用の検索窓を追加 --- */}
            <input 
              type="text" 
              placeholder="寺院名・布教区・住職名で検索" 
              value={searchQueryTemple} 
              onChange={(e) => setSearchQueryTemple(e.target.value)} 
              style={{ padding: '8px', width: '300px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              {/* --- テーブル項目をシンプルに整理 --- */}
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc', width: '15%' }}>布教区</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc', width: '35%' }}>寺院・教会名</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc', width: '30%' }}>住職・主管名 (クリックで編集)</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc', textAlign: 'center', width: '20%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemples.map((temple) => (
                <tr key={temple.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{temple.region}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>
                    {temple.name}
                    {temple.is_church && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#e0f7fa', color: '#006064', padding: '2px 6px', borderRadius: '4px', border: '1px solid #b2ebf2' }}>教会</span>}
                  </td>
                  <td style={{ padding: '10px', cursor: 'pointer' }}>
                    {editingId === temple.id ? (
                      <input type="text" value={editPriestName} onChange={(e) => setEditPriestName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && savePriestName(temple.id)} onBlur={() => savePriestName(temple.id)} autoFocus style={{ padding: '4px', width: '90%' }} />
                    ) : (
                      // --- 教会の場合は「主管」、それ以外は「住職」と表示 ---
                      <div onClick={() => startEditing(temple.id, temple.priest_name)} style={{ padding: '4px', background: '#fcfcfc', border: '1px dashed #ccc', minHeight: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#666', background: '#eee', padding: '2px 4px', borderRadius: '3px' }}>
                          {temple.is_church ? '主管' : '住職'}
                        </span>
                        <span>{temple.priest_name || '（未設定）'}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                    <button onClick={() => navigate(`/admin/edit/${temple.id}`)} style={{ padding: '4px 8px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>編集</button>
                    <button onClick={() => handleDeleteTemple(temple.id, temple.name)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {activeTab === 'departments' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleExportDepartmentsCSV} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>↓ 部署CSV出力</button>
              <input type="file" accept=".csv" ref={deptFileInputRef} onChange={handleImportDepartmentsCSV} style={{ display: 'none' }} />
              <button onClick={() => deptFileInputRef.current?.click()} style={{ padding: '8px 16px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>↑ 部署CSV読込</button>
            </div>
            {/* --- 部署用の検索窓を追加 --- */}
            <input 
              type="text" 
              placeholder="部署名・電話番号で検索" 
              value={searchQueryDept} 
              onChange={(e) => setSearchQueryDept(e.target.value)} 
              style={{ padding: '8px', width: '300px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
            <h3>新規部署の追加</h3>
            <form onSubmit={handleAddDepartment} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label style={{ display: 'block', fontSize: '12px' }}>並び順</label><input type="number" value={newDept.sort_order} onChange={e => setNewDept({...newDept, sort_order: Number(e.target.value)})} style={{ width: '60px', padding: '6px' }} /></div>
              <div><label style={{ display: 'block', fontSize: '12px' }}>部署名 (必須)</label><input type="text" value={newDept.name} onChange={e => setNewDept({...newDept, name: e.target.value})} required style={{ padding: '6px' }} /></div>
              <div><label style={{ display: 'block', fontSize: '12px' }}>電話番号</label><input type="text" value={newDept.phone} onChange={e => setNewDept({...newDept, phone: e.target.value})} style={{ padding: '6px' }} /></div>
              <div><label style={{ display: 'block', fontSize: '12px' }}>IP電話</label><input type="text" value={newDept.ip_phone} onChange={e => setNewDept({...newDept, ip_phone: e.target.value})} style={{ padding: '6px' }} /></div>
              <div><label style={{ display: 'block', fontSize: '12px' }}>FAX</label><input type="text" value={newDept.fax} onChange={e => setNewDept({...newDept, fax: e.target.value})} style={{ width: '120px', padding: '6px' }} /></div>
              <div><label style={{ display: 'block', fontSize: '12px' }}>内線</label><input type="text" value={newDept.extension} onChange={e => setNewDept({...newDept, extension: e.target.value})} style={{ width: '80px', padding: '6px' }} /></div>
              <button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '32px' }}>追加</button>
            </form>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>順序</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>部署名</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>電話番号</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>IP電話</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>FAX / 内線</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ccc', textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '10px', textAlign: 'center' }}>データがありません</td></tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept.id} style={{ borderBottom: '1px solid #eee' }}>
                    {editingDeptId === dept.id ? (
                      <>
                        <td style={{ padding: '10px' }}><input type="number" value={editDeptData.sort_order || 0} onChange={e => setEditDeptData({...editDeptData, sort_order: Number(e.target.value)})} style={{ width: '50px', padding: '4px' }} /></td>
                        <td style={{ padding: '10px' }}><input type="text" value={editDeptData.name || ''} onChange={e => setEditDeptData({...editDeptData, name: e.target.value})} style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }} /></td>
                        <td style={{ padding: '10px' }}><input type="text" value={editDeptData.phone || ''} onChange={e => setEditDeptData({...editDeptData, phone: e.target.value})} style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }} /></td>
                        <td style={{ padding: '10px' }}><input type="text" value={editDeptData.ip_phone || ''} onChange={e => setEditDeptData({...editDeptData, ip_phone: e.target.value})} style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }} /></td>
                        <td style={{ padding: '10px' }}>
                          <input type="text" value={editDeptData.fax || ''} onChange={e => setEditDeptData({...editDeptData, fax: e.target.value})} placeholder="FAX" style={{ width: '100%', padding: '4px', marginBottom: '4px', boxSizing: 'border-box' }} /><br/>
                          <input type="text" value={editDeptData.extension || ''} onChange={e => setEditDeptData({...editDeptData, extension: e.target.value})} placeholder="内線" style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }} />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button onClick={() => saveDepartment(dept.id)} style={{ padding: '4px 8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>保存</button>
                          <button onClick={cancelEditingDept} style={{ padding: '4px 8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>取消</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px' }}><input type="number" defaultValue={dept.sort_order} onBlur={(e) => updateDeptSortOrder(dept.id, Number(e.target.value))} style={{ width: '50px', padding: '4px' }} title="数字を変更して枠外をクリックすると並び順が更新されます" /></td>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{dept.name}</td>
                        <td style={{ padding: '10px' }}>{dept.phone || '-'}</td>
                        <td style={{ padding: '10px' }}>{dept.ip_phone || '-'}</td>
                        <td style={{ padding: '10px' }}>FAX: {dept.fax || '-'}<br/>内線: {dept.extension || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button onClick={() => startEditingDept(dept)} style={{ padding: '4px 8px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>編集</button>
                          <button onClick={() => handleDeleteDepartment(dept.id, dept.name)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>削除</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}