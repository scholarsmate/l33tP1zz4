// app/static/js/order_view.js
import {showAlert} from './alert_modal.js';

let socket = null;

// Preload the click sound
const orderUpdateSound = new Audio('/static/audio/tap_notification.mp3');

function playOrderUpdateSound() {
    orderUpdateSound.play().catch(err => console.error('Error playing order update sound', err));
}

function completeOrder(orderId) {
    // Hide tooltip
    let tooltip = bootstrap.Tooltip.getInstance(document.querySelector(`#completeButton${orderId}`));
    if (tooltip) {
        tooltip.hide();
    }

    fetch(`/api/orders/${orderId}?order_status=${encodeURIComponent("completed")}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => showAlert(data.message, "info"))
        .catch(error => {
            const message = 'Error completing order'
            console.error(message, error);
            showAlert(message, "error")
        });
}

function cancelOrder(orderId) {
    // Hide tooltip
    let tooltip = bootstrap.Tooltip.getInstance(document.querySelector(`#cancelButton${orderId}`));
    if (tooltip) {
        tooltip.hide();
    }

    fetch(`/api/orders/${orderId}?order_status=${encodeURIComponent("canceled")}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => showAlert(data.message, "info"))
        .catch(error => {
            const message = 'Error canceling order'
            console.error(message, error)
            showAlert(message, "error")
        });
}

function showConfirmationModal(action, orderId) {
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmationModal'), {
        keyboard: false
    });
    const modalTitle = document.getElementById('confirmationModalLabel');
    const confirmButton = document.getElementById('confirmActionButton');

    // Update modal text based on the action
    modalTitle.textContent = action === 'complete' ? `Complete Order #${orderId}` : `Cancel Order #${orderId}`;
    document.getElementById('confirmationModalBody').textContent =
        `Are you sure you want to ${action} order #${orderId}?`;

    // Set confirm button action
    confirmButton.onclick = () => {
        if (action === 'complete') {
            completeOrder(orderId);
        } else {
            cancelOrder(orderId);
        }
        confirmModal.hide();
    };

    confirmModal.show();
}

function attachButtonHandlers(orderId) {
    const completeButton = document.getElementById(`completeButton${orderId}`);
    const cancelButton = document.getElementById(`cancelButton${orderId}`);
    new bootstrap.Tooltip(completeButton);
    new bootstrap.Tooltip(cancelButton);

    completeButton.onclick = () => showConfirmationModal('complete', orderId);
    cancelButton.onclick = () => showConfirmationModal('cancel', orderId);
}

function updateOrdersDisplay(orders) {
    const ordersContainer = document.getElementById('ordersContainer');
    ordersContainer.innerHTML = ''; // Clear previous entries

    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'card mb-3 col-md-6';

        let toppingsList = order.toppings && order.toppings.length > 0 && order.toppings[0]
            ? '<ul>' + order.toppings.map(topping => `<li>${topping}</li>`).join('') + '</ul>'
            : '<em>None</em>';

        orderCard.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title">${order.order_name} (#${order.order_id})</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${order.phone_number}</h6>
                    </div>
                    <div>
                        <button class="btn btn-outline-success ms-2" id="completeButton${order.order_id}" title="Complete Order #${order.order_id}">
                            <i class="bi bi-check-circle-fill"></i>
                        </button>
                        <button class="btn btn-outline-danger ms-2" id="cancelButton${order.order_id}" title="Cancel Order #${order.order_id}">
                            <i class="bi bi-x-circle-fill"></i>
                        </button>
                    </div>
                </div>
                <p class="card-text">${order.size_name} ${order.style_name} - $${parseFloat(order.price).toFixed(2)}</p>
                <p class="card-text">Toppings: ${toppingsList}</p>
                <p class="card-text"><small class="text-muted">Ordered at ${order.created_at}</small></p>
            </div>
        `;

        ordersContainer.appendChild(orderCard);
        // Attach tooltips and event listeners
        attachButtonHandlers(order.order_id);
    });

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function connect() {
    socket = new WebSocket('ws://localhost:8000/ws/orders');
    socket.onclose = function (e) {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        setTimeout(function () {
            connect();
        }, 1000);
    };

    socket.onerror = function (err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        socket.close();
    };

    socket.onopen = function () {
        console.log("Connection established");
    };

    socket.onmessage = function (event) {
        console.log("Data received from server:", event.data);
        try {
            const parsedData = JSON.parse(event.data);
            if (parsedData.orders_pending) {
                updateOrdersDisplay(parsedData.orders_pending);
                playOrderUpdateSound();
            } else {
                console.error("Unexpected data received from server:", parsedData);
            }
        } catch (e) {
            console.error("Error parsing data from server:", e);
        }
    };

    socket.onclose = function (event) {
        if (event.wasClean) {
            console.log(`Connection closed cleanly, code='${event.code}', reason='${event.reason}'`);
        } else {
            // e.g. server process killed or network down
            console.log('Connection died');
        }
    };

    socket.onerror = function (error) {
        console.error("WebSocket error:", error.message);
    };
}

connect();
