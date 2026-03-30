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

  moonOverlay!: Overlay;
  moonIndicatorEl!: HTMLElement;
  moonInfoEl!: HTMLElement;

  worldExtent: [number, number, number, number] = [
    -20026376.39, -20048966.10, 20026376.39, 20048966.10
  ];

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
      view: new View({
        center: fromLonLat([this.lon, this.lat]),
        zoom: 2,
        extent: this.worldExtent,
        minZoom: 1,
        maxZoom: 20
      })
    });

    // Crear marcadores
    this.solarOverlay = new Overlay({ element: this.createEl('solar-marker', '☀️'), positioning: 'center-center' });
    this.moonOverlay = new Overlay({ element: this.createEl('moon-marker', '🌑'), positioning: 'center-center' });
    this.map.addOverlay(this.solarOverlay);
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

  createEl(className: string, innerText?: string): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    if (innerText) el.innerText = innerText;
    document.body.appendChild(el);
    return el;
  }

  getProjectedCoord(azimuth: number, distance = 200): [number, number] {
    const R = 6371; // km
    const d = distance / R;
    const lat1 = this.lat * Math.PI / 180;
    const lon1 = this.lon * Math.PI / 180;
    const bearing = (azimuth + Math.PI) % (2 * Math.PI);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
    );

    const lon2 = lon1 + Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

    return [lon2 * 180 / Math.PI, lat2 * 180 / Math.PI];
  }

  updatePosition(type: 'sun' | 'moon') {
    const now = new Date();
    const isSun = type === 'sun';
    const obj = isSun ? SunCalc.getPosition(now, this.lat, this.lon) : SunCalc.getMoonPosition(now, this.lat, this.lon);
    if (obj.altitude > 0) {
      if (isSun) this.solarOverlay.getElement()!.style.opacity = '0';
      else this.moonOverlay.getElement()!.style.opacity = '0';
      return;
    }

    const projected = this.getProjectedCoord(obj.azimuth);
    const coord = fromLonLat(projected);
    const overlay = isSun ? this.solarOverlay : this.moonOverlay;
    const indicator = isSun ? this.sunIndicatorEl : this.moonIndicatorEl;
    const infoEl = isSun ? this.sunInfoEl : this.moonInfoEl;

    const mapSize = this.map.getSize();
    if (!mapSize) return;

    const pixel = this.map.getPixelFromCoordinate(coord);

    // Info de salida y puesta
    const times = isSun ? SunCalc.getTimes(now, this.lat, this.lon) : SunCalc.getMoonTimes(now, this.lat, this.lon);
 
    const margin = 20;
    if (pixel && pixel[0] >= 0 && pixel[0] <= mapSize[0] && pixel[1] >= 0 && pixel[1] <= mapSize[1]) {
      overlay.setPosition(coord);
      overlay.getElement()!.style.opacity = '1';
      indicator.style.display = 'none';
    } else {
      overlay.getElement()!.style.opacity = '0';
      indicator.style.display = 'flex';

      let x = pixel ? pixel[0] : mapSize[0] / 2;
      let y = pixel ? pixel[1] : mapSize[1] / 2;

      if (x < margin) x = margin;
      if (x > mapSize[0] - margin) x = mapSize[0] - margin;
      if (y < margin) y = margin;
      if (y > mapSize[1] - margin) y = mapSize[1] - margin;

      indicator.style.position = 'absolute';
      indicator.style.left = `${x}px`;
      indicator.style.top = `${y}px`;

      const centerPixel = [mapSize[0] / 2, mapSize[1] / 2];
      const angle = Math.atan2(centerPixel[1] - y, centerPixel[0] - x);
      indicator.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
    }
  }

  updateSunPosition() { this.updatePosition('sun'); }
  updateMoonPosition() { this.updatePosition('moon'); }

  zoomIn() { this.map.getView().setZoom(this.map.getView().getZoom()! + 1); }
  zoomOut() { this.map.getView().setZoom(this.map.getView().getZoom()! - 1); }
  centerMap() { this.map.getView().setCenter(fromLonLat([this.lon, this.lat])); }
}