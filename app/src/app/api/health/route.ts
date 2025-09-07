import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      deployment: {
        platform: process.env.PLATFORM || 'unknown',
        region: process.env.VERTEX_AI_LOCATION || 'unknown',
        projectId: process.env.VERTEX_AI_PROJECT_ID || 'unknown'
      },
      system: {
        nodeVersion: process.version,
        arch: process.arch,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      services: {
        database: 'ok',
        externalApis: 'ok'
      }
    };

    console.log('Health check successful:', {
      timestamp: healthCheck.timestamp,
      environment: healthCheck.environment,
      uptime: healthCheck.uptime
    });

    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}