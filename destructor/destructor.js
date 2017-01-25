var coalesce = require('nascent.coalesce')
var DEFAULT = {
    interrupt: require('interrupt').createInterrupter('nascent.destructor')
}
var Operation = require('operation')

function Destructor (interrupt) {
    this._interrupt = coalesce(interrupt, DEFAULT.interrupt)
    this.destroyed = false
    this._janitors = {}
    this.asListener = this.asCallback = this.destroy.bind(this)
}

Destructor.prototype.destroy = function (error) {
    if (error) {
        this.check()
        this.cause = error
    }
    if (!this.destroyed) {
        this.destroyed = true
        for (var name in this._janitors) {
            this._janitors[name].apply([])
        }
        this._janitors = null
    }
}

Destructor.prototype.addJanitor = function (name, operation) {
    this._janitors[name] = new Operation(operation)
}

Destructor.prototype.removeJanitor = function (name) {
    delete this._janitors[name]
}

Destructor.prototype.getJanitors = function () {
    return Object.keys(this._janitors)
}

Destructor.prototype.check = function () {
    if (this.destroyed) {
        throw this._interrupt({
            name: 'destroyed',
            cause: coalesce(this.cause)
        })
    }
}

module.exports = Destructor
