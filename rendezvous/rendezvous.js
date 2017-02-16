var assert = require('assert')
var abend = require('abend')
var cadence = require('cadence')
var coalesce = require('nascent.coalesce')
var WildMap = require('wildmap')
var url = require('url')
var Spigot = require('conduit/spigot')
var Staccato = require('staccato')
var Destructor = require('destructible')

// Evented message queue.
var Procession = require('procession')

var Multiplexer = require('conduit/multiplexer')

function Rendezvous () {
    this._connections = new WildMap
    this._destructor = new Destructor
    this._destructor.markDestroyed(this, 'destroyed')
    this.paths = []
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
    if (this.destroyed) {
        socket.destroy()
        return
    }
    var path = request.headers['sec-conduit-rendezvous-path']
    if (path == null) {
        return false
    }
    var paths = this.paths, connections = this._connections, magazine = this._magazine

    var parts = path.split('/')

    connections.get(parts).forEach(function (connection) {
        if (connection.path == path) {
            connection.close.call(null)
        }
    })
    var connection = {
        path: path,
        close: close,
        socket: socket,
        multiplexer: new Multiplexer(socket, socket)
    }
    // TODO Instead of `abend`, some sort of cleanup and recovery.
    connection.multiplexer.listen(abend)
    connections.add(parts, connection)
    paths.push(path)

    //socket.once('error', function () { })

    function close () {
        connection.multiplexer.destroy()
        connections.remove(parts, connections.get(path)[0])
        paths.splice(paths.indexOf(path), 1)
        socket.destroy()
    }

    return true
}

function Request (rendezvous, connection, request, response) {
    this._rendezvous = rendezvous
    this._connection = connection
    this._request = request
    this._response = response
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

// TODO Maybe close is different from destroy?
Rendezvous.prototype._close = cadence(function (async) {
    async.forEach(function (path) {
        this._connections.get(path.split('/')).forEach(function (connection) {
            connection.multiplexer.destroy()
            connection.socket.destroy()
        })
    })(this.paths.slice(0, this.paths.length))
})

Rendezvous.prototype.close = function (callback) {
    this._close(coalesce(callback, abend))
}

module.exports = Rendezvous
