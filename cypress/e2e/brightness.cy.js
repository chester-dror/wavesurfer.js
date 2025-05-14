/// <reference types="cypress" />

describe('Brightness-based coloring', () => {
  beforeEach(() => {
    cy.visit('/brightness-coloring.html')
    cy.wait(1000) // Wait for wavesurfer to initialize
  })

  it('should render the waveform with brightness coloring', () => {
    // Check if the waveform is rendered
    cy.get('#waveform canvas').should('be.visible')
    
    // Check if the standard waveform is rendered for comparison
    cy.get('#waveform-standard canvas').should('be.visible')
    
    // Verify that the loading indicator is hidden
    cy.get('#loading').should('not.be.visible')
  })

  it('should toggle brightness coloring when button is clicked', () => {
    // Get the initial canvas data
    cy.get('#waveform canvas').first().then($canvas => {
      const initialImageData = $canvas[0].toDataURL()
      
      // Click the toggle button
      cy.get('#toggle-brightness').click()
      cy.wait(500) // Wait for re-render
      
      // Get the new canvas data
      cy.get('#waveform canvas').first().then($newCanvas => {
        const newImageData = $newCanvas[0].toDataURL()
        
        // The canvas should be different after toggling
        expect(initialImageData).not.to.equal(newImageData)
        
        // Toggle back
        cy.get('#toggle-brightness').click()
        cy.wait(500) // Wait for re-render
        
        // Get the canvas data after toggling back
        cy.get('#waveform canvas').first().then($finalCanvas => {
          const finalImageData = $finalCanvas[0].toDataURL()
          
          // Should be similar to the initial state
          expect(finalImageData).to.equal(initialImageData)
        })
      })
    })
  })

  it('should change colors when selecting different color schemes', () => {
    // Get the initial canvas data
    cy.get('#waveform canvas').first().then($canvas => {
      const initialImageData = $canvas[0].toDataURL()
      
      // Select a different color scheme
      cy.get('#color-scheme').select('rainbow')
      cy.wait(500) // Wait for re-render
      
      // Get the new canvas data
      cy.get('#waveform canvas').first().then($newCanvas => {
        const newImageData = $newCanvas[0].toDataURL()
        
        // The canvas should be different after changing color scheme
        expect(initialImageData).not.to.equal(newImageData)
      })
    })
  })

  it('should play and pause the audio', () => {
    // Click play button
    cy.get('#play').click()
    
    // Wait a bit for playback to start
    cy.wait(500)
    
    // Check if progress has been made (progress wrapper width should be > 0)
    cy.get('#waveform .progress').should('have.css', 'width').and('not.equal', '0px')
    
    // Click pause
    cy.get('#play').click()
    
    // Store the current progress
    cy.get('#waveform .progress').invoke('width').then(width1 => {
      // Wait a bit
      cy.wait(500)
      
      // Check if progress has stopped (width should be the same)
      cy.get('#waveform .progress').invoke('width').should(width2 => {
        expect(width1).to.equal(width2)
      })
    })
  })
})
