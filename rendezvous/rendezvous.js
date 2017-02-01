var assert = require('assert')
var abend = require('abend')
var cadence = require('cadence')
var Cache = require('magazine')
var Monotonic = require('monotonic').asString
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
    this._magazine = new Cache().createMagazine()
    this._cookie = '0'
    this._requestNumber = 0xffffffff
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
        var cookie = this._nextCookie()
        var request = new Request(this, connection, request, response, cookie)
        // Note somewhere that this doesn't race because we only have one thread, we
        // don't have to let go at the end of the function or anything.
        this._magazine.put(cookie, response)
        request.consume(function (error) {
            if (error) console.log('ERROR!!!!', error.stack)
            if (error) next(error)
        })
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

Rendezvous.prototype._nextCookie = function () {
    return this._cookie = Monotonic.increment(this._cookie, 0)
}

Rendezvous.prototype._data = function (buffer) {
    for (var start = 0;  start != buffer.length;) {
        start = this._consume(buffer, start, buffer.length)
    }
}

function Request (rendezvous, connection, request, response, cookie) {
    this._rendezvous = rendezvous
    this._connection = connection
    this._request = request
    this._response = response
    this._cookie = cookie
    this._spigot = new Spigot.Queue(this)
}

Request.prototype.enqueue = cadence(function (async, envelope) {
    Procession.raiseError(envelope)
    switch (Procession.switchable(envelope, 'method', 'end')) {
    case 'header':
        this._response.writeHead(envelope.body.statusCode,
            envelope.body.statusMessage, envelope.body.headers)
        break
    case 'chunk':
        console.log('!!!', envelope)
        this._response.write(envelope.body, async())
        break
    case 'trailer':
        this._response.end()
    case 'end':
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
                cookie: this._cookie,
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

Request.prototype._consume = function (buffer) {
    this._socket.write(new Buffer(JSON.stringify({
        type: 'chunk',
        cookie: this._cookie,
        length: buffer.length
    }) + '\n'))
    this._socket.write(buffer)
}

Rendezvous.prototype._consume = function (buffer, start, end) {
    if (this._header.object != null) {
        var length = Math.min(buffer.length, this._header.object.length)
        var cartridge = this._magazine.hold(this._header.object.cookie, null)
        cartridge.value.response.write(buffer.slice(start, start + length))
        start += length
        cartridge.release()
        this._header = new Header
    }
    start = this._header.parse(buffer, start, end)
    if (this._header.object != null) {
        switch (this._header.object.type) {
        case 'header':
            var cartridge = this._magazine.hold(this._header.object.cookie, null)
            cartridge.value.response.writeHead(
                this._header.object.statusCode, this._header.object.statusMessage, this._header.object.headers)
            cartridge.release()
            this._header = new Header
            break
        case 'chunk':
            break
        case 'trailer':
            var cartridge = this._magazine.hold(this._header.object.cookie, null)
            cartridge.value.response.end()
            cartridge.remove()
            this._header = new Header
            break
        }
    }
    return start
}

Request.prototype._respond = function (buffer) {
    var start = 0
    while (start < buffer.length) {
        start = this._consume(buffer, start, buffer.length)
    }
}

Request.prototype.request = function (request, response) {
}

Rendezvous.prototype.close = cadence(function (async) {
        async.forEach(function (path) {
            this._connections.get(path.split('/'))[0].socket.end(async())
        })(this._paths)
})

module.exports = Rendezvous
