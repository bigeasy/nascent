var cadence = require('cadence')
var delta = require('delta')
var Staccato = require('staccato')

function Response (interlocutor, socket, envelope) {
    var headers = envelope.body.headers
    headers['sec-conduit-rendezvous-actual-path'] = envelope.body.actualPath
    envelope.body.rawHeaders.push('sec-conduit-rendezvous-actual-path', envelope.body.actualPath)
    this._request = interlocutor.request({
        httpVersion: envelope.body.httpVersion,
        method: envelope.body.method,
        url: envelope.body.url,
        headers: headers,
        rawHeaders: envelope.body.rawHeaders
    })
    this._socket = socket
    this._socket.read.pump(this)
}

Response.prototype.respond = cadence(function (async) {
    async(function () {
        delta(async()).ee(this._request).on('response')
    }, function (response) {
        async(function () {
            this._socket.write.enqueue({
                module: 'rendezvous',
                method: 'header',
                body: {
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
                    this._socket.write.enqueue({
                        module: 'rendezvous',
                        method: 'chunk',
                        body: buffer
                    }, async())
                })
            })()
        }, function () {
            // TODO Use Conduit framing, use this only for actual trailers.
            this._socket.write.enqueue({
                module: 'rendezvous',
                method: 'trailer',
                body: null
            }, async())
        }, function () {
            this._socket.write.enqueue(null, async())
        })
    }, function () {
        return []
    })
})

Response.prototype.enqueue = cadence(function (async, envelope) {
    if (envelope == null) {
        return []
    }
    switch (envelope.method) {
    case 'chunk':
        this._request.write(envelope.body, async())
        break
    case 'trailer':
        this._request.end()
        break
    }
    return []
})

module.exports = Response
