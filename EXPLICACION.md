# Descripción del Componente MapComponent

Este componente Angular integra un mapa con OpenLayers para mostrar la posición del sol respecto a una localización fija (Madrid por defecto), utilizando la librería SunCalc para calcular la posición solar en tiempo real.

## Funcionalidad principal

- **Mostrar el sol siempre visible**: El componente asegura que el icono del sol se vea siempre en el mapa, de dos formas:
  1. **Marcador solar en la ubicación real del sol** (latitud/longitud fijas):  
     Cuando el sol está dentro del área visible del mapa, se muestra un marcador (`☀️`) en la posición correcta.
  2. **Indicador solar en el borde del mapa**:  
     Si el sol está fuera de la vista actual, aparece un indicador en el borde del mapa, señalando la dirección donde está el sol. Este indicador apunta hacia el centro del mapa para facilitar su localización.

- **Información solar textual**: En la esquina inferior izquierda, aparece un recuadro con información actualizada del sol:
  - Latitud y longitud
  - Hora de salida y puesta del sol

- **Actualización periódica**: La posición y la información solar se recalculan y actualizan cada 10 segundos, así como cuando el usuario hace zoom o mueve el mapa.

## Detalles técnicos

### Cálculo y posicionamiento

- Se usa `SunCalc` para obtener la posición solar y los horarios del día.
- La latitud y longitud del sol son fijas (Madrid en este ejemplo).
- Se convierten las coordenadas geográficas del sol a coordenadas del mapa (`EPSG:3857`) usando `fromLonLat`.
- Se calcula la posición en píxeles dentro del mapa con `map.getPixelFromCoordinate()`.

### Visualización del marcador o indicador

- Si la posición en píxeles está dentro del tamaño visible del mapa, se muestra el marcador solar usando un `Overlay` de OpenLayers.
- Si el sol está fuera de la vista, se oculta el marcador y se muestra un elemento HTML (`div`) posicionado en el borde del mapa, que apunta hacia la ubicación del sol con una rotación calculada.

### Manejo de casos especiales

- Se verifica que el mapa tenga tamaño válido antes de calcular posiciones para evitar errores.
- Si `getPixelFromCoordinate` devuelve `null` (por ejemplo, sol muy fuera del extent), se posiciona el indicador en un lugar fijo en el borde (por defecto en la izquierda y centrado verticalmente).
- El componente usa un intervalo para actualizar automáticamente la posición y la info del sol, y también responde a cambios de zoom y movimientos del mapa.

## Estructura visual

- **`.solar-marker`**: Elemento del marcador solar (icono amarillo), visible solo si el sol está dentro del mapa.
- **`.solar-indicator`**: Elemento indicador del sol en el borde (icono naranja), visible solo si el sol está fuera del mapa.
- **`.solar-info`**: Caja de texto fija con información solar en la esquina inferior izquierda del mapa.

## Requisitos

- OpenLayers (versión 6+ recomendada)
- SunCalc para cálculo solar
- Geoserver o servicio WMS configurado (en el ejemplo se usa `http://localhost:8080/geoserver/ne/wms`)

## Resumen

Este componente garantiza que el usuario siempre tenga una referencia visual clara de la posición del sol, mejorando la experiencia y permitiendo identificar la dirección solar sin importar la posición o nivel de zoom en el mapa.

## Future Steps

Podriamos hacer que se recalcule la posición del sol siempre, relativo a una feature (punto) movil y que se vaya modificando en funcion se reciba un nuevo punto

Ademas de añadir la posición de la Luna https://github.com/mourner/suncalc
