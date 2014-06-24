/* global jQuery */
var vde = {version: 1};

vde.App = angular.module('vde', ['ui.inflector', 'ui.sortable', 'xc.indexedDB', 'colorpicker.module'],
    function($compileProvider, $indexedDBProvider) {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(data|blob|https?|ftp|mailto|file):/);

      $indexedDBProvider
        .connection('lyraDB')
        .upgradeDatabase(vde.version, function(event, db){
          db.createObjectStore('files', {keyPath: 'fileName'});
        });
});

vde.App.controller('VdeCtrl', function($scope, $rootScope, $window, $timeout,
                                       $location, $http, timeline, Vis, iVis, vg) {
  $scope.load = function() {
    jQuery.migrateMute = true;

    // Load defaults on a timeout to allow everything else to load.
    $timeout(function() {
      if(vg.keys(Vis._rawData).length === 0) {
        Vis.data('medals', 'data/medals.json', 'json');
        Vis.data('olympics', 'data/olympics.json', 'json');
        Vis.data('groups', 'data/groups.json', 'json');
        Vis.data('barley', 'data/barley.json', 'json');
        Vis.data('iris', 'data/iris.json', 'json');
        Vis.data('jobs', 'data/jobs.json', 'json');
        Vis.data('cities', 'data/cities.json', 'json');
        Vis.data('army', 'data/army.json', 'json');
        Vis.data('temps', 'data/temps.json', 'json');
        Vis.data('trailers', 'data/trailers.json', 'json');
        Vis.data('movies', 'data/movies.json', 'json');
        Vis.data('characters', 'data/mis-characters.json', 'json');
        Vis.data('connections', 'data/mis-connections.json', 'json');
        Vis.data('trains', 'data/trains.json', 'json');
        Vis.data('stations', 'data/stations.json', 'json');
        Vis.data('unemployment', 'data/unemployment.json', 'json');
        Vis.data('wheat', 'data/wheat.json', 'json');
        Vis.data('monarchs', 'data/monarchs.json', 'json');
        Vis.data('hotels', 'data/hotels.json', 'json');
        Vis.data('rundown', 'data/rundown.json', 'json');
        Vis.data('deaths', 'data/curves.json', 'json');
        Vis.data('zipcodes', 'data/zipcodes.json', 'json');
        Vis.data('gas', 'data/gas.json', 'json');
      }

      var g = new Vis.marks.Group();
      $rootScope.activeGroup = $rootScope.activeLayer = g;

      var p = new Vis.Pipeline();
      $rootScope.activePipeline = p;

      // To be able to undo all the way back to a default/clean slate.
      Vis.parse().then(function() {
        timeline.save();

        $scope.$watch(function() { return $location.search(); }, function() {
          var ex = $location.search().example;
          if(ex) {
            $http.get('examples/' + ex + '.json').then(function(d) {
              timeline.timeline = d.data;
              timeline.redo();
            });
          }
        }, true);
      });
    }, 500);
  };

  $scope.marks = ['Rect', 'Symbol', 'Arc', 'Area', 'Line', 'Text'];

  // Prevent backspace from navigating back and instead delete
  $window.addEventListener('keydown', function(evt) {
    var m = iVis.activeMark;
    // if(!m || m.type != 'group') return;

    var preventBack = false;
    if (evt.keyCode == 8) {
      var d = evt.srcElement || evt.target;
      if (d.tagName.toUpperCase() === 'INPUT' || d.tagName.toUpperCase() === 'TEXTAREA' ||
          d.contentEditable == "true") {
        preventBack = d.readOnly || d.disabled;
      }
      else preventBack = true;
    }

    if (preventBack) {
      evt.preventDefault();
      if(m && m.type != 'group')
        $rootScope.$apply(function() { $rootScope.removeVisual('marks', m.name, m.group()); });
    }
  });

  // Prompt before unloading
  $window.addEventListener("beforeunload", function(e) {
    var msg = 'You have unsaved changed in Lyra.';
    (e || $window.event).returnValue = msg;     //Gecko + IE
    return msg;                                 //Webkit, Safari, Chrome etc.
  });
});

vde.App.controller('ScaleCtrl', function($scope, $rootScope, Vis) {
  $scope.types = ['linear', 'ordinal', 'log', 'pow', 'sqrt', 'quantile',
                  'quantize', 'threshold', 'utc', 'time', 'ref'];

  $scope.fromTypes = ['field', 'values'];
  $scope.rangeFromTypes = ['preset', 'values'];
  $scope.rangeTypes = ['spatial', 'colors', 'shapes', 'sizes', 'other'];
  $scope.axisTypes=['x', 'y'];
  $scope.nice = ['', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
  $scope.shapes = ['&#9724;', '&#9650;', '&#9660;', '&#11044;', '&#9830;', '&#43;'];

  $scope.deleteScale = function() {
    var scale = $rootScope.activeScale;
    if(scale.used || !scale.manual) return;

    scale.manual = false;
    Vis.parse().then(function() {
      $rootScope.editBinding({}, 'scale');
    });
  };
});

vde.App.directive('vdeTooltip', function() {
  return function(scope, element, attrs) {
    element.tooltip({
      title: attrs.vdeTooltip,
      placement: attrs.position ? attrs.position : 'bottom',
      // delay: { show: 300, hide: 150 },
      container: 'body'
    });
  };
});