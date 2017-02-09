require('proof/redux')(7, require('cadence')(prove))

function prove (async, assert) {
    var Destructor = require('..')
    var destructor = new Destructor

    destructor.addDestructor('destructor', function () {
        assert(true, 'destructor ran')
    })
    destructor.addDestructor('invoked', function () {
        assert(true, 'destructor invoked')
    })
    destructor.addDestructor('removed', function () {
        throw new Error('should not run')
    })
    destructor.invokeDestructor('invoked')
    destructor.removeDestructor('removed')
    assert(destructor.getDestructors(), [ 'destructor' ], 'removed')

    destructor.check()

    async([function () {
        destructor.destructable(function (callback) {
            callback(new Error('cause'))
        }, async())
    }, function (error) {
        assert(error.message, 'cause', 'error thrown')
        assert(destructor.destroyed, true, 'destroyed')

        try {
            destructor.check()
        } catch (error) {
            console.log(error.stack)
            assert(/^nascent.destructor#destroyed$/m.test(error.message), 'destroyed')
        }

        destructor.destroy()

        destructor.addDestructor('destroyed', function () {
            assert(true, 'run after destroyed')
        })

        destructor.destructable(function () {
            assert(false, 'should not be called')
        }, async())
    }])
}
