#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const configFile = 'frontend/assets/config/canary-config.json';
const outputFile = path.join(process.cwd(), 'frontend', 'assets', 'data', 'canary-history.json');

function getFileHistory() {
  const history = [];
  try {
    // Get commit hashes and commit dates for the file
    const logOutput = execSync(`git log --pretty=format:"%H %cI" -- ${configFile}`, { encoding: 'utf-8' });
    const commits = logOutput.split('\n').filter(line => line.trim() !== '');

    for (const commitLine of commits) {
      const [hash, commitDate] = commitLine.split(' ');
      if (!hash) continue;

      try {
        const fileContent = execSync(`git show ${hash}:${configFile}`, { encoding: 'utf-8' });
        const config = JSON.parse(fileContent);
        
        const percentage = config.distribution?.canaryPercentage;
        // Use lastUpdated from the file, fallback to commitDate if not present or invalid
        let timestamp = config.lastUpdated;
        if (!timestamp || isNaN(new Date(timestamp).getTime())) {
            timestamp = commitDate;
        }

        if (typeof percentage === 'number' && timestamp) {
          history.push({
            timestamp: new Date(timestamp).toISOString(),
            percentage: percentage,
            hash.substring(0,7)
          });
        }
      } catch (e) {
        // Skip commits where we can't read or parse the file
      }
    }
  } catch (e) {
    console.error(`Error getting git log for ${configFile}: ${e.message}`);
    return [];
  }

  // Sort by timestamp ascending
  history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Deduplicate entries with the same timestamp and percentage, keeping the latest commit
  const uniqueHistory = [];
  const seen = new Set();
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    const key = `${entry.timestamp}-${entry.percentage}`;
    if (!seen.has(key)) {
      uniqueHistory.unshift(entry);
      seen.add(key);
    }
  }
  
  return uniqueHistory;
}

function main() {
  const historyData = getFileHistory();

  if (historyData.length === 0) {
    console.log('No history data found or generated for canary config.');
    // Create an empty file with default structure
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
    console.log(`Wrote empty history to ${outputFile}`);
    return;
  }

  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(historyData, null, 2));
  console.log(`Canary history data saved to ${outputFile}`);
}

main();
