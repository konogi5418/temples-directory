import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SharedLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 環境変数に設定した共通パスワードと照合
    const correctPassword = import.meta.env.VITE_APP_SHARED_PASSWORD;

    if (password === correctPassword) {
      // 認証成功時、セッションストレージにフラグを保存して一覧画面へ遷移
      sessionStorage.setItem('isAuthenticated', 'true');
      navigate('/');
    } else {
      // 認証失敗時
      setError('パスワードが間違っています。');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>名簿システム ログイン</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワードを入力"
          style={{ padding: '8px', fontSize: '16px' }}
        />
        <button type="submit" style={{ padding: '8px', fontSize: '16px', cursor: 'pointer' }}>
          ログイン
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
