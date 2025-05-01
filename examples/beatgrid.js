// Advanced Beatgrid plugin example

import WaveSurfer from 'wavesurfer.js'
import BeatgridPlugin from 'wavesurfer.js/dist/plugins/beatgrid.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'

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
  currentPositionPlacement: 'center',
  currentPositionColor: '#ccc',
  beatLineOpacity: 0.25,
  beatLineColor: '#0066cc',
  barLineColor: '#0033cc',
  beatLineWidth: 1,
  barLineWidth: 2,
  // Custom formatter for bar numbers
  formatBarNumberCallback: (barNumber) => `${barNumber}`,
  // Custom formatter for current position display
  formatCurrentPositionCallback: (bar, beat) => `${bar}.${beat}`,
})

// Create a timeline plugin for comparison
const timelinePlugin = TimelinePlugin.create({
  height: 20,
  insertPosition: 'beforebegin',
})

// Create an instance of WaveSurfer
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'rgb(0, 200, 200)',
  progressColor: 'rgb(0, 100, 100)',
  url: '/examples/audio/audio.wav',
  minPxPerSec: 100,
  plugins: [beatgridPlugin, timelinePlugin],
  height: 100,
})

// Play on click
wavesurfer.on('interaction', () => {
  wavesurfer.play()
})

// Rewind to the beginning on finished playing
wavesurfer.on('finish', () => {
  wavesurfer.setTime(0)
})

// Display current position in the console
wavesurfer.on('timeupdate', (currentTime) => {
  document.querySelector('#currentTime').textContent = currentTime.toFixed(2)
})

/*
<html>
  <style>
    .controls {
      margin: 15px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .control-group {
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 5px;
      background: #f9f9f9;
    }
    .control-group h3 {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 14px;
    }
    label {
      margin-right: 10px;
      display: inline-flex;
      align-items: center;
    }
    input[type="number"] {
      width: 60px;
    }
    input[type="color"] {
      margin-right: 5px;
    }
    .playback-controls {
      margin-bottom: 15px;
    }
    button {
      margin-right: 5px;
      padding: 5px 10px;
    }
    #waveform {
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .current-info {
      margin-top: 10px;
      font-family: monospace;
    }
  </style>

  <div class="playback-controls">
    <button id="playPause">Play/Pause</button>
    <button id="stop">Stop</button>
    <span class="current-info">Current Time: <span id="currentTime">0.00</span>s</span>
  </div>

  <div class="controls">
    <div class="control-group">
      <h3>Timing</h3>
      <div>
        <label>
          BPM: <input type="number" id="bpm" min="60" max="200" value="128" />
        </label>
        <label>
          Offset (sec): <input type="number" id="offset" min="0" max="10" step="0.01" value="0.2" />
        </label>
        <label>
          Beats per bar: <input type="number" id="beatsPerBar" min="2" max="12" value="4" />
        </label>
      </div>
    </div>

    <div class="control-group">
      <h3>Display Options</h3>
      <div>
        <label>
          <input type="checkbox" id="showVerticalLines" checked /> Show lines
        </label>
        <label>
          <input type="checkbox" id="fullHeightLines" checked /> Full height lines
        </label>
        <label>
          <input type="checkbox" id="showBarNumbers" checked /> Show bar numbers
        </label>
        <label>
          <input type="checkbox" id="showCurrentPosition" checked /> Show current position
        </label>
      </div>
    </div>

    <div class="control-group">
      <h3>Appearance</h3>
      <div>
        <label>
          Beat Line Color: <input type="color" id="beatLineColor" value="#0066cc" />
        </label>
        <label>
          Bar Line Color: <input type="color" id="barLineColor" value="#0033cc" />
        </label>
        <label>
          Beat Opacity: <input type="range" id="beatLineOpacity" min="0" max="1" step="0.05" value="0.25" />
        </label>
        <label>
          Height: <input type="range" id="height" min="20" max="100" value="30" />
        </label>
      </div>
    </div>

    <div class="control-group">
      <h3>Zoom</h3>
      <div>
        <label>
          Zoom: <input type="range" id="zoom" min="10" max="1000" value="100" />
        </label>
      </div>
    </div>
  </div>

  <div id="waveform"></div>
  <p>
    📖 <a href="https://wavesurfer.xyz/docs/classes/plugins_beatgrid.BeatgridPlugin">Beatgrid plugin docs</a>
  </p>
</html>
*/

// Update the beatgrid settings when inputs change
wavesurfer.once('decode', () => {
  // Timing controls
  const bpmInput = document.querySelector('#bpm')
  const offsetInput = document.querySelector('#offset')
  const beatsPerBarInput = document.querySelector('#beatsPerBar')

  // Display options
  const showVerticalLinesInput = document.querySelector('#showVerticalLines')
  const fullHeightLinesInput = document.querySelector('#fullHeightLines')
  const showBarNumbersInput = document.querySelector('#showBarNumbers')
  const showCurrentPositionInput = document.querySelector('#showCurrentPosition')

  // Appearance controls
  const beatLineColorInput = document.querySelector('#beatLineColor')
  const barLineColorInput = document.querySelector('#barLineColor')
  const beatLineOpacityInput = document.querySelector('#beatLineOpacity')
  const heightInput = document.querySelector('#height')

  // Zoom control
  const zoomInput = document.querySelector('#zoom')

  // Playback controls
  const playPauseButton = document.querySelector('#playPause')
  const stopButton = document.querySelector('#stop')

  // Timing controls event listeners
  bpmInput.addEventListener('change', (e) => {
    beatgridPlugin.setBPM(parseFloat(e.target.value))
  })

  offsetInput.addEventListener('change', (e) => {
    beatgridPlugin.setOffset(parseFloat(e.target.value))
  })

  beatsPerBarInput.addEventListener('change', (e) => {
    beatgridPlugin.setBeatsPerBar(parseInt(e.target.value))
  })

  // Display options event listeners
  showVerticalLinesInput.addEventListener('change', (e) => {
    beatgridPlugin.setOptions({ showVerticalLines: e.target.checked })
  })

  fullHeightLinesInput.addEventListener('change', (e) => {
    beatgridPlugin.setOptions({ fullHeightLines: e.target.checked })
  })

  showBarNumbersInput.addEventListener('change', (e) => {
    beatgridPlugin.setOptions({ showBarNumbers: e.target.checked })
  })

  showCurrentPositionInput.addEventListener('change', (e) => {
    beatgridPlugin.setOptions({ showCurrentPosition: e.target.checked })
  })

  // Appearance controls event listeners
  beatLineColorInput.addEventListener('change', (e) => {
    beatgridPlugin.setOptions({ beatLineColor: e.target.value })
  })

  barLineColorInput.addEventListener('change', (e) => {
    beatgridPlugin.setOptions({ barLineColor: e.target.value })
  })

  beatLineOpacityInput.addEventListener('input', (e) => {
    beatgridPlugin.setOptions({ beatLineOpacity: parseFloat(e.target.value) })
  })

  heightInput.addEventListener('input', (e) => {
    beatgridPlugin.setOptions({ height: parseInt(e.target.value) })
  })

  // Zoom control event listener
  zoomInput.addEventListener('input', (e) => {
    const minPxPerSec = e.target.valueAsNumber
    wavesurfer.zoom(minPxPerSec)
  })

  // Playback controls event listeners
  playPauseButton.addEventListener('click', () => {
    wavesurfer.playPause()
  })

  stopButton.addEventListener('click', () => {
    wavesurfer.stop()
  })

  // Update button text on play/pause
  wavesurfer.on('play', () => {
    playPauseButton.textContent = 'Pause'
  })

  wavesurfer.on('pause', () => {
    playPauseButton.textContent = 'Play'
  })
})
