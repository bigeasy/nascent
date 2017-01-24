var coalesce = require('../coalesce')

function Prefixer (prefix) {
    this._prefix = coalesce(prefix, '_')
}

Prefixer.prototype.map = function (envelope, object) {
    return this._prefix + envelope.cookie
}

module.exports = Prefixer
