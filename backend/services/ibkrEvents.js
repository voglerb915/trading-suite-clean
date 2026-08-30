const EventEmitter = require('events');
class OrderEventEmitter extends EventEmitter {}
const orderEvents = new OrderEventEmitter();

module.exports = orderEvents;