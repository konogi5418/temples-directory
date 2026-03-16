import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Branch { id: string; name: string; }
interface Temple { id: string; name: string; region: string; postal_code: string; address: string; phone: string; fax: string; priest_name: string; is_church: boolean; branches: Branch[]; }
interface Department { id: string; name: string; phone: string; ip_phone: string; fax: string; extension: string; sort_order: number; }

export default function DirectoryHome() {
  const [groupedTemples, setGroupedTemples] = useState<Record<string, Temple[]>>({});
  const [sortedRegions, setSortedRegions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // --- 更新日用のState ---
  const [lastUpdated, setLastUpdated] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // --- 寺院、部署、更新日のデータを並行して取得 ---
        const [templesRes, deptsRes, settingsRes] = await Promise.all([
          supabase.from('temples').select('*'),
          supabase.from('departments').select('*').order('sort_order', { ascending: true }),
          supabase.from('app_settings').select('value').eq('key', 'last_updated').single()
        ]);

        if (templesRes.error) throw templesRes.error;
        if (deptsRes.error) throw deptsRes.error;
        // 設定データが見つかればセット
        if (settingsRes.data) setLastUpdated(settingsRes.data.value);

        const sortedData = (templesRes.data || []).sort((a, b) => {
          const idA = a.branches && a.branches.length > 0 ? a.branches[0].id : '9999';
          const idB = b.branches && b.branches.length > 0 ? b.branches[0].id : '9999';
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });

        const grouped = sortedData.reduce((acc: Record<string, Temple[]>, temple) => {
          const region = temple.region ? temple.region.trim() : '（布教区未設定）';
          if (!acc[region]) acc[region] = [];
          acc[region].push(temple);
          return acc;
        }, {});

        const regionsOrder = Object.keys(grouped).sort((regionA, regionB) => {
          if (regionA === '（布教区未設定）') return 1;
          if (regionB === '（布教区未設定）') return -1;
          const idA = grouped[regionA][0].branches?.[0]?.id || '9999';
          const idB = grouped[regionB][0].branches?.[0]?.id || '9999';
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });

        setGroupedTemples(grouped);
        setSortedRegions(regionsOrder);
        setDepartments(deptsRes.data || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>;

  const lowerQuery = searchQuery.toLowerCase();
  const isSearching = searchQuery.trim() !== '';

  const filteredDepartments = departments.filter(dept => {
    if (!isSearching) return true;
    return (
      (dept.name && dept.name.toLowerCase().includes(lowerQuery)) ||
      (dept.phone && dept.phone.includes(lowerQuery)) ||
      (dept.ip_phone && dept.ip_phone.includes(lowerQuery)) ||
      (dept.extension && dept.extension.includes(lowerQuery))
    );
  });

  // 日付のフォーマット（2026-03-16 を 2026年3月16日 に変換）
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>日蓮正宗寺院名簿</h1>
        {/* --- 更新日の表示 --- */}
        {lastUpdated && (
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>
            現在の最新版：{formatDate(lastUpdated)} 更新
          </span>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <input
          type="text"
          placeholder="寺院名、部署名、住所、電話番号などで検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>

      {filteredDepartments.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <details open={isSearching} style={{ background: '#fff', border: '2px solid #0056b3', borderRadius: '8px', overflow: 'hidden' }}>
            <summary style={{ padding: '15px', background: '#e6f2ff', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0056b3' }}>
              <span>総本山 部署一覧</span>
              <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
                ({filteredDepartments.length}件) ▼
              </span>
            </summary>
            
            <div style={{ padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', background: '#fafafa' }}>
              {filteredDepartments.map(dept => (
                <div key={dept.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#000' }}>{dept.name}</h3>
                  <div style={{ fontSize: '15px', lineHeight: '1.6' }}>
                    {dept.phone && <p style={{ margin: '4px 0' }}><strong>外線:</strong> <a href={`tel:${dept.phone}`} style={{ color: '#0066cc', textDecoration: 'underline' }}>{dept.phone}</a></p>}
                    {dept.ip_phone && <p style={{ margin: '4px 0' }}><strong>IP電話:</strong> <a href={`tel:${dept.ip_phone}`} style={{ color: '#0066cc', textDecoration: 'underline' }}>{dept.ip_phone}</a></p>}
                    {(dept.fax || dept.extension) && (
                      <p style={{ margin: '4px 0', display: 'flex', gap: '15px' }}>
                        {dept.fax && <span><strong>FAX:</strong> {dept.fax}</span>}
                        {dept.extension && <span><strong>内線:</strong> {dept.extension}</span>}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      <h2 style={{ fontSize: '20px', borderBottom: '2px solid #555', paddingBottom: '8px', marginBottom: '15px', color: '#333' }}>
        寺院・教会一覧
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sortedRegions.map(region => {
          const temples = groupedTemples[region];
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

          if (isSearching && filteredTemples.length === 0) return null;

          return (
            <details key={region} open={isSearching} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <summary style={{ padding: '15px', background: '#e3f2fd', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{region}</span>
                <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#555' }}>
                  ({filteredTemples.length}件) ▼
                </span>
              </summary>
              
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
                      <p style={{ margin: '0 0 8px 0' }}>
                        <strong>住所:</strong> 〒{temple.postal_code}{' '}
                        {temple.address ? (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(temple.address)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>
                            {temple.address}
                          </a>
                        ) : ('')}
                      </p>
                      <p style={{ margin: '0 0 8px 0' }}>
                        <strong>電話:</strong>{' '}
                        {temple.phone ? (<a href={`tel:${temple.phone}`} style={{ color: '#0066cc', textDecoration: 'underline' }}>{temple.phone}</a>) : ('（未登録）')}{' '}
                        / <strong>FAX:</strong> {temple.fax || '（未登録）'}
                      </p>
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