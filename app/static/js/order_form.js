// app/static/js/order_form.js
import {showAlert} from './alert_modal.js';

document.addEventListener('DOMContentLoaded', function () {
    const orderNameInput = document.getElementById('orderName');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const sizeSelect = document.getElementById('pizzaSize');
    const styleSelect = document.getElementById('pizzaStyle');
    const toppingsSelect = document.getElementById('toppings');
    const orderTotalSpan = document.getElementById('orderTotal');
    const orderForm = document.getElementById('orderForm');
    const resetFormButton = document.getElementById('resetForm');
    const submitOrderButton = document.getElementById('submitOrder');
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmationModal'), {
        keyboard: false
    });
    const modalTitle = document.getElementById('confirmationModalLabel');
    const confirmButton = document.getElementById('confirmActionButton');
    const modalOrderDetails = document.getElementById('confirmationModalBody');

    function prepareOrderDetails() {
        const orderName = orderNameInput.value;
        const phoneNumber = phoneNumberInput.value;
        const pizzaSize = sizeSelect.selectedOptions[0].text;
        const pizzaStyle = styleSelect.selectedOptions[0].text;
        const toppings = Array.from(document.getElementById('toppings').selectedOptions)
            .map(option => option.text).join(", ");
        const orderTotal = orderTotalSpan.textContent;

        return `
            <div>
                <p><strong>Order Name:</strong> ${orderName}</p>
                <p><strong>Phone:</strong> ${phoneNumber}</p>
                <p><strong>Size:</strong> ${pizzaSize}</p>
                <p><strong>Style:</strong> ${pizzaStyle}</p>
                <p><strong>Toppings:</strong> ${toppings}</p>
                <p><strong>Order Total:</strong> ${orderTotal}</p>
            </div>
            `;
    }

    async function submitOrder() {
        const orderData = {
            order_name: orderNameInput.value.trim(),
            phone_number: phoneNumberInput.value.trim(),
            size_id: parseInt(sizeSelect.value, 10),
            style_id: parseInt(styleSelect.value, 10),
            toppings: Array.from(toppingsSelect.selectedOptions)
                .map(option => option.value)
                .filter(value => value)
                .map(Number)
        };

        if (orderData.toppings.includes(NaN)) {
            showAlert('Please select valid toppings or none at all.', "error");
            return;
        }

        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const message = 'Failed to submit order';
            console.error(message, await response.text());
            showAlert(message, "error");
        } else {
            const message = 'Order submitted successfully!';
            console.log(message);
            showAlert(message, "info");
            orderForm.reset();
            orderTotalSpan.textContent = "$0.00"; // Reset the order total display
        }
    }

    function fetchOrderPrice() {
        const sizeId = sizeSelect.value;
        const styleId = styleSelect.value;
        const toppings = Array.from(toppingsSelect.selectedOptions).map(opt => opt.value).filter(v => v);
        const toppingsNumbers = toppings.map(Number).filter(v => !isNaN(v));

        if (!sizeId || !styleId || isNaN(sizeId) || isNaN(styleId)) {
            console.log("Selections are incomplete");
            orderTotalSpan.textContent = "$0.00";
            return;
        }

        console.log("Sending price calculation request", {sizeId, styleId, toppings: toppingsNumbers});
        const params = new URLSearchParams({
            size_id: sizeId,
            style_id: styleId,
        });
        toppings.forEach(topping => params.append('toppings', topping));

        fetch(`/api/price?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                orderTotalSpan.textContent = `$${data.price.toFixed(2)}`;
            })
            .catch(error => {
                console.error('Error calculating order price', error);
                showAlert('Failed to calculate price. Check console for details.', "error");
            });
    }

    // Update the modal title
    modalTitle.textContent = 'Confirm Order';

    // Add event listener for confirm action button on the confirmation modal
    confirmButton.onclick = async (event) => {
        event.preventDefault();
        confirmModal.hide(); // Hide the modal after submission
        await submitOrder();
    };

    confirmModal._element.addEventListener('hidden.bs.modal', function () {
        modalOrderDetails.innerHTML = ''; // Clear the modal content after closing
    });

    sizeSelect.onchange = fetchOrderPrice;
    styleSelect.onchange = fetchOrderPrice;
    toppingsSelect.onchange = fetchOrderPrice;
    fetchOrderPrice();

    // Display the modal with the order details when submit button is clicked
    submitOrderButton.onclick = async function (event) {
        event.preventDefault();
        // Check if the form is valid using HTML5 form validation
        if (!orderForm.checkValidity()) {
            orderForm.reportValidity(); // This will show the browser's default validation error messages
            return; // Stop the function if validation fails
        }
        console.log("Displaying confirmation modal");
        modalOrderDetails.innerHTML = prepareOrderDetails();
        confirmModal.show();
    };

    resetFormButton.onclick = function () {
        orderForm.reset();
        orderTotalSpan.textContent = "$0.00";
    };

    window.onload = function () {
        orderNameInput.focus();
    };
});
