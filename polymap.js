/*
 *  polyMap()  - редактор полигонов
 *
 *  @options Object
 *
 *  return polyMap
 *
 */

(function(W,$) {

  var polyMap = function(options) {
    var o = this;

    if(typeof ymaps == 'undefined') { console.error('API Яндекс.Карт не подключен!'); return false; }
    if(typeof $ == 'undefined') { console.error('jQuery не подключен!'); return false; }

    o.config = $.extend({
      className: 'poly-edit',
      mapCenter: [55.752255773019506, 37.61820190429672],
      mapZoom: 10,
      defaultName: 'Area',
      defaultColor: '#A700FF'
    }, options || {});

    o.j = {};

    ymaps.ready(function() { o.init.apply(o); });

  };

  polyMap.prototype = {

    init: function() {
      var o = this;

      if(!o.config.inputElement) {
        o.config.inputElement = $('<input type="text" />').appendTo($('body'));
      }

      o.config.inputElement.hide();

      o.j.container = $('<div />').addClass(o.config.className).insertAfter(o.config.inputElement);

      try {
        o.map = new ymaps.Map(o.j.container.get(0), {
          center: o.config.mapCenter,
          zoom: o.config.mapZoom,
          type: "yandex#map"
        });
        o.map.behaviors.enable('scrollZoom');
      } catch(e) {
        console.error('Ошибка создания карты', e);
      }
      
      o.polys = new ymaps.GeoObjectCollection();
      o.map.geoObjects.add(o.polys);
      o.loadInputJson();

      o.btn = {};
      o.map.controls.add('zoomControl', { top: 5, right: 5 });
      if(!o.config.readonly) o.map.controls.add(o.newPresetsList(), { top: 5, left: 160});
      o.map.controls.add(o.btn.create = o.newButtonCreate(), {top: 5, left: 5});
      o.map.controls.add(o.btn.remove = o.newButtonRemove(), {top: 5, left: 80});

      if(o.polys.geometry) o.map.setBounds(o.polys.getBounds());
    },

    newPoly: function(opts) {
      var o = this,
          poly;

      try {
        poly = new ymaps.Polygon( opts.coords, {
          hintContent: opts.name || o.config.defaultName
        }, {
          fillColor: opts.color || o.config.deafultColor,
          interactivityModel: 'default#opaque',
          draggable: !(o.config.readonly),
          strokeWidth: 2,
          opacity: 0.5
        });

      } catch ( e ) {
        console.error( 'Ошибка при добавлении полигона', e );
      }

      poly.name = opts.name;

      if(!o.config.readonly) {
        poly.editor.options.set('addInteriors',false);
        poly.events.add('mousedown', function() {
          if(o.currentPoly) {
            o.currentPoly.editor.stopEditing();
          }
          o.currentPoly = poly;
          o.currentPoly.editor.startEditing();
        });

        poly.events.add('geometrychange', function() {
          o.updateInput();
        });
      }

      return poly;
    },

    addPoly: function(params) {
      var o = this, poly;
      o.polys.add( poly = o.newPoly( params ) );        
      return poly;
    },

    loadInputJson: function() {
      var o = this, inputVal, data;

      try {
        data = new Function('return' + o.config.inputElement.val())();
      } catch(e) {
        console.error('Ошибка получения координат из поля', e);
      }

      $.each(data || {}, function(name, coord) {
        o.addPoly({ coords: coord, name: name});
      });
    },

    newButtonCreate: function() {
      var o = this,
          buttonCreate = new ymaps.control.Button({
            data: {
             //image: 'images/button.jpg',
             content: 'Создать',
             title: 'Создать новый'
            }
          }, {
            selectOnClick: false
          });

      buttonCreate.events.add('click', function(e) {
        var center = o.map.getCenter(), poly, coords;

        coords = [[center]];
        
        poly = o.addPoly({
          name: o.config.defaultName,
          coords: coords,
          color: o.config.defaultColor
        });

        if(o.currentPoly) o.currentPoly.editor.stopEditing();
        o.currentPoly = poly;
        o.currentPoly.editor.startEditing();

        o.updateInput();
      });
      return buttonCreate;
    },

    newPresetsList: function() {
      var o = this,
          items=[],
          presetsList;

      $.each(o.config.presets, function(i, preset) {
        var item;

        items.push(item = new ymaps.control.ListBoxItem({ 
          data: { content: preset.name }
        }));       

        item.events.add('click', function () {
          o.addPoly(preset);        
          presetsList.collapse();
          o.updateInput();
        });
      });

      presetsList = new ymaps.control.ListBox({
        data: { title: 'Добавить из списка' },
        items: items
      });

      return presetsList;
    },

    newButtonRemove: function() {
      var o = this,
          buttonRemove = new ymaps.control.Button({
            data: {
              content: 'Удалить',
              title: 'Удалить текущий полигон'
            }
          },{
            selectOnClick: false
          });

      buttonRemove.events.add('click', function(e) {

        if(o.currentPoly) {
          o.currentPoly.getParent().remove(o.currentPoly)
          o.currentPoly = false;
        }
        o.updateInput();
      });

      return buttonRemove;
    },

    updateInput: function() {
      var o = this,
          polys = {},
          json = '',
          index = 0;

      o.polys.each(function (obj) {
        if (obj.geometry.getType() == 'Polygon') {
          polys[obj.name ? obj.name : 'Area_' + (index++)] = obj.geometry.getCoordinates();
        }
      });

      json = JSON.stringify(polys);
      o.config.inputElement.val(json);
      if(o.config.onchange) o.config.onchange(polys);
    },

    clear: function() {
      var o = this;
      o.polys.each(function (obj) {
        if (obj.geometry.getType() == 'Polygon') {
          o.polys.remove(obj);
        }
      });
    },

    show: function() {},

    hide: function() {},

    destroy: function() {
    }

  };

  W.polyMap = polyMap;


})(window, jQuery);

//--8<-------------------------------------------------------------------------
// Закоменчены необязательные параметры
// центр и зум выставляется автоматически на коллекцию полигонов

$(function() {
  var myPolyMap = new polyMap({
    inputElement: $('#polygon_editor'),
    readonly: false,
    onchange: function(coords) {
    },
    presets: [
      {name: 'Preset 1', color: '#6FBE41', coords: [[[55.76,37.68],[55.76,37.80],[55.79, 37.80]]]},
      {name: 'Preset 2', color: '#748FD2', coords: [[[55.95,37.94],[55.97,37.92],[55.95, 37.90]]]}
    ]//,
    //mapCenter: [55.752255773019506, 37.61820190429672],
    //mapZoom: 10
  });
});

//--8<-------------------------------------------------------------------------

JSON = JSON || {};
JSON.stringify = JSON.stringify || function (obj) {
  var t = typeof (obj);
  if (t != "object" || obj === null) {
    if (t == "string") obj = '"'+obj+'"';
    return String(obj);
  }
  else {
    var n, v, json = [], arr = (obj && obj.constructor == Array);
    for (n in obj) {
      v = obj[n]; t = typeof(v);
      if (t == "string") v = '"'+v+'"';
      else if (t == "object" && v !== null) v = JSON.stringify(v);
      json.push((arr ? "" : '"' + n + '":') + String(v));
    }
    return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
  }
}

