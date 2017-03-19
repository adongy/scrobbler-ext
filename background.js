class NativeConnector {
  constructor() {
    // Class properties still not supported in chrome without transpiling
    this.onMessage = this.onMessage.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.tryConnect = this.tryConnect.bind(this);
    this.connect = this.connect.bind(this);
    this.port = null;
    this.lastMessage = null;

    this.NATIVE_APPLICATION_NAME = "com.github.adongy.scrobbler";
  }

  onMessage(message) {
    console.log('Received message from native messaging host: ', message);
    chrome.runtime.sendMessage({
      type: "sendStatus", // can't reuse same identifier as popup sends, we don't check the sender so it's recursive
      connection: !!message && message.status == "ok",
    });
  }

  onDisconnect() {
    console.log('Native port disconnected');
    if (chrome.runtime.lastError && chrome.runtime.lastError.message) {
      console.log('Last error: ', chrome.runtime.lastError.message);
    }
    this.port = null;
  }

  connect() {
    console.log('Connecting to native messaging host');
    if (this.port === null) {
      this.port = chrome.runtime.connectNative(this.NATIVE_APPLICATION_NAME);
      this.port.onMessage.addListener(this.onMessage);
      this.port.onDisconnect.addListener(this.onDisconnect);
    }
  }

  tryConnect() {
    this.sendMessage([], 'ping');
  }

  sendMessage(message, type = 'update') {
    if (type == 'update') {
      if (this.lastMessage == message) {
        return
      } else {
        this.lastMessage = message;
      }
    }

    if (this.port === null) {
      this.connect();
    }

    this.port.postMessage({ type: type, message: message })
  }
}

class TabsConnector {

  constructor(onTabUpdate) {
    // Class properties still not supported in chrome without transpiling
    this.onMessage = this.onMessage.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
    this.runContentScript = this.runContentScript.bind(this);
    this.startMonitor = this.startMonitor.bind(this);

    this.tabs = new Map();
    this.onTabUpdate = onTabUpdate;
  }

  onMessage(tabId, message) {
    const tab = this.tabs.get(tabId);
    // Object comparison is... questionable
    if (JSON.stringify(tab.data) !== JSON.stringify(message["message"])) {
      tab.data = message["message"];
      this.onTabUpdate(this.tabs);
    }
  }

  onDisconnect(tabId) {
    const tab = this.tabs.get(tabId);
    if (tab && tab.port != null) {
      // We can call .disconnect() on a disconnected port
      // so this supports both ends terminating the connection
      tab.port.disconnect();
    }
    this.tabs.delete(tabId);
    if (tab && tab.data) {
      // data changed, need to update
      this.onTabUpdate(this.tabs);
    }
  }

  runContentScript(tabId) {
    this.tabs.set(tabId, {
      port: null,
      data: null,
    });

    chrome.tabs.sendMessage(tabId, {type: "ping"}, (response) => {
      if (response && response.message == "pong") {
        // content script already loaded
        this.startMonitor(tabId);
        return;
      }
    })

    chrome.tabs.executeScript(tabId, {file: "vendor/mutation-summary.js"}, () => {
      chrome.tabs.executeScript(tabId, {file: "content.js"}, () => {
        this.startMonitor(tabId);
      });
    });
  }

  startMonitor(tabId) {
    const port = chrome.tabs.connect(tabId, {name: tabId.toString()});
    this.tabs.get(tabId).port = port;
    port.onMessage.addListener((message) => {
      this.onMessage(tabId, message);
    });
    port.onDisconnect.addListener(() => {
      this.onDisconnect(tabId);
    });
  }

}

class BackgroundScript {
  constructor() {
    // Class properties still not supported in chrome without transpiling
    this.onTabUpdate = this.onTabUpdate.bind(this);
    this.getMessage = this.getMessage.bind(this);
    this.getMessage = this.getMessage.bind(this);
    this.formatMessage = this.formatMessage.bind(this);
    this.tryConnect = this.tryConnect.bind(this);

    this.tabsConnector = new TabsConnector(this.onTabUpdate);
    this.nativeConnector = new NativeConnector();

    this.filteredTabs = new Set();
  }

  onTabUpdate(tabs) {
    const message = this.getMessage(tabs);
    chrome.runtime.sendMessage({
      type: "sendTabs", // can't reuse same identifier as popup sends, we don't check the sender so it's recursive
      tabs: message,
      // Cannot send Set over the wire, only Array
      filtered: Array.from(this.filteredTabs),
    });
    this.nativeConnector.sendMessage(this.formatMessage(message));
  }

  getMessage(tabs) {
    const message = {};
    for (let [key, value] of tabs) {
      if (value && value.data) {
        message[key] = value.data;
      }
    }
    return message;
  }

  formatMessage(message) {
    // Format message for the native application
    for (let tabId of this.filteredTabs) {
      if (tabIn in message) {
        delete message[tabId];
      }
    }
    return Object.values(message);
  }

  toggleTab(tabId) {
    if (this.filteredTabs.has(tabId)) {
      this.filteredTabs.delete(tabId);
    } else {
      this.filteredTabs.add(tabId);
    }
    // Todo: update the nativeConnector, but don't send to the runtime
    return this.filteredTabs.has(tabId);
  }

  tryConnect() {
    return this.nativeConnector.tryConnect()
  }
}

let monitor;

function init() {
  if (monitor) {
    return;
  }
  monitor = new BackgroundScript();

  chrome.tabs.query({audible: true}, (tabs) => {
    for (let tab of tabs) {
      monitor.tabsConnector.runContentScript(tab.id);
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.audible === true || (
      tab.status === "complete" && tab.audible === true
    )) {
      monitor.tabsConnector.runContentScript(tabId);
    } else if (monitor.tabsConnector.tabs.has(tabId) && (
      changeInfo.audible === false || (
        tab.status === "complete" && tab.audible === false
      )
    )) {
      monitor.tabsConnector.onDisconnect(tabId);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    monitor.tabsConnector.onDisconnect(tabId);
    monitor.filteredTabs.delete(tabId);
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type == 'status') {
      monitor.tryConnect();
    } else if (request.type == 'tabs') {
      monitor.onTabUpdate(monitor.tabsConnector.tabs);
    } else if (request.type == 'tabToggle') {
      const tabId = parseInt(request.tabId, 10);
      sendResponse({status: monitor.toggleTab(tabId)});
    }
  })
}

init();
