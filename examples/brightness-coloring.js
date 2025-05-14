// Brightness-based coloring example

import WaveSurfer from 'wavesurfer.js'

// Create an instance of WaveSurfer with brightness-based coloring enabled
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: '#4F4A85',
  progressColor: '#383351',
  url: '/examples/audio/siren.wav',
  barWidth: 2,
  barGap: 1,
  barRadius: 3,

  // Enable brightness-based coloring
  colorizeByBrightness: true,

  // Custom color stops for brightness values
  brightnessColors: [
    { stop: 0, color: 'rgb(255, 0, 0)' },     // Very Low brightness -> Red
    { stop: 0.1, color: 'rgb(255, 69, 0)' },   // Low brightness -> Red-Orange
    { stop: 0.2, color: 'rgb(255, 165, 0)' }, // Low-Mid -> Orange
    { stop: 0.3, color: 'rgb(255, 255, 0)' },  // Mid -> Yellow
    { stop: 0.5, color: 'rgb(144, 238, 144)' },// Mid-High -> Light Green
    { stop: 0.7, color: 'rgb(0, 128, 0)' },   // High brightness -> Green
    { stop: 1, color: 'rgb(0, 191, 255)' }     // Very High brightness -> Deep Sky Blue
  ],
  // Apply a power transformation to stretch the distribution of brightness values
  normalizationPower: 2,
})

// Create a second instance with prominent frequency coloring for comparison
const wavesurferFrequency = WaveSurfer.create({
  container: '#waveform-frequency',
  waveColor: '#4F4A85',
  progressColor: '#383351',
  url: '/examples/audio/siren.wav',
  barWidth: 2,
  barGap: 1,
  barRadius: 3,

  // Enable prominent frequency coloring
  colorizeByBrightness: true,
  colorAnalysisType: 'prominentFrequency',
  // Apply a power transformation to stretch the distribution of prominent frequency values
  normalizationPower: 0.5, // Keep this at 0.5 for comparison
})

// UI controls
document.addEventListener('DOMContentLoaded', () => {
  // Play/pause button
  const playButton = document.querySelector('#play')
  playButton.onclick = () => {
    wavesurfer.playPause()
    wavesurferFrequency.playPause()
  }

  // Toggle brightness coloring
  const toggleButton = document.querySelector('#toggle-brightness')
  toggleButton.onclick = () => {
    const isEnabled = wavesurfer.options.colorizeByBrightness
    wavesurfer.setOptions({
      colorizeByBrightness: !isEnabled,
    })
  }

  // Color scheme selector
  const schemeSelector = document.querySelector('#color-scheme')
  schemeSelector.onchange = (e) => {
    const scheme = e.target.value
    let colors = []

    switch (scheme) {
      case 'default':
        colors = [
          { stop: 0, color: 'rgb(255, 0, 0)' },      // Low brightness -> Red
          { stop: 0.25, color: 'rgb(255, 165, 0)' }, // Low-Mid -> Orange
          { stop: 0.5, color: 'rgb(255, 255, 0)' },  // Mid -> Yellow
          { stop: 0.75, color: 'rgb(0, 255, 0)' },   // Mid-High -> Green
          { stop: 1, color: 'rgb(0, 191, 255)' }     // High brightness -> Deep Sky Blue
        ]
        break
      case 'grayscale':
        colors = [
          { stop: 0, color: 'rgb(20, 20, 20)' },     // Low brightness -> Dark gray
          { stop: 0.33, color: 'rgb(85, 85, 85)' },  // Low-Mid -> Dark-medium gray
          { stop: 0.66, color: 'rgb(170, 170, 170)' }, // Mid-High -> Light-medium gray
          { stop: 1, color: 'rgb(235, 235, 235)' }   // High brightness -> Light gray
        ]
        break
      case 'rainbow':
        colors = [
          { stop: 0, color: 'rgb(148, 0, 211)' },    // Violet
          { stop: 0.2, color: 'rgb(75, 0, 130)' },   // Indigo
          { stop: 0.4, color: 'rgb(0, 0, 255)' },    // Blue
          { stop: 0.6, color: 'rgb(0, 255, 0)' },    // Green
          { stop: 0.8, color: 'rgb(255, 255, 0)' },  // Yellow
          { stop: 1, color: 'rgb(255, 0, 0)' }       // Red
        ]
        break
      case 'ocean':
        colors = [
          { stop: 0, color: 'rgb(0, 0, 50)' },       // Deep blue
          { stop: 0.25, color: 'rgb(0, 20, 100)' },  // Navy blue
          { stop: 0.5, color: 'rgb(0, 80, 170)' },   // Medium blue
          { stop: 0.75, color: 'rgb(0, 150, 200)' }, // Light blue
          { stop: 1, color: 'rgb(200, 255, 255)' }   // Cyan
        ]
        break
      case 'heat':
        colors = [
          { stop: 0, color: 'rgb(0, 0, 0)' },        // Black
          { stop: 0.25, color: 'rgb(128, 0, 0)' },   // Dark red
          { stop: 0.5, color: 'rgb(255, 0, 0)' },    // Red
          { stop: 0.75, color: 'rgb(255, 128, 0)' }, // Orange
          { stop: 1, color: 'rgb(255, 255, 0)' }     // Yellow
        ]
        break
      case 'plasma':
        colors = [
          { stop: 0, color: 'rgb(13, 8, 135)' },     // Deep blue
          { stop: 0.25, color: 'rgb(84, 39, 143)' }, // Purple
          { stop: 0.5, color: 'rgb(158, 51, 110)' }, // Magenta
          { stop: 0.75, color: 'rgb(213, 81, 65)' }, // Orange-red
          { stop: 1, color: 'rgb(240, 249, 33)' }    // Yellow
        ]
        break
    }

    wavesurfer.setOptions({
      brightnessColors: colors,
    })
  }
})

// Update the DOM
wavesurfer.on('ready', () => {
  document.querySelector('#loading').style.display = 'none'
})

// Log any errors
wavesurfer.on('error', (err) => {
  console.error(err)
})

/*
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>WaveSurfer.js | Brightness-based Coloring</title>
    <link rel="stylesheet" href="/examples/style.css" />
    <style>
      .waveform-container {
        margin-bottom: 20px;
      }
      .controls {
        margin: 20px 0;
        display: flex;
        gap: 10px;
        align-items: center;
      }
      select, button {
        padding: 5px 10px;
        border-radius: 4px;
        border: 1px solid #ccc;
      }
      .description {
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f5f5f5;
        border-radius: 4px;
      }
    </style>
  </head>

  <body>
    <div class="container">
      <div id="demo">
        <h1>
          Brightness-based Waveform Coloring
          <small>
            Color waveform segments based on audio brightness (spectral centroid)
          </small>
        </h1>

        <div class="description">
          <p>
            This example demonstrates coloring the waveform based on the spectral centroid (brightness) of the audio.
            Areas with higher frequency content appear in different colors than areas with lower frequency content.
          </p>
          <p>
            The spectral centroid is a measure that indicates where the "center of mass" of the spectrum is located.
            Perceptually, it has a robust connection with the impression of "brightness" of a sound.
          </p>
          <p>
            The implementation uses FFT analysis to calculate the spectral centroid for each segment of the audio.
            The brightness values are normalized across the entire audio to ensure a full range of colors,
            and color intensity is adjusted based on how well each segment matches its color range.
          </p>
        </div>

        <div class="controls">
          <button id="play" class="btn btn-primary">
            <i class="glyphicon glyphicon-play"></i>
            Play / Pause
          </button>

          <button id="toggle-brightness" class="btn">
            Toggle Brightness Coloring
          </button>

          <div>
            <label for="color-scheme">Color Scheme:</label>
            <select id="color-scheme">
              <option value="default">Default</option>
              <option value="grayscale">Grayscale</option>
              <option value="rainbow">Rainbow</option>
              <option value="ocean">Ocean</option>
              <option value="heat">Heat</option>
              <option value="plasma">Plasma</option>
            </select>
          </div>
        </div>

        <h3>With Brightness Coloring</h3>
        <div id="loading" class="progress progress-striped active">
          <div class="progress-bar progress-bar-info"></div>
        </div>
        <div id="waveform" class="waveform-container"></div>

        <h3>With Prominent Frequency Coloring</h3>
        <div id="waveform-frequency" class="waveform-container"></div>
      </div>
    </div>
  </body>
</html>
*/
