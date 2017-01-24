var cadence = require('cadence')
var Procession = require('procession')

function Reactor (object, mapper) {
    this._object = object
    this._mapper = mapper
}

Reactor.prototype.request = cadence(function (async, envelope) {
    async(function () {
        this._object[this._mapper.map(envelope, this._object)](envelope, async())
    }, function (response) {
        if (envelope.from != null) {
            return {
                cookie: envelope.cookie,
                to: envelope.from,
                body: response
            }
        }
        return null
    })
})

module.exports = Reactor
