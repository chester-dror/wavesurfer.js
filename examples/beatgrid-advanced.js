// Advanced Beatgrid plugin example with custom formatters

import WaveSurfer from 'wavesurfer.js'
import BeatgridPlugin from 'wavesurfer.js/dist/plugins/beatgrid.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

// Create a regions plugin instance
const regionsPlugin = RegionsPlugin.create()

// Create a beatgrid plugin instance with custom formatters
const beatgridPlugin = BeatgridPlugin.create({
  height: 40,
  bpm: 128,
  offset: 0.2,
  beatsPerBar: 4,
  showVerticalLines: true,
  fullHeightLines: false,
  showBarNumbers: true,
  showCurrentPosition: true,
  beatLineOpacity: 0.3,
  beatLineColor: '#4a6fa5',
  barLineColor: '#2c3e50',
  beatLineWidth: 1,
  barLineWidth: 2,
  // Custom formatter for bar numbers - add "Bar" prefix
  formatBarNumberCallback: (barNumber) => `Bar ${barNumber}`,
  // Custom formatter for current position - show as "Bar.Beat (Time)"
  formatCurrentPositionCallback: (bar, beat) => {
    const currentTime = wavesurfer.getCurrentTime().toFixed(2)
    return `${bar}.${beat} (${currentTime}s)`
  },
})

// Create an instance of WaveSurfer
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'rgb(32, 178, 170)',
  progressColor: 'rgb(0, 139, 139)',
  url: '/examples/audio/audio.wav',
  minPxPerSec: 100,
  plugins: [beatgridPlugin, regionsPlugin],
  height: 120,
  cursorColor: '#FF5733',
  cursorWidth: 2,
})

// Play on click
wavesurfer.on('interaction', () => {
  wavesurfer.play()
})

// Rewind to the beginning on finished playing
wavesurfer.on('finish', () => {
  wavesurfer.setTime(0)
})

// Display current position and BPM info
wavesurfer.on('timeupdate', (currentTime) => {
  document.querySelector('#currentTime').textContent = currentTime.toFixed(2)
  
  // Calculate current beat position
  const { bpm, offset, beatsPerBar } = beatgridPlugin.getOptions()
  const secPerBeat = 60 / bpm
  const beatPosition = Math.max(0, currentTime - offset) / secPerBeat
  const bar = Math.floor(beatPosition / beatsPerBar) + 1
  const beat = Math.floor(beatPosition % beatsPerBar) + 1
  
  document.querySelector('#currentBar').textContent = bar
  document.querySelector('#currentBeat').textContent = beat
  
  // Calculate tempo in milliseconds per beat
  const msPerBeat = (secPerBeat * 1000).toFixed(1)
  document.querySelector('#msPerBeat').textContent = msPerBeat
})

/*
<html>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
    .controls {
      margin: 15px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
    }
    .control-group {
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 8px;
      background: #f9f9f9;
      flex: 1;
      min-width: 250px;
    }
    .control-group h3 {
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 16px;
      color: #2c3e50;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
    }
    label {
      margin-right: 10px;
      display: inline-flex;
      align-items: center;
      margin-bottom: 8px;
    }
    input[type="number"] {
      width: 70px;
      padding: 5px;
      border-radius: 4px;
      border: 1px solid #ccc;
    }
    input[type="color"] {
      margin-right: 5px;
    }
    .playback-controls {
      margin-bottom: 20px;
      background: #2c3e50;
      padding: 15px;
      border-radius: 8px;
      color: white;
    }
    button {
      margin-right: 10px;
      padding: 8px 15px;
      background: #4a6fa5;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    button:hover {
      background: #5a8ac5;
    }
    #waveform {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      margin-top: 20px;
    }
    .current-info {
      display: inline-block;
      margin-left: 15px;
      font-family: monospace;
      background: rgba(255,255,255,0.2);
      padding: 5px 10px;
      border-radius: 4px;
    }
    .info-panel {
      margin-top: 20px;
      background: #f0f0f0;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    .info-item {
      background: white;
      padding: 10px;
      border-radius: 4px;
      border-left: 4px solid #4a6fa5;
    }
    .add-region {
      margin-top: 15px;
    }
  </style>

  <h1>Advanced Beatgrid Plugin Demo</h1>
  
  <div class="playback-controls">
    <button id="playPause">Play</button>
    <button id="stop">Stop</button>
    <span class="current-info">Time: <span id="currentTime">0.00</span>s</span>
    <span class="current-info">Position: <span id="currentBar">1</span>.<span id="currentBeat">1</span></span>
  </div>

  <div class="controls">
    <div class="control-group">
      <h3>Timing</h3>
      <div>
        <label>
          BPM: <input type="number" id="bpm" min="60" max="200" value="128" />
        </label><br>
        <label>
          Offset (sec): <input type="number" id="offset" min="0" max="10" step="0.01" value="0.2" />
        </label><br>
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
        </label><br>
        <label>
          <input type="checkbox" id="fullHeightLines" /> Full height lines
        </label><br>
        <label>
          <input type="checkbox" id="showBarNumbers" checked /> Show bar numbers
        </label><br>
        <label>
          <input type="checkbox" id="showCurrentPosition" checked /> Show current position
        </label>
      </div>
    </div>

    <div class="control-group">
      <h3>Appearance</h3>
      <div>
        <label>
          Beat Line Color: <input type="color" id="beatLineColor" value="#4a6fa5" />
        </label><br>
        <label>
          Bar Line Color: <input type="color" id="barLineColor" value="#2c3e50" />
        </label><br>
        <label>
          Beat Opacity: <input type="range" id="beatLineOpacity" min="0" max="1" step="0.05" value="0.3" />
        </label><br>
        <label>
          Height: <input type="range" id="height" min="20" max="100" value="40" />
        </label>
      </div>
    </div>
  </div>

  <div class="control-group">
    <h3>Zoom & Regions</h3>
    <div>
      <label>
        Zoom: <input type="range" id="zoom" min="10" max="1000" value="100" />
      </label>
      
      <div class="add-region">
        <button id="addRegion">Add Region at Current Position</button>
        <button id="clearRegions">Clear Regions</button>
      </div>
    </div>
  </div>

  <div id="waveform"></div>
  
  <div class="info-panel">
    <h3>Beat Information</h3>
    <div class="info-grid">
      <div class="info-item">
        <strong>BPM:</strong> <span id="displayBpm">128</span>
      </div>
      <div class="info-item">
        <strong>ms per beat:</strong> <span id="msPerBeat">468.8</span>ms
      </div>
      <div class="info-item">
        <strong>Current Bar:</strong> <span id="displayBar">1</span>
      </div>
      <div class="info-item">
        <strong>Current Beat:</strong> <span id="displayBeat">1</span>
      </div>
    </div>
  </div>
  
  <p>
    📖 <a href="https://wavesurfer.xyz/docs/classes/plugins_beatgrid.BeatgridPlugin">Beatgrid plugin docs</a>
  </p>
</html>
*/

// Add method to get options from the beatgrid plugin
BeatgridPlugin.prototype.getOptions = function() {
  return this.options;
};

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
  
  // Region controls
  const addRegionButton = document.querySelector('#addRegion')
  const clearRegionsButton = document.querySelector('#clearRegions')
  
  // Display elements
  const displayBpm = document.querySelector('#displayBpm')
  const displayBar = document.querySelector('#displayBar')
  const displayBeat = document.querySelector('#displayBeat')

  // Timing controls event listeners
  bpmInput.addEventListener('change', (e) => {
    const bpmValue = parseFloat(e.target.value)
    beatgridPlugin.setBPM(bpmValue)
    displayBpm.textContent = bpmValue
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
  
  // Update display elements on timeupdate
  wavesurfer.on('timeupdate', (currentTime) => {
    const { bpm, offset, beatsPerBar } = beatgridPlugin.getOptions()
    const secPerBeat = 60 / bpm
    const beatPosition = Math.max(0, currentTime - offset) / secPerBeat
    const bar = Math.floor(beatPosition / beatsPerBar) + 1
    const beat = Math.floor(beatPosition % beatsPerBar) + 1
    
    displayBar.textContent = bar
    displayBeat.textContent = beat
  })
  
  // Region controls
  addRegionButton.addEventListener('click', () => {
    const currentTime = wavesurfer.getCurrentTime()
    const { bpm, offset, beatsPerBar } = beatgridPlugin.getOptions()
    const secPerBeat = 60 / bpm
    const beatPosition = Math.max(0, currentTime - offset) / secPerBeat
    const bar = Math.floor(beatPosition / beatsPerBar) + 1
    const beat = Math.floor(beatPosition % beatsPerBar) + 1
    
    // Create a region at the current position that spans one bar
    const regionStart = currentTime
    const regionEnd = offset + ((bar * beatsPerBar) + beatsPerBar) * secPerBeat
    
    regionsPlugin.addRegion({
      start: regionStart,
      end: regionEnd,
      color: 'rgba(74, 111, 165, 0.3)',
      content: `Bar ${bar}.${beat}`,
    })
  })
  
  clearRegionsButton.addEventListener('click', () => {
    regionsPlugin.clearRegions()
  })
})
