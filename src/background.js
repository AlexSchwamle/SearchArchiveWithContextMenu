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
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'searchArchiveOrg' && info.linkUrl) {
    const targetUrl = info.linkUrl;
    
    // Archive.org uses this format as of 2-1-26: https://web.archive.org/web/*/URL
    const archiveSearchUrl = `https://web.archive.org/web/*/${targetUrl}`;
    
    // Open in a new tab
    chrome.tabs.create({
      url: archiveSearchUrl,
      active: true 
    });
  }
});
