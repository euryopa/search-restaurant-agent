from google.adk.agents import LlmAgent
import json
from typing import Dict, List, Any
from datetime import datetime

# 位置情報検索エージェント: 緯度・経度から地域情報を取得
location_agent = LlmAgent(
    model='gemini-2.0-flash',
    name="LocationAgent",
    description="位置情報検索エージェント",
    instruction="""あなたは位置情報検索の専門エージェントです。
緯度・経度の情報から、その地域の詳細情報（住所、地域名、近くの駅、周辺の特徴など）を提供します。
常に正確で詳細な地域情報を日本語で返してください。""")

# レストラン検索エージェント: 地域とタイプに基づいてレストランを検索
restaurant_search_agent = LlmAgent(
    model='gemini-2.0-flash',
    name="RestaurantSearchAgent", 
    description="レストラン検索エージェント",
    instruction="""あなたはレストラン検索の専門エージェントです。
指定された地域、日付、食事タイプ（ランチ/ディナー）に基づいて、
最適なレストランを検索し、具体的なリンクと推薦理由を提供します。
実在するレストランの公式サイトやTabelog、ぐるなびなどのURLを提供してください。""")

# レストラン推薦エージェント: メインのコーディネーターエージェント（root_agentとして使用）
root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name="RestaurantRecommendationAgent",
    description="レストラン推薦システム",
    instruction="""あなたはレストラン推薦システムのメインエージェントです。
緯度・経度と日付を受け取り、その日のランチとディナーのおすすめレストランを返します。

以下のプロセスに従って動作してください：
1. LocationAgentを使用して位置情報から地域情報を取得
2. RestaurantSearchAgentを使用してランチ向けレストランを検索
3. RestaurantSearchAgentを使用してディナー向けレストランを検索
4. 結果を以下のJSON形式で出力

出力形式：
{
    "lunch_restaurants": [
        {
            "link": "レストランの公式サイトまたはTabelog等のURL",
            "reason": "推薦理由（アクセス、料理の特徴、価格帯、雰囲気など）"
        }
    ],
    "dinner_restaurants": [
        {
            "link": "レストランの公式サイトまたはTabelog等のURL", 
            "reason": "推薦理由（アクセス、料理の特徴、価格帯、雰囲気など）"
        }
    ]
}

推薦時の考慮事項：
- 指定された位置から徒歩圏内または交通アクセスの良いレストラン
- 指定された日付・曜日の営業時間に適合するレストラン
- ランチは手軽で手頃な価格帯、ディナーは特別感のあるレストラン
- 実在するレストランの正確なURLを提供
- 各レストランの具体的で有用な推薦理由を日本語で提供
""",
    sub_agents=[location_agent, restaurant_search_agent]
)

# 互換性のためのエイリアス
restaurant_recommendation_agent = root_agent

def get_restaurant_recommendations(latitude: float, longitude: float, date: str) -> Dict[str, List[Dict[str, str]]]:
    """
    レストラン推薦を取得するメイン関数
    
    Args:
        latitude: 緯度
        longitude: 経度  
        date: 日付 (YYYY-MM-DD形式)
        
    Returns:
        レストラン推薦結果のJSON形式辞書
    """
    try:
        # 日付から曜日情報を取得
        date_obj = datetime.strptime(date, '%Y-%m-%d')
        day_of_week = date_obj.strftime('%A')
        is_weekend = day_of_week in ['Saturday', 'Sunday']
        
        # エージェントにクエリを送信
        query = f"""
        緯度{latitude}、経度{longitude}の位置で、{date}（{day_of_week}）の
        ランチとディナーのレストラン推薦をお願いします。
        {'週末' if is_weekend else '平日'}であることを考慮してください。
        """
        
        # レストラン推薦エージェントを実行
        response = root_agent.run(query)
        
        # レスポンスからJSON部分を抽出
        return parse_agent_response(response)
        
    except Exception as e:
        # エラー時のフォールバック
        return {
            "lunch_restaurants": [
                {
                    "link": "https://tabelog.com/",
                    "reason": f"緯度{latitude}、経度{longitude}付近のランチスポットです。詳細な検索はTabelogをご利用ください。"
                }
            ],
            "dinner_restaurants": [
                {
                    "link": "https://tabelog.com/",
                    "reason": f"{date}のディナーにおすすめのレストランです。詳細な検索はTabelogをご利用ください。"
                }
            ]
        }

def parse_agent_response(response: str) -> Dict[str, List[Dict[str, str]]]:
    """エージェントのレスポンスからJSON形式のデータを抽出"""
    try:
        # JSON部分を抽出
        start_idx = response.find('{')
        end_idx = response.rfind('}') + 1
        
        if start_idx != -1 and end_idx != -1:
            json_str = response[start_idx:end_idx]
            result = json.loads(json_str)
            
            # 必要なキーが存在することを確認
            if 'lunch_restaurants' in result and 'dinner_restaurants' in result:
                return result
                
        # パースに失敗した場合は空の構造を返す
        return {"lunch_restaurants": [], "dinner_restaurants": []}
        
    except Exception:
        return {"lunch_restaurants": [], "dinner_restaurants": []}
