window.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.getBackgroundPage((backgroundPage) => {
    backgroundPage.init();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type == 'tabs') {
        renderTabs(request.tabs, request.filtered);
      } else if (request.type == 'status') {
        renderApplicationStatus(request.connection);
      }
    });

    chrome.runtime.sendMessage({type: 'connectionStatus'});

    chrome.runtime.sendMessage({type: 'tabs'}, (response) => {
      renderTabs(response.tabs, response.filtered);
    });

    document.getElementById('list').addEventListener('click', (event) => {
      if (event.target.classList.contains('toggle') || event.target.classList.contains('icon-off')) {
        const element = event.target.closest('div');
        chrome.runtime.sendMessage({type: 'tabToggle', tabId: element.dataset.tabId}, (response) => {
          renderToggle(element, response.status);
        })
      }
    });
  })
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
    const element = document.createElement('div');
    element.dataset.tabId = key;

    const icon = document.createElement('i');
    icon.classList = 'icon-off';

    const toggle = document.createElement('a');
    toggle.classList = 'toggle';
    toggle.appendChild(icon);
    element.appendChild(toggle);

    const title = document.createElement('span');
    title.textContent = tab.songTitle ? tab.songTitle : 'Unknown';
    element.appendChild(title);

    renderToggle(element, filtered.indexOf(key) != -1);

    fragment.appendChild(element);
  }

  list.appendChild(fragment);
}
