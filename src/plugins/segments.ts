/**
 * The Segments plugin adds segment markers beneath the waveform.
 * Each segment has a start time, end time, and label.
 * Segments can be colored based on their label type.
 */

import BasePlugin, { type BasePluginEvents } from '../base-plugin.js'
import createElement from '../dom.js'

export type Segment = {
  start: number
  end: number
  label: string
}

export type SegmentsPluginOptions = {
  /** The height of the segments display in pixels, defaults to 30 */
  height?: number
  /** HTML element or selector for a segments container, defaults to wavesufer's container */
  container?: HTMLElement | string
  /** Pass 'beforebegin' to insert the segments on top of the waveform */
  insertPosition?: InsertPosition
  /** Array of segment objects with start, end, and label properties */
  segments?: Segment[]
  /** Custom inline style to apply to the container */
  style?: Partial<CSSStyleDeclaration> | string
  /** Color map for segment types */
  colors?: Record<string, string>
}

// Default segment colors
const defaultColors: Record<string, string> = {
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

const defaultOptions = {
  height: 16,
  segments: [],
  colors: defaultColors,
}

export type SegmentsPluginEvents = BasePluginEvents & {
  ready: []
}

class SegmentsPlugin extends BasePlugin<SegmentsPluginEvents, SegmentsPluginOptions> {
  private segmentsWrapper: HTMLElement
  protected options: SegmentsPluginOptions & typeof defaultOptions

  constructor(options?: SegmentsPluginOptions) {
    super(options || {})

    this.options = Object.assign({}, defaultOptions, options)

    // Merge provided colors with defaults
    if (options?.colors) {
      this.options.colors = Object.assign({}, defaultColors, options.colors)
    }

    this.segmentsWrapper = this.initSegmentsWrapper()
  }

  public static create(options?: SegmentsPluginOptions) {
    return new SegmentsPlugin(options)
  }

  /** Called by wavesurfer, don't call manually */
  onInit() {
    if (!this.wavesurfer) {
      throw Error('WaveSurfer is not initialized')
    }

    let container = this.wavesurfer.getWrapper()
    if (this.options.container instanceof HTMLElement) {
      container = this.options.container
    } else if (typeof this.options.container === 'string') {
      const el = document.querySelector(this.options.container)
      if (!el) throw Error(`No Segments container found matching ${this.options.container}`)
      container = el as HTMLElement
    }

    if (this.options.insertPosition) {
      ;(container.firstElementChild || container).insertAdjacentElement(
        this.options.insertPosition,
        this.segmentsWrapper,
      )
    } else {
      container.appendChild(this.segmentsWrapper)
    }

    this.subscriptions.push(
      this.wavesurfer.on('redraw', () => this.initSegments())
    )

    if (this.wavesurfer?.getDuration()) {
      this.initSegments()
    }
  }

  /** Unmount */
  public destroy() {
    this.segmentsWrapper.remove()
    super.destroy()
  }

  /** Set segments data */
  public setSegments(segments: Segment[]) {
    this.options.segments = segments
    this.initSegments()
  }

  /** Update plugin options */
  public setOptions(options: Partial<SegmentsPluginOptions>) {
    this.options = Object.assign({}, this.options, options)

    // Merge provided colors with defaults
    if (options.colors) {
      this.options.colors = Object.assign({}, defaultColors, options.colors)
    }

    this.initSegments()
  }

  private initSegmentsWrapper(): HTMLElement {
    return createElement('div', { part: 'segments-wrapper', style: { pointerEvents: 'none' } })
  }

  private virtualAppend(start: number, container: HTMLElement, element: HTMLElement) {
    let wasVisible = false

    const renderIfVisible = (scrollLeft: number, scrollRight: number) => {
      if (!this.wavesurfer) return
      const width = element.offsetWidth || element.getBoundingClientRect().width || parseFloat(element.style.width || '0')
      const isVisible = (start <= scrollRight) && (start + width >= scrollLeft)

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

  private initSegments() {
    const duration = this.wavesurfer?.getDuration() ?? 0
    if (duration <= 0) return

    const pxPerSec = (this.wavesurfer?.getWrapper().scrollWidth || this.segmentsWrapper.scrollWidth) / duration
    const { segments, colors } = this.options

    // Create the segments container
    const segmentsContainer = createElement('div', {
      part: 'segments',
      style: {
        position: 'relative',
        height: `${this.options.height}px`,
      }
    })

    // Create segments
    segments?.forEach((segment) => {
      const startPosition = segment.start * pxPerSec
      const endPosition = segment.end * pxPerSec
      const width = endPosition - startPosition

      // Get color based on segment label
      const color = colors?.[segment.label] || colors?.default || defaultColors.default

      const segmentElement = createElement('div', {
        part: `segment segment-${segment.label}`,
        style: {
          position: 'absolute',
          left: `${startPosition}px`,
          width: `${width}px`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '2px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          borderLeft: '1px solid rgba(0, 0, 0, 0.5)',
          borderRight: '1px solid rgba(0, 0, 0, 0.5)',
        },
      })

      // Add label text
      createElement('div', {
        part: 'segment-label',
        textContent: segment.label,
        style: {
          padding: '2px 5px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '0px 0px 2px rgba(0, 0, 0, 0.5)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      }, segmentElement)

      this.virtualAppend(startPosition, segmentsContainer, segmentElement)
    })

    this.segmentsWrapper.innerHTML = ''
    this.segmentsWrapper.appendChild(segmentsContainer)

    this.emit('ready')
  }
}

export default SegmentsPlugin



