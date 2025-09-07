# -*- coding: utf-8 -*-
import json
import os
from typing import Dict, List, Any
from datetime import datetime
import functions_framework
from google.cloud import aiplatform
from flask import Request
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Vertex AI
PROJECT_ID = os.environ.get('GOOGLE_CLOUD_PROJECT')
LOCATION = os.environ.get('LOCATION', 'asia-northeast1')

def initialize_vertex_ai():
    """Initialize Vertex AI client"""
    try:
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        logger.info(f"Vertex AI initialized with project: {PROJECT_ID}, location: {LOCATION}")
    except Exception as e:
        logger.error(f"Failed to initialize Vertex AI: {str(e)}")
        raise

@functions_framework.http
def restaurant_agent(request: Request):
    """
    Cloud Function entry point for restaurant recommendation agent
    
    Expected request body:
    {
        "latitude": float,
        "longitude": float,
        "date": "YYYY-MM-DD"
    }
    
    Returns:
    {
        "lunch_restaurants": [{"link": "...", "reason": "..."}],
        "dinner_restaurants": [{"link": "...", "reason": "..."}]
    }
    """
    
    # Handle CORS
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    headers = {'Access-Control-Allow-Origin': '*'}
    
    try:
        # Validate request method
        if request.method != 'POST':
            return json.dumps({'error': 'Method not allowed'}), 405, headers
        
        # Parse request body
        request_json = request.get_json(silent=True)
        if not request_json:
            return json.dumps({'error': 'Invalid JSON body'}), 400, headers
        
        # Validate required fields
        required_fields = ['latitude', 'longitude', 'date']
        for field in required_fields:
            if field not in request_json:
                return json.dumps({'error': f'Missing required field: {field}'}), 400, headers
        
        latitude = request_json['latitude']
        longitude = request_json['longitude']
        date = request_json['date']
        
        # Validate data types
        if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
            return json.dumps({'error': 'Latitude and longitude must be numbers'}), 400, headers
        
        if not isinstance(date, str):
            return json.dumps({'error': 'Date must be a string'}), 400, headers
        
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return json.dumps({'error': 'Date must be in YYYY-MM-DD format'}), 400, headers
        
        logger.info(f"Processing request for location: ({latitude}, {longitude}), date: {date}")
        
        # Initialize Vertex AI
        initialize_vertex_ai()
        
        # Get restaurant recommendations
        recommendations = get_restaurant_recommendations(latitude, longitude, date)
        
        return json.dumps(recommendations, ensure_ascii=False), 200, headers
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return json.dumps({'error': 'Internal server error'}), 500, headers

def get_restaurant_recommendations(latitude: float, longitude: float, date: str) -> Dict[str, List[Dict[str, str]]]:
    """
    Get restaurant recommendations using Vertex AI
    """
    try:
        # Create prompt for the AI model
        prompt = create_restaurant_prompt(latitude, longitude, date)
        
        # Call Vertex AI model
        response = call_vertex_ai_model(prompt)
        
        # Parse and format response
        recommendations = parse_ai_response(response)
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        # Return fallback recommendations
        return get_fallback_recommendations(latitude, longitude, date)

def create_restaurant_prompt(latitude: float, longitude: float, date: str) -> str:
    """Create prompt for restaurant recommendation"""
    
    # Determine day of week for better recommendations
    try:
        date_obj = datetime.strptime(date, '%Y-%m-%d')
        day_of_week = date_obj.strftime('%A')
        is_weekend = day_of_week in ['Saturday', 'Sunday']
    except:
        day_of_week = "Unknown"
        is_weekend = False
    
    prompt = f"""
You are a Japanese restaurant recommendation expert. Please provide lunch and dinner restaurant recommendations based on the following conditions.

Conditions:
- Latitude: {latitude}
- Longitude: {longitude} 
- Date: {date} ({day_of_week})
- Weekend: {'Yes' if is_weekend else 'No'}

Please respond in the following JSON format (use Japanese for reasons):

{{
    "lunch_restaurants": [
        {{
            "link": "Restaurant official website or Tabelog URL",
            "reason": "推薦理由をここに日本語で記載（アクセス、料理の特徴、価格帯、雰囲気など）"
        }},
        {{
            "link": "Restaurant official website or Tabelog URL", 
            "reason": "推薦理由をここに日本語で記載"
        }}
    ],
    "dinner_restaurants": [
        {{
            "link": "Restaurant official website or Tabelog URL",
            "reason": "推薦理由をここに日本語で記載（アクセス、料理の特徴、価格帯、雰囲気など）"
        }},
        {{
            "link": "Restaurant official website or Tabelog URL",
            "reason": "推薦理由をここに日本語で記載"
        }}
    ]
}}

Considerations for recommendations:
1. Restaurants within walking distance or with good transportation access from the specified location
2. Operating hours that match the specified date and day of the week
3. Lunch should be casual and reasonably priced, dinner should be more special
4. Provide URLs of actual existing restaurants
5. Provide specific and useful recommendation reasons for each restaurant in Japanese
"""
    
    return prompt

def call_vertex_ai_model(prompt: str) -> str:
    """Call Vertex AI model for text generation"""
    try:
        from vertexai.generative_models import GenerativeModel
        
        # Initialize the model
        model = GenerativeModel("gemini-1.5-flash")
        
        # Generate response
        response = model.generate_content(prompt)
        
        return response.text if response.text else ""
        
    except Exception as e:
        logger.error(f"Error calling Vertex AI model: {str(e)}")
        raise

def parse_ai_response(response: str) -> Dict[str, List[Dict[str, str]]]:
    """Parse AI response and extract restaurant recommendations"""
    try:
        # Try to find JSON in the response
        start_idx = response.find('{')
        end_idx = response.rfind('}') + 1
        
        if start_idx != -1 and end_idx != -1:
            json_str = response[start_idx:end_idx]
            recommendations = json.loads(json_str)
            
            # Validate structure
            if 'lunch_restaurants' in recommendations and 'dinner_restaurants' in recommendations:
                return recommendations
        
        # If parsing fails, return empty structure
        logger.warning("Failed to parse AI response, returning empty recommendations")
        return {"lunch_restaurants": [], "dinner_restaurants": []}
        
    except Exception as e:
        logger.error(f"Error parsing AI response: {str(e)}")
        return {"lunch_restaurants": [], "dinner_restaurants": []}

def get_fallback_recommendations(latitude: float, longitude: float, date: str) -> Dict[str, List[Dict[str, str]]]:
    """Fallback recommendations when AI fails"""
    logger.info("Using fallback recommendations")
    
    return {
        "lunch_restaurants": [
            {
                "link": "https://tabelog.com/",
                "reason": f"緯度{latitude}、経度{longitude}付近で営業中のランチスポットです。アクセスが良く、手頃な価格でお食事を楽しめます。"
            },
            {
                "link": "https://gurunavi.com/",
                "reason": "地域の人気ランチスポットです。新鮮な食材を使った健康的なメニューが特徴です。"
            }
        ],
        "dinner_restaurants": [
            {
                "link": "https://tabelog.com/",
                "reason": f"{date}の夜にふさわしい雰囲気の良いレストランです。特別な日のお食事に最適です。"
            },
            {
                "link": "https://gurunavi.com/", 
                "reason": "地元の食材を活かした創作料理が楽しめる人気のディナースポットです。"
            }
        ]
    }