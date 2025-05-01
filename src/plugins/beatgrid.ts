/**
 * The Beatgrid plugin adds beat and bar lines under the waveform.
 */

import BasePlugin, { type BasePluginEvents } from '../base-plugin.js'
import createElement from '../dom.js'

export type BeatgridPluginOptions = {
  /** The height of the beatgrid in pixels, defaults to 20 */
  height?: number
  /** HTML element or selector for a beatgrid container, defaults to wavesufer's container */
  container?: HTMLElement | string
  /** Pass 'beforebegin' to insert the beatgrid on top of the waveform */
  insertPosition?: InsertPosition
  /** The BPM (beats per minute) of the audio */
  bpm?: number
  /** The offset of the first beat in seconds */
  offset?: number
  /** Number of beats per bar, defaults to 4 */
  beatsPerBar?: number
  /** Whether to show vertical lines for beats and bars, defaults to true */
  showVerticalLines?: boolean
  /** Whether to show full-height vertical lines or just small markers, defaults to true for full lines */
  fullHeightLines?: boolean
  /** Whether to show bar numbers, defaults to true */
  showBarNumbers?: boolean
  /** Whether to show current bar.beat position, defaults to true */
  showCurrentPosition?: boolean
  /** Custom inline style to apply to the container */
  style?: Partial<CSSStyleDeclaration> | string
  /** Opacity of the beat lines, defaults to 0.25 */
  beatLineOpacity?: number
  /** Color of the beat lines */
  beatLineColor?: string
  /** Color of the bar lines */
  barLineColor?: string
  /** Width of the beat lines in pixels */
  beatLineWidth?: number
  /** Width of the bar lines in pixels */
  barLineWidth?: number
  /** Color of the current position display */
  currentPositionColor?: string
  /** Opacity of the current position display */
  currentPositionOpacity?: number
  /** Position of the current position display: 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right' */
  currentPositionPlacement?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Custom formatter for bar numbers */
  formatBarNumberCallback?: (barNumber: number) => string
  /** Custom formatter for current position */
  formatCurrentPositionCallback?: (bar: number, beat: number) => string
}

const defaultOptions = {
  height: 20,
  bpm: 120,
  offset: 0,
  beatsPerBar: 4,
  showVerticalLines: true,
  fullHeightLines: true,
  showBarNumbers: true,
  showCurrentPosition: true,
  beatLineOpacity: 0.25,
  beatLineColor: '#000000',
  barLineColor: '#000000',
  beatLineWidth: 1,
  barLineWidth: 2,
  currentPositionColor: '#ccc',
  currentPositionOpacity: 1,
  currentPositionPlacement: 'center',
  formatBarNumberCallback: (barNumber: number) => `${barNumber}`,
  formatCurrentPositionCallback: (bar: number, beat: number) => `${bar}.${beat}`,
}

export type BeatgridPluginEvents = BasePluginEvents & {
  ready: []
}

class BeatgridPlugin extends BasePlugin<BeatgridPluginEvents, BeatgridPluginOptions> {
  private beatgridWrapper: HTMLElement
  private waveSurferRoot: HTMLElement | null = null
  private currentPositionElement: HTMLElement | null = null
  protected options: BeatgridPluginOptions & typeof defaultOptions
  private currentBar = 1
  private currentBeat = 1

  constructor(options?: BeatgridPluginOptions) {
    super(options || {})

    this.options = Object.assign({}, defaultOptions, options)
    this.beatgridWrapper = this.initBeatgridWrapper()
  }

  public static create(options?: BeatgridPluginOptions) {
    return new BeatgridPlugin(options)
  }

  /** Called by wavesurfer, don't call manually */
  onInit() {
    if (!this.wavesurfer) {
      throw Error('WaveSurfer is not initialized')
    }

    let container = this.wavesurfer.getWrapper()
    this.waveSurferRoot = this.wavesurfer.getRoot()
    if (this.options.container instanceof HTMLElement) {
      container = this.options.container
    } else if (typeof this.options.container === 'string') {
      const el = document.querySelector(this.options.container)
      if (!el) throw Error(`No Beatgrid container found matching ${this.options.container}`)
      container = el as HTMLElement
    }

    if (this.options.insertPosition) {
      ;(container.firstElementChild || container).insertAdjacentElement(
        this.options.insertPosition,
        this.beatgridWrapper,
      )
    } else {
      container.appendChild(this.beatgridWrapper)
    }

    this.subscriptions.push(
      this.wavesurfer.on('redraw', () => this.initBeatgrid()),
      this.wavesurfer.on('timeupdate', (currentTime) => this.updateCurrentPosition(currentTime))
    )

    if (this.wavesurfer?.getDuration()) {
      this.initBeatgrid()
    }
  }

  /** Unmount */
  public destroy() {
    this.beatgridWrapper.remove()
    super.destroy()
  }

  /** Set the BPM */
  public setBPM(bpm: number) {
    this.options.bpm = bpm
    this.initBeatgrid()
  }

  /** Set the offset of the first beat */
  public setOffset(offset: number) {
    this.options.offset = offset
    this.initBeatgrid()
  }

  /** Set the number of beats per bar */
  public setBeatsPerBar(beatsPerBar: number) {
    this.options.beatsPerBar = beatsPerBar
    this.initBeatgrid()
  }

  /** Update plugin options */
  public setOptions(options: Partial<BeatgridPluginOptions>) {
    this.options = Object.assign({}, this.options, options)
    this.initBeatgrid()
  }

  private initBeatgridWrapper(): HTMLElement {
    return createElement('div', { part: 'beatgrid-wrapper', style: { pointerEvents: 'none' } })
  }

  private virtualAppend(start: number, container: HTMLElement, element: HTMLElement) {
    let wasVisible = false

    const renderIfVisible = (scrollLeft: number, scrollRight: number) => {
      if (!this.wavesurfer) return
      const width = element.clientWidth
      const isVisible = start > scrollLeft && start + width < scrollRight

      if (isVisible === wasVisible) return
      wasVisible = isVisible

      if (isVisible) {
        container.appendChild(element)
      } else {
        element.remove()
      }
    }

    if (!this.wavesurfer) return
    const scrollLeft = this.wavesurfer.getScroll()
    const scrollRight = scrollLeft + this.wavesurfer.getWidth()

    renderIfVisible(scrollLeft, scrollRight)

    this.subscriptions.push(
      this.wavesurfer.on('scroll', (_start, _end, scrollLeft, scrollRight) => {
        renderIfVisible(scrollLeft, scrollRight)
      }),
    )
  }

  private initBeatgrid() {
    console.log("init")
    const duration = this.wavesurfer?.getDuration() ?? 0
    if (duration <= 0) return

    const pxPerSec = (this.wavesurfer?.getWrapper().scrollWidth || this.beatgridWrapper.scrollWidth) / duration
    const { bpm, offset, beatsPerBar, showVerticalLines, fullHeightLines, showBarNumbers } = this.options

    // Calculate seconds per beat
    const secPerBeat = 60 / bpm

    // Create the beatgrid container
    const beatgrid = createElement('div', {
      part: 'beatgrid',
      style: {
        position: 'relative',
        height: `${this.options.height}px`,
      }
    })

    // Create a template for beat lines
    const beatLineEl = createElement('div', {
      style: {
        position: 'absolute',
        height: fullHeightLines ? '100%' : '30%',
        top: fullHeightLines ? '0' : '0',
        borderLeft: `${this.options.beatLineWidth}px solid ${this.options.beatLineColor}`,
        opacity: `${this.options.beatLineOpacity}`,
        pointerEvents: 'none',
      },
    })

    // Create a template for bar lines
    const barLineEl = createElement('div', {
      style: {
        position: 'absolute',
        height: fullHeightLines ? '100%' : '50%',
        top: fullHeightLines ? '0' : '0',
        borderLeft: `${this.options.barLineWidth}px solid ${this.options.barLineColor}`,
        pointerEvents: 'none',
      },
    })

    // Create a template for bar numbers
    const barNumberEl = createElement('div', {
      style: {
        position: 'absolute',
        top: '0',
        marginLeft: '5px',
        fontSize: '10px',
        pointerEvents: 'none',
      },
    })

    // Calculate the total number of beats in the audio
    const totalBeats = Math.ceil((duration - offset) / secPerBeat) + 1

    // Draw beat and bar lines
    for (let i = 0; i < totalBeats; i++) {
      const beatTime = offset + i * secPerBeat
      if (beatTime > duration) break

      const isBar = i % beatsPerBar === 0
      const element = isBar ? barLineEl.cloneNode() as HTMLElement : beatLineEl.cloneNode() as HTMLElement

      if (showVerticalLines) {
        const position = beatTime * pxPerSec
        element.style.left = `${position}px`
        this.virtualAppend(position, beatgrid, element)

        // Add bar number if it's a bar line and showBarNumbers is enabled
        if (isBar && showBarNumbers) {
          const barNumber = Math.floor(i / beatsPerBar) + 1
          const barNumberElement = barNumberEl.cloneNode() as HTMLElement
          barNumberElement.textContent = this.options.formatBarNumberCallback(barNumber)
          barNumberElement.style.left = `${position}px`
          this.virtualAppend(position, beatgrid, barNumberElement)
        }
      }
    }

    this.beatgridWrapper.innerHTML = ''
    this.beatgridWrapper.appendChild(beatgrid)

    // Create fixed position container for current position display
    if (this.options.showCurrentPosition) {
      this.createCurrentPositionElement()
    }

    this.emit('ready')
  }

  private updateCurrentPosition(currentTime: number) {
    if (!this.options.showCurrentPosition || !this.currentPositionElement) return

    const { bpm, offset, beatsPerBar } = this.options

    // Calculate seconds per beat
    const secPerBeat = 60 / bpm

    // Calculate the current beat position
    const beatPosition = Math.max(0, currentTime - offset) / secPerBeat

    // Calculate bar and beat
    const bar = Math.floor(beatPosition / beatsPerBar) + 1
    const beat = Math.floor(beatPosition % beatsPerBar) + 1

    // Only update if changed
    if (bar !== this.currentBar || beat !== this.currentBeat) {
      this.currentBar = bar
      this.currentBeat = beat
      this.currentPositionElement.textContent = this.options.formatCurrentPositionCallback(bar, beat)
    }
  }

  private getPositionStyles(placement: string): Record<string, string> {
    switch (placement) {
      case 'top-left':
        return {
          top: '5px',
          left: '5px',
          transform: 'none',
        }
      case 'top-right':
        return {
          top: '5px',
          right: '5px',
          transform: 'none',
        }
      case 'bottom-left':
        return {
          bottom: '5px',
          left: '5px',
          transform: 'none',
        }
      case 'bottom-right':
        return {
          bottom: '5px',
          right: '5px',
          transform: 'none',
        }
      case 'center':
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }
    }
  }

  private createCurrentPositionElement() {
    if(!this.waveSurferRoot) return
    // Create a fixed container for the current position display
    const positionContainer = createElement('div', {
      part: 'beatgrid-position-container',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '11',
      },
    })
    
    // Get position styles based on placement option
    const positionStyles = this.getPositionStyles(this.options.currentPositionPlacement)
    
    this.currentPositionElement = createElement('div', {
      part: 'beatgrid-current-position',
      style: {
        position: 'absolute',
        fontSize: '14px',
        fontWeight: 'bold',
        color: this.options.currentPositionColor,
        opacity: this.options.currentPositionOpacity.toString(),
        pointerEvents: 'none',
        marginLeft: '-18px',  
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        padding: '10px',
        borderRadius: '5px',
        ...positionStyles,
      },
    })

    console.log("adding current position element")
    
    positionContainer.appendChild(this.currentPositionElement)
    
    // Append to the beatgrid wrapper instead of the scrollable beatgrid
    this.waveSurferRoot.append(positionContainer)
    

  }
}

export default BeatgridPlugin



















