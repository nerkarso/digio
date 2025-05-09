const App = {
  appName: 'Digio',
  audio: new Audio(),
  isPlaying: false,
  stationsUpdated: '2025-05-04',
  stations: [
    {
      id: 0,
      title: 'Radio 10',
      image: '/img/stations/radio10.jpg',
      url: 'https://s5.radio.co/s85a633f73/listen',
      statusUrl: 'https://public.radio.co/stations/s85a633f73/status',
    },
    {
      id: 1,
      title: 'NIO FM',
      image: '/img/stations/nio.jpg',
      url: 'https://niofm.beheerstream.nl:8060/stream?type=http&nocache=71',
      statusUrl: 'https://ngxproxy.vercel.app/proxy/https:/niofm.beheerstream.nl:8060/currentsong?sid=1',
    },
    {
      id: 2,
      title: 'Beat FM',
      image: '/img/stations/beatfm.jpg',
      url: 'https://audio-edge-cmc51.fra.h.radiomast.io/a263a766-cea5-49e2-87c7-b2e9c9f5740c',
      statusUrl: null,
    },
    {
      id: 3,
      title: 'Radio Garuda',
      image: '/img/stations/garuda.jpg',
      url: 'https://ngxproxy2.onrender.com/http://162.244.80.245:8012/stream',
      statusUrl: null,
    },
    {
      id: 4,
      title: 'Radio Top 40',
      image: '/img/stations/radio-top-40.jpg',
      url: 'https://cc6.beheerstream.com/proxy/skurebce?mp=/stream',
      statusUrl: 'https://ngxproxy.vercel.app/proxy/https:/cc6.beheerstream.com/proxy/skurebce/currentsong?sid=1',
    },
  ],
  loadStationStatusController: null,
  loadStationStatusTimer: null,
  init: function () {
    this.cacheDom();
    this.bindEvents();
    this.setAudio();
    this.loadStations();
    this.renderTemplate();
    this.renderStation();
    this.renderStations();
    this.renderStationLoading(true);
    this.startStationStatusTimer();
    this.handleAutoPlay();
  },
  cacheDom: function () {
    // Templates
    this.ListItem = document.querySelector('#ListItem');
    this.IconPlay = document.querySelector('#IconPlay');
    this.IconPause = document.querySelector('#IconPause');
    this.IconYouTube = document.querySelector('#IconYouTube');

    // Elements
    this.Shell = document.querySelector('#Shell');
    this.ViewPlayer = document.querySelector('#ViewPlayer');
    this.ViewStations = document.querySelector('#ViewStations');
    this.Stations = document.querySelector('#Stations');
    this.AudioStatus = document.querySelector('#AudioStatus');
    this.ButtonToggleAudio = document.querySelector('#ButtonToggleAudio');
    this.ButtonToStations = document.querySelector('#ButtonToStations');
    this.ButtonToPlayer = document.querySelector('#ButtonToPlayer');
    this.ButtonSearchYouTube = document.querySelector('#ButtonSearchYouTube');
  },
  bindEvents: function () {
    this.Stations.onclick = this.switchStation.bind(this);
    this.ButtonToggleAudio.onclick = this.toggleAudio.bind(this);
    this.ButtonToStations.onclick = this.switchView.bind(this, 'stations');
    this.ButtonToPlayer.onclick = this.switchView.bind(this, 'player');
    this.ButtonSearchYouTube.onclick = this.searchYouTube.bind(this);

    this.audio.ontimeupdate = this.updateTime.bind(this);
    this.audio.onloadstart = this.handleBuffering.bind(this);
    this.audio.onstalled = this.handleBuffering.bind(this);
    this.audio.onerror = this.handleError.bind(this);

    document.onkeydown = this.handleKeydown.bind(this);

    this.handleMediaSessionActions();
  },
  renderTemplate: function () {
    this.ButtonToggleAudio.innerHTML = this.IconPlay.innerHTML;
    this.ButtonSearchYouTube.innerHTML = this.IconYouTube.innerHTML;
  },
  renderPlayer: function ({ heading, image, title }) {
    this.ViewPlayer.querySelector('.heading').innerText = heading;
    this.ViewPlayer.querySelector('.image').style.setProperty('--image', `url('${image}')`);
    this.ViewPlayer.querySelector('.title').innerHTML = title;
    this.ViewPlayer.querySelector('.title').title = title || '';
  },
  renderStation: function () {
    const station = this.stations[this.getStationId()];
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
      el.querySelector('.title').innerText = item.title;
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
    this.AudioStatus.innerText = 'Buffering...';
  },
  handleError: function () {
    this.AudioStatus.innerText = '00:00:00';
    if (this.audio.error && this.audio.error.message.indexOf('Format error') > -1) {
      this.isPlaying = false;
      this.stopAudio();
    }
  },
  handleAutoPlay: function () {
    const searchParams = new URLSearchParams(window.location.search);
    const autoplay = searchParams.get('autoplay');
    if (autoplay === 'true') {
      this.isPlaying = true;
      this.playAudio().catch(() => {
        this.isPlaying = false;
        this.stopAudio();
      });
    }
  },
  switchView: function (view) {
    if (view === 'stations') {
      this.ViewPlayer.style.transform = 'translateY(-100%)';
      this.ViewStations.style.transform = 'translateY(-100%)';
    }
    if (view === 'player') {
      this.ViewPlayer.style.transform = 'translateY(0%)';
      this.ViewStations.style.transform = 'translateY(0%)';
    }
  },
  loadStations: function () {
    const stationsUpdated = localStorage.getItem('stations-updated');
    if (!stationsUpdated) {
      localStorage.setItem('stations-updated', JSON.stringify(this.stationsUpdated));
    } else {
      if (this.stationsUpdated !== JSON.parse(stationsUpdated)) {
        localStorage.setItem('stations-updated', JSON.stringify(this.stationsUpdated));
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
  getStationId: function () {
    const id = localStorage.getItem('stationId');
    if (id === null) {
      localStorage.setItem('stationId', '0');
      return 0;
    }
    return +id;
  },
  setStationId: function (id) {
    localStorage.setItem('stationId', id);
  },
  selectStation: function (id) {
    this.setStationId(id);

    this.isPlaying = false;
    this.toggleAudio();

    this.clearStationStatusTimer();

    setTimeout(() => {
      this.setDocumentTitle(this.appName);
      this.renderStation();
      this.renderStationLoading(true);
      this.startStationStatusTimer();

      this.switchView('player');
    }, 500);
  },
  switchStation: function (event) {
    const li = event.target.closest('li');
    const id = li.dataset.id;
    this.selectStation(id);
  },
  scrollStation: function (direction) {
    let currentId = this.getStationId();
    currentId += direction;

    if (currentId > -1 && currentId < this.stations.length) {
      this.selectStation(currentId);
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
    const station = this.stations[this.getStationId()];

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
    const currentTime = date.toISOString().substr(11, 8);

    this.AudioStatus.innerText = currentTime;
  },
  openMini: function () {
    window.open(window.location.href, null, 'width=420,height=160');
  },
  setMediaSession: function ({ title, artist, album, image }) {
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
    const station = this.stations[this.getStationId()];
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
    const combinedSignal = AbortSignal.any([this.loadStationStatusController.signal, timeoutSignal]);

    const fetcher = fetch(station.statusUrl, { signal: combinedSignal });

    switch (station.id) {
      case 0:
        const result0 = await fetcher.then((res) => res.json());
        if (!result0) throw new Error('No data');

        return {
          title: result0?.current_track?.title,
          image: result0?.current_track?.artwork_url_large,
        };
      default:
        // Shoutcast
        const resultText = await fetcher.then((res) => res.text());
        if (!resultText) throw new Error('No data');

        return {
          title: resultText,
        };
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
  setDocumentTitle: function (title) {
    document.title = title;
  },
  renderStationLoading: function (value) {
    if (value) {
      this.Shell.classList.add('shell--loading');
    } else {
      this.Shell.classList.remove('shell--loading');
    }
  },
  searchYouTube: function () {
    const q = encodeURIComponent(this.ViewPlayer.querySelector('.title').textContent);
    if (!q) return;
    const url = `https://www.youtube.com/results?search_query=${q}`;
    window.open(url, '_blank');
  },
};

App.init();
