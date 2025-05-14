import { makeDraggable } from './draggable.js'
import EventEmitter from './event-emitter.js'
import type { WaveSurferOptions } from './wavesurfer.js'

import {FFT} from './utils/fft.js'

type RendererEvents = {
  click: [relativeX: number, relativeY: number]
  dblclick: [relativeX: number, relativeY: number]
  drag: [relativeX: number]
  dragstart: [relativeX: number]
  dragend: [relativeX: number]
  scroll: [relativeStart: number, relativeEnd: number, scrollLeft: number, scrollRight: number]
  render: []
  rendered: []
}

class Renderer extends EventEmitter<RendererEvents> {
  private static MAX_CANVAS_WIDTH = 8000
  private static MAX_NODES = 10
  private options: WaveSurferOptions
  private parent: HTMLElement
  private container: HTMLElement
  private scrollContainer: HTMLElement
  private wrapper: HTMLElement
  private canvasWrapper: HTMLElement
  private progressWrapper: HTMLElement
  private cursor: HTMLElement
  private timeouts: Array<() => void> = []
  private isScrollable = false
  private audioData: AudioBuffer | null = null
  private resizeObserver: ResizeObserver | null = null
  private lastContainerWidth = 0
  private isDragging = false
  private subscriptions: (() => void)[] = []
  private unsubscribeOnScroll: (() => void)[] = []
  private brightnessData: number[] = []
  private prominentFrequencyData: number[] = [] // New property

  constructor(options: WaveSurferOptions, audioElement?: HTMLElement) {
    super()

    this.subscriptions = []
    this.options = options

    const parent = this.parentFromOptionsContainer(options.container)
    this.parent = parent

    const [div, shadow] = this.initHtml()
    parent.appendChild(div)
    this.container = div
    this.scrollContainer = shadow.querySelector('.scroll') as HTMLElement
    this.wrapper = shadow.querySelector('.wrapper') as HTMLElement
    this.canvasWrapper = shadow.querySelector('.canvases') as HTMLElement
    this.progressWrapper = shadow.querySelector('.progress') as HTMLElement
    this.cursor = shadow.querySelector('.cursor') as HTMLElement

    if (audioElement) {
      shadow.appendChild(audioElement)
    }

    this.initEvents()
  }

  private parentFromOptionsContainer(container: WaveSurferOptions['container']) {
    let parent
    if (typeof container === 'string') {
      parent = document.querySelector(container) satisfies HTMLElement | null
    } else if (container instanceof HTMLElement) {
      parent = container
    }

    if (!parent) {
      throw new Error('Container not found')
    }

    return parent
  }

  private initEvents() {
    const getClickPosition = (e: MouseEvent): [number, number] => {
      const rect = this.wrapper.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const relativeX = x / rect.width
      const relativeY = y / rect.height
      return [relativeX, relativeY]
    }

    // Add a click listener
    this.wrapper.addEventListener('click', (e) => {
      const [x, y] = getClickPosition(e)
      this.emit('click', x, y)
    })

    // Add a double click listener
    this.wrapper.addEventListener('dblclick', (e) => {
      const [x, y] = getClickPosition(e)
      this.emit('dblclick', x, y)
    })

    // Drag
    if (this.options.dragToSeek === true || typeof this.options.dragToSeek === 'object') {
      this.initDrag()
    }

    // Add a scroll listener
    this.scrollContainer.addEventListener('scroll', () => {
      const { scrollLeft, scrollWidth, clientWidth } = this.scrollContainer
      const startX = scrollLeft / scrollWidth
      const endX = (scrollLeft + clientWidth) / scrollWidth
      this.emit('scroll', startX, endX, scrollLeft, scrollLeft + clientWidth)
    })

    // Re-render the waveform on container resize
    if (typeof ResizeObserver === 'function') {
      const delay = this.createDelay(100)
      this.resizeObserver = new ResizeObserver(() => {
        delay()
          .then(() => this.onContainerResize())
          .catch(() => undefined)
      })
      this.resizeObserver.observe(this.scrollContainer)
    }
  }

  private onContainerResize() {
    const width = this.parent.clientWidth
    if (width === this.lastContainerWidth && this.options.height !== 'auto') return
    this.lastContainerWidth = width
    this.reRender()
  }

  private initDrag() {
    this.subscriptions.push(
      makeDraggable(
        this.wrapper,
        // On drag
        (_, __, x) => {
          this.emit('drag', Math.max(0, Math.min(1, x / this.wrapper.getBoundingClientRect().width)))
        },
        // On start drag
        (x) => {
          this.isDragging = true
          this.emit('dragstart', Math.max(0, Math.min(1, x / this.wrapper.getBoundingClientRect().width)))
        },
        // On end drag
        (x) => {
          this.isDragging = false
          this.emit('dragend', Math.max(0, Math.min(1, x / this.wrapper.getBoundingClientRect().width)))
        },
      ),
    )
  }

  private getHeight(
    optionsHeight?: WaveSurferOptions['height'],
    optionsSplitChannel?: WaveSurferOptions['splitChannels'],
  ): number {
    const defaultHeight = 128
    const numberOfChannels = this.audioData?.numberOfChannels || 1
    if (optionsHeight == null) return defaultHeight
    if (!isNaN(Number(optionsHeight))) return Number(optionsHeight)
    if (optionsHeight === 'auto') {
      const height = this.parent.clientHeight || defaultHeight
      if (optionsSplitChannel?.every((channel) => !channel.overlay)) return height / numberOfChannels
      return height
    }
    return defaultHeight
  }

  private initHtml(): [HTMLElement, ShadowRoot] {
    const div = document.createElement('div')
    Object.assign(div.style, {
      position: 'relative'
    })
    const shadow_div = document.createElement('div')
    div.appendChild(shadow_div)

    const shadow = shadow_div.attachShadow({ mode: 'open' })

    const cspNonce =
      this.options.cspNonce && typeof this.options.cspNonce === 'string' ? this.options.cspNonce.replace(/"/g, '') : ''

    shadow.innerHTML = `
      <style${cspNonce ? ` nonce="${cspNonce}"` : ''}>
        :host {
          user-select: none;
          min-width: 1px;
        }
        :host audio {
          display: block;
          width: 100%;
        }
        :host .scroll {
          overflow-x: auto;
          overflow-y: hidden;
          width: 100%;
          position: relative;
        }
        :host .noScrollbar {
          scrollbar-color: transparent;
          scrollbar-width: none;
        }
        :host .noScrollbar::-webkit-scrollbar {
          display: none;
          -webkit-appearance: none;
        }
        :host .wrapper {
          position: relative;
          overflow: visible;
          z-index: 2;
        }
        :host .canvases {
          min-height: ${this.getHeight(this.options.height, this.options.splitChannels)}px;
        }
        :host .canvases > div {
          position: relative;
        }
        :host canvas {
          display: block;
          position: absolute;
          top: 0;
          image-rendering: pixelated;
        }
        :host .progress {
          pointer-events: none;
          position: absolute;
          z-index: 2;
          top: 0;
          left: 0;
          width: 0;
          height: 100%;
          overflow: hidden;
        }
        :host .progress > div {
          position: relative;
        }
        :host .cursor {
          pointer-events: none;
          position: absolute;
          z-index: 5;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: 2px;
        }
      </style>

      <div class="scroll" part="scroll">
        <div class="wrapper" part="wrapper">
          <div class="canvases" part="canvases"></div>
          <div class="progress" part="progress"></div>
          <div class="cursor" part="cursor"></div>
        </div>
      </div>
    `

    return [div, shadow]
  }

  /** Wavesurfer itself calls this method. Do not call it manually. */
  setOptions(options: WaveSurferOptions) {
    if (this.options.container !== options.container) {
      const newParent = this.parentFromOptionsContainer(options.container)
      newParent.appendChild(this.container)

      this.parent = newParent
    }

    if (options.dragToSeek === true || typeof this.options.dragToSeek === 'object') {
      this.initDrag()
    }

    this.options = options

    // Re-render the waveform
    this.reRender()
  }

  getRoot(): HTMLElement {
    return this.container
  }

  getWrapper(): HTMLElement {
    return this.wrapper
  }

  getWidth(): number {
    return this.scrollContainer.clientWidth
  }

  getScroll(): number {
    return this.scrollContainer.scrollLeft
  }

  setScroll(pixels: number) {
    this.scrollContainer.scrollLeft = pixels
  }

  setScrollPercentage(percent: number) {
    const { scrollWidth } = this.scrollContainer
    const scrollStart = scrollWidth * percent
    this.setScroll(scrollStart)
  }

  destroy() {
    this.subscriptions.forEach((unsubscribe) => unsubscribe())
    this.container.remove()
    this.resizeObserver?.disconnect()
    this.unsubscribeOnScroll?.forEach((unsubscribe) => unsubscribe())
    this.unsubscribeOnScroll = []
  }

  private createDelay(delayMs = 10): () => Promise<void> {
    let timeout: ReturnType<typeof setTimeout> | undefined
    let reject: (() => void) | undefined

    const onClear = () => {
      if (timeout) clearTimeout(timeout)
      if (reject) reject()
    }

    this.timeouts.push(onClear)

    return () => {
      return new Promise((resolveFn, rejectFn) => {
        onClear()
        reject = rejectFn
        timeout = setTimeout(() => {
          timeout = undefined
          reject = undefined
          resolveFn()
        }, delayMs)
      })
    }
  }

  // Convert array of color values to linear gradient
  private convertColorValues(color?: WaveSurferOptions['waveColor']): string | CanvasGradient {
    if (!Array.isArray(color)) return color || ''
    if (color.length < 2) return color[0] || ''

    const canvasElement = document.createElement('canvas')
    const ctx = canvasElement.getContext('2d') as CanvasRenderingContext2D
    const gradientHeight = canvasElement.height * (window.devicePixelRatio || 1)
    const gradient = ctx.createLinearGradient(0, 0, 0, gradientHeight)

    const colorStopPercentage = 1 / (color.length - 1)
    color.forEach((color, index) => {
      const offset = index * colorStopPercentage
      gradient.addColorStop(offset, color)
    })

    return gradient
  }

  private getPixelRatio() {
    return Math.max(1, window.devicePixelRatio || 1)
  }

  private renderBarWaveform(
    channelData: Array<Float32Array | number[]>,
    options: WaveSurferOptions,
    ctx: CanvasRenderingContext2D,
    vScale: number,
  ) {
    const topChannel = channelData[0]
    const bottomChannel = channelData[1] || channelData[0]
    const length = topChannel.length

    const { width, height } = ctx.canvas
    const halfHeight = height / 2
    const pixelRatio = this.getPixelRatio()

    const barWidth = options.barWidth ? options.barWidth * pixelRatio : 1
    const barGap = options.barGap ? options.barGap * pixelRatio : options.barWidth ? barWidth / 2 : 0
    const barRadius = options.barRadius || 0
    const barIndexScale = width / (barWidth + barGap) / length

    const rectFn = barRadius && 'roundRect' in ctx ? 'roundRect' : 'rect'

    // Check if we should use brightness-based coloring
    const useColorization = options.colorizeByBrightness && this.brightnessData.length > 0
    const defaultFillStyle = ctx.fillStyle

    // If not using colorization, use the standard approach
    if (!useColorization) {
      ctx.beginPath()

      let prevX = 0
      let maxTop = 0
      let maxBottom = 0
      for (let i = 0; i <= length; i++) {
        const x = Math.round(i * barIndexScale)

        if (x > prevX) {
          const topBarHeight = Math.round(maxTop * halfHeight * vScale)
          const bottomBarHeight = Math.round(maxBottom * halfHeight * vScale)
          const barHeight = topBarHeight + bottomBarHeight || 1

          // Vertical alignment
          let y = halfHeight - topBarHeight
          if (options.barAlign === 'top') {
            y = 0
          } else if (options.barAlign === 'bottom') {
            y = height - barHeight
          }

          ctx[rectFn](prevX * (barWidth + barGap), y, barWidth, barHeight, barRadius)

          prevX = x
          maxTop = 0
          maxBottom = 0
        }

        const magnitudeTop = Math.abs(topChannel[i] || 0)
        const magnitudeBottom = Math.abs(bottomChannel[i] || 0)
        if (magnitudeTop > maxTop) maxTop = magnitudeTop
        if (magnitudeBottom > maxBottom) maxBottom = magnitudeBottom
      }

      ctx.fill()
      ctx.closePath()
      return
    }

    // Using brightness-based coloring - draw each bar individually with its own color
    let prevX = 0
    let maxTop = 0
    let maxBottom = 0
    let barCount = 0

    for (let i = 0; i <= length; i++) {
      const x = Math.round(i * barIndexScale)

      if (x > prevX) {
        const topBarHeight = Math.round(maxTop * halfHeight * vScale)
        const bottomBarHeight = Math.round(maxBottom * halfHeight * vScale)
        const barHeight = topBarHeight + bottomBarHeight || 1

        // Vertical alignment
        let y = halfHeight - topBarHeight
        if (options.barAlign === 'top') {
          y = 0
        } else if (options.barAlign === 'bottom') {
          y = height - barHeight
        }

        // Get brightness value for this bar
        const brightnessIndex = Math.min(
          this.brightnessData.length - 1,
          Math.floor((barCount / (width / (barWidth + barGap))) * this.brightnessData.length)
        )
        // Get the analysis data based on the selected type
        const analysisData = this.options.colorAnalysisType === 'prominentFrequency' ? this.prominentFrequencyData : this.brightnessData;
        // Get the analysis value for this bar
        const analysisValue = analysisData[brightnessIndex];

        // Set color based on the analysis value
        ctx.fillStyle = this.getColorValue(analysisValue, options.brightnessColors || []);

        // Draw the bar
        ctx.beginPath()
        ctx[rectFn](prevX * (barWidth + barGap), y, barWidth, barHeight, barRadius)
        ctx.fill()
        ctx.closePath()

        prevX = x
        maxTop = 0
        maxBottom = 0
        barCount++
      }

      const magnitudeTop = Math.abs(topChannel[i] || 0)
      const magnitudeBottom = Math.abs(bottomChannel[i] || 0)
      if (magnitudeTop > maxTop) maxTop = magnitudeTop
      if (magnitudeBottom > maxBottom) maxBottom = magnitudeBottom
    }

    // Restore the default fill style
    ctx.fillStyle = defaultFillStyle
  }

  private renderLineWaveform(
    channelData: Array<Float32Array | number[]>,
    options: WaveSurferOptions,
    ctx: CanvasRenderingContext2D,
    vScale: number,
  ) {
    // Check if we should use brightness-based coloring
    const useColorization = options.colorizeByBrightness && this.brightnessData.length > 0

    // If not using colorization, use the standard approach
    if (!useColorization) {
      const drawChannel = (index: number) => {
        const channel = channelData[index] || channelData[0]
        const length = channel.length
        const { height } = ctx.canvas
        const halfHeight = height / 2
        const hScale = ctx.canvas.width / length

        ctx.moveTo(0, halfHeight)

        let prevX = 0
        let max = 0
        for (let i = 0; i <= length; i++) {
          const x = Math.round(i * hScale)

          if (x > prevX) {
            const h = Math.round(max * halfHeight * vScale) || 1
            const y = halfHeight + h * (index === 0 ? -1 : 1)
            ctx.lineTo(prevX, y)
            prevX = x
            max = 0
          }

          const value = Math.abs(channel[i] || 0)
          if (value > max) max = value
        }

        ctx.lineTo(prevX, halfHeight)
      }

      ctx.beginPath()
      drawChannel(0)
      drawChannel(1)
      ctx.fill()
      ctx.closePath()
      return
    }

    // Using brightness-based coloring
    // We'll draw the waveform in segments, each with its own color
    const { width, height } = ctx.canvas
    const halfHeight = height / 2
    const segmentWidth = Math.max(1, Math.ceil(width / this.brightnessData.length))

    // Store original fill style
    const defaultFillStyle = ctx.fillStyle

    // Draw each segment with its own color
    for (let segmentIndex = 0; segmentIndex < this.brightnessData.length; segmentIndex++) {
      const startX = segmentIndex * segmentWidth
      const endX = Math.min(width, (segmentIndex + 1) * segmentWidth)

      if (startX >= width) break

      // Get the analysis data based on the selected type
      const analysisData = this.options.colorAnalysisType === 'prominentFrequency' ? this.prominentFrequencyData : this.brightnessData;
      // Get the analysis value for this segment
      const analysisValue = analysisData[segmentIndex];

      // Set color based on the analysis value
      ctx.fillStyle = this.getColorValue(analysisValue, options.brightnessColors || []);

      // Calculate which part of the channel data corresponds to this segment
      const channel0 = channelData[0]
      const channel1 = channelData[1] || channelData[0]
      const length = channel0.length
      const hScale = width / length

      const startIndex = Math.floor(startX / hScale)
      const endIndex = Math.ceil(endX / hScale)

      // Draw top channel segment
      ctx.beginPath()
      ctx.moveTo(startX, halfHeight)

      let prevX = startX
      let max = 0

      for (let i = startIndex; i <= endIndex && i <= length; i++) {
        const x = Math.min(endX, Math.round(i * hScale))

        if (x > prevX) {
          const h = Math.round(max * halfHeight * vScale) || 1
          const y = halfHeight - h
          ctx.lineTo(prevX, y)
          prevX = x
          max = 0
        }

        const value = Math.abs(channel0[i] || 0)
        if (value > max) max = value
      }

      // Draw bottom channel segment
      prevX = startX
      max = 0

      for (let i = startIndex; i <= endIndex && i <= length; i++) {
        const x = Math.min(endX, Math.round(i * hScale))

        if (x > prevX) {
          const h = Math.round(max * halfHeight * vScale) || 1
          const y = halfHeight + h
          ctx.lineTo(prevX, y)
          prevX = x
          max = 0
        }

        const value = Math.abs(channel1[i] || 0)
        if (value > max) max = value
      }

      ctx.lineTo(endX, halfHeight)
      ctx.fill()
      ctx.closePath()
    }

    // Restore the default fill style
    ctx.fillStyle = defaultFillStyle
  }

  private renderWaveform(
    channelData: Array<Float32Array | number[]>,
    options: WaveSurferOptions,
    ctx: CanvasRenderingContext2D,
  ) {
    ctx.fillStyle = this.convertColorValues(options.waveColor)

    // Custom rendering function
    if (options.renderFunction) {
      options.renderFunction(channelData, ctx)
      return
    }

    // Vertical scaling
    let vScale = options.barHeight || 1
    if (options.normalize) {
      const max = Array.from(channelData[0]).reduce((max, value) => Math.max(max, Math.abs(value)), 0)
      vScale = max ? 1 / max : 1
    }

    // Render waveform as bars
    if (options.barWidth || options.barGap || options.barAlign) {
      this.renderBarWaveform(channelData, options, ctx, vScale)
      return
    }

    // Render waveform as a polyline
    this.renderLineWaveform(channelData, options, ctx, vScale)
  }

  private renderSingleCanvas(
    data: Array<Float32Array | number[]>,
    options: WaveSurferOptions,
    width: number,
    height: number,
    offset: number,
    canvasContainer: HTMLElement,
    progressContainer: HTMLElement,
  ) {
    const pixelRatio = this.getPixelRatio()
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.style.left = `${Math.round(offset)}px`
    canvasContainer.appendChild(canvas)

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    this.renderWaveform(data, options, ctx)

    // Draw a progress canvas
    if (canvas.width > 0 && canvas.height > 0) {
      const progressCanvas = canvas.cloneNode() as HTMLCanvasElement
      const progressCtx = progressCanvas.getContext('2d') as CanvasRenderingContext2D
      progressCtx.drawImage(canvas, 0, 0)
      // Set the composition method to draw only where the waveform is drawn
      progressCtx.globalCompositeOperation = 'source-in'
      progressCtx.fillStyle = this.convertColorValues(options.progressColor)
      // This rectangle acts as a mask thanks to the composition method
      progressCtx.fillRect(0, 0, canvas.width, canvas.height)
      progressContainer.appendChild(progressCanvas)
    }
  }

  private renderMultiCanvas(
    channelData: Array<Float32Array | number[]>,
    options: WaveSurferOptions,
    width: number,
    height: number,
    canvasContainer: HTMLElement,
    progressContainer: HTMLElement,
  ) {
    const pixelRatio = this.getPixelRatio()
    const { clientWidth } = this.scrollContainer
    const totalWidth = width / pixelRatio

    let singleCanvasWidth = Math.min(Renderer.MAX_CANVAS_WIDTH, clientWidth, totalWidth)
    let drawnIndexes: Record<number, boolean> = {}

    // Nothing to render
    if (singleCanvasWidth === 0) return

    // Adjust width to avoid gaps between canvases when using bars
    if (options.barWidth || options.barGap) {
      const barWidth = options.barWidth || 0.5
      const barGap = options.barGap || barWidth / 2
      const totalBarWidth = barWidth + barGap
      if (singleCanvasWidth % totalBarWidth !== 0) {
        singleCanvasWidth = Math.floor(singleCanvasWidth / totalBarWidth) * totalBarWidth
      }
    }

    // Draw a single canvas
    const draw = (index: number) => {
      if (index < 0 || index >= numCanvases) return
      if (drawnIndexes[index]) return
      drawnIndexes[index] = true
      const offset = index * singleCanvasWidth
      const clampedWidth = Math.min(totalWidth - offset, singleCanvasWidth)
      if (clampedWidth <= 0) return
      const data = channelData.map((channel) => {
        const start = Math.floor((offset / totalWidth) * channel.length)
        const end = Math.floor(((offset + clampedWidth) / totalWidth) * channel.length)
        return channel.slice(start, end)
      })
      this.renderSingleCanvas(data, options, clampedWidth, height, offset, canvasContainer, progressContainer)
    }

    // Clear canvases to avoid too many DOM nodes
    const clearCanvases = () => {
      if (Object.keys(drawnIndexes).length > Renderer.MAX_NODES) {
        canvasContainer.innerHTML = ''
        progressContainer.innerHTML = ''
        drawnIndexes = {}
      }
    }

    // Calculate how many canvases to render
    const numCanvases = Math.ceil(totalWidth / singleCanvasWidth)

    // Render all canvases if the waveform doesn't scroll
    if (!this.isScrollable) {
      for (let i = 0; i < numCanvases; i++) {
        draw(i)
      }
      return
    }

    // Lazy rendering
    const viewPosition = this.scrollContainer.scrollLeft / totalWidth
    const startCanvas = Math.floor(viewPosition * numCanvases)

    // Draw the canvases in the viewport first
    draw(startCanvas - 1)
    draw(startCanvas)
    draw(startCanvas + 1)

    // Subscribe to the scroll event to draw additional canvases
    if (numCanvases > 1) {
      const unsubscribe = this.on('scroll', () => {
        const { scrollLeft } = this.scrollContainer
        const canvasIndex = Math.floor((scrollLeft / totalWidth) * numCanvases)
        clearCanvases()
        draw(canvasIndex - 1)
        draw(canvasIndex)
        draw(canvasIndex + 1)
      })

      this.unsubscribeOnScroll.push(unsubscribe)
    }
  }

  private renderChannel(
    channelData: Array<Float32Array | number[]>,
    { overlay, ...options }: WaveSurferOptions & { overlay?: boolean },
    width: number,
    channelIndex: number,
  ) {
    // A container for canvases
    const canvasContainer = document.createElement('div')
    const height = this.getHeight(options.height, options.splitChannels)
    canvasContainer.style.height = `${height}px`
    if (overlay && channelIndex > 0) {
      canvasContainer.style.marginTop = `-${height}px`
    }
    this.canvasWrapper.style.minHeight = `${height}px`
    this.canvasWrapper.appendChild(canvasContainer)

    // A container for progress canvases
    const progressContainer = canvasContainer.cloneNode() as HTMLElement
    this.progressWrapper.appendChild(progressContainer)

    // Render the waveform
    this.renderMultiCanvas(channelData, options, width, height, canvasContainer, progressContainer)
  }

  /**
   * Analyze audio brightness (spectral centroid) for each segment of the waveform
   * @param audioBuffer The audio buffer to analyze
   * @param numberOfSegments The number of segments to divide the audio into
   */
  public analyzeBrightness(audioBuffer: AudioBuffer, numberOfSegments: number): void {
    // Only analyze if colorizeByBrightness is enabled
    if (!this.options.colorizeByBrightness) {
      this.brightnessData = []
      return
    }

    // Reset brightness data
    this.brightnessData = []

    // Use the first channel for analysis
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate

    // FFT parameters
    const fftSize = 128 // Larger FFT size for better frequency resolution
    const hopSize = Math.floor(fftSize / 4) // 75% overlap

    // Create FFT object using fft.js
    const fft = new FFT(fftSize)
    const fftInput = fft.createComplexArray()
    const fftOutput = fft.createComplexArray()

    // Calculate segment size in samples
    const segmentSize = Math.floor(channelData.length / numberOfSegments)

    // Arrays to store all brightness values for normalization
    const rawBrightnessValues = []

    // Process each segment
    for (let segmentIndex = 0; segmentIndex < numberOfSegments; segmentIndex++) {
      const segmentStart = segmentIndex * segmentSize
      const segmentEnd = Math.min(segmentStart + segmentSize, channelData.length)

      // Skip if segment is too small
      if (segmentEnd - segmentStart < fftSize) {
        rawBrightnessValues.push(0.5) // Default middle value
        continue
      }

      // Calculate spectral centroid for this segment
      let totalCentroid = 0
      let framesCount = 0

      // Process frames within the segment with overlap
      for (let frameStart = segmentStart; frameStart + fftSize <= segmentEnd; frameStart += hopSize) {
        // Extract frame and prepare input for FFT
        for (let i = 0; i < fftSize; i++) {
          // Apply Hann window function
          const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)))
          // Real part (windowed sample)
          fftInput[i * 2] = channelData[frameStart + i] * windowValue
          // Imaginary part (zero)
          fftInput[i * 2 + 1] = 0
        }

        // Perform FFT
        fft.transform(fftOutput, fftInput)

        // Calculate spectral centroid
        let numerator = 0
        let denominator = 0

        // Skip DC component (i=0)
        for (let i = 1; i < fftSize / 2; i++) {
          const frequency = (i * sampleRate) / fftSize
          // Calculate magnitude from real and imaginary parts
          const real = fftOutput[i * 2]
          const imag = fftOutput[i * 2 + 1]
          const magnitude = Math.sqrt(real * real + imag * imag)

          numerator += frequency * magnitude
          denominator += magnitude
        }

              // Avoid division by zero
        const centroid = denominator !== 0 ? numerator / denominator : 0

        // Normalize centroid to 0-1 range using logarithmic scale (assuming max frequency is sampleRate/2)
        // Add 1 to centroid to avoid log(0) and make values non-negative
        const normalizedFrameCentroid = Math.log(1 + centroid) / Math.log(1 + sampleRate / 2);

        totalCentroid += normalizedFrameCentroid; // Sum normalized centroids
        framesCount++;
      }

      // Average normalized centroid for this segment
      const avgNormalizedCentroid = framesCount > 0 ? totalCentroid / framesCount : 0.5; // Default middle value

      // Store raw brightness value (using normalized frame average)
      rawBrightnessValues.push(avgNormalizedCentroid);
    }

    // Ensure we have at least one brightness value
    if (rawBrightnessValues.length === 0) {
      this.brightnessData.push(0.5); // Default normalized value
      return;
    }

    // Find min and max values for better normalization
    const minBrightness = Math.min(...rawBrightnessValues);
    const maxBrightness = Math.max(...rawBrightnessValues);

    // Calculate range and ensure it's not zero
    const range = maxBrightness - minBrightness > 0.001 ? maxBrightness - minBrightness : 1;

    console.log("Raw Normalized Brightness Values:", rawBrightnessValues);
    // Normalize values to spread across the full 0-1 range
    for (let i = 0; i < rawBrightnessValues.length; i++) {
      let normalizedValue = (rawBrightnessValues[i] - minBrightness) / range;

      // Apply power transformation if normalizationPower is provided
      if (this.options.normalizationPower != null) {
        normalizedValue = Math.pow(normalizedValue, this.options.normalizationPower);
      }

      this.brightnessData.push(normalizedValue);
    }
    console.log("Normalized Brightness Data (after power transform):", this.brightnessData);
  }
  /**
   * Analyze audio prominent frequency for each segment of the waveform
   * @param audioBuffer The audio buffer to analyze
   * @param numberOfSegments The number of segments to divide the audio into
   */
  private analyzeProminentFrequency(audioBuffer: AudioBuffer, numberOfSegments: number): void {
    // Reset prominent frequency data
    this.prominentFrequencyData = []

    // Use the first channel for analysis
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate

    // FFT parameters
    const fftSize = 128 // Larger FFT size for better frequency resolution
    const hopSize = Math.floor(fftSize / 4) // 75% overlap

    // Create FFT object using fft.js
    const fft = new FFT(fftSize)
    const fftInput = fft.createComplexArray()
    const fftOutput = fft.createComplexArray()

    // Calculate segment size in samples
    const segmentSize = Math.floor(channelData.length / numberOfSegments)

    // Arrays to store all prominent frequency values for normalization
    const rawProminentFrequencyValues = []

    // Process each segment
    for (let segmentIndex = 0; segmentIndex < numberOfSegments; segmentIndex++) {
      const segmentStart = segmentIndex * segmentSize
      const segmentEnd = Math.min(segmentStart + segmentSize, channelData.length)

      // Skip if segment is too small
      if (segmentEnd - segmentStart < fftSize) {
        rawProminentFrequencyValues.push(sampleRate / 4) // Default middle frequency (arbitrary)
        continue
      }

      // Find prominent frequency for this segment
      let totalProminentFrequency = 0 // Sum of prominent frequencies across frames
      let framesCount = 0

      // Process frames within the segment with overlap
      for (let frameStart = segmentStart; frameStart + fftSize <= segmentEnd; frameStart += hopSize) {
        // Extract frame and prepare input for FFT
        for (let i = 0; i < fftSize; i++) {
          // Apply Hann window function
          const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)))
          // Real part (windowed sample)
          fftInput[i * 2] = channelData[frameStart + i] * windowValue
          // Imaginary part (zero)
          fftInput[i * 2 + 1] = 0
        }

        // Perform FFT
        fft.transform(fftOutput, fftInput)

        // Find the bin with the maximum magnitude (excluding DC component at bin 0)
        let maxMagnitude = 0
        let prominentBin = 0
        for (let i = 1; i < fftSize / 2; i++) { // Only consider positive frequencies
          const real = fftOutput[i * 2]
          const imag = fftOutput[i * 2 + 1]
          const magnitude = Math.sqrt(real * real + imag * imag)

          if (magnitude > maxMagnitude) {
            maxMagnitude = magnitude
            prominentBin = i
          }
        }

        // Calculate the frequency of the prominent bin
        const prominentFrequency = (prominentBin * sampleRate) / fftSize;

        totalProminentFrequency += prominentFrequency
        framesCount++
      }

      // Average prominent frequency for this segment
      const avgProminentFrequency = framesCount > 0 ? totalProminentFrequency / framesCount : sampleRate / 4 // Default

      // Store raw prominent frequency value
      rawProminentFrequencyValues.push(avgProminentFrequency)
    }

    // Ensure we have at least one prominent frequency value
    if (rawProminentFrequencyValues.length === 0) {
      this.prominentFrequencyData.push(0.5) // Default normalized value
      return
    }

    // Find min and max values for better normalization
    const minProminentFrequency = Math.min(...rawProminentFrequencyValues)
    const maxProminentFrequency = Math.max(...rawProminentFrequencyValues)

    // Calculate range and ensure it's not zero
    const range = maxProminentFrequency - minProminentFrequency > 0.001 ? maxProminentFrequency - minProminentFrequency : 1

    // Normalize values to spread across the full 0-1 range
    this.prominentFrequencyData = rawProminentFrequencyValues.map(value => (value - minProminentFrequency) / range)
  }


  /**
   * Get color for a brightness value based on the color stops
   * @param normalizedValue Brightness value (0-1)
   * @param colorStops Array of color stops
   * @returns CSS color string
   */
  private getColorValue(normalizedValue: number, colorStops: Array<{stop: number, color: string}>): string {
    // Ensure value is in range 0-1
    normalizedValue = Math.max(0, Math.min(1, normalizedValue));

    // Clamp the value back to the 0-1 range
    normalizedValue = Math.max(0, Math.min(1, normalizedValue));

    // Sort color stops by position
    const sortedStops = [...colorStops].sort((a, b) => a.stop - b.stop);

    // If we have no stops or only one stop, return a default color
    if (sortedStops.length === 0) return 'rgb(0, 0, 0)';
    if (sortedStops.length === 1) return sortedStops[0].color;

    // Find the two stops that our value falls between
    let lowerIndex = 0;
    for (let i = 0; i < sortedStops.length - 1; i++) {
      if (normalizedValue >= sortedStops[i].stop && normalizedValue <= sortedStops[i + 1].stop) {
        lowerIndex = i;
        break;
      }
    }

    // If value is below the first stop or above the last stop
    if (normalizedValue <= sortedStops[0].stop) return sortedStops[0].color;
    if (normalizedValue >= sortedStops[sortedStops.length - 1].stop) return sortedStops[sortedStops.length - 1].color;

    const lowerStop = sortedStops[lowerIndex];
    const upperStop = sortedStops[lowerIndex + 1];

    // Calculate how far between the two stops our value is (0-1)
    const range = upperStop.stop - lowerStop.stop;
    const normalizedPosition = range !== 0 ? (normalizedValue - lowerStop.stop) / range : 0;

    // Parse colors to get RGB components
    const lowerColor = this.parseColor(lowerStop.color);
    const upperColor = this.parseColor(upperStop.color);

    if (!lowerColor || !upperColor) {
      return lowerStop.color; // Fallback if parsing fails
    }

    // Interpolate between colors
    const r = Math.round(lowerColor.r + normalizedPosition * (upperColor.r - lowerColor.r));
    const g = Math.round(lowerColor.g + normalizedPosition * (upperColor.g - lowerColor.g));
    const b = Math.round(lowerColor.b + normalizedPosition * (upperColor.b - lowerColor.b));

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Parse a CSS color string to RGB components
   * @param color CSS color string
   * @returns Object with r, g, b properties or null if parsing fails
   */
  private parseColor(color: string): { r: number, g: number, b: number } | null {
    // Handle rgb/rgba format
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10)
      };
    }

    // Handle hex format
    const hexMatch = color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16)
      };
    }

    // Handle short hex format
    const shortHexMatch = color.match(/#([0-9a-f])([0-9a-f])([0-9a-f])/i);
    if (shortHexMatch) {
      return {
        r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
        g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
        b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16)
      };
    }

    return null;
  }

  async render(audioData: AudioBuffer) {
    // Clear previous timeouts
    this.timeouts.forEach((clear) => clear())
    this.timeouts = []

    // Clear the canvases
    this.canvasWrapper.innerHTML = ''
    this.progressWrapper.innerHTML = ''

    // Width
    if (this.options.width != null) {
      this.scrollContainer.style.width =
        typeof this.options.width === 'number' ? `${this.options.width}px` : this.options.width
    }

    // Determine the width of the waveform
    const pixelRatio = this.getPixelRatio()
    const parentWidth = this.scrollContainer.clientWidth
    // Apply audioRate to the duration for visual scaling
    const audioRate = this.options.audioRate || 1
    const scaledDuration = audioData.duration / audioRate
    const scrollWidth = Math.ceil(scaledDuration * (this.options.minPxPerSec || 0))

    // Whether the container should scroll
    this.isScrollable = scrollWidth > parentWidth
    const useParentWidth = this.options.fillParent && !this.isScrollable
    // Width of the waveform in pixels
    const width = (useParentWidth ? parentWidth : scrollWidth) * pixelRatio

    // Set the width of the wrapper
    this.wrapper.style.width = useParentWidth ? '100%' : `${scrollWidth}px`

    // Set additional styles
    this.scrollContainer.style.overflowX = this.isScrollable ? 'auto' : 'hidden'
    this.scrollContainer.classList.toggle('noScrollbar', !!this.options.hideScrollbar)
    this.cursor.style.backgroundColor = `${this.options.cursorColor || this.options.progressColor}`
    this.cursor.style.width = `${this.options.cursorWidth}px`

    this.audioData = audioData

    // Analyze audio based on the selected type if colorization is enabled
    if (this.options.colorizeByBrightness) {
      // Determine number of segments based on width, ensuring segments are large enough for FFT
      const fftSize = 128; // Must match the fftSize in analyzeBrightness/analyzeProminentFrequency
      const maxPossibleSegments = Math.floor(audioData.length / fftSize);
      const segmentsBasedOnWidth = Math.max(100, Math.ceil(width / pixelRatio / 5)); // One segment per 5 pixels
      const numberOfSegments = Math.min(maxPossibleSegments, segmentsBasedOnWidth);

      // Ensure at least one segment if audio data is available
      const finalNumberOfSegments = Math.max(1, numberOfSegments);

      if (this.options.colorAnalysisType === 'prominentFrequency') {
        this.analyzeProminentFrequency(audioData, finalNumberOfSegments)
        this.brightnessData = [] // Clear brightness data
      } else { // Default to brightness
        this.analyzeBrightness(audioData, finalNumberOfSegments)
        this.prominentFrequencyData = [] // Clear prominent frequency data
      }
    } else {
      // Clear all analysis data if colorization is not enabled
      this.brightnessData = []
      this.prominentFrequencyData = []
    }

    this.emit('render')

    // Render the waveform
    if (this.options.splitChannels) {
      // Render a waveform for each channel
      for (let i = 0; i < audioData.numberOfChannels; i++) {
        const options = { ...this.options, ...this.options.splitChannels?.[i] }
        this.renderChannel([audioData.getChannelData(i)], options, width, i)
      }
    } else {
      // Render a single waveform for the first two channels (left and right)
      const channels = [audioData.getChannelData(0)]
      if (audioData.numberOfChannels > 1) channels.push(audioData.getChannelData(1))
      this.renderChannel(channels, this.options, width, 0)
    }

    // Must be emitted asynchronously for backward compatibility
    Promise.resolve().then(() => this.emit('rendered'))
  }

  reRender() {
    this.unsubscribeOnScroll.forEach((unsubscribe) => unsubscribe())
    this.unsubscribeOnScroll = []

    // Return if the waveform has not been rendered yet
    if (!this.audioData) return

    // Remember the current cursor position
    const { scrollWidth } = this.scrollContainer
    const { right: before } = this.progressWrapper.getBoundingClientRect()

    // Re-render the waveform
    this.render(this.audioData)

    // Adjust the scroll position so that the cursor stays in the same place
    if (this.isScrollable && scrollWidth !== this.scrollContainer.scrollWidth) {
      const { right: after } = this.progressWrapper.getBoundingClientRect()
      let delta = after - before
      // to limit compounding floating-point drift
      // we need to round to the half px furthest from 0
      delta *= 2
      delta = delta < 0 ? Math.floor(delta) : Math.ceil(delta)
      delta /= 2
      this.scrollContainer.scrollLeft += delta
    }
  }

  zoom(minPxPerSec: number) {
    this.options.minPxPerSec = minPxPerSec
    this.reRender()
  }

  /** Get the effective pixels per second, accounting for audioRate */
  getEffectiveMinPxPerSec(): number {
    const audioRate = this.options.audioRate || 1
    return (this.options.minPxPerSec || 0) * audioRate
  }

  private scrollIntoView(progress: number, isPlaying = false) {
    const { scrollLeft, scrollWidth, clientWidth } = this.scrollContainer
    const progressWidth = progress * scrollWidth
    const startEdge = scrollLeft
    const endEdge = scrollLeft + clientWidth
    const middle = clientWidth / 2

    if (this.isDragging) {
      // Scroll when dragging close to the edge of the viewport
      const minGap = 30
      if (progressWidth + minGap > endEdge) {
        this.scrollContainer.scrollLeft += minGap
      } else if (progressWidth - minGap < startEdge) {
        this.scrollContainer.scrollLeft -= minGap
      }
    } else {
      if (progressWidth < startEdge || progressWidth > endEdge) {
        this.scrollContainer.scrollLeft = progressWidth - (this.options.autoCenter ? middle : 0)
      }

      // Keep the cursor centered when playing
      const center = progressWidth - scrollLeft - middle
      if (isPlaying && this.options.autoCenter && center > 0) {
        this.scrollContainer.scrollLeft += Math.min(center, 10)
      }
    }

    // Emit the scroll event
    {
      const newScroll = this.scrollContainer.scrollLeft
      const startX = newScroll / scrollWidth
      const endX = (newScroll + clientWidth) / scrollWidth
      this.emit('scroll', startX, endX, newScroll, newScroll + clientWidth)
    }
  }

  renderProgress(progress: number, isPlaying?: boolean) {
    if (isNaN(progress)) return
    const percents = progress * 100
    this.canvasWrapper.style.clipPath = `polygon(${percents}% 0, 100% 0, 100% 100%, ${percents}% 100%)`
    this.progressWrapper.style.width = `${percents}%`
    this.cursor.style.left = `${percents}%`
    this.cursor.style.transform = `translateX(-${Math.round(percents) === 100 ? this.options.cursorWidth : 0}px)`

    if (this.isScrollable && this.options.autoScroll) {
      this.scrollIntoView(progress, isPlaying)
    }
  }

  async exportImage(format: string, quality: number, type: 'dataURL' | 'blob'): Promise<string[] | Blob[]> {
    const canvases = this.canvasWrapper.querySelectorAll('canvas')
    if (!canvases.length) {
      throw new Error('No waveform data')
    }

    // Data URLs
    if (type === 'dataURL') {
      const images = Array.from(canvases).map((canvas) => canvas.toDataURL(format, quality))
      return Promise.resolve(images)
    }

    // Blobs
    return Promise.all(
      Array.from(canvases).map((canvas) => {
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              blob ? resolve(blob) : reject(new Error('Could not export image'))
            },
            format,
            quality,
          )
        })
      }),
    )
  }
}

export default Renderer
