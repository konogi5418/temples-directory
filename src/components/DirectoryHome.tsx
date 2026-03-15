import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Branch {
  id: string;
  name: string;
}

interface Temple {
  id: string;
  name: string;
  region: string;
  postal_code: string;
  address: string;
  phone: string;
  fax: string;
  priest_name: string;
  is_church: boolean;
  branches: Branch[];
}

export default function DirectoryHome() {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 検索用のStateを追加
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  useEffect(() => {
    const fetchTemples = async () => {
      try {
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

    fetchTemples();
  }, []);

  // 取得したデータから、存在する地域（布教区など）の重複のないリストを生成
  const uniqueRegions = Array.from(new Set(temples.map((t) => t.region))).filter(Boolean);

  // 検索条件に基づくデータのフィルタリング処理
  const filteredTemples = temples.filter((temple) => {
    // 1. 地域の判定
    const matchRegion = selectedRegion === '' || temple.region === selectedRegion;

    // 2. フリーワードの判定（大文字・小文字を区別せず比較）
    const lowerQuery = searchQuery.toLowerCase();
    const matchQuery =
      searchQuery === '' ||
      (temple.name && temple.name.toLowerCase().includes(lowerQuery)) ||
      (temple.address && temple.address.toLowerCase().includes(lowerQuery)) ||
      (temple.priest_name && temple.priest_name.toLowerCase().includes(lowerQuery)) ||
      (temple.phone && temple.phone.includes(lowerQuery)) ||
      // 識別番号（1-1など）や支部名も検索対象に含める
      (temple.branches &&
        temple.branches.some(
          (b) => b.id.toLowerCase().includes(lowerQuery) || b.name.toLowerCase().includes(lowerQuery)
        ));

    return matchRegion && matchQuery;
  });

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>日蓮正宗寺院名簿</h1>

      {/* 検索フォームエリア */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="寺院名、住職名、住所、識別番号(1-1等)で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: '1 1 300px', padding: '8px', fontSize: '16px' }}
          />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={{ padding: '8px', fontSize: '16px' }}
          >
            <option value="">すべての布教区</option>
            {uniqueRegions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
          該当件数: {filteredTemples.length} 件
        </div>
      </div>
      
      {/* 検索結果（一覧）エリア */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredTemples.map((temple) => (
          <div key={temple.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <h2 style={{ margin: 0 }}>{temple.name}</h2>
              {temple.is_church && (
                <span style={{ background: '#eee', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em' }}>教会</span>
              )}
            </div>

            <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {temple.branches && temple.branches.map((branch, index) => (
                <span key={index} style={{ background: '#e0f7fa', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9em', border: '1px solid #b2ebf2' }}>
                  [{branch.id}] {branch.name}
                </span>
              ))}
            </div>

            <div style={{ fontSize: '0.95em', lineHeight: '1.6' }}>
              <p style={{ margin: 0 }}><strong>布教区:</strong> {temple.region}</p>
              <p style={{ margin: 0 }}><strong>住所:</strong> 〒{temple.postal_code} {temple.address}</p>
              <p style={{ margin: 0 }}><strong>電話:</strong> {temple.phone} / <strong>FAX:</strong> {temple.fax}</p>
              <p style={{ margin: 0 }}><strong>住職:</strong> {temple.priest_name}</p>
            </div>
          </div>
        ))}
        
        {filteredTemples.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666' }}>該当する寺院が見つかりません。</p>
        )}
      </div>
    </div>
  );
}
