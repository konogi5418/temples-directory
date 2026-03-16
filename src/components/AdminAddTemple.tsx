import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Branch { id: string; name: string; }

export default function AdminAddTemple() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', region: '', postal_code: '', address: '', phone: '', fax: '',
    priest_name: '', acting_priest: '', vice_priest: '', resident_priests: '',
    is_church: false, branches: [{ id: '', name: '' }] as Branch[]
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/admin/login');
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert('寺院・教会名は必須です');
    try {
      setLoading(true);
      const { error } = await supabase.from('temples').insert([formData]);
      if (error) throw error;
      alert('追加が完了しました。');
      navigate('/admin');
    } catch (err: any) { alert(`エラーが発生しました: ${err.message}`); } finally { setLoading(false); }
  };

  const handleBranchChange = (index: number, field: keyof Branch, value: string) => {
    const newBranches = [...formData.branches];
    newBranches[index] = { ...newBranches[index], [field]: value };
    setFormData({ ...formData, branches: newBranches });
  };
  const addBranch = () => setFormData({ ...formData, branches: [...formData.branches, { id: '', name: '' }] });
  const removeBranch = (index: number) => {
    const newBranches = formData.branches.filter((_, i) => i !== index);
    setFormData({ ...formData, branches: newBranches });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>新規データ追加</h2>
        <button onClick={() => navigate('/admin')} style={{ padding: '8px 16px', cursor: 'pointer' }}>戻る</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', cursor: 'pointer', background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
            <input type="checkbox" checked={formData.is_church} onChange={(e) => setFormData({ ...formData, is_church: e.target.checked })} style={{ transform: 'scale(1.2)' }} />
            この施設は「教会」である
          </label>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>布教区</label>
          <input type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="例: 北海道" />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>寺院・教会名 (必須)</label>
          <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>

        {/* 役職者の入力欄 */}
        <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '4px', border: '1px solid #b8daff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#004085' }}>役職者情報</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{formData.is_church ? '主管名' : '住職名'} (優先1)</label>
              <input type="text" value={formData.priest_name} onChange={e => setFormData({...formData, priest_name: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>代務者 (優先2)</label>
              <input type="text" value={formData.acting_priest} onChange={e => setFormData({...formData, acting_priest: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>副住職 (優先3)</label>
              <input type="text" value={formData.vice_priest} onChange={e => setFormData({...formData, vice_priest: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>在勤者 (優先4・複数可)</label>
              <input type="text" value={formData.resident_priests} onChange={e => setFormData({...formData, resident_priests: e.target.value})} placeholder="例: 山田太郎, 鈴木次郎" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>郵便番号</label>
            <input type="text" value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>住所</label>
          <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>電話番号</label>
            <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>FAX番号</label>
            <input type="text" value={formData.fax} onChange={e => setFormData({...formData, fax: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', border: '1px solid #ddd' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>識別番号・支部情報</label>
          {formData.branches.map((branch, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input type="text" placeholder="識別番号" value={branch.id} onChange={e => handleBranchChange(index, 'id', e.target.value)} style={{ flex: 1, padding: '8px' }} />
              <input type="text" placeholder="支部名" value={branch.name} onChange={e => handleBranchChange(index, 'name', e.target.value)} style={{ flex: 2, padding: '8px' }} />
              {formData.branches.length > 1 && (
                <button type="button" onClick={() => removeBranch(index)} style={{ padding: '8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>削除</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addBranch} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ 識別番号を追加</button>
        </div>

        <button type="submit" disabled={loading} style={{ padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
          {loading ? '保存中...' : 'データを登録する'}
        </button>
      </form>
    </div>
  );
}