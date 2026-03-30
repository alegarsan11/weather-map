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
  moonOverlay!: Overlay;

  lat: number = 40.4168;
  lon: number = -3.7038;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 0);
    }
  }

  initMap() {
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
        zoom: 3
      })
    });

    // ☀️ Sol
    const sunEl = document.createElement('div');
    sunEl.innerHTML = '☀️';
    this.solarOverlay = new Overlay({ element: sunEl, positioning: 'center-center' });
    this.map.addOverlay(this.solarOverlay);

    // 🌙 Luna
    const moonEl = document.createElement('div');
    moonEl.innerHTML = '🌙';
    this.moonOverlay = new Overlay({ element: moonEl, positioning: 'center-center' });
    this.map.addOverlay(this.moonOverlay);

    this.updateAll();
    setInterval(() => this.updateAll(), 10000);
  }

  updateAll() {
    const now = new Date();

    const sun = SunCalc.getPosition(now, this.lat, this.lon);
    const moon = SunCalc.getMoonPosition(now, this.lat, this.lon);

    const sunCoord = this.getProjectedCoord(sun.azimuth);
    const moonCoord = this.getProjectedCoord(moon.azimuth);

    this.solarOverlay.setPosition(sunCoord);
    this.moonOverlay.setPosition(moonCoord);
  }

  // 🔥 CLAVE: conversión correcta
  getProjectedCoord(azimuth: number) {
    // Convertir a bearing (0 = norte)
    const bearing = (azimuth + Math.PI) % (2 * Math.PI);

    // Distancia arbitraria (km)
    const distance = 10000;

    return fromLonLat(
      this.projectPoint(this.lat, this.lon, bearing, distance)
    );
  }

  // 🌍 Proyección geodésica
  projectPoint(lat: number, lon: number, bearing: number, distanceKm: number): [number, number] {
    const R = 6371;

    const d = distanceKm / R;

    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;

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

  zoomIn() {
    this.map.getView().setZoom(this.map.getView().getZoom()! + 1);
  }

  zoomOut() {
    this.map.getView().setZoom(this.map.getView().getZoom()! - 1);
  }

  centerMap() {
    this.map.getView().setCenter(fromLonLat([this.lon, this.lat]));
  }
}