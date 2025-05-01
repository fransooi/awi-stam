// cross_project_memory_sync.js
// Synchronize memory files between two Windsurf projects

const fs = require('fs');
const path = require('path');

const STAM_MEMORY_DIR = path.resolve(__dirname, '../stam/.windsurfrules/memories');
const ENGINE_MEMORY_DIR = path.resolve(__dirname, '../engine/.windsurfrules/memories');

// Utility: Check if file is marked as shared
function isSharedMemory(filePath) {
  if (filePath.endsWith('.md')) {
    // For Markdown: look for '#shared' in the first non-empty line
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      if (line.trim() === '') continue;
      if (line.trim().toLowerCase().startsWith('#shared')) return true;
      break;
    }
    return false;
  } else if (filePath.endsWith('.json')) {
    // For JSON: look for "shared" in tags array
    try {
      const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(obj.tags)) {
        return obj.tags.some(tag => tag.toLowerCase() === 'shared');
      }
    } catch (e) {
      // Ignore parse errors
    }
    return false;
  }
  return false;
}

// Utility: Sync shared memories between directories
function syncMemories(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error(`Source memory dir not found: ${srcDir}`);
    return;
  }
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const files = fs.readdirSync(srcDir).filter(f => (f.endsWith('.json') || f.endsWith('.md')));
  let copied = 0;
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    if (!isSharedMemory(srcFile)) continue; // Only sync #shared memories
    const destFile = path.join(destDir, file);
    let shouldCopy = false;
    if (!fs.existsSync(destFile)) {
      shouldCopy = true;
    } else {
      // Only copy if source is newer
      const srcStat = fs.statSync(srcFile);
      const destStat = fs.statSync(destFile);
      if (srcStat.mtimeMs > destStat.mtimeMs) {
        shouldCopy = true;
      }
    }
    if (shouldCopy) {
      fs.copyFileSync(srcFile, destFile);
      copied++;
      console.log(`Copied ${file} to ${destDir}`);
    }
  }
  if (copied === 0) {
    console.log(`No new or updated #shared memories to sync from ${srcDir} to ${destDir}`);
  }
}

// Bidirectional sync
console.log('--- Syncing STAM → ENGINE memories ---');
syncMemories(STAM_MEMORY_DIR, ENGINE_MEMORY_DIR);

console.log('--- Syncing ENGINE → STAM memories ---');
syncMemories(ENGINE_MEMORY_DIR, STAM_MEMORY_DIR);

console.log('Memory sync complete.');