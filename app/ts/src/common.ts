// app/ts/src/common.ts

/******************************************************************************
 * VENDOR
 *****************************************************************************/
// Import Bootstrap JavaScript
import {Modal, Tooltip} from 'bootstrap'
// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css'
// Import Bootstrap Icons
import 'bootstrap-icons/font/bootstrap-icons.css'

export {Modal, Tooltip}

/******************************************************************************
 * CUSTOM
 *****************************************************************************/
// Import custom styles
import '../../resources/css/style.css'

/******************************************************************************
 * FAVICON
 *****************************************************************************/
// Import the favicon
import faviconUrl from 'url:../../resources/img/pizza_slice.ico'

// Set the favicon dynamically
document.addEventListener('DOMContentLoaded', () => {
  const link: HTMLLinkElement = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/x-icon'
  link.href = faviconUrl
  document.head.appendChild(link)
})

/******************************************************************************
 * SHOW ALERT
 *****************************************************************************/
type AlertType = 'info' | 'error';

export function showAlert(message: string, type: AlertType = 'info') {
    const alertModal = document.getElementById('alertModal') as HTMLElement
    const alertModalBody = document.getElementById('alertModalBody') as HTMLElement
    const alertModalTitle = document.getElementById('alertModalLabel') as HTMLElement
    const alertModalIcon = document.getElementById('alertModalIcon') as HTMLElement

    // Use HTMLElement type casting for classList manipulation
    const modalParent = alertModalBody.parentNode as HTMLElement
    const modalGrandparent = modalParent.parentNode as HTMLElement

    // Update icons and titles based on the type
    if (type === 'error') {
        alertModalTitle.textContent = 'Error'
        modalGrandparent.classList.add('border-danger')
        modalGrandparent.classList.remove('border-primary')
        alertModalIcon.className = 'bi bi-exclamation-triangle-fill' // Bootstrap error icon
        alertModalIcon.style.color = 'red' // Optional: color the icon
    } else {  // Default to 'info'
        alertModalTitle.textContent = 'Information'
        modalGrandparent.classList.add('border-primary')
        modalGrandparent.classList.remove('border-danger')
        alertModalIcon.className = 'bi bi-info-circle-fill' // Bootstrap info icon
        alertModalIcon.style.color = 'blue' // Optional: color the icon
    }

    alertModalBody.innerHTML = message  // Set the message in the modal
    const bootstrapModal = new Modal(alertModal, {
        keyboard: true
    })
    bootstrapModal.show()  // Display the modal
}
