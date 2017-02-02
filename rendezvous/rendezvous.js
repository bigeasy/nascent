var assert = require('assert')
var abend = require('abend')
var cadence = require('cadence')
var coalesce = require('nascent.coalesce')
var WildMap = require('wildmap')
var url = require('url')
var coalesce = require('nascent.coalesce')
var Spigot = require('conduit/spigot')
var Staccato = require('staccato')

// Evented message queue.
var Procession = require('procession')

var Multiplexer = require('conduit/multiplexer')

function Rendezvous () {
    this._connections = new WildMap
    this._paths = []
}

Rendezvous.prototype.listener = function (callback, request, response) {
    this.middleware(request, response, callback)
}

Rendezvous.prototype.middleware = function (request, response, next) {
    var parsed = url.parse(request.url)
    var path = parsed.path.split('/')
    var connection = this._connections.match(path).pop()
    if (connection) {
        var request = new Request(this, connection, request, response)
        request.consume(function (error) { if (error) next(error) })
    } else {
        next()
    }
}

Rendezvous.prototype.upgrade = function (request, socket) {
    var path = request.headers['sec-conduit-rendezvous-path']
    if (path == null) {
        return false
    }
    var paths = this._paths, connections = this._connections, magazine = this._magazine

    path = path.split('/')

    var connection = connections.get(path)[0]
    if (connection != null) {
        connection.close.call(null)
    }
    connection = {
        path: path.join('/'),
        close: close,
        socket: socket,
        multiplexer: new Multiplexer(socket, socket)
    }
    connection.multiplexer.listen(abend)
    connections.add(path, connection)
    this._paths.push(path.join('/'))

    //socket.once('error', function () { })

    function close () {
        connection.multiplexer.destroy()
        connections.remove(path, connections.get(path)[0])
        paths.splice(paths.indexOf(path.join('/')), 1)
        socket.destroy()
    }

    return true
}

function Request (rendezvous, connection, request, response) {
    this._rendezvous = rendezvous
    this._connection = connection
    this._request = request
    this._response = response
    this._spigot = new Spigot.Queue(this)
}

Request.prototype.enqueue = cadence(function (async, envelope) {
    Procession.raiseError(envelope)
    switch (envelope.method) {
    case 'entry':
        envelope = envelope.body
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
        break
    case 'endOfStream':
        break
    }
})

// http://stackoverflow.com/a/5426648
Request.prototype.consume = cadence(function (async) {
    var location = url.parse(this._request.url)
    var path = location.pathname
    location.pathname = location.pathname.substring(this._connection.path.length)
    location = url.format(location)
    async(function () {
        this._connection.multiplexer.connect(async())
    }, function (socket) {
        this._spigot.emptyInto(socket.basin)
        this._spigot.requests.enqueue({
            module: 'rendezvous',
            method: 'header',
            body: {
                httpVersion: this._request.httpVersion,
                method: this._request.method,
                url: location,
                headers: this._request.headers,
                actualPath: path,
                rawHeaders: coalesce(this._request.rawHeaders, [])
            }
        }, async())
    }, function () {
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

Rendezvous.prototype.close = cadence(function (async) {
    async.forEach(function (path) {
        this._connections.get(path.split('/'))[0].socket.end(async())
    })(this._paths)
})

module.exports = Rendezvous
