import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminEditTemple() {
  const { id } = useParams(); // URLから寺院のIDを取得
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // フォームのState
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [fax, setFax] = useState('');
  const [priestName, setPriestName] = useState('');
  const [isChurch, setIsChurch] = useState(false);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);

  // 初回レンダリング時に既存データを取得
  useEffect(() => {
    const fetchTemple = async () => {
      try {
        const { data, error } = await supabase
          .from('temples')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          setName(data.name || '');
          setRegion(data.region || '');
          setPostalCode(data.postal_code || '');
          setAddress(data.address || '');
          setPhone(data.phone || '');
          setFax(data.fax || '');
          setPriestName(data.priest_name || '');
          setIsChurch(data.is_church || false);
          setBranches(data.branches || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTemple();
  }, [id]);

  // 支部の操作関数
  const addBranch = () => setBranches([...branches, { id: '', name: '' }]);
  const updateBranch = (index: number, field: 'id' | 'name', value: string) => {
    const newBranches = [...branches];
    newBranches[index][field] = value;
    setBranches(newBranches);
  };
  const removeBranch = (index: number) => setBranches(branches.filter((_, i) => i !== index));

  // データ更新処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const validBranches = branches.filter(b => b.id.trim() !== '' || b.name.trim() !== '');

    try {
      const { error: updateError } = await supabase
        .from('temples')
        .update({
          name,
          region,
          postal_code: postalCode,
          address,
          phone,
          fax,
          priest_name: priestName,
          is_church: isChurch,
          branches: validBranches,
        })
        .eq('id', id);

      if (updateError) throw updateError;
      navigate('/admin'); // 保存成功後、ダッシュボードへ戻る
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>寺院データの編集</h2>
        <button onClick={() => navigate('/admin')} style={{ padding: '8px 16px', cursor: 'pointer' }}>キャンセル</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>寺院名 (必須)</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>教会ですか？</label>
          <input type="checkbox" checked={isChurch} onChange={(e) => setIsChurch(e.target.checked)} /> はい
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>布教区 (必須)</label>
          <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} required placeholder="例: 東京第一" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>郵便番号</label>
            <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="例: 100-0000" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>住所</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>電話番号</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>FAX番号</label>
            <input type="text" value={fax} onChange={(e) => setFax(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>住職名</label>
          <input type="text" value={priestName} onChange={(e) => setPriestName(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '4px', background: '#f9f9f9' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>識別番号と支部設定</h3>
          {branches.map((branch, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
              <input type="text" value={branch.id} onChange={(e) => updateBranch(index, 'id', e.target.value)} placeholder="識別番号 (例: 1-1)" style={{ flex: 1, padding: '8px', boxSizing: 'border-box' }} />
              <input type="text" value={branch.name} onChange={(e) => updateBranch(index, 'name', e.target.value)} placeholder="支部名" style={{ flex: 2, padding: '8px', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => removeBranch(index)} style={{ padding: '8px', color: 'red', cursor: 'pointer' }}>削除</button>
            </div>
          ))}
          <button type="button" onClick={addBranch} style={{ padding: '8px 16px', cursor: 'pointer' }}>+ 識別番号を追加</button>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        <button type="submit" disabled={saving} style={{ padding: '12px', fontSize: '16px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
          {saving ? '保存中...' : '変更を保存する'}
        </button>
      </form>
    </div>
  );
}