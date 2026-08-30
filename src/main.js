import './style.css';
import { initThreeScene } from './three-scene.js';
import { trackPageView, trackInteraction } from './tracker.js';

document.addEventListener('DOMContentLoaded', () => {
  // Track visitor telemetry
  trackPageView();

  // Initialize Three.js WebGL background scene
  initThreeScene();

  // ==========================================================================
  // CUSTOM FOLLOW CURSOR WITH INERTIA
  // ==========================================================================
  const cursor = document.getElementById('custom-cursor');
  const cursorRing = document.getElementById('custom-cursor-ring');

  let mouseX = -100;
  let mouseY = -100;
  let cursorX = -100;
  let cursorY = -100;
  let ringX = -100;
  let ringY = -100;

  let hasMoved = false;

  // Track mouse coordinates
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Hide default cursor on mouse move (fallback)
    if (!hasMoved) {
      cursor.style.opacity = '1';
      cursorRing.style.opacity = '1';
      hasMoved = true;
    }
  });

  // Render loop for custom cursor to achieve smooth lag/inertia
  function updateCursor() {
    // Center point coordinates logic
    cursorX += (mouseX - cursorX) * 0.25;
    cursorY += (mouseY - cursorY) * 0.25;
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = `${ringX}px`;
    cursorRing.style.top = `${ringY}px`;

    requestAnimationFrame(updateCursor);
  }
  updateCursor();

  // Handle cursor hover states
  const interactives = document.querySelectorAll('a, button, input, textarea, .project-card, .nav-link');
  
  interactives.forEach(el => {
    el.addEventListener('mouseenter', () => {
      document.body.classList.add('cursor-hover');
      
      // If it is a project card, we might add a drag cue representation
      if (el.classList.contains('project-card')) {
        document.body.classList.add('cursor-drag');
      }
    });
    
    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-hover');
      document.body.classList.remove('cursor-drag');
    });
  });

  // ==========================================================================
  // HERO SECTION MULTI-WORD TYPEWRITER EFFECT
  // ==========================================================================
  const phrases = [
    'Creative Developer',
    'WebGL Engineer',
    '3D UI Specialist',
    'Interactive Architect'
  ];
  
  let currentPhraseIdx = 0;
  let currentCharIdx = 0;
  let isDeleting = false;
  const typingSpeed = 100;
  const deletingSpeed = 50;
  const delayBetweenPhrases = 2500;
  
  const typingTextContainer = document.getElementById('typing-text');

  function typeEffect() {
    if (!typingTextContainer) return;
    
    const fullPhrase = phrases[currentPhraseIdx];
    
    if (isDeleting) {
      // Remove character
      typingTextContainer.textContent = fullPhrase.substring(0, currentCharIdx - 1);
      currentCharIdx--;
    } else {
      // Add character
      typingTextContainer.textContent = fullPhrase.substring(0, currentCharIdx + 1);
      currentCharIdx++;
    }

    let dynamicSpeed = isDeleting ? deletingSpeed : typingSpeed;

    // Check phrase boundaries
    if (!isDeleting && currentCharIdx === fullPhrase.length) {
      // Pause at full phrase
      dynamicSpeed = delayBetweenPhrases;
      isDeleting = true;
    } else if (isDeleting && currentCharIdx === 0) {
      isDeleting = false;
      // Go to next phrase
      currentPhraseIdx = (currentPhraseIdx + 1) % phrases.length;
      dynamicSpeed = 400; // Pause before typing next word
    }

    setTimeout(typeEffect, dynamicSpeed);
  }

  // Launch typewriter animation
  setTimeout(typeEffect, 1000);

  // ==========================================================================
  // SECTION TRANSITIONS (INTERSECTION OBSERVER)
  // ==========================================================================
  const sections = document.querySelectorAll('section');
  
  const sectionObserverOptions = {
    root: null,
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px' // triggers slightly before section enters viewport
  };

  const sectionObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, sectionObserverOptions);

  sections.forEach(section => {
    sectionObserver.observe(section);
  });

  // Immediate visibility for hero section to avoid lag
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    heroSection.classList.add('visible');
  }

  // ==========================================================================
  // CONTACT FORM SUBMISSION (SIMULATION)
  // ==========================================================================
  const contactForm = document.getElementById('contact-form');
  const formFeedback = document.getElementById('form-feedback');

  if (contactForm && formFeedback) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Reset feedback states
      formFeedback.textContent = '';
      formFeedback.className = 'form-feedback';

      // Grab components
      const submitBtn = contactForm.querySelector('.submit-btn');
      const submitBtnText = submitBtn.querySelector('span');
      const originalText = submitBtnText.textContent;

      // Update button state
      submitBtnText.textContent = 'TRANSMITTING...';
      submitBtn.disabled = true;

      // Simulate network request delay (1.5 seconds)
      setTimeout(() => {
        // Restore button state
        submitBtnText.textContent = originalText;
        submitBtn.disabled = false;

        // Display success response
        formFeedback.textContent = 'Transmission received. Connection established!';
        formFeedback.classList.add('success');

        // Reset form inputs
        contactForm.reset();

        // Clear feedback message after 5 seconds
        setTimeout(() => {
          formFeedback.textContent = '';
          formFeedback.className = 'form-feedback';
        }, 5000);

      }, 1500);
    });
  }
});
