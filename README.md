# Search Restaurant Agent

Next.jsで構築されたレストラン検索アプリケーションです。

## Google Cloud Runへのデプロイ手順

### 前提条件

1. Google Cloud Platform (GCP) アカウントの作成
2. Google Cloud CLI のインストールと認証
3. Docker のインストール（手動デプロイの場合）
4. 以下のAPIの有効化：
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API

### 環境準備

```bash
# 1. Google Cloud CLIの認証
gcloud auth login

# 2. プロジェクトIDの設定（YOUR_PROJECT_IDを実際のプロジェクトIDに置き換え）
gcloud config set project YOUR_PROJECT_ID

# 3. 設定の確認
gcloud config get-value project

# 4. 必要なAPIの有効化（deploy.shスクリプトが自動で実行するため任意）
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### PROJECT_IDについて

- **Cloud Build使用時**: `$PROJECT_ID`は自動的に現在のプロジェクトIDに設定されます
- **手動デプロイ時**: 以下の優先順位でプロジェクトIDが決定されます
  1. `./deploy.sh PROJECT_ID` - コマンドライン引数で指定
  2. `gcloud config get-value project` - デフォルトプロジェクト設定

### デプロイ方法

#### 方法1: 自動デプロイスクリプト使用（推奨）

```bash
# appディレクトリに移動
cd app

# 実行権限を付与（初回のみ）
chmod +x deploy.sh

# 方法A: デフォルトプロジェクトを使用（推奨）
./deploy.sh

# 方法B: プロジェクトIDを明示的に指定
./deploy.sh YOUR_PROJECT_ID
```

**注意**: 事前に`gcloud config set project`でプロジェクトを設定することを推奨します。

#### 方法2: Cloud Buildを使用したCI/CDデプロイ

```bash
# appディレクトリに移動
cd app

# Cloud Buildでビルド・デプロイ（プロジェクトIDは自動設定）
gcloud builds submit --config=cloudbuild.yaml .
```

**注意**: Cloud Buildでは現在設定されているプロジェクトが自動的に使用されます。

#### 方法3: 手動デプロイ

```bash
# appディレクトリに移動
cd app

# プロジェクトIDを環境変数に設定
export PROJECT_ID=$(gcloud config get-value project)

# Artifact Registry認証設定
gcloud auth configure-docker asia-northeast1-docker.pkg.dev

# Dockerイメージのビルド
docker build -t asia-northeast1-docker.pkg.dev/$PROJECT_ID/search-restaurant-agent/app:latest .

# Artifact Registryにプッシュ
docker push asia-northeast1-docker.pkg.dev/$PROJECT_ID/search-restaurant-agent/app:latest

# Cloud Runにデプロイ
gcloud run deploy search-restaurant-agent \
  --image asia-northeast1-docker.pkg.dev/$PROJECT_ID/search-restaurant-agent/app:latest \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 100 \
  --timeout 300 \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,VERTEX_AI_PROJECT_ID=$PROJECT_ID,VERTEX_AI_LOCATION=asia-northeast1"
```

**注意**: `export PROJECT_ID=$(gcloud config get-value project)`でプロジェクトIDを取得しています。

### デプロイ設定の詳細

- **リージョン**: asia-northeast1（東京）
- **メモリ**: 1GB
- **CPU**: 1 vCPU
- **ポート**: 3000
- **タイムアウト**: 300秒
- **最小インスタンス数**: 0（コールドスタート有効）
- **最大インスタンス数**: 100
- **認証**: なし（パブリックアクセス可能）
- **イメージレジストリ**: Artifact Registry

### 環境変数

#### 自動で設定される環境変数：
- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- `VERTEX_AI_PROJECT_ID` - デプロイ時に現在のプロジェクトIDが自動設定
- `VERTEX_AI_LOCATION=asia-northeast1`

#### 実際のVertex AIエージェントを使用する場合の追加環境変数：
- `VERTEX_AI_AGENT_ID` - Vertex AIで作成したエージェントのID

```bash
# Vertex AIエージェントIDを追加設定する場合
gcloud run services update search-restaurant-agent \
  --region asia-northeast1 \
  --set-env-vars="VERTEX_AI_AGENT_ID=your-agent-id"
```

#### その他のカスタム環境変数：

```bash
gcloud run services update search-restaurant-agent \
  --region asia-northeast1 \
  --set-env-vars="CUSTOM_VAR=value"
```

### ヘルスチェック

アプリケーションには `/api/health` エンドポイントが用意されています。

```bash
# デプロイ後にヘルスチェックを実行
curl https://your-service-url.run.app/api/health
```

### ログの確認

```bash
# Cloud Runのログを表示
gcloud logs read --service=search-restaurant-agent --region=asia-northeast1

# リアルタイムでログを監視
gcloud logs tail --service=search-restaurant-agent --region=asia-northeast1
```

### カスタムドメインの設定

```bash
# カスタムドメインをマッピング
gcloud run domain-mappings create \
  --service search-restaurant-agent \
  --domain your-domain.com \
  --region asia-northeast1
```

### トラブルシューティング

#### よくある問題

1. **API が有効化されていない**
   ```bash
   # 必要なAPIを有効化
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```

2. **権限が不足している**
   ```bash
   # Cloud Run Admin ロールを付与
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="user:your-email@example.com" \
     --role="roles/run.admin"
   ```

3. **Artifact Registry の認証エラー**
   ```bash
   # Docker認証を再設定
   gcloud auth configure-docker asia-northeast1-docker.pkg.dev
   ```

## ローカル開発

```bash
# 依存関係のインストール
cd app
npm install

# 開発サーバーの起動
npm run dev
```

## プロジェクト構成

```
app/
├── src/app/              # Next.js App Router
│   ├── api/              # API Routes
│   │   ├── health/       # ヘルスチェックエンドポイント
│   │   └── restaurants/  # レストラン検索API
│   ├── globals.css       # グローバルスタイル
│   ├── layout.tsx        # ルートレイアウト
│   └── page.tsx          # メインページ
├── types/                # TypeScript型定義
│   └── restaurant.ts     # レストラン関連の型
├── public/               # 静的ファイル
├── Dockerfile           # Docker設定
├── cloudbuild.yaml      # Cloud Build設定（Artifact Registry対応）
├── deploy.sh            # 手動デプロイスクリプト
├── .env.example         # 環境変数の例
├── .gcloudignore       # デプロイ時の除外ファイル
├── package.json        # Node.js依存関係
└── next.config.ts      # Next.js設定（standalone出力）
```

## デプロイ後の確認

デプロイが完了すると、Cloud RunサービスのURLが表示されます。ブラウザでアクセスしてアプリケーションが正常に動作することを確認してください。