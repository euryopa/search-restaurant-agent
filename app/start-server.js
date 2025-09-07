#!/usr/bin/env node

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

console.log(`Starting Next.js server on ${hostname}:${port}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Working directory: ${process.cwd()}`);

// Check if standalone server.js exists
const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(process.cwd(), 'server.js');
if (fs.existsSync(serverJsPath)) {
  console.log('Using Next.js standalone server...');
  
  // Override environment variables to ensure proper binding
  process.env.PORT = port.toString();
  process.env.HOSTNAME = hostname;
  
  // Import and run the standalone server
  require('./server.js');
} else {
  console.log('server.js not found, falling back to next start...');
  
  const app = next({ 
    dev: false,
    hostname,
    port 
  });
  
  const handle = app.getRequestHandler();
  
  app.prepare().then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  });
}