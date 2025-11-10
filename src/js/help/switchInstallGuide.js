function toggleOS(os) {
    console.log('Toggle OS:', os);
    
    const iOSButton = document.getElementById('changeOSiOS');
    const androidButton = document.getElementById('changeOSAndroid');
    const iOSGuide = document.getElementById('iOSGuide');
    const androidGuide = document.getElementById('AndroidGuide');
    const slider = document.querySelector('.button-slider');
    
    if (!slider) {
        console.error('Slider not found');
        return;
    }
    
    // Entferne active Klasse von allen Buttons und Guides
    iOSButton.classList.remove('active');
    androidButton.classList.remove('active');
    iOSGuide.classList.remove('active');
    androidGuide.classList.remove('active');
    
    // Füge active Klasse zum geklickten Button hinzu
    if (os === 'iOS') {
        iOSButton.classList.add('active');
        iOSGuide.classList.add('active');
        slider.style.transform = 'translateX(0)';
    } else {
        androidButton.classList.add('active');
        androidGuide.classList.add('active');
        slider.style.transform = 'translateX(calc(100% + 12px))'; // 100% + gap
    }
}

// Initialisiere beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    const buttonWrapper = document.querySelector('.button-wrapper');
    
    // Erstelle Slider falls nicht vorhanden
    if (!document.querySelector('.button-slider')) {
        const slider = document.createElement('div');
        slider.className = 'button-slider';
        buttonWrapper.appendChild(slider);
    }
    
    // Setze initialen Zustand
    toggleOS('iOS');
});