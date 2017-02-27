var cadence = require('cadence')
var Spigot = require('conduit/spigot')
var Header = require('./header')
var Staccato = require('staccato')

function Request (multiplexer, request, response, rewrite) {
    this._multiplexer = multiplexer
    this._request = request
    this._response = response
    this._rewrite = rewrite || nop
    this._spigot = new Spigot(this)
}

Request.prototype.fromSpigot = cadence(function (async, envelope) {
    if (envelope == null) {
        return []
    }
    switch (envelope.method) {
    case 'header':
        this._response.writeHead(envelope.body.statusCode,
            envelope.body.statusMessage, envelope.body.headers)
        break
    case 'chunk':
        this._response.write(envelope.body, async())
        break
    case 'trailer':
        this._response.end()
        break
    }
    return []
})

// http://stackoverflow.com/a/5426648
Request.prototype.consume = cadence(function (async) {
    async(function () {
        var header = new Header(this._request)
        this._rewrite.call(null, header)
        this._multiplexer.connect({
            module: 'rendezvous',
            method: 'header',
            body: header
        }, async())
    }, function (socket) {
        this._spigot.emptyInto(socket.basin)
        var readable = new Staccato.Readable(this._request)
        var loop = async(function () {
            async(function () {
                readable.read(async())
            }, function (buffer) {
                if (buffer == null) {
                    return [ loop.break ]
                }
                this._spigot.requests.enqueue({
                    module: 'rendezvous',
                    method: 'chunk',
                    body: buffer
                }, async())
            })
        })()
    }, function () {
        this._spigot.requests.enqueue({
            module: 'rendezvous',
            method: 'trailer',
            body: null
        }, async())
    }, function () {
        this._spigot.requests.enqueue(null, async())
    })
})

module.exports = Request
