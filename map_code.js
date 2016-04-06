mapboxgl.accessToken = 'pk.eyJ1IjoiamVmZmFsbGVuIiwiYSI6InJOdUR0a1kifQ.fTlTX02Ln0lwgaY4vkubSQ';

// map bounds
var sw = new mapboxgl.LngLat(-80.27, 43.32);
var ne = new mapboxgl.LngLat(-78.67, 44.12);
var boundBox = new mapboxgl.LngLatBounds(sw, ne);

// map setup
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jeffallen/cim5ll2q700k6a0m4rgvnqh36',
    center: [-79.38, 43.66],
    zoom: 13,
    maxZoom: 16,
    minZoom: 10.3,
    bearing: -16.5,
    attributionControl: false,
    zoomControl: true,
    maxBounds: boundBox,
});

// arrays for categories and their colours
cat_list = ['Health','School','Supermarket','Recreation','TTCStation','Museum','Theatre','Library']
cat_colours = ['#ffe200','#ff8f00','#4baf47','#915b35','#e4191b','#377eb8','#ff75b2','#984ea3']

// add map nav
map.addControl(new mapboxgl.Navigation())

// add geocoder from mapbox API
var geocoder = new mapboxgl.Geocoder({
    container: 'geocoder-container',
    proximity: [-79.38, 43.67]

});
map.addControl(geocoder);





// to deg function
function to_deg(radians) {
	return radians * 180 / Math.PI;
};

// to rad function
function to_rad(degrees) {
    return degrees * Math.PI / 180;
};

// earth radius based on latitude
function Earthradius(lat) {
    return Math.sqrt((6378137.0 * 6378137.0 * Math.cos(lat) * 6378137.0 * 6378137.0 * Math.cos(lat) + 6356752.3 * 6356752.3 * Math.sin(lat) * 6356752.3 * 6356752.3 * Math.sin(lat)) / (6378137.0 * Math.cos(lat) * 6378137.0 * Math.cos(lat) + 6356752.3 * Math.sin(lat) * 6356752.3 * Math.sin(lat)));
};

// finding points for distance and angle from centroid
// with help from http://www.movable-type.co.uk/scripts/latlong.html
function DestinationPoint(degrees_lat, degrees_long, mr_radius, angle_circle) {
	var θ = to_rad(Number(angle_circle));
	var δ = Number(mr_radius / Earthradius(degrees_lat));

	var φ1 = to_rad(degrees_lat);
	var λ1 = to_rad(degrees_long);

	var φ2 = Math.asin(
		Math.sin(φ1) * Math.cos(δ) +
		Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
	var λ2 = λ1 + Math.atan2(
		Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
		Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));

	// convert to long 180 to -180
	λ2 = (λ2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

	return [to_deg(λ2),to_deg(φ2)];
};



// creating the buffer circle using above functions - outputting a geojson
function hopeful_circle (circle_centre_point, radius, edge_points) {

  circle_buf_coords = [];
  // first point because geojson needs to close
  circle_buf_coords.push(DestinationPoint(circle_centre_point[1],circle_centre_point[0],radius,0))
  // looping angles in a circle
  for (x = 1; x <= edge_points; x++) {
    hc = DestinationPoint(circle_centre_point[1],circle_centre_point[0],radius,x);
    // console.log(hc);
    // console.log(x);
    circle_buf_coords.push(hc);
  }
  // add to array
  circle_array = [];
  circle_array.push(circle_buf_coords);
  // add to geojson
  var circle_geojson = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": circle_array
        }
      }
    ]
  }
  // export
  return circle_geojson
}


// set an initial buffer distance:
var init_extent = 1


// adding layers to the map
map.on('style.load', function() {

  // the buffer, called to fromt the geocoder below
  map.addSource('dr_buffer', {
      "type": "geojson",
      "data": {}
  });

  map.addLayer({
      "id": "dr_buffer_fill",
      "source": "dr_buffer",
      "type": "fill",
      "paint": {
        "fill-color": "#CAD7ED",
        "fill-opacity": 0.20,
      }
  });
  map.addLayer({
      "id": "dr_buffer_line",
      "source": "dr_buffer",
      "type": "line",
      "paint": {
        "line-color": "#CAD7ED",
        "line-opacity": 0.89,
        'line-width': 4,
      }
  });

  // styling those within the buffer
  map.addSource('tempSelection',{
    'type': 'geojson',
    'data': {}
  });

  // do it for each category in the geojson
  // for the circle and its white outline (another circle behind it)
  for (c = 0; c < cat_list.length; c++) {

      map.addLayer({
        'id': 'POI_white_' + cat_list[c],
        'type': 'circle',
        'source': 'tempSelection',
        'interactive': true,
        'layout': {},
        'paint': {
          'circle-color': 'white',
          'circle-radius': 6,
          'circle-opacity': 1,
        },
        'filter': ['==', "Category",""]
      });
      map.addLayer({
        'id': 'POI_' + cat_list[c],
        'type': 'circle',
        'source': 'tempSelection',
        'interactive': true,
        'layout': {},
        'paint': {
          'circle-color': cat_colours[c],
          'circle-radius': 5,
          'circle-opacity': 1,
        },
        'filter': ['==', "Category",""]
      });
}

    // add the geocoded location as a house symbol
    // the house is a symbol uploaded to mapbox studio
    map.addSource('single', {
        "type": "geojson",
        "data": {
            "type": "FeatureCollection",
            "features": []
        }
    });

    map.addLayer({
        "id": "point",
        "source": "single",
        "type": "symbol",
        "layout": {
          "icon-image": "house-01-01"
        },
        "paint": {
          "icon-opacity": 1,
          "icon-halo-width": 5
        }
      });

        // geocoding and set intial buffer

        geocoder.on('result', function(ev) {

        map.getSource('single').setData(ev.result.geometry);
        console.log(ev.result.geometry.coordinates);
        co = ev.result.geometry.coordinates;

        geo_point = {
            "type": "Feature",
            "properties": {
            },
            "geometry": {
                "type":"Point",
                "coordinates": co
              }
        }

        // intial buffer
        // calling circle function
        buf = hopeful_circle (co, init_extent, 360)
        // setting data to source
        map.getSource('dr_buffer').setData(buf);
        // selecting only data within the buffer
        tempSelection = turf.within(mapdata,buf);
        // and setting this data to source
        map.getSource('tempSelection').setData(tempSelection);

    });
});


// setting buffer distances and opacity of buttons
// called when buttons are clicked in html onlick
function buf_switch(buf_button) {
  console.log(buf_button)
  if (buf_button == '1km') {
      init_extent = 1000;
      buf = hopeful_circle (co, 1000, 360);
      map.getSource('dr_buffer').setData(buf);
      tempSelection = turf.within(mapdata,buf);
      map.getSource('tempSelection').setData(tempSelection);
      document.getElementById('bdb05').style.opacity = '0.6';
      document.getElementById('bdb1').style.opacity = '1';
      document.getElementById('bdb15').style.opacity = '0.6';
      document.getElementById('bdb2').style.opacity = '0.6';
  }
  else if (buf_button == '2km') {
      init_extent = 2000;
      buf = hopeful_circle (co, 2000, 360);
      map.getSource('dr_buffer').setData(buf);
      tempSelection = turf.within(mapdata,buf);
      map.getSource('tempSelection').setData(tempSelection);
      document.getElementById('bdb05').style.opacity = '0.6';
      document.getElementById('bdb1').style.opacity = '0.6';
      document.getElementById('bdb15').style.opacity = '0.6';
      document.getElementById('bdb2').style.opacity = '1';
  } else if (buf_button == '1.5km') {
      init_extent = 1500;
      buf = hopeful_circle (co, 1500, 360);
      map.getSource('dr_buffer').setData(buf);
      tempSelection = turf.within(mapdata,buf);
      map.getSource('tempSelection').setData(tempSelection);
      document.getElementById('bdb05').style.opacity = '0.6';
      document.getElementById('bdb1').style.opacity = '0.6';
      document.getElementById('bdb15').style.opacity = '1';
      document.getElementById('bdb2').style.opacity = '0.6';
  } else {
      init_extent = 500;
      buf = hopeful_circle (co, 500, 360);
      map.getSource('dr_buffer').setData(buf);
      tempSelection = turf.within(mapdata,buf);
      map.getSource('tempSelection').setData(tempSelection);
      document.getElementById('bdb05').style.opacity = '1';
      document.getElementById('bdb1').style.opacity = '0.6';
      document.getElementById('bdb15').style.opacity = '0.6';
      document.getElementById('bdb2').style.opacity = '0.6';
  }
}


// changing filters and opacity of buttons for each category
function poi_switch(poi_button) {

    for (p = 0; p < cat_list.length; p++) {

    if (poi_button == cat_list[p]) {
      filter = map.getFilter('POI_' + cat_list[p])
      if (filter[2] == cat_list[p]) {
        map.setFilter('POI_' + cat_list[p],["==", "Category", ""]);
        map.setFilter('POI_white_' + cat_list[p],["==", "Category", ""]);
        console.log("to off");
        document.getElementById(cat_list[p]).style.opacity = '0.5';
      }
      else {
        map.setFilter('POI_' + cat_list[p],["==", "Category", cat_list[p]]);
        map.setFilter('POI_white_' + cat_list[p],["==", "Category", cat_list[p]]);
        console.log("to on");
        document.getElementById(cat_list[p]).style.opacity = '1';
      }
      break;
    }
  }
}

// convert string to title string
// eg TORONTO to Toronto or toronto to Toronto
function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}


// popup showing function
function mr_popup(cat) {

  var popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  map.on('click', function (e) {
       map.featuresAt(e.point, {
           radius: 6,
           includeGeometry: true,
           layer: 'POI_' + cat
       }, function (err, features) {

           if (err || !features.length) {
               popup.remove();
               return;
           }

           var feature = features[0];

           popup.setLngLat(feature.geometry.coordinates)
               .setHTML("<p>" + toTitleCase(feature.properties.NAME) + "</p>"
             )
               .addTo(map);

       });
   });
}

// running the popup function for each data category
for (y = 0; y < cat_list.length; y++) {
  mr_popup(cat_list[y]);
}
