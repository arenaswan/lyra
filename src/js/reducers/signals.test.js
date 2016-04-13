/* eslint new-cap:0, no-unused-expressions:0 */
'use strict';
var expect = require('chai').expect;
var Immutable = require('immutable');

var actions = require('../constants/actions');
var signalsReducer = require('./signals');
var primitiveActions = require('../actions/primitiveActions');
var createScene = require('../actions/createScene');
var signalSetStreams = require('../actions/signalSetStreams');
var signalInit = require('../actions/signalInit');
var counter = require('../util/counter');

describe('signals reducer', function() {
  var initialState;

  beforeEach(function() {
    initialState = Immutable.Map();
  });

  it('is a function', function() {
    expect(signalsReducer).to.be.a('function');
  });

  it('returns an immutable map if state is not defined', function() {
    var result = signalsReducer();
    expect(Immutable.Map.isMap(result)).to.be.true;
    expect(result.size).to.equal(0);
  });

  it('does not mutate the state if an unrelated action is passed in', function() {
    var result = signalsReducer(initialState, {
      type: 'NOT_A_RELEVANT_ACTION'
    });
    expect(initialState).to.equal(result);
  });

  describe('init signal action', function() {

    it('initializes a signal within the signals store state object', function() {
      var result = signalsReducer(initialState, signalInit('lyra_rect_1_x', 50));
      expect(initialState.size).to.equal(0);
      expect(result.size).to.equal(1);
      expect(result.toJS()).to.deep.equal({
        lyra_rect_1_x: {
          name: 'lyra_rect_1_x',
          init: 50,
          _idx: 0
        }
      });
    });

    it('gives signals an incrementing _idx', function() {
      var initAction1 = signalInit('lyra_rect_1_x', 5),
          initAction2 = signalInit('lyra_another_signal_name', 'some value'),
          result = signalsReducer(signalsReducer(initialState, initAction1), initAction2);
      expect(initialState.size).to.equal(0);
      expect(result.size).to.equal(2);
      expect(result.toJS()).to.deep.equal({
        lyra_rect_1_x: {
          name: 'lyra_rect_1_x',
          init: 5,
          _idx: 0
        },
        lyra_another_signal_name: {
          name: 'lyra_another_signal_name',
          init: 'some value',
          _idx: 1
        }
      });
    });

  });

  describe('set stream action', function() {

    beforeEach(function() {
      initialState = signalsReducer(initialState, signalInit('lyra_rect_1_x', 5));
    });

    it('Adds a stream property to the specified signal', function() {
      var result = signalsReducer(initialState, signalSetStreams('lyra_rect_1_x', [{
        type: 'lyra_delta',
        expr: '(some)(vega)(expression)'
      }])).toJS();
      expect(result).to.have.property('lyra_rect_1_x');
      expect(result.lyra_rect_1_x).to.have.property('streams');
      expect(result.lyra_rect_1_x).to.deep.equal({
        name: 'lyra_rect_1_x',
        init: 5,
        _idx: 0,
        streams: [{
          type: 'lyra_delta',
          expr: '(some)(vega)(expression)'
        }]
      });
    });

  });

  describe('add primitive action', function() {
    var addMark;

    beforeEach(function() {
      // Reset counters module so that we can have predictable IDs for our new marks
      counter.reset();
      addMark = primitiveActions.addMark;
    });

    it('creates stream signals for the mark being created', function() {
      var result = signalsReducer(initialState, addMark({
        type: 'symbol',
        properties: {
          update: {
            size: {value: 100},
            x: {value: 25},
            y: {value: 30}
          }
        }
      })).toJS();
      expect(Object.keys(result).sort()).to.deep.equal([
        'lyra_symbol_1_size',
        'lyra_symbol_1_x',
        'lyra_symbol_1_y'
      ]);
      Object.keys(result).forEach(function(name) {
        var streams = result[name].streams;
        streams.forEach(function(signal) {
          expect(signal).to.have.property('type');
          expect(signal.type).to.equal('lyra_delta');
          expect(signal).to.have.property('expr');
          expect(signal.expr).to.be.a('string');
        });
      });
    });

    it('initializes all relevant signals for the mark being created', function() {
      var result = signalsReducer(initialState, addMark({
        type: 'rect',
        properties: {
          update: {
            x: {value: 25},
            y: {value: 250},
            fill: {value: '#4682b4'},
            fillOpacity: {value: 1},
            width: {signal: 'already_a_signal'}
          }
        }
      }));
      expect(initialState.size).to.equal(0);
      expect(result.size).to.equal(4);
      expect(Object.keys(result.toJS()).sort()).to.deep.equal([
        'lyra_rect_1_fill',
        'lyra_rect_1_fillOpacity',
        'lyra_rect_1_x',
        'lyra_rect_1_y'
      ]);
    });

  });

  describe('delete primitive action', function() {

    beforeEach(function() {
      // Reset counters module so that we can have predictable IDs for our marks
      counter.reset();
      initialState = signalsReducer(signalsReducer(initialState, primitiveActions.addMark({
        type: 'symbol',
        properties: {
          update: {
            size: {value: 100},
            x: {value: 25},
            y: {value: 30}
          }
        }
      })), primitiveActions.addMark({
        type: 'rect',
        properties: {
          update: {
            x: {value: 25},
            y: {value: 250},
            fill: {value: '#4682b4'},
            fillOpacity: {value: 1}
          }
        }
      }));
      // Assert that the state is set up correctly
      expect(Object.keys(initialState.toJS()).sort()).to.deep.equal([
        'lyra_rect_2_fill',
        'lyra_rect_2_fillOpacity',
        'lyra_rect_2_x',
        'lyra_rect_2_y',
        'lyra_symbol_1_size',
        'lyra_symbol_1_x',
        'lyra_symbol_1_y'
      ]);
    });

    it('removes all signals matching the provided mark type and ID', function() {
      var result = signalsReducer(initialState, {
        type: actions.PRIMITIVE_DELETE_MARK,
        markId: 1,
        markType: 'symbol'
      });
      expect(Object.keys(result.toJS()).sort()).to.deep.equal([
        'lyra_rect_2_fill',
        'lyra_rect_2_fillOpacity',
        'lyra_rect_2_x',
        'lyra_rect_2_y'
      ]);
    });

    it('does not remove any signals if no matching signal names are found', function() {
      var result = signalsReducer(initialState, {
        type: actions.PRIMITIVE_DELETE_MARK,
        markId: 1000,
        markType: 'snake'
      });
      expect(Object.keys(result.toJS()).sort()).to.deep.equal([
        'lyra_rect_2_fill',
        'lyra_rect_2_fillOpacity',
        'lyra_rect_2_x',
        'lyra_rect_2_y',
        'lyra_symbol_1_size',
        'lyra_symbol_1_x',
        'lyra_symbol_1_y'
      ]);
    });

  });

  describe('create scene action', function() {
    beforeEach(function() {
      // Reset counters module so that we can have predictable IDs for our new marks
      counter.reset();
    });

    it('initializes the scene width & height signals', function() {
      var result = signalsReducer(initialState, createScene());
      expect(result.toJS()).to.deep.equal({
        lyra_vis_width: {
          name: 'lyra_vis_width',
          init: 610,
          _idx: 0
        },
        lyra_vis_height: {
          name: 'lyra_vis_height',
          init: 610,
          _idx: 1
        }
      });

    });

  });

});