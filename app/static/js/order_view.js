// app/static/js/order_view.js

let socket = null;

function updateOrdersDisplay(orders) {
    console.log("Updating orders display with:", orders);
    const ordersContainer = document.getElementById('ordersContainer');
    ordersContainer.innerHTML = ''; // Clear previous entries

    orders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order';

        const orderHeader = document.createElement('h3');
        orderHeader.textContent = `${order.order_id} - ${order.order_name} / ${order.phone_number}`;
        orderDiv.appendChild(orderHeader);

        const orderSizeStyle = document.createElement('p');
        orderSizeStyle.textContent = `${order.size_name} / ${order.style_name}`;
        orderDiv.appendChild(orderSizeStyle);

        const toppingsList = document.createElement('ul');
        order.toppings.forEach(topping => {
            const li = document.createElement('li');
            li.textContent = topping;
            toppingsList.appendChild(li);
        });
        orderDiv.appendChild(toppingsList);

        const createdDate = document.createElement('p');
        createdDate.textContent = `Created: ${order.created_at}`;
        orderDiv.appendChild(createdDate);

        const totalPrice = document.createElement('p');
        totalPrice.textContent = `Total: $${order.total_price}`;
        orderDiv.appendChild(totalPrice);

        const completeButton = document.createElement('button');
        completeButton.textContent = 'Complete';
        completeButton.onclick = () => completeOrder(order.order_id);
        orderDiv.appendChild(completeButton);

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.onclick = () => cancelOrder(order.order_id);
        orderDiv.appendChild(cancelButton);

        ordersContainer.appendChild(orderDiv);
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

    socket.onopen = function (e) {
        console.log("Connection established");
    };

    socket.onmessage = function (event) {
        console.log("Data received from server:", event.data);
        try {
            const parsedData = JSON.parse(event.data);
            if (parsedData.orders) {
                updateOrdersDisplay(parsedData.orders);
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

function completeOrder(orderId) {
    fetch(`/api/orders/${orderId}/complete`, {method: 'POST'})
        .then(response => response.json())
        .then(data => alert(data.message))
        .catch(error => console.error('Error completing order:', error));
}

function cancelOrder(orderId) {
    fetch(`/api/orders/${orderId}/cancel`, {method: 'POST'})
        .then(response => response.json())
        .then(data => alert(data.message))
        .catch(error => console.error('Error canceling order:', error));
}

connect();
