import './style.css'
import Hls from 'hls.js'

const STORAGE_KEY = 'multistream_channels'
const GRID_SIZE_KEY = 'multistream_gridsize'

let channels = []
let currentGridSize = 4
let hlsInstances = []

const elements = {
  streamGrid: document.getElementById('streamGrid'),
  gridSize: document.getElementById('gridSize'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeModal: document.getElementById('closeModal'),
  channelsList: document.getElementById('channelsList'),
  channelName: document.getElementById('channelName'),
  channelUrl: document.getElementById('channelUrl'),
  streamType: document.getElementById('streamType'),
  addChannel: document.getElementById('addChannel')
}

function loadFromStorage() {
  const savedChannels = localStorage.getItem(STORAGE_KEY)
  const savedGridSize = localStorage.getItem(GRID_SIZE_KEY)

  if (savedChannels) {
    channels = JSON.parse(savedChannels)
  }

  if (savedGridSize) {
    currentGridSize = parseInt(savedGridSize)
    elements.gridSize.value = currentGridSize
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
  localStorage.setItem(GRID_SIZE_KEY, currentGridSize.toString())
}

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return url
}

function createStreamContainer(index) {
  const container = document.createElement('div')
  container.className = 'stream-container'
  container.dataset.index = index

  if (channels[index]) {
    const channel = channels[index]

    const label = document.createElement('div')
    label.className = 'stream-label'
    label.textContent = channel.name
    container.appendChild(label)

    if (channel.type === 'youtube') {
      const videoId = extractYouTubeId(channel.url)
      const iframe = document.createElement('iframe')
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1`
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
      iframe.allowFullscreen = true
      container.appendChild(iframe)
    } else if (channel.type === 'm3u8') {
      const video = document.createElement('video')
      video.controls = true
      video.muted = true
      video.autoplay = true
      video.playsInline = true

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        })
        hls.loadSource(channel.url)
        hls.attachMedia(video)
        hlsInstances.push(hls)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log('Autoplay prevented:', e))
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = channel.url
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.log('Autoplay prevented:', e))
        })
      }

      container.appendChild(video)
    }
  } else {
    const placeholder = document.createElement('div')
    placeholder.className = 'stream-placeholder'
    placeholder.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
        <line x1="7" y1="2" x2="7" y2="22"></line>
        <line x1="17" y1="2" x2="17" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <line x1="2" y1="7" x2="7" y2="7"></line>
        <line x1="2" y1="17" x2="7" y2="17"></line>
        <line x1="17" y1="17" x2="22" y2="17"></line>
        <line x1="17" y1="7" x2="22" y2="7"></line>
      </svg>
      <span>Slot ${index + 1}</span>
      <span style="font-size: 0.85rem;">Add channel in settings</span>
    `
    container.appendChild(placeholder)
  }

  return container
}

function cleanupHlsInstances() {
  hlsInstances.forEach(hls => {
    try {
      hls.destroy()
    } catch (e) {
      console.error('Error destroying HLS instance:', e)
    }
  })
  hlsInstances = []
}

function renderGrid() {
  cleanupHlsInstances()
  elements.streamGrid.innerHTML = ''
  elements.streamGrid.className = `stream-grid grid-${currentGridSize}`

  for (let i = 0; i < currentGridSize; i++) {
    const container = createStreamContainer(i)
    elements.streamGrid.appendChild(container)
  }
}

function renderChannelsList() {
  if (channels.length === 0) {
    elements.channelsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No channels added yet</p>'
    return
  }

  elements.channelsList.innerHTML = channels.map((channel, index) => `
    <div class="channel-item">
      <div class="channel-info">
        <h4>${channel.name}</h4>
        <p>${channel.url}</p>
        <span class="channel-badge">${channel.type.toUpperCase()}</span>
      </div>
      <button class="btn btn-delete" data-index="${index}">Delete</button>
    </div>
  `).join('')

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index)
      deleteChannel(index)
    })
  })
}

function addChannel() {
  const name = elements.channelName.value.trim()
  const url = elements.channelUrl.value.trim()
  const type = elements.streamType.value

  if (!name || !url) {
    alert('Please fill in both name and URL')
    return
  }

  channels.push({ name, url, type })
  saveToStorage()
  renderChannelsList()
  renderGrid()

  elements.channelName.value = ''
  elements.channelUrl.value = ''
}

function deleteChannel(index) {
  if (confirm('Are you sure you want to delete this channel?')) {
    channels.splice(index, 1)
    saveToStorage()
    renderChannelsList()
    renderGrid()
  }
}

function openModal() {
  elements.settingsModal.classList.add('active')
  renderChannelsList()
}

function closeModal() {
  elements.settingsModal.classList.remove('active')
}

elements.gridSize.addEventListener('change', (e) => {
  currentGridSize = parseInt(e.target.value)
  saveToStorage()
  renderGrid()
})

elements.settingsBtn.addEventListener('click', openModal)
elements.closeModal.addEventListener('click', closeModal)

elements.settingsModal.addEventListener('click', (e) => {
  if (e.target === elements.settingsModal) {
    closeModal()
  }
})

elements.addChannel.addEventListener('click', addChannel)

elements.channelName.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    elements.channelUrl.focus()
  }
})

elements.channelUrl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addChannel()
  }
})

loadFromStorage()
renderGrid()
