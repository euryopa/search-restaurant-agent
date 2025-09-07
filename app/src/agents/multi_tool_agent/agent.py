from google.adk.agents import LlmAgent

# フライト エージェント: フライトの予約と情報に特化
flight_agent = LlmAgent(
    model='gemini-2.0-flash',
    name="FlightAgent",
    description="フライト予約エージェント",
    instruction=f"""あなたはフライト予約エージェントです... 常に有効な JSON を返します...""")

# ホテル エージェント: ホテルの予約と情報に特化
hotel_agent = LlmAgent(
    model='gemini-2.0-flash',
    name="HotelAgent",
    description="ホテル予約エージェント",
    instruction=f"""あなたはホテル予約エージェントです... 常に有効な JSON を返します...""")

# 観光エージェント: 観光のおすすめ情報を提供することに特化
sightseeing_agent = LlmAgent(
    model='gemini-2.0-flash',
    name="SightseeingAgent",
    description="観光情報エージェント",
    instruction=f"""あなたは観光情報エージェントです... 常に有効な JSON を返します...""")

# 旅行プランナーのコーディネーターとして機能するルート エージェント
root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name="TripPlanner",
    instruction=f"""
   全体をとりまとめる旅行プランナーとして機能します。
   - FlightAgent を使用してフライトを検索して予約する
   - HotelAgent を使用して宿泊施設を検索して予約する
   - SightSeeingAgent を使用して訪問する場所に関する情報を検索する
    ...
    """,
   sub_agents=[flight_agent, hotel_agent, sightseeing_agent] # コーディネーターがこれらのサブエージェントを管理する
)
