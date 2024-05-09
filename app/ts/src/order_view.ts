// app/ts/src/order_view.ts
import { Modal, Tooltip, showAlert } from './common'
import notificationSoundUrl from "url:../../resources/audio/tap_notification.mp3"

function orderView() {
    let socket: WebSocket | null = null

    // Preload the order update sound
    const orderUpdateSound: HTMLAudioElement = new Audio(notificationSoundUrl)

    function playOrderUpdateSound(): void{
        orderUpdateSound.play().catch(err => console.error('Error playing order update sound', err))
    }

    function completeOrder(orderId: number) {
        // Hide tooltip
        const tooltipElement = document.querySelector(`#completeButton${orderId}`) as HTMLElement
        const tooltip = Tooltip.getInstance(tooltipElement)
        tooltip?.hide()

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
                console.error(message, error)
                showAlert(message, "error")
            })
    }

    function cancelOrder(orderId: number) {
        const tooltipElement = document.querySelector(`#cancelButton${orderId}`) as HTMLElement
        const tooltip = Tooltip.getInstance(tooltipElement)
        tooltip?.hide()

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
            })
    }

    function showConfirmationModal(action: string, orderId: number) {
        const confirmModal = new Modal(document.getElementById('confirmationModal')!, {
            keyboard: false
        })
        const modalTitle = document.getElementById('confirmationModalLabel')!
        const confirmButton = document.getElementById('confirmActionButton')! as HTMLButtonElement

        modalTitle.textContent = action === 'complete' ? `Complete Order #${orderId}` : `Cancel Order #${orderId}`
        document.getElementById('confirmationModalBody')!.textContent =
            `Are you sure you want to ${action} order #${orderId}?`

        confirmButton.onclick = () => {
            action === 'complete' ? completeOrder(orderId) : cancelOrder(orderId)
            confirmModal.hide()
        }

        confirmModal.show()
    }

    function attachButtonHandlers(orderId: number) {
        const completeButton = document.getElementById(`completeButton${orderId}`)!
        const cancelButton = document.getElementById(`cancelButton${orderId}`)!

        new Tooltip(completeButton)
        new Tooltip(cancelButton)

        completeButton.addEventListener('click', () => showConfirmationModal('complete', orderId))
        cancelButton.addEventListener('click', () => showConfirmationModal('cancel', orderId))
    }

    function updateOrdersDisplay(orders: any[], connectionCount: number) {
        const orderCountElement = document.getElementById('orderCount')!
        const connectionCountElement = document.getElementById('connectionCount')!
        const ordersContainer = document.getElementById('ordersContainer')!
        orderCountElement.textContent = orders.length.toString()
        connectionCountElement.textContent = connectionCount.toString()
        ordersContainer.innerHTML = ''

        for (const order of orders) {
            const orderCard = document.createElement('div')
            orderCard.className = 'card mb-3 col-md-6'

            const toppingsList = order.toppings && order.toppings.length > 0 && order.toppings[0]
                ? '<ul>' + order.toppings.map((topping: string) => `<li>${topping}</li>`).join('') + '</ul>'
                : '<em>None</em>'

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
        `

            ordersContainer.appendChild(orderCard)
            attachButtonHandlers(order.order_id)
        }
    }

    function connect() {
        socket = new WebSocket('ws://localhost:8000/ws/orders')

        socket.onclose = function (e) {
            console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason)
            setTimeout(connect, 1000)
        }

        socket.onerror = function (err: Event) {
            console.error('Socket encountered error, closing socket:', err)
            if (socket) {
                socket.close()
            }
        }

        socket.onopen = function () {
            console.log("Connection established")
        }

        socket.onmessage = (event: MessageEvent) => {
            console.log("Data received from server:", event.data)
            try {
                const parsedData = JSON.parse(event.data)
                if (parsedData.orders_pending && parsedData.connection_count) {
                    updateOrdersDisplay(parsedData.orders_pending, parsedData.connection_count)
                    playOrderUpdateSound()
                } else {
                    console.error("Unexpected data received from server:", parsedData)
                }
            } catch (e) {
                console.error("Error parsing data from server:", e)
            }
        }

        socket.onclose = (event: CloseEvent) => {
            if (event.wasClean) {
                console.log(`Connection closed cleanly, code='${event.code}', reason='${event.reason}'`)
            } else {
                console.log('Connection died')
            }
        }

        socket.onerror = (error: Event) => {
            console.error("WebSocket error:", error)
        }
    }

    connect()
}

document.addEventListener('DOMContentLoaded', () => {
    orderView()
})

