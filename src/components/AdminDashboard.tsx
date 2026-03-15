import { useEffect, useState } from 'react';
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
  priest_name: string;
  branches: Branch[];
}

export default function AdminDashboard() {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // インライン編集用のState
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriestName, setEditPriestName] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    // セッションの確認とデータ取得
    const checkAuthAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 未ログインの場合はログイン画面へ強制遷移
        navigate('/admin/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('temples')
          .select('id, name, region, priest_name, branches')
          .order('region', { ascending: true });

        if (error) throw error;
        setTemples(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [navigate]);

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  // 編集モードへの切り替え
  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditPriestName(currentName || '');
  };

  // データベースの更新と編集モードの終了
  const savePriestName = async (id: string) => {
    try {
      const { error } = await supabase
        .from('temples')
        .update({ priest_name: editPriestName })
        .eq('id', id);

      if (error) throw error;

      // 画面上のデータも更新する
      setTemples(temples.map(t => t.id === id ? { ...t, priest_name: editPriestName } : t));
      setEditingId(null);
    } catch (err: any) {
      alert(`更新エラー: ${err.message}`);
    }
  };

  // Enterキーでの保存処理
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      savePriestName(id);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>管理者ダッシュボード</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
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