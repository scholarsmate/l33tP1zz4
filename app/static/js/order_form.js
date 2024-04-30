// app/static/js/order_form.js
// This script is used to handle the order form and its submission logic.

function validateOrderForm() {
    const orderName = document.getElementById('orderName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const sizeSelected = document.getElementById('pizzaSize').value;
    const styleSelected = document.getElementById('pizzaStyle').value;

    if (!orderName || !phoneNumber || !sizeSelected || !styleSelected) {
        alert("Please complete all required fields.");
        return false;
    }
    return true;
}

async function submitOrder() {
    const orderData = {
        order_name: document.getElementById('orderName').value.trim(),
        phone_number: document.getElementById('phoneNumber').value.trim(),
        size_id: parseInt(document.getElementById('pizzaSize').value, 10),
        style_id: parseInt(document.getElementById('pizzaStyle').value, 10),
        toppings: Array.from(document.getElementById('toppings').selectedOptions)
            .map(option => option.value)
            .filter(value => value)  // Ensure non-empty values
            .map(Number)  // Convert to numbers, ensuring no invalid entries
    };

    if (orderData.toppings.includes(NaN)) {
        alert('Please select valid toppings or none at all.');
        return;  // Prevent the submission if toppings include NaN
    }

    const response = await fetch('/api/orders/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });

    const responseBody = await response.text();  // Use text to ensure reading response does not cause error
    if (!response.ok) {
        console.error("Failed to submit order", responseBody);
        alert("Failed to submit order: " + responseBody);
    } else {
        console.log("Order submitted successfully!");
        alert("Order submitted successfully!");
        document.getElementById('orderForm').reset();  // Optionally reset the form
        document.getElementById('orderTotal').textContent = "$0.00";  // Reset the order total display
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const sizeSelect = document.getElementById('pizzaSize');
    const styleSelect = document.getElementById('pizzaStyle');
    const toppingsSelect = document.getElementById('toppings');
    const orderTotalSpan = document.getElementById('orderTotal');

    function fetchOrderPrice() {
        const sizeId = sizeSelect.value;
        const styleId = styleSelect.value;
        const toppings = Array.from(toppingsSelect.selectedOptions).map(opt => opt.value).filter(v => v);

        // Convert toppings to numbers, ignoring any that are NaN
        const toppingsNumbers = toppings.map(Number).filter(v => !isNaN(v));

        // Check if sizeId and styleId are selected
        if (!sizeId || !styleId || isNaN(sizeId) || isNaN(styleId)) {
            console.log("Selections are incomplete.");
            orderTotalSpan.textContent = "$0.00";
            return; // Exit the function if selections are not complete
        }

        console.log("Sending price calculation request with:", {sizeId, styleId, toppings: toppingsNumbers});

        fetch('/api/calculate-price/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                size_id: parseInt(sizeId),
                style_id: parseInt(styleId),
                toppings: toppingsNumbers
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch price: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Received price calculation response:", data); // Log the whole data object
                if (typeof data.total_price !== 'number') {
                    throw new Error("Invalid total_price type received from server");
                }
                orderTotalSpan.textContent = `$${data.total_price.toFixed(2)}`;
            })
            .catch(error => {
                console.error('Error calculating order price:', error);
                alert('Failed to calculate price. Check console for details.');
            });

    }

    sizeSelect.addEventListener('change', fetchOrderPrice);
    styleSelect.addEventListener('change', fetchOrderPrice);
    toppingsSelect.addEventListener('change', fetchOrderPrice);
    fetchOrderPrice(); // Initial price fetch

});

document.getElementById('resetForm').addEventListener('click', function() {
    const form = document.getElementById('orderForm');
    form.reset(); // Reset the form fields to their initial states

    // Manually clear multi-select for toppings if not automatically handled by form.reset()
    const toppingsSelect = document.getElementById('toppings');
    Array.from(toppingsSelect.options).forEach(option => option.selected = false);

    // Reset the order total display
    const orderTotalSpan = document.getElementById('orderTotal');
    orderTotalSpan.textContent = "$0.00";
});

document.getElementById('submitOrder').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent form submission

        const form = document.getElementById('orderForm');

    // Check if the form is valid using HTML5 form validation
    if (!form.checkValidity()) {
        form.reportValidity(); // This will show the browser's default validation error messages
        return; // Stop the function if validation fails
    }

    // Validate the form first
    if (!validateOrderForm()) {
        return; // Stop the function if validation fails
    }

    // Proceed with displaying the modal if validation passes
    const size = document.getElementById('pizzaSize').selectedOptions[0].text;
    const style = document.getElementById('pizzaStyle').selectedOptions[0].text;
    const toppings = Array.from(document.getElementById('toppings').selectedOptions).map(opt => opt.text).join(", ");
    const total = document.getElementById('orderTotal').textContent;

    document.getElementById('modalOrderDetails').textContent = `Size: ${size}, Style: ${style}, Toppings: ${toppings}`;
    document.getElementById('modalOrderTotal').textContent = `Total: ${total}`;

    // Show modal
    document.getElementById('confirmationModal').style.display = 'block';
});


document.getElementById('cancelOrder').addEventListener('click', function() {
    document.getElementById('confirmationModal').style.display = 'none';
});

document.getElementById('confirmOrder').addEventListener('click', async function() {
    document.getElementById('confirmationModal').style.display = 'none';
    await submitOrder(); // Ensure this handles the full submission logic.
});
