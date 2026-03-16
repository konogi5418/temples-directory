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
  const [groupedTemples, setGroupedTemples] = useState<Record<string, Temple[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTemples = async () => {
      try {
        const { data, error } = await supabase.from('temples').select('*');
        if (error) throw error;

        // 布教区順 → 識別番号順にソート
        const sortedData = (data || []).sort((a, b) => {
          if (a.region !== b.region) {
            return (a.region || '').localeCompare(b.region || '', 'ja');
          }
          const idA = a.branches && a.branches.length > 0 ? a.branches[0].id : '';
          const idB = b.branches && b.branches.length > 0 ? b.branches[0].id : '';
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // 取得したデータを布教区ごとにグループ化する
        const grouped = sortedData.reduce((acc: Record<string, Temple[]>, temple) => {
          // 空白レコードの場合は「未設定」グループに入れる
          const region = temple.region ? temple.region.trim() : '（布教区未設定）';
          if (!acc[region]) acc[region] = [];
          acc[region].push(temple);
          return acc;
        }, {});

        setGroupedTemples(grouped);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemples();
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>;

  const lowerQuery = searchQuery.toLowerCase();
  const isSearching = searchQuery.trim() !== '';

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>日蓮正宗寺院名簿</h1>

      {/* 検索フォーム */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <input
          type="text"
          placeholder="寺院名、住職名、住所、識別番号(1-1等)で検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>

      {/* 布教区ごとのアコーディオン表示 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Object.entries(groupedTemples).map(([region, temples]) => {
          
          // 検索語がある場合、条件に一致する寺院のみに絞り込む
          const filteredTemples = temples.filter(temple => {
            if (!isSearching) return true;
            return (
              (temple.name && temple.name.toLowerCase().includes(lowerQuery)) ||
              (temple.address && temple.address.toLowerCase().includes(lowerQuery)) ||
              (temple.priest_name && temple.priest_name.toLowerCase().includes(lowerQuery)) ||
              (temple.phone && temple.phone.includes(lowerQuery)) ||
              (temple.branches && temple.branches.some(b => b.id.toLowerCase().includes(lowerQuery) || b.name.toLowerCase().includes(lowerQuery)))
            );
          });

          // 検索時にその布教区に該当寺院が0件の場合は、布教区自体を非表示にする
          if (isSearching && filteredTemples.length === 0) return null;

          return (
            // detailsタグに open={isSearching} を付与することで、検索中は自動で展開される
            <details key={region} open={isSearching} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <summary style={{ padding: '15px', background: '#e3f2fd', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{region}</span>
                <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#555' }}>
                  ({filteredTemples.length}件) ▼
                </span>
              </summary>
              
              {/* 展開される寺院一覧 */}
              <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', background: '#fafafa' }}>
                {filteredTemples.map(temple => (
                  <div key={temple.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <h2 style={{ margin: 0, fontSize: '20px' }}>{temple.name || '（名称未設定）'}</h2>
                      {temple.is_church && <span style={{ background: '#eee', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em' }}>教会</span>}
                    </div>

                    <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {temple.branches && temple.branches.map((branch, index) => (
                        <span key={index} style={{ background: '#e0f7fa', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9em', border: '1px solid #b2ebf2' }}>
                          [{branch.id}] {branch.name}
                        </span>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.95em', lineHeight: '1.6' }}>
                      <p style={{ margin: 0 }}><strong>住所:</strong> 〒{temple.postal_code} {temple.address}</p>
                      <p style={{ margin: 0 }}><strong>電話:</strong> {temple.phone} / <strong>FAX:</strong> {temple.fax}</p>
                      <p style={{ margin: 0 }}><strong>住職:</strong> {temple.priest_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}