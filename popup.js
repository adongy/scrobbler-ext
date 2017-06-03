window.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type == 'sendTabs') {
      renderTabs(request.tabs, request.filtered);
    } else if (request.type == 'sendStatus') {
      renderApplicationStatus(request.connection);
    }
  });

  chrome.runtime.sendMessage({type: 'status'});
  chrome.runtime.sendMessage({type: 'tabs'});

  document.getElementById('list').addEventListener('click', (event) => {
    if (event.target.classList.contains('toggle') || event.target.classList.contains('icon-off')) {
      const element = event.target.closest('div');
      chrome.runtime.sendMessage({type: 'tabToggle', tabId: element.dataset.tabId}, (response) => {
        renderToggle(element, response.status);
      })
    }
  });
});

function renderToggle(element, status) {
  if (status) {
    element.classList.add('disabled');
  } else {
    element.classList.remove('disabled');
  }
}

function renderApplicationStatus(status) {
  const classList = status ? 'icon-ok' : 'icon-exclamation';
  document.getElementById('connection').firstChild.classList = classList;
}

function renderTabs(tabs, filtered) {
  // Reconstruct the entire list
  const list = document.getElementById('list');
  const fragment = document.createDocumentFragment();
  while (list.firstChild) list.removeChild(list.firstChild);

  for (let [key, tab] of Object.entries(tabs)) {
    // HACK: we use filtered tabs to exclude tab completely...
    if (filtered.indexOf(Number(key)) != -1) continue;
    const element = document.createElement('div');
    element.dataset.tabId = key;

    const icon = document.createElement('i');
    icon.classList = 'icon-off';

    const toggle = document.createElement('a');
    toggle.classList = 'toggle';
    toggle.appendChild(icon);
    element.appendChild(toggle);

    const title = document.createElement('span');
    if (!tab.songTitle) continue;
    title.textContent = tab.songTitle;
    element.appendChild(title);

    renderToggle(element, filtered.indexOf(key) != -1);

    fragment.appendChild(element);
  }

  list.appendChild(fragment);
}
