// Segments plugin example

import WaveSurfer from 'wavesurfer.js'
import SegmentsPlugin from 'wavesurfer.js/dist/plugins/segments.esm.js'

// Sample segments data
const segmentsData = [
  {
    start: 0.0,
    end: 0.33,
    label: "start"
  },
  {
    start: 0.33,
    end: 13.13,
    label: "intro"
  },
  {
    start: 13.13,
    end: 37.53,
    label: "chorus"
  },
  {
    start: 37.53,
    end: 51.53,
    label: "verse"
  },
  {
    start: 51.53,
    end: 75.93,
    label: "chorus"
  },
  {
    start: 75.93,
    end: 89.93,
    label: "bridge"
  },
  {
    start: 89.93,
    end: 114.33,
    label: "chorus"
  },
  {
    start: 114.33,
    end: 128.33,
    label: "outro"
  },
  {
    start: 128.33,
    end: 130.0,
    label: "end"
  }
]

// Create a segments plugin instance
const segmentsPlugin = SegmentsPlugin.create({
  height: 40,
  segments: segmentsData,
  // Optional: customize colors for specific segment types
  colors: {
    chorus: '#E91E63',
    verse: '#3F51B5',
    bridge: '#00BCD4',
    intro: '#2196F3',
    outro: '#FF9800',
  }
})

// Create an instance of WaveSurfer
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'rgb(200, 0, 200)',
  progressColor: 'rgb(100, 0, 100)',
  url: '/examples/audio/audio.wav',
  minPxPerSec: 100,
  plugins: [segmentsPlugin],
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

// Update segments dynamically (example)
document.getElementById('updateSegments')?.addEventListener('click', () => {
  // Example of updating segments dynamically
  const newSegments = [
    {
      start: 0.0,
      end: 10.0,
      label: "intro"
    },
    {
      start: 10.0,
      end: 30.0,
      label: "verse"
    },
    {
      start: 30.0,
      end: 50.0,
      label: "chorus"
    },
    {
      start: 50.0,
      end: 70.0,
      label: "verse"
    },
    {
      start: 70.0,
      end: 90.0,
      label: "chorus"
    },
    {
      start: 90.0,
      end: 110.0,
      label: "bridge"
    },
    {
      start: 110.0,
      end: 130.0,
      label: "outro"
    }
  ]
  
  segmentsPlugin.setSegments(newSegments)
})

/*
<html>
  <div id="waveform"></div>
  <div style="margin-top: 20px;">
    <button id="updateSegments">Update Segments</button>
  </div>
  <p>
    Segments plugin shows different sections of the audio track with configurable colors.
  </p>
</html>
*/
