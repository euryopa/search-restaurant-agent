# Search Restaurant Agent

Next.jsで構築されたレストラン検索アプリケーションです。

## Google Cloud Runへのデプロイ手順

### 前提条件

1. Google Cloud Platform (GCP) アカウントの作成
2. Google Cloud CLI のインストールと認証
3. 以下のAPIの有効化：
   - Cloud Run API
   - Cloud Build API
   - Container Registry API

### 環境準備

```bash
# Google Cloud CLIの認証
gcloud auth login

# プロジェクトIDの設定（YOUR_PROJECT_IDを実際のプロジェクトIDに置き換え）
export PROJECT_ID=YOUR_PROJECT_ID
gcloud config set project $PROJECT_ID

# 必要なAPIの有効化
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### デプロイ方法

#### 方法1: Cloud Buildを使用したCI/CDデプロイ（推奨）

```bash
# appディレクトリに移動
cd app

# Cloud Buildでビルド・デプロイ
gcloud builds submit --config=cloudbuild.yaml .
```

#### 方法2: 手動デプロイ

```bash
# appディレクトリに移動
cd app

# Dockerイメージのビルド
docker build -t gcr.io/$PROJECT_ID/search-restaurant-agent .

# Container Registryにプッシュ
docker push gcr.io/$PROJECT_ID/search-restaurant-agent

# Cloud Runにデプロイ
gcloud run deploy search-restaurant-agent \
  --image gcr.io/$PROJECT_ID/search-restaurant-agent \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 100
```

### デプロイ設定の詳細

- **リージョン**: asia-northeast1（東京）
- **メモリ**: 1GB
- **CPU**: 1 vCPU
- **ポート**: 3000
- **最小インスタンス数**: 0（コールドスタート有効）
- **最大インスタンス数**: 100
- **認証**: なし（パブリックアクセス可能）

### 環境変数の設定

本番環境で環境変数が必要な場合：

```bash
gcloud run services update search-restaurant-agent \
  --region asia-northeast1 \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1"
```

### ログの確認

```bash
# Cloud Runのログを表示
gcloud logs read --service=search-restaurant-agent --region=asia-northeast1
```

### カスタムドメインの設定

```bash
# カスタムドメインをマッピング
gcloud run domain-mappings create \
  --service search-restaurant-agent \
  --domain your-domain.com \
  --region asia-northeast1
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
├── public/               # 静的ファイル
├── Dockerfile           # Docker設定
├── cloudbuild.yaml      # Cloud Build設定
├── .gcloudignore       # デプロイ時の除外ファイル
├── package.json        # Node.js依存関係
└── next.config.ts      # Next.js設定（standalone出力）
```

## デプロイ後の確認

デプロイが完了すると、Cloud RunサービスのURLが表示されます。ブラウザでアクセスしてアプリケーションが正常に動作することを確認してください。