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

var Cache = require('magazine')
var Multiplexer = require('conduit/multiplexer')
var Basin = require('conduit/basin')

var Procession = require('procession')

var delta = require('delta')

function Envoy (middleware) {
    this._interlocutor = new Interlocutor(middleware)
    this._magazine = new Cache().createMagazine()
    this._header = new Header
    this._reactor = new Reactor({ object: this, method: '_respond' })
}

Envoy.prototype._connect = cadence(function (async, socket) {
    socket.spigot.emptyInto(new Response(this).basin)
    return []
})

function Response (envoy) {
    this._envoy = envoy
    this.basin = new Basin.Queue(this)
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

Response.prototype.enqueue = cadence(function (async, envelope) {
    Procession.raiseError(envelope)
    switch (envelope.method) {
    case 'entry':
        envelope = envelope.body
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
            this._respond(envelope.body.cookie, abend)
            break
        case 'chunk':
            this._request.write(envelope.body, async())
            break
        case 'trailer':
            this._request.end()
            break
        }
    case 'endOfStream':
        break
    }
})

Envoy.prototype.close = cadence(function (async) {
    this._multiplexer.destroy()
})

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
        this._multiplexer = new Multiplexer(socket, socket, {
            object: this, method: '_connect'
        })
        this._multiplexer.listen(head, async())
    })
})

module.exports = Envoy
