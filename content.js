if (!(window && window.scrobblerInitialized)) {
  class Finder {
    constructor(callback) {
      this.callback = callback;
      this.observer = null;
      this.finder = null;
      this.maxTries = 5;
      this.tries = 0;
      this.pauseMusic = this.pauseMusic.bind(this);
      this.unpauseMusic = this.unpauseMusic.bind(this);

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
          this.finder = finder.bind(this);
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

    // currently only support youtube for pause/unpause
    pauseMusic() {
      const elements = document.getElementsByTagName("video");
      for (let el of elements) {
        el.pause();
      }
    }

    unpauseMusic() {
      const elements = document.getElementsByTagName("video");
      for (let el of elements) {
        el.play();
      }
    }

    spotify() {
      const element = document.getElementById('player');
      const songTitle = Array.from(element.getElementsByTagName('a'))
        .map((el) => {return el.textContent}).join(" - ");
      if (songTitle) {
        this.tries = 0;
        this.callback({
          songTitle: songTitle,
          player: 'spotify',
        });
      } else {
        // Maybe page didn't fully load, restart a few times
        if (this.tries < this.maxTries) {
          this.tries += 1;
          console.log(`Retrying... (${this.tries}/${this.maxTries})`);
          setTimeout(this.finder, 250);
        }
      }

      if (this.observer) {
        if (!this.observer.connected) {
          this.observer.reconnect();
        }
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
      if (element && element.title) {
        this.tries = 0;
        this.callback({
          songTitle: element.title,
          player: 'plug.dj',
        });
      } else {
        // Maybe page didn't fully load, restart a few times
        if (this.tries < this.maxTries) {
          this.tries += 1;
          console.log(`Retrying... (${this.tries}/${this.maxTries})`);
          setTimeout(this.finder, 250);
        }
      }

      if (this.observer) {
        if (!this.observer.connected) {
          this.observer.reconnect();
        }
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
      if (element && element.textContent) {
        this.tries = 0;
        this.callback({
          songTitle: element.textContent,
          player: 'nightbot',
        });
      } else {
        // Maybe page didn't fully load, restart a few times
        if (this.tries < this.maxTries) {
          this.tries += 1;
          console.log(`Retrying... (${this.tries}/${this.maxTries})`);
          setTimeout(this.finder, 250);
        }
      }

      if (this.observer) {
        if (!this.observer.connected) {
          this.observer.reconnect();
        }
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
      const element = document.querySelector('#container.ytd-video-primary-info-renderer > h1');
      if (element && element.textContent) {
        this.tries = 0;
        this.callback({
          songTitle: element.textContent,
          player: 'youtube',
        });
      } else {
        // Maybe page didn't fully load, restart a few times
        if (this.tries < this.maxTries) {
          this.tries += 1;
          console.log(`Retrying... (${this.tries}/${this.maxTries})`);
          setTimeout(this.finder, 250);
        }
        return;
      }

      if (this.observer) {
        if (!this.observer.connected) {
          this.observer.reconnect();
        }
      } else {
        this.observer = new MutationSummary({
          rootNode: element,
          observeOwnChanges: true,
          callback: (summaries) => {
            if (summaries.length > 0) {
              if (summaries[0].valueChanged.length > 0) {
                this.callback({ songTitle: summaries[0].valueChanged[0].textContent, player: "youtube" });
              }
            }
          },
          queries: [
            { characterData: true },
          ],
        });
      }
    }

    listenonrepeat() {
      const element = document.querySelector('div.video-title');
      if (element && element.textContent) {
        this.tries = 0;
        this.callback({
          songTitle: element.textContent,
          player: 'listenonrepeat',
        });
      } else {
        // Maybe page didn't fully load, restart a few times
        if (this.tries < this.maxTries) {
          this.tries += 1;
          console.log(`Retrying... (${this.tries}/${this.maxTries})`);
          setTimeout(this.finder, 250);
        }
      }

      if (this.observer) {
        if (!this.observer.connected) {
          this.observer.reconnect();
        }
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
      console.log("Received message from background page:", message);
      if (message && message.action == "pause") {
        this.finder.pauseMusic();
      } else if (message && message.action == "unpause") {
        this.finder.unpauseMusic();
      }
    }

    sendTitle({songTitle, player}) {
      console.log("Sending", songTitle, player);
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

  const afterLoad = () => {
    window.scrobblerInitialized = new Connector();
    window.scrobblerInitialized.listen();
  };

  if (document.readyState !== 'complete') {
    window.addEventListener('load', afterLoad);
  } else {
    afterLoad();
  }
}
