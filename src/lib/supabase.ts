import { createClient } from '@supabase/supabase-js';

// .env.localから環境変数を読み込む
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 環境変数が設定されていない場合のエラーハンドリング
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabaseの環境変数が設定されていません。');
}

// データベース接続用のクライアントを作成してエクスポート
export const supabase = createClient(supabaseUrl, supabaseAnonKey);