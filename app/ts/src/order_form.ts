// app/ts/src/order_form.ts
import {Modal, showAlert} from './common'

function orderForm() {
    const orderNameInput = document.getElementById('orderName') as HTMLInputElement
    const phoneNumberInput = document.getElementById('phoneNumber') as HTMLInputElement
    const sizeSelect = document.getElementById('pizzaSize') as HTMLSelectElement
    const styleSelect = document.getElementById('pizzaStyle') as HTMLSelectElement
    const toppingsSelect = document.getElementById('toppings') as HTMLSelectElement
    const orderTotalSpan = document.getElementById('orderTotal') as HTMLSpanElement
    const orderForm = document.getElementById('orderForm') as HTMLFormElement
    const resetFormButton = document.getElementById('resetForm') as HTMLButtonElement
    const submitOrderButton = document.getElementById('submitOrder') as HTMLButtonElement
    const confirmModalElement = document.getElementById('confirmationModal')!
    const confirmModal = new Modal(confirmModalElement, {
        keyboard: false
    })
    const modalTitle = document.getElementById('confirmationModalLabel') as HTMLHeadingElement
    const confirmButton = document.getElementById('confirmActionButton') as HTMLButtonElement
    const modalOrderDetails = document.getElementById('confirmationModalBody') as HTMLDivElement

    function prepareOrderDetails(): string {
        const orderName = orderNameInput.value
        const phoneNumber = phoneNumberInput.value
        const pizzaSize = sizeSelect.selectedOptions[0]!.text
        const pizzaStyle = styleSelect.selectedOptions[0]!.text
        const toppings = Array.from(toppingsSelect.selectedOptions)
            .map(option => option.text).join(", ")
        const orderTotal = orderTotalSpan.textContent

        return `
            <div>
                <p><strong>Order Name:</strong> ${orderName}</p>
                <p><strong>Phone:</strong> ${phoneNumber}</p>
                <p><strong>Size:</strong> ${pizzaSize}</p>
                <p><strong>Style:</strong> ${pizzaStyle}</p>
                <p><strong>Toppings:</strong> ${toppings}</p>
                <p><strong>Order Total:</strong> ${orderTotal}</p>
            </div>
            `
    }

    function submitOrder() {
        const orderData = {
            order_name: orderNameInput.value.trim(),
            phone_number: phoneNumberInput.value.trim(),
            size_id: parseInt(sizeSelect.value, 10),
            style_id: parseInt(styleSelect.value, 10),
            toppings: Array.from(toppingsSelect.selectedOptions)
                .map(option => option.value)
                .filter(value => value !== '')
                .map(Number)
        }

        if (orderData.toppings.includes(NaN)) {
            showAlert('Please select valid toppings or none at all.', "error")
            return
        }

        fetch('/api/orders', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(orderData)
        }).then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    const message = 'Failed to submit order'
                    console.error(message, text)
                    showAlert(message, "error")
                    throw new Error(message) // Ensure the chain treats this path as an error
                })
            }
            return response.text().then(text => {
                const message = 'Order submitted successfully!'
                console.log(message, text)
                showAlert(message, "info")
                orderForm.reset()
                orderTotalSpan.textContent = "$0.00" // Reset the order total display
            })
        })
            .catch(error => {
                console.error('Fetch error:', error)
            })

    }

    function fetchOrderPrice() {
        const sizeId = sizeSelect.value
        const styleId = styleSelect.value
        const toppings = Array.from(toppingsSelect.selectedOptions).map(opt => opt.value).filter(v => v !== '')
        const toppingsNumbers = toppings.map(Number).filter(v => !isNaN(v))

        if (!sizeId || !styleId || isNaN(parseInt(sizeId)) || isNaN(parseInt(styleId))) {
            console.log("Selections are incomplete")
            orderTotalSpan.textContent = "$0.00"
            return
        }

        console.log("Sending price calculation request", {sizeId, styleId, toppings: toppingsNumbers})
        const params = new URLSearchParams({
            size_id: sizeId,
            style_id: styleId,
        })
        toppings.forEach(topping => params.append('toppings', topping))

        fetch(`/api/price?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                orderTotalSpan.textContent = `$${data.price.toFixed(2)}`
            })
            .catch(error => {
                console.error('Error calculating order price', error)
                showAlert('Failed to calculate price. Check console for details.', "error")
            })
    }

    // Update the modal title
    modalTitle.textContent = 'Confirm Order'

    // Add event listener for confirm action button on the confirmation modal
    confirmButton.onclick = (event) => {
        event.preventDefault()
        confirmModal.hide() // Hide the modal after submission
        submitOrder()
    }

    confirmModalElement.addEventListener('hidden.bs.modal', () => {
        modalOrderDetails.innerHTML = '' // Clear the modal content after closing
    })

    sizeSelect.addEventListener('change', fetchOrderPrice)
    styleSelect.addEventListener('change', fetchOrderPrice)
    toppingsSelect.addEventListener('change', fetchOrderPrice)
    fetchOrderPrice()

    // Display the modal with the order details when submit button is clicked
    submitOrderButton.addEventListener('click', async (event) => {
        event.preventDefault()
        // Check if the form is valid using HTML5 form validation
        if (!orderForm.checkValidity()) {
            orderForm.reportValidity() // This will show the browser's default validation error messages
            return // Stop the function if validation fails
        }
        console.log("Displaying confirmation modal")
        modalOrderDetails.innerHTML = prepareOrderDetails()
        confirmModal.show()
    })

    resetFormButton.addEventListener('click', () => {
        orderForm.reset()
        orderTotalSpan.textContent = "$0.00"
    })

    window.onload = () => {
        orderNameInput.focus()
    }
}

document.addEventListener('DOMContentLoaded', () => {
    orderForm()
})


