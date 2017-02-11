if (!(window && window.scrobblerInitialized)) {
  class Finder {
    constructor(callback) {
      this.callback = callback;
      this.observer = null;
      this.finder = null;

      this.players = new Map([
        ["youtube.com", this.youtube],
        ["listenonrepeat.com", this.listenonrepeat],
        ["beta.nightbot.tv", this.nightbot],
        ["plug.dj", this.plug],
        ["play.spotify.com", this.spotify],
      ]);
    }

    getFinder(url = document.location.host) {
      for (let [needle, finder] of this.players.entries()) {
        if (url.includes(needle)) {
          this.finder = finder;
          return finder;
        }
      }
    }

    pause() {
      if (this.observer !== null) {
        this.observer.disconnect();
      }
    }

    listen() {
      if (this.finder === null && this.getFinder() === undefined) {
        console.log('Unsupported website');
        return
      }
      this.finder();
    }

    spotify() {
      const element = document.getElementById('player');
      const songTitle = Array.from(element.getElementsByTagName('a'))
        .map((el) => {return el.textContent}).join(" - ");
      this.callback({
        songTitle: songTitle,
        player: 'spotify',
      });

      if (this.observer && !this.observer.connected) {
        this.observer.reconnect();
      } else {
        this.observer = new MutationSummary({
          rootNode: element,
          callback: (summaries) => {
            const songTitle = summaries[0].added
              .map((el) => {return el.textContent}).join(" - ");
            if (songTitle) {
              this.callback({
                songTitle: songTitle,
                player: 'spotify',
              })
            }
          },
          queries: [{characterData: true}],
        });
      }
    }

    plug() {
      const element = document.getElementById('now-playing-media');
      this.callback({
        songTitle: element.title,
        player: 'plug.dj',
      });

      if (this.observer) {
        this.observer.reconnect();
      } else {
        this.observer = new MutationSummary({
          rootNode: element,
          callback: (summaries) => {
            const songTitle = summaries[0].valueChanged[0].title;
            if (songTitle) {
              this.callback({
                songTitle: songTitle,
                player: 'plug.dj',
              });
            }
          },
          queries: [{attribute: "title"}],
        });
      }
    }

    nightbot() {
      const element = document.querySelector('div.current-track strong.ng-binding');
      this.callback({
        songTitle: element.textContent,
        player: 'nightbot',
      });

      if (this.observer) {
        this.observer.reconnect();
      } else {
        this.observer = new MutationSummary({
          rootNode: element,
          callback: (summaries) => {
            const songTitle = summaries[0].valueChanged[0].textContent;
            if (songTitle) {
              this.callback({
                songTitle: songTitle,
                player: 'nightbot',
              });
            }
          },
          queries: [{characterData: true}],
        });
      }
    }

    youtube() {
      const element = document.getElementById('eow-title');
      this.callback({
        songTitle: element.title,
        player: 'youtube',
      });

      if (this.observer) {
        this.observer.reconnect();
      } else {
        this.observer = new MutationSummary({
          rootNode: element,
          callback: (summaries) => {
            const songTitle = summaries[0].valueChanged[0].title;
            if (songTitle) {
              this.callback({
                songTitle: songTitle,
                player: 'youtube',
              });
            }
          },
          queries: [{attribute: "title"}],
        });
      }
    }

    listenonrepeat() {
      const element = document.querySelector('div.video-title');
      this.callback({
        songTitle: element.textContent,
        player: 'listenonrepeat',
      });

      if (this.observer) {
        this.observer.reconnect();
      } else {
        this.observer = new MutationSummary({
          rootNode: element,
          callback: (summaries) => {
            const songTitle = summaries[0].valueChanged[0].textContent;
            if (songTitle) {
              this.callback({
                songTitle: songTitle,
                player: 'listenonrepeat',
              });
            }
          },
          queries: [{characterData: true}],
        });
      }
    }
  }

  class Connector {
    constructor() {
      this.listen = this.listen.bind(this);
      this.onDisconnect = this.onDisconnect.bind(this);
      this.onMessage = this.onMessage.bind(this);
      this.sendTitle = this.sendTitle.bind(this);

      this.port = null;
      this.finder = new Finder(this.sendTitle);
      this.listening = false;
    }

    listen() {
      if (this.listening) {
        return;
      }
      this.listening = true;

      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.type == "ping") {
          sendResponse({message: "pong"});
        }
      });

      chrome.runtime.onConnect.addListener((port) => {
        port.onDisconnect.addListener(this.onDisconnect);
        port.onMessage.addListener(this.onMessage);
        this.port = port;
        this.finder.listen();
      });
    }

    onDisconnect() {
      console.log('Disconnected from background page');
      if (this.port !== null) {
        this.port.disconnect();
        this.port = null;
      }
      this.finder.pause();
    }

    onMessage(message) {
      // We currently don't send messages from the background page to the content script
      console.log(message);
    }

    sendTitle({songTitle, player}) {
      if (this.port !== null) {
        this.port.postMessage({
          message: {
            songTitle: songTitle,
            player: player,
            url: document.location.href,
          },
        })
      }
    }
  }

  window.scrobblerInitialized = new Connector();
  window.scrobblerInitialized.listen();
}
