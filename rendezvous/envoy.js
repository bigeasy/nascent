var cadence = require('cadence')

var abend = require('abend')
var coalesce = require('nascent.coalesce')

var Interlocutor = require('interlocutor')
var protocols = { http: require('http'), https: require('https') }
var Upgrader = { Socket: require('nascent.upgrader/socket') }
var Reactor = require('reactor')

var Header = require('nascent.jacket')
var url = require('url')

var Procession = require('procession')

var Signal = require('signal')

var Destructor = require('destructible')

var coalesce = require('nascent.coalesce')

var Conduit = require('conduit')
var Server = require('conduit/server')

var Response = require('./response')

function Envoy (middleware) {
    this.connected = new Signal
    this._interlocutor = new Interlocutor(middleware)
    this._header = new Header
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')
    this._reactor = new Reactor({ object: this, method: '_respond' })
    this._destructor.addDestructor('connected', function () {
        this.connected.notify()
        this.connected.open = []
    }.bind(this))
}

Envoy.prototype._connect = function (socket, envelope) {
    // TODO Instead of abend, something that would stop the request.
    new Response(this._interlocutor, socket, envelope).respond(abend)
}

// TODO Not sure exactly how to shutdown all the individual sockets but probably
// they're going to have to see an end-of-stream and shutdown.

//
Envoy.prototype._close = cadence(function (async) {
    this._destructor.destroy()
})

Envoy.prototype.close = function (callback) {
    this._close(coalesce(callback, abend))
}

Envoy.prototype.connect = cadence(function (async, location) {
    var parsed = url.parse(location)
    async(function () {
        Upgrader.Socket.connect({
            secure: parsed.protocol == 'https:',
            host: parsed.hostname,
            port: parsed.port,
            auth: parsed.auth,
            headers: {
                'sec-conduit-rendezvous-path': parsed.path
            }
        }, async())
    }, function (request, socket, head) {
        this._destructor.addDestructor('socket', socket.destroy.bind(socket))
        this.connected.notify()
        this.connected.open = []
        // Seems harsh, but once the multiplexer has been destroyed nothing is
        // going to be listening for any final messages.
        // TODO How do you feel about `bind`?
        this._destructor.async(async, 'connect')(function () {
            this._conduit = new Conduit(socket, socket)
            this._server = new Server({
                object: this, method: '_connect'
            }, 'rendezvous', this._conduit.read, this._conduit.write)
            this._destructor.addDestructor('conduit', this._conduit.destroy.bind(this._conduit))
            this._conduit.listen(head, async())
        })
    })
})

module.exports = Envoy
