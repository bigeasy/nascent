var cadence = require('cadence')

var abend = require('abend')
var coalesce = require('nascent.coalesce')

var Staccato = require('staccato')
var Interlocutor = require('interlocutor')
var protocols = { http: require('http'), https: require('https') }
var Upgrader = { Socket: require('nascent.upgrader/socket') }
var Reactor = require('reactor')

var Header = require('nascent.jacket')
var url = require('url')

var Multiplexer = require('conduit/multiplexer')
var Basin = require('conduit/basin')

var Procession = require('procession')

var Signal = require('signal')

var Destructor = require('nascent.destructor')

var coalesce = require('nascent.coalesce')

var delta = require('delta')

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

Envoy.prototype._connect = cadence(function (async, socket) {
    socket.spigot.emptyInto(new Response(this).basin)
    return []
})

function Response (envoy) {
    this._envoy = envoy
    this.basin = new Basin(this)
}

Response.prototype._respond = cadence(function (async, cookie) {
    async(function () {
        delta(async()).ee(this._request).on('response')
    }, function (response) {
        async(function () {
            this.basin.responses.enqueue({
                module: 'rendezvous',
                method: 'header',
                body: {
                    cookie: cookie,
                    statusCode: response.statusCode,
                    statusMessage: response.statusMessage,
                    headers: response.headers
                }
            }, async())
        }, function () {
            var reader = new Staccato.Readable(response)
            var loop = async(function () {
                async(function () {
                    reader.read(async())
                }, function (buffer) {
                    if (buffer == null) {
                        return [ loop.break ]
                    }
                    this.basin.responses.enqueue({
                        module: 'rendezvous',
                        method: 'chunk',
                        cookie: cookie,
                        body: buffer
                    }, async())
                })
            })()
        }, function () {
            // TODO Use Conduit framing, use this only for actual trailers.
            this.basin.responses.enqueue({
                module: 'rendezvous',
                method: 'trailer',
                cookie: cookie,
                body: null
            }, async())
        }, function () {
            this.basin.responses.enqueue(null, async())
        })
    })
})

Response.prototype.fromBasin = cadence(function (async, envelope) {
    if (envelope == null) {
        return []
    }
    switch (envelope.method) {
    case 'header':
        var headers = envelope.body.headers
        headers['sec-conduit-rendezvous-actual-path'] = envelope.body.actualPath
        envelope.body.rawHeaders.push('sec-conduit-rendezvous-actual-path', envelope.body.actualPath)
        this._request = this._envoy._interlocutor.request({
            httpVersion: envelope.body.httpVersion,
            method: envelope.body.method,
            url: envelope.body.url,
            headers: headers,
            rawHeaders: envelope.body.rawHeaders
        })
        // TODO Instead of abend, something that would stop the request.
        this._respond(envelope.body.cookie, abend)
        break
    case 'chunk':
        this._request.write(envelope.body, async())
        break
    case 'trailer':
        this._request.end()
        break
    }
    return []
})

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
        this._destructor.addDestructor('called', function () { console.log('envoy destructing') })
        this._destructor.addDestructor('socket', socket.destroy.bind(socket))
        this.connected.notify()
        this.connected.open = []
        // Seems harsh, but once the multiplexer has been destroyed nothing is
        // going to be listening for any final messages.
        // TODO How do you feel about `bind`?
            console.log('--- xxx ---', this._destructor.destroyed)
        this._destructor.destructable(cadence(function (async) {
            async(function () {
                this._multiplexer = new Multiplexer(socket, socket, { object: this, method: '_connect' })
                this._destructor.addDestructor('multiplexer', this._multiplexer.destroy.bind(this._multiplexer))
                this._multiplexer.listen(head, async())
            }, function () {
                console.log('muxer stopped')
                this._destructor.destroy()
            })
        }).bind(this), async())
    }, function () {
        console.log('done')
    })
})

module.exports = Envoy
