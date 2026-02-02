chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});
chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

/**
 * Creates the context menu item that appears when right-clicking on links
 * May extend to other contexts in the future 
 */
function createContextMenu() {
  chrome.contextMenus.create({
    id: 'searchArchiveOrg',
    title: 'Search on archive.org',
    contexts: ['link'], // Only show for links/hyperlinks
    documentUrlPatterns: ['<all_urls>']
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'searchArchiveOrg' && info.linkUrl) {
    // Get the URL from the clicked link
    const targetUrl = info.linkUrl;
    
    try {
      // Use Archive.org's Availability API to find the best snapshot
      const bestSnapshotUrl = await findBestSnapshot(targetUrl);
      
      // Open the snapshot in a new tab
      chrome.tabs.create({
        url: bestSnapshotUrl,
        active: true
      });
    } catch (error) {
      console.log('SearchArchiveWithContextMenu - Error finding snapshot:', error);
      
      // Fallback: open the calendar view if API fails
      const fallbackUrl = `https://web.archive.org/web/*/${targetUrl}`;
      chrome.tabs.create({
        url: fallbackUrl,
        active: true
      });
    }
  }
});

/**
 * Find the best available snapshot using Archive.org's Availability API
 * Returns the latest successful (200 OK) snapshot URL
 * 
 * @param {string} targetUrl - The URL to search for
 * @returns {Promise<string>} - Direct URL to the archived snapshot
 */
async function findBestSnapshot(targetUrl) {
  // Archive.org's Availability API endpoint
  const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Check if any snapshot is available
  if (!data.archived_snapshots || !data.archived_snapshots.closest) {
    throw new Error('No snapshots found for this URL');
  }
  
  // Get the closest snapshot (most recent successful capture)
  const snapshot = data.archived_snapshots.closest;
  
  // Return the direct URL to the snapshot
  return snapshot.url;
}