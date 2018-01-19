var coalesce = require('extant')
var cadence = require('cadence')
var Reactor = require('reactor')

var logger = require('prolific.logger').createLogger('environmentd')
var format = require('./logger')

function Middleware (env) {
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('GET /keys', 'keys')
        dispatcher.dispatch('GET /value/:id', 'value')
        dispatcher.dispatch('GET /json', 'json')
        dispatcher.dispatch('GET /health', 'health')
        dispatcher.logger = format
    })
    this.reactor.turnstile.health.turnstiles = 1
    this._env = JSON.parse(JSON.stringify(env))
}

Middleware.prototype.index = cadence(function (async, request) {
    request.entry.url = request.url
    return 'Environment API\n'
})

Middleware.prototype.keys = cadence(function (async, request) {
    request.entry.url = request.url
    var keys = Object.keys(this._env).sort()
    keys.push('')
    return keys.join('\n')
})

Middleware.prototype.value = cadence(function (async, request, key) {
    request.entry.url = request.url
    logger.info('value', { key: key, value: coalesce(this._env[key], '') + '\n' })
    return coalesce(this._env[key], '') + '\n'
})

Middleware.prototype.json = cadence(function (async) {
    return this._env
})

Middleware.prototype.health = cadence(function (async, request) {
    request.entry.url = request.url
    logger.info('health', { turnstile: this.reactor.turnstile.health })
    return { turnstile: this.reactor.turnstile.health }
})

module.exports = Middleware
