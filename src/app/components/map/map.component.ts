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

  lat: number = 40.4168;   // Madrid
  lon: number = -3.7038;
  zoomThreshold: number = 5;
  moonOverlay!: any;
  moonIndicatorEl!: any;
  moonInfoEl!: HTMLElement;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 0);
    }
  }

  initMap() {
    const mapDiv = document.getElementById('map');
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
      view: new View({ center: fromLonLat([this.lon, this.lat]), zoom: 2 })
    });

    // Marcador del sol
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
    

    // Indicador del sol
    this.sunIndicatorEl = this.createEl('solar-indicator', '☀️');
    this.moonIndicatorEl = this.createEl('moon-indicator', '🌑');

    // Info del sol
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

  updateMoonPosition() {
    const now = new Date();
    const test = SunCalc.getMoonPosition(now,this.lat,this.lon)
    const moonCoord = fromLonLat([test.azimuth, test.altitude]);
    const mapSize = this.map.getSize();
    const margin = 20;
    if (!mapSize || mapSize[0] === 0 || mapSize[1] === 0) return;

    const moonPixel = this.map.getPixelFromCoordinate(moonCoord);
    if (!moonPixel) {
      this.moonOverlay.getElement()!.style.opacity= '0';
      this.moonIndicatorEl.style.display = 'flex';

      const x = margin;
      const y = mapSize[1] / 2;

      this.moonIndicatorEl.style.position = 'absolute';
      this.moonIndicatorEl.style.left = `${x}px`;
      this.moonIndicatorEl.style.top = `${y}px`;
      this.moonIndicatorEl.style.transform = `rotate(0deg)`;
      return;
    }
    const moonTimes = SunCalc.getMoonTimes(now, this.lat, this.lon);
    this.moonInfoEl.innerText =
    `Luna → Lat: ${this.lat.toFixed(2)}, Lon: ${this.lon.toFixed(2)}\n` +
    `Salida: ${moonTimes.rise.toLocaleTimeString()}, Puesta: ${moonTimes.set.toLocaleTimeString()}`;

    const inView =
    moonPixel[0] >= 0 && moonPixel[0] <= mapSize[0] &&
    moonPixel[1] >= 0 && moonPixel[1] <= mapSize[1];

  if (inView) {
    this.moonOverlay.setPosition(moonCoord);
    this.moonOverlay.getElement()!.style.opacity = '1';
    this.moonIndicatorEl.style.display = 'none';
  } else {
    this.moonOverlay.getElement()!.style.opacity = '0';
    this.moonIndicatorEl.style.display = 'flex';

    let x = moonPixel[0];
    let y = moonPixel[1];

    if (x < margin) x = margin;
    if (x > mapSize[0] - margin) x = mapSize[0] - margin;
    if (y < margin) y = margin;
    if (y > mapSize[1] - margin) y = mapSize[1] - margin;

    this.moonIndicatorEl.style.position = 'absolute';
    this.moonIndicatorEl.style.left = `${x}px`;
    this.moonIndicatorEl.style.top = `${y}px`;

    const centerPixel = [mapSize[0] / 2, mapSize[1] / 2];
    const angle = Math.atan2(centerPixel[1] - y, centerPixel[0] - x);
    this.moonIndicatorEl.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
  }
  }

  createEl(className: string, innerText?: string): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    if (innerText) el.innerText = innerText;
    document.body.appendChild(el);
    return el;
  }

  updateSunPosition() {
    const now = new Date();
    const test = SunCalc.getPosition(now,this.lat,this.lon)
    const sunCoord = fromLonLat([test.altitude, test.azimuth]);
    const mapSize = this.map.getSize();
    const margin = 20;

    if (!mapSize || mapSize[0] === 0 || mapSize[1] === 0) return;

    const sunPixel = this.map.getPixelFromCoordinate(sunCoord);
    if (!sunPixel) {
      this.solarOverlay.getElement()!.style.opacity = '0';
      this.sunIndicatorEl.style.display = 'flex';

      const x = margin;
      const y = mapSize[1] / 2;

      this.sunIndicatorEl.style.position = 'absolute';
      this.sunIndicatorEl.style.left = `${x}px`;
      this.sunIndicatorEl.style.top = `${y}px`;
      this.sunIndicatorEl.style.transform = `rotate(0deg)`;
      return;
    }

    const sunTimes = SunCalc.getTimes(now, this.lat, this.lon);
    this.sunInfoEl.innerText =
      `Sol → Lat: ${this.lat.toFixed(2)}, Lon: ${this.lon.toFixed(2)}\n` +
      `Salida: ${sunTimes.sunrise.toLocaleTimeString()}, Puesta: ${sunTimes.sunset.toLocaleTimeString()}`;

    const inView =
      sunPixel[0] >= 0 && sunPixel[0] <= mapSize[0] &&
      sunPixel[1] >= 0 && sunPixel[1] <= mapSize[1];

    if (inView) {
      this.solarOverlay.setPosition(sunCoord);
      this.solarOverlay.getElement()!.style.opacity = '1';
      this.sunIndicatorEl.style.display = 'none';
    } else {
      this.solarOverlay.getElement()!.style.opacity = '0';
      this.sunIndicatorEl.style.display = 'flex';

      let x = sunPixel[0];
      let y = sunPixel[1];

      if (x < margin) x = margin;
      if (x > mapSize[0] - margin) x = mapSize[0] - margin;
      if (y < margin) y = margin;
      if (y > mapSize[1] - margin) y = mapSize[1] - margin;

      this.sunIndicatorEl.style.position = 'absolute';
      this.sunIndicatorEl.style.left = `${x}px`;
      this.sunIndicatorEl.style.top = `${y}px`;

      const centerPixel = [mapSize[0] / 2, mapSize[1] / 2];
      const angle = Math.atan2(centerPixel[1] - y, centerPixel[0] - x);
      this.sunIndicatorEl.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
    }
  }

  zoomIn() { this.map.getView().setZoom(this.map.getView().getZoom()! + 1); }
  zoomOut() { this.map.getView().setZoom(this.map.getView().getZoom()! - 1); }
  centerMap() { this.map.getView().setCenter(fromLonLat([this.lon, this.lat])); }
}