import { NextRequest, NextResponse } from 'next/server';
import { LocationRequest, RestaurantResponse } from '../../../types/restaurant';

export async function POST(request: NextRequest) {
  try {
    const body: LocationRequest = await request.json();
    
    // Validate request body
    if (!body.location || typeof body.location.latitude !== 'number' || typeof body.location.longitude !== 'number') {
      return NextResponse.json(
        { error: 'Invalid location data' },
        { status: 400 }
      );
    }
    
    if (!body.date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual Vertex AI Agent call
    // For now, return mock data
    const mockResponse: RestaurantResponse = {
      lunch_restaurants: [
        {
          link: "https://example.com/restaurant1",
          reason: "高評価のランチセットメニューが豊富で、アクセスが良い立地にあります。"
        },
        {
          link: "https://example.com/restaurant2", 
          reason: "新鮮な食材を使った健康的なメニューで、価格も手頃です。"
        }
      ],
      dinner_restaurants: [
        {
          link: "https://example.com/restaurant3",
          reason: "雰囲気の良い店内で、特別な日のディナーに最適です。"
        },
        {
          link: "https://example.com/restaurant4",
          reason: "地元の食材を活かした創作料理が楽しめる人気店です。"
        }
      ]
    };

    // Here you would implement the actual Vertex AI Agent call
    // const response = await callVertexAIAgent(body);
    
    return NextResponse.json(mockResponse);
    
  } catch (error) {
    console.error('Error processing restaurant request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// TODO: Implement actual Vertex AI Agent integration
async function callVertexAIAgent(request: LocationRequest): Promise<RestaurantResponse> {
  // This function will be implemented with actual Vertex AI Agent calls
  // For now, it's just a placeholder
  throw new Error('Not implemented');
}