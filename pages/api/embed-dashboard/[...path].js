import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req, res) {
  const { path: pathParts } = req.query;
  const filePath = path.join(process.cwd(), 'src', 'embed-dashboard', pathParts.join('/'));
  
  try {
    if (fs.existsSync(filePath)) {
      const fileContents = fs.readFileSync(filePath);
      
      // Set appropriate content type
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
      }
      
      res.status(200).send(fileContents);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
