# Search Restaurant Agent

レストラン検索・推薦システム - フロントエンド（Next.js）とバックエンド（Python FastAPI）を含む完全なアプリケーション

## アーキテクチャ

- **フロントエンド**: Next.js (TypeScript)
- **バックエンド**: Python FastAPI + AI Agent
- **インフラ**: Google Cloud Run (2つの独立したサービス)

## ローカル開発

### フロントエンド開発サーバー

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

[http://localhost:3000](http://localhost:3000) でフロントエンドにアクセス

### バックエンド開発サーバー

```bash
cd src/agents
pip install -r requirements.txt
python -m uvicorn multi_tool_agent.server:app --host 0.0.0.0 --port 8080 --reload
```

[http://localhost:8080/docs](http://localhost:8080/docs) でAPI ドキュメントにアクセス

## Google Cloud Run デプロイ

### 前提条件

1. Google Cloud Project を作成
2. `gcloud` CLI をインストール・認証済み
3. Docker Desktop がインストール済み
4. 必要なAPIを有効化（デプロイスクリプトが自動実行）:
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API
   - AI Platform API

### デプロイ方法

#### 1. 統合デプロイ（推奨）

フロントエンドとバックエンドを一括デプロイ:

```bash
./deploy-all.sh [PROJECT_ID]
```

デプロイ後のサービスURL:
- フロントエンド: `https://search-restaurant-agent-asia-northeast1.run.app`
- バックエンド: `https://restaurant-agent-asia-northeast1.run.app`

#### 2. 個別デプロイ

**バックエンドのみ**:
```bash
./deploy-agent.sh [PROJECT_ID]
```

**フロントエンドのみ**:
```bash
./deploy.sh [PROJECT_ID] [BACKEND_URL]
```

#### 3. Cloud Build使用

**フロントエンド**:
```bash
gcloud builds submit --config=cloudbuild.yaml
```

**バックエンド**:
```bash
gcloud builds submit --config=cloudbuild-agent.yaml
```

### サービス構成

#### フロントエンド（search-restaurant-agent）
- **イメージ**: Next.js
- **ポート**: 3000
- **リソース**: 1GB RAM, 1CPU
- **環境変数**:
  - `NODE_ENV=production`
  - `VERTEX_AI_PROJECT_ID=[PROJECT_ID]`
  - `NEXT_PUBLIC_API_URL=[BACKEND_URL]`

#### バックエンド（restaurant-agent）
- **イメージ**: Python FastAPI
- **ポート**: 8080
- **リソース**: 2GB RAM, 1CPU
- **環境変数**:
  - `GOOGLE_CLOUD_PROJECT=[PROJECT_ID]`
  - `LOCATION=asia-northeast1`

### ログ確認

```bash
# フロントエンドログ
gcloud logs read --service=search-restaurant-agent --region=asia-northeast1

# バックエンドログ
gcloud logs read --service=restaurant-agent --region=asia-northeast1
```

### ヘルスチェック

```bash
# フロントエンド
curl https://search-restaurant-agent-asia-northeast1.run.app

# バックエンド
curl https://restaurant-agent-asia-northeast1.run.app/health

# バックエンドAPI ドキュメント
open https://restaurant-agent-asia-northeast1.run.app/docs
```

## プロジェクト構造

```
app/
├── Dockerfile                 # フロントエンド用
├── Dockerfile.agent          # バックエンド用
├── cloudbuild.yaml           # フロントエンド用CI/CD
├── cloudbuild-agent.yaml     # バックエンド用CI/CD
├── deploy.sh                 # フロントエンドデプロイ
├── deploy-agent.sh           # バックエンドデプロイ
├── deploy-all.sh             # 統合デプロイ
├── src/
│   ├── app/                  # Next.js フロントエンド
│   └── agents/               # Python バックエンド
└── README.md
```
