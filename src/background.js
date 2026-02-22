chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => createContextMenu());
});
chrome.runtime.onStartup.addListener(() => {
  chrome.contextMenus.removeAll(() => createContextMenu());
});

function createContextMenu() {
  chrome.contextMenus.create({
    id: 'searchArchiveOrg',
    title: 'Search on archive.org',
    contexts: ['link', 'page'],
    documentUrlPatterns: ['<all_urls>']
  });
}

function cleanUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'searchArchiveOrg') return;

  // linkUrl is only populated when right-clicking an actual link;
  // fall back to the tab's URL for page context
  const rawUrl = info.linkUrl ?? tab?.url ?? info.pageUrl;

  const targetUrl = cleanUrl(rawUrl);

  try {
    const bestSnapshotUrl = await findBestSnapshot(targetUrl);
    chrome.tabs.create({ url: bestSnapshotUrl, active: true });
  } catch (error) {
    console.log('SearchArchiveWithContextMenu - No snapshot found:', error);

    if (error.message === 'NO_SNAPSHOTS') {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showNoSnapshotToast,
      });
    } else {
      const fallbackUrl = `https://web.archive.org/web/*/${targetUrl}`;
      chrome.tabs.create({ url: fallbackUrl, active: true });
    }
  }
});

function showNoSnapshotToast() {
  const TOAST_ID = '__archive_org_toast__';
  document.getElementById(TOAST_ID)?.remove();

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.textContent = '⚠️ Link not archived!';

  Object.assign(toast.style, {
    position:      'fixed',
    left:          '-9999px',
    top:           '-9999px',
    zIndex:        '2147483647',
    background:    '#1a1a1a',
    color:         '#fff',
    padding:       '8px 14px',
    borderRadius:  '6px',
    fontSize:      '14px',
    fontFamily:    'system-ui, sans-serif',
    boxShadow:     '0 4px 12px rgba(0,0,0,0.35)',
    pointerEvents: 'none',
    opacity:       '1',
    transition:    'opacity 0.3s ease',
  });

  document.body.appendChild(toast);

  // Position at current mouse location on first move after injection
  const onMove = (e) => {
    toast.style.left = `${e.clientX + 12}px`;
    toast.style.top  = `${e.clientY + 12}px`;
    document.removeEventListener('mousemove', onMove);
  };
  document.addEventListener('mousemove', onMove);

  setTimeout(() => { toast.style.opacity = '0'; }, 2700);
  setTimeout(() => { toast.remove(); }, 3000);
}

async function findBestSnapshot(targetUrl) {
  const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.archived_snapshots?.closest) {
    throw new Error('NO_SNAPSHOTS');
  }

  return data.archived_snapshots.closest.url;
}