# 初めに
Google CloudeのADKを使ってAIエージェントを開発したいです。

# 要件
緯度・経度と日付を入力として、その日のランチとディナーのおすすめのレストランを返すエージェントを作成してください。

APPと別のCloud Functionで作成してください。そして、APPに渡すエンドポイントとしてCloud Functionのエンドポイントを作成してください。さらに、そのCloud Functionのエンドポイントには緯度・経度と日付を入力として、その日のランチとディナーのおすすめのレストランを返すエージェントを作成してください。

# 出力
```json
{
    "lunch_restaurants": [
            {
                "link": "",
                "reason": ""
            }, ...
    ],
    "dinner_restaurants":[
        {
            "link": "",
            reason: ""
        }, ...
    ]
}
```