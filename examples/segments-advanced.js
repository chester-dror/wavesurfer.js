// Advanced Segments plugin example
// This example shows how to load segments from a JSON file
// and how to customize the appearance of segments

import WaveSurfer from 'wavesurfer.js'
import SegmentsPlugin from 'wavesurfer.js/dist/plugins/segments.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'

// Create a timeline plugin for reference
const timelinePlugin = TimelinePlugin.create({
  height: 20,
  insertPosition: 'beforebegin',
})

// Create a segments plugin instance with custom colors
const segmentsPlugin = SegmentsPlugin.create({
  height: 50,
  // Custom colors for each segment type
  colors: {
    start: '#4CAF50',
    end: '#F44336',
    intro: '#2196F3',
    outro: '#FF9800',
    break: '#9C27B0',
    bridge: '#00BCD4',
    inst: '#FFEB3B',
    solo: '#FF5722',
    verse: '#3F51B5',
    chorus: '#E91E63',
    default: '#607D8B', // For any unrecognized segment types
  }
})

// Create an instance of WaveSurfer
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'rgb(0, 150, 150)',
  progressColor: 'rgb(0, 100, 100)',
  url: '/examples/audio/audio.wav',
  minPxPerSec: 100,
  plugins: [segmentsPlugin, timelinePlugin],
  height: 100,
})

// Load segments from JSON
async function loadSegments() {
  try {
    // In a real application, this would be a path to your JSON file
    // For this example, we'll simulate loading from a file
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
    
    // Update the segments in the plugin
    segmentsPlugin.setSegments(segmentsData)
    
    // Display the loaded segments in the UI
    document.getElementById('segmentsInfo').textContent = 
      `Loaded ${segmentsData.length} segments`
    
    // Create a visual representation of the segment colors
    const legendContainer = document.getElementById('segmentsLegend')
    if (legendContainer) {
      legendContainer.innerHTML = ''
      
      // Get unique segment types
      const segmentTypes = [...new Set(segmentsData.map(segment => segment.label))]
      
      // Create legend items
      segmentTypes.forEach(type => {
        const color = segmentsPlugin.options.colors[type] || segmentsPlugin.options.colors.default
        
        const legendItem = document.createElement('div')
        legendItem.className = 'legend-item'
        legendItem.innerHTML = `
          <span class="color-box" style="background-color: ${color}"></span>
          <span class="label">${type}</span>
        `
        legendContainer.appendChild(legendItem)
      })
    }
    
  } catch (error) {
    console.error('Error loading segments:', error)
    document.getElementById('segmentsInfo').textContent = 
      `Error loading segments: ${error.message}`
  }
}

// Load segments when wavesurfer is ready
wavesurfer.on('ready', () => {
  loadSegments()
})

// Play/pause on button click
document.getElementById('playPause')?.addEventListener('click', () => {
  wavesurfer.playPause()
})

// Jump to segment on click
document.getElementById('jumpToSegment')?.addEventListener('click', () => {
  const segmentType = document.getElementById('segmentType').value
  const segments = segmentsPlugin.options.segments || []
  
  // Find the first segment with the selected type
  const segment = segments.find(seg => seg.label === segmentType)
  
  if (segment) {
    // Jump to the start of the segment
    wavesurfer.setTime(segment.start)
    // Optionally start playing
    wavesurfer.play()
  }
})

/*
<html>
  <style>
    .controls {
      margin: 20px 0;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin-right: 15px;
    }
    .color-box {
      width: 15px;
      height: 15px;
      display: inline-block;
      margin-right: 5px;
      border-radius: 3px;
    }
  </style>

  <div id="waveform"></div>
  
  <div class="controls">
    <button id="playPause">Play/Pause</button>
    
    <div style="margin-top: 10px;">
      <select id="segmentType">
        <option value="intro">Intro</option>
        <option value="verse">Verse</option>
        <option value="chorus">Chorus</option>
        <option value="bridge">Bridge</option>
        <option value="outro">Outro</option>
      </select>
      <button id="jumpToSegment">Jump to Segment</button>
    </div>
  </div>
  
  <div id="segmentsInfo"></div>
  
  <div class="legend">
    <h4>Segment Types:</h4>
    <div id="segmentsLegend" class="legend"></div>
  </div>
</html>
*/
