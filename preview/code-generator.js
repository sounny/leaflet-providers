(function() {
	'use strict';

	/* global hljs */

	var map = L.map('map', {
		center: [48, -3],
		zoom: 5,
		zoomControl: false
	});

	var scaleControl = L.control.scale();
	var miniMap;
	var drawnItems = new L.FeatureGroup();
	var drawControl;

	function createProviderLayer(name) {
		var layer = L.tileLayer.provider(name);
		layer.providerName = name;
		return layer;
	}

	var baseProviders = {
		'OpenStreetMap Default': 'OpenStreetMap.Mapnik',
		'OpenStreetMap German Style': 'OpenStreetMap.DE',
		'OpenStreetMap H.O.T.': 'OpenStreetMap.HOT',
		'MapTilesAPI OpenStreetMap in English': 'MapTilesAPI.OSMEnglish',
		'MapTilesAPI OpenStreetMap en Français': 'MapTilesAPI.OSMFrancais',
		'MapTilesAPI OpenStreetMap en Español': 'MapTilesAPI.OSMEspagnol',
		'Thunderforest OpenCycleMap': 'Thunderforest.OpenCycleMap',
		'Thunderforest Transport': 'Thunderforest.Transport',
		'Thunderforest Landscape': 'Thunderforest.Landscape',
		'Stamen Toner': 'Stadia.StamenToner',
		'Stamen Toner Lite': 'Stadia.StamenTonerLite',
		'Stamen Terrain': 'Stadia.StamenTerrain',
		'Stamen Watercolor': 'Stadia.StamenWatercolor',
		'Stadia Alidade Smooth': 'Stadia.AlidadeSmooth',
		'Stadia Alidade Smooth Dark': 'Stadia.AlidadeSmoothDark',
		'Stadia Alidade Satellite': 'Stadia.AlidadeSatellite',
		'Stadia Outdoors': 'Stadia.Outdoors',
		'Jawg Streets': 'Jawg.Streets',
		'Jawg Terrain': 'Jawg.Terrain',
		'Jawg Lagoon': 'Jawg.Lagoon',
		'Jawg Sunny': 'Jawg.Sunny',
		'Jawg Dark': 'Jawg.Dark',
		'Jawg Light': 'Jawg.Light',
		'Esri WorldStreetMap': 'Esri.WorldStreetMap',
		'Esri WorldTopoMap': 'Esri.WorldTopoMap',
		'Esri WorldImagery': 'Esri.WorldImagery',
		'Esri WorldTerrain': 'Esri.WorldTerrain',
		'Esri WorldShadedRelief': 'Esri.WorldShadedRelief',
		'Esri WorldPhysical': 'Esri.WorldPhysical',
		'Esri OceanBasemap': 'Esri.OceanBasemap',
		'Esri NatGeoWorldMap': 'Esri.NatGeoWorldMap',
		'Esri WorldGrayCanvas': 'Esri.WorldGrayCanvas',
		'Geoportail France Maps': 'GeoportailFrance',
		'Geoportail France Orthos': 'GeoportailFrance.orthos',
		'USGS USTopo': 'USGS.USTopo',
		'USGS USImagery': 'USGS.USImagery',
		'USGS USImageryTopo': 'USGS.USImageryTopo'
	};

	var overlayProviders = {
		'OpenSeaMap': 'OpenSeaMap',
		'OpenWeatherMap Clouds': 'OpenWeatherMap.Clouds',
		'OpenWeatherMap CloudsClassic': 'OpenWeatherMap.CloudsClassic',
		'OpenWeatherMap Precipitation': 'OpenWeatherMap.Precipitation',
		'OpenWeatherMap PrecipitationClassic': 'OpenWeatherMap.PrecipitationClassic',
		'OpenWeatherMap Rain': 'OpenWeatherMap.Rain',
		'OpenWeatherMap RainClassic': 'OpenWeatherMap.RainClassic',
		'OpenWeatherMap Pressure': 'OpenWeatherMap.Pressure',
		'OpenWeatherMap PressureContour': 'OpenWeatherMap.PressureContour',
		'OpenWeatherMap Wind': 'OpenWeatherMap.Wind',
		'OpenWeatherMap Temperature': 'OpenWeatherMap.Temperature',
		'OpenWeatherMap Snow': 'OpenWeatherMap.Snow',
		'Geoportail France Parcels': 'GeoportailFrance.parcels',
		'Waymarked Trails Hiking': 'WaymarkedTrails.hiking',
		'Waymarked Trails Cycling': 'WaymarkedTrails.cycling',
		'Waymarked Trails MTB': 'WaymarkedTrails.mtb',
		'Waymarked Trails Ski Slopes': 'WaymarkedTrails.slopes',
		'Waymarked Trails Riding': 'WaymarkedTrails.riding',
		'Waymarked Trails Skating': 'WaymarkedTrails.skating'
	};

	var basemapSelect = document.getElementById('basemap-select');
	Object.keys(baseProviders).forEach(function(label) {
		var opt = document.createElement('option');
		opt.value = baseProviders[label];
		opt.textContent = label;
		basemapSelect.appendChild(opt);
	});

	var currentBase = createProviderLayer(basemapSelect.value = baseProviders['OpenStreetMap Default']);
	currentBase.addTo(map);

	basemapSelect.addEventListener('change', function() {
		map.removeLayer(currentBase);
		currentBase = createProviderLayer(this.value);
		currentBase.addTo(map);
		setBackground(this.value);
		updateCode();
	});

	var overlayList = document.getElementById('overlay-list');
	var overlayLayers = {};

	Object.keys(overlayProviders).forEach(function(label) {
		var li = document.createElement('li');
		li.draggable = true;
		li.dataset.provider = overlayProviders[label];

		var checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		li.appendChild(checkbox);
		li.appendChild(document.createTextNode(' ' + label));
		overlayList.appendChild(li);

		checkbox.addEventListener('change', function() {
			var name = li.dataset.provider;
			if (checkbox.checked) {
				var layer = createProviderLayer(name);
				overlayLayers[name] = layer.addTo(map);
			} else {
				map.removeLayer(overlayLayers[name]);
				delete overlayLayers[name];
			}
			updateCode();
		});
	});

	var dragged;
	overlayList.addEventListener('dragstart', function(e) {
		dragged = e.target;
	});
	overlayList.addEventListener('dragover', function(e) {
		e.preventDefault();
		var target = e.target.closest('li');
		if (!target || target === dragged) {
			return;
		}
		var rect = target.getBoundingClientRect();
		var next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
		overlayList.insertBefore(dragged, next
			? target.nextSibling
			: target);
	});
	overlayList.addEventListener('drop', function(e) {
		e.preventDefault();
		reorderOverlays();
		updateCode();
	});

	var scaleToggle = document.getElementById('toggle-scale');
	var miniMapToggle = document.getElementById('toggle-minimap');
	var drawToggle = document.getElementById('toggle-draw');

	function updateScaleControl() {
		if (scaleToggle.checked) {
			scaleControl.addTo(map);
		} else {
			map.removeControl(scaleControl);
		}
	}
	scaleToggle.addEventListener('change', function() {
		updateScaleControl();
		updateCode();
	});
	updateScaleControl();

	function updateMiniMap() {
		if (miniMapToggle.checked) {
			if (!miniMap) {
				miniMap = new L.Control.MiniMap(L.tileLayer.provider('OpenStreetMap.Mapnik'), {
					toggleDisplay: true
				}).addTo(map);
			} else {
				miniMap.addTo(map);
			}
		} else if (miniMap) {
			map.removeControl(miniMap);
		}
	}
	miniMapToggle.addEventListener('change', function() {
		updateMiniMap();
		updateCode();
	});

	function updateDraw() {
		if (drawToggle.checked) {
			if (!map.hasLayer(drawnItems)) {
				map.addLayer(drawnItems);
			}
			if (!drawControl) {
				drawControl = new L.Control.Draw({
					edit: { featureGroup: drawnItems }
				});
			}
			map.addControl(drawControl);
		} else {
			if (drawControl) {
				map.removeControl(drawControl);
			}
			if (map.hasLayer(drawnItems)) {
				map.removeLayer(drawnItems);
			}
		}
	}
	drawToggle.addEventListener('change', function() {
		updateDraw();
		updateCode();
	});
	updateMiniMap();
	updateDraw();

	function reorderOverlays() {
		var names = Array.prototype.map.call(overlayList.children, function(li) {
			return li.dataset.provider;
		});
		names.forEach(function(name) {
			if (overlayLayers[name]) {
				map.removeLayer(overlayLayers[name]);
				overlayLayers[name].addTo(map);
			}
		});
	}

	function setBackground(name) {
		if ((/Dark|Toner/).test(name)) {
			map.getContainer().style.background = '#111';
		} else {
			map.getContainer().style.background = '#ddd';
		}
	}

	function getExampleJS(layer) {
		var layerName = layer.providerName.replace('.', '_');
		var options = L.extend({}, layer.options);
		var url = layer._url;
		var code = 'var ' + layerName + ' = L.tileLayer(\'' + url + '\', {\n';
		var first = true;
		for (var option in options) {
			if (Object.prototype.hasOwnProperty.call(options, option)) {
				if (first) {
					first = false;
				} else {
					code += ',\n';
				}
				code += '    ' + option + ': ' + JSON.stringify(options[option]);
			}
		}
		code += '\n});\n';
		return code;
	}

	var codeEl = document.getElementById('code-output');

	function updateCode() {
		var snippet = 'var map = L.map(\'map\').setView([48, -3], 5);\n';
		map.eachLayer(function(layer) {
			if (layer.providerName) {
				snippet += getExampleJS(layer);
				snippet += layer.providerName.replace('.', '_') + '.addTo(map);\n';
			}
		});
		if (scaleToggle.checked) {
			snippet += 'L.control.scale().addTo(map);\n';
		}
		if (miniMapToggle.checked) {
			snippet += 'var miniMap = new L.Control.MiniMap(L.tileLayer.provider(\'OpenStreetMap.Mapnik\'), {toggleDisplay: true}).addTo(map);\n';
		}
		if (drawToggle.checked) {
			snippet += 'var drawnItems = new L.FeatureGroup().addTo(map);\n';
			snippet += 'var drawControl = new L.Control.Draw({edit: {featureGroup: drawnItems}});\n';
			snippet += 'map.addControl(drawControl);\n';
		}
		codeEl.textContent = snippet;
		if (window.hljs) {
			hljs.highlightElement(codeEl);
		}
	}

	setBackground(currentBase.providerName);
	updateCode();
}());
