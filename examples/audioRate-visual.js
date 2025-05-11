// AudioRate Visual Effects Example
// This example demonstrates how audioRate affects the waveform, timeline, and beatgrid

import WaveSurfer from 'wavesurfer.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import BeatgridPlugin from 'wavesurfer.js/dist/plugins/beatgrid.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

// Create a timeline plugin instance
const timelinePlugin = TimelinePlugin.create({
  height: 20,
  insertPosition: 'beforebegin',
})

// Create a beatgrid plugin instance
const beatgridPlugin = BeatgridPlugin.create({
  height: 30,
  bpm: 128,
  offset: 0.2,
  beatsPerBar: 4,
  showVerticalLines: true,
  fullHeightLines: true,
  showBarNumbers: true,
  showCurrentPosition: true,
  currentPositionPlacement: 'top-right',
  currentPositionColor: '#ccc',
  beatLineOpacity: 0.25,
  beatLineColor: '#0066cc',
  barLineColor: '#0033cc',
  beatLineWidth: 1,
  barLineWidth: 2,
})

// Create a regions plugin for visual reference
const regionsPlugin = RegionsPlugin.create({
  dragSelection: true,
})

// Create an instance of WaveSurfer
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'rgb(0, 200, 200)',
  progressColor: 'rgb(0, 100, 100)',
  url: '/examples/audio/audio.wav',
  minPxPerSec: 100,
  height: 100,
  audioRate: 1.0, // Initial playback rate
  plugins: [timelinePlugin, beatgridPlugin, regionsPlugin],
})

// Create a reference region at the beginning
wavesurfer.on('ready', () => {
  // Add a reference region at the beginning (1 second)
  regionsPlugin.addRegion({
    start: 0,
    end: 1,
    color: 'rgba(255, 0, 0, 0.2)',
    content: '1 second reference',
  })
  
  // Display initial total duration
  document.querySelector('#totalTime').textContent = wavesurfer.getDuration().toFixed(2)
})

// Play on click
wavesurfer.on('interaction', () => {
  wavesurfer.play()
})

// Display current time
wavesurfer.on('timeupdate', (currentTime) => {
  document.querySelector('#currentTime').textContent = currentTime.toFixed(2)
  // Update total duration in real-time
  document.querySelector('#totalTime').textContent = wavesurfer.getDuration().toFixed(2)
})

// Set up UI controls
document.addEventListener('DOMContentLoaded', () => {
  // Play/Pause button
  document.querySelector('#playPause').addEventListener('click', () => {
    wavesurfer.playPause()
  })

  // Rate slider
  document.querySelector('#rateSlider').addEventListener('input', (e) => {
    const rate = parseFloat(e.target.value)
    document.querySelector('#rateValue').textContent = rate.toFixed(2)
    wavesurfer.setPlaybackRate(rate)
    // Duration will be updated via the timeupdate event
  })

  // Zoom slider
  document.querySelector('#zoomSlider').addEventListener('input', (e) => {
    const zoom = parseInt(e.target.value)
    document.querySelector('#zoomValue').textContent = zoom
    wavesurfer.zoom(zoom)
  })

  // Plugin visibility toggles
  document.querySelector('#timelineToggle').addEventListener('change', (e) => {
    const timelineWrapper = document.querySelector('[part="timeline-wrapper"]')
    if (timelineWrapper) {
      timelineWrapper.style.display = e.target.checked ? 'block' : 'none'
    }
  })

  document.querySelector('#beatgridToggle').addEventListener('change', (e) => {
    const beatgridWrapper = document.querySelector('[part="beatgrid-wrapper"]')
    if (beatgridWrapper) {
      beatgridWrapper.style.display = e.target.checked ? 'block' : 'none'
    }
  })

  document.querySelector('#regionsToggle').addEventListener('change', (e) => {
    const regionsElements = document.querySelectorAll('.wavesurfer-region')
    regionsElements.forEach(el => {
      el.style.display = e.target.checked ? 'block' : 'none'
    })
  })
})

/*
<html>
  <div class="controls">
    <button id="playPause">Play/Pause</button>
    
    <div class="control-group">
      <label>
        Playback Rate: <span id="rateValue">1.00</span>x
        <input type="range" id="rateSlider" min="0.5" max="2" step="0.1" value="1">
      </label>
    </div>
    
    <div class="control-group">
      <label>
        Zoom: <span id="zoomValue">100</span> px/sec
        <input type="range" id="zoomSlider" min="20" max="500" value="100">
      </label>
    </div>
    
    <div class="control-group">
      <label>
        <input type="checkbox" id="timelineToggle" checked>
        Show Timeline
      </label>
      <label>
        <input type="checkbox" id="beatgridToggle" checked>
        Show Beatgrid
      </label>
      <label>
        <input type="checkbox" id="regionsToggle" checked>
        Show Regions
      </label>
    </div>
    
    <div class="info">
      Current Time: <span id="currentTime">0.00</span>s | Total Duration: <span id="totalTime">0.00</span>s
    </div>
  </div>
  
  <div id="waveform"></div>
  
  <div class="explanation">
    <h3>AudioRate Visual Effects</h3>
    <p>This example demonstrates how changing the audioRate affects the visual representation:</p>
    <ul>
      <li><strong>Waveform:</strong> Higher rate = lower zoom (more compressed waveform)</li>
      <li><strong>Timeline:</strong> Higher rate = shorter track duration display</li>
      <li><strong>Beatgrid:</strong> Higher rate = closer beat/bar markers</li>
    </ul>
    <p>The 1-second reference region helps visualize how the time scale changes with different rates.</p>
  </div>
  
  <style>
    .controls {
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 4px;
    }
    .control-group {
      margin: 1rem 0;
    }
    .control-group label {
      margin-right: 1rem;
    }
    .info {
      margin-top: 1rem;
      font-weight: bold;
    }
    .explanation {
      margin-top: 2rem;
      padding: 1rem;
      border-radius: 4px;
    }
  </style>
</html>
*/




