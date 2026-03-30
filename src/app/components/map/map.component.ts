import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import Overlay from 'ol/Overlay';
import TileWMS from 'ol/source/TileWMS';
import { fromLonLat } from 'ol/proj';
import * as SunCalc from 'suncalc';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  map!: Map;
  solarOverlay!: Overlay;
  sunIndicatorEl!: HTMLElement;
  sunInfoEl!: HTMLElement;

  lat: number = 40.4168;
  lon: number = -3.7038;
  zoomThreshold: number = 5;

  moonOverlay!: Overlay;
  moonIndicatorEl!: HTMLElement;
  moonInfoEl!: HTMLElement;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 0);
    }
  }

  initMap() {
    const mapDiv = document.getElementById('map');
    const worldExtent: [number, number, number, number] = [
      -20026376.39,
      -20048966.10,
      20026376.39,
      20048966.10
    ];

    if (!mapDiv) return;

    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new TileWMS({
            url: 'http://localhost:8080/geoserver/ne/wms',
            params: { LAYERS: 'ne:world', TILED: true },
            serverType: 'geoserver'
          })
        })
      ],
      view: new View({
        center: fromLonLat([this.lon, this.lat]),
        zoom: 2,
        extent: worldExtent
      })
    });

    const sunMarkerEl = document.createElement('div');
    sunMarkerEl.className = 'solar-marker';
    sunMarkerEl.innerText = '☀️';

    const moonMarkerEl = document.createElement('div');
    moonMarkerEl.className = 'moon-marker';
    moonMarkerEl.innerText = '🌑';

    this.solarOverlay = new Overlay({ element: sunMarkerEl, positioning: 'center-center' });
    this.map.addOverlay(this.solarOverlay);

    this.moonOverlay = new Overlay({ element: moonMarkerEl, positioning: 'center-center' });
    this.map.addOverlay(this.moonOverlay);

    this.sunIndicatorEl = this.createEl('solar-indicator', '☀️');
    this.moonIndicatorEl = this.createEl('moon-indicator', '🌑');

    this.sunInfoEl = this.createEl('solar-info');
    this.moonInfoEl = this.createEl('moon-info');

    this.updateSunPosition();
    this.updateMoonPosition();

    setInterval(() => this.updateSunPosition(), 10000);
    setInterval(() => this.updateMoonPosition(), 10000);

    this.map.getView().on('change:resolution', () => this.updateSunPosition());
    this.map.on('moveend', () => this.updateSunPosition());

    this.map.getView().on('change:resolution', () => this.updateMoonPosition());
    this.map.on('moveend', () => this.updateMoonPosition());
  }

  // Calcula una posición proyectada a distancia fija desde tu punto de referencia
  getProjectedCoord(azimuth: number): [number, number] {
    const bearing = (azimuth + Math.PI) % (2 * Math.PI);
    const distance = 200;

    const R = 6371; // km
    const d = distance / R;

    const lat1 = this.lat * Math.PI / 180;
    const lon1 = this.lon * Math.PI / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
    );

    const lon2 = lon1 + Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

    return [
      lon2 * 180 / Math.PI,
      lat2 * 180 / Math.PI
    ];
  }

  placeIndicator(overlay: Overlay, indicatorEl: HTMLElement, pixel: [number, number] | undefined, mapSize: number[]) {
    const margin = 20;

    if (!pixel) {
      overlay.getElement()!.style.opacity = '0';
      indicatorEl.style.display = 'flex';
      indicatorEl.style.position = 'absolute';
      indicatorEl.style.left = `${margin}px`;
      indicatorEl.style.top = `${mapSize[1] / 2}px`;
      indicatorEl.style.transform = `rotate(0deg)`;
      return;
    }

    const inView =
      pixel[0] >= 0 && pixel[0] <= mapSize[0] &&
      pixel[1] >= 0 && pixel[1] <= mapSize[1];

    if (inView) {
      overlay.setPosition(this.map.getCoordinateFromPixel(pixel));
      overlay.getElement()!.style.opacity = '1';
      indicatorEl.style.display = 'none';
    } else {
      overlay.getElement()!.style.opacity = '0';
      indicatorEl.style.display = 'flex';

      let x = pixel[0];
      let y = pixel[1];

      if (x < margin) x = margin;
      if (x > mapSize[0] - margin) x = mapSize[0] - margin;
      if (y < margin) y = margin;
      if (y > mapSize[1] - margin) y = mapSize[1] - margin;

      indicatorEl.style.position = 'absolute';
      indicatorEl.style.left = `${x}px`;
      indicatorEl.style.top = `${y}px`;

      const centerPixel = [mapSize[0] / 2, mapSize[1] / 2];
      const angle = Math.atan2(centerPixel[1] - y, centerPixel[0] - x);
      indicatorEl.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
    }
  }

  updateMoonPosition() {
    const now = new Date();
    const pos = SunCalc.getMoonPosition(now, this.lat, this.lon);
    if (pos.altitude < 0) return;

    const projected = this.getProjectedCoord(pos.azimuth);
    const moonCoord = fromLonLat(projected);
    const mapSize = this.map.getSize();
    if (!mapSize) return;

    const moonPixelRaw = this.map.getPixelFromCoordinate(moonCoord);
    const moonPixel: [number, number] | undefined = moonPixelRaw && moonPixelRaw.length === 2
      ? [moonPixelRaw[0], moonPixelRaw[1]]
      : undefined;

    const moonTimes = SunCalc.getMoonTimes(now, this.lat, this.lon);
    this.moonInfoEl.innerText =
      `Luna → Lat: ${this.lat.toFixed(2)}, Lon: ${this.lon.toFixed(2)}\n` +
      `Salida: ${moonTimes.rise?.toLocaleTimeString()}, Puesta: ${moonTimes.set?.toLocaleTimeString()}`;

    this.placeIndicator(this.moonOverlay, this.moonIndicatorEl, moonPixel, mapSize);
  }

  updateSunPosition() {
    const now = new Date();
    const pos = SunCalc.getPosition(now, this.lat, this.lon);
    if (pos.altitude < 0) return;

    const projected = this.getProjectedCoord(pos.azimuth);
    const sunCoord = fromLonLat(projected);
    const mapSize = this.map.getSize();
    if (!mapSize) return;

    const sunPixelRaw = this.map.getPixelFromCoordinate(sunCoord);
    const sunPixel: [number, number] | undefined = sunPixelRaw && sunPixelRaw.length === 2
      ? [sunPixelRaw[0], sunPixelRaw[1]]
      : undefined;

    const sunTimes = SunCalc.getTimes(now, this.lat, this.lon);
    this.sunInfoEl.innerText =
      `Sol → Lat: ${this.lat.toFixed(2)}, Lon: ${this.lon.toFixed(2)}\n` +
      `Salida: ${sunTimes.sunrise?.toLocaleTimeString()}, Puesta: ${sunTimes.sunset?.toLocaleTimeString()}`;

    this.placeIndicator(this.solarOverlay, this.sunIndicatorEl, sunPixel, mapSize);
  }

  createEl(className: string, innerText?: string): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    if (innerText) el.innerText = innerText;
    document.body.appendChild(el);
    return el;
  }

  zoomIn() { this.map.getView().setZoom(this.map.getView().getZoom()! + 1); }
  zoomOut() { this.map.getView().setZoom(this.map.getView().getZoom()! - 1); }
  centerMap() { this.map.getView().setCenter(fromLonLat([this.lon, this.lat])); }
}