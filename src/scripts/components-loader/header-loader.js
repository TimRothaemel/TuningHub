import { throwNewError } from '../../output/error/error.js'

document.addEventListener('DOMContentLoaded', function() {
    let header = document.querySelector('.header')
    
    if (!header) {
        console.error('Header element not found');
        return
    }
    
    fetch('/src/components/header.html')
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.text()
        })
        .then((data) => {
            header.innerHTML = data
        })
        .catch((error) => {
            console.error('Error loading header:', error)
        })
})