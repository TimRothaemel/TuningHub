// Import necessary functions
import { throwNewError } from '../../scripts/output/error/error.js'
import { printLog } from '../../scripts/output/log/log.js'

printLog('header-loader.js initialized')

document.addEventListener('DOMContentLoaded', function() {
    let header = document.querySelector('.header')
    
    if (!header) {
        throwNewError('Header element not found');
        return
    }
    
    fetch('/src/components/header.html')
        .then((response) => {
            if (!response.ok) {
                throwNewError(`HTTP error! status: ${response.status}`)
            }
            return response.text()
        })
        .then((data) => {
            header.innerHTML = data
        })
        .catch((error) => {
            throwNewError('Error loading header:', error)
        })
})