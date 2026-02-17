const App = {
  appName: 'Digio',
  audio: new Audio(),
  db: null,
  dbRequest: null,
  dbVersion: 1,
  isPlaying: false,
  proxy: null,
  proxies: {
    render: 'https://ngxproxy2.onrender.com/',
    vercel: 'https://ngxproxy.vercel.app/proxy/',
    local: 'http://localhost:8090/',
  },
  stationsUpdated: '2025-05-15',
  stations: [
    {
      id: 1,
      title: 'NIO FM',
      image: '/img/stations/nio.jpg',
      url: 'https://niofm.beheerstream.nl:8060/stream?type=http&nocache=71',
      statusUrl: 'https://niofm.beheerstream.nl:8060/currentsong?sid=1',
    },
    {
      id: 4,
      title: 'Radio Top 40',
      image: '/img/stations/radio-top-40.jpg',
      url: 'https://cc6.beheerstream.com/proxy/skurebce?mp=/stream',
      statusUrl:
        'https://cc6.beheerstream.com/proxy/skurebce/currentsong?sid=1',
    },
    {
      id: 0,
      title: 'Radio 10',
      image: '/img/stations/radio10.jpg',
      url: 'https://s5.radio.co/s85a633f73/listen',
      statusUrl: 'https://public.radio.co/stations/s85a633f73/status',
    },
    {
      id: 3,
      title: 'Radio Garuda',
      image: '/img/stations/garuda.jpg',
      url: 'https://ngxproxy2.onrender.com/http://162.244.80.245:8012/stream',
      statusUrl: null,
    },
    {
      id: 2,
      title: 'Beat FM',
      image: '/img/stations/beatfm.jpg',
      url: 'https://audio-edge-cmc51.fra.h.radiomast.io/a263a766-cea5-49e2-87c7-b2e9c9f5740c',
      statusUrl: null,
    },
  ],
  loadStationStatusController: null,
  loadStationStatusTimer: null,
  stationHistoryRendererTimer: null,
  stationHistoryRendererSet: new Set(),
  init: function () {
    this.initDb();
    this.cacheDom();
    this.bindEvents();
    this.setAudio();
    this.loadStations();
    this.renderTemplate();
    this.renderStation();
    this.renderStations();
    this.renderStationLoading(true);
    this.renderStationHistoryEmptyItem();
    this.startStationStatusTimer();
    this.applyUrlState();
  },
  cacheDom: function () {
    // Templates
    this.ListItem = document.querySelector('#ListItem');
    this.IconPlay = document.querySelector('#IconPlay');
    this.IconPause = document.querySelector('#IconPause');
    this.IconYouTube = document.querySelector('#IconYouTube');
    this.IconHistory = document.querySelector('#IconHistory');

    // Elements
    this.AudioVisualizer = document.querySelector('#AudioVisualizer');
    this.Shell = document.querySelector('#Shell');
    this.ViewPlayer = document.querySelector('#ViewPlayer');
    this.ViewStations = document.querySelector('#ViewStations');
    this.ViewStationHistory = document.querySelector('#ViewStationHistory');
    this.Stations = document.querySelector('#Stations');
    this.StationHistory = document.querySelector('#StationHistory');
    this.AudioStatus = document.querySelector('#AudioStatus');
    this.ButtonToggleAudio = document.querySelector('#ButtonToggleAudio');
    this.ButtonToStations = document.querySelector('#ButtonToStations');
    this.ButtonToPlayer = document.querySelectorAll('.ButtonToPlayer');
    this.ButtonSearchYouTube = document.querySelector('#ButtonSearchYouTube');
    this.ButtonToStationHistory = document.querySelector(
      '#ButtonToStationHistory',
    );
    this.ButtonCloseStationHistory = document.querySelector(
      '#ButtonCloseStationHistory',
    );
  },
  bindEvents: function () {
    this.Stations.onclick = this.switchStation.bind(this);
    this.StationHistory.onclick = this.searchYouTube.bind(this, 'history');
    this.ButtonToggleAudio.onclick = this.toggleAudio.bind(this);
    this.ButtonToStations.onclick = this.switchView.bind(this, 'stations');
    Array.from(this.ButtonToPlayer).forEach((button) => {
      button.onclick = this.switchView.bind(this, 'player');
    });
    this.ButtonToStationHistory.onclick = this.switchView.bind(
      this,
      'stationHistory',
    );
    this.ButtonCloseStationHistory.onclick = this.switchView.bind(
      this,
      'stationHistory',
    );
    this.ButtonSearchYouTube.onclick = this.searchYouTube.bind(this, 'player');

    this.audio.ontimeupdate = this.updateTime.bind(this);
    this.audio.onloadstart = this.handleBuffering.bind(this);
    this.audio.onstalled = this.handleBuffering.bind(this);
    this.audio.onerror = this.handleError.bind(this);

    document.onkeydown = this.handleKeydown.bind(this);

    this.dbRequest.onerror = this.handleDbError.bind(this);
    this.dbRequest.onsuccess = this.handleDbSuccess.bind(this);
    this.dbRequest.onupgradeneeded = this.handleDbUpgrade.bind(this);

    this.handleMediaSessionActions();
  },
  renderTemplate: function () {
    this.ButtonToggleAudio.innerHTML = this.IconPlay.innerHTML;
    this.ButtonSearchYouTube.innerHTML = this.IconYouTube.innerHTML;
    this.ButtonToStationHistory.innerHTML = this.IconHistory.innerHTML;
  },
  renderPlayer: function ({ heading, image, title }) {
    this.ViewPlayer.querySelector('.heading').textContent = heading;
    this.ViewPlayer.querySelector('.image').style.setProperty(
      '--image',
      `url('${image}')`,
    );
    this.ViewPlayer.querySelector('.title').innerHTML = title;
    this.ViewPlayer.querySelector('.title').title = title || '';
  },
  renderStation: function () {
    const station = this.getStation();
    this.renderPlayer({
      heading: this.appName,
      ...station,
    });
  },
  renderStations: function () {
    this.stations.forEach((item) => {
      const el = document.importNode(this.ListItem.content, true);
      el.querySelector('li').setAttribute('data-id', item.id);
      el.querySelector('.image').src = item.image;
      el.querySelector('.title').textContent = item.title;
      el.querySelector('.subtitle').remove();
      this.Stations.appendChild(el);
    });
  },
  handleKeydown: function (event) {
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.toggleAudio();
        break;
      case 'ArrowLeft':
        this.scrollStation(-1);
        break;
      case 'ArrowRight':
        this.scrollStation(1);
        break;
      case 'KeyM':
        this.openMini();
        break;
    }
  },
  handleBuffering: function () {
    this.AudioStatus.textContent = 'Buffering...';
  },
  handleError: function () {
    this.AudioStatus.textContent = '00:00:00';
    if (
      this.audio.error &&
      this.audio.error.message.indexOf('Format error') > -1
    ) {
      this.isPlaying = false;
      this.stopAudio();
    }
  },
  applyUrlState: function () {
    const searchParams = new URLSearchParams(window.location.search);
    const autoplay = searchParams.get('autoplay');
    const sidebar = searchParams.get('sidebar');
    const mode = searchParams.get('mode');
    if (autoplay === 'true') {
      this.isPlaying = true;
      this.playAudio().catch(() => {
        this.isPlaying = false;
        this.stopAudio();
      });
    }
    if (sidebar === 'open') {
      this.Shell.classList.add('shell--sidebar-open');
    }
    if (mode === 'mini') {
      this.ViewPlayer.classList.add('player--mini');
    }
  },
  useProxy: function (url) {
    const searchParams = new URLSearchParams(window.location.search);
    const proxyName = searchParams.get('proxy');
    if (proxyName) {
      const proxyUrl = this.proxies[proxyName];
      if (proxyUrl) {
        if (proxyName === 'vercel') {
          return proxyUrl + url.replace('https://', 'https:/');
        }
        return proxyUrl + url;
      }
    }
    return this.proxies.render + url;
  },
  switchView: function (view) {
    if (view === 'player') {
      this.ViewPlayer.style.transform = 'translateY(0%)';
      this.ViewStations.style.transform = 'translateY(0%)';
    }
    if (view === 'stations') {
      this.ViewPlayer.style.transform = 'translateY(-100%)';
      this.ViewStations.style.transform = 'translateY(-100%)';
    }
    if (view === 'stationHistory') {
      const isOpen = this.Shell.classList.toggle('shell--sidebar-open');
      const url = new URL(window.location.href);
      if (isOpen) {
        url.searchParams.set('sidebar', 'open');
      } else {
        url.searchParams.delete('sidebar');
      }
      window.history.replaceState({}, '', url);
    }
  },
  loadStations: function () {
    const stationsUpdated = localStorage.getItem('stations-updated');
    if (!stationsUpdated) {
      localStorage.setItem(
        'stations-updated',
        JSON.stringify(this.stationsUpdated),
      );
    } else {
      if (this.stationsUpdated !== JSON.parse(stationsUpdated)) {
        localStorage.setItem(
          'stations-updated',
          JSON.stringify(this.stationsUpdated),
        );
        localStorage.removeItem('stations');
      }
    }

    const stations = localStorage.getItem('stations');
    if (stations) {
      this.stations = JSON.parse(stations);
    } else {
      localStorage.setItem('stations', JSON.stringify(this.stations));
    }
  },
  getStation: function () {
    let id = localStorage.getItem('stationId');
    if (id === null) {
      localStorage.setItem('stationId', '0');
      return this.stations[0];
    } else {
      id = +id;
    }
    return this.stations.find((item) => item.id === id);
  },
  setStationId: (id) => {
    localStorage.setItem('stationId', id);
  },
  selectStation: function (id) {
    this.setStationId(id);

    this.isPlaying = false;
    this.toggleAudio();

    this.clearStationStatusTimer();
    this.clearStationHistoryRendererTimer();
    this.renderStationHistoryEmptyList();

    setTimeout(() => {
      this.setDocumentTitle(this.appName);
      this.renderStation();
      this.renderStationLoading(true);
      this.startStationStatusTimer();
      this.startStationHistoryRendererTimer();

      this.switchView('player');
    }, 500);
  },
  switchStation: function (event) {
    const li = event.target.closest('li');
    const id = li.dataset.id;
    this.selectStation(id);
  },
  scrollStation: function (direction) {
    const station = this.getStation();
    let currentIndex = this.stations.findIndex(
      (item) => item.id === station.id,
    );
    currentIndex += direction;

    if (currentIndex > -1 && currentIndex < this.stations.length) {
      const newStation = this.stations[currentIndex];
      this.selectStation(newStation.id);
      this.playAudio();
    }
  },
  setAudio: function () {
    this.audio.src = '';
    this.audio.preload = '';
    this.audio.autoplay = false;
  },
  toggleAudio: function () {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.playAudio();
    } else {
      this.stopAudio();
    }
  },
  playAudio: function () {
    const station = this.getStation();

    this.audio.src = station.url;
    const playPromise = this.audio.play();
    this.ButtonToggleAudio.innerHTML = this.IconPause.innerHTML;

    this.setMediaSession({
      ...station,
      artist: this.appName,
    });

    return playPromise;
  },
  stopAudio: function () {
    this.audio.src = '';
    this.audio.pause();
    this.ButtonToggleAudio.innerHTML = this.IconPlay.innerHTML;
  },
  updateTime: function () {
    const date = new Date(null);
    date.setSeconds(this.audio.currentTime);
    const currentTime = date.toISOString().substring(11, 19);

    this.AudioStatus.textContent = currentTime;
  },
  openMini: () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'mini');
    window.open(url.toString(), '', 'width=420,height=160');
  },
  setMediaSession: ({ title, artist, album, image }) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: [
          {
            src: image,
            sizes: '145x145',
            type: 'image/jpg',
          },
        ],
      });
    }
  },
  handleMediaSessionActions: function () {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        this.isPlaying = true;
        this.playAudio();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.isPlaying = false;
        this.stopAudio();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.isPlaying = false;
        this.stopAudio();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.scrollStation(-1);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.scrollStation(1);
      });
    }
  },
  loadStationStatus: async function () {
    const station = this.getStation();
    if (!station?.statusUrl) {
      this.clearStationStatusTimer();
      this.renderStationLoading(false);
      return;
    }

    const [result, error] = await tryCatch(this.fetchStationStatus(station));

    this.renderStationLoading(false);

    if (result) {
      this.renderPlayer({
        heading: station.title,
        image: result.image || station.image,
        title: result.title || station.title,
      });

      this.stationHistoryAdd({
        title: result.title,
        image: result.image || station.image,
        stationId: station.id,
      });

      this.setDocumentTitle(result.title || station.title);

      this.setMediaSession({
        title: result.title || station.title,
        artist: result.title ? station.title : undefined,
        album: this.appName,
        image: result.image || station.image,
      });

      return;
    }

    this.renderPlayer({
      heading: station.title,
      title: station.title,
      image: station.image,
    });

    this.setDocumentTitle(station.title);

    this.setMediaSession({
      ...station,
      artist: this.appName,
    });
  },
  fetchStationStatus: async function (station) {
    this.loadStationStatusController = new AbortController();
    const timeoutSignal = AbortSignal.timeout(3000);
    const combinedSignal = AbortSignal.any([
      this.loadStationStatusController.signal,
      timeoutSignal,
    ]);

    const url = this.useProxy(station.statusUrl);
    const fetcher = fetch(url, { signal: combinedSignal });

    switch (station.id) {
      case 0: {
        const result0 = await fetcher.then((res) => res.json());
        if (!result0) throw new Error('No data');

        return {
          title: result0?.current_track?.title,
          image: result0?.current_track?.artwork_url_large,
        };
      }
      default: {
        // Shoutcast
        const resultText = await fetcher.then((res) => res.text());
        if (!resultText) throw new Error('No data');

        return {
          title: resultText,
        };
      }
    }
  },
  startStationStatusTimer: function () {
    this.loadStationStatusTimer = setInterval(() => {
      this.loadStationStatus();
    }, 3000);
  },
  clearStationStatusTimer: function () {
    if (this.loadStationStatusController) {
      this.loadStationStatusController.abort();
    }
    if (this.loadStationStatusTimer) {
      clearInterval(this.loadStationStatusTimer);
    }
  },
  setDocumentTitle: (title) => {
    document.title = title;
  },
  renderStationLoading: function (value) {
    if (value) {
      this.Shell.classList.add('shell--loading');
    } else {
      this.Shell.classList.remove('shell--loading');
    }
  },
  searchYouTube: function (context, event) {
    let q;

    switch (context) {
      case 'player':
        q = encodeURIComponent(
          this.ViewPlayer.querySelector('.title').textContent,
        );
        break;
      case 'history': {
        const li = event.target.closest('li');
        // Query is already URI encoded
        q = li.dataset.query;
        break;
      }
    }

    if (!q) return;
    const url = `https://www.youtube.com/results?search_query=${q}`;
    window.open(url, '_blank');
  },
  renderStationHistoryEmptyList: function () {
    this.stationHistoryRendererSet = new Set();
    this.StationHistory.innerHTML = '';
  },
  renderStationHistoryEmptyItem: function () {
    const emptyEl = document.createElement('li');
    emptyEl.classList.add('list__empty');
    emptyEl.textContent = 'No history yet';
    this.StationHistory.appendChild(emptyEl);
  },
  renderStationHistory: function () {
    if (!this.db) return;

    const station = this.getStation();
    const searchParams = new URLSearchParams(window.location.search);
    const LIMIT = searchParams.get('history-limit') || 250;

    const transaction = this.db.transaction(['station_history'], 'readonly');
    const store = transaction.objectStore('station_history');
    const index = store.index('station_id');
    const keyRange = IDBKeyRange.only(station.id);
    const cursorRequest = index.openCursor(keyRange, 'next');
    let cursorCount = 0;

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && cursorCount < LIMIT) {
        const item = cursor.value;

        const itemEl = document.importNode(this.ListItem.content, true);
        itemEl.querySelector('.image').src = item.image;
        itemEl.querySelector('.title').textContent = item.title;
        itemEl.querySelector('.title').title = item.title;
        itemEl.querySelector('.subtitle').textContent = this.formatDate(
          item.date,
        );

        // We use text content so that HTML entities are parsed
        const titleContent = itemEl.querySelector('.title').textContent;
        itemEl
          .querySelector('li')
          .setAttribute('data-query', encodeURIComponent(titleContent));

        if (!this.stationHistoryRendererSet.has(item.id)) {
          this.StationHistory.prepend(itemEl);
          this.stationHistoryRendererSet.add(item.id);
        }

        cursorCount++;
        cursor.continue();
      } else {
        if (cursorCount === 0) {
          this.renderStationHistoryEmptyList();
          this.renderStationHistoryEmptyItem();
        }
      }
    };
  },
  initDb: function () {
    this.dbRequest = window.indexedDB.open(
      this.appName.toLowerCase(),
      this.dbVersion,
    );
  },
  handleDbError: (event) => {
    console.error(event);
  },
  handleDbSuccess: function (event) {
    this.db = event.target.result;
    // Clear the list
    this.renderStationHistoryEmptyList();
    this.renderStationHistory();
    // We start rendering the history when the database is ready
    this.startStationHistoryRendererTimer();
  },
  handleDbUpgrade: (event) => {
    const db = event.target.result;

    const stationHistoryStore = db.createObjectStore('station_history', {
      keyPath: 'id',
      autoIncrement: true,
    });
    stationHistoryStore.createIndex('title', 'title', { unique: false });
    stationHistoryStore.createIndex('image', 'image', { unique: false });
    stationHistoryStore.createIndex('station_id', 'station_id', {
      unique: false,
    });
    stationHistoryStore.createIndex('date', 'date', { unique: false });
  },
  stationHistoryAdd: function ({ title, image, stationId }) {
    if (!this.db || !title) return;

    const transaction = this.db.transaction(['station_history'], 'readwrite');
    const store = transaction.objectStore('station_history');
    const index = store.index('station_id');
    const keyRange = IDBKeyRange.only(stationId);
    const cursorRequest = index.openCursor(keyRange, 'prev');

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      // If there's no last item means the history is empty
      if (
        !cursor ||
        !(
          cursor?.value?.title === title &&
          cursor?.value?.station_id === stationId
        )
      ) {
        store.add({
          title: title,
          image: image,
          station_id: stationId,
          date: new Date().toISOString(),
        });
      }
    };
  },
  startStationHistoryRendererTimer: function () {
    this.stationHistoryRendererTimer = setInterval(() => {
      this.renderStationHistory();
    }, 3000);
  },
  clearStationHistoryRendererTimer: function () {
    if (this.stationHistoryRendererTimer) {
      clearInterval(this.startStationHistoryRendererTimer);
    }
  },
  formatDate: (date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    return formatter.format(new Date(date));
  },
};

App.init();
