import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Branch {
  id: string;
  name: string;
}

interface Temple {
  id: string;
  name: string;
  region: string;
  postal_code?: string;
  address?: string;
  phone?: string;
  fax?: string;
  priest_name: string;
  is_church: boolean;
  branches: Branch[];
}

export default function AdminDashboard() {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriestName, setEditPriestName] = useState('');
  
  // ファイル入力用の参照
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // データを再取得する関数
  const fetchTemples = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('temples')
        .select('*')
        .order('region', { ascending: true });

      if (error) throw error;
      setTemples(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }
      fetchTemples();
    };
    checkAuthAndFetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditPriestName(currentName || '');
  };

  const savePriestName = async (id: string) => {
    try {
      const { error } = await supabase
        .from('temples')
        .update({ priest_name: editPriestName })
        .eq('id', id);

      if (error) throw error;
      setTemples(temples.map(t => t.id === id ? { ...t, priest_name: editPriestName } : t));
      setEditingId(null);
    } catch (err: any) {
      alert(`更新エラー: ${err.message}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') savePriestName(id);
  };

  // CSVをパースするための独自関数
  const parseCSVRow = (str: string) => {
    const result = [];
    let curVal = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      if (inQuotes) {
        if (str[i] === '"') {
          if (str[i + 1] === '"') { curVal += '"'; i++; }
          else { inQuotes = false; }
        } else { curVal += str[i]; }
      } else {
        if (str[i] === '"') { inQuotes = true; }
        else if (str[i] === ',') { result.push(curVal); curVal = ''; }
        else { curVal += str[i]; }
      }
    }
    result.push(curVal);
    return result;
  };

  // CSVエクスポート（バックアップ）処理
  const handleExportCSV = () => {
    const headers = ['id', 'name', 'region', 'postal_code', 'address', 'phone', 'fax', 'priest_name', 'is_church', 'branches'];
    
    const csvRows = temples.map(t => {
      // 識別番号と支部名を「id:name|id:name」の形式で文字列化
      const branchesStr = t.branches ? t.branches.map(b => `${b.id}:${b.name}`).join('|') : '';
      return [
        t.id,
        `"${(t.name || '').replace(/"/g, '""')}"`,
        `"${(t.region || '').replace(/"/g, '""')}"`,
        `"${(t.postal_code || '').replace(/"/g, '""')}"`,
        `"${(t.address || '').replace(/"/g, '""')}"`,
        `"${(t.phone || '').replace(/"/g, '""')}"`,
        `"${(t.fax || '').replace(/"/g, '""')}"`,
        `"${(t.priest_name || '').replace(/"/g, '""')}"`,
        t.is_church ? 'TRUE' : 'FALSE',
        `"${branchesStr.replace(/"/g, '""')}"`
      ].join(',');
    });

    // Excelでの文字化け防止のためBOM (\uFEFF) を付与
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'temples_backup.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSVインポート（一括登録・更新）処理
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('CSVのデータでデータベースを更新（追加・上書き）します。よろしいですか？\n※既存のIDが一致するものは上書きされ、IDが空のものは新規追加されます。')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoading(true);
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
        
        const headers = parseCSVRow(rows[0]).map(h => h.trim());
        
        const newData = rows.slice(1).map(row => {
          const values = parseCSVRow(row);
          const temple: any = {};
          
          headers.forEach((header, index) => {
            const val = values[index] !== undefined ? values[index].trim() : '';
            if (header === 'id') {
              if (val) temple.id = val; // IDが存在する場合のみセット（空ならSupabaseが新規IDを発行）
            } else if (header === 'branches') {
              // 「1-1:第一支部|1-2:第二支部」の形式をJSONB配列に戻す
              temple.branches = val ? val.split('|').map(b => {
                const [id, name] = b.split(':');
                return { id: id || '', name: name || '' };
              }) : [];
            } else if (header === 'is_church') {
              temple.is_church = (val.toUpperCase() === 'TRUE');
            } else {
              temple[header] = val;
            }
          });
          return temple;
        });

        // Supabaseのupsert処理（IDがあれば更新、なければ新規挿入）
        const { error } = await supabase.from('temples').upsert(newData);
        if (error) throw error;

        alert('CSVのインポートが完了しました。');
        fetchTemples();

      } catch (err: any) {
        alert(`インポートエラー: ${err.message}`);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1>管理者ダッシュボード</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            ↓ CSVエクスポート
          </button>
          
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            style={{ display: 'none' }} 
            id="csv-upload"
          />
          <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            ↑ CSVインポート
          </button>

          <button onClick={() => navigate('/admin/add')} style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            + 新規追加
          </button>
          <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>ログアウト</button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
        <thead>
          <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
            <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>布教区</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>識別番号</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>寺院名</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>住職名 (クリックで編集)</th>
          </tr>
        </thead>
        <tbody>
          {temples.map((temple) => (
            <tr key={temple.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{temple.region}</td>
              <td style={{ padding: '10px' }}>
                {temple.branches && temple.branches.map(b => `[${b.id}]`).join(' ')}
              </td>
              <td style={{ padding: '10px' }}>{temple.name}</td>
              <td style={{ padding: '10px', cursor: 'pointer', minWidth: '200px' }}>
                {editingId === temple.id ? (
                  <input
                    type="text"
                    value={editPriestName}
                    onChange={(e) => setEditPriestName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, temple.id)}
                    onBlur={() => savePriestName(temple.id)}
                    autoFocus
                    style={{ padding: '4px', width: '90%' }}
                  />
                ) : (
                  <div onClick={() => startEditing(temple.id, temple.priest_name)} style={{ padding: '4px', background: '#fcfcfc', border: '1px dashed #ccc', minHeight: '24px' }}>
                    {temple.priest_name || '（未登録）'}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}