const App = {
  audio: new Audio(),
  isPlaying: false,
  stationsUpdated: '2023-06-18',
  stations: [
    {
      id: 0,
      title: 'Radio 10',
      image: 'img/stations/radio10.jpg',
      url: 'https://s5.radio.co/s85a633f73/listen',
    },
    {
      id: 1,
      title: 'NIO FM',
      image: 'img/stations/nio.jpg',
      url: 'https://surilive.com:8010/;',
    },
    {
      id: 2,
      title: 'Beat FM',
      image: 'img/stations/beatfm.jpg',
      url: 'https://audio-edge-cmc51.fra.h.radiomast.io/a263a766-cea5-49e2-87c7-b2e9c9f5740c',
    },
    {
      id: 3,
      title: 'Radio Garuda',
      image: 'img/stations/garuda.jpg',
      url: 'https://ngxproxy.onrender.com/http://162.244.80.245:8012/stream',
    },
  ],
  init: function() {
    this.cacheDom();
    this.bindEvents();
    this.setAudio();
    this.loadStations();
    this.renderTemplate();
    this.renderPlayer();
    this.renderStations();
  },
  cacheDom: function() {
    // Templates
    this.ListItem = document.querySelector('#ListItem');
    this.IconPlay = document.querySelector('#IconPlay');
    this.IconPause = document.querySelector('#IconPause');

    // Elements
    this.ViewPlayer = document.querySelector('#ViewPlayer');
    this.ViewStations = document.querySelector('#ViewStations');
    this.Stations = document.querySelector('#Stations');
    this.AudioStatus = document.querySelector('#AudioStatus');
    this.ButtonToggleAudio = document.querySelector('#ButtonToggleAudio');
    this.ButtonToStations = document.querySelector('#ButtonToStations');
    this.ButtonToPlayer = document.querySelector('#ButtonToPlayer');
  },
  bindEvents: function() {
    this.Stations.onclick = this.switchStation.bind(this);
    this.ButtonToggleAudio.onclick = this.toggleAudio.bind(this);
    this.ButtonToStations.onclick = this.switchView.bind(this, 'stations');
    this.ButtonToPlayer.onclick = this.switchView.bind(this, 'player');

    this.audio.ontimeupdate = this.updateTime.bind(this);
    this.audio.onloadstart = this.handleBuffering.bind(this);
    this.audio.onstalled = this.handleBuffering.bind(this);
    this.audio.onerror = this.handleError.bind(this);

    document.onkeydown = this.handleKeydown.bind(this);

    this.handleMediaSessionActions();
  },
  renderTemplate: function() {
    this.ButtonToggleAudio.innerHTML = this.IconPlay.innerHTML;
  },
  renderPlayer: function() {
    const station = this.stations[this.getStationId()];
    this.ViewPlayer.querySelector('.image').src = station.image;
    this.ViewPlayer.querySelector('.title').innerText = station.title;
  },
  renderStations: function() {
    this.stations.forEach(item => {
      const el = document.importNode(this.ListItem.content, true);
      el.querySelector('li').setAttribute('data-id', item.id);
      el.querySelector('.image').src = item.image;
      el.querySelector('.title').innerText = item.title;
      this.Stations.appendChild(el);
    });
  },
  handleKeydown: function(event) {
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
  handleBuffering: function() {
    this.AudioStatus.innerText = 'Buffering...';
  },
  handleError: function() {
    this.AudioStatus.innerText = '00:00:00';
    if (
      this.audio.error &&
      this.audio.error.message.indexOf('Format error') > -1
    ) {
      this.isPlaying = false;
      this.stopAudio();
    }
  },
  switchView: function(view) {
    if (view === 'stations') {
      this.ViewPlayer.style.transform = 'translateY(-100%)';
      this.ViewStations.style.transform = 'translateY(-100%)';
    }
    if (view === 'player') {
      this.ViewPlayer.style.transform = 'translateY(0%)';
      this.ViewStations.style.transform = 'translateY(0%)';
    }
  },
  loadStations: function() {
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
  getStationId: function() {
    const id = localStorage.getItem('stationId');
    if (id === null) {
      localStorage.setItem('stationId', '0');
      return 0;
    }
    return +id;
  },
  setStationId: function(id) {
    localStorage.setItem('stationId', id);
  },
  selectStation: function(id) {
    this.setStationId(id);

    this.isPlaying = true;
    this.toggleAudio();

    this.switchView('player');
    this.renderPlayer();
  },
  switchStation: function(event) {
    const li = event.target.closest('li');
    const id = li.dataset.id;
    this.selectStation(id);
  },
  scrollStation: function(direction) {
    let currentId = this.getStationId();
    currentId += direction;

    if (currentId > -1 && currentId < this.stations.length) {
      this.selectStation(currentId);
      this.playAudio();
    }
  },
  setAudio: function() {
    this.audio.src = '';
    this.audio.preload = '';
    this.audio.autoplay = false;
  },
  toggleAudio: function() {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.playAudio();
    } else {
      this.stopAudio();
    }
  },
  playAudio: function() {
    this.audio.src = this.stations[this.getStationId()].url;
    this.audio.play();
    this.ButtonToggleAudio.innerHTML = this.IconPause.innerHTML;

    this.setMediaSession();
  },
  stopAudio: function() {
    this.audio.src = '';
    this.audio.pause();
    this.ButtonToggleAudio.innerHTML = this.IconPlay.innerHTML;
  },
  updateTime: function() {
    const date = new Date(null);
    date.setSeconds(this.audio.currentTime);
    const currentTime = date.toISOString().substr(11, 8);

    this.AudioStatus.innerText = currentTime;
  },
  openMini: function() {
    window.open(window.location.href, null, 'width=420,height=160');
  },
  setMediaSession: function() {
    const { title, image } = this.stations[this.getStationId()];

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artwork: [
          {
            src: image,
            sizes: '145x145',
            type: 'image/jpg'
          }
        ]
      });
    }
  },
  handleMediaSessionActions: function() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.scrollStation(-1);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.scrollStation(1);
      });
    }
  }
};

App.init();
