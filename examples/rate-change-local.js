// Rate Change with Local File Upload Example

import WaveSurfer from 'wavesurfer.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import BeatgridPlugin from 'wavesurfer.js/dist/plugins/beatgrid.esm.js'

/*
<html>
  <div style="margin: 20px 0;">
    <input type="file" id="file-input" accept="audio/*" />
  </div>

  <div style="display: flex; margin: 20px 0; gap: 20px; align-items: center;">
    <button id="play-pause">Play</button>
    
    <div>
      <label for="rate-slider">Playback Rate: <span id="rate-value">1.00</span>x</label>
      <div style="display: flex; align-items: center;">
        <span>0.25x</span>
        <input type="range" id="rate-slider" min="0.25" max="4" step="0.05" value="1" style="width: 200px; margin: 0 10px;" />
        <span>4x</span>
      </div>
    </div>
    
    <label>
      <input type="checkbox" id="preserve-pitch" checked />
      Preserve Pitch
    </label>
  </div>

  <div id="waveform" style="margin-bottom: 10px;"></div>
  <div id="timeline"></div>
  
  <div style="margin: 20px 0;">
    <div>
      <label for="bpm-input">BPM:</label>
      <input type="number" id="bpm-input" min="1" max="300" value="120" style="width: 60px;" />
      <button id="apply-bpm">Apply</button>
    </div>
    <div id="beatgrid" style="margin-top: 10px;"></div>
  </div>
  
  <div style="margin: 20px 0;">
    <p>Current Time: <span id="current-time">0.00</span> seconds</p>
    <p>Duration: <span id="duration">0.00</span> seconds</p>
  </div>
</html>
*/

// Create timeline plugin
const timelinePlugin = TimelinePlugin.create({
  container: '#timeline',
  height: 20
})

// Create beatgrid plugin
const beatgridPlugin = BeatgridPlugin.create({
  container: '#beatgrid',
  height: 30,
  bpm: 120,
  showBarNumbers: true,
  showCurrentPosition: true,
  currentPositionPlacement: 'top-right'
})

// Create an instance of WaveSurfer
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'rgb(32, 178, 170)',
  progressColor: 'rgb(0, 139, 139)',
  height: 100,
  minPxPerSec: 100,
  plugins: [timelinePlugin, beatgridPlugin]
})

// File upload handler
document.getElementById('file-input').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (file) {
    const objectUrl = URL.createObjectURL(file)
    wavesurfer.load(objectUrl)
    
    // Update the page title with the file name
    document.title = `Rate Change - ${file.name}`
  }
})

// Play/Pause button
const playPauseButton = document.getElementById('play-pause')
playPauseButton.addEventListener('click', () => {
  wavesurfer.playPause()
})

// Update button text on play/pause
wavesurfer.on('play', () => {
  playPauseButton.textContent = 'Pause'
})

wavesurfer.on('pause', () => {
  playPauseButton.textContent = 'Play'
})

// Rate slider
const rateSlider = document.getElementById('rate-slider')
const rateValue = document.getElementById('rate-value')

rateSlider.addEventListener('input', () => {
  const rate = parseFloat(rateSlider.value)
  rateValue.textContent = rate.toFixed(2)
  
  const preservePitch = document.getElementById('preserve-pitch').checked
  wavesurfer.setPlaybackRate(rate, preservePitch)
})

// Preserve pitch checkbox
document.getElementById('preserve-pitch').addEventListener('change', () => {
  const rate = parseFloat(rateSlider.value)
  const preservePitch = document.getElementById('preserve-pitch').checked
  wavesurfer.setPlaybackRate(rate, preservePitch)
})

// BPM input
document.getElementById('apply-bpm').addEventListener('click', () => {
  const bpm = parseInt(document.getElementById('bpm-input').value, 10)
  if (bpm > 0) {
    beatgridPlugin.setBPM(bpm)
  }
})

// Update time display
wavesurfer.on('timeupdate', (currentTime) => {
  document.getElementById('current-time').textContent = currentTime.toFixed(2)
})

// Update duration display
wavesurfer.on('ready', (duration) => {
  document.getElementById('duration').textContent = duration.toFixed(2)
  playPauseButton.disabled = false
})

// Disable play button until audio is ready
playPauseButton.disabled = true

// Handle errors
wavesurfer.on('error', (error) => {
  console.error('WaveSurfer error:', error)
  alert(`Error: ${error.message || 'Failed to load audio'}`)
})