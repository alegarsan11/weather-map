import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import OSM from 'ol/source/OSM';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  ngOnInit(): void {
    const map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        new TileLayer({
          source: new TileWMS({
            url: 'http://localhost:8080/geoserver/your_workspace/wms',
            params: {
              LAYERS: 'your_workspace:your_layer',
              TILED: true
            },
            serverType: 'geoserver'
          })
        })
      ],
      view: new View({
        center: [0, 0],
        zoom: 2
      })
    });
  }
}