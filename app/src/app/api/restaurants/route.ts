import { NextRequest, NextResponse } from 'next/server';
import { LocationRequest, RestaurantResponse } from '../../../../types/restaurant';

// Environment variables for AI Agent service
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8080';
const AI_AGENT_TIMEOUT = parseInt(process.env.AI_AGENT_TIMEOUT || '30000');

interface AIAgentRequest {
  latitude: number;
  longitude: number;
  date: string;
}

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

    console.log('Calling AI Agent with:', {
      latitude: body.location.latitude,
      longitude: body.location.longitude,
      date: body.date
    });

    // Call AI Agent service
    try {
      const response = await callAIAgent({
        latitude: body.location.latitude,
        longitude: body.location.longitude,
        date: body.date
      });
      
      return NextResponse.json(response);
      
    } catch (aiError) {
      console.error('AI Agent call failed:', aiError);
      
      // Return error instead of fallback
      return NextResponse.json(
        { error: 'AIエージェントサービスに接続できませんでした。しばらく時間をおいてから再度お試しください。' },
        { status: 503 }
      );
    }
    
  } catch (error) {
    console.error('Error processing restaurant request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function callAIAgent(request: AIAgentRequest): Promise<RestaurantResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_AGENT_TIMEOUT);
  
  try {
    const response = await fetch(`${AI_AGENT_URL}/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Agent responded with status ${response.status}: ${errorText}`);
    }
    
    const data: RestaurantResponse = await response.json();
    
    // Validate response structure
    if (!data.lunch_restaurants || !data.dinner_restaurants) {
      throw new Error('Invalid response format from AI Agent');
    }
    
    return data;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('AI Agent request timed out');
      }
      throw error;
    }
    
    throw new Error('Unknown error calling AI Agent');
  }
}