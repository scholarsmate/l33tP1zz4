// alert_modal.js
function showAlert(message, type = 'info') {
    const alertModal = document.getElementById('alertModal');
    const alertModalBody = document.getElementById('alertModalBody');
    const alertModalTitle = document.getElementById('alertModalLabel');
    const alertModalIcon = document.getElementById('alertModalIcon'); // ID for the icon span

    // Update icons and titles based on the type
    if (type === 'error') {
        alertModalTitle.textContent = 'Error';
        alertModalBody.parentNode.parentNode.classList.add('border-danger');
        alertModalBody.parentNode.parentNode.classList.remove('border-primary');
        alertModalIcon.className = 'bi bi-exclamation-triangle-fill'; // Bootstrap error icon
        alertModalIcon.style.color = 'red'; // Optional: color the icon
    } else {  // Default to 'info'
        alertModalTitle.textContent = 'Information';
        alertModalBody.parentNode.parentNode.classList.add('border-primary');
        alertModalBody.parentNode.parentNode.classList.remove('border-danger');
        alertModalIcon.className = 'bi bi-info-circle-fill'; // Bootstrap info icon
        alertModalIcon.style.color = 'blue'; // Optional: color the icon
    }

    alertModalBody.innerHTML = message;  // Set the message in the modal
    const bootstrapModal = new bootstrap.Modal(alertModal, {
        keyboard: true
    });
    bootstrapModal.show();  // Display the modal
}

export {showAlert};  // Export the showAlert function
